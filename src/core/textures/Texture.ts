import { Vec3 } from '../../math/Vec3'
import { isRenderer, Renderer } from '../../utils/renderer-utils'
import { TextureBindings, TextureBindingsParams } from '../bindings/TextureBindings'
import { BufferBindings } from '../bindings/BufferBindings'
import { Object3D } from '../objects3D/Object3D'
import { Mat4 } from '../../math/Mat4'
import { throwWarning } from '../../utils/utils'
import { BindGroupBindingElement } from '../../types/BindGroups'
import { TextureOptions, TextureParams, TextureParent, TextureSource } from '../../types/core/textures/Texture'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { DOMMeshType } from '../renderers/GPURenderer'

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

export class Texture extends Object3D {
  type: string
  renderer: Renderer

  texture: null | GPUTexture
  externalTexture: null | GPUExternalTexture

  source: TextureSource
  size: {
    width: number
    height: number
  }

  options: TextureOptions

  textureMatrix: BufferBindings
  bindings: Array<BindGroupBindingElement>

  _parent: TextureParent

  _sourceLoaded: boolean
  _sourceUploaded: boolean
  shouldUpdate: boolean
  shouldUpdateBindGroup: boolean

  videoFrameCallbackId: null | number

  #planeRatio: Vec3 = new Vec3(1)
  #textureRatio: Vec3 = new Vec3(1)
  #coverScale: Vec3 = new Vec3(1)
  #rotationMatrix: Mat4 = new Mat4()

  // callbacks / events
  _onSourceLoadedCallback = () => {
    /* allow empty callback */
  }
  _onSourceUploadedCallback = () => {
    /* allow empty callback */
  }

  constructor(renderer: Renderer | GPUCurtains, parameters = defaultTextureParams) {
    super()

    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && (renderer as GPUCurtains).renderer) || (renderer as Renderer)

    isRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

    this.renderer = renderer

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
          //value: new Mat4(),
          value: this.modelMatrix,
          onBeforeUpdate: () => this.updateTextureMatrix(),
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

  setBindings() {
    this.bindings = [
      new TextureBindings({
        label: this.options.label + ': texture',
        name: this.options.name,
        resource: this.options.sourceType === 'externalVideo' ? this.externalTexture : this.texture,
        bindingType: this.options.sourceType === 'externalVideo' ? 'externalTexture' : 'texture',
      } as TextureBindingsParams),
      this.textureMatrix,
    ]
  }

  get parent(): TextureParent {
    return this._parent
  }

  set parent(value: TextureParent) {
    this._parent = value
    this.resize()
  }

  get sourceLoaded(): boolean {
    return this._sourceLoaded
  }

  set sourceLoaded(value: boolean) {
    if (value && !this.sourceLoaded) {
      this._onSourceLoadedCallback && this._onSourceLoadedCallback()
    }
    this._sourceLoaded = value
  }

  get sourceUploaded(): boolean {
    return this._sourceUploaded
  }

  set sourceUploaded(value: boolean) {
    if (value && !this.sourceUploaded) {
      this._onSourceUploadedCallback && this._onSourceUploadedCallback()
    }
    this._sourceUploaded = value
  }

  setTransforms() {
    super.setTransforms()

    this.transforms.quaternion.setAxisOrder('ZXY')

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model.set(0.5, 0.5, 0)
  }

  applyPosition() {
    super.applyPosition()
    this.resize()
  }

  applyRotation() {
    super.applyRotation()
    this.resize()
  }

  applyScale() {
    super.applyScale()
    this.resize()
  }

  applyTransformOrigin() {
    super.applyTransformOrigin()
    this.resize()
  }

  /*** TEXTURE MATRIX ***/

  updateTextureMatrix() {
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
    // huge props to @grgrdvrt https://github.com/grgrdvrt for this solution!
    if (parentWidth > parentHeight) {
      this.#planeRatio.set(parentRatio, 1, 1)
      this.#textureRatio.set(1 / sourceRatio, 1, 1)
    } else {
      this.#planeRatio.set(1, 1 / parentRatio, 1)
      this.#textureRatio.set(1, sourceRatio, 1)
    }

    // cover ratio is a bit tricky!
    // TODO more tests!
    const coverRatio =
      parentRatio > sourceRatio !== parentWidth > parentHeight
        ? 1
        : parentWidth > parentHeight
        ? this.#planeRatio.x * this.#textureRatio.x
        : this.#textureRatio.y * this.#planeRatio.y

    this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1)

