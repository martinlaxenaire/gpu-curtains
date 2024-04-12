import { Vec3 } from '../../math/Vec3'
import { isRenderer, Renderer } from '../renderers/utils'
import { TextureBinding, TextureBindingParams } from '../bindings/TextureBinding'
import { BufferBinding } from '../bindings/BufferBinding'
import { Object3D } from '../objects3D/Object3D'
import { Mat4 } from '../../math/Mat4'
import { generateUUID, throwWarning } from '../../utils/utils'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { TextureOptions, TextureParams, TextureParent, TextureSize, TextureSource } from '../../types/Textures'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMProjectedMesh } from '../renderers/GPURenderer'

/** @const - default {@link Texture} parameters */
const defaultTextureParams: TextureParams = {
  name: 'texture',
  generateMips: false,
  flipY: false,
  format: 'rgba8unorm',
  premultipliedAlpha: true,
  placeholderColor: [0, 0, 0, 255], // default to black
  useExternalTextures: true,
  fromTexture: null,
  viewDimension: '2d',
  visibility: 'fragment',
  cache: true,
}

/**
 * Used to create {@link GPUTexture} or {@link GPUExternalTexture} from different kinds of {@link TextureSource | sources}, like {@link HTMLImageElement}, {@link HTMLVideoElement} or {@link HTMLCanvasElement}.
 *
 * Handles the various sources loading and uploading, GPU textures creation,{@link BufferBinding | texture model matrix binding} and {@link TextureBinding | GPU texture binding}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a render texture
 * const imageTexture = new Texture(gpuCurtains, {
 *   label: 'My image texture',
 *   name: 'imageTexture',
 * })
 *
 * // load an image
 * await imageTexture.loadImage(document.querySelector('img'))
 * ```
 */
export class Texture extends Object3D {
  /** The type of the {@link Texture} */
  type: string
  /** The universal unique id of this {@link Texture} */
  readonly uuid: string
  /** {@link Renderer} used by this {@link Texture} */
  renderer: Renderer

  /** The {@link GPUTexture} used if any */
  texture: null | GPUTexture
  /** The {@link GPUExternalTexture} used if any */
  externalTexture: null | GPUExternalTexture

  /** The {@link Texture} {@link TextureSource | source} to use */
  source: TextureSource
  /** The {@link GPUTexture}, matching the {@link TextureSource | source} {@link core/DOM/DOMElement.RectSize | size} (with 1 for depth) */
  size: TextureSize

  /** Options used to create this {@link Texture} */
  options: TextureOptions

  /** A {@link BufferBinding | buffer binding} that will hold the texture model matrix */
  textureMatrix: BufferBinding
  /** The bindings used by this {@link Texture}, i.e. its {@link textureMatrix} and its {@link TextureBinding | GPU texture binding} */
  bindings: BindGroupBindingElement[]

  /** {@link Texture} parentMesh if any */
  private _parentMesh: TextureParent

  /** Whether the source has been loaded */
  private _sourceLoaded: boolean
  /** Whether the source has been uploaded to the GPU, handled by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#texturesQueue | GPUDeviceManager texturesQueue array} */
  private _sourceUploaded: boolean
  /** Whether the texture should be uploaded to the GPU */
  shouldUpdate: boolean

  /** {@link HTMLVideoElement.requestVideoFrameCallback | requestVideoFrameCallback} returned id if used */
  videoFrameCallbackId: null | number

  /** Private {@link Vec3 | vector} used for {@link#modelMatrix} calculations, based on {@link parentMesh} {@link core/DOM/DOMElement.RectSize | size} */
  #parentRatio: Vec3 = new Vec3(1)
  /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on {@link size | source size} */
  #sourceRatio: Vec3 = new Vec3(1)
  /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio */
  #coverScale: Vec3 = new Vec3(1)
  /** Private rotation {@link Mat4 | matrix} based on texture {@link quaternion} */
  #rotationMatrix: Mat4 = new Mat4()

