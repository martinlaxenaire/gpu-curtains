import { Texture, TextureParams } from './Texture'
import { isRenderer, Renderer } from '../renderers/utils'
import { TextureSize, TextureSource, TextureSourceType } from '../../types/Textures'
import { Vec2 } from '../../math/Vec2'
import { Mat3 } from '../../math/Mat3'
import { BufferBinding } from '../bindings/BufferBinding'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { throwWarning } from '../../utils/utils'
import { TextureBinding } from '../bindings/TextureBinding'
import { getDefaultMediaTextureUsage, getNumMipLevels } from './utils'
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding'
import { DOMTexture } from './DOMTexture'

/** Parameters used to create a {@link MediaTexture}. */
export interface MediaTextureParams
  extends Omit<TextureParams, 'sampleCount' | 'type' | 'access' | 'qualityRatio' | 'aspect'> {
  /** Whether to use a transformation {@link Mat3} to use in the shaders for UV transformations. If set to `true`, will create a {@link BufferBinding} accessible in the shaders with the name `${texture.options.name}Matrix`. */
  useTransform?: boolean
  /** Solid color used by temporary texture to display while loading the source. Default to `[0, 0, 0, 255]` (solid black). */
  placeholderColor?: [number, number, number, number]
  /** Whether video textures should use {@link GPUExternalTexture} or not. Default to `true`. */
  useExternalTextures?: boolean
  /** Whether to keep the {@link DOMTexture#texture | texture} in the {@link core/renderers/GPURenderer.GPURenderer | renderer} cache when a {@link core/materials/Material.Material | Material} tries to destroy it. Default to `true`. */
  cache?: boolean
}

/** Options used to create this {@link MediaTexture}. */
export interface MediaTextureOptions extends TextureParams, MediaTextureParams {
  /** {@link Texture} sources. */
  sources: Array<TextureSource | string> // for image urls
  /** {@link Texture} sources type. */
  sourcesTypes: TextureSourceType[]
}

/** @const - default {@link MediaTexture} parameters. */
const defaultMediaTextureParams: MediaTextureParams = {
  label: 'Texture',
  name: 'texture',
  useExternalTextures: true,
  fromTexture: null,
  viewDimension: '2d',
  // copy external texture options
  generateMips: false,
  flipY: false,
  premultipliedAlpha: false,
  colorSpace: 'srgb',
  autoDestroy: true,
  // texture transform
  useTransform: false,
  placeholderColor: [0, 0, 0, 255], // default to black
  cache: true,
}

export class MediaTexture extends Texture {
  /** The {@link GPUExternalTexture} used if any. */
  externalTexture: null | GPUExternalTexture

  /** The {@link MediaTexture} {@link TextureSource | sources} to use if any. */
  sources: Array<{
    /** Original {@link TextureSource} to use. */
    source: TextureSource
    /** Whether the source has been loaded. */
    sourceLoaded: boolean
    /** Whether the source has been uploaded to the GPU. */
    sourceUploaded: boolean
    /** Whether we should update the {@link texture} for this source. */
    shouldUpdate: boolean
  }>

  /** Size of the {@link MediaTexture#texture | texture} source, usually our {@link sources} first element size (since for cube maps, all sources must have the same size). */
  size: TextureSize

  /** Whether the sources have been loaded. */
  #sourcesLoaded: boolean
  /** Whether the sources have been uploaded to the GPU, handled by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#texturesQueue | GPUDeviceManager texturesQueue array}. */
  #sourcesUploaded: boolean

  /** Options used to create this {@link MediaTexture}. */
  options: MediaTextureOptions

  /** Array of {@link HTMLVideoElement.requestVideoFrameCallback | requestVideoFrameCallback} returned ids if used. */
  videoFrameCallbackIds: Map<number, null | number>

  /** {@link Vec2} offset to apply to the {@link Texture} if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. */
  offset: Vec2
  /** Rotation to apply to the {@link Texture} if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. */
  #rotation: number
  /** {@link Vec2} scale to apply to the {@link Texture} if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. */
  scale: Vec2
  /** {@link Vec2} transformation origin to use when applying the transformations to the {@link Texture} if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. A value of (0.5, 0.5) corresponds to the center of the texture. Default is (0, 0), the upper left. */
  transformOrigin: Vec2
  /** {@link Mat3} transformation matrix to apply to the {@link Texture} if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. */
  modelMatrix: Mat3
  /** {@link BufferBinding} to send the transformation matrix to the shaders if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`. */
  transformBinding?: BufferBinding | null

