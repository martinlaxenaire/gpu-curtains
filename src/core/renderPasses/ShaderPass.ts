import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { isRenderer, Renderer } from '../renderers/utils'
import { RenderTarget } from './RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseRenderParams } from '../meshes/MeshBaseMixin'
import { RenderTexture } from '../textures/RenderTexture'

/**
 * Parameters used to create a {@link ShaderPass}
 */
export interface ShaderPassParams extends MeshBaseRenderParams {
  renderTarget?: RenderTarget
}

/**
 * ShaderPass class:
 * Used to apply post processing, i.e. render meshes to a [render texture]{@link RenderTexture} and then draw a {@link FullscreenPlane} using that texture as an input.
 * A ShaderPass could either post process the whole scene or just a bunch of meshes using a {@link RenderTarget}.
 */
export class ShaderPass extends FullscreenPlane {
  /** {@link RenderTarget} content to use as an input if specified */
  renderTarget: RenderTarget | undefined

  /**
   * ShaderPass constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - [parameters]{@link ShaderPassParams} use to create this {@link ShaderPass}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    // force transparency to allow for correct blending between successive passes
    parameters.transparent = true
    parameters.label = parameters.label ?? 'ShaderPass ' + renderer.shaderPasses?.length

    super(renderer, parameters)

    this.type = 'ShaderPass'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'Shader pass render texture',
      name: 'renderTexture',
      fromTexture: this.renderTarget ? this.renderTarget.renderTexture : null,
    })
  }

  /**
   * Get our main [render texture]{@link RenderTexture}, the one that contains our post processed content
   * @readonly
   */
  get renderTexture(): RenderTexture | undefined {
    return this.renderTextures.find((texture) => texture.options.name === 'renderTexture')
  }

  /**
   * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
   * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
   * Also copy or remove the [render target render texture]{@link RenderTarget#renderTexture} into the [shader pass render texture]{@link ShaderPass#renderTexture}
   * @param renderTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
   */
  setRenderTarget(renderTarget: RenderTarget | null) {
    super.setRenderTarget(renderTarget)

    if (renderTarget) {
      this.renderTexture.copy(this.renderTarget.renderTexture)
    } else {
      this.renderTexture.options.fromTexture = null
      this.renderTexture.createTexture()
    }
  }

  /**
   * Add the {@link ShaderPass} to the renderer and the {@link Scene}
   */
  addToScene() {
    this.renderer.shaderPasses.push(this)

    if (this.autoRender) {
      this.renderer.scene.addShaderPass(this)
    }
  }

  /**
   * Remove the {@link ShaderPass} from the renderer and the {@link Scene}
   */
  removeFromScene() {
    if (this.renderTarget) {
      this.renderTarget.destroy()
    }

    if (this.autoRender) {
      this.renderer.scene.removeShaderPass(this)
    }

    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
  }
}
