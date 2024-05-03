import { Vec3 } from '../../math/Vec3.mjs';
import { isRenderer } from '../renderers/utils.mjs';
import { TextureBinding } from '../bindings/TextureBinding.mjs';
import { BufferBinding } from '../bindings/BufferBinding.mjs';
import { Object3D } from '../objects3D/Object3D.mjs';
import { Mat4 } from '../../math/Mat4.mjs';
import { generateUUID, throwWarning } from '../../utils/utils.mjs';
import { getNumMipLevels } from './utils.mjs';

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
var _parentRatio, _sourceRatio, _coverScale, _rotationMatrix;
const defaultDOMTextureParams = {
  name: "texture",
  generateMips: false,
  flipY: false,
  format: "rgba8unorm",
  premultipliedAlpha: true,
  placeholderColor: [0, 0, 0, 255],
  // default to black
  useExternalTextures: true,
  fromTexture: null,
  viewDimension: "2d",
  visibility: ["fragment"],
  cache: true
};
class DOMTexture extends Object3D {
  /**
   * DOMTexture constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
   * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
   */
  constructor(renderer, parameters = defaultDOMTextureParams) {
    super();
    /** Private {@link Vec3 | vector} used for {@link#modelMatrix} calculations, based on {@link parentMesh} {@link core/DOM/DOMElement.RectSize | size} */
    __privateAdd(this, _parentRatio, new Vec3(1));
    /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on {@link size | source size} */
    __privateAdd(this, _sourceRatio, new Vec3(1));
    /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio */
    __privateAdd(this, _coverScale, new Vec3(1));
    /** Private rotation {@link Mat4 | matrix} based on texture {@link quaternion} */
    __privateAdd(this, _rotationMatrix, new Mat4());
    // callbacks / events
    /** function assigned to the {@link onSourceLoaded} callback */
    this._onSourceLoadedCallback = () => {
    };
    /** function assigned to the {@link onSourceUploaded} callback */
    this._onSourceUploadedCallback = () => {
    };
    this.type = "Texture";
    renderer = renderer && renderer.renderer || renderer;
    isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    const defaultOptions = {
      ...defaultDOMTextureParams,
      source: parameters.fromTexture ? parameters.fromTexture.options.source : null,
      sourceType: parameters.fromTexture ? parameters.fromTexture.options.sourceType : null
    };
    this.options = { ...defaultOptions, ...parameters };
    this.options.label = this.options.label ?? this.options.name;
    this.texture = null;
    this.externalTexture = null;
    this.source = null;
    this.size = {
      width: 1,
      height: 1,
      depth: 1
    };
    this.textureMatrix = new BufferBinding({
      label: this.options.label + ": model matrix",
      name: this.options.name + "Matrix",
      useStruct: false,
      struct: {
        [this.options.name + "Matrix"]: {
          type: "mat4x4f",
          value: this.modelMatrix
        }
      }
    });
    this.renderer.deviceManager.bufferBindings.set(this.textureMatrix.cacheKey, this.textureMatrix);
    this.setBindings();
    this._parentMesh = null;
    this.sourceLoaded = false;
    this.sourceUploaded = false;
    this.shouldUpdate = false;
    this.renderer.addDOMTexture(this);
    this.createTexture();
  }
  /**
   * Set our {@link bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ": texture",
        name: this.options.name,
        bindingType: this.options.sourceType === "externalVideo" ? "externalTexture" : "texture",
        visibility: this.options.visibility,
        texture: this.options.sourceType === "externalVideo" ? this.externalTexture : this.texture,
        viewDimension: this.options.viewDimension
      }),
      this.textureMatrix
    ];
  }
  /**
   * Get our {@link TextureBinding | GPU texture binding}
   * @readonly
   */
  get textureBinding() {
    return this.bindings[0];
  }
  /**
   * Get our texture {@link parentMesh}
   */
  get parentMesh() {
    return this._parentMesh;
  }
  /**
   * Set our texture {@link parentMesh}
   * @param value - texture {@link parentMesh} to set (i.e. any kind of {@link core/renderers/GPURenderer.RenderedMesh | Mesh}
   */
  set parentMesh(value) {
    this._parentMesh = value;
    this.resize();
  }
  /**
   * Get whether our {@link source} has been loaded
   */
  get sourceLoaded() {
    return this._sourceLoaded;
  }
  /**
   * Set whether our {@link source} has been loaded
   * @param value - boolean flag indicating if the {@link source} has been loaded
   */
  set sourceLoaded(value) {
    if (value && !this.sourceLoaded) {
      this._onSourceLoadedCallback && this._onSourceLoadedCallback();
    }
    this._sourceLoaded = value;
  }
  /**
   * Get whether our {@link source} has been uploaded
   */
  get sourceUploaded() {
    return this._sourceUploaded;
  }
  /**
   * Set whether our {@link source} has been uploaded
   * @param value - boolean flag indicating if the {@link source} has been uploaded
   */
  set sourceUploaded(value) {
    if (value && !this.sourceUploaded) {
      this._onSourceUploadedCallback && this._onSourceUploadedCallback();
    }
    this._sourceUploaded = value;
  }
  /**
   * Set our texture {@link transforms} object
   */
  setTransforms() {
    super.setTransforms();
    this.transforms.quaternion.setAxisOrder("ZXY");
    this.transforms.origin.model.set(0.5, 0.5, 0);
  }
  /* TEXTURE MATRIX */
  /**
   * Update the {@link modelMatrix}
   */
  updateModelMatrix() {
    if (!this.parentMesh)
      return;
    const parentScale = this.parentMesh.scale ? this.parentMesh.scale : new Vec3(1, 1, 1);
    const parentWidth = this.parentMesh.boundingRect ? this.parentMesh.boundingRect.width * parentScale.x : this.size.width;
    const parentHeight = this.parentMesh.boundingRect ? this.parentMesh.boundingRect.height * parentScale.y : this.size.height;
    const parentRatio = parentWidth / parentHeight;
    const sourceRatio = this.size.width / this.size.height;
    if (parentWidth > parentHeight) {
      __privateGet(this, _parentRatio).set(parentRatio, 1, 1);
      __privateGet(this, _sourceRatio).set(1 / sourceRatio, 1, 1);
    } else {
      __privateGet(this, _parentRatio).set(1, 1 / parentRatio, 1);
      __privateGet(this, _sourceRatio).set(1, sourceRatio, 1);
    }
    const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? __privateGet(this, _parentRatio).x * __privateGet(this, _sourceRatio).x : __privateGet(this, _sourceRatio).y * __privateGet(this, _parentRatio).y;
    __privateGet(this, _coverScale).set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1);
    __privateGet(this, _rotationMatrix).rotateFromQuaternion(this.quaternion);
    this.modelMatrix.identity().premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1)).premultiplyScale(__privateGet(this, _coverScale)).premultiplyScale(__privateGet(this, _parentRatio)).premultiply(__privateGet(this, _rotationMatrix)).premultiplyScale(__privateGet(this, _sourceRatio)).premultiplyTranslate(this.transformOrigin).translate(this.position);
  }
  /**
   * If our {@link modelMatrix} has been updated, tell the {@link textureMatrix | texture matrix binding} to update as well
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.textureMatrix.shouldUpdateBinding(this.options.name + "Matrix");
    }
  }
  /**
   * Resize our {@link DOMTexture}
   */
  resize() {
    if (this.source && this.source instanceof HTMLCanvasElement && (this.source.width !== this.size.width || this.source.height !== this.size.height)) {
      this.setSourceSize();
      this.createTexture();
    }
    this.shouldUpdateModelMatrix();
  }
  /**
   * Tell the {@link Renderer} to upload or texture
   */
  uploadTexture() {
    this.renderer.uploadTexture(this);
    this.shouldUpdate = false;
  }
  /**
   * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the  {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
   */
  uploadVideoTexture() {
    this.externalTexture = this.renderer.importExternalTexture(this.source);
    this.textureBinding.resource = this.externalTexture;
    this.textureBinding.setBindingType("externalTexture");
    this.shouldUpdate = false;
    this.sourceUploaded = true;
  }
  /**
   * Copy a {@link DOMTexture}
   * @param texture - {@link DOMTexture} to copy
   */
  copy(texture) {
    if (this.options.sourceType === "externalVideo" && texture.options.sourceType !== "externalVideo") {
      throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`);
      return;
    } else if (this.options.sourceType !== "externalVideo" && texture.options.sourceType === "externalVideo") {
      throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`);
      return;
    }
    this.options.fromTexture = texture;
    this.options.sourceType = texture.options.sourceType;
    this.options.generateMips = texture.options.generateMips;
    this.options.flipY = texture.options.flipY;
    this.options.format = texture.options.format;
    this.options.premultipliedAlpha = texture.options.premultipliedAlpha;
    this.options.placeholderColor = texture.options.placeholderColor;
    this.options.useExternalTextures = texture.options.useExternalTextures;
    this.sourceLoaded = texture.sourceLoaded;
    this.sourceUploaded = texture.sourceUploaded;
    if (texture.texture) {
      if (texture.sourceLoaded) {
        this.size = texture.size;
        this.source = texture.source;
        this.resize();
      }
      if (texture.sourceUploaded) {
        this.texture = texture.texture;
        this.textureBinding.resource = this.texture;
      } else {
        this.createTexture();
      }
    }
  }
  /**
   * Set the {@link texture | GPU texture}
   */
  createTexture() {
    const options = {
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth],
      // [1, 1] if no source
      dimensions: this.options.viewDimension === "1d" ? "1d" : this.options.viewDimension === "3d" ? "3d" : "2d",
      //sampleCount: this.source ? this.renderer.sampleCount : 1,
      usage: !!this.source ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    };
    if (this.options.sourceType !== "externalVideo") {
      options.mipLevelCount = this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height) : 1;
      this.texture?.destroy();
      this.texture = this.renderer.createTexture(options);
      this.textureBinding.resource = this.texture;
    }
    this.shouldUpdate = true;
  }
  /* SOURCES */
  /**
   * Set the {@link size} based on the {@link source}
   */
  setSourceSize() {
    this.size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
      depth: 1
    };
  }
  /**
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}
   * @async
   * @param url - URL of the image to load
   * @returns - the newly created {@link ImageBitmap}
   */
  async loadImageBitmap(url) {
    const res = await fetch(url);
    const blob = await res.blob();
    return await createImageBitmap(blob, { colorSpaceConversion: "none" });
  }
  /**
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link source} and create the {@link GPUTexture}
   * @async
   * @param source - the image URL or {@link HTMLImageElement} to load
   * @returns - the newly created {@link ImageBitmap}
   */
  async loadImage(source) {
    const url = typeof source === "string" ? source : source.getAttribute("src");
    this.options.source = url;
    this.options.sourceType = "image";
    const cachedTexture = this.renderer.domTextures.find((t) => t.options.source === url);
    if (cachedTexture && cachedTexture.texture && cachedTexture.sourceUploaded) {
      this.copy(cachedTexture);
      return;
    }
    this.sourceLoaded = false;
    this.sourceUploaded = false;
    this.source = await this.loadImageBitmap(this.options.source);
    this.setSourceSize();
    this.resize();
    this.sourceLoaded = true;
    this.createTexture();
  }
  // weirldy enough, we don't have to do anything in that callback
  // because the <video> is not visible in the viewport, the video playback is throttled
  // and the rendering is janky
  // using requestVideoFrameCallback helps preventing this but is unsupported in Firefox at the moment
  // WebCodecs may be the way to go when time comes!
  // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
  /**
   * Set our {@link shouldUpdate} flag to true at each new video frame
   */
  onVideoFrameCallback() {
    if (this.videoFrameCallbackId) {
      this.shouldUpdate = true;
      this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this));
    }
  }
  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
   * @param video - the newly loaded {@link HTMLVideoElement}
   */
  onVideoLoaded(video) {
    if (!this.sourceLoaded) {
      this.source = video;
      this.setSourceSize();
      this.resize();
      if (this.options.useExternalTextures) {
        this.options.sourceType = "externalVideo";
        this.texture?.destroy();
      } else {
        this.options.sourceType = "video";
        this.createTexture();
      }
      if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
        this.videoFrameCallbackId = this.source.requestVideoFrameCallback(
          this.onVideoFrameCallback.bind(this)
        );
      }
      this.sourceLoaded = true;
    }
  }
  /**
   * Get whether the {@link source} is a video
   * @readonly
   */
  get isVideoSource() {
    return this.source && (this.options.sourceType === "video" || this.options.sourceType === "externalVideo");
  }
  /**
   * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback
   * @param source - the video URL or {@link HTMLVideoElement} to load
   */
  loadVideo(source) {
    let video;
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
    this.options.source = video.src;
    this.sourceLoaded = false;
    this.sourceUploaded = false;
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      this.onVideoLoaded(video);
    } else {
      video.addEventListener("canplaythrough", this.onVideoLoaded.bind(this, video), {
        once: true
      });
    }
    if (isNaN(video.duration)) {
      video.load();
    }
  }
  /**
   * Load a {@link HTMLCanvasElement}, use it as a {@link source} and create the {@link GPUTexture}
   * @param source - the {@link HTMLCanvasElement} to use
   */
  loadCanvas(source) {
    this.options.source = source;
    this.options.sourceType = "canvas";
    this.sourceLoaded = false;
    this.sourceUploaded = false;
    this.source = source;
    this.setSourceSize();
    this.resize();
    this.sourceLoaded = true;
    this.createTexture();
  }
  /* EVENTS */
  /**
   * Callback to run when the {@link source} has been loaded
   * @param callback - callback to run when the {@link source} has been loaded
   * @returns - our {@link DOMTexture}
   */
  onSourceLoaded(callback) {
    if (callback) {
      this._onSourceLoadedCallback = callback;
    }
    return this;
  }
  /**
   * Callback to run when the {@link source} has been uploaded
   * @param callback - callback to run when the {@link source} been uploaded
   * @returns - our {@link DOMTexture}
   */
  onSourceUploaded(callback) {
    if (callback) {
      this._onSourceUploadedCallback = callback;
    }
    return this;
  }
  /* RENDER */
  /**
   * Render a {@link DOMTexture}:
   * - Update its {@link modelMatrix} and {@link bindings} if needed
   * - Upload the texture if it needs to be done
   */
  render() {
    this.updateMatrixStack();
    this.textureMatrix.update();
    if (this.options.sourceType === "externalVideo") {
      this.shouldUpdate = true;
    }
    if (this.isVideoSource && !this.videoFrameCallbackId && this.source.readyState >= this.source.HAVE_CURRENT_DATA && !this.source.paused) {
      this.shouldUpdate = true;
    }
    if (this.shouldUpdate && this.options.sourceType && this.options.sourceType !== "externalVideo") {
      this.uploadTexture();
    }
  }
  /* DESTROY */
  /**
   * Destroy the {@link DOMTexture}
   */
  destroy() {
    if (this.videoFrameCallbackId) {
      this.source.cancelVideoFrameCallback(this.videoFrameCallbackId);
    }
    if (this.isVideoSource) {
      this.source.removeEventListener(
        "canplaythrough",
        this.onVideoLoaded.bind(this, this.source),
        {
          once: true
        }
      );
    }
    this.renderer.removeDOMTexture(this);
    this.texture?.destroy();
    this.texture = null;
  }
}
_parentRatio = new WeakMap();
_sourceRatio = new WeakMap();
_coverScale = new WeakMap();
_rotationMatrix = new WeakMap();

export { DOMTexture };