    this.#rotationMatrix.rotateFromQuaternion(this.quaternion)

    // here we could create a matrix for each translations / scales and do:
    // this.modelMatrix
    //   .identity()
    //   .premultiply(negativeOriginMatrix)
    //   .premultiply(coverScaleMatrix)
    //   .premultiply(planeRatioMatrix)
    //   .premultiply(rotationMatrix)
    //   .premultiply(textureRatioMatrix)
    //   .premultiply(originMatrix)
    //   .translate(this.position)

    // but this is faster!
    this.modelMatrix
      .identity()
      .premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1))
      .premultiplyScale(this.#coverScale)
      .premultiplyScale(this.#planeRatio)
      .premultiply(this.#rotationMatrix)
      .premultiplyScale(this.#textureRatio)
      .premultiplyTranslate(this.transformOrigin)
      .translate(this.position)
  }

  resize() {
    if (!this.textureMatrix) return

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

    this.textureMatrix.shouldUpdateBinding(this.options.name + 'Matrix')
  }

  getNumMipLevels(...sizes: number[]): number {
    const maxSize = Math.max(...sizes)
    return (1 + Math.log2(maxSize)) | 0
  }

  uploadTexture() {
    this.renderer.uploadTexture(this)
    this.shouldUpdate = false
  }

  uploadVideoTexture() {
    this.externalTexture = this.renderer.importExternalTexture(this.source as HTMLVideoElement)
    ;(this.bindings[0] as TextureBindings).resource = this.externalTexture
    this.shouldUpdateBindGroup = true
    this.shouldUpdate = false
    this.sourceUploaded = true
  }

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

    if (texture.texture) {
      if (texture.sourceLoaded) {
        this.size = texture.size
        this.source = texture.source
        //;(this.bindings[0] as TextureBindings).resource = (texture.bindings[0] as TextureBindings).resource

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

  createTexture() {
    const options = {
      label: this.options.label,
      format: this.options.texture.format,
      size: [this.size.width, this.size.height], // [1, 1]
      usage:
        GPUTextureUsage.TEXTURE_BINDING |
        GPUTextureUsage.COPY_SRC |
        GPUTextureUsage.COPY_DST |
        GPUTextureUsage.RENDER_ATTACHMENT,
    } as GPUTextureDescriptor

    if (this.options.sourceType !== 'externalVideo') {
      options.mipLevelCount = this.options.texture.generateMips
        ? this.getNumMipLevels(this.size.width, this.size.height)
        : 1

      this.texture?.destroy()

      this.texture = this.renderer.createTexture(options)

      // update texture binding
      ;(this.bindings[0] as TextureBindings).resource = this.texture

      this.shouldUpdateBindGroup = !!this.source
    }

    this.shouldUpdate = true
  }

  /** SOURCES **/

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

  async loadImageBitmap(url: string): Promise<ImageBitmap> {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

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
  onVideoFrameCallback() {
    if (this.videoFrameCallbackId) {
      this.shouldUpdate = true
      ;(this.source as HTMLVideoElement).requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
    }
  }

  onVideoLoaded(video: HTMLVideoElement) {
    if (!this.sourceLoaded) {
      this.source = video

      this.setSourceSize()
      this.resize()

      if (this.options.texture.useExternalTextures) {
        this.options.sourceType = 'externalVideo'

        console.log('destroy texture from external vid texture creation', this.texture)
        this.texture?.destroy()

        // reset texture bindings
        this.setBindings()
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

  get isVideoSource() {
    return this.source && (this.options.sourceType === 'video' || this.options.sourceType === 'externalVideo')
  }

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

  /** EVENTS **/

  onSourceLoaded(callback: () => void): Texture {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  onSourceUploaded(callback: () => void): Texture {
    if (callback) {
      this._onSourceUploadedCallback = callback
    }

    return this
  }

  /** RENDER **/

  render() {
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

  /** DESTROY **/

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

    this.texture?.destroy()

    this.texture = null
  }
}
