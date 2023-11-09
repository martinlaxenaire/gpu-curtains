import { Vec3 } from '../../math/Vec3'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { TextureBindings, TextureBindingsParams } from '../bindings/TextureBindings'
import { BufferBindings } from '../bindings/BufferBindings'
import { Object3D } from '../objects3D/Object3D'
import { Mat4 } from '../../math/Mat4'
import { generateUUID, throwWarning } from '../../utils/utils'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { TextureOptions, TextureParams, TextureParent, TextureSource } from '../../types/Textures'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMMeshType } from '../renderers/GPURenderer'
import { RectSize } from '../DOM/DOMElement'

/** @const - default [texture]{@link Texture} parameters */
const defaultTextureParams: TextureParams = {
  name: 'texture',
  texture: {
    generateMips: false,
    flipY: false,
    format: 'rgba8unorm',
    placeholderColor: [0, 0, 0, 255], // default to black
    useExternalTextures: true,
  },
  fromTexture: null,
}

/**
 * Texture class:
 * Used to create [textures]{@link GPUTexture} or [external textures]{@link GPUExternalTexture} from different kinds of [sources]{@link TextureSource}.
 * Handles the various sources loading and uploading, GPU textures creation, [texture matrix binding]{@link BufferBindings} and [texture binding]{@link TextureBindings}
 * @extends Object3D
 */
export class Texture extends Object3D {
  /** The type of the {@link Texture} */
  type: string
  /** The universal unique id of this {@link Texture} */
  readonly uuid: string
  /** [renderer]{@link Renderer} used by this {@link Texture} */
  renderer: Renderer

  /** The {@link GPUTexture} used if any */
  texture: null | GPUTexture
  /** The {@link GPUExternalTexture} used if any */
  externalTexture: null | GPUExternalTexture

  /** The {@link Texture} [source]{@link TextureSource} to use */
  source: TextureSource
  /** The {@link Texture} [source]{@link TextureSource} size */
  size: RectSize

  /** Options used to create this {@link Texture} */
  options: TextureOptions

  /** A [buffer binding]{@link BufferBindings} that will hold the texture matrix */
  textureMatrix: BufferBindings
  /** The bindings used by this {@link Texture}, i.e. its [texture matrix buffer binding]{@link Texture#textureMatrix} and its [texture binding]{@link TextureBindings} */
  bindings: BindGroupBindingElement[]

  /** {@link Texture} parent if any */
  private _parent: TextureParent

  /** Whether the source has been loaded */
  private _sourceLoaded: boolean
  /** Whether the source has been uploaded to the GPU, handled by the [renderer textures queue array]{@link Renderer#texturesQueue} */
  private _sourceUploaded: boolean
  /** Whether the texture should be uploaded to the GPU */
  shouldUpdate: boolean
  /** Whether the {@link BindGroup} handling this [texture bindings]{@link Texture#bindings} should be updated (i.e. each time a texture is uploaded to the GPU) */
  shouldUpdateBindGroup: boolean

  /** [video frame callback]{@link requestVideoFrameCallback} returned id if used */
  videoFrameCallbackId: null | number

  /** private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [parent]{@link Texture#parent} [size]{@link RectSize} */
  #parentRatio: Vec3 = new Vec3(1)
  /** private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [source size]{@link Texture#size} */
  #sourceRatio: Vec3 = new Vec3(1)
  /** private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [#parentRatio]{@link Texture##parentRatio} and [#sourceRatio]{@link Texture##sourceRatio} */
  #coverScale: Vec3 = new Vec3(1)
  /** Private rotation [matrix]{@link Mat4} based on [texture quaternion]{@link Texture#quaternion} */
  #rotationMatrix: Mat4 = new Mat4()

  // callbacks / events
  /** function assigned to the [onSourceLoaded]{@link Texture#onSourceLoaded} callback */
  _onSourceLoadedCallback = () => {
    /* allow empty callback */
  }
  /** function assigned to the [onSourceUploaded]{@link Texture#onSourceUploaded} callback */
  _onSourceUploadedCallback = () => {
    /* allow empty callback */
  }

