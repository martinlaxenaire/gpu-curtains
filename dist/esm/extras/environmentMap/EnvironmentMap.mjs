import { isRenderer } from '../../core/renderers/utils.mjs';
import { HDRLoader } from '../loaders/HDRLoader.mjs';
import { Texture } from '../../core/textures/Texture.mjs';
import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { generateUUID, throwWarning } from '../../utils/utils.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { Mat3 } from '../../math/Mat3.mjs';
import { computeBRDFLUT } from '../../core/shaders/full/compute/compute-BRDF-LUT.mjs';
import { computeCubemapFromHDR } from '../../core/shaders/full/compute/compute-cubemap-from-HDR.mjs';
import { computeDiffuseFromCubemap } from '../../core/shaders/full/compute/compute-diffuse-from-cubemap.mjs';
import { PMREMGeneration } from '../../core/shaders/chunks/utils/PMREM-generation.mjs';

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
    const lutTextureDefaultParams = {
      size: 256,
      computeSampleCount: 512,
      label: "Environment LUT texture",
      name: "lutTexture",
      format: "rgba16float"
    };
    const diffuseTextureDefaultParams = {
      size: 128,
      computeSampleCount: 2048,
      label: "Environment diffuse texture",
      name: "envDiffuseTexture",
      format: "rgba16float"
    };
    const specularTextureDefaultParams = {
      label: "Environment specular texture",
      name: "envSpecularTexture",
      format: "rgba16float",
      numSamples: 512
    };
    params = {
      ...{
        useLutTexture: true,
        diffuseIntensity: 1,
        specularIntensity: 1,
        rotation: Math.PI / 2
      },
      ...params
    };
    if (params.lutTextureParams) {
      params.lutTextureParams = { ...lutTextureDefaultParams, ...params.lutTextureParams };
    } else {
      params.lutTextureParams = lutTextureDefaultParams;
    }
    if (params.diffuseTextureParams) {
      params.diffuseTextureParams = { ...diffuseTextureDefaultParams, ...params.diffuseTextureParams };
    } else {
      params.diffuseTextureParams = diffuseTextureDefaultParams;
    }
    if (params.specularTextureParams) {
      params.specularTextureParams = { ...specularTextureDefaultParams, ...params.specularTextureParams };
    } else {
      params.specularTextureParams = specularTextureDefaultParams;
    }
    this.options = params;
    this.sampler = new Sampler(this.renderer, {
      label: "Clamp sampler",
      name: "clampSampler",
      magFilter: "linear",
      minFilter: "linear",
      mipmapFilter: "linear",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      addressModeW: "clamp-to-edge"
    });
    this.rotationMatrix = new Mat3().rotateByAngleY(-Math.PI / 2);
    this.hdrLoader = new HDRLoader();
    if (this.options.useLutTexture) {
      this.createLUTTextures();
      this.computeBRDFLUTTexture();
    }
    this.createSpecularDiffuseTextures();
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
    this.cubemapTexture = new Texture(this.renderer, {
      label: "Environment cube map texture",
      name: "cubemapTexture",
      format: this.options.specularTextureParams.format,
      generateMips: true,
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
    this.specularTexture = new Texture(this.renderer, {
      ...this.options.specularTextureParams,
      generateMips: false,
      // do not automatically generate mips
      useMips: true,
      // we'll generate them ourselves for PMREM
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
   * Create the {@link lutTexture | BRDF GGX and sheen LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
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
        Math.ceil(__privateGet(this, _lutStorageTexture).size.width / 8),
        Math.ceil(__privateGet(this, _lutStorageTexture).size.height / 8),
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
   * Create the {@link cubemapTexture | cube map texture} from a loaded {@link HDRImageData} using a {@link ComputePass} that runs once.
   * @param parsedHdr - parsed {@link HDRImageData} loaded by the {@link hdrLoader}.
   */
  async computeSpecularCubemapFromHDRData(parsedHdr) {
    let cubeStorageTexture = new Texture(this.renderer, {
      label: "Cubemap storage",
      name: "storageCubemap",
      format: this.cubemapTexture.options.format,
      visibility: ["compute"],
      usage: ["copySrc", "storageBinding", "textureBinding"],
      type: "storage",
      fixedSize: {
        width: this.cubemapTexture.size.width,
        height: this.cubemapTexture.size.height,
        depth: 6
      },
      viewDimension: "2d-array"
    });
    let computeCubeMapPass = new ComputePass(this.renderer, {
      label: "Compute cubemap from equirectangular",
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [Math.ceil(this.cubemapTexture.size.width / 8), Math.ceil(this.cubemapTexture.size.height / 8), 6],
      shaders: {
        compute: {
          code: computeCubemapFromHDR
        }
      },
      storages: {
        params: {
          visibility: ["compute"],
          // important for compatibility mode
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
              value: this.cubemapTexture.size.width
            }
          }
        }
      },
      textures: [cubeStorageTexture]
    });
    await computeCubeMapPass.material.compileMaterial();
    let mipBuffers = [];
    __privateMethod(this, _EnvironmentMap_instances, runComputePass_fn).call(this, {
      computePass: computeCubeMapPass,
      label: "Compute specular cube map command encoder",
      onAfterCompute: (commandEncoder) => {
        this.renderer.copyGPUTextureToTexture(cubeStorageTexture.texture, this.cubemapTexture, commandEncoder);
        this.generateSpecularPMREMTexture(commandEncoder, mipBuffers);
      }
    });
    computeCubeMapPass.remove();
    cubeStorageTexture.destroy();
    mipBuffers.forEach((buffer) => buffer.destroy());
    cubeStorageTexture = null;
    computeCubeMapPass = null;
    mipBuffers = [];
  }
  /**
   * Generates the {@link specularTexture} Prefiltered, Mipmapped Radiance Environment Map (PMREM).
   * We manually generate the {@link specularTexture} prefiltered mips from our original {@link cubemapTexture}.
   *
   * @param commandEncoder - {@link GPUCommandEncoder} to use for mips generation.
   * @param mipBuffers - Array of {@link GPUBuffer} that will be created for each mips. Will be destroyed later.
   */
  generateSpecularPMREMTexture(commandEncoder, mipBuffers) {
    if (!this.cubemapTexture.texture) {
      if (!this.renderer.production) {
        throwWarning(
          "EnvironmentMap: Could not generate the PMREM mips because the cubemap texture is not set:" + this.cubemapTexture
        );
      }
      return;
    }
    const shaderModule = this.renderer.device.createShaderModule({
      label: "PMREM generation",
      code: PMREMGeneration
    });
    const pipeline = this.renderer.device.createRenderPipeline({
      label: "Mip level generator pipeline",
      layout: "auto",
      vertex: {
        module: shaderModule
      },
      fragment: {
        module: shaderModule,
        targets: [{ format: this.specularTexture.texture.format }]
      }
    });
    let width = this.specularTexture.texture.width;
    let height = this.specularTexture.texture.height;
    const mipCount = this.specularTexture.texture.mipLevelCount;
    const nbFaces = this.specularTexture.texture.depthOrArrayLayers;
    let baseMipLevel = 0;
    const generateMips = (baseMipLevel2 = 0) => {
      for (let layer = 0; layer < nbFaces; layer++) {
        const faceMipArray = new Uint32Array([
          layer,
          baseMipLevel2 + 1,
          mipCount,
          this.options.specularTextureParams.numSamples,
          this.specularTexture.texture.width,
          0,
          // pad
          0,
          0
        ]);
        const paramsBuffer = this.renderer.device.createBuffer({
          size: faceMipArray.byteLength,
          usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
          mappedAtCreation: true
        });
        new Uint32Array(paramsBuffer.getMappedRange()).set(faceMipArray);
        paramsBuffer.unmap();
        mipBuffers.push(paramsBuffer);
        const bindGroup = this.renderer.device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: this.sampler.sampler },
            {
              binding: 1,
              resource: this.cubemapTexture.texture.createView({
                dimension: "cube",
                arrayLayerCount: 6
              })
            },
            {
              binding: 2,
              resource: {
                buffer: paramsBuffer
              }
            }
          ]
        });
        const renderPassDescriptor = {
          label: "PMREM generation render pass",
          colorAttachments: [
            {
              view: this.specularTexture.texture.createView({
                dimension: "2d",
                baseMipLevel: baseMipLevel2 + 1,
                mipLevelCount: 1,
                baseArrayLayer: layer,
                arrayLayerCount: 1
              }),
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        };
        const pass = commandEncoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();
      }
    };
    generateMips(-1);
    while (width > 1 || height > 1) {
      width = Math.max(1, width / 2 | 0);
      height = Math.max(1, height / 2 | 0);
      generateMips(baseMipLevel);
      baseMipLevel++;
    }
    this.specularTexture.textureBinding.resource = this.specularTexture.texture;
  }
  /**
   * Compute the {@link diffuseTexture | diffuse cube map texture} from the {@link cubemapTexture | cube map texture } using the provided {@link DiffuseTextureParams | diffuse texture options} and a {@link ComputePass} that runs once.
   */
  async computeDiffuseFromCubemap() {
    if (!this.cubemapTexture.texture) {
      if (!this.renderer.production) {
        throwWarning(
          "EnvironmentMap: Could not generate the diffuse texture because the cube map texture is not set:" + this.cubemapTexture
        );
      }
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
          code: computeDiffuseFromCubemap(this.cubemapTexture)
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
              value: this.cubemapTexture.texture.mipLevelCount
            },
            sampleCount: {
              type: "u32",
              value: this.options.diffuseTextureParams.computeSampleCount
            }
          }
        }
      },
      samplers: [this.sampler],
      textures: [this.cubemapTexture, diffuseStorageTexture]
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
    if (this.cubemapTexture.size.width !== faceSize || this.cubemapTexture.size.height !== faceSize) {
      this.cubemapTexture.options.fixedSize.width = faceSize;
      this.cubemapTexture.options.fixedSize.height = faceSize;
      this.cubemapTexture.size.width = faceSize;
      this.cubemapTexture.size.height = faceSize;
      this.cubemapTexture.createTexture();
    }
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
        this.computeDiffuseFromCubemap();
      });
    }
  }
  /**
   * Destroy the {@link EnvironmentMap} and its associated textures.
   */
  destroy() {
    this.cubemapTexture?.destroy();
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