  // callbacks / events
  /** function assigned to the {@link onSourceLoaded} callback */
  _onSourceLoadedCallback = (source: TextureSource) => {
    /* allow empty callback */
  }

  /** function assigned to the {@link onAllSourcesLoaded} callback */
  _onAllSourcesLoadedCallback = () => {
    /* allow empty callback */
  }

  /** function assigned to the {@link onSourceUploaded} callback */
  _onSourceUploadedCallback = (source: TextureSource) => {
    /* allow empty callback */
  }

  /** function assigned to the {@link onAllSourceUploaded} callback */
  _onAllSourcesUploadedCallback = () => {
    /* allow empty callback */
  }

  /**
   * Texture constructor
   * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
   * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = defaultMediaTextureParams) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + ' MediaTexture' : 'MediaTexture')

    const params = { ...defaultMediaTextureParams, ...parameters }

    const { useTransform, placeholderColor, useExternalTextures, cache, ...baseTextureParams } = params

    super(renderer, {
      ...baseTextureParams,
      ...{
        sampleCount: 1,
        type: 'texture' as TextureBindingType,
        access: 'write' as BindingMemoryAccessType,
        qualityRatio: 1,
        aspect: 'all',
        fixedSize: { width: parameters.fixedSize?.width ?? 1, height: parameters.fixedSize?.height ?? 1 },
      },
    })

    this.type = 'MediaTexture'

    this.options = {
      ...this.options,
      useTransform,
      placeholderColor,
      cache,
      useExternalTextures: !!useExternalTextures,
      ...{
        sources: [],
        sourcesTypes: [],
      },
    }

    if (parameters.fromTexture && parameters.fromTexture instanceof MediaTexture) {
      this.options.sources = parameters.fromTexture.options.sources
      this.options.sourcesTypes = parameters.fromTexture.options.sourcesTypes
    }

    // transform
    this.#rotation = 0
    this.offset = new Vec2().onChange(() => this.updateModelMatrix())
    this.scale = new Vec2(1).onChange(() => this.updateModelMatrix())
    this.transformOrigin = new Vec2().onChange(() => this.updateModelMatrix())

    this.modelMatrix = new Mat3()
    this.transformBinding = null

    if (this.options.useTransform) {
      this.transformBinding = new BufferBinding({
        label: this.options.label,
        name: this.options.name,
        struct: {
          matrix: {
            type: 'mat3x3f',
            value: this.modelMatrix,
          },
        },
      })

      this.updateModelMatrix()
    }

    this.externalTexture = null
    this.sources = []
    this.videoFrameCallbackIds = new Map()

    this.sourcesLoaded = false
    this.sourcesUploaded = false

    // upload placeholder texture
    this.renderer.uploadTexture(this)
  }

  /**
   * Get whether all our {@link sources} have been loaded.
   */
  get sourcesLoaded(): boolean {
    return this.#sourcesLoaded
  }

  /**
   * Set whether all our {@link sources} have been loaded.
   * @param value - boolean flag indicating if all the {@link sources} have been loaded.
   */
  set sourcesLoaded(value: boolean) {
    if (value && !this.sourcesLoaded) {
      this._onAllSourcesLoadedCallback && this._onAllSourcesLoadedCallback()
    }

    this.#sourcesLoaded = value
  }

  /**
   * Get whether all our {@link sources} have been uploaded.
   */
  get sourcesUploaded(): boolean {
    return this.#sourcesUploaded
  }

  /**
   * Set whether all our {@link sources} have been uploaded.
   * @param value - boolean flag indicating if all the {@link sources} have been uploaded
   */
  set sourcesUploaded(value: boolean) {
    if (value && !this.sourcesUploaded) {
      this._onAllSourcesUploadedCallback && this._onAllSourcesUploadedCallback()
    }
    this.#sourcesUploaded = value
  }

