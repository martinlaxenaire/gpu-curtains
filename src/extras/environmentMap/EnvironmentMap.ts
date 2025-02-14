import { isRenderer, Renderer } from '../../core/renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { HDRImageData, HDRLoader } from '../loaders/HDRLoader'
import { Texture, TextureParams } from '../../core/textures/Texture'
import { ComputePass } from '../../core/computePasses/ComputePass'
import { Vec2 } from '../../math/Vec2'
import { throwWarning } from '../../utils/utils'
import { Sampler } from '../../core/samplers/Sampler'
import { Mat3 } from '../../math/Mat3'
import { computeBRDFLUT } from '../../core/shaders/full/compute/compute-BRDF-LUT'
import { computeSpecularCubemapFromHDR } from '../../core/shaders/full/compute/compute-specular-cubemap-from-HDR'
import { computeDiffuseFromSpecularCubemap } from '../../core/shaders/full/compute/compute-diffuse-from-specular-cubemap'

/** Define the base parameters for the {@link ComputePass} {@link Texture} writing. */
export interface ComputePassTextureParams {
  /** The size of the {@link Texture}, knowing the `width` and `height` are equal. */
  size?: number
  /** Number of samples to use in the {@link ComputePass} to generate the {@link Texture}. */
  computeSampleCount?: number
}

/** Define the base {@link Texture} parameters for the textures. */
export interface ComputeTextureBaseParams {
  /** Label of the {@link Texture}. */
  label?: TextureParams['label']
  /** Name of the {@link Texture}. */
  name?: TextureParams['name']
  /** Format of the {@link Texture}. */
  format?: TextureParams['format']
}

/** Define the parameters used to create the LUT {@link Texture}. */
export interface LUTTextureParams extends ComputePassTextureParams, ComputeTextureBaseParams {}
/** Define the parameters used to create the diffuse cube map {@link Texture}. */
export interface DiffuseTextureParams extends ComputePassTextureParams, ComputeTextureBaseParams {}
/** Define the parameters used to create the specular cube map {@link Texture}. */
export interface SpecularTextureParams extends ComputeTextureBaseParams {
  /** Whether to generate mips for this {@link Texture} or not. */
  generateMips?: TextureParams['generateMips']
}

/** Define the options used to create the textures by the {@link EnvironmentMap}. */
export interface EnvironmentMapOptions {
  /** Define the parameters used to create the LUT {@link Texture}. */
  lutTextureParams: LUTTextureParams
  /** Define the parameters used to create the diffuse cube map {@link Texture}. */
  diffuseTextureParams: DiffuseTextureParams
  /** Define the parameters used to create the specular cube map {@link Texture}. */
  specularTextureParams: SpecularTextureParams
  /** Define the intensity of the indirect diffuse contribution to use in a PBR shader. Default to `1`. */
  diffuseIntensity: number
  /** Define the intensity of the indirect specular contribution to use in a PBR shader. Default to `1`. */
  specularIntensity: number
  /** Define the {@link EnvironmentMap} rotation along Y axis, in radians. Default to `Math.PI / 2` (90 degrees). */
  rotation: number
}

/** Define the parameters used to create the {@link EnvironmentMap}. */
export interface EnvironmentMapParams extends Partial<EnvironmentMapOptions> {}

/**
 * Utility to create environment maps specular, diffuse and LUT textures using an HDR file.
 *
 * Create a LUT texture on init using a {@link ComputePass}. Can load an HDR file and then create the specular and diffuse textures using two separate {@link ComputePass}.
 *
 * Especially useful for IBL shading with {@link extras/meshes/LitMesh.LitMesh | LitMesh}.
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid renderer or curtains instance
 * const environmentMap = new EnvironmentMap(renderer)
 * await environmentMap.loadAndComputeFromHDR('path/to/environment-map.hdr')
 * ```
 */
export class EnvironmentMap {
  /** The {@link Renderer} used. */
  renderer: Renderer
  /** The {@link Sampler} used in both the {@link ComputePass} and in `IBL` shading from the {@link core/shaders/full/fragment/get-PBR-fragment-shader-code | getPBRFragmentShaderCode} utility function. */
  sampler: Sampler
  /** {@link HDRLoader} used to load the .hdr file. */
  hdrLoader: HDRLoader

  /** Parsed {@link HDRImageData} from the {@link HDRLoader} if any. */
  #hdrData: HDRImageData | null

  /** Options used to generate the {@link lutTexture}, {@link specularTexture} and {@link diffuseTexture}. */
  options: EnvironmentMapOptions

  /** Define the default environment maps rotation {@link Mat3}. */
  rotationMatrix: Mat3

  /** BRDF GGX LUT storage {@link Texture} used in the compute shader. */
  #lutStorageTexture: Texture

