import { isRenderer, Renderer } from '../renderers/utils'
import { TextureBinding } from '../bindings/TextureBinding'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { BindingMemoryAccessType, BindingParams, TextureBindingType } from '../bindings/Binding'
import { generateUUID, throwWarning } from '../../utils/utils'
import { DOMTexture } from './DOMTexture'
import { ExternalTextureParamsBase, TextureSize, TextureSource, TextureSourceType } from '../../types/Textures'
import { getDefaultTextureUsage, getNumMipLevels, TextureUsageKeys } from './utils'
import { Vec2 } from '../../math/Vec2'
import { Mat3 } from '../../math/Mat3'
import { BufferBinding } from '../bindings/BufferBinding'

/**
 * Base parameters used to create a {@link Texture}.
 */
export interface TextureBaseParams extends ExternalTextureParamsBase {
  /** The label of the {@link Texture}, used to create various GPU objects for debugging purpose. */
  label?: string
  /** Name of the {@link Texture} to use in the {@link TextureBinding | texture binding}. */
  name?: string

  /** Optional fixed size of the {@link Texture#texture | texture}. If set, the {@link Texture} will never be resized and always keep that size. */
  fixedSize?: TextureSize

  /** Force the texture size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size or {@link fixedSize}. Used mainly to shrink render target texture definition. */
  qualityRatio?: number

  /** Whether to use this {@link Texture} as a regular, storage or depth texture. */
  type?: TextureBindingType
  /** Optional format of the {@link Texture#texture | texture}, mainly used for storage textures. */
  format?: GPUTextureFormat
  /** Optional texture binding memory access type, mainly used for storage textures. */
  access?: BindingMemoryAccessType
  /** Optional {@link Texture#texture | texture} view dimension to use. */
  viewDimension?: GPUTextureViewDimension
  /** Sample count of the {@link Texture#texture | texture}, used for multisampling. */
  sampleCount?: GPUSize32
  /** The {@link Texture} shaders visibility sent to the {@link Texture#textureBinding | texture binding}. */
  visibility?: BindingParams['visibility']
  /** Allowed usages for the {@link Texture#texture | GPU texture} as an array of {@link TextureUsageKeys | texture usages names}. */
  usage?: TextureUsageKeys[]

  /** Whether any {@link core/materials/Material.Material | Material} using this {@link Texture} should automatically destroy it upon destruction. Default to `true`. */
  autoDestroy?: boolean

  /** Whether to use a transformation {@link Mat3} to use in the shaders for UV transformations. If set to `true`, will create a {@link BufferBinding} accessible in the shaders with the name `${texture.options.name}Matrix`. */
  useTransform?: boolean
}

/**
 * Parameters used to create a {@link Texture}.
 */
export interface TextureParams extends TextureBaseParams {
  /** Optional texture to use as a copy source input. Could be a {@link Texture} or {@link DOMTexture}. */
  fromTexture?: Texture | DOMTexture | null
}

/**
 * Options used to create this {@link Texture}.
 */
export interface TextureOptions extends TextureParams {
  /** {@link Texture} sources. */
  sources: Array<TextureSource | string> // for image url
  /** {@link Texture} sources type. */
  sourcesTypes: TextureSourceType[]
}

/** @const - default {@link Texture} parameters. */
const defaultTextureParams: TextureParams = {
  label: 'Texture',
  name: 'renderTexture', // default to 'renderTexture' for render target usage
  type: 'texture',
  access: 'write',
  fromTexture: null,
  viewDimension: '2d',
  sampleCount: 1,
  qualityRatio: 1,
  // copy external texture options
  generateMips: false,
  flipY: false,
  premultipliedAlpha: false,
  autoDestroy: true,
  // texture transform
  useTransform: false,
}

/**
 * This is the main class used to create and handle {@link GPUTexture | textures} that can be used with {@link core/computePasses/ComputePass.ComputePass | ComputePass} and/or {@link core/meshes/Mesh.Mesh | Mesh}. Also used as copy source/destination for {@link core/renderPasses/RenderPass.RenderPass | RenderPass} and {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget}.
 *
 * Basically useful for any kind of textures: for external sources (however in some cases, {@link core/textures/DOMTexture.DOMTexture | DOMTexture} might be preferred), depth, storages or to copy anything outputted to the screen at one point or another.
 *
 * Will create a {@link GPUTexture} and its associated {@link TextureBinding}.
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
 * // create a texture
 * const texture = new Texture(gpuCurtains, {
 *   label: 'My texture',
 *   name: 'myTexture',
 * })
 * ```
 */
export class Texture {
  /** {@link Renderer | renderer} used by this {@link Texture}. */
  renderer: Renderer
  /** The type of the {@link Texture}. */
  type: string
  /** The universal unique id of this {@link Texture}. */
  readonly uuid: string

  /** The {@link GPUTexture} used. */
  texture: GPUTexture

  /** The {@link GPUExternalTexture} used if any. */
  externalTexture: null | GPUExternalTexture

