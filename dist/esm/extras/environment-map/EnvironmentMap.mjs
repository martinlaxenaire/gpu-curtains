import { isRenderer } from '../../core/renderers/utils.mjs';
import { HDRLoader } from '../loaders/HDRLoader.mjs';
import { Texture } from '../../core/textures/Texture.mjs';
import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { throwWarning } from '../../utils/utils.mjs';
import { Sampler } from '../../core/samplers/Sampler.mjs';
import { Mat3 } from '../../math/Mat3.mjs';
import computeBrdfLutWgsl from '../../core/shaders/compute/compute-brdf-lut.wgsl.mjs';
import computeSpecularCubemapFromHdr from '../../core/shaders/compute/compute-specular-cubemap-from-hdr.wgsl.mjs';
import { computeDiffuseFromSpecularCubemap } from '../../core/shaders/compute/compute-diffuse-from-specular-cubemap.wgsl.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _copyComputeStorageTextureToTexture, copyComputeStorageTextureToTexture_fn;
class EnvironmentMap {
  /**
   * {@link EnvironmentMap} constructor.
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link EnvironmentMap}.
   * @param params - {@link EnvironmentMapParams | parameters} use to create this {@link EnvironmentMap}. Defines the various textures options.
   */
  constructor(renderer, params = {
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
    }
  }) {
    /**
     * Once the given {@link ComputePass} has written to a temporary storage {@link Texture}, copy it into our permanent {@link Texture}.
     * @param commandEncoder - The GPU command encoder to use.
     * @param storageTexture - Temporary storage {@link Texture} used in the {@link ComputePass}.
     * @param texture - Permanent {@link Texture} (either the {@link lutTexture}, {@link specularTexture} or {@link diffuseTexture}) to copy onto.
     * @private
     */
    __privateAdd(this, _copyComputeStorageTextureToTexture);
    renderer = isRenderer(renderer, "EnvironmentMap");
    this.renderer = renderer;
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
    this.rotation = new Mat3(new Float32Array([0, 0, 1, 0, 1, 0, -1, 0, 0]));
    this.hdrLoader = new HDRLoader();
    this.computeBRDFLUTTexture();
  }
  /**
   * Create the {@link lutTexture | BRDF GGX LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
   */
  async computeBRDFLUTTexture() {
    const { size, computeSampleCount, ...lutTextureParams } = this.options.lutTextureParams;
    this.lutTexture = new Texture(this.renderer, {
      ...lutTextureParams,
      visibility: ["fragment"],
      fixedSize: {
        width: size,
        height: size
      },
      autoDestroy: false
    });
    let lutStorageTexture = new Texture(this.renderer, {
      label: "LUT storage texture",
      name: "lutStorageTexture",
      format: this.lutTexture.options.format,
      visibility: ["compute"],
      usage: ["copySrc", "storageBinding"],
      type: "storage",
      fixedSize: {
        width: this.lutTexture.size.width,
        height: this.lutTexture.size.height
      }
    });
    let computeLUTPass = new ComputePass(this.renderer, {
      label: "Compute LUT texture",
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [Math.ceil(lutStorageTexture.size.width / 16), Math.ceil(lutStorageTexture.size.height / 16), 1],
      shaders: {
        compute: {
          code: computeBrdfLutWgsl
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
      textures: [lutStorageTexture]
    });
    await computeLUTPass.material.compileMaterial();
    this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        this.renderer.renderSingleComputePass(commandEncoder, computeLUTPass);
        __privateMethod(this, _copyComputeStorageTextureToTexture, copyComputeStorageTextureToTexture_fn).call(this, commandEncoder, lutStorageTexture, this.lutTexture);
      },
      { once: true }
    );
    this.renderer.onAfterCommandEncoderSubmission.add(
      () => {
        computeLUTPass.destroy();
        lutStorageTexture.destroy();
        lutStorageTexture = null;
        computeLUTPass = null;
      },
      { once: true }
    );
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
          code: computeSpecularCubemapFromHdr
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
    const commandEncoder = this.renderer.device?.createCommandEncoder({
      label: "Render once command encoder"
    });
    if (!this.renderer.production)
      commandEncoder.pushDebugGroup("Render once command encoder");
    this.renderer.renderSingleComputePass(commandEncoder, computeCubeMapPass);
    __privateMethod(this, _copyComputeStorageTextureToTexture, copyComputeStorageTextureToTexture_fn).call(this, commandEncoder, cubeStorageTexture, this.specularTexture);
    if (this.specularTexture.texture.mipLevelCount > 1) {
      this.renderer.generateMips(this.specularTexture, commandEncoder);
    }
    if (!this.renderer.production)
      commandEncoder.popDebugGroup();
    const commandBuffer = commandEncoder.finish();
    this.renderer.device?.queue.submit([commandBuffer]);
    computeCubeMapPass.destroy();
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
    this.renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        this.renderer.renderSingleComputePass(commandEncoder, computeDiffusePass);
        __privateMethod(this, _copyComputeStorageTextureToTexture, copyComputeStorageTextureToTexture_fn).call(this, commandEncoder, diffuseStorageTexture, this.diffuseTexture);
      },
      { once: true }
    );
    this.renderer.onAfterCommandEncoderSubmission.add(
      () => {
        computeDiffusePass.destroy();
        diffuseStorageTexture.destroy();
        diffuseStorageTexture = null;
        computeDiffusePass = null;
      },
      { once: true }
    );
  }
  /**
   * Load an HDR environment map and then generates the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
   * @param url - The url of the .hdr file to load.
   */
  async loadAndComputeFromHDR(url) {
    const parsedHdr = await this.hdrLoader.loadFromUrl(url);
    const { width, height } = parsedHdr ? parsedHdr : { width: 1024, height: 512 };
    const faceSize = Math.max(width / 4, height / 2);
    const textureDefaultOptions = {
      viewDimension: "cube",
      autoDestroy: false
      // keep alive when changing glTF
    };
    if (!this.specularTexture) {
      this.specularTexture = new Texture(this.renderer, {
        ...this.options.specularTextureParams,
        ...{
          visibility: ["fragment", "compute"],
          fixedSize: {
            width: faceSize,
            height: faceSize
          }
        },
        ...textureDefaultOptions
      });
    } else if (this.specularTexture.size.width !== faceSize || this.specularTexture.size.height !== faceSize) {
      this.specularTexture.options.fixedSize.width = faceSize;
      this.specularTexture.options.fixedSize.height = faceSize;
      this.specularTexture.size.width = faceSize;
      this.specularTexture.size.height = faceSize;
      this.specularTexture.createTexture();
    }
    const { size, computeSampleCount, ...diffuseTextureParams } = this.options.diffuseTextureParams;
    const diffuseSize = Math.min(size, faceSize);
    if (!this.diffuseTexture) {
      this.diffuseTexture = new Texture(this.renderer, {
        ...diffuseTextureParams,
        ...{
          visibility: ["fragment"],
          fixedSize: {
            width: diffuseSize,
            height: diffuseSize
          }
        },
        ...textureDefaultOptions
      });
    } else if (this.diffuseTexture.size.width !== diffuseSize || this.diffuseTexture.size.height !== diffuseSize) {
      this.diffuseTexture.options.fixedSize.width = diffuseSize;
      this.diffuseTexture.options.fixedSize.height = diffuseSize;
      this.diffuseTexture.size.width = diffuseSize;
      this.diffuseTexture.size.height = diffuseSize;
      this.diffuseTexture.createTexture();
    }
    if (parsedHdr) {
      this.computeSpecularCubemapFromHDRData(parsedHdr).then(() => {
        this.computeDiffuseFromSpecular();
      });
    }
  }
  /**
   * Destroy the {@link EnvironmentMap} and its associated textures.
   */
  destroy() {
    this.lutTexture?.destroy();
    this.diffuseTexture?.destroy();
    this.specularTexture?.destroy();
  }
}
_copyComputeStorageTextureToTexture = new WeakSet();
copyComputeStorageTextureToTexture_fn = function(commandEncoder, storageTexture, texture) {
  commandEncoder.copyTextureToTexture(
    {
      texture: storageTexture.texture
    },
    {
      texture: texture.texture
    },
    [texture.texture.width, texture.texture.height, texture.texture.depthOrArrayLayers]
  );
};

export { EnvironmentMap };
