import { ComputePass, ComputePassOptions, ComputePassParams } from '../../core/computePasses/ComputePass'
import { Renderer } from '../../core/renderers/utils'
import { ShaderPass, ShaderPassParams } from '../../core/renderPasses/ShaderPass'
import { Sampler } from '../../core/samplers/Sampler'
import { Texture } from '../../core/textures/Texture'
import { GPUCurtains } from '../../curtains/GPUCurtains'

/** Define the specific additional options to use with a {@link ComputeShaderPass}. */
export interface ComputeShaderPassSpecificOptions {
  /** Workgroup size of the compute shader to use. Divided internally by the storage texture `[width, height]`. Default to `[16, 16]`. */
  textureDispatchSize: number | number[]
  /** Name of the {@link Texture | storage texture} used in the compute shader. */
  storageRenderTextureName: string
  /** Optional {@link Sampler} to use in the {@link ShaderPass} to sample the result. */
  shaderPassSampler: Sampler
}

/** Define the parameters used to create a {@link ComputeShaderPass}. */
export interface ComputeShaderPassParams
  extends Omit<ComputePassParams, 'dispatchSize' | 'autoRender' | 'renderOrder' | 'active'>,
    Omit<ShaderPassParams, 'label' | 'textures' | 'shaders' | 'samplers' | 'texturesOptions'>,
    Partial<ComputeShaderPassSpecificOptions> {}

/** Define the {@link ComputeShaderPass} options */
export interface ComputeShaderPassOptions extends ComputePassOptions, ComputeShaderPassSpecificOptions {}

/**
 * A special class used to leverage {@link ComputePass} shaders and {@link ShaderPass} for post processing effects.
 *
 * Allows to write post processing effects to a storage texture using a compute shader, which can be faster than regular {@link ShaderPass} in some cases.
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
 * const computeShaderPass = new ComputeShaderPass(gpuCurtains, {
 *   label: 'My compute shader pass',
 *   shaders: {
 *     compute: {
 *       code: computeShaderPassCode, // assume it is a valid WGSL compute shader
 *     },
 *   },
 *   textureDispatchSize: [16, 16], // divided by the render texture [width, height] internally
 * })
 * ```
 */
export class ComputeShaderPass extends ComputePass {
  /** Associated {@link ShaderPass} that just displays the result of the {@link ComputeShaderPass} compute shader. */
  shaderPass: ShaderPass
  /** {@link Texture | Storage texture} to write onto by the {@link ComputeShaderPass} compute shader. */
  storageTexture: Texture
  /** The same texture as {@link storageTexture} but with a different binding type, used to render the result in the {@link shaderPass}. */
  renderTexture: Texture

  /** Workgroup size of the compute shader. Divided internally by the {@link storageTexture} `[width, height]`. */
  textureDispatchSize: number[]

  /** Options used to create this {@link ComputeShaderPass}. */
  options: ComputeShaderPassOptions

