import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { RenderPass, RenderPassParams } from './RenderPass'
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture'
import { generateUUID } from '../../utils/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMElementBoundingRect } from '../DOM/DOMElement'

/**
 * Parameters used to create a {@link RenderTarget}
 */
export interface RenderTargetParams extends RenderPassParams {
  /** Whether we should add this {@link RenderTarget} to our {@link Scene} to let it handle the rendering process automatically */
  autoAddToScene?: boolean
}

/**
 * RenderTarget class:
 * Used to render meshes to a [render pass]{@link RenderPass} [render texture]{@link RenderTexture} instead of directly to screen
 */
export class RenderTarget {
  /** [renderer]{@link Renderer} used by this {@link RenderTarget} */
  renderer: Renderer
  /** The type of the {@link RenderTarget} */
  type: string
  /** The universal unique id of this {@link RenderTarget} */
  readonly uuid: string

  /** Options used to create this {@link RenderTarget} */
  options: RenderTargetParams

  /** {@link RenderPass} used by this {@link RenderTarget} */
  renderPass: RenderPass
  /** {@link RenderTexture} that will be resolved by the {@link RenderTarget#renderPass} when [setting the current texture]{@link GPURenderer#setRenderPassCurrentTexture} */
  renderTexture: RenderTexture

  /** Whether we should add this {@link RenderTarget} to our {@link Scene} to let it handle the rendering process automatically */
  #autoAddToScene = true

  /**
   * RenderTarget constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
   * @param parameters - [parameters]{@link RenderTargetParams} use to create this {@link RenderTarget}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: RenderTargetParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, 'RenderTarget')

    this.type = 'RenderTarget'
    this.renderer = renderer
    this.uuid = generateUUID()

    const { label, depth, loadOp, clearValue, autoAddToScene } = parameters

    this.options = {
      label,
      depth,
      loadOp,
      clearValue,
      autoAddToScene,
    }

    if (autoAddToScene !== undefined) {
      this.#autoAddToScene = autoAddToScene
    }

    this.renderPass = new RenderPass(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Pass` : 'Render Target Render Pass',
      depth: this.options.depth,
      loadOp: this.options.loadOp,
      clearValue: this.options.clearValue,
    })

    // this is the texture that will be resolved when setting the current render pass texture
    this.renderTexture = new RenderTexture(this.renderer, {
      label: this.options.label ? `${this.options.label} Render Texture` : 'Render Target Render Texture',
      name: 'renderTexture',
    } as RenderTextureParams)

    this.addToScene()
  }

  /**
   * Add the {@link RenderTarget} to the renderer and the {@link Scene}
   */
  addToScene() {
    this.renderer.renderTargets.push(this)

    if (this.#autoAddToScene) {
      this.renderer.scene.addRenderTarget(this)
    }
  }

  /**
   * Remove the {@link RenderTarget} from the renderer and the {@link Scene}
   */
  removeFromScene() {
    if (this.#autoAddToScene) {
      this.renderer.scene.removeRenderTarget(this)
    }

    this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid)
  }

  /**
   * Resize our [render pass]{@link RenderTarget#renderPass} and [render texture]{@link RenderTarget#renderTexture}
   * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
   */
  resize(boundingRect: DOMElementBoundingRect) {
    this.renderPass?.resize(boundingRect)
    this.renderTexture?.resize()
  }

  // alias
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
    // release mesh bindings
    this.renderer.meshes.forEach((mesh) => {
      if (mesh.renderTarget && mesh.renderTarget.uuid === this.uuid) {
        mesh.setRenderTarget(null)
      }
    })

    // release shader passes bindings
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
