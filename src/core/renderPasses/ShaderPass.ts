import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { isRenderer, Renderer } from '../renderers/utils'
import { RenderTarget } from './RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseOptions, MeshBaseRenderParams } from '../meshes/mixins/MeshBaseMixin'
import { RenderTexture } from '../textures/RenderTexture'
import default_pass_fsWGSl from '../shaders/chunks/default_pass_fs.wgsl'
import { throwWarning } from '../../utils/utils'

/**
 * Parameters used to create a {@link ShaderPass}
 */
export interface ShaderPassParams extends MeshBaseRenderParams {
  /** Optional input {@link RenderTarget} to assign to the {@link ShaderPass}. Used to automatically copy the content of the given {@link RenderTarget} texture into the {@link ShaderPass#renderTexture | ShaderPass renderTexture}. */
  inputTarget?: RenderTarget

  /** Whether the result of this {@link ShaderPass} should be copied to the {@link ShaderPass#renderTexture | renderTexture} after each render. Default to false. */
  copyOutputToRenderTexture?: boolean
}

export interface ShaderPassOptions extends MeshBaseOptions {
  /** Whether the result of this {@link ShaderPass} should be copied to the {@link ShaderPass#renderTexture | renderTexture} after each render. Default to false. */
  copyOutputToRenderTexture?: boolean
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
  /** Optional input {@link RenderTarget} to assign to the {@link ShaderPass}. Used to automatically copy the content of the given {@link RenderTarget} texture into the {@link ShaderPass#renderTexture | ShaderPass renderTexture}. */
  inputTarget: RenderTarget | undefined

  /** Options used to create this {@link ShaderPass} */
  options: ShaderPassOptions

  /**
   * ShaderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams = {}) {
    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    // disable depth for postprocessing passes
    parameters.depth = false
    // force transparency to get the right alpha blending
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

    // force the postprocessing passes to not use depth
    parameters.depth = false

    super(renderer, parameters)

    if (parameters.inputTarget) {
      this.setInputTarget(parameters.inputTarget)
    }

    if (this.outputTarget) {
      // patch to match outputTarget if needed
      this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass)
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
   * Hook used to clean up parameters before sending them to the material.
   * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
   * @returns - cleaned parameters
   */
  cleanupRenderMaterialParameters(parameters: ShaderPassParams): MeshBaseRenderParams {
    // patch mesh parameters
    delete parameters.copyOutputToRenderTexture
    delete parameters.inputTarget

    super.cleanupRenderMaterialParameters(parameters)

    return parameters
  }

  /**
   * Get our main {@link RenderTexture} that contains the input content to be used by the {@link ShaderPass}. Can also contain the ouputted content if {@link ShaderPassOptions#copyOutputToRenderTexture | copyOutputToRenderTexture} is set to true.
   * @readonly
   */
  get renderTexture(): RenderTexture | undefined {
    return this.renderTextures.find((texture) => texture.options.name === 'renderTexture')
  }

  /**
   * Assign or remove an input {@link RenderTarget} to this {@link ShaderPass}, which can be different from what has just been drawn to the {@link core/renderers/GPURenderer.GPURenderer#context | context} current texture.
   *
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

    this.setRenderingOptionsForRenderPass(
      this.outputTarget ? this.outputTarget.renderPass : this.renderer.postProcessingPass
    )

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
