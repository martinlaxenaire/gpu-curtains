import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { isRenderer, Renderer } from '../renderers/utils'
import { RenderTarget } from './RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseRenderParams } from '../meshes/mixins/MeshBaseMixin'
import { RenderTexture } from '../textures/RenderTexture'
import default_pass_fsWGSl from '../shaders/chunks/default_pass_fs.wgsl'
import { throwWarning } from '../../utils/utils'

/**
 * Parameters used to create a {@link ShaderPass}
 */
export interface ShaderPassParams extends MeshBaseRenderParams {
  /** Optional output {@link RenderTarget} to assign to the {@link ShaderPass} */
  outputTarget?: RenderTarget

  // TODO
  /** Optional input {@link RenderTarget} to assign to the {@link ShaderPass} */
  inputTarget?: RenderTarget
}

/**
 * Used to apply postprocessing, i.e. draw meshes to a {@link RenderTexture} and then draw a {@link FullscreenPlane} using that texture as an input.
 *
 * A ShaderPass could either post process the whole scene or just a bunch of meshes using a specific {@link RenderTarget}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a ShaderPass
 * const shaderPass = new ShaderPass(gpuCurtain, {
 *   label: 'My shader pass',
 *   shaders: {
 *     fragment: {
 *       code: shaderPassCode, // assume it is a valid WGSL fragment shader
 *     },
 *   },
 * })
 * ```
 */
export class ShaderPass extends FullscreenPlane {
  /** {@link RenderTarget} content to use as an input if specified */
  outputTarget: RenderTarget | undefined

  // TODO
  /** Optional input {@link RenderTarget} to assign to the {@link ShaderPass} */
  inputTarget: RenderTarget | undefined

  /**
   * ShaderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    // force transparency to allow for correct blending between successive passes
    parameters.transparent = true
    parameters.label = parameters.label ?? 'ShaderPass ' + renderer.shaderPasses?.length

    // set default sample count to post processing render pass
    parameters.sampleCount = !!parameters.sampleCount
      ? parameters.sampleCount
      : renderer && renderer.postProcessingPass
      ? renderer && renderer.postProcessingPass.options.sampleCount
      : 1

    if (!parameters.shaders) {
      parameters.shaders = {}
    }

    if (!parameters.shaders.fragment) {
      parameters.shaders.fragment = {
        code: default_pass_fsWGSl,
        entryPoint: 'main',
      }
    }

    // force the post processing passes to not use depth
    parameters.depth = false

    super(renderer, parameters)

    if (parameters.inputTarget) {
      this.setInputTarget(parameters.inputTarget)
    }

    this.type = 'ShaderPass'

    this.createRenderTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'Shader pass render texture',
      name: 'renderTexture',
      fromTexture: this.inputTarget ? this.inputTarget.renderTexture : null,
      ...(this.outputTarget &&
        this.outputTarget.options.qualityRatio && { qualityRatio: this.outputTarget.options.qualityRatio }),
    })
  }

  /**
   * Get our main {@link RenderTexture}, the one that contains our post processed content
   * @readonly
   */
  get renderTexture(): RenderTexture | undefined {
    return this.renderTextures.find((texture) => texture.options.name === 'renderTexture')
  }

  /**
   * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
   * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
   * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
   * @param outputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
   */
  setOutputTarget(outputTarget: RenderTarget | null) {
    //super.setOutputTarget(outputTarget)

    if (outputTarget && outputTarget.type !== 'RenderTarget') {
      throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget}`)
      return
    }

    // ensure the mesh is in the correct scene stack
    this.removeFromScene()
    this.outputTarget = outputTarget

    this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass)

    this.addToScene()
  }

  // TODO
  /**
   * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
   * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
   * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
   * @param inputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
   */
  setInputTarget(inputTarget: RenderTarget | null) {
    if (inputTarget && inputTarget.type !== 'RenderTarget') {
      throwWarning(`${this.options.label ?? this.type}: inputTarget is not a RenderTarget: ${inputTarget}`)
      return
    }

    // ensure the mesh is in the correct scene stack
    this.removeFromScene()
    this.inputTarget = inputTarget
    this.addToScene()

    // it might not have been created yet
    if (this.renderTexture) {
      if (inputTarget) {
        this.renderTexture.copy(this.inputTarget.renderTexture)
      } else {
        this.renderTexture.options.fromTexture = null
        this.renderTexture.createTexture()
      }
    }
  }

  /**
   * Add the {@link ShaderPass} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  addToScene() {
    this.renderer.shaderPasses.push(this)

    if (this.autoRender) {
      this.renderer.scene.addShaderPass(this)
    }
  }

  /**
   * Remove the {@link ShaderPass} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
   */
  removeFromScene() {
    if (this.outputTarget) {
      this.outputTarget.destroy()
    }

    if (this.autoRender) {
      this.renderer.scene.removeShaderPass(this)
    }

    this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
  }
}