  /** BRDF GGX LUT {@link Texture} used for IBL shading. */
  lutTexture: Texture | null
  /** Diffuse environment cube map {@link Texture}. */
  diffuseTexture: Texture | null
  /** Specular environment cube map {@link Texture}. */
  specularTexture: Texture | null

  // callbacks / events
  /** function assigned to the {@link onRotationAxisChanged} callback */
  _onRotationAxisChangedCallback = () => {
    /* allow empty callback */
  }

  /**
   * {@link EnvironmentMap} constructor.
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link EnvironmentMap}.
   * @param params - {@link EnvironmentMapParams | parameters} use to create this {@link EnvironmentMap}. Defines the various textures options.
   */
  constructor(renderer: Renderer | GPUCurtains, params: EnvironmentMapParams = {}) {
    this.setRenderer(renderer)

    params = {
      ...{
        lutTextureParams: {
          size: 256,
          computeSampleCount: 1024,
          label: 'Environment LUT texture',
          name: 'lutTexture',
          format: 'rgba32float',
        },
        diffuseTextureParams: {
          size: 128,
          computeSampleCount: 2048,
          label: 'Environment diffuse texture',
          name: 'envDiffuseTexture',
          format: 'rgba16float',
        },
        specularTextureParams: {
          label: 'Environment specular texture',
          name: 'envSpecularTexture',
          format: 'rgba16float',
          generateMips: true,
        },
        diffuseIntensity: 1,
        specularIntensity: 1,
        rotation: Math.PI / 2,
      },
      ...params,
    } as EnvironmentMapParams

    this.options = params as EnvironmentMapOptions

    this.sampler = new Sampler(this.renderer, {
      label: 'Clamp sampler',
      name: 'clampSampler',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
      addressModeU: 'clamp-to-edge',
      addressModeV: 'clamp-to-edge',
    })

    this.rotationMatrix = new Mat3().rotateByAngleY(-Math.PI / 2)

    this.hdrLoader = new HDRLoader()

    // generate LUT texture right now
    this.computeBRDFLUTTexture()
  }

  /**
   * Set or reset this {@link EnvironmentMap} {@link EnvironmentMap.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer: Renderer | GPUCurtains) {
    renderer = isRenderer(renderer, 'EnvironmentMap')
    this.renderer = renderer
  }

  /**
   * Get the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
   */
  get rotation(): number {
    return this.options.rotation
  }

  /**
   * Set the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
   * @param value - New {@link EnvironmentMapOptions.rotation | rotation} to use, in radians.
   */
  set rotation(value: number) {
    if (value !== this.options.rotation) {
      this.options.rotation = value
      // need a clockwise rotation
      this.rotationMatrix.rotateByAngleY(-value)

      this._onRotationAxisChangedCallback && this._onRotationAxisChangedCallback()
    }
  }

  /**
   * Callback to call whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
   * @param callback - Called whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
   */
  onRotationAxisChanged(callback: () => void): this {
    if (callback) {
      this._onRotationAxisChangedCallback = callback
    }

    return this
  }

