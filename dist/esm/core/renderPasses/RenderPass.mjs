import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { Texture } from '../textures/Texture.mjs';

class RenderPass {
  /**
   * RenderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
   * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
   */
  constructor(renderer, {
    label = "Render Pass",
    sampleCount = 4,
    qualityRatio = 1,
    // color
    useColorAttachments = true,
    renderToSwapChain = true,
    colorAttachments = [],
    // depth
    useDepth = true,
    depthTexture = null,
    depthLoadOp = "clear",
    depthStoreOp = "store",
    depthClearValue = 1,
    depthFormat = "depth24plus"
  } = {}) {
    renderer = isRenderer(renderer, "RenderPass");
    this.type = "RenderPass";
    this.uuid = generateUUID();
    this.renderer = renderer;
    if (useColorAttachments) {
      const defaultColorAttachment = {
        loadOp: "clear",
        storeOp: "store",
        clearValue: [0, 0, 0, 0],
        targetFormat: this.renderer.options.context.format
      };
      if (!colorAttachments.length) {
        colorAttachments = [defaultColorAttachment];
      } else {
        colorAttachments = colorAttachments.map((colorAttachment) => {
          return { ...defaultColorAttachment, ...colorAttachment };
        });
      }
    }
    this.options = {
      label,
      sampleCount,
      qualityRatio,
      // color
      useColorAttachments,
      renderToSwapChain,
      colorAttachments,
      // depth
      useDepth,
      ...depthTexture !== void 0 && { depthTexture },
      depthLoadOp,
      depthStoreOp,
      depthClearValue,
      depthFormat
    };
    if (this.options.useDepth) {
      this.createDepthTexture();
    }
    this.viewTextures = [];
    this.resolveTargets = [];
    if (this.options.useColorAttachments && (!this.options.renderToSwapChain || this.options.sampleCount > 1)) {
      this.createViewTextures();
      this.createResolveTargets();
    }
    this.setRenderPassDescriptor();
  }
  /**
   * Create and set our {@link depthTexture | depth texture}
   */
  createDepthTexture() {
    if (this.options.depthTexture) {
      this.depthTexture = this.options.depthTexture;
      this.options.depthFormat = this.options.depthTexture.options.format;
    } else {
      this.depthTexture = new Texture(this.renderer, {
        label: this.options.label + " depth texture",
        name: "depthTexture",
        format: this.options.depthFormat,
        sampleCount: this.options.sampleCount,
        qualityRatio: this.options.qualityRatio,
        type: "depth",
        usage: ["renderAttachment", "textureBinding"]
      });
    }
  }
  /**
   * Create and set our {@link viewTextures | view textures}
   */
  createViewTextures() {
    this.options.colorAttachments.forEach((colorAttachment, index) => {
      this.viewTextures.push(
        new Texture(this.renderer, {
          label: `${this.options.label} colorAttachment[${index}] view texture`,
          name: `colorAttachment${index}ViewTexture`,
          format: colorAttachment.targetFormat,
          sampleCount: this.options.sampleCount,
          qualityRatio: this.options.qualityRatio,
          type: "texture",
          usage: ["copySrc", "copyDst", "renderAttachment", "textureBinding"]
        })
      );
    });
  }
  /**
   * Create and set our {@link resolveTargets | resolve targets} in case the {@link viewTextures} are multisampled.
   *
   * Note that if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}, the first resolve target will be set to `null` as the current swap chain texture will be used anyway in the render loop (see {@link updateView}).
   */
  createResolveTargets() {
    if (this.options.sampleCount > 1) {
      this.options.colorAttachments.forEach((colorAttachment, index) => {
        this.resolveTargets.push(
          this.options.renderToSwapChain && index === 0 ? null : new Texture(this.renderer, {
            label: `${this.options.label} resolve target[${index}] texture`,
            name: `resolveTarget${index}Texture`,
            format: colorAttachment.targetFormat,
            sampleCount: 1,
            qualityRatio: this.options.qualityRatio,
            type: "texture"
          })
        );
      });
    }
  }
  /**
   * Get the textures outputted by this {@link RenderPass}, which means the {@link viewTextures} if not multisampled, or their {@link resolveTargets} else (beware that the first resolve target might be `null` if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}).
   *
   * @readonly
   */
  get outputTextures() {
    return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures;
  }
  /**
   * Set our render pass {@link descriptor}
   */
  setRenderPassDescriptor(depthTextureView = null) {
    this.descriptor = {
      label: this.options.label + " descriptor",
      colorAttachments: this.options.colorAttachments.map((colorAttachment, index) => {
        return {
          // view
          view: this.viewTextures[index]?.texture.createView({
            label: this.viewTextures[index]?.texture.label + " view"
          }),
          ...this.resolveTargets.length && {
            resolveTarget: this.resolveTargets[index]?.texture.createView({
              label: this.resolveTargets[index]?.texture.label + " view"
            })
          },
          // clear values
          clearValue: colorAttachment.clearValue,
          // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
          // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
          loadOp: colorAttachment.loadOp,
          // storeOp: 'store' means store the result of what we draw.
          // We could also pass 'discard' which would throw away what we draw.
          // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
          storeOp: colorAttachment.storeOp
        };
      }),
      ...this.options.useDepth && {
        depthStencilAttachment: {
          view: depthTextureView || this.depthTexture.texture.createView({
            label: this.depthTexture.texture.label + " view"
          }),
          depthClearValue: this.options.depthClearValue,
          // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
          depthLoadOp: this.options.depthLoadOp,
          depthStoreOp: this.options.depthStoreOp
        }
      }
    };
  }
  /**
   * Resize our {@link RenderPass}: reset its {@link Texture}
   */
  resize() {
    if (this.options.useDepth) {
      this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
        label: this.depthTexture.options.label + " view"
      });
    }
    this.viewTextures.forEach((viewTexture, index) => {
      this.descriptor.colorAttachments[index].view = viewTexture.texture.createView({
        label: viewTexture.options.label + " view"
      });
    });
    this.resolveTargets.forEach((resolveTarget, index) => {
      if (resolveTarget) {
        this.descriptor.colorAttachments[index].resolveTarget = resolveTarget.texture.createView({
          label: resolveTarget.options.label + " view"
        });
      }
    });
  }
  /**
   * Set the {@link descriptor} {@link GPULoadOp | load operation}
   * @param loadOp - new {@link GPULoadOp | load operation} to use
   * @param colorAttachmentIndex - index of the color attachment for which to use this load operation
   */
  setLoadOp(loadOp = "clear", colorAttachmentIndex = 0) {
    if (this.options.useColorAttachments) {
      if (this.options.colorAttachments[colorAttachmentIndex]) {
        this.options.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
      }
      if (this.descriptor) {
        if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
          this.descriptor.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
        }
      }
    }
  }
  /**
   * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
   * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
   */
  setDepthLoadOp(depthLoadOp = "clear") {
    this.options.depthLoadOp = depthLoadOp;
    if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
      this.descriptor.depthStencilAttachment.depthLoadOp = depthLoadOp;
    }
  }
  /**
   * Set our {@link GPUColor | clear colors value}.<br>
   * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURendererContextOptions#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
   * @param clearValue - new {@link GPUColor | clear colors value} to use
   * @param colorAttachmentIndex - index of the color attachment for which to use this clear value
   */
  setClearValue(clearValue = [0, 0, 0, 0], colorAttachmentIndex = 0) {
    if (this.options.useColorAttachments) {
      if (this.renderer.options.context.alphaMode === "premultiplied") {
        const alpha = clearValue[3];
        clearValue[0] = Math.min(clearValue[0], alpha);
        clearValue[1] = Math.min(clearValue[1], alpha);
        clearValue[2] = Math.min(clearValue[2], alpha);
      }
      if (this.options.colorAttachments[colorAttachmentIndex]) {
        this.options.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
      }
      if (this.descriptor) {
        if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
          this.descriptor.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
        }
      }
    }
  }
  /**
   * Set the current {@link descriptor} texture {@link GPURenderPassColorAttachment#view | view} and {@link GPURenderPassColorAttachment#resolveTarget | resolveTarget} (depending on whether we're using multisampling)
   * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
   * @returns - the {@link GPUTexture | texture} to render to.
   */
  updateView(renderTexture = null) {
    if (!this.options.colorAttachments.length || !this.options.renderToSwapChain) {
      return renderTexture;
    }
    if (!renderTexture) {
      renderTexture = this.renderer.context.getCurrentTexture();
      renderTexture.label = `${this.renderer.type} context current texture`;
    }
    if (this.options.sampleCount > 1) {
      this.descriptor.colorAttachments[0].view = this.viewTextures[0].texture.createView({
        label: this.viewTextures[0].options.label + " view"
      });
      this.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView({
        label: renderTexture.label + " resolve target view"
      });
    } else {
      this.descriptor.colorAttachments[0].view = renderTexture.createView({
        label: renderTexture.label + " view"
      });
    }
    return renderTexture;
  }
  /**
   * Destroy our {@link RenderPass}
   */
  destroy() {
    this.viewTextures.forEach((viewTexture) => viewTexture.destroy());
    this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy());
    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy();
    }
  }
}

export { RenderPass };