  // callbacks / events
  /** function assigned to the {@link onSourceLoaded} callback */
  _onSourceLoadedCallback = () => {
    /* allow empty callback */
  }
  /** function assigned to the {@link onSourceUploaded} callback */
  _onSourceUploadedCallback = () => {
    /* allow empty callback */
  }

  /**
   * Texture constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
   * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = defaultTextureParams) {
    super()

    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    const defaultOptions = {
      ...defaultTextureParams,
      source: parameters.fromTexture ? parameters.fromTexture.options.source : null,
      sourceType: parameters.fromTexture ? parameters.fromTexture.options.sourceType : null,
    }

    this.options = { ...defaultOptions, ...parameters }
    // force merge of texture object
    //this.options.texture = { ...defaultOptions.texture, ...parameters.texture }

    this.options.label = this.options.label ?? this.options.name

    this.texture = null
    this.externalTexture = null
    this.source = null

    // sizes
    this.size = {
      width: 1,
      height: 1,
      depth: 1,
    }

    // we will always declare a texture matrix
    this.textureMatrix = new BufferBinding({
      label: this.options.label + ': model matrix',
      name: this.options.name + 'Matrix',
      useStruct: false,
      struct: {
        [this.options.name + 'Matrix']: {
          type: 'mat4x4f',
          value: this.modelMatrix,
        },
      },
    })

    this.renderer.deviceManager.bufferBindings.set(this.textureMatrix.cacheKey, this.textureMatrix)

    this.setBindings()

    this._parentMesh = null

    this.sourceLoaded = false
    this.sourceUploaded = false
    this.shouldUpdate = false

    this.renderer.addTexture(this)
    this.createTexture()
  }

  /**
   * Set our {@link bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ': texture',
        name: this.options.name,
        bindingType: this.options.sourceType === 'externalVideo' ? 'externalTexture' : 'texture',
        visibility: this.options.visibility,
        texture: this.options.sourceType === 'externalVideo' ? this.externalTexture : this.texture,
        viewDimension: this.options.viewDimension,
      }),
      this.textureMatrix,
    ]
  }

  /**
   * Get our {@link TextureBinding | GPU texture binding}
   * @readonly
   */
  get textureBinding(): TextureBinding {
    return this.bindings[0] as TextureBinding
  }

  /**
   * Get our texture {@link parentMesh}
   */
  get parentMesh(): TextureParent {
    return this._parentMesh
  }

  /**
   * Set our texture {@link parentMesh}
   * @param value - texture {@link parentMesh} to set (i.e. any kind of {@link core/renderers/GPURenderer.RenderedMesh | Mesh}
   */
  set parentMesh(value: TextureParent) {
    this._parentMesh = value
    this.resize()
  }

  /**
   * Get whether our {@link source} has been loaded
   */
  get sourceLoaded(): boolean {
    return this._sourceLoaded
  }

  /**
   * Set whether our {@link source} has been loaded
   * @param value - boolean flag indicating if the {@link source} has been loaded
   */
  set sourceLoaded(value: boolean) {
    if (value && !this.sourceLoaded) {
      this._onSourceLoadedCallback && this._onSourceLoadedCallback()
    }
    this._sourceLoaded = value
  }

  /**
   * Get whether our {@link source} has been uploaded
   */
  get sourceUploaded(): boolean {
    return this._sourceUploaded
  }

  /**
   * Set whether our {@link source} has been uploaded
   * @param value - boolean flag indicating if the {@link source} has been uploaded
   */
  set sourceUploaded(value: boolean) {
    if (value && !this.sourceUploaded) {
      this._onSourceUploadedCallback && this._onSourceUploadedCallback()
    }
    this._sourceUploaded = value
  }

  /**
   * Set our texture {@link transforms} object
   */
  setTransforms() {
    super.setTransforms()

    this.transforms.quaternion.setAxisOrder('ZXY')

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model.set(0.5, 0.5, 0)
  }

  /* TEXTURE MATRIX */

