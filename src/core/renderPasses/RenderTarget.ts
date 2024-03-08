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
 * Used to draw to {@link RenderPass#viewTextures | RenderPass view textures} (and eventually {@link RenderPass#depthTexture | depth texture}) instead of directly to screen.
 *
 * The meshes assigned to a {@link RenderTarget} will be drawn before the other objects in the {@link core/scenes/Scene.Scene | Scene} rendering loop.
 *
 * Can also be assigned as ShaderPass {@link core/renderPasses/ShaderPass.ShaderPass#inputTarget | input} or {@link core/renderPasses/ShaderPass.ShaderPass#outputTarget | output} targets.
 *
 * If the {@link RenderPass} created handle color attachments, then a {@link RenderTarget#renderTexture | RenderTexture} will be created to update and/or resolve the content of the current view. This {@link RenderTarget#renderTexture | RenderTexture} could therefore usually be used to access the current content of this {@link RenderTarget}.
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
 * const outputTarget = new RenderTarget(gpuCurtains, {
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
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as RenderTargetParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderTarget')

    this.type = 'RenderTarget'
    this.renderer = renderer
    this.uuid = generateUUID()

    const { label, colorAttachments, depthTexture, autoRender, ...renderPassParams } = parameters

    // use depth texture from params
    // OR renderer render pass depth texture if sample counts match
    const depthTextureToUse = !!depthTexture
      ? depthTexture
      : this.renderer.renderPass.options.sampleCount === (parameters.sampleCount ?? 4)
      ? this.renderer.renderPass.depthTexture
      : null

    this.options = {
      label,
      ...renderPassParams,
      ...(depthTextureToUse && { depthTexture: depthTextureToUse }),
      ...(colorAttachments && { colorAttachments }),
      autoRender: autoRender === undefined ? true : autoRender,
    } as RenderTargetParams

    if (autoRender !== undefined) {
      this.#autoRender = autoRender
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      ...(colorAttachments && { colorAttachments }),
      depthTexture: this.options.depthTexture,
      ...renderPassParams,
    })

    if (renderPassParams.useColorAttachments !== false) {
      // this is the texture that will be resolved when setting the current render pass texture
      this.renderTexture = new RenderTexture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target render texture',
        name: 'renderTexture',
        format:
          colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat
            ? colorAttachments[0].targetFormat
            : this.renderer.options.preferredFormat,
        ...(this.options.qualityRatio !== undefined && { qualityRatio: this.options.qualityRatio }),
      })
    }

    this.addToScene()
  }

  /**
   * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
   *
   * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
   *
   * @readonly
   */
  get outputTextures(): RenderTexture[] {
    return !this.renderPass.outputTextures.length
      ? !this.renderTexture
        ? []
        : [this.renderTexture]
      : this.renderPass.outputTextures.map((texture, index) => {
          return index === 0 && this.renderPass.options.renderToSwapChain ? this.renderTexture : texture
        })
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
    if (this.options.depthTexture) {
      this.renderPass.options.depthTexture.texture = this.options.depthTexture.texture
    }

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
      if (mesh.outputTarget && mesh.outputTarget.uuid === this.uuid) {
        mesh.setOutputTarget(null)
      }
    })

    // release shader passes struct
    this.renderer.shaderPasses.forEach((shaderPass) => {
      if (shaderPass.outputTarget && shaderPass.outputTarget.uuid === this.uuid) {
        // force render target to null before removing / re-adding to scene
        shaderPass.outputTarget = null
        shaderPass.setOutputTarget(null)
      }
    })

    // remove from scene and renderer array
    this.removeFromScene()

    this.renderPass?.destroy()
    this.renderTexture?.destroy()
  }
}
