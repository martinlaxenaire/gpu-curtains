import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { isRenderer } from '../../core/renderers/utils.mjs';
import { ShaderPass } from '../../core/renderPasses/ShaderPass.mjs';
import { Texture } from '../../core/textures/Texture.mjs';

class ComputeShaderPass extends ComputePass {
  /**
   * ComputeShaderPass constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeShaderPass}.
   * @param parameters - {@link ComputeShaderPassParams | parameters} used to create our {@link ComputeShaderPass}.
   */
  constructor(renderer, parameters = {}) {
    renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ComputeShaderPass` : "ComputeShaderPass");
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
    } = parameters;
    const { targets, renderOrder, autoRender, inputTarget, outputTarget, isPrePass, ...otherParams } = shaderPassParams;
    let { label, textures, textureDispatchSize, visible, storageTextureParams } = otherParams;
    label = label ?? "ComputeShaderPass " + renderer.computePasses?.length;
    visible = visible === void 0 ? true : visible;
    const defaultStorageTextureParams = {
      name: "storageRenderTexture",
      format: "rgba8unorm"
    };
    if (storageTextureParams) {
      storageTextureParams = { ...defaultStorageTextureParams, ...storageTextureParams };
    } else {
      storageTextureParams = defaultStorageTextureParams;
    }
    if (!textureDispatchSize) {
      textureDispatchSize = [16, 16];
    }
    if (Array.isArray(textureDispatchSize)) {
      textureDispatchSize[0] = Math.ceil(textureDispatchSize[0] ?? 16);
      textureDispatchSize[1] = Math.ceil(textureDispatchSize[1] ?? 16);
    } else if (!isNaN(textureDispatchSize)) {
      textureDispatchSize = [Math.ceil(textureDispatchSize), Math.ceil(textureDispatchSize)];
    } else {
      textureDispatchSize = [16, 16];
    }
    const storageTexture = new Texture(renderer, {
      label: `${label} storage render texture`,
      ...storageTextureParams,
      type: "storage",
      visibility: ["compute"],
      usage: ["copySrc", "copyDst", "textureBinding", "storageBinding"]
    });
    const renderTexture = new Texture(renderer, {
      label: `${label} render texture`,
      name: storageTextureParams.name,
      visibility: ["fragment"],
      fromTexture: storageTexture
    });
    const { shaderPassSampler } = otherParams;
    const shaderPass = new ShaderPass(renderer, {
      label: `${label} ShaderPass`,
      autoRender,
      shaders: {
        fragment: {
          code: (
            /* wgsl */
            `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) uv: vec2f,
            };

            @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
                return textureSample(${storageTextureParams.name}, ${shaderPassSampler ? shaderPassSampler.name : "defaultSampler"}, fsInput.uv);
            }`
          )
        }
      },
      renderOrder,
      textures: [renderTexture],
      ...shaderPassSampler && { samplers: [shaderPassSampler] },
      visible,
      targets,
      inputTarget,
      outputTarget,
      isPrePass
    });
    if (textures && textures.length) {
      textures = [storageTexture, shaderPass.renderTexture, ...textures];
    } else {
      textures = [storageTexture, shaderPass.renderTexture];
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
      autoRender: false,
      // will be dispatched before rendering the shader pass
      active: visible,
      dispatchSize: [
        Math.ceil(storageTexture.size.width / textureDispatchSize[0]),
        Math.ceil(storageTexture.size.height / textureDispatchSize[1])
      ]
    };
    super(renderer, computeParams);
    this.options = {
      ...this.options,
      storageTextureParams,
      textureDispatchSize,
      ...shaderPassSampler && { shaderPassSampler }
    };
    this.textureDispatchSize = textureDispatchSize;
    this.shaderPass = shaderPass;
    this.storageTexture = storageTexture;
    this.renderTexture = renderTexture;
    const scenePassEntry = this.renderer.scene.getObjectRenderPassEntry(this.shaderPass);
    if (scenePassEntry) {
      const _onBeforeRenderPass = scenePassEntry.onBeforeRenderPass;
      scenePassEntry.onBeforeRenderPass = (commandEncoder, swapChainTexture) => {
        _onBeforeRenderPass && _onBeforeRenderPass(commandEncoder, swapChainTexture);
        this.renderer.renderSingleComputePass(commandEncoder, this, false);
      };
    }
  }
  /**
   * Get whether the {@link ComputePass} and {@link ShaderPass} should run.
   */
  get visible() {
    return this.active;
  }
  /**
   * Set whether the {@link ComputePass} and {@link ShaderPass} should run.
   */
  set visible(value) {
    this.active = value;
    this.shaderPass.visible = value;
  }
  /**
   * Update the dispatch size and resize.
   */
  resize() {
    this.material.dispatchSize = [
      Math.ceil(this.storageTexture.size.width / this.textureDispatchSize[0]),
      Math.ceil(this.storageTexture.size.height / this.textureDispatchSize[1])
    ];
    super.resize();
  }
  /**
   * Destroy the {@link ComputeShaderPass}.
   */
  destroy() {
    this.shaderPass.remove();
    this.storageTexture.destroy();
    this.renderTexture.destroy();
    super.destroy();
  }
}

export { ComputeShaderPass };