  /**
   * Texture constructor
   * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
   * @param parameters - [parameters]{@link TextureParams} used to create this {@link Texture}
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
    this.options.texture = { ...defaultOptions.texture, ...parameters.texture }

    this.options.label = this.options.label ?? this.options.name

    this.texture = null
    this.externalTexture = null
    this.source = null

    // sizes
    this.size = {
      width: 1,
      height: 1,
    }

    // we will always declare a texture matrix
    this.textureMatrix = new BufferBindings({
      label: this.options.label + ': model matrix',
      name: this.options.name + 'Matrix',
      useStruct: false,
      bindings: {
        matrix: {
          name: this.options.name + 'Matrix',
          type: 'mat4x4f',
          value: this.modelMatrix,
          //onBeforeUpdate: () => this.updateTextureMatrix(),
        },
      },
    })

    this.setBindings()

    this._parent = null

    this.sourceLoaded = false
    this.sourceUploaded = false
    this.shouldUpdate = false
    this.shouldUpdateBindGroup = false

    // add texture to renderer so it can creates a placeholder texture ASAP
    this.renderer.addTexture(this)
  }

  /**
   * Set our [bindings]{@link Texture#bindings}
   */
  setBindings() {
    this.bindings = [
      new TextureBindings({
        label: this.options.label + ': texture',
        name: this.options.name,
        texture: this.options.sourceType === 'externalVideo' ? this.externalTexture : this.texture,
        bindingType: this.options.sourceType === 'externalVideo' ? 'externalTexture' : 'texture',
      } as TextureBindingsParams),
      this.textureMatrix,
    ]
  }

  /**
   * Get our [texture binding]{@link TextureBindings}
   * @readonly
   */
  get textureBinding(): TextureBindings {
    return this.bindings[0] as TextureBindings
  }

  /**
   * Get/set our [texture parent]{@link Texture#_parent}
   * @readonly
   */
  get parent(): TextureParent {
    return this._parent
  }

  set parent(value: TextureParent) {
    this._parent = value
    this.resize()
  }

  /**
   * Get/set whether our [texture source]{@link Texture#source} has loaded
   * @readonly
   */
  get sourceLoaded(): boolean {
    return this._sourceLoaded
  }

  set sourceLoaded(value: boolean) {
    if (value && !this.sourceLoaded) {
      this._onSourceLoadedCallback && this._onSourceLoadedCallback()
    }
    this._sourceLoaded = value
  }

  /**
   * Get/set whether our [texture source]{@link Texture#source} has been uploaded
   * @readonly
   */
  get sourceUploaded(): boolean {
    return this._sourceUploaded
  }

  set sourceUploaded(value: boolean) {
    if (value && !this.sourceUploaded) {
      this._onSourceUploadedCallback && this._onSourceUploadedCallback()
    }
    this._sourceUploaded = value
  }

  /**
   * Set our [texture transforms object]{@link Texture#transforms}
   */
  setTransforms() {
    super.setTransforms()

    this.transforms.quaternion.setAxisOrder('ZXY')

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model.set(0.5, 0.5, 0)
  }

  /* TEXTURE MATRIX */

