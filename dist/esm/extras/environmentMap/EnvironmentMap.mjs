import { isRenderer } from '../../core/renderers/utils.mjs';
import { HDRLoader } from '../loaders/HDRLoader.mjs';
import { Texture } from '../../core/textures/Texture.mjs';
import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { generateUUID, throwWarning } from '../../utils/utils.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { Mat3 } from '../../math/Mat3.mjs';
import { computeBRDFLUT } from '../../core/shaders/full/compute/compute-BRDF-LUT.mjs';
import { computeSpecularCubemapFromHDR } from '../../core/shaders/full/compute/compute-specular-cubemap-from-HDR.mjs';
import { computeDiffuseFromSpecularCubemap } from '../../core/shaders/full/compute/compute-diffuse-from-specular-cubemap.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _hdrData, _lutStorageTexture, _EnvironmentMap_instances, runComputePass_fn;
class EnvironmentMap {
  /**
   * {@link EnvironmentMap} constructor.
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link EnvironmentMap}.
   * @param params - {@link EnvironmentMapParams | parameters} use to create this {@link EnvironmentMap}. Defines the various textures options.
   */
  constructor(renderer, params = {}) {
    __privateAdd(this, _EnvironmentMap_instances);
    /** Parsed {@link HDRImageData} from the {@link HDRLoader} if any. */
    __privateAdd(this, _hdrData);
    /** BRDF GGX LUT storage {@link Texture} used in the compute shader. */
    __privateAdd(this, _lutStorageTexture);
    // callbacks / events
    /** function assigned to the {@link onRotationAxisChanged} callback */
    this._onRotationAxisChangedCallback = () => {
    };
    this.uuid = generateUUID();
    this.setRenderer(renderer);
    params = {
      ...{
        lutTextureParams: {
          size: 256,
          computeSampleCount: 1024,
          label: "Environment LUT texture",
          name: "lutTexture",
          format: "rgba32float"
        },
        diffuseTextureParams: {
          size: 128,
          computeSampleCount: 2048,
          label: "Environment diffuse texture",
          name: "envDiffuseTexture",
          format: "rgba16float"
        },
        specularTextureParams: {
          label: "Environment specular texture",
          name: "envSpecularTexture",
          format: "rgba16float",
          generateMips: true
        },
        diffuseIntensity: 1,
        specularIntensity: 1,
        rotation: Math.PI / 2
      },
      ...params
    };
    this.options = params;
    this.sampler = new Sampler(this.renderer, {
      label: "Clamp sampler",
      name: "clampSampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge"
    });
    this.rotationMatrix = new Mat3().rotateByAngleY(-Math.PI / 2);
    this.hdrLoader = new HDRLoader();
    this.createLUTTextures();
    this.createSpecularDiffuseTextures();
    this.computeBRDFLUTTexture();
  }
  /**
   * Set or reset this {@link EnvironmentMap} {@link EnvironmentMap.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.renderer) {
      this.renderer.environmentMaps.delete(this.uuid);
    }
    renderer = isRenderer(renderer, "EnvironmentMap");
    this.renderer = renderer;
    this.renderer.environmentMaps.set(this.uuid, this);
  }
  /**
   * Get the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
   */
  get rotation() {
    return this.options.rotation;
  }
  /**
   * Set the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
   * @param value - New {@link EnvironmentMapOptions.rotation | rotation} to use, in radians.
   */
  set rotation(value) {
    if (value !== this.options.rotation) {
      this.options.rotation = value;
      this.rotationMatrix.rotateByAngleY(-value);
      this._onRotationAxisChangedCallback && this._onRotationAxisChangedCallback();
    }
  }
  /**
   * Callback to call whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
   * @param callback - Called whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
   */
  onRotationAxisChanged(callback) {
    if (callback) {
      this._onRotationAxisChangedCallback = callback;
    }
    return this;
  }
  /**
   * Create our {@link lutTexture} eagerly.
   */
  createLUTTextures() {
    const { size, computeSampleCount, ...lutTextureParams } = this.options.lutTextureParams;
    __privateSet(this, _lutStorageTexture, new Texture(this.renderer, {
      label: "LUT storage texture",
      name: "lutStorageTexture",
      format: lutTextureParams.format,
      visibility: ["compute", "fragment"],
      usage: ["copySrc", "storageBinding", "textureBinding"],
      type: "storage",
      fixedSize: {
        width: size,
        height: size
      },
      autoDestroy: false
    }));
    this.lutTexture = new Texture(this.renderer, {
      ...lutTextureParams,
      visibility: ["fragment"],
      fixedSize: {
        width: size,
        height: size
      },
      autoDestroy: false,
      fromTexture: __privateGet(this, _lutStorageTexture)
    });
  }
  /**
   * Create our {@link specularTexture} and {@link diffuseTexture} eagerly. They could be resized later when calling the {@link computeFromHDR} method.
   */
  createSpecularDiffuseTextures() {
    const textureDefaultOptions = {
      viewDimension: "cube",
      autoDestroy: false
      // keep alive when changing mesh
    };
    this.specularTexture = new Texture(this.renderer, {
      ...this.options.specularTextureParams,
      ...{
        visibility: ["fragment", "compute"],
        // could be resized later
        fixedSize: {
          width: 256,
          height: 256
        }
      },
      ...textureDefaultOptions
    });
    const { size, computeSampleCount, ...diffuseTextureParams } = this.options.diffuseTextureParams;
    this.diffuseTexture = new Texture(this.renderer, {
      ...diffuseTextureParams,
      ...{
        visibility: ["fragment"],
        // could be resized later
        fixedSize: {
          width: size,
          height: size
        }
      },
      ...textureDefaultOptions
    });
  }
  /**
   * Create the {@link lutTexture | BRDF GGX LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
   */
  async computeBRDFLUTTexture() {
    let cachedLUT = null;
    for (const renderer of this.renderer.deviceManager.renderers) {
      for (const [uuid, envMap] of renderer.environmentMaps) {
        if (uuid !== this.uuid && envMap.lutTexture && envMap.lutTexture.size.width === this.lutTexture.size.width) {
          cachedLUT = envMap.lutTexture;
          break;
        }
      }
      if (cachedLUT) break;
    }
    if (cachedLUT) {
      this.lutTexture.copy(cachedLUT);
      return;
    }
    const { computeSampleCount } = this.options.lutTextureParams;
    let computeLUTPass = new ComputePass(this.renderer, {
      label: "Compute LUT texture",
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [
        Math.ceil(__privateGet(this, _lutStorageTexture).size.width / 16),
        Math.ceil(__privateGet(this, _lutStorageTexture).size.height / 16),
        1
      ],
      shaders: {
        compute: {
          code: computeBRDFLUT
        }
      },
      uniforms: {
        params: {
          struct: {
            sampleCount: {
              type: "u32",
              value: computeSampleCount
            }
          }
        }
      },
      textures: [__privateGet(this, _lutStorageTexture)]
    });
    await computeLUTPass.material.compileMaterial();
    __privateMethod(this, _EnvironmentMap_instances, runComputePass_fn).call(this, { computePass: computeLUTPass, label: "Compute LUT texture command encoder" });
    this.lutTexture.textureBinding.resource = this.lutTexture.texture;
    computeLUTPass.remove();
    computeLUTPass = null;
  }
  /**
   * Create the {@link specularTexture | specular cube map texture} from a loaded {@link HDRImageData} using the provided {@link SpecularTextureParams | specular texture options} and a {@link ComputePass} that runs once.
   * @param parsedHdr - parsed {@link HDRImageData} loaded by the {@link hdrLoader}.
   */
  async computeSpecularCubemapFromHDRData(parsedHdr) {
    let cubeStorageTexture = new Texture(this.renderer, {
      label: "Specular storage cubemap",
      name: "specularStorageCubemap",
      format: this.specularTexture.options.format,
      visibility: ["compute"],
      usage: ["copySrc", "storageBinding"],
      type: "storage",
      fixedSize: {
        width: this.specularTexture.size.width,
        height: this.specularTexture.size.height,
        depth: 6
      },
      viewDimension: "2d-array"
    });
    let computeCubeMapPass = new ComputePass(this.renderer, {
      label: "Compute specular cubemap from equirectangular",
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [
        Math.ceil(this.specularTexture.size.width / 8),
        Math.ceil(this.specularTexture.size.height / 8),
        6
      ],
      shaders: {
        compute: {
          code: computeSpecularCubemapFromHDR
        }
      },
      storages: {
        params: {
          struct: {
            hdrImageData: {
              type: "array<vec4f>",
              value: parsedHdr.data
            },
            imageSize: {
              type: "vec2f",
              value: new Vec2(parsedHdr.width, parsedHdr.height)
            },
            faceSize: {
              type: "u32",
              value: this.specularTexture.size.width
            }
          }
        }
      },
      textures: [cubeStorageTexture]
    });
    await computeCubeMapPass.material.compileMaterial();
    __privateMethod(this, _EnvironmentMap_instances, runComputePass_fn).call(this, {
      computePass: computeCubeMapPass,
      label: "Compute specular cube map command encoder",
      onAfterCompute: (commandEncoder) => {
        this.renderer.copyGPUTextureToTexture(cubeStorageTexture.texture, this.specularTexture, commandEncoder);
        this.specularTexture.textureBinding.resource = this.specularTexture.texture;
      }
    });
    computeCubeMapPass.remove();
    cubeStorageTexture.destroy();
    cubeStorageTexture = null;
    computeCubeMapPass = null;
  }
  /**
   * Compute the {@link diffuseTexture | diffuse cube map texture} from the {@link specularTexture | specular cube map texture } using the provided {@link DiffuseTextureParams | diffuse texture options} and a {@link ComputePass} that runs once.
   */
  async computeDiffuseFromSpecular() {
    if (this.specularTexture.options.viewDimension !== "cube") {
      throwWarning(
        "Could not compute the diffuse texture because the specular texture is not a cube map:" + this.specularTexture.options.viewDimension
      );
      return;
    }
    let diffuseStorageTexture = new Texture(this.renderer, {
      label: "Diffuse storage cubemap",
      name: "diffuseEnvMap",
      format: this.diffuseTexture.options.format,
      visibility: ["compute"],
      usage: ["copySrc", "storageBinding"],
      type: "storage",
      fixedSize: {
        width: this.diffuseTexture.size.width,
        height: this.diffuseTexture.size.height,
        depth: 6
      },
      viewDimension: "2d-array"
    });
    let computeDiffusePass = new ComputePass(this.renderer, {
      label: "Compute diffuse map from specular map",
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [Math.ceil(this.diffuseTexture.size.width / 8), Math.ceil(this.diffuseTexture.size.height / 8), 6],
      shaders: {
        compute: {
          code: computeDiffuseFromSpecularCubemap(this.specularTexture)
        }
      },
      uniforms: {
        params: {
          struct: {
            faceSize: {
              type: "u32",
              value: this.diffuseTexture.size.width
            },
            maxMipLevel: {
              type: "u32",
              value: this.specularTexture.texture.mipLevelCount
            },
            sampleCount: {
              type: "u32",
              value: this.options.diffuseTextureParams.computeSampleCount
            }
          }
        }
      },
      samplers: [this.sampler],
      textures: [this.specularTexture, diffuseStorageTexture]
    });
    await computeDiffusePass.material.compileMaterial();
    __privateMethod(this, _EnvironmentMap_instances, runComputePass_fn).call(this, {
      computePass: computeDiffusePass,
      label: "Compute diffuse cube map from specular cube map command encoder",
      onAfterCompute: (commandEncoder) => {
        this.renderer.copyGPUTextureToTexture(diffuseStorageTexture.texture, this.diffuseTexture, commandEncoder);
        this.diffuseTexture.textureBinding.resource = this.diffuseTexture.texture;
      }
    });
    computeDiffusePass.remove();
    diffuseStorageTexture.destroy();
    diffuseStorageTexture = null;
    computeDiffusePass = null;
  }
  /**
   * Load an HDR environment map and then generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
   * @param url - The url of the .hdr file to load.
   */
  async loadAndComputeFromHDR(url) {
    __privateSet(this, _hdrData, await this.hdrLoader.loadFromUrl(url));
    const { width, height } = __privateGet(this, _hdrData) ? __privateGet(this, _hdrData) : { width: 1024, height: 512 };
    const faceSize = Math.max(width / 4, height / 2);
    if (this.specularTexture.size.width !== faceSize || this.specularTexture.size.height !== faceSize) {
      this.specularTexture.options.fixedSize.width = faceSize;
      this.specularTexture.options.fixedSize.height = faceSize;
      this.specularTexture.size.width = faceSize;
      this.specularTexture.size.height = faceSize;
      this.specularTexture.createTexture();
    }
    const { size } = this.options.diffuseTextureParams;
    const diffuseSize = Math.min(size, faceSize);
    if (this.diffuseTexture.size.width !== diffuseSize || this.diffuseTexture.size.height !== diffuseSize) {
      this.diffuseTexture.options.fixedSize.width = diffuseSize;
      this.diffuseTexture.options.fixedSize.height = diffuseSize;
      this.diffuseTexture.size.width = diffuseSize;
      this.diffuseTexture.size.height = diffuseSize;
      this.diffuseTexture.createTexture();
    }
    this.computeFromHDR();
  }
  /**
   * Generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
   */
  computeFromHDR() {
    if (__privateGet(this, _hdrData)) {
      this.computeSpecularCubemapFromHDRData(__privateGet(this, _hdrData)).then(() => {
        this.computeDiffuseFromSpecular();
      });
    }
  }
  /**
   * Destroy the {@link EnvironmentMap} and its associated textures.
   */
  destroy() {
    this.diffuseTexture?.destroy();
    this.specularTexture?.destroy();
    this.lutTexture?.destroy();
    __privateGet(this, _lutStorageTexture).destroy();
  }
}
_hdrData = new WeakMap();
_lutStorageTexture = new WeakMap();
_EnvironmentMap_instances = new WeakSet();
/**
 * Run a {@link ComputePass} once by creating a {@link GPUCommandEncoder} and execute the pass.
 * @param parameters - Parameters used to run the compute pass.
 * @param parameters.computePass - {@link ComputePass} to run.
 * @param parameters.label - Optional label for the {@link GPUCommandEncoder}.
 * @param parameters.onAfterCompute - Optional callback to run just after the pass has been executed. Useful for eventual texture copies.
 * @private
 */
runComputePass_fn = function({
  computePass,
  label = "",
  onAfterCompute = (commandEncoder) => {
  }
}) {
  const commandEncoder = this.renderer.device?.createCommandEncoder({
    label
  });
  !this.renderer.production && commandEncoder.pushDebugGroup(label);
  this.renderer.renderSingleComputePass(commandEncoder, computePass, false);
  onAfterCompute(commandEncoder);
  !this.renderer.production && commandEncoder.popDebugGroup();
  const commandBuffer = commandEncoder.finish();
  this.renderer.device?.queue.submit([commandBuffer]);
  this.renderer.pipelineManager.resetCurrentPipeline();
};

export { EnvironmentMap };
