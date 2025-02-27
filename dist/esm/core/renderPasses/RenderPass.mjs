import { isRenderer } from '../renderers/utils.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { Texture } from '../textures/Texture.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _useStencil, _RenderPass_instances, updateDepthAttachmentSettings_fn;
class RenderPass {
  /**
   * RenderPass constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
   * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}.
   */
  constructor(renderer, {
    label = "Render Pass",
    sampleCount = 4,
    qualityRatio = 1,
    fixedSize = null,
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
    depthFormat = "depth24plus",
    depthReadOnly = false,
    stencilClearValue = 0,
    stencilLoadOp = "clear",
    stencilStoreOp = "store",
    stencilReadOnly = false
  } = {}) {
    __privateAdd(this, _RenderPass_instances);
    /** Whether the {@link RenderPass} should handle stencil. Default to `false`, eventually set to `true` based on the {@link depthTexture} format. */
    __privateAdd(this, _useStencil);
    this.type = "RenderPass";
    renderer = isRenderer(renderer, label + " " + this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    this.viewport = null;
    this.scissorRect = null;
    __privateSet(this, _useStencil, false);
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
      fixedSize,
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
      depthFormat,
      depthReadOnly,
      stencilClearValue,
      stencilLoadOp,
      stencilStoreOp,
      stencilReadOnly
    };
    this.renderer.renderPasses.set(this.uuid, this);
    if (this.renderer.device) {
      this.init();
    }
  }
  /**
   * Initialize the {@link RenderPass} textures and descriptor.
   */
  init() {
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
   * Reset this {@link RenderPass} {@link RenderPass.renderer | renderer}.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.renderer) {
      this.renderer.renderPasses.delete(this.uuid);
    }
    renderer = isRenderer(renderer, this.options.label + " " + this.type);
    this.renderer = renderer;
    if (this.options.useDepth && !this.options.depthTexture) {
      this.depthTexture.setRenderer(this.renderer);
    }
    this.viewTextures.forEach((texture) => {
      texture.setRenderer(this.renderer);
    });
    this.resolveTargets.forEach((texture) => {
      if (texture) {
        texture.setRenderer(this.renderer);
      }
    });
    this.renderer.renderPasses.set(this.uuid, this);
  }
  /**
   * Create and set our {@link depthTexture | depth texture}.
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
        ...this.options.fixedSize && { fixedSize: this.options.fixedSize },
        type: "depth",
        usage: ["renderAttachment", "textureBinding"]
      });
    }
    if (this.depthTexture.options.format.includes("stencil")) {
      __privateSet(this, _useStencil, true);
    }
  }
  /**
   * Create and set our {@link viewTextures | view textures}.
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
          ...this.options.fixedSize && { fixedSize: this.options.fixedSize },
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
   * @readonly
   */
  get outputTextures() {
    return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures;
  }
  /**
   * Set our render pass {@link descriptor}.
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
          storeOp: colorAttachment.storeOp,
          // eventual depth slice
          ...colorAttachment.depthSlice !== void 0 && {
            depthSlice: colorAttachment.depthSlice
          }
        };
      }),
      ...this.options.useDepth && {
        depthStencilAttachment: {
          view: depthTextureView || this.depthTexture.texture.createView({
            label: this.depthTexture.texture.label + " view"
          }),
          ...this.depthStencilAttachmentSettings
        }
      }
    };
  }
  /**
   * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
   * @readonly
   */
  get depthStencilAttachmentSettings() {
    const depthReadOnly = !!this.options.depthReadOnly;
    const stencilReadOnly = !!this.options.stencilReadOnly;
    return {
      depthClearValue: this.options.depthClearValue,
      // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
      ...!depthReadOnly && { depthLoadOp: this.options.depthLoadOp, depthStoreOp: this.options.depthStoreOp },
      depthReadOnly,
      ...__privateGet(this, _useStencil) && {
        ...!stencilReadOnly && {
          stencilLoadOp: this.options.stencilLoadOp,
          stencilStoreOp: this.options.stencilStoreOp
        },
        stencilReadOnly
      }
    };
  }
  /**
   * Set the {@link viewport} to use if any.
   * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
   */
  setViewport(viewport = null) {
    this.viewport = viewport;
  }
  /**
   * Set the {@link scissorRect} to use if any.
   * @param scissorRect - {@link RectBBox} size to use for scissors. Can be set to `null` to cancel the {@link scissorRect}.
   */
  setScissorRect(scissorRect = null) {
    this.scissorRect = scissorRect;
  }
  /**
   * Begin the {@link GPURenderPassEncoder} and eventually set the {@link viewport} and {@link scissorRect}.
   * @param commandEncoder - {@link GPUCommandEncoder} to use.
   * @param descriptor - Custom {@link https://gpuweb.github.io/types/interfaces/GPURenderPassDescriptor.html | GPURenderPassDescriptor} to use if any. Default to {@link RenderPass#descriptor | descriptor}.
   * @returns - The created {@link GPURenderPassEncoder}.
   */
  beginRenderPass(commandEncoder, descriptor = this.descriptor) {
    const pass = commandEncoder.beginRenderPass(descriptor);
    if (this.viewport) {
      pass.setViewport(
        this.viewport.left,
        this.viewport.top,
        this.viewport.width,
        this.viewport.height,
        this.viewport.minDepth,
        this.viewport.maxDepth
      );
    }
    if (this.scissorRect) {
      pass.setScissorRect(this.scissorRect.left, this.scissorRect.top, this.scissorRect.width, this.scissorRect.height);
    }
    return pass;
  }
  /**
   * Resize our {@link RenderPass}: reset its {@link Texture}.
   */
  resize() {
    if (!this.renderer.device) return;
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
   * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation}.
   * @param loadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to use.
   * @param colorAttachmentIndex - index of the color attachment for which to use this load operation.
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
   * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation}.
   * @param depthLoadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to use.
   */
  setDepthLoadOp(depthLoadOp = "clear") {
    this.options.depthLoadOp = depthLoadOp;
    __privateMethod(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
  }
  /**
   * Set the new {@link RenderPassParams.depthReadOnly | depthReadOnly} setting.
   * @param value - Whether the depth buffer should be read-only or not.
   */
  setDepthReadOnly(value) {
    this.options.depthReadOnly = value;
    __privateMethod(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
  }
  /**
   * Set the new {@link RenderPassParams.stencilReadOnly | stencilReadOnly} setting.
   * @param value - Whether the stencil buffer should be read-only or not.
   */
  setStencilReadOnly(value) {
    this.options.stencilReadOnly = value;
    __privateMethod(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
  }
  /**
   * Set our {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value}.<br>
   * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURendererContextOptions#alphaMode | premultiplied alpha mode}, your `R`, `G` and `B` channels should be premultiplied by your alpha channel.
   * @param clearValue - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value} to use.
   * @param colorAttachmentIndex - index of the color attachment for which to use this clear value.
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
   * Set the current {@link descriptor} texture {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#view | view} and {@link GPUCommandEncoder.beginRenderPass().resolveTarget | resolveTarget} (depending on whether we're using multisampling).
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
   * Destroy our {@link RenderPass}.
   */
  destroy() {
    this.viewTextures.forEach((viewTexture) => viewTexture.destroy());
    this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy());
    if (!this.options.depthTexture && this.depthTexture) {
      this.depthTexture.destroy();
    }
    this.renderer.renderPasses.delete(this.uuid);
  }
}
_useStencil = new WeakMap();
_RenderPass_instances = new WeakSet();
/**
 * Update the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
 * @private
 */
updateDepthAttachmentSettings_fn = function() {
  if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
    this.descriptor.depthStencilAttachment = {
      view: this.descriptor.depthStencilAttachment.view,
      ...this.depthStencilAttachmentSettings
    };
  }
};

export { RenderPass };