  /* TRANSFORM */

  /**
   * Get the actual {@link rotation} value.
   * @returns - the actual {@link rotation} value.
   */
  get rotation(): number {
    return this.#rotation
  }

  /**
   * Set the actual {@link rotation} value and update the {@link modelMatrix}.
   * @param value - new {@link rotation} value to use.
   */
  set rotation(value: number) {
    this.#rotation = value
    this.updateModelMatrix()
  }

  /**
   * Update the {@link modelMatrix} using the {@link offset}, {@link rotation}, {@link scale} and {@link transformOrigin} and tell the {@link transformBinding} to update, only if {@link TextureBaseParams#useTransform | useTransform} parameter has been set to `true`.
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
      )

      this.transformBinding.shouldUpdate = true
    } else {
      throwWarning(
        `Texture: Cannot update ${this.options.name} transformation since its useTransform property has been set to false. You should set it to true when creating the Texture.`
      )
    }
  }

  /**
   * Set our {@link Texture#bindings | bindings}.
   */
  setBindings() {
    this.bindings = [
      new TextureBinding({
        label: this.options.label + ': ' + this.options.name + ' texture',
        name: this.options.name,
        bindingType: this.options.type,
        visibility: this.options.visibility,
        texture: this.texture,
        format: this.options.format,
        viewDimension: this.options.viewDimension,
        multisampled: false,
      }),
    ]
  }

  /**
   * Copy another {@link Texture} into this {@link Texture}.
   * @param texture - {@link Texture} to copy.
   */
  copy(texture: Texture | MediaTexture | DOMTexture) {
    if (texture instanceof MediaTexture) {
      this.options.fixedSize = texture.options.fixedSize
      this.sources = texture.sources
      this.options.sources = texture.options.sources
      this.options.sourcesTypes = texture.options.sourcesTypes
    }

    super.copy(texture)
  }

