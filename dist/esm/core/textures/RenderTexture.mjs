import { isRenderer } from '../renderers/utils.mjs';
import { TextureBinding } from '../bindings/TextureBinding.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { getRenderTextureUsage } from './utils.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _autoResize;
const defaultRenderTextureParams = {
  label: "RenderTexture",
  name: "renderTexture",
  type: "texture",
  access: "write",
  fromTexture: null,
  viewDimension: "2d",
  sampleCount: 1,
  qualityRatio: 1
};
class RenderTexture {
  /**
   * RenderTexture constructor
   * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTexture}
   * @param parameters - {@link RenderTextureParams | parameters} used to create this {@link RenderTexture}
   */
  constructor(renderer, parameters = defaultRenderTextureParams) {
    /** Whether this texture should be automatically resized when the {@link Renderer renderer} size changes. Default to true. */
    __privateAdd(this, _autoResize, true);
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, parameters.label ? parameters.label + " RenderTexture" : "RenderTexture");
    this.type = "RenderTexture";
    this.renderer = renderer;
    this.uuid = generateUUID();
    this.options = { ...defaultRenderTextureParams, ...parameters };
    if (parameters.fromTexture) {
      this.options.format = parameters.fromTexture.texture.format;
      this.options.sampleCount = parameters.fromTexture.texture.sampleCount;
      this.options.viewDimension = parameters.fromTexture.options.viewDimension;
    }
    if (!this.options.format) {
      this.options.format = this.renderer.options.preferredFormat;
    }
    this.size = this.options.fixedSize ? {
      width: this.options.fixedSize.width * this.options.qualityRatio,
      height: this.options.fixedSize.height * this.options.qualityRatio,
      depth: this.options.fixedSize.depth ?? this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
    } : {
      width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
      height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
      depth: this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
    };
    if (this.options.fixedSize) {
      __privateSet(this, _autoResize, false);
    }
    this.setBindings();
    this.renderer.addRenderTexture(this);
    this.createTexture();
  }
  /**
   * Copy another {@link RenderTexture} into this {@link RenderTexture}
   * @param texture - {@link RenderTexture} to copy
   */
  copy(texture) {
    this.options.fromTexture = texture;
    this.createTexture();
  }
  /**
   * Copy a {@link GPUTexture} directly into this {@link RenderTexture}. Mainly used for depth textures.
   * @param texture - {@link GPUTexture} to copy
   */
  copyGPUTexture(texture) {
    this.size = {
      width: texture.width,
      height: texture.height,
      depth: texture.depthOrArrayLayers
    };
    this.options.format = texture.format;
    this.options.sampleCount = texture.sampleCount;
    this.texture = texture;
    this.textureBinding.setFormat(this.options.format);
    this.textureBinding.setMultisampled(this.options.sampleCount > 1);
    this.textureBinding.resource = this.texture;
  }
  /**
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
   */
  createTexture() {
    if (!this.size.width || !this.size.height)
      return;
    if (this.options.fromTexture) {
      this.copyGPUTexture(this.options.fromTexture.texture);
      return;
    }
    this.texture?.destroy();
    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth ?? 1],
      dimensions: this.options.viewDimension,
      sampleCount: this.options.sampleCount,
      usage: getRenderTextureUsage(this.options.usage, this.options.type)
    });
    this.textureBinding.resource = this.texture;
  }
  /**
   * Set our {@link RenderTexture#bindings | bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ": " + this.options.name + " render texture",
        name: this.options.name,
        bindingType: this.options.type,
        visibility: this.options.visibility,
        texture: this.texture,
        format: this.options.format,
        viewDimension: this.options.viewDimension,
        multisampled: this.options.sampleCount > 1
      })
    ];
  }
  /**
   * Get our {@link TextureBinding | texture binding}
   * @readonly
   */
  get textureBinding() {
    return this.bindings[0];
  }
  /**
   * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update
   * @param size - the optional new {@link TextureSize | size} to set
   */
  resize(size = null) {
    if (!__privateGet(this, _autoResize))
      return;
    if (!size) {
      size = {
        width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
        height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
        depth: 1
      };
    }
    if (size.width === this.size.width && size.height === this.size.height && size.depth === this.size.depth) {
      return;
    }
    this.size = size;
    this.createTexture();
  }
  /**
   * Destroy our {@link RenderTexture}
   */
  destroy() {
    this.renderer.removeRenderTexture(this);
    if (!this.options.fromTexture) {
      this.texture?.destroy();
    }
    this.texture = null;
  }
}
_autoResize = new WeakMap();

export { RenderTexture };