  /** The {@link Texture} {@link TextureSource | sources} to use if any. */
  sources: TextureSource[]

  /** Size of the {@link Texture#texture | texture} source, usually our {@link Renderer#canvas | renderer canvas} size. */
  size: TextureSize

  /** Options used to create this {@link Texture}. */
  options: TextureOptions

  /** Array of {@link core/bindings/Binding.Binding | bindings} that will actually only hold one {@link TextureBinding | texture binding}. */
  bindings: BindGroupBindingElement[]

  /** Whether this texture should be automatically resized when the {@link Renderer renderer} size changes. Default to true. */
  #autoResize = true

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

  /**
   * Texture constructor
   * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
   * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
   */
  constructor(renderer: Renderer | GPUCurtains, parameters = defaultTextureParams) {
    renderer = isRenderer(renderer, parameters.label ? parameters.label + ' Texture' : 'Texture')

    this.type = 'Texture'

    this.renderer = renderer

    this.uuid = generateUUID()

    this.options = {
      ...defaultTextureParams,
      ...parameters,
      ...{
        sources: [],
        sourcesTypes: [],
      },
    }

    if (
      this.options.format === 'rgba32float' &&
      !(this.renderer.deviceManager.adapter as GPUAdapter).features.has('float32-filterable')
    ) {
      this.options.format = 'rgba16float'
    }

    if (parameters.fromTexture) {
      this.options.format = parameters.fromTexture.texture.format
      this.options.sampleCount = parameters.fromTexture.texture.sampleCount
      this.options.viewDimension = parameters.fromTexture.options.viewDimension
      this.options.sources = parameters.fromTexture.options.sources
      this.options.sourcesTypes = parameters.fromTexture.options.sourcesTypes
    }

    if (!this.options.format) {
      this.options.format = this.renderer.options.context.format
    }

    // sizes
    this.size = this.options.fixedSize
      ? {
          width: this.options.fixedSize.width * this.options.qualityRatio,
          height: this.options.fixedSize.height * this.options.qualityRatio,
          depth: this.options.fixedSize.depth ?? this.options.viewDimension.indexOf('cube') !== -1 ? 6 : 1,
        }
      : {
          width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
          height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
          depth: this.options.viewDimension.indexOf('cube') !== -1 ? 6 : 1,
        }

    if (this.options.fixedSize) {
      this.#autoResize = false
    }

    // transform
    this.#rotation = 0
    this.offset = new Vec2().onChange(() => this.updateModelMatrix())
    this.scale = new Vec2(1).onChange(() => this.updateModelMatrix())
    this.transformOrigin = new Vec2().onChange(() => this.updateModelMatrix())

    this.modelMatrix = new Mat3()
    this.transformBinding = null

    // struct
    this.setBindings()

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

    // texture
    this.renderer.addTexture(this)

    this.externalTexture = null
    this.sources = []

    this.createTexture()
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
        multisampled: this.options.sampleCount > 1,
      }),
    ]
  }

  /**
   * Get our {@link TextureBinding | texture binding}.
   * @readonly
   */
  get textureBinding(): TextureBinding {
    return this.bindings[0] as TextureBinding
  }

  /**
   * Copy another {@link Texture} into this {@link Texture}.
   * @param texture - {@link Texture} to copy.
   */
  copy(texture: Texture | DOMTexture) {
    this.options.fromTexture = texture
    this.createTexture()
  }

  /**
   * Copy a {@link GPUTexture} directly into this {@link Texture}. Mainly used for depth textures.
   * @param texture - {@link GPUTexture} to copy.
   */
  copyGPUTexture(texture: GPUTexture) {
    this.size = {
      width: texture.width,
      height: texture.height,
      depth: texture.depthOrArrayLayers,
    }

    this.options.format = texture.format
    this.options.sampleCount = texture.sampleCount

    this.texture = texture

    this.textureBinding.setFormat(this.options.format)
    this.textureBinding.setMultisampled(this.options.sampleCount > 1)

    this.textureBinding.resource = this.texture
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
      usage: getDefaultTextureUsage(this.options.usage, this.options.type),
    } as GPUTextureDescriptor

    if (!this.options.sourcesTypes.includes('externalVideo')) {
      options.mipLevelCount = this.options.generateMips
        ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1)
        : 1

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
    this.options.fixedSize.width =
      (this.sources[0] as HTMLImageElement).naturalWidth ||
      (this.sources[0] as HTMLCanvasElement).width ||
      (this.sources[0] as HTMLVideoElement).videoWidth

    this.options.fixedSize.height =
      (this.sources[0] as HTMLImageElement).naturalHeight ||
      (this.sources[0] as HTMLCanvasElement).height ||
      (this.sources[0] as HTMLVideoElement).videoHeight

    this.size.width = this.options.fixedSize.width
    this.size.height = this.options.fixedSize.height

    this.#autoResize = false
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
    colorSpace = 'srgb',
  }: {
    source: GPUCopyExternalImageSource
    width?: number
    height?: number
    depth?: number
    origin?: GPUOrigin3D
    colorSpace?: PredefinedColorSpace
  }) {
    this.renderer.device.queue.copyExternalImageToTexture(
      { source, flipY: this.options.flipY },
      { texture: this.texture, premultipliedAlpha: this.options.premultipliedAlpha, origin, colorSpace },
      [width, height, depth]
    )

    if (this.texture.mipLevelCount > 1) {
      this.renderer.generateMips(this)
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
    data = new Float32Array(width * height * 4),
  }: {
    width?: number
    height?: number
    depth?: number
    origin?: GPUOrigin3D
    data?: Float32Array
  }) {
    this.renderer.device.queue.writeTexture(
      { texture: this.texture, origin },
      data,
      { bytesPerRow: width * data.BYTES_PER_ELEMENT * 4, rowsPerImage: height },
      [width, height, depth]
    )

    if (this.texture.mipLevelCount > 1) {
      this.renderer.generateMips(this)
    }
  }

  /**
   * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}.
   * @param url - URL of the image to load.
   * @returns - the newly created {@link ImageBitmap}.
   */
  async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  /**
   * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link Texture.sources | source} and create the {@link GPUTexture}.
   * @param source - the image URL or {@link HTMLImageElement} to load.
   */
  async loadImage(source: string | HTMLImageElement): Promise<void> {
    const url = typeof source === 'string' ? source : source.getAttribute('src')

    if (this.size.depth > 1) {
      this.options.sources.push(url)
      this.options.sourcesTypes.push('image')
    } else {
      this.options.sources = [url]
      this.options.sourcesTypes = ['image']
    }

    const cachedTexture = this.renderer.domTextures.find((t) => t.options.source === url)
    if (cachedTexture && cachedTexture.texture && cachedTexture.sourceUploaded) {
      this.copy(cachedTexture)
      return
    }

    this.sourceLoaded = false
    this.sourceUploaded = false

    const loadedSource = await this.loadImageBitmap(url)
    if (this.size.depth > 1) {
      this.sources.push(loadedSource)
    } else {
      this.sources = [loadedSource]
    }

    this.setSourceSize()

    this.sourceLoaded = this.sources.length === this.size.depth

    if (this.sourceLoaded) {
      this.createTexture()
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
    if (this.videoFrameCallbackIds.length >= sourceIndex) {
      this.shouldUpdate = true
      ;(this.sources[sourceIndex] as HTMLVideoElement).requestVideoFrameCallback(
        this.onVideoFrameCallback.bind(this, sourceIndex)
      )
    }
  }

  /**
   * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
   * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
   * @param video - the newly loaded {@link HTMLVideoElement}.
   */
  onVideoLoaded(video: HTMLVideoElement) {
    if (!this.sourceLoaded) {
      if (this.size.depth > 1) {
        this.sources.push(video)
      } else {
        this.sources = [video]
      }

      this.setSourceSize()
      //this.resize()

      if (this.options.useExternalTextures) {
        if (this.size.depth > 1) {
          this.options.sourcesTypes.push('externalVideo')
        } else {
          this.options.sourcesTypes = ['externalVideo']
        }

        // texture binding will be set when uploading external texture
        // meanwhile, destroy previous texture
        this.texture?.destroy()
      } else {
        if (this.size.depth > 1) {
          this.options.sourcesTypes.push('video')
        } else {
          this.options.sourcesTypes = ['video']
        }
        //this.createTexture()
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        this.videoFrameCallbackIds.push(
          (video as HTMLVideoElement).requestVideoFrameCallback(
            this.onVideoFrameCallback.bind(this, this.sources.length - 1)
          )
        )
      }

      this.sourceLoaded = this.size.depth === this.sources.length

      if (this.sourceLoaded && !this.options.useExternalTextures) {
        this.createTexture()
      }
    }
  }

  /**
   * Get whether the {@link source} is a video
   * @readonly
   */
  isVideoSource(sourceIndex): boolean {
    return (
      this.sources.length >= sourceIndex &&
      (this.options.sourcesTypes[sourceIndex] === 'video' || this.options.sourcesTypes[sourceIndex] === 'externalVideo')
    )
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

    if (this.size.depth > 1) {
      this.options.sources.push(video.src)
    } else {
      this.options.sources = [video.src]
    }

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

  /* RESIZE */

  /**
   * Resize our {@link Texture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update.
   * @param size - the optional new {@link TextureSize | size} to set.
   */
  resize(size: TextureSize | null = null) {
    if (!this.#autoResize) return

    if (!size) {
      size = {
        width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
        height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
        depth: 1,
      }
    }

    // no real resize, bail!
    if (size.width === this.size.width && size.height === this.size.height && size.depth === this.size.depth) {
      return
    }

    this.size = size
    this.createTexture()
  }

  /**
   * Destroy our {@link Texture}.
   */
  destroy() {
    this.renderer.removeTexture(this)

    // destroy the GPU texture only if it's not a copy of another texture
    if (!this.options.fromTexture) {
      this.texture?.destroy()
    }

    this.texture = null
  }
}
