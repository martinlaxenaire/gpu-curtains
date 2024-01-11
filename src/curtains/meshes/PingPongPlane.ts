import { isRenderer, Renderer } from '../../core/renderers/utils'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'
import { GPUCurtains } from '../GPUCurtains'
import { RenderTexture, RenderTextureParams } from '../../core/textures/RenderTexture'
import { MeshBaseRenderParams } from '../../core/meshes/mixins/MeshBaseMixin'

/**
 * Used to create a special type of {@link FullscreenPlane} that allows to use the previous frame fragment shader output as an input texture.
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
 * // create a PingPongPlane
 * const shaderPass = new PingPongPlane(gpuCurtain, {
 *   label: 'My ping pong plane',
 *   shaders: {
 *     fragment: {
 *       code: pingPongCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export class PingPongPlane extends FullscreenPlane {
  /** {@link RenderTarget} content to use as an input */
  renderTarget: RenderTarget

  /**
   * PingPongPlane constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
   * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link PingPongPlane}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as MeshBaseRenderParams) {
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' PingPongPlane' : 'PingPongPlane')

    // we will render into a separate texture
    parameters.renderTarget = new RenderTarget(renderer, {
      label: parameters.label ? parameters.label + ' render target' : 'Ping Pong render target',
      ...(parameters.targetFormat && { targetFormat: parameters.targetFormat }),
    })

    // no blending for ping pong planes
    parameters.transparent = false
    parameters.label = parameters.label ?? 'PingPongPlane ' + renderer.pingPongPlanes?.length

    super(renderer, parameters)

    this.type = 'PingPongPlane'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'PingPongPlane render texture',
      name: 'renderTexture',
      ...(parameters.targetFormat && { format: parameters.targetFormat }),
    } as RenderTextureParams)
  }

  /**
   * Get our main {@link RenderTexture}, the one that contains our ping pong content
   * @readonly
   */
  get renderTexture(): RenderTexture | undefined {
    return this.renderTextures.find((texture) => texture.options.name === 'renderTexture')
  }

  /**
   * Add the {@link PingPongPlane} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.pingPongPlanes.push(this)

    if (this.autoRender) {
      this.renderer.scene.addPingPongPlane(this)
    }
  }

  /**
   * Remove the {@link PingPongPlane} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.renderTarget) {
      this.renderTarget.destroy()
    }

    if (this.autoRender) {
      this.renderer.scene.removePingPongPlane(this)
    }

    this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid)
  }
}