  /**
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
   */
  createTexture() {
    if (!this.size.width || !this.size.height) return

    if (this.options.fromTexture) {
      // copy the GPU texture
      this.copyGPUTexture(this.options.fromTexture.texture)
      return
    }

    const options = {
      label: this.options.label,
      format: this.options.format,
      size: [this.size.width, this.size.height, this.size.depth ?? 1],
      dimensions: this.options.viewDimension,
      sampleCount: this.options.sampleCount,
      usage: getDefaultMediaTextureUsage(this.options.usage),
    } as GPUTextureDescriptor

    if (!this.options.sources) {
      options.mipLevelCount = 1

      this.texture?.destroy()

      this.texture = this.renderer.createTexture(options)

      // update texture binding
      this.textureBinding.resource = this.texture
    } else if (!this.options.sourcesTypes.includes('externalVideo')) {
      options.mipLevelCount = this.options.generateMips
        ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1)
        : 1

      this.texture?.destroy()

      this.texture = this.renderer.createTexture(options)

      // update texture binding
      this.textureBinding.resource = this.texture
    }
  }

  /* SOURCES */

  /**
   * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
   */
  uploadVideoTexture() {
    const source = this.sources[0]

    if (source && source.source) {
      this.externalTexture = this.renderer.importExternalTexture(source.source as HTMLVideoElement, this.options.label)
      this.textureBinding.resource = this.externalTexture
      this.textureBinding.setBindingType('externalTexture')
      source.shouldUpdate = false
      source.sourceUploaded = true
    }
  }

  /**
   * Set the {@link size} based on the first available loaded {@link sources}.
   */
  setSourceSize() {
    // find the first source that is loaded and apply its size
    const source = this.sources.filter(Boolean).find((source) => !!source.sourceLoaded)

    this.options.fixedSize.width = Math.max(
      1,
      (source.source as HTMLImageElement).naturalWidth ||
        (source.source as HTMLCanvasElement).width ||
        (source.source as HTMLVideoElement).videoWidth
    )

    this.options.fixedSize.height = Math.max(
      1,
      (source.source as HTMLImageElement).naturalHeight ||
        (source.source as HTMLCanvasElement).height ||
        (source.source as HTMLVideoElement).videoHeight
    )

    this.size.width = this.options.fixedSize.width
    this.size.height = this.options.fixedSize.height
  }

  /**
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}.
   * @param url - URL of the image to load.
   * @returns - the newly created {@link ImageBitmap}.
   */
  async loadImageBitmap(url: string): Promise<ImageBitmap> {
    if (url.includes('.webp')) {
      return new Promise((resolve, reject) => {
        const img = new Image()
        img.crossOrigin = 'anonymous' // Ensure CORS is handled properly if needed

        img.onload = () => {
          createImageBitmap(img, { colorSpaceConversion: 'none' }).then(resolve).catch(reject)
        }

        img.onerror = reject
        img.src = url
      }) as Promise<ImageBitmap>
    } else {
      const res = await fetch(url)
      const blob = await res.blob()
      return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
    }
  }

  /**
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link Texture.sources | source} and create the {@link GPUTexture}.
   * @param source - the image URL or {@link HTMLImageElement} to load.
   */
  async loadImage(source: string | HTMLImageElement) {
    const url = typeof source === 'string' ? source : source.getAttribute('src')

    const sourceIndex = this.options.sources.length

    if (this.size.depth > 1) {
      this.options.sources.push(url)
      this.options.sourcesTypes.push('image')
    } else {
      this.options.sources = [url]
      this.options.sourcesTypes = ['image']
    }

    if (this.options.cache) {
      const cachedTexture = this.renderer.textures
        .filter((t) => t instanceof MediaTexture && t.uuid !== this.uuid)
        .find((t: MediaTexture) => {
          const sourceIndex = t.options.sources.findIndex((source) => source === url)

          if (sourceIndex === -1) return null

          return t.sources[sourceIndex]?.sourceLoaded && t.texture && t.size.depth === this.size.depth
        })

      if (cachedTexture) {
        console.log(cachedTexture, url, this.options.label)
        this.copy(cachedTexture)
        return
      }
    }

    const loadedSource = await this.loadImageBitmap(url)

    this.useImageBitmap(loadedSource, sourceIndex)
  }

  /**
   * Use an already loaded {@link ImageBitmap} as a {@link sources}.
   * @param imageBitmap - {@link ImageBitmap} to use.
   * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
   */
  useImageBitmap(imageBitmap: ImageBitmap, sourceIndex = 0) {
    if (this.size.depth > 1) {
      this.sources[sourceIndex] = {
        source: imageBitmap,
        sourceLoaded: true,
        sourceUploaded: false,
        shouldUpdate: true,
      }
    } else {
      this.sources = [
        {
          source: imageBitmap,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true,
        },
      ]
    }

    this.setSourceSize()
    this.#setSourceLoaded(imageBitmap)
  }

  /**
   * Load and create images using {@link loadImage} from an array of images sources as strings or {@link HTMLImageElement}. Useful for cube maps.
   * @param sources - Array of images sources as strings or {@link HTMLImageElement} to load.
   */
  async loadImages(sources: Array<string | HTMLImageElement>) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadImage(sources[i])
    }
  }

  // weirldy enough, we don't have to do anything in that callback
  // because the <video> is not visible in the viewport, the video playback is throttled
  // and the rendering is janky
  // using requestVideoFrameCallback helps preventing this but is unsupported in Firefox at the moment
  // WebCodecs may be the way to go when time comes!
  // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
  /**
   * Set our {@link shouldUpdate} flag to true at each new video frame.
   */
  onVideoFrameCallback(sourceIndex = 0) {
    if (this.videoFrameCallbackIds.get(sourceIndex)) {
      this.sources[sourceIndex].shouldUpdate = true
      ;(this.sources[sourceIndex].source as HTMLVideoElement).requestVideoFrameCallback(
        this.onVideoFrameCallback.bind(this, sourceIndex)
      )
    }
  }

  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
   * @param video - the newly loaded {@link HTMLVideoElement}.
   */
  onVideoLoaded(video: HTMLVideoElement, sourceIndex = 0) {
    if (!this.sources[sourceIndex].sourceLoaded) {
      this.sources[sourceIndex].sourceLoaded = true
      this.setSourceSize()

      if (this.options.sourcesTypes[sourceIndex] === 'externalVideo') {
        // texture binding will be set when uploading external texture
        // meanwhile, destroy previous texture
        this.texture?.destroy()
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        const videoFrameCallbackId = (this.sources[sourceIndex].source as HTMLVideoElement).requestVideoFrameCallback(
          this.onVideoFrameCallback.bind(this, sourceIndex)
        )

        this.videoFrameCallbackIds.set(sourceIndex, videoFrameCallbackId)
      }

      this.#setSourceLoaded(video)
    }
  }

  /**
   * Get whether the provided source is a video.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the source is a video or not.
   */
  isVideoSource(source: TextureSource): source is HTMLVideoElement {
    return source instanceof HTMLVideoElement
  }

  /**
   * Get whether the provided video source is ready to be played.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the video source is ready to be played.
   */
  isVideoSourceReady(source: TextureSource): boolean {
    if (!this.isVideoSource(source)) return false

    return source.readyState >= source.HAVE_CURRENT_DATA
  }

  /**
   * Get whether the provided video source is ready to be uploaded.
   * @param source - {@link TextureSource} to check.
   * @returns - Whether the video source is ready to be uploaded.
   */
  shouldUpdateVideoSource(source: TextureSource): boolean {
    if (!this.isVideoSource(source)) return false

    return this.isVideoSourceReady(source) && !source.paused
  }

  /**
   * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback.
   * @param source - the video URL or {@link HTMLVideoElement} to load.
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

    if (this.size.depth > 1) {
      const sourceIndex = this.options.sources.length

      this.options.sources.push(video.src)

      // cannot use external video textures on a cube map
      this.options.sourcesTypes.push('video')

      this.sources[sourceIndex] = {
        source: video,
        sourceLoaded: false,
        sourceUploaded: false,
        shouldUpdate: false,
      }
    } else {
      this.options.sources = [video.src]
      this.options.sourcesTypes = [this.options.useExternalTextures ? 'externalVideo' : 'video']

      this.sources = [
        {
          source: video,
          sourceLoaded: false,
          sourceUploaded: false,
          shouldUpdate: false,
        },
      ]
    }

    // If the video is in the cache of the browser,
    // the 'canplaythrough' event might have been triggered
    // before we registered the event handler.
    if (video.readyState >= video.HAVE_ENOUGH_DATA) {
      this.onVideoLoaded(video, this.sources.length - 1)
    } else {
      video.addEventListener('canplaythrough', this.onVideoLoaded.bind(this, video, this.sources.length - 1), {
        once: true,
      })
    }

    // if duration is not available, should mean our video has not started loading
    if (isNaN(video.duration)) {
      video.load()
    }
  }

  /**
   * Load and create videos using {@link loadVideo} from an array of videos sources as strings or {@link HTMLVideoElement}. Useful for cube maps.
   * @param sources - Array of images sources as strings or {@link HTMLVideoElement} to load.
   */
  loadVideos(sources: Array<string | HTMLVideoElement>) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadVideo(sources[i])
    }
  }

  /**
   * Load a {@link HTMLCanvasElement} and use it as one of our {@link sources}.
   * @param source - the {@link HTMLCanvasElement} to use.
   */
  loadCanvas(source: HTMLCanvasElement) {
    if (this.size.depth > 1) {
      const sourceIndex = this.options.sources.length
      this.options.sources.push(source)
      this.options.sourcesTypes.push('canvas')

      this.sources[sourceIndex] = {
        source: source,
        sourceLoaded: true,
        sourceUploaded: false,
        shouldUpdate: true,
      }
    } else {
      this.options.sources = [source]
      this.options.sourcesTypes = ['canvas']
      this.sources = [
        {
          source: source,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true,
        },
      ]
    }

    this.setSourceSize()

    this.#setSourceLoaded(source)
  }

  /**
   * Load an array of {@link HTMLCanvasElement} using {@link loadCanvas} . Useful for cube maps.
   * @param sources - Array of {@link HTMLCanvasElement} to load.
   */
  loadCanvases(sources: HTMLCanvasElement[]) {
    for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
      this.loadCanvas(sources[i])
    }
  }

  /* EVENTS */

  /**
   * Called each time a source has been loaded.
   * @param source - {@link TextureSource} that has just been loaded.
   * @private
   */
  #setSourceLoaded(source: TextureSource) {
    this._onSourceLoadedCallback && this._onSourceLoadedCallback(source)

    const nbSourcesLoaded = this.sources.filter((source) => source.sourceLoaded)?.length || 0

    if (nbSourcesLoaded === this.size.depth) {
      this.sourcesLoaded = true
    }
  }

  setSourceUploaded(sourceIndex = 0) {
    this.sources[sourceIndex].sourceUploaded = true
    this._onSourceUploadedCallback && this._onSourceUploadedCallback(this.sources[sourceIndex].source)

    const nbSourcesUploaded = this.sources.filter((source) => source.sourceUploaded)?.length || 0

    if (nbSourcesUploaded === this.size.depth) {
      this.sourcesUploaded = true
    }
  }

  /**
   * Callback to run when one of the {@link sources#source | source} has been loaded.
   * @param callback - callback to run when one of the {@link sources#source | source} has been loaded.
   * @returns - our {@link MediaTexture}
   */
  onSourceLoaded(callback: (source: TextureSource) => void): this {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when all of the {@link sources#source | source} have been loaded.
   * @param callback - callback to run when all of the {@link sources#source | sources} have been loaded.
   * @returns - our {@link MediaTexture}
   */
  onAllSourcesLoaded(callback: () => void): this {
    if (callback) {
      this._onAllSourcesLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when one of the {@link sources#source} has been uploaded to the GPU.
   * @param callback - callback to run when one of the {@link sources#source | source} has been uploaded to the GPU.
   * @returns - our {@link MediaTexture}.
   */
  onSourceUploaded(callback: (source: TextureSource) => void): this {
    if (callback) {
      this._onSourceUploadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when all of the {@link sources#source | source} have been uploaded to the GPU.
   * @param callback - callback to run when all of the {@link sources#source | sources} been uploaded to the GPU.
   * @returns - our {@link MediaTexture}
   */
  onAllSourcesUploaded(callback: () => void): this {
    if (callback) {
      this._onAllSourcesUploadedCallback = callback
    }

    return this
  }

  /* RENDER */

  /**
   * Render a {@link MediaTexture} by uploading the {@link texture} if needed.
   * */
  render() {
    this.sources.forEach((source, sourceIndex) => {
      const sourceType = this.options.sourcesTypes[sourceIndex]

      // since external texture are destroyed as soon as JavaScript returns to the browser
      // we need to update it at every tick, even if it hasn't changed
      // to ensure we're not sending a stale / destroyed texture
      // anyway, external texture are cached so it is fined to call importExternalTexture at each tick
      if (sourceType === 'externalVideo' && this.isVideoSourceReady(source.source)) {
        source.shouldUpdate = true
      }

      // if no videoFrameCallback check if the video is actually really playing
      if (
        this.isVideoSource(source.source) &&
        !this.videoFrameCallbackIds.size &&
        this.shouldUpdateVideoSource(source.source)
      ) {
        source.shouldUpdate = true
      }

      // upload texture if needed
      if (source.shouldUpdate && sourceType !== 'externalVideo') {
        // if the size is not matching, this means we need to recreate the texture
        if (this.size.width !== this.texture.width || this.size.height !== this.texture.height) {
          this.createTexture()
        }

        this.renderer.uploadTexture(this, sourceIndex)
        source.shouldUpdate = false
      }
    })
  }

  /**
   * Destroy the {@link MediaTexture}.
   */
  destroy() {
    if (this.videoFrameCallbackIds.size) {
      for (const [sourceIndex, id] of this.videoFrameCallbackIds) {
        ;(this.sources[sourceIndex].source as HTMLVideoElement).cancelVideoFrameCallback(id)
      }
    }

    this.sources.forEach((source) => {
      if (this.isVideoSource(source.source)) {
        ;(source.source as HTMLVideoElement).removeEventListener(
          'canplaythrough',
          this.onVideoLoaded.bind(this, source.source),
          {
            once: true,
          } as AddEventListenerOptions & EventListenerOptions
        )
      }
    })

    super.destroy()
  }
}
