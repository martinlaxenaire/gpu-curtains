import { ShaderPass } from '../../core/renderPasses/ShaderPass'
import { isRenderer } from '../../utils/renderer-utils'
import { RenderTarget } from '../../core/renderPasses/RenderTarget'

export class PingPongPlane extends ShaderPass {
  constructor(renderer, parameters) {
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' PingPongPlane' : 'PingPongPlane')

    parameters.renderTarget = new RenderTarget(renderer, {
      label: parameters.label ? parameters.label + ' PingPongPlane render target' : 'PingPongPlane render target',
    })

    super(renderer, parameters)

    this.type = 'PingPongPlane'
  }

  addToScene() {
    this.renderer.pingPongPlanes.push(this)
    this.renderer.scene.addPingPongPlane(this)
  }

  removeFromScene() {
    this.renderer.scene.removePingPongPlane(this)
    this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid)
  }
}