  /**
   * Update the {@link modelMatrix}
   */
  updateModelMatrix() {
    if (!this.parentMesh) return

    const parentScale = (this.parentMesh as DOMProjectedMesh).scale
      ? (this.parentMesh as DOMProjectedMesh).scale
      : new Vec3(1, 1, 1)

    const parentWidth = (this.parentMesh as DOMProjectedMesh).boundingRect
      ? (this.parentMesh as DOMProjectedMesh).boundingRect.width * parentScale.x
      : this.size.width
    const parentHeight = (this.parentMesh as DOMProjectedMesh).boundingRect
      ? (this.parentMesh as DOMProjectedMesh).boundingRect.height * parentScale.y
      : this.size.height

    const parentRatio = parentWidth / parentHeight
    const sourceRatio = this.size.width / this.size.height

    // handle the texture rotation
    // huge props to [@grgrdvrt](https://github.com/grgrdvrt) for this solution!
    if (parentWidth > parentHeight) {
      this.#parentRatio.set(parentRatio, 1, 1)
      this.#sourceRatio.set(1 / sourceRatio, 1, 1)
    } else {
      this.#parentRatio.set(1, 1 / parentRatio, 1)
      this.#sourceRatio.set(1, sourceRatio, 1)
    }

    // cover ratio is a bit tricky!
    const coverRatio =
      parentRatio > sourceRatio !== parentWidth > parentHeight
        ? 1
        : parentWidth > parentHeight
        ? this.#parentRatio.x * this.#sourceRatio.x
        : this.#sourceRatio.y * this.#parentRatio.y

    this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1)

    this.#rotationMatrix.rotateFromQuaternion(this.quaternion)

    // here we could create a matrix for each translations / scales and do:
    // this.modelMatrix
    //   .identity()
    //   .premultiply(negativeOriginMatrix)
    //   .premultiply(coverScaleMatrix)
    //   .premultiply(parentRatioMatrix)
    //   .premultiply(rotationMatrix)
    //   .premultiply(textureRatioMatrix)
    //   .premultiply(originMatrix)
    //   .translate(this.position)

