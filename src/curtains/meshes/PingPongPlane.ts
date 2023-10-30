import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'
import { GPUCurtains } from '../GPUCurtains'
import { RenderTextureParams } from '../../types/core/textures/RenderTexture'
import { RenderTexture } from '../../core/textures/RenderTexture'
import { MeshBaseParams } from '../../core/meshes/MeshBaseMixin'

export class PingPongPlane extends FullscreenPlane {
  renderTarget: RenderTarget

  constructor(renderer: Renderer | GPUCurtains, parameters = {} as MeshBaseParams) {
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' PingPongPlane' : 'PingPongPlane')

    // we will render into a separate texture
    parameters.renderTarget = new RenderTarget(renderer, {
      label: parameters.label ? parameters.label + ' render target' : 'Ping Pong render target',
    })

    // no blending for ping pong planes
    parameters.transparent = false

    super(renderer, parameters)

    this.type = 'PingPongPlane'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'PingPongPlane render texture',
      name: 'renderTexture',
    } as RenderTextureParams)
  }

  get renderTexture(): RenderTexture | null {
    return this.renderTextures[0] ?? null
  }

  addToScene() {
    this.renderer.pingPongPlanes.push(this)

    if (this.autoAddToScene) {
      this.renderer.scene.addPingPongPlane(this)
    }
  }

  removeFromScene() {
    if (this.renderTarget) {
      this.renderTarget.destroy()
    }

    if (this.autoAddToScene) {
      this.renderer.scene.removePingPongPlane(this)
    }

    this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid)
  }
}
