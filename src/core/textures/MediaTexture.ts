import { Texture, TextureBaseParams, TextureParams } from './Texture'
import { isRenderer, Renderer } from '../renderers/utils'
import { MediaTextureBaseParams, TextureSize, TextureSource, TextureSourceType } from '../../types/Textures'
import { Vec2 } from '../../math/Vec2'
import { Mat3 } from '../../math/Mat3'
import { BufferBinding } from '../bindings/BufferBinding'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { throwWarning, toKebabCase } from '../../utils/utils'
import { TextureBinding } from '../bindings/TextureBinding'
import { getDefaultMediaTextureUsage, getNumMipLevels } from './utils'
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding'
import { DOMTexture } from '../../curtains/textures/DOMTexture'

/** Parameters used to create a {@link MediaTexture}. */
export interface MediaTextureParams extends TextureBaseParams, MediaTextureBaseParams {}

/** Options used to create this {@link MediaTexture}. */
export interface MediaTextureOptions extends TextureParams, MediaTextureParams {
  /** {@link Texture} sources. */
  sources: Array<TextureSource | string | MediaProvider> // for image urls
  /** {@link Texture} sources type. */
  sourcesTypes: TextureSourceType[]
}

/** Define a {@link MediaTexture} source. */
export interface MediaTextureSource {
  /** Original {@link TextureSource} to use. */
  source: TextureSource
  /** {@link VideoFrame} to use with external textures, or `null`. */
  externalSource: VideoFrame | null
  /** Whether we should update the {@link GPUTexture} for this source. */
  shouldUpdate: boolean
  /** Whether the source has been loaded. */
  sourceLoaded: boolean
  /** Whether the source has been uploaded to the GPU. */
  sourceUploaded: boolean
}

/** @const - default {@link MediaTexture} parameters. */
const defaultMediaTextureParams: MediaTextureParams = {
  label: 'Texture',
  name: 'texture',
  useExternalTextures: true,
  fromTexture: null,
  viewDimension: '2d',
  format: 'rgba8unorm',
  // copy external texture options
  generateMips: false,
  flipY: false,
  premultipliedAlpha: false,
  colorSpace: 'srgb',
  autoDestroy: true,
  // texture transform
  useTransform: false,
  placeholderColor: [0, 0, 0, 255], // default to solid black
  cache: true,
}

/**
 * This class extends the {@link Texture} class specifically to handle external sources such as images, videos or canvases. It can be used with {@link core/computePasses/ComputePass.ComputePass | ComputePass} and/or any kind of {@link core/meshes/Mesh.Mesh | Mesh}.
 *
 * Can also handle texture transformations using a {@link Mat3} if the {@link MediaTextureParams#useTransform | useTransform parameter} has been set to `true` upon creation.
 *
 * If you use transformations, the {@link modelMatrix} will be available in the shaders using `texturesMatrices.${texture.options.name}.matrix`.
 *
 * The library provide a convenient helpers in the shaders to help you compute the transformed UV:
 *
 * ```wgsl
 * // assuming 'uv' is a valid vec2f containing the original UV and the texture name is 'meshTexture'
 * uv = getUVCover(uv, texturesMatrices.meshTexture.matrix);
 * ```
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid GPURenderer
 *
 * // create a simple media texture
 * const mediaTexture = new MediaTexture(renderer, {
 *   label: 'Media texture',
 *   name: 'mediaTexture',
 * })
 *
 * mediaTexture.loadImage('path/to/image.jpg')
 *
 * // create a cube map texture
 * const cubeMapTexture = new MediaTexture(renderer, {
 *   label: 'Cube map texture',
 *   name: 'cubeMapTexture',
 *   viewDimension: 'cube',
 * })
 *
 * cubeMapTexture.loadImages([
 *   'path/to/positive-x.jpg',
 *   'path/to/negative-x.jpg',
 *   'path/to/positive-y.jpg',
 *   'path/to/negative-y.jpg',
 *   'path/to/positive-z.jpg',
 *   'path/to/negative-z.jpg',
 * ])
 * ```
 */
export class MediaTexture extends Texture {
  /** The {@link GPUExternalTexture} used if any. */
  externalTexture: null | GPUExternalTexture

  /** The {@link MediaTexture} sources to use if any. */
  sources: MediaTextureSource[]

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