  /**
   * Run a {@link ComputePass} once by creating a {@link GPUCommandEncoder} and execute the pass.
   * @param parameters - Parameters used to run the compute pass.
   * @param parameters.computePass - {@link ComputePass} to run.
   * @param parameters.label - Optional label for the {@link GPUCommandEncoder}.
   * @param parameters.onAfterCompute - Optional callback to run just after the pass has been executed. Useful for eventual texture copies.
   * @private
   */
  #runComputePass({
    computePass,
    label = '',
    onAfterCompute = (commandEncoder) => {},
  }: {
    /** {@link ComputePass} to run. */
    computePass: ComputePass
    /** Optional label for the {@link GPUCommandEncoder}. */
    label?: string
    /** Optional callback to run just after the pass has been executed. Useful for eventual texture copies. */
    onAfterCompute?: (commandEncoder: GPUCommandEncoder) => void
  }) {
    const commandEncoder = this.renderer.device?.createCommandEncoder({
      label,
    })
    !this.renderer.production && commandEncoder.pushDebugGroup(label)

    this.renderer.renderSingleComputePass(commandEncoder, computePass, false)

    onAfterCompute(commandEncoder)

    !this.renderer.production && commandEncoder.popDebugGroup()
    const commandBuffer = commandEncoder.finish()
    this.renderer.device?.queue.submit([commandBuffer])

    this.renderer.pipelineManager.resetCurrentPipeline()
  }

  /**
   * Create the {@link lutTexture | BRDF GGX LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
   */
  async computeBRDFLUTTexture() {
    // specific lut texture options
    const { size, computeSampleCount, ...lutTextureParams } = this.options.lutTextureParams

    this.#lutStorageTexture = new Texture(this.renderer, {
      label: 'LUT storage texture',
      name: 'lutStorageTexture',
      format: lutTextureParams.format,
      visibility: ['compute', 'fragment'],
      usage: ['copySrc', 'storageBinding', 'textureBinding'],
      type: 'storage',
      fixedSize: {
        width: size,
        height: size,
      },
      autoDestroy: false,
    })

    this.lutTexture = new Texture(this.renderer, {
      ...lutTextureParams,
      visibility: ['fragment'],
      fixedSize: {
        width: size,
        height: size,
      },
      autoDestroy: false,
      fromTexture: this.#lutStorageTexture,
    })

    let computeLUTPass = new ComputePass(this.renderer, {
      label: 'Compute LUT texture',
      autoRender: false, // we're going to render only on demand
      dispatchSize: [
        Math.ceil(this.#lutStorageTexture.size.width / 16),
        Math.ceil(this.#lutStorageTexture.size.height / 16),
        1,
      ],
      shaders: {
        compute: {
          code: computeBRDFLUT,
        },
      },
      uniforms: {
        params: {
          struct: {
            sampleCount: {
              type: 'u32',
              value: computeSampleCount,
            },
          },
        },
      },
      textures: [this.#lutStorageTexture],
    })

    await computeLUTPass.material.compileMaterial()

    this.#runComputePass({ computePass: computeLUTPass, label: 'Compute LUT texture command encoder' })
    this.lutTexture.textureBinding.resource = this.lutTexture.texture

    // once command encoder has been submitted, free the resources
    computeLUTPass.destroy()
    computeLUTPass = null
  }

  /**
   * Create the {@link specularTexture | specular cube map texture} from a loaded {@link HDRImageData} using the provided {@link SpecularTextureParams | specular texture options} and a {@link ComputePass} that runs once.
   * @param parsedHdr - parsed {@link HDRImageData} loaded by the {@link hdrLoader}.
   */
  async computeSpecularCubemapFromHDRData(parsedHdr: HDRImageData) {
    let cubeStorageTexture = new Texture(this.renderer, {
      label: 'Specular storage cubemap',
      name: 'specularStorageCubemap',
      format: this.specularTexture.options.format,
      visibility: ['compute'],
      usage: ['copySrc', 'storageBinding'],
      type: 'storage',
      fixedSize: {
        width: this.specularTexture.size.width,
        height: this.specularTexture.size.height,
        depth: 6,
      },
      viewDimension: '2d-array',
    })

    let computeCubeMapPass = new ComputePass(this.renderer, {
      label: 'Compute specular cubemap from equirectangular',
      autoRender: false, // we're going to render only on demand
      dispatchSize: [
        Math.ceil(this.specularTexture.size.width / 8),
        Math.ceil(this.specularTexture.size.height / 8),
        6,
      ],
      shaders: {
        compute: {
          code: computeSpecularCubemapFromHDR,
        },
      },
      storages: {
        params: {
          struct: {
            hdrImageData: {
              type: 'array<vec4f>',
              value: parsedHdr.data,
            },
            imageSize: {
              type: 'vec2f',
              value: new Vec2(parsedHdr.width, parsedHdr.height),
            },
            faceSize: {
              type: 'u32',
              value: this.specularTexture.size.width,
            },
          },
        },
      },
      textures: [cubeStorageTexture],
    })

    await computeCubeMapPass.material.compileMaterial()

    // do it right now
    // before computing the diffuse texture
    this.#runComputePass({
      computePass: computeCubeMapPass,
      label: 'Compute specular cube map command encoder',
      onAfterCompute: (commandEncoder) => {
        // copy the result to our specular texture
        this.renderer.copyGPUTextureToTexture(cubeStorageTexture.texture, this.specularTexture, commandEncoder)
        this.specularTexture.textureBinding.resource = this.specularTexture.texture
      },
    })

    // once command encoder has been submitted, free the resources
    computeCubeMapPass.destroy()
    cubeStorageTexture.destroy()
    cubeStorageTexture = null
    computeCubeMapPass = null
  }

  /**
   * Compute the {@link diffuseTexture | diffuse cube map texture} from the {@link specularTexture | specular cube map texture } using the provided {@link DiffuseTextureParams | diffuse texture options} and a {@link ComputePass} that runs once.
   */
  async computeDiffuseFromSpecular() {
    if (this.specularTexture.options.viewDimension !== 'cube') {
      throwWarning(
        'Could not compute the diffuse texture because the specular texture is not a cube map:' +
          this.specularTexture.options.viewDimension
      )
      return
    }

    let diffuseStorageTexture = new Texture(this.renderer, {
      label: 'Diffuse storage cubemap',
      name: 'diffuseEnvMap',
      format: this.diffuseTexture.options.format,
      visibility: ['compute'],
      usage: ['copySrc', 'storageBinding'],
      type: 'storage',
      fixedSize: {
        width: this.diffuseTexture.size.width,
        height: this.diffuseTexture.size.height,
        depth: 6,
      },
      viewDimension: '2d-array',
    })

    let computeDiffusePass = new ComputePass(this.renderer, {
      label: 'Compute diffuse map from specular map',
      autoRender: false, // we're going to render only on demand
      dispatchSize: [Math.ceil(this.diffuseTexture.size.width / 8), Math.ceil(this.diffuseTexture.size.height / 8), 6],
      shaders: {
        compute: {
          code: computeDiffuseFromSpecularCubemap(this.specularTexture),
        },
      },
      uniforms: {
        params: {
          struct: {
            faceSize: {
              type: 'u32',
              value: this.diffuseTexture.size.width,
            },
            maxMipLevel: {
              type: 'u32',
              value: this.specularTexture.texture.mipLevelCount,
            },
            sampleCount: {
              type: 'u32',
              value: this.options.diffuseTextureParams.computeSampleCount,
            },
          },
        },
      },
      samplers: [this.sampler],
      textures: [this.specularTexture, diffuseStorageTexture],
    })

    await computeDiffusePass.material.compileMaterial()

    this.#runComputePass({
      computePass: computeDiffusePass,
      label: 'Compute diffuse cube map from specular cube map command encoder',
      onAfterCompute: (commandEncoder) => {
        // copy the result to our diffuse texture
        this.renderer.copyGPUTextureToTexture(diffuseStorageTexture.texture, this.diffuseTexture, commandEncoder)
        this.diffuseTexture.textureBinding.resource = this.diffuseTexture.texture
      },
    })

    // once command encoder has been submitted, free the resources
    computeDiffusePass.destroy()
    diffuseStorageTexture.destroy()
    diffuseStorageTexture = null
    computeDiffusePass = null
  }

  /**
   * Load an HDR environment map and then generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
   * @param url - The url of the .hdr file to load.
   */
  async loadAndComputeFromHDR(url: string) {
    this.#hdrData = await this.hdrLoader.loadFromUrl(url)

    const { width, height } = this.#hdrData ? this.#hdrData : { width: 1024, height: 512 }

    const faceSize = Math.max(width / 4, height / 2)

    // now prepare the textures

    // default options to absolutely use
    const textureDefaultOptions: TextureParams = {
      viewDimension: 'cube',
      autoDestroy: false, // keep alive when changing mesh
    }

    // specular texture
    if (!this.specularTexture) {
      this.specularTexture = new Texture(this.renderer, {
        ...this.options.specularTextureParams,
        ...{
          visibility: ['fragment', 'compute'],
          fixedSize: {
            width: faceSize,
            height: faceSize,
          },
        },
        ...textureDefaultOptions,
      } as TextureParams)
    } else if (this.specularTexture.size.width !== faceSize || this.specularTexture.size.height !== faceSize) {
      this.specularTexture.options.fixedSize.width = faceSize
      this.specularTexture.options.fixedSize.height = faceSize
      this.specularTexture.size.width = faceSize
      this.specularTexture.size.height = faceSize
      this.specularTexture.createTexture()
    }

    // specific diffuse texture options
    const { size, computeSampleCount, ...diffuseTextureParams } = this.options.diffuseTextureParams

    const diffuseSize = Math.min(size, faceSize)

    if (!this.diffuseTexture) {
      // diffuse texture
      this.diffuseTexture = new Texture(this.renderer, {
        ...diffuseTextureParams,
        ...{
          visibility: ['fragment'],
          fixedSize: {
            width: diffuseSize,
            height: diffuseSize,
          },
        },
        ...textureDefaultOptions,
      } as TextureParams)
    } else if (this.diffuseTexture.size.width !== diffuseSize || this.diffuseTexture.size.height !== diffuseSize) {
      this.diffuseTexture.options.fixedSize.width = diffuseSize
      this.diffuseTexture.options.fixedSize.height = diffuseSize
      this.diffuseTexture.size.width = diffuseSize
      this.diffuseTexture.size.height = diffuseSize
      this.diffuseTexture.createTexture()
    }

    this.computeFromHDR()
  }

  /**
   * Generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
   */
  computeFromHDR() {
    if (this.#hdrData) {
      this.computeSpecularCubemapFromHDRData(this.#hdrData).then(() => {
        this.computeDiffuseFromSpecular()
      })
    }
  }

  /**
   * Destroy the {@link EnvironmentMap} and its associated textures.
   */
  destroy() {
    this.lutTexture?.destroy()
    this.diffuseTexture?.destroy()
    this.specularTexture?.destroy()

    // destroy LUT storage texture
    this.#lutStorageTexture.destroy()
  }
}
