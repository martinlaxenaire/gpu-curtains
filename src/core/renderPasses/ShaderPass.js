import { FullscreenQuadMesh } from '../meshes/FullscreenQuadMesh'
import { RenderPass } from './RenderPass'
import { Texture } from '../textures/Texture'

export class ShaderPass extends FullscreenQuadMesh {
  constructor(renderer, parameters) {
    super(renderer, parameters)

    this.renderPass = new RenderPass({ renderer })

    this.renderTexture = new Texture(this.renderer, {
      name: 'renderTexture',
      texture: {
        format: this.renderer.preferredFormat,
      },
    })

    this.renderTexture.loadRenderPass(this.renderPass)
    this.renderTexture.parent = this

    this.material.addTextureBinding(this.renderTexture)

    this.textures.push(this.renderTexture)

    this.renderer.shaderPasses.push(this)
    this.renderer.scene.addShaderPass(this)
  }

  resize(boundingRect) {
    super.resize(boundingRect)
    this.renderPass?.resize(boundingRect)

    if (this.renderTexture) {
      this.renderTexture.setSourceSize()
      this.renderTexture.createTexture()
    }
  }

  destroy() {
    super.destroy()
    this.renderPass.destroy()
  }
}