  /**
   * Update the [texture model matrix]{@link Texture#modelMatrix}
   */
  updateModelMatrix() {
    if (!this.parent) return

    const parentScale = (this.parent as DOMMeshType).scale ? (this.parent as DOMMeshType).scale : new Vec3(1, 1, 1)

    const parentWidth = (this.parent as DOMMeshType).boundingRect
      ? (this.parent as DOMMeshType).boundingRect.width * parentScale.x
      : this.size.width
    const parentHeight = (this.parent as DOMMeshType).boundingRect
      ? (this.parent as DOMMeshType).boundingRect.height * parentScale.y
      : this.size.height

    const parentRatio = parentWidth / parentHeight

    const sourceWidth = this.size.width
    const sourceHeight = this.size.height

    const sourceRatio = sourceWidth / sourceHeight

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
    // TODO more tests!
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
   * Our [model matrix]{@link Texture#modelMatrix} has been updated, tell the [texture matrix binding]{@link Texture#textureMatrix} to update as well
   */
  onAfterMatrixStackUpdate() {
    this.textureMatrix.shouldUpdateBinding(this.options.name + 'Matrix')
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
   * Get the number of mip levels create based on [texture source size]{@link Texture#size}
   * @param sizes
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
   * Import an [external texture]{@link GPUExternalTexture} from the {@link Renderer}, update the [texture binding]{@link Texture#textureBinding} and its [bind group]{@link BindGroup}
   */
  uploadVideoTexture() {
    this.externalTexture = this.renderer.importExternalTexture(this.source as HTMLVideoElement)
    this.textureBinding.resource = this.externalTexture
    this.textureBinding.setBindingType('externalTexture')
    this.shouldUpdateBindGroup = true
    this.shouldUpdate = false
    this.sourceUploaded = true
  }

  /**
   * Copy a [texture]{@link Texture}
   * @param texture - [texture]{@link Texture} to copy
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
    this.options.sourceType = texture.options.sourceType

    this.options.texture = texture.options.texture

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
        this.texture = texture.texture

        this.shouldUpdateBindGroup = true
      } else {
        this.createTexture()
      }
    }
  }

  /**
   * Set the [texture]{@link Texture#texture}
   */
  createTexture() {
    const options = {
      label: this.options.label,
      format: this.options.texture.format,
      size: [this.size.width, this.size.height], // [1, 1] if no source
      usage: !!this.source
        ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    } as GPUTextureDescriptor

    if (this.options.sourceType !== 'externalVideo') {
      options.mipLevelCount = this.options.texture.generateMips
        ? this.getNumMipLevels(this.size.width, this.size.height)
        : 1

      this.texture?.destroy()

      this.texture = this.renderer.createTexture(options)

      // update texture binding
      this.textureBinding.resource = this.texture

      this.shouldUpdateBindGroup = !!this.source
    }

    this.shouldUpdate = true
  }

  /* SOURCES */

  /**
   * Set the [size]{@link Texture#size} based on [texture source]{@link Texture#source}
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
    }
  }

  /**
   * Load an [image]{@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a [texture source]{@link Texture#source}
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
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
   * @async
   * @param source - the image URL or {@link HTMLImageElement} to load
   * @returns - the newly created {@link ImageBitmap}
   */
  async loadImage(source: string | HTMLImageElement): Promise<void> {
    const image = typeof source === 'string' ? source : source.getAttribute('src')

    this.options.source = image
    this.options.sourceType = 'image'
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
   * Set our [shouldUpdate]{@link Texture#shouldUpdate} flag to true at each new video frame
   */
  onVideoFrameCallback() {
    if (this.videoFrameCallbackId) {
      this.shouldUpdate = true
      ;(this.source as HTMLVideoElement).requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
    }
  }

  /**
   * Callback to run when a [video]{@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the [video]{@link HTMLVideoElement} as a [texture source]{@link Texture#source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
   * @param video - the newly loaded [video]{@link HTMLVideoElement}
   */
  onVideoLoaded(video: HTMLVideoElement) {
    if (!this.sourceLoaded) {
      this.source = video

      this.setSourceSize()
      this.resize()

      if (this.options.texture.useExternalTextures) {
        this.options.sourceType = 'externalVideo'

        // texture bindings will be set when uploading external texture
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
   * Get whether the [texture source]{@link Texture#source} is a video
   * @readonly
   */
  get isVideoSource() {
    return this.source && (this.options.sourceType === 'video' || this.options.sourceType === 'externalVideo')
  }

  /**
   * Load a video from a URL or {@link HTMLVideoElement} and register [onVideoLoaded]{@link Texture#onVideoLoaded} callback
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
   * Load a [canvas]{@link HTMLCanvasElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
   * @param source
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
   * Callback to run when the [texture source]{@link Texture#source} has loaded
   * @param callback - callback to run when the [texture source]{@link Texture#source} has loaded
   */
  onSourceLoaded(callback: () => void): Texture {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when the [texture source]{@link Texture#source} has been uploaded
   * @param callback - callback to run when the [texture source]{@link Texture#source} been uploaded
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
   * - Update its [model matrix]{@link Texture#modelMatrix} and [bindings]{@link Texture#bindings} if needed
   * - Upload the texture if it needs to be done
   */
  render() {
    // update our model matrix if needed
    this.updateMatrixStack()

    // update uniforms values
    this.textureMatrix.onBeforeRender()

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
