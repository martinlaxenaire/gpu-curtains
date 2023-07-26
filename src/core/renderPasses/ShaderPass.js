import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { RenderTexture } from '../textures/RenderTexture'
import { isRenderer } from '../../utils/renderer-utils'

export class ShaderPass extends FullscreenPlane {
  constructor(renderer, parameters) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    super(renderer, parameters)

    this.renderTextures = []

    this.createRenderTexture({
      label: parameters.label + ' Shader pass render texture',
      name: 'renderTexture',
    })
  }

  createRenderTexture(options) {
    if (!options.name) {
      options.name = 'texture' + this.textures.length
    }

    const renderTexture = new RenderTexture(this.renderer, options)

    this.material.addTextureBinding(renderTexture)
    this.renderTextures.push(renderTexture)

    return renderTexture
  }

  get renderTexture() {
    return this.renderTextures[0] ?? null
  }

  resize(boundingRect) {
    this.renderTextures?.forEach((renderTexture) => renderTexture.resize())

    super.resize(boundingRect)
  }

  addToScene() {
    this.renderer.shaderPasses.push(this)
    this.renderer.scene.addShaderPass(this)
  }

  removeFromScene() {
    this.renderer.scene.removeShaderPass(this)
    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
  }
}