    // but this is faster!
    this.modelMatrix
      .identity()
      .premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1))
      .premultiplyScale(this.#coverScale)
      .premultiplyScale(this.#parentRatio)
      .premultiply(this.#rotationMatrix)
      .premultiplyScale(this.#sourceRatio)
      .premultiplyTranslate(this.transformOrigin)
      .translate(this.position)
  }

  /**
   * If our {@link modelMatrix} has been updated, tell the {@link textureMatrix | texture matrix binding} to update as well
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.textureMatrix.shouldUpdateBinding(this.options.name + 'Matrix')
    }
  }

  /**
   * Resize our {@link Texture}
   */
  resize() {
    // this should only happen with canvas textures
    if (
      this.source &&
      this.source instanceof HTMLCanvasElement &&
      (this.source.width !== this.size.width || this.source.height !== this.size.height)
    ) {
      // since the source size has changed, we have to recreate a new texture
      this.setSourceSize()
      this.createTexture()
    }

    // tell our model matrix to update
    this.shouldUpdateModelMatrix()
  }

  /**
   * Get the number of mip levels create based on {@link size}
   * @param sizes - Array containing our texture width, height and depth
   * @returns - number of mip levels
   */
  getNumMipLevels(...sizes: number[]): number {
    const maxSize = Math.max(...sizes)
    return (1 + Math.log2(maxSize)) | 0
  }

  /**
   * Tell the {@link Renderer} to upload or texture
   */
  uploadTexture() {
    this.renderer.uploadTexture(this)
    this.shouldUpdate = false
  }

  /**
   * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the  {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
   */
  uploadVideoTexture() {
    this.externalTexture = this.renderer.importExternalTexture(this.source as HTMLVideoElement)
    this.textureBinding.resource = this.externalTexture
    this.textureBinding.setBindingType('externalTexture')
    this.shouldUpdate = false
    this.sourceUploaded = true
  }

  /**
   * Copy a {@link Texture}
   * @param texture - {@link Texture} to copy
   */
  copy(texture: Texture) {
    if (this.options.sourceType === 'externalVideo' && texture.options.sourceType !== 'externalVideo') {
      throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`)
      return
    } else if (this.options.sourceType !== 'externalVideo' && texture.options.sourceType === 'externalVideo') {
      throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`)
      return
    }

    this.options.fromTexture = texture

    // now copy all desired texture options except source
    // const { source, ...optionsToCopy } = texture.options
    // this.options = { ...this.options, ...optionsToCopy }

    this.options.sourceType = texture.options.sourceType

    // TODO better way to do that?
    this.options.generateMips = texture.options.generateMips
    this.options.flipY = texture.options.flipY
    this.options.format = texture.options.format
    this.options.premultipliedAlpha = texture.options.premultipliedAlpha
    this.options.placeholderColor = texture.options.placeholderColor
    this.options.useExternalTextures = texture.options.useExternalTextures

    this.sourceLoaded = texture.sourceLoaded
    this.sourceUploaded = texture.sourceUploaded

    // TODO external texture?
    if (texture.texture) {
      if (texture.sourceLoaded) {
        this.size = texture.size
        this.source = texture.source

        this.resize()
      }

      if (texture.sourceUploaded) {
        // texture to copy is ready, update our texture and binding
        this.texture = texture.texture
        this.textureBinding.resource = this.texture
      } else {
        this.createTexture()
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
      size: [this.size.width, this.size.height, this.size.depth], // [1, 1] if no source
      dimensions: this.options.viewDimension === '1d' ? '1d' : this.options.viewDimension === '3d' ? '3d' : '2d',
      //sampleCount: this.source ? this.renderer.sampleCount : 1,
      usage: !!this.source
        ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    } as GPUTextureDescriptor

    if (this.options.sourceType !== 'externalVideo') {
      options.mipLevelCount = this.options.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1

      this.texture?.destroy()

      this.texture = this.renderer.createTexture(options)

      // update texture binding
      this.textureBinding.resource = this.texture
    }

    this.shouldUpdate = true
  }

  /* SOURCES */

  /**
   * Set the {@link size} based on the {@link source}
   */
  setSourceSize() {
    this.size = {
      width:
        (this.source as HTMLImageElement).naturalWidth ||
        (this.source as HTMLCanvasElement).width ||
        (this.source as HTMLVideoElement).videoWidth,
      height:
        (this.source as HTMLImageElement).naturalHeight ||
        (this.source as HTMLCanvasElement).height ||
        (this.source as HTMLVideoElement).videoHeight,
      depth: 1,
    }
  }

  /**
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}
   * @async
   * @param url - URL of the image to load
   * @returns - the newly created {@link ImageBitmap}
   */
  async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  /**
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link source} and create the {@link GPUTexture}
   * @async
   * @param source - the image URL or {@link HTMLImageElement} to load
   * @returns - the newly created {@link ImageBitmap}
   */
  async loadImage(source: string | HTMLImageElement): Promise<void> {
    const url = typeof source === 'string' ? source : source.getAttribute('src')

    this.options.source = url
    this.options.sourceType = 'image'

    const cachedTexture = this.renderer.textures.find((t) => t.options.source === url)
    if (cachedTexture && cachedTexture.texture && cachedTexture.sourceUploaded) {
      this.copy(cachedTexture)
      return
    }

    this.sourceLoaded = false
    this.sourceUploaded = false

    this.source = await this.loadImageBitmap(this.options.source)

    this.setSourceSize()
    this.resize()

    this.sourceLoaded = true
    this.createTexture()
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
      this.shouldUpdate = true
      ;(this.source as HTMLVideoElement).requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
    }
  }

  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
   * @param video - the newly loaded {@link HTMLVideoElement}
   */
  onVideoLoaded(video: HTMLVideoElement) {
    if (!this.sourceLoaded) {
      this.source = video

      this.setSourceSize()
      this.resize()

      if (this.options.useExternalTextures) {
        this.options.sourceType = 'externalVideo'

        // texture binding will be set when uploading external texture
        // meanwhile, destroy previous texture
        this.texture?.destroy()
      } else {
        this.options.sourceType = 'video'
        this.createTexture()
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        this.videoFrameCallbackId = (this.source as HTMLVideoElement).requestVideoFrameCallback(
          this.onVideoFrameCallback.bind(this)
        )
      }

      this.sourceLoaded = true
    }
  }

  /**
   * Get whether the {@link source} is a video
   * @readonly
   */
  get isVideoSource(): boolean {
    return this.source && (this.options.sourceType === 'video' || this.options.sourceType === 'externalVideo')
  }

  /**
   * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback
   * @param source - the video URL or {@link HTMLVideoElement} to load
   */
  loadVideo(source: string | HTMLVideoElement) {
    let video

    if (typeof source === 'string') {
      video = document.createElement('video')
      video.src = source
    } else {
      video = source
    }

    video.preload = 'auto'
    video.muted = true
    video.loop = true
    video.crossOrigin = 'anonymous'
    video.setAttribute('playsinline', '')

    this.options.source = video.src
    this.sourceLoaded = false
    this.sourceUploaded = false

    // If the video is in the cache of the browser,
    // the 'canplaythrough' event might have been triggered
    // before we registered the event handler.
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      this.onVideoLoaded(video)
    } else {
      video.addEventListener('canplaythrough', this.onVideoLoaded.bind(this, video), {
        once: true,
      })
    }

    // if duration is not available, should mean our video has not started loading
    if (isNaN(video.duration)) {
      video.load()
    }
  }

  /**
   * Load a {@link HTMLCanvasElement}, use it as a {@link source} and create the {@link GPUTexture}
   * @param source - the {@link HTMLCanvasElement} to use
   */
  loadCanvas(source: HTMLCanvasElement) {
    this.options.source = source
    this.options.sourceType = 'canvas'
    this.sourceLoaded = false
    this.sourceUploaded = false

    this.source = source

    this.setSourceSize()
    this.resize()

    this.sourceLoaded = true
    this.createTexture()
  }

  /* EVENTS */

  /**
   * Callback to run when the {@link source} has been loaded
   * @param callback - callback to run when the {@link source} has been loaded
   * @returns - our {@link Texture}
   */
  onSourceLoaded(callback: () => void): Texture {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when the {@link source} has been uploaded
   * @param callback - callback to run when the {@link source} been uploaded
   * @returns - our {@link Texture}
   */
  onSourceUploaded(callback: () => void): Texture {
    if (callback) {
      this._onSourceUploadedCallback = callback
    }

    return this
  }

  /* RENDER */

  /**
   * Render a {@link Texture}:
   * - Update its {@link modelMatrix} and {@link bindings} if needed
   * - Upload the texture if it needs to be done
   */
  render() {
    // update our model matrix if needed
    this.updateMatrixStack()

    // update uniforms values
    this.textureMatrix.update()

    // since external texture are destroyed as soon as JavaScript returns to the browser
    // we need to update it at every tick, even if it hasn't changed
    // to ensure we're not sending a stale / destroyed texture
    // anyway, external texture are cached so it is fined to call importExternalTexture at each tick
    if (this.options.sourceType === 'externalVideo') {
      this.shouldUpdate = true
    }

    // if no videoFrameCallback check if the video is actually really playing
    if (
      this.isVideoSource &&
      !this.videoFrameCallbackId &&
      (this.source as HTMLVideoElement).readyState >= (this.source as HTMLVideoElement).HAVE_CURRENT_DATA &&
      !(this.source as HTMLVideoElement).paused
    ) {
      this.shouldUpdate = true
    }

    if (this.shouldUpdate && this.options.sourceType && this.options.sourceType !== 'externalVideo') {
      this.uploadTexture()
    }
  }

  /* DESTROY */

  /**
   * Destroy the {@link Texture}
   */
  destroy() {
    if (this.videoFrameCallbackId) {
      ;(this.source as HTMLVideoElement).cancelVideoFrameCallback(this.videoFrameCallbackId)
    }

    if (this.isVideoSource) {
      ;(this.source as HTMLVideoElement).removeEventListener(
        'canplaythrough',
        this.onVideoLoaded.bind(this, this.source),
        {
          once: true,
        } as AddEventListenerOptions & EventListenerOptions
      )
    }

    this.renderer.removeTexture(this)

    this.texture?.destroy()
    this.texture = null
  }
}
