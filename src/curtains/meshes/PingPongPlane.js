import { ShaderPass } from '../../core/renderPasses/ShaderPass'
import { isRenderer } from '../../utils/renderer-utils'

export class PingPongPlane extends ShaderPass {
  constructor(renderer, parameters) {
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' PingPongPlane' : 'PingPongPlane')

    super(renderer, parameters)
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
