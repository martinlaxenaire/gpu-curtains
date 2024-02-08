import { isRenderer, Renderer } from '../renderers/utils'
import { RenderPass, RenderPassParams } from './RenderPass'
import { RenderTexture } from '../textures/RenderTexture'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/**
 * Parameters used to create a {@link RenderTarget}
 */
export interface RenderTargetParams extends RenderPassParams {
  /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
  autoRender?: boolean
}

/**
 * Used to draw meshes to a {@link RenderPass#viewTextures | RenderPass view textures} instead of directly to screen.
 *
 * The meshes assigned to a {@link RenderTarget} will be drawn before the other objects in the {@link core/scenes/Scene.Scene | Scene} rendering loop.s
 *
 * If the {@link RenderPass} created handle color attachments, is multisampled and {@link RenderPass#options.shouldUpdateView | should update view}, then a {@link RenderTarget#renderTexture | RenderTexture} will be created to resolve the content of the current view. This {@link RenderTarget#renderTexture | RenderTexture} could therefore usually be used to manipulate the current content of this {@link RenderTarget}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * const renderTarget = new RenderTarget(gpuCurtains, {
 *   label: 'My render target',
 * })
 * ```
 */
export class RenderTarget {
  /** {@link Renderer} used by this {@link RenderTarget} */
  renderer: Renderer
  /** The type of the {@link RenderTarget} */
  type: string
  /** The universal unique id of this {@link RenderTarget} */
  readonly uuid: string

  /** Options used to create this {@link RenderTarget} */
  options: RenderTargetParams

  /** {@link RenderPass} used by this {@link RenderTarget} */
  renderPass: RenderPass
  /** {@link RenderTexture} that will be resolved by the {@link renderPass} when {@link RenderPass#updateView | setting the current texture} */
  renderTexture?: RenderTexture

  /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
  #autoRender = true

  /**
   * RenderTarget constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
   * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderTarget')

    this.type = 'RenderTarget'
    this.renderer = renderer
    this.uuid = generateUUID()

    const { label, targetFormat, depthTexture, autoRender, ...renderPassParams } = parameters

    this.options = {
      label,
      ...renderPassParams,
      ...(depthTexture && { depthTexture }),
      targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
      autoRender: autoRender === undefined ? true : autoRender,
    } as RenderTargetParams

    if (autoRender !== undefined) {
      this.#autoRender = autoRender
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      targetFormat: this.options.targetFormat,
      depthTexture: this.options.depthTexture ?? this.renderer.renderPass.depthTexture, // reuse renderer depth texture for every pass
      ...renderPassParams,
    })

    if (renderPassParams.useColorAttachments !== false && renderPassParams.shouldUpdateView !== false) {
      // this is the texture that will be resolved when setting the current render pass texture
      this.renderTexture = new RenderTexture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target render texture',
        name: 'renderTexture',
        format: this.options.targetFormat,
      })
    }

    this.addToScene()
  }

  /**
   * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.renderTargets.push(this)

    if (this.#autoRender) {
      this.renderer.scene.addRenderTarget(this)
    }
  }

  /**
   * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.#autoRender) {
      this.renderer.scene.removeRenderTarget(this)
    }

    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid)
  }

  /**
   * Resize our {@link renderPass}
   */
  resize() {
    // reset the newly created depth texture
    this.renderPass.options.depthTexture.texture = this.options.depthTexture
      ? this.options.depthTexture.texture
      : this.renderer.renderPass.depthTexture.texture

    this.renderPass?.resize()
  }

  /**
   * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}
   */
  remove() {
    this.destroy()
  }

  /**
   * Destroy our {@link RenderTarget}
   */
  destroy() {
    // release mesh struct
    this.renderer.meshes.forEach((mesh) => {
      if (mesh.renderTarget && mesh.renderTarget.uuid === this.uuid) {
        mesh.setRenderTarget(null)
      }
    })

    // release shader passes struct
    this.renderer.shaderPasses.forEach((shaderPass) => {
      if (shaderPass.renderTarget && shaderPass.renderTarget.uuid === this.uuid) {
        // force render target to null before removing / re-adding to scene
        shaderPass.renderTarget = null
        shaderPass.setRenderTarget(null)
      }
    })

    // remove from scene and renderer array
    this.removeFromScene()

    this.renderPass?.destroy()
    this.renderTexture?.destroy()
  }
}
