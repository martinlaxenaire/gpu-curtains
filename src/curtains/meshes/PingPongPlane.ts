import { isRenderer, Renderer } from '../../core/renderers/utils'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'
import { GPUCurtains } from '../GPUCurtains'
import { RenderTexture, RenderTextureParams } from '../../core/textures/RenderTexture'
import { MeshBaseRenderParams } from '../../core/meshes/MeshBaseMixin'

/**
 * PingPongPlane class:
 * Used to create a special type of [fullscreen quad]{@link FullscreenPlane} that allows to use the previous frame fragment shader output as an input texture.
 */
export class PingPongPlane extends FullscreenPlane {
  /** {@link RenderTarget} content to use as an input */
  renderTarget: RenderTarget

  /**
   * PingPongPlane constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
   * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link PingPongPlane}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = {} as MeshBaseRenderParams) {
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' PingPongPlane' : 'PingPongPlane')

    // we will render into a separate texture
    parameters.renderTarget = new RenderTarget(renderer, {
      label: parameters.label ? parameters.label + ' render target' : 'Ping Pong render target',
    })

    // no blending for ping pong planes
    parameters.transparent = false
    parameters.label = parameters.label ?? 'PingPongPlane ' + renderer.pingPongPlanes.length

    super(renderer, parameters)

    this.type = 'PingPongPlane'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'PingPongPlane render texture',
      name: 'renderTexture',
    } as RenderTextureParams)
  }

  /**
   * Get our main [render texture]{@link RenderTexture}, the one that contains our ping pong content
   * @readonly
   */
  get renderTexture(): RenderTexture | null {
    return this.renderTextures[0] ?? null
  }

  /**
   * Add the {@link PingPongPlane} to the renderer and the {@link Scene}
   */
  addToScene() {
    this.renderer.pingPongPlanes.push(this)

    if (this.autoRender) {
      this.renderer.scene.addPingPongPlane(this)
    }
  }

  /**
   * Remove the {@link PingPongPlane} from the renderer and the {@link Scene}
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
