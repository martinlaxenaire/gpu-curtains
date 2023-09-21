import { isRenderer } from '../../utils/renderer-utils'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'
import { FullscreenPlane } from '../../core/meshes/FullscreenPlane'

export class PingPongPlane extends FullscreenPlane {
  constructor(renderer, parameters) {
    renderer = (renderer && renderer.renderer) || renderer

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
    })
  }

  get renderTexture() {
    return this.renderTextures[0] ?? null
  }

  addToScene() {
    this.renderer.pingPongPlanes.push(this)
    this.renderer.scene.addPingPongPlane(this)
  }

  removeFromScene() {
    if (this.renderTarget) {
      this.renderTarget.destroy()
    }

    this.renderer.scene.removePingPongPlane(this)
    this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid)
  }
}
