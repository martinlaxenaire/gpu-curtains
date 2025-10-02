import { ComputePass, ComputePassOptions, ComputePassParams } from '../../core/computePasses/ComputePass'
import { isRenderer, Renderer } from '../../core/renderers/utils'
import { ShaderPass, ShaderPassParams } from '../../core/renderPasses/ShaderPass'
import { Sampler } from '../../core/samplers/Sampler'
import { Texture, TextureParams } from '../../core/textures/Texture'
import type { GPUCurtains } from '../../curtains/GPUCurtains'

/** Define the {@link Texture | storage texture} parameters used in the compute shader. */
export interface ComputeStorageTextureParams {
  /** Name of the {@link Texture | storage texture} used in the compute shader. Default to `storageRenderTexture`. */
  name?: TextureParams['name']
  /** Format of the {@link Texture | storage texture} used in the compute shader, must be compatible with storage textures. Default to `rgba8unorm`. */
  format?: TextureParams['format']
}

/** Define the specific additional options to use with a {@link ComputeShaderPass}. */
export interface ComputeShaderPassSpecificOptions {
  /** Options used to create the {@link Texture | storage texture} used in the compute shader. */
  storageTextureParams: ComputeStorageTextureParams
  /** Workgroup size of the compute shader to use. Divided internally by the {@link Texture | storage texture} `[width, height]`. Default to `[16, 16]`. */
  textureDispatchSize: number | number[]
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
    renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ComputeShaderPass` : 'ComputeShaderPass')

    // isolate compute pass params
    const {
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

    let { label, textures, textureDispatchSize, visible, storageTextureParams } = otherParams

    // patch parameters
    label = label ?? 'ComputeShaderPass ' + renderer.computePasses?.length
    visible = visible === undefined ? true : visible

    const defaultStorageTextureParams: ComputeStorageTextureParams = {
      name: 'storageRenderTexture',
      format: 'rgba8unorm',
    }

    if (storageTextureParams) {
      storageTextureParams = { ...defaultStorageTextureParams, ...storageTextureParams }
    } else {
      storageTextureParams = defaultStorageTextureParams
    }

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
      label: `${label} storage render texture`,
      ...storageTextureParams,
      type: 'storage',
      visibility: ['compute'],
      usage: ['copySrc', 'copyDst', 'textureBinding', 'storageBinding'],
    })

    const renderTexture = new Texture(renderer, {
      label: `${label} render texture`,
      name: storageTextureParams.name,
      visibility: ['fragment'],
      fromTexture: storageTexture,
    })

    const { shaderPassSampler } = otherParams

    const shaderPass = new ShaderPass(renderer, {
      label: `${label} ShaderPass`,
      autoRender,
      shaders: {
        fragment: {
          code: /* wgsl */ `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) uv: vec2f,
            };

            @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
                return textureSample(${storageTextureParams.name}, ${
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

    const computeParams = {
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

    super(renderer, computeParams)

    this.options = {
      ...this.options,
      storageTextureParams,
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
