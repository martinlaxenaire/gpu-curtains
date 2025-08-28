import { Texture } from './Texture.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Mat3 } from '../../math/Mat3.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { toKebabCase, throwWarning } from '../../utils/utils.mjs';
import { TextureBinding } from '../bindings/TextureBinding.mjs';
import { getDefaultMediaTextureUsage, getNumMipLevels } from './utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
var _sourcesLoaded, _sourcesUploaded, _rotation, _MediaTexture_instances, setSourceLoaded_fn;
const defaultMediaTextureParams = {
  label: "Texture",
  name: "texture",
  useExternalTextures: true,
  fromTexture: null,
  viewDimension: "2d",
  format: "rgba8unorm",
  // copy external texture options
  generateMips: false,
  flipY: false,
  premultipliedAlpha: false,
  colorSpace: "srgb",
  autoDestroy: true,
  // texture transform
  useTransform: false,
  placeholderColor: [0, 0, 0, 255],
  // default to solid black
  cache: true
};
const _MediaTexture = class _MediaTexture extends Texture {
  /**
   * Texture constructor
   * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
   * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
   */
  constructor(renderer, parameters = defaultMediaTextureParams) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + " MediaTexture" : "MediaTexture");
    const params = { ...defaultMediaTextureParams, ...parameters };
    const { useTransform, placeholderColor, useExternalTextures, cache, ...baseTextureParams } = params;
    super(renderer, {
      ...baseTextureParams,
      ...{
        sampleCount: 1,
        type: "texture",
        access: "write",
        qualityRatio: 1,
        aspect: "all",
        // force fixed size to disable texture destroy on resize
        fixedSize: { width: parameters.fixedSize?.width ?? 1, height: parameters.fixedSize?.height ?? 1 }
      }
    });
    __privateAdd(this, _MediaTexture_instances);
    /** Whether the sources have been loaded. */
    __privateAdd(this, _sourcesLoaded);
    /** Whether the sources have been uploaded to the GPU, handled by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#texturesQueue | GPUDeviceManager texturesQueue array}. */
    __privateAdd(this, _sourcesUploaded);
    /** Rotation to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
    __privateAdd(this, _rotation);
    // callbacks / events
    /** function assigned to the {@link onSourceLoaded} callback */
    this._onSourceLoadedCallback = (source) => {
    };
    /** function assigned to the {@link onAllSourcesLoaded} callback */
    this._onAllSourcesLoadedCallback = () => {
    };
    /** function assigned to the {@link onSourceUploaded} callback */
    this._onSourceUploadedCallback = (source) => {
    };
    /** function assigned to the {@link onAllSourcesUploaded} callback */
    this._onAllSourcesUploadedCallback = () => {
    };
    this.type = "MediaTexture";
    const supportExternalTexture = this.renderer.device ? typeof this.renderer.device.importExternalTexture !== "undefined" : true;
    this.options = {
      ...this.options,
      useTransform,
      placeholderColor,
      cache,
      useExternalTextures: supportExternalTexture && !!useExternalTextures,
      ...{
        sources: [],
        sourcesTypes: []
      }
    };
    if (parameters.fromTexture && parameters.fromTexture instanceof _MediaTexture) {
      this.options.sources = parameters.fromTexture.options.sources;
      this.options.sourcesTypes = parameters.fromTexture.options.sourcesTypes;
      this.sources = parameters.fromTexture.sources;
    }
    __privateSet(this, _rotation, 0);
    this.offset = new Vec2().onChange(() => this.updateModelMatrix());
    this.scale = new Vec2(1).onChange(() => this.updateModelMatrix());
    this.transformOrigin = new Vec2().onChange(() => this.updateModelMatrix());
    this.modelMatrix = new Mat3();
    this.transformBinding = null;
    if (this.options.useTransform) {
      this.transformBinding = new BufferBinding({
        label: toKebabCase(this.options.name),
        name: this.options.name,
        struct: {
          matrix: {
            type: "mat3x3f",
            value: this.modelMatrix
          }
        }
      });
      this.updateModelMatrix();
    }
    this.externalTexture = null;
    this.sources = [];
    this.videoFrameCallbackIds = /* @__PURE__ */ new Map();
    this.sourcesLoaded = false;
    this.sourcesUploaded = false;
    this.renderer.uploadTexture(this);
  }
  /**
   * Get whether all our {@link sources} have been loaded.
   */
  get sourcesLoaded() {
    return __privateGet(this, _sourcesLoaded);
  }
  /**
   * Set whether all our {@link sources} have been loaded.
   * @param value - boolean flag indicating if all the {@link sources} have been loaded.
   */
  set sourcesLoaded(value) {
    if (value && !this.sourcesLoaded) {
      this._onAllSourcesLoadedCallback && this._onAllSourcesLoadedCallback();
    }
    __privateSet(this, _sourcesLoaded, value);
  }
  /**
   * Get whether all our {@link sources} have been uploaded.
   */
  get sourcesUploaded() {
    return __privateGet(this, _sourcesUploaded);
  }
  /**
   * Set whether all our {@link sources} have been uploaded.
   * @param value - boolean flag indicating if all the {@link sources} have been uploaded
   */
  set sourcesUploaded(value) {
    if (value && !this.sourcesUploaded) {
      this._onAllSourcesUploadedCallback && this._onAllSourcesUploadedCallback();
    }
    __privateSet(this, _sourcesUploaded, value);
  }
  /* TRANSFORM */
  /**
   * Get the actual {@link rotation} value.
   * @returns - the actual {@link rotation} value.
   */
  get rotation() {
    return __privateGet(this, _rotation);
  }
  /**
   * Set the actual {@link rotation} value and update the {@link modelMatrix}.
   * @param value - new {@link rotation} value to use.
   */
  set rotation(value) {
    __privateSet(this, _rotation, value);
    this.updateModelMatrix();
  }
  /**
   * Update the {@link modelMatrix} using the {@link offset}, {@link rotation}, {@link scale} and {@link transformOrigin} and tell the {@link transformBinding} to update, only if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`.
   */
  updateModelMatrix() {
    if (this.options.useTransform) {
      this.modelMatrix.setUVTransform(
        this.offset.x,
        this.offset.y,
        this.scale.x,
        this.scale.y,
        this.rotation,
        this.transformOrigin.x,
        this.transformOrigin.y
      );
      this.transformBinding.inputs.matrix.shouldUpdate = true;
    } else {
      throwWarning(
        `Texture: Cannot update ${this.options.name} transformation since its useTransform property has been set to false. You should set it to true when creating the Texture.`
      );
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
        multisampled: false
      })
    ];
  }
  /**
   * Copy another {@link Texture} into this {@link Texture}.
   * @param texture - {@link Texture} to copy.
   */
  copy(texture) {
    if (this.size.depth !== texture.size.depth) {
      throwWarning(
        `${this.options.label}: cannot copy a ${texture.options.label} because the depth sizes differ: ${this.size.depth} vs ${texture.size.depth}.`
      );
      return;
    }
    if (texture instanceof _MediaTexture) {
      if (this.options.sourcesTypes[0] === "externalVideo" && texture.options.sourcesTypes[0] !== "externalVideo") {
        throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`);
        return;
      } else if (this.options.sourcesTypes[0] !== "externalVideo" && texture.options.sourcesTypes[0] === "externalVideo") {
        throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`);
        return;
      }
      this.options.fixedSize = texture.options.fixedSize;
      this.sources = texture.sources;
      this.options.sources = texture.options.sources;
      this.options.sourcesTypes = texture.options.sourcesTypes;
      this.sourcesLoaded = texture.sourcesLoaded;
      this.sourcesUploaded = texture.sourcesUploaded;
    }
    super.copy(texture);
  }
  /**
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
   */
  createTexture() {
    if (!this.renderer.device || !this.size.width || !this.size.height) return;
    if (this.options.fromTexture && (!(this.options.fromTexture instanceof _MediaTexture) || this.options.fromTexture.sourcesUploaded)) {
      this.copyGPUTexture(this.options.fromTexture.texture);
      return;
    }
    const options = {
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth ?? 1],
      dimensions: this.options.viewDimension,
      sampleCount: this.options.sampleCount,
      usage: getDefaultMediaTextureUsage(this.options.usage)
    };
    if (!this.sources?.length) {
      options.mipLevelCount = 1;
      this.texture?.destroy();
      this.texture = this.renderer.createTexture(options);
      this.textureBinding.resource = this.texture;
    } else if (!this.options.sourcesTypes.includes("externalVideo")) {
      options.mipLevelCount = this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1) : 1;
      this.texture?.destroy();
      this.texture = this.renderer.createTexture(options);
      this.textureBinding.resource = this.texture;
    }
  }
  /**
   * Resize our {@link MediaTexture}.
   */
  resize() {
    if (this.sources.length === 1 && this.sources[0] && this.sources[0].source instanceof HTMLCanvasElement && (this.sources[0].source.width !== this.size.width || this.sources[0].source.height !== this.size.height)) {
      this.setSourceSize();
      this.sources[0].shouldUpdate = true;
    } else {
      super.resize();
    }
  }
  /* SOURCES */
  /**
   * Set the {@link size} based on the first available loaded {@link sources}.
   */
  setSourceSize() {
    const source = this.sources.filter(Boolean).find((source2) => !!source2.sourceLoaded);
    this.options.fixedSize.width = Math.max(
      1,
      source.source.naturalWidth || source.source.width || source.source.videoWidth
    );
    this.options.fixedSize.height = Math.max(
      1,
      source.source.naturalHeight || source.source.height || source.source.videoHeight
    );
    this.size.width = this.options.fixedSize.width;
    this.size.height = this.options.fixedSize.height;
  }
  /**
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link MediaTextureSource.source | source}.
   * @param url - URL of the image to load.
   * @returns - the newly created {@link ImageBitmap}.
   */
  async loadImageBitmap(url) {
    if (url.includes(".webp")) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
          createImageBitmap(img, { colorSpaceConversion: "none" }).then(resolve).catch(reject);
        };
        img.onerror = reject;
        img.src = url;
      });
    } else {
      const res = await fetch(url);
      const blob = await res.blob();
      return await createImageBitmap(blob, { colorSpaceConversion: "none" });
    }
  }
  /**
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link MediaTextureSource.source | source} and create the {@link GPUTexture}.
   * @param source - the image URL or {@link HTMLImageElement} to load.
   */
  async loadImage(source) {
    const url = typeof source === "string" ? source : source.getAttribute("src");
    const sourceIndex = this.options.sources.length;
    if (this.size.depth > 1) {
      this.options.sources.push(url);
      this.options.sourcesTypes.push("image");
    } else {
      this.options.sources = [url];
      this.options.sourcesTypes = ["image"];
    }
    if (this.options.cache) {
      const cachedTexture = this.renderer.textures.filter((t) => t instanceof _MediaTexture && t.uuid !== this.uuid).find((t) => {
        const sourceIndex2 = t.options.sources.findIndex((source2) => source2 === url);
        if (sourceIndex2 === -1) return null;
        return t.sources[sourceIndex2]?.sourceLoaded && t.texture && t.size.depth === this.size.depth;
      });
      if (cachedTexture) {
        this.copy(cachedTexture);
        return;
      }
    }
    const loadedSource = await this.loadImageBitmap(url);
    this.useImageBitmap(loadedSource, sourceIndex);
  }
  /**
   * Use an already loaded {@link ImageBitmap} as a {@link sources}.
   * @param imageBitmap - {@link ImageBitmap} to use.
   * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
   */
  useImageBitmap(imageBitmap, sourceIndex = 0) {
    if (this.size.depth > 1) {
      this.sources[sourceIndex] = {
        source: imageBitmap,
        externalSource: null,
        sourceLoaded: true,
        sourceUploaded: false,
        shouldUpdate: true
      };
    } else {
      this.sources = [
        {
          source: imageBitmap,
          externalSource: null,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true
        }
      ];
    }
    this.setSourceSize();
    __privateMethod(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, imageBitmap);
  }
  /**
   * Load and create images using {@link loadImage} from an array of images sources as strings or {@link HTMLImageElement}. Useful for cube maps.
   * @param sources - Array of images sources as strings or {@link HTMLImageElement} to load.
   */
  async loadImages(sources) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadImage(sources[i]);
    }
  }
  /**
   * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
   */
  uploadVideoTexture() {
    const source = this.sources[0];
    const video = source.source;
    if (source && video) {
      this.texture?.destroy();
      this.texture = null;
      try {
        source.externalSource = new VideoFrame(video);
      } catch (e) {
        const offscreen = new OffscreenCanvas(this.size.width, this.size.height);
        offscreen.getContext("2d");
        source.externalSource = new VideoFrame(offscreen, { timestamp: 0 });
      }
      this.externalTexture = this.renderer.importExternalTexture(source.externalSource, this.options.label);
      this.textureBinding.resource = this.externalTexture;
      this.textureBinding.setBindingType("externalTexture");
      source.shouldUpdate = false;
      this.setSourceUploaded(0);
    }
  }
  /**
   * Close an external source {@link VideoFrame} if any.
   */
  closeVideoFrame() {
    const source = this.sources[0];
    if (source && source.externalSource) {
      source.externalSource.close();
    }
  }
  // weirldy enough, we don't have to do anything in that callback
  // because the <video> is not visible in the viewport, the video playback is throttled
  // and the rendering is janky
  // using requestVideoFrameCallback helps preventing this but is unsupported in Firefox at the moment
  // WebCodecs may be the way to go when time comes!
  // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
  /**
   * Set our {@link MediaTextureSource.shouldUpdate | source shouldUpdate} flag to true at each new video frame.
   */
  onVideoFrameCallback(sourceIndex = 0) {
    if (this.videoFrameCallbackIds.get(sourceIndex)) {
      this.sources[sourceIndex].shouldUpdate = true;
      this.sources[sourceIndex].source.requestVideoFrameCallback(
        this.onVideoFrameCallback.bind(this, sourceIndex)
      );
    }
  }
  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link MediaTextureSource.source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
   * @param video - the newly loaded {@link HTMLVideoElement}.
   * @param sourceIndex - Index of the {@link HTMLVideoElement} in the {@link sources} array.
   */
  onVideoLoaded(video, sourceIndex = 0) {
    if (!this.sources[sourceIndex].sourceLoaded) {
      if (this.options.sources[sourceIndex] instanceof MediaStream && video.paused) {
        video.addEventListener(
          "play",
          () => {
            this.sources[sourceIndex].sourceLoaded = true;
            this.sources[sourceIndex].shouldUpdate = true;
            this.setSourceSize();
          },
          { once: true }
        );
      } else {
        this.sources[sourceIndex].sourceLoaded = true;
        this.sources[sourceIndex].shouldUpdate = true;
        this.setSourceSize();
      }
      const videoFrameCallbackId = video.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this, sourceIndex));
      this.videoFrameCallbackIds.set(sourceIndex, videoFrameCallbackId);
      __privateMethod(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, video);
    }
  }
  /**
   * Get whether the provided source is a video.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the source is a video or not.
   */
  isVideoSource(source) {
    return source instanceof HTMLVideoElement;
  }
  /**
   * Get whether the provided video source is ready to be played.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the video source is ready to be played.
   */
  isVideoSourceReady(source) {
    if (!this.isVideoSource(source)) return false;
    return source.readyState >= source.HAVE_CURRENT_DATA;
  }
  /**
   * Get whether the provided video source is ready to be uploaded.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the video source is ready to be uploaded.
   */
  shouldUpdateVideoSource(source) {
    if (!this.isVideoSource(source)) return false;
    return this.isVideoSourceReady(source) && !source.paused;
  }
  /**
   * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback.
   * @param source - the video URL or {@link HTMLVideoElement} to load.
   */
  loadVideo(source) {
    let video;
    const sourceIndex = this.options.sources.length;
    if (typeof source === "string") {
      video = document.createElement("video");
      video.src = source;
    } else {
      video = source;
    }
    video.preload = "auto";
    video.muted = true;
    video.loop = true;
    video.crossOrigin = "anonymous";
    video.setAttribute("playsinline", "");
    this.useVideo(video, sourceIndex);
    if (isNaN(video.duration)) {
      video.load();
    }
  }
  /**
   * Use a {@link HTMLVideoElement} as a {@link sources}.
   * @param video - {@link HTMLVideoElement} to use.
   * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
   */
  useVideo(video, sourceIndex = 0) {
    const source = video.src ? video.src : video.srcObject ?? null;
    if (!source) {
      throwWarning(`MediaTexture (${this.options.label}): Can not use this video as it as no source.`);
      return;
    }
    if (this.size.depth > 1) {
      this.options.sources.push(source);
      this.options.sourcesTypes.push("video");
      this.sources[sourceIndex] = {
        source: video,
        externalSource: null,
        sourceLoaded: false,
        sourceUploaded: false,
        shouldUpdate: false
      };
    } else {
      this.options.sources = [source];
      this.options.sourcesTypes = [this.options.useExternalTextures ? "externalVideo" : "video"];
      this.sources = [
        {
          source: video,
          externalSource: null,
          sourceLoaded: false,
          sourceUploaded: false,
          shouldUpdate: false
        }
      ];
    }
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      this.onVideoLoaded(video, sourceIndex);
    } else {
      video.addEventListener("canplaythrough", this.onVideoLoaded.bind(this, video, sourceIndex), {
        once: true
      });
    }
  }
  /**
   * Load and create videos using {@link loadVideo} from an array of videos sources as strings or {@link HTMLVideoElement}. Useful for cube maps.
   * @param sources - Array of images sources as strings or {@link HTMLVideoElement} to load.
   */
  loadVideos(sources) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadVideo(sources[i]);
    }
  }
  /**
   * Load a {@link HTMLCanvasElement} and use it as one of our {@link sources}.
   * @param source - the {@link HTMLCanvasElement} to use.
   */
  loadCanvas(source) {
    if (this.size.depth > 1) {
      const sourceIndex = this.options.sources.length;
      this.options.sources.push(source);
      this.options.sourcesTypes.push("canvas");
      this.sources[sourceIndex] = {
        source,
        externalSource: null,
        sourceLoaded: true,
        sourceUploaded: false,
        shouldUpdate: true
      };
    } else {
      this.options.sources = [source];
      this.options.sourcesTypes = ["canvas"];
      this.sources = [
        {
          source,
          externalSource: null,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true
        }
      ];
    }
    this.setSourceSize();
    __privateMethod(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, source);
  }
  /**
   * Load an array of {@link HTMLCanvasElement} using {@link loadCanvas} . Useful for cube maps.
   * @param sources - Array of {@link HTMLCanvasElement} to load.
   */
  loadCanvases(sources) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadCanvas(sources[i]);
    }
  }
  /**
   * Set the {@link MediaTextureSource.sourceUploaded | sourceUploaded} flag to true for the {@link MediaTextureSource.source | source} at a given index in our {@link sources} array. If all {@link sources} have been uploaded, set our {@link sourcesUploaded} flag to true.
   * @param sourceIndex - Index of the {@link MediaTextureSource.source | source} in the {@link sources} array.
   */
  setSourceUploaded(sourceIndex = 0) {
    this.sources[sourceIndex].sourceUploaded = true;
    this._onSourceUploadedCallback && this._onSourceUploadedCallback(this.sources[sourceIndex].source);
    const nbSourcesUploaded = this.sources.filter((source) => source.sourceUploaded)?.length || 0;
    if (nbSourcesUploaded === this.size.depth) {
      this.sourcesUploaded = true;
    }
  }
  /**
   * Callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
   * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
   * @returns - our {@link MediaTexture}
   */
  onSourceLoaded(callback) {
    if (callback) {
      this._onSourceLoadedCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run when all of the {@link MediaTextureSource.source | source} have been loaded.
   * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} have been loaded.
   * @returns - our {@link MediaTexture}
   */
  onAllSourcesLoaded(callback) {
    if (callback) {
      this._onAllSourcesLoadedCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run when one of the {@link MediaTextureSource.source} has been uploaded to the GPU.
   * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been uploaded to the GPU.
   * @returns - our {@link MediaTexture}.
   */
  onSourceUploaded(callback) {
    if (callback) {
      this._onSourceUploadedCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run when all of the {@link MediaTextureSource.source | source} have been uploaded to the GPU.
   * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} been uploaded to the GPU.
   * @returns - our {@link MediaTexture}.
   */
  onAllSourcesUploaded(callback) {
    if (callback) {
      this._onAllSourcesUploadedCallback = callback;
    }
    return this;
  }
  /* RENDER */
  /**
   * Update a {@link MediaTexture} by uploading the {@link texture} if needed.
   * */
  update() {
    this.sources?.forEach((source, sourceIndex) => {
      if (!source.sourceLoaded) return;
      const sourceType = this.options.sourcesTypes[sourceIndex];
      if (sourceType === "externalVideo") {
        source.shouldUpdate = true;
      }
      if (source.shouldUpdate && sourceType !== "externalVideo") {
        if (this.size.width !== this.texture.width || this.size.height !== this.texture.height || this.options.generateMips && this.texture && this.texture.mipLevelCount <= 1) {
          this.createTexture();
        }
        this.renderer.uploadTexture(this, sourceIndex);
        source.shouldUpdate = false;
      }
    });
  }
  /**
   * Destroy the {@link MediaTexture}.
   */
  destroy() {
    if (this.videoFrameCallbackIds.size) {
      for (const [sourceIndex, id] of this.videoFrameCallbackIds) {
        this.sources[sourceIndex].source.cancelVideoFrameCallback(id);
      }
    }
    this.sources.forEach((source) => {
      if (this.isVideoSource(source.source)) {
        source.source.removeEventListener(
          "canplaythrough",
          this.onVideoLoaded.bind(this, source.source),
          {
            once: true
          }
        );
      }
    });
    super.destroy();
  }
};
_sourcesLoaded = new WeakMap();
_sourcesUploaded = new WeakMap();
_rotation = new WeakMap();
_MediaTexture_instances = new WeakSet();
/* EVENTS */
/**
 * Called each time a source has been loaded.
 * @param source - {@link TextureSource} that has just been loaded.
 * @private
 */
setSourceLoaded_fn = function(source) {
  this._onSourceLoadedCallback && this._onSourceLoadedCallback(source);
  const nbSourcesLoaded = this.sources.filter((source2) => source2.sourceLoaded)?.length || 0;
  if (nbSourcesLoaded === this.size.depth) {
    this.sourcesLoaded = true;
  }
};
let MediaTexture = _MediaTexture;

export { MediaTexture };
