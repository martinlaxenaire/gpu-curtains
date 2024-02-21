import { isRenderer } from '../renderers/utils.mjs';
import { TextureBinding } from '../bindings/TextureBinding.mjs';
import { generateUUID } from '../../utils/utils.mjs';

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
  usage: "texture",
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
    if (!this.options.format) {
      this.options.format = this.renderer.options.preferredFormat;
    }
    this.size = this.options.fixedSize ? {
      width: this.options.fixedSize.width * this.options.qualityRatio,
      height: this.options.fixedSize.height * this.options.qualityRatio,
      depth: this.options.fixedSize.depth
    } : {
      width: Math.floor(this.renderer.displayBoundingRect.width * this.options.qualityRatio),
      height: Math.floor(this.renderer.displayBoundingRect.height * this.options.qualityRatio),
      depth: 1
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
    this.texture = texture;
    this.textureBinding.resource = this.texture;
  }
  /**
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
   */
  createTexture() {
    if (this.options.fromTexture) {
      this.options.format = this.options.fromTexture.options.format;
      this.copyGPUTexture(this.options.fromTexture.texture);
      return;
    }
    this.texture?.destroy();
    this.texture = this.renderer.createTexture({
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth ?? 1],
      dimensions: this.options.viewDimension === "1d" ? "1d" : this.options.viewDimension === "3d" ? "3d" : "2d",
      sampleCount: this.options.sampleCount,
      usage: (
        // TODO let user chose?
        // see https://matrix.to/#/!MFogdGJfnZLrDmgkBN:matrix.org/$vESU70SeCkcsrJQdyQGMWBtCgVd3XqnHcBxFDKTKKSQ?via=matrix.org&via=mozilla.org&via=hej.im
        this.options.usage !== "storage" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      )
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
        texture: this.texture,
        bindingType: this.options.usage,
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
        width: Math.floor(this.renderer.displayBoundingRect.width * this.options.qualityRatio),
        height: Math.floor(this.renderer.displayBoundingRect.height * this.options.qualityRatio),
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
//# sourceMappingURL=RenderTexture.mjs.map
