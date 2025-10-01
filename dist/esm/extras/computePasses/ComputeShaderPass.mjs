import { ComputePass } from '../../core/computePasses/ComputePass.mjs';
import { ShaderPass } from '../../core/renderPasses/ShaderPass.mjs';
import { Texture } from '../../core/textures/Texture.mjs';

class ComputeShaderPass extends ComputePass {
  /**
   * ComputeShaderPass constructor
   * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeShaderPass}.
   * @param parameters - {@link ComputeShaderPassParams | parameters} used to create our {@link ComputeShaderPass}.
   */
  constructor(renderer, parameters = {}) {
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
    } = parameters;
    const { targets, renderOrder, autoRender, inputTarget, outputTarget, isPrePass, ...otherParams } = shaderPassParams;
    let { textures, textureDispatchSize, visible, storageRenderTextureName } = otherParams;
    visible = visible === void 0 ? true : visible;
    storageRenderTextureName = storageRenderTextureName ?? "storageRenderTexture";
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
      name: storageRenderTextureName,
      type: "storage",
      visibility: ["compute"],
      usage: ["copySrc", "copyDst", "textureBinding", "storageBinding"],
      format: texturesOptions && texturesOptions.format ? texturesOptions.format : "rgba8unorm"
    });
    const renderTexture = new Texture(renderer, {
      name: storageRenderTextureName,
      visibility: ["fragment"],
      fromTexture: storageTexture
    });
    const { shaderPassSampler } = otherParams;
    const shaderPass = new ShaderPass(renderer, {
      label: label ? `${label} ShaderPass` : "Compute ShaderPass",
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
                return textureSample(${storageRenderTextureName ?? "storageRenderTexture"}, ${shaderPassSampler ? shaderPassSampler.name : "defaultSampler"}, fsInput.uv);
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
      autoRender: false,
      // will be dispatched before rendering the shader pass
      active: visible,
      dispatchSize: [
        Math.ceil(storageTexture.size.width / textureDispatchSize[0]),
        Math.ceil(storageTexture.size.height / textureDispatchSize[1])
      ]
    };
    super(renderer, params);
    this.options = {
      ...this.options,
      storageRenderTextureName,
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
