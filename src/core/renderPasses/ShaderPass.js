import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { RenderPass } from './RenderPass'
import { Texture } from '../textures/Texture'

export class ShaderPass extends FullscreenPlane {
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
  }

  resize(boundingRect) {
    super.resize(boundingRect)
    this.renderPass?.resize(boundingRect)

    if (this.renderTexture) {
      this.renderTexture.setSourceSize()
      this.renderTexture.createTexture()
    }
  }

  addToScene() {
    this.renderer.shaderPasses.push(this)
    this.renderer.scene.addShaderPass(this)
  }

  removeFromScene() {
    this.renderer.scene.removeShaderPass(this)
    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
  }

  // remove() {
  //   super.remove()
  // }

  destroy() {
    this.renderPass.destroy()
    super.destroy()
  }
}
