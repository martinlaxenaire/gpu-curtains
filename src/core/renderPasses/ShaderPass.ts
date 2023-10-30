import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { RenderTarget } from './RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseParams } from '../meshes/MeshBaseMixin'

interface ShaderPassParams extends MeshBaseParams {
  renderTarget?: RenderTarget
}

export class ShaderPass extends FullscreenPlane {
  renderTarget: RenderTarget | undefined

  constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    // force transparency to allow for correct blending between successive passes
    parameters.transparent = true

    super(renderer, parameters)

    this.type = 'ShaderPass'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'Shader pass render texture',
      name: 'renderTexture',
    })
  }

  get renderTexture() {
    return this.renderTextures[0] ?? null
  }

  addToScene() {
    this.renderer.shaderPasses.push(this)

    if (this.autoAddToScene) {
      this.renderer.scene.addShaderPass(this)
    }
  }

  removeFromScene() {
    if (this.renderTarget) {
      this.renderTarget.destroy()
    }

    if (this.autoAddToScene) {
      this.renderer.scene.removeShaderPass(this)
    }

    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
  }
}