  /**
   * ComputeShaderPass constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeShaderPass}.
   * @param parameters - {@link ComputeShaderPassParams | parameters} used to create our {@link ComputeShaderPass}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters: ComputeShaderPassParams = {}) {
    // isolate compute pass params
    const {
      label,
      shaders,
      useAsyncPipeline,
      texturesOptions,
      uniforms,
      storages,
      bindings,
      bindGroups,
      samplers,
      ...shaderPassParams
    } = parameters

    const { targets, renderOrder, autoRender, inputTarget, outputTarget, isPrePass, ...otherParams } = shaderPassParams

    let { textures, textureDispatchSize, visible, storageRenderTextureName } = otherParams

    // patch parameters
    visible = visible === undefined ? true : visible
    storageRenderTextureName = storageRenderTextureName ?? 'storageRenderTexture'

    if (!textureDispatchSize) {
      textureDispatchSize = [16, 16]
    }

    if (Array.isArray(textureDispatchSize)) {
      textureDispatchSize[0] = Math.ceil(textureDispatchSize[0] ?? 16)
      textureDispatchSize[1] = Math.ceil(textureDispatchSize[1] ?? 16)
    } else if (!isNaN(textureDispatchSize)) {
      textureDispatchSize = [Math.ceil(textureDispatchSize), Math.ceil(textureDispatchSize)]
    } else {
      textureDispatchSize = [16, 16]
    }

    // create a storage texture used in the compute shader
    // and a copy using a regular texture binding type to use in the shader pass
    const storageTexture = new Texture(renderer, {
      name: storageRenderTextureName,
      type: 'storage',
      visibility: ['compute'],
      usage: ['copySrc', 'copyDst', 'textureBinding', 'storageBinding'],
      format: texturesOptions && texturesOptions.format ? texturesOptions.format : 'rgba8unorm',
    })

    const renderTexture = new Texture(renderer, {
      name: storageRenderTextureName,
      visibility: ['fragment'],
      fromTexture: storageTexture,
    })

    const { shaderPassSampler } = otherParams

    const shaderPass = new ShaderPass(renderer, {
      label: label ? `${label} ShaderPass` : 'Compute ShaderPass',
      autoRender,
      shaders: {
        fragment: {
          code: /* wgsl */ `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) uv: vec2f,
            };

            @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
                return textureSample(${storageRenderTextureName ?? 'storageRenderTexture'}, ${
            shaderPassSampler ? shaderPassSampler.name : 'defaultSampler'
          }, fsInput.uv);
            }`,
        },
      },
      renderOrder,
      textures: [renderTexture],
      ...(shaderPassSampler && { samplers: [shaderPassSampler] }),
      visible,
      targets,
      inputTarget,
      outputTarget,
      isPrePass,
    })

    if (textures && textures.length) {
      textures = [storageTexture, shaderPass.renderTexture, ...textures]
    } else {
      textures = [storageTexture, shaderPass.renderTexture]
    }

    const params = {
      label,
      shaders,
      useAsyncPipeline,
      texturesOptions,
      uniforms,
      storages,
      bindings,
      bindGroups,
      textures,
      samplers,
      autoRender: false, // will be dispatched before rendering the shader pass
      active: visible,
      dispatchSize: [
        Math.ceil(storageTexture.size.width / textureDispatchSize[0]),
        Math.ceil(storageTexture.size.height / textureDispatchSize[1]),
      ],
    }

    super(renderer, params)

    this.options = {
      ...this.options,
      storageRenderTextureName,
      textureDispatchSize,
      ...(shaderPassSampler && { shaderPassSampler }),
    }

    this.textureDispatchSize = textureDispatchSize as number[]

    this.shaderPass = shaderPass
    this.storageTexture = storageTexture
    this.renderTexture = renderTexture

    // render the compute pass just before the shader pass
    const scenePassEntry = this.renderer.scene.getObjectRenderPassEntry(this.shaderPass)

    if (scenePassEntry) {
      const _onBeforeRenderPass = scenePassEntry.onBeforeRenderPass

      scenePassEntry.onBeforeRenderPass = (commandEncoder, swapChainTexture) => {
        _onBeforeRenderPass && _onBeforeRenderPass(commandEncoder, swapChainTexture)

        this.renderer.renderSingleComputePass(commandEncoder, this, false)
      }
    }
  }

  /**
   * Get whether the {@link ComputePass} and {@link ShaderPass} should run.
   */
  get visible(): boolean {
    return this.active
  }

  /**
   * Set whether the {@link ComputePass} and {@link ShaderPass} should run.
   */
  set visible(value: boolean) {
    this.active = value
    this.shaderPass.visible = value
  }

  /**
   * Update the dispatch size and resize.
   */
  resize() {
    this.material.dispatchSize = [
      Math.ceil(this.storageTexture.size.width / this.textureDispatchSize[0]),
      Math.ceil(this.storageTexture.size.height / this.textureDispatchSize[1]),
    ]

    super.resize()
  }

  /**
   * Destroy the {@link ComputeShaderPass}.
   */
  destroy() {
    this.shaderPass.remove()
    this.storageTexture.destroy()
    this.renderTexture.destroy()

    super.destroy()
  }
}
