import { FullscreenPlane } from '../meshes/FullscreenPlane'
import { isRenderer, Renderer } from '../renderers/utils'
import { RenderTarget } from './RenderTarget'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { MeshBaseOptions, MeshBaseRenderParams } from '../meshes/mixins/MeshBaseMixin'
import { Texture } from '../textures/Texture'
import { getDefaultShaderPassFragmentCode } from '../shaders/full/fragment/get-default-shader-pass-fragment-code'
import { throwWarning } from '../../utils/utils'

/** Base parameters used to create a {@link ShaderPass}. */
export interface ShaderPassBaseParams {
  /** {@link core/textures/Texture.TextureBaseParams | Texture name} to use for the {@link ShaderPass.renderTexture | ShaderPass renderTexture}. Default to `'renderTexture'`. */
  renderTextureName?: string

  /** Whether the result of this {@link ShaderPass} should be copied to the {@link ShaderPass#renderTexture | renderTexture} after each render. Default to false. */
  copyOutputToRenderTexture?: boolean

  /** Whether this {@link ShaderPass} should be rendered to the main buffer using the {@link Renderer#renderPass | renderer renderPass} before drawing the other objects to the main buffer. Useful for "blit" passes using the content of an {@link ShaderPass#inputTarget | inputTarget}. */
  isPrePass?: boolean
}

/**
 * Parameters used to create a {@link ShaderPass}.
 */
export interface ShaderPassParams extends MeshBaseRenderParams, ShaderPassBaseParams {
  /** Optional input {@link RenderTarget} to assign to the {@link ShaderPass}. Used to automatically copy the content of the given {@link RenderTarget} texture into the {@link ShaderPass#renderTexture | ShaderPass renderTexture}. */
  inputTarget?: RenderTarget
}

/** Options used to create this {@link ShaderPass}. */
export interface ShaderPassOptions extends MeshBaseOptions, ShaderPassBaseParams {}

/**
 * Used to apply postprocessing, i.e. draw meshes to a {@link Texture} and then draw a {@link FullscreenPlane} using that texture as an input.
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

  /** The {@link Texture} that contains the input content to be used by the {@link ShaderPass}. Can also contain the ouputted content if {@link ShaderPassOptions#copyOutputToRenderTexture | copyOutputToRenderTexture} is set to true. */
  renderTexture: Texture

  /** Options used to create this {@link ShaderPass} */
  options: ShaderPassOptions

  /**
   * ShaderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
   * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ShaderPassParams = {}) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + ' ShaderPass' : 'ShaderPass')

    parameters.isPrePass = !!parameters.isPrePass

    // blend equation specific to shader passes
    const defaultBlend: GPUBlendState = {
      color: {
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
      },
      alpha: {
        srcFactor: 'one',
        dstFactor: 'one-minus-src-alpha',
      },
    }

    if (!parameters.isPrePass) {
      if (!parameters.targets) {
        parameters.targets = [
          {
            blend: defaultBlend,
          },
        ]
      } else if (parameters.targets && parameters.targets.length && !parameters.targets[0].blend) {
        parameters.targets[0].blend = defaultBlend
      }
    }

    parameters.label = parameters.label ?? 'ShaderPass ' + renderer.shaderPasses?.length

    // set default sample count to post processing render pass
    parameters.sampleCount = !!parameters.sampleCount
      ? parameters.sampleCount
      : renderer && renderer.renderPass && parameters.isPrePass
      ? renderer.renderPass.options.sampleCount
      : renderer && renderer.postProcessingPass
      ? renderer && renderer.postProcessingPass.options.sampleCount
      : 1

    if (!parameters.shaders) {
      parameters.shaders = {}
    }

    if (!parameters.shaders.fragment) {
      parameters.shaders.fragment = {
        code: getDefaultShaderPassFragmentCode,
        entryPoint: 'main',
      }
    }

    // force the postprocessing passes to not use depth
    parameters.depth = parameters.isPrePass

    super(renderer, parameters)

    this.options = {
      ...this.options,
      copyOutputToRenderTexture: parameters.copyOutputToRenderTexture,
      isPrePass: parameters.isPrePass,
    }

    if (parameters.inputTarget) {
      this.setInputTarget(parameters.inputTarget)
    }

    if (this.outputTarget) {
      // patch to match outputTarget if needed
      this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass)
    }

    this.type = 'ShaderPass'

    this.renderTexture = this.createTexture({
      label: parameters.label ? `${parameters.label} render texture` : 'Shader pass render texture',
      name: parameters.renderTextureName ?? 'renderTexture',
      fromTexture: this.inputTarget ? this.inputTarget.renderTexture : null,
      usage: ['copySrc', 'copyDst', 'textureBinding'],
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
    delete parameters.isPrePass

    super.cleanupRenderMaterialParameters(parameters)

    return parameters
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
   * Add the {@link ShaderPass} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer as well.
   * @param addToRenderer - whether to add this {@link ShaderPass} to the {@link Renderer#shaderPasses | Renderer shaderPasses array}
   */
  addToScene(addToRenderer = false) {
    if (addToRenderer) {
      this.renderer.shaderPasses.push(this)
    }

    this.setRenderingOptionsForRenderPass(
      this.outputTarget
        ? this.outputTarget.renderPass
        : this.options.isPrePass
        ? this.renderer.renderPass
        : this.renderer.postProcessingPass
    )

    if (this.autoRender) {
      this.renderer.scene.addShaderPass(this)
    }
  }

  /**
   * Remove the {@link ShaderPass} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
   * @param removeFromRenderer - whether to remove this {@link ShaderPass} from the {@link Renderer#shaderPasses | Renderer shaderPasses array}
   */
  removeFromScene(removeFromRenderer = false) {
    if (this.outputTarget && removeFromRenderer) {
      this.outputTarget.destroy()
    }

    if (this.autoRender) {
      this.renderer.scene.removeShaderPass(this)
    }

    if (removeFromRenderer) {
      this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid)
    }
  }
}
