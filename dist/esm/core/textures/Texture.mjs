import { isRenderer } from '../renderers/utils.mjs';
import { TextureBinding } from '../bindings/TextureBinding.mjs';
import { generateUUID } from '../../utils/utils.mjs';
import { getNumMipLevels, getDefaultTextureUsage } from './utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _autoResize;
const defaultTextureParams = {
  label: "Texture",
  name: "renderTexture",
  // default to 'renderTexture' for render target usage
  type: "texture",
  access: "write",
  fromTexture: null,
  viewDimension: "2d",
  sampleCount: 1,
  qualityRatio: 1,
  // copy external texture options
  generateMips: false,
  flipY: false,
  premultipliedAlpha: false,
  aspect: "all",
  colorSpace: "srgb",
  autoDestroy: true
};
class Texture {
  /**
   * Texture constructor
   * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
   * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
   */
  constructor(renderer, parameters = defaultTextureParams) {
    /** Whether this texture should be automatically resized when the {@link Renderer renderer} size changes. Default to true. */
    __privateAdd(this, _autoResize, true);
    renderer = isRenderer(renderer, parameters.label ? parameters.label + " Texture" : "Texture");
    this.type = "Texture";
    this.renderer = renderer;
    this.uuid = generateUUID();
    this.options = { ...defaultTextureParams, ...parameters };
    if (this.options.format === "rgba32float" && this.renderer.device && !this.renderer.device.features.has("float32-filterable")) {
      this.options.format = "rgba16float";
    }
    if (parameters.fromTexture) {
      this.options.format = parameters.fromTexture.texture.format;
      this.options.sampleCount = parameters.fromTexture.texture.sampleCount;
      this.options.viewDimension = parameters.fromTexture.options.viewDimension;
    }
    if (!this.options.format) {
      this.options.format = this.renderer.options.context.format;
    }
    const { width, height } = this.renderer.canvas;
    this.size = this.options.fixedSize ? {
      width: this.options.fixedSize.width * this.options.qualityRatio,
      height: this.options.fixedSize.height * this.options.qualityRatio,
      depth: this.options.fixedSize.depth ?? this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
    } : {
      width: Math.floor(width * this.options.qualityRatio),
      height: Math.floor(height * this.options.qualityRatio),
      depth: this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
    };
    if (this.options.fixedSize) {
      __privateSet(this, _autoResize, false);
    }
    this.setBindings();
    this.renderer.addTexture(this);
    this.createTexture();
  }
  /**
   * Reset this {@link Texture} {@link Texture.renderer | renderer}, and resize it if needed.
   * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
   */
  setRenderer(renderer) {
    if (this.renderer) {
      this.renderer.removeTexture(this);
    }
    renderer = isRenderer(renderer, this.options.label + " Texture");
    this.renderer = renderer;
    this.renderer.addTexture(this);
    const { width, height } = this.renderer.canvas;
    if (__privateGet(this, _autoResize) && (this.size.width !== width * this.options.qualityRatio || this.size.height !== height * this.options.qualityRatio)) {
      this.resize();
    }
  }
  /**
   * Set our {@link Texture#bindings | bindings}.
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ": " + this.options.name + " texture",
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
   * Get our {@link TextureBinding | texture binding}.
   * @readonly
   */
  get textureBinding() {
    return this.bindings[0];
  }
  /**
   * Copy another {@link Texture} into this {@link Texture}.
   * @param texture - {@link Texture} to copy.
   */
  copy(texture) {
    this.options.fromTexture = texture;
    this.createTexture();
  }
  /**
   * Copy a {@link GPUTexture} directly into this {@link Texture}. Mainly used for depth textures.
   * @param texture - {@link GPUTexture} to copy.
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
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
   */
  createTexture() {
    if (!this.size.width || !this.size.height) return;
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
      mipLevelCount: this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1) : 1,
      usage: getDefaultTextureUsage(this.options.usage, this.options.type)
    });
    this.textureBinding.resource = this.texture;
  }
  /**
   * Upload a source to the GPU and use it for our {@link texture}.
   * @param parameters - parameters used to upload the source.
   * @param parameters.source - source to use for our {@link texture}.
   * @param parameters.width - source width.
   * @param parameters.height - source height.
   * @param parameters.depth - source depth.
   * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the source copy.
   */
  uploadSource({
    source,
    width = this.size.width,
    height = this.size.height,
    depth = this.size.depth,
    origin = [0, 0, 0],
    colorSpace = "srgb"
  }) {
    this.renderer.deviceManager.copyExternalImageToTexture(
      { source, flipY: this.options.flipY },
      { texture: this.texture, premultipliedAlpha: this.options.premultipliedAlpha, origin, colorSpace },
      [width, height, depth]
    );
    if (this.texture.mipLevelCount > 1) {
      this.renderer.generateMips(this);
    }
  }
  /**
   * Use data as the {@link texture} source and upload it to the GPU.
   * @param parameters - parameters used to upload the source.
   * @param parameters.width - data source width.
   * @param parameters.height - data source height.
   * @param parameters.depth - data source depth.
   * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the data source copy.
   * @param parameters.data - {@link Float32Array} data to use as source.
   */
  uploadData({
    width = this.size.width,
    height = this.size.height,
    depth = this.size.depth,
    origin = [0, 0, 0],
    data = new Float32Array(width * height * 4)
  }) {
    this.renderer.device.queue.writeTexture(
      { texture: this.texture, origin },
      data,
      { bytesPerRow: width * data.BYTES_PER_ELEMENT * 4, rowsPerImage: height },
      [width, height, depth]
    );
    if (this.texture.mipLevelCount > 1) {
      this.renderer.generateMips(this);
    }
  }
  /**
   * Resize our {@link Texture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update.
   * @param size - the optional new {@link TextureSize | size} to set.
   */
  resize(size = null) {
    if (!__privateGet(this, _autoResize)) return;
    if (!size) {
      const { width, height } = this.renderer.canvas;
      size = {
        width: Math.floor(width * this.options.qualityRatio),
        height: Math.floor(height * this.options.qualityRatio),
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
   * Destroy our {@link Texture}.
   */
  destroy() {
    this.renderer.removeTexture(this);
    if (!this.options.fromTexture) {
      this.texture?.destroy();
    }
    this.texture = null;
  }
}
_autoResize = new WeakMap();

export { Texture };