  /** {@link Vec2} offset to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
  offset: Vec2
  /** Rotation to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
  #rotation: number
  /** {@link Vec2} scale to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
  scale: Vec2
  /** {@link Vec2} transformation origin to use when applying the transformations to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. A value of (0.5, 0.5) corresponds to the center of the texture. Default is (0, 0), the upper left. */
  transformOrigin: Vec2
  /** {@link Mat3} transformation matrix to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
  modelMatrix: Mat3
  /** {@link BufferBinding} to send the transformation matrix to the shaders if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
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

  /** function assigned to the {@link onAllSourcesUploaded} callback */
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
        // force fixed size to disable texture destroy on resize
        fixedSize: { width: parameters.fixedSize?.width ?? 1, height: parameters.fixedSize?.height ?? 1 },
      },
    })

    this.type = 'MediaTexture'

    const supportExternalTexture = this.renderer.device
      ? typeof this.renderer.device.importExternalTexture !== 'undefined'
      : true

    this.options = {
      ...this.options,
      useTransform,
      placeholderColor,
      cache,
      useExternalTextures: supportExternalTexture && !!useExternalTextures,
      ...{
        sources: [],
        sourcesTypes: [],
      },
    }

    if (parameters.fromTexture && parameters.fromTexture instanceof MediaTexture) {
      this.options.sources = parameters.fromTexture.options.sources
      this.options.sourcesTypes = parameters.fromTexture.options.sourcesTypes
      this.sources = parameters.fromTexture.sources
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
        label: toKebabCase(this.options.name),
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
      )

      this.transformBinding.inputs.matrix.shouldUpdate = true
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
    if (this.size.depth !== texture.size.depth) {
      throwWarning(
        `${this.options.label}: cannot copy a ${texture.options.label} because the depth sizes differ: ${this.size.depth} vs ${texture.size.depth}.`
      )
      return
    }

    if (texture instanceof MediaTexture) {
      if (this.options.sourcesTypes[0] === 'externalVideo' && texture.options.sourcesTypes[0] !== 'externalVideo') {
        throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`)
        return
      } else if (
        this.options.sourcesTypes[0] !== 'externalVideo' &&
        texture.options.sourcesTypes[0] === 'externalVideo'
      ) {
        throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`)
        return
      }

      this.options.fixedSize = texture.options.fixedSize
      this.sources = texture.sources
      this.options.sources = texture.options.sources
      this.options.sourcesTypes = texture.options.sourcesTypes
      this.sourcesLoaded = texture.sourcesLoaded
      this.sourcesUploaded = texture.sourcesUploaded
    }

    super.copy(texture)
  }

  /**
   * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
   */
  createTexture() {
    if (!this.renderer.device || !this.size.width || !this.size.height) return

    // copy the GPU texture only if
    // - it's not a MediaTexture
    // - it's a MediaTexture and sources have been uploaded
    if (
      this.options.fromTexture &&
      (!(this.options.fromTexture instanceof MediaTexture) || this.options.fromTexture.sourcesUploaded)
    ) {
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

    if (!this.sources?.length) {
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

  /**
   * Resize our {@link MediaTexture}.
   */
  resize() {
    // this should only happen with canvas textures
    if (
      this.sources.length === 1 &&
      this.sources[0] &&
      this.sources[0].source instanceof HTMLCanvasElement &&
      (this.sources[0].source.width !== this.size.width || this.sources[0].source.height !== this.size.height)
    ) {
      // since the source size has changed, we have to re upload a new texture
      this.setSourceSize()
      this.sources[0].shouldUpdate = true
    } else {
      super.resize()
    }
  }

  /* SOURCES */

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
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link MediaTextureSource.source | source}.
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
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link MediaTextureSource.source | source} and create the {@link GPUTexture}.
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
        externalSource: null,
        sourceLoaded: true,
        sourceUploaded: false,
        shouldUpdate: true,
      }
    } else {
      this.sources = [
        {
          source: imageBitmap,
          externalSource: null,
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

  /**
   * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
   */
  uploadVideoTexture() {
    const source = this.sources[0]
    const video = source.source as HTMLVideoElement

    if (source && video) {
      // destroy current texture if any
      this.texture?.destroy()
      this.texture = null

      // try yo create a video frame from video
      // if it fails for any reason, just upload an empty offscreen canvas
      try {
        source.externalSource = new VideoFrame(video)
      } catch (e) {
        const offscreen = new OffscreenCanvas(this.size.width, this.size.height)
        offscreen.getContext('2d')
        source.externalSource = new VideoFrame(offscreen, { timestamp: 0 })
      }

      this.externalTexture = this.renderer.importExternalTexture(source.externalSource, this.options.label)
      this.textureBinding.resource = this.externalTexture
      this.textureBinding.setBindingType('externalTexture')
      source.shouldUpdate = false
      this.setSourceUploaded(0)
    }
  }

  /**
   * Close an external source {@link VideoFrame} if any.
   */
  closeVideoFrame() {
    const source = this.sources[0]

    if (source && source.externalSource) {
      source.externalSource.close()
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
      this.sources[sourceIndex].shouldUpdate = true
      ;(this.sources[sourceIndex].source as HTMLVideoElement).requestVideoFrameCallback(
        this.onVideoFrameCallback.bind(this, sourceIndex)
      )
    }
  }

  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link MediaTextureSource.source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
   * @param video - the newly loaded {@link HTMLVideoElement}.
   * @param sourceIndex - Index of the {@link HTMLVideoElement} in the {@link sources} array.
   */
  onVideoLoaded(video: HTMLVideoElement, sourceIndex = 0) {
    if (!this.sources[sourceIndex].sourceLoaded) {
      if (this.options.sources[sourceIndex] instanceof MediaStream && video.paused) {
        video.addEventListener(
          'play',
          () => {
            this.sources[sourceIndex].sourceLoaded = true
            this.sources[sourceIndex].shouldUpdate = true
            this.setSourceSize()
          },
          { once: true }
        )
      } else {
        this.sources[sourceIndex].sourceLoaded = true
        // update at least first frame
        this.sources[sourceIndex].shouldUpdate = true
        this.setSourceSize()
      }

      const videoFrameCallbackId = video.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this, sourceIndex))

      this.videoFrameCallbackIds.set(sourceIndex, videoFrameCallbackId)

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

    const sourceIndex = this.options.sources.length

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

    this.useVideo(video, sourceIndex)

    // if duration is not available, should mean our video has not started loading
    if (isNaN(video.duration)) {
      video.load()
    }
  }

  /**
   * Use a {@link HTMLVideoElement} as a {@link sources}.
   * @param video - {@link HTMLVideoElement} to use.
   * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
   */
  useVideo(video: HTMLVideoElement, sourceIndex = 0) {
    const source = video.src ? video.src : video.srcObject ?? null

    if (!source) {
      throwWarning(`MediaTexture (${this.options.label}): Can not use this video as it as no source.`)
      return
    }

    if (this.size.depth > 1) {
      this.options.sources.push(source)

      // cannot use external video textures on a cube map
      this.options.sourcesTypes.push('video')

      this.sources[sourceIndex] = {
        source: video,
        externalSource: null,
        sourceLoaded: false,
        sourceUploaded: false,
        shouldUpdate: false,
      }
    } else {
      this.options.sources = [source]
      this.options.sourcesTypes = [this.options.useExternalTextures ? 'externalVideo' : 'video']

      this.sources = [
        {
          source: video,
          externalSource: null,
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
      this.onVideoLoaded(video, sourceIndex)
    } else {
      video.addEventListener('canplaythrough', this.onVideoLoaded.bind(this, video, sourceIndex), {
        once: true,
      })
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
        externalSource: null,
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
          externalSource: null,
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

  /**
   * Set the {@link MediaTextureSource.sourceUploaded | sourceUploaded} flag to true for the {@link MediaTextureSource.source | source} at a given index in our {@link sources} array. If all {@link sources} have been uploaded, set our {@link sourcesUploaded} flag to true.
   * @param sourceIndex - Index of the {@link MediaTextureSource.source | source} in the {@link sources} array.
   */
  setSourceUploaded(sourceIndex = 0) {
    this.sources[sourceIndex].sourceUploaded = true
    this._onSourceUploadedCallback && this._onSourceUploadedCallback(this.sources[sourceIndex].source)

    const nbSourcesUploaded = this.sources.filter((source) => source.sourceUploaded)?.length || 0

    if (nbSourcesUploaded === this.size.depth) {
      this.sourcesUploaded = true
    }
  }

  /**
   * Callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
   * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
   * @returns - our {@link MediaTexture}
   */
  onSourceLoaded(callback: (source: TextureSource) => void): this {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when all of the {@link MediaTextureSource.source | source} have been loaded.
   * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} have been loaded.
   * @returns - our {@link MediaTexture}
   */
  onAllSourcesLoaded(callback: () => void): this {
    if (callback) {
      this._onAllSourcesLoadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when one of the {@link MediaTextureSource.source} has been uploaded to the GPU.
   * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been uploaded to the GPU.
   * @returns - our {@link MediaTexture}.
   */
  onSourceUploaded(callback: (source: TextureSource) => void): this {
    if (callback) {
      this._onSourceUploadedCallback = callback
    }

    return this
  }

  /**
   * Callback to run when all of the {@link MediaTextureSource.source | source} have been uploaded to the GPU.
   * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} been uploaded to the GPU.
   * @returns - our {@link MediaTexture}.
   */
  onAllSourcesUploaded(callback: () => void): this {
    if (callback) {
      this._onAllSourcesUploadedCallback = callback
    }

    return this
  }

  /* RENDER */

  /**
   * Update a {@link MediaTexture} by uploading the {@link texture} if needed.
   * */
  update() {
    this.sources?.forEach((source, sourceIndex) => {
      if (!source.sourceLoaded) return

      const sourceType = this.options.sourcesTypes[sourceIndex]

      // since external texture are destroyed as soon as JavaScript returns to the browser
      // we need to update it at every tick, even if it hasn't changed
      // to ensure we're not sending a stale / destroyed texture
      // anyway, external texture are cached so it is fined to call importExternalTexture at each tick
      if (sourceType === 'externalVideo') {
        source.shouldUpdate = true
      }

      // upload texture if needed
      if (source.shouldUpdate && sourceType !== 'externalVideo') {
        // if the size or mips are not matching, this means we need to recreate the texture
        if (
          this.size.width !== this.texture.width ||
          this.size.height !== this.texture.height ||
          (this.options.generateMips && this.texture && this.texture.mipLevelCount <= 1)
        ) {
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
