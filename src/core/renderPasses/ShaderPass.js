import { FullscreenQuadMesh } from '../meshes/FullscreenQuadMesh'
import { RenderPass } from './RenderPass'

export class ShaderPass extends FullscreenQuadMesh {
  constructor(renderer, parameters) {
    super(renderer, parameters)

    this.renderPass = new RenderPass({ renderer })

    this.renderTexture = this.createTexture({
      name: 'renderTexture',
      texture: {
        format: 'bgra8unorm',
      },
    })

    // TODO FBO texture type
    this.renderTexture.size.width = this.domElement.boundingRect.width
    this.renderTexture.size.height = this.domElement.boundingRect.height

    this.renderer.scene.addShaderPass(this)
  }

  destroy() {
    super.destroy()
    this.renderPass.destroy()
  }
}
