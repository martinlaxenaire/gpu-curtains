import { Vec3 } from '../../math/Vec3'
import { isRenderer } from '../../utils/renderer-utils'
import { SamplerBindings } from '../bindings/SamplerBindings'
import { TextureBindings } from '../bindings/TextureBindings'
import { BufferBindings } from '../bindings/BufferBindings'
import { Object3D } from '../objects3D/Object3D'
import { Mat4 } from '../../math/Mat4'
import { throwWarning } from '../../utils/utils'

const defaultTextureParams = {
  name: 'texture',
  texture: {
    generateMips: false,
    flipY: false,
    format: 'rgba8unorm',
    placeholderColor: [0, 0, 0, 255], // default to black
    useExternalTextures: true,
  },
  sampler: {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
    maxAnisotropy: 1,
  },
  fromTexture: null,
}

export class Texture extends Object3D {
  #planeRatio = new Vec3(1)
  #textureRatio = new Vec3(1)
  #coverScale = new Vec3(1)
  #rotationMatrix = new Mat4()

  // callbacks / events
  _onSourceLoadedCallback = () => {
    /* allow empty callback */
  }
  _onSourceUploadedCallback = () => {
    /* allow empty callback */
  }

  constructor(renderer, parameters = defaultTextureParams) {
    super()

    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    isRenderer(renderer, parameters.label ? parameters.label + ' ' + this.type : this.type)

    this.renderer = renderer

    const defaultOptions = {
      ...defaultTextureParams,
      source: parameters.fromTexture ? parameters.fromTexture.options.source : null,
      sourceType: parameters.fromTexture ? parameters.fromTexture.options.sourceType : null,
    }

    this.options = { ...defaultOptions, ...parameters }
    // force merge of texture and sampler objects
    this.options.texture = { ...defaultOptions.texture, ...parameters.texture }
    this.options.sampler = { ...defaultOptions.sampler, ...parameters.sampler }

    this.options.label = this.options.label ?? this.options.name

    this.sampler = null
    this.texture = null
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
      uniforms: {
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
      new SamplerBindings({
        label: this.options.label + ': sampler',
        name: this.options.name,
        bindingType: 'sampler',
        resource: this.sampler,
      }),
      new TextureBindings({
        label: this.options.label + ': texture',
        name: this.options.name,
        resource: this.texture,
        bindingType: this.options.sourceType === 'externalVideo' ? 'externalTexture' : 'texture',
      }),
      this.textureMatrix,
    ]
  }

  get parent() {
    return this._parent
  }

  set parent(value) {
    this._parent = value
    this.resize()
  }

  get sourceLoaded() {
    return this._sourceLoaded
  }

  set sourceLoaded(value) {
    if (value && !this.sourceLoaded) {
      this._onSourceLoadedCallback && this._onSourceLoadedCallback()
    }
    this._sourceLoaded = value
  }

  get sourceUploaded() {
    return this._sourceUploaded
  }

  set sourceUploaded(value) {
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
    const parentScale = this.parent && this.parent.scale ? this.parent.scale : new Vec3(1, 1, 1)

    const parentWidth = this.parent ? this.parent.size.document.width * parentScale.x : this.size.width
    const parentHeight = this.parent ? this.parent.size.document.height * parentScale.y : this.size.height

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
    this.textureMatrix.shouldUpdateUniform(this.options.name + 'Matrix')
  }

  getNumMipLevels(...sizes) {
    const maxSize = Math.max(...sizes)
    return (1 + Math.log2(maxSize)) | 0
  }

  uploadTexture() {
    this.renderer.uploadTexture(this)
    this.shouldUpdate = false
  }

  uploadVideoTexture() {
    this.texture = this.renderer.importExternalTexture(this.source)
    this.shouldUpdateBindGroup = true
    this.shouldUpdate = false
    this.sourceUploaded = true
  }

  copy(texture) {
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
    this.options.sampler = texture.options.sampler

    this.sourceLoaded = texture.sourceLoaded
    this.sourceUploaded = texture.sourceUploaded

    if (texture.texture) {
      if (texture.sourceLoaded) {
        this.size = texture.size
        this.sampler = texture.sampler
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
    }

    if (this.options.sourceType !== 'externalVideo') {
      options.mipLevelCount = this.options.texture.generateMips
        ? this.getNumMipLevels(this.size.width, this.size.height)
        : 1

      if (this.texture) this.texture.destroy()

      this.texture = this.renderer.createTexture(options)

      this.shouldUpdateBindGroup = !!this.source
    }

    this.shouldUpdate = true
  }

  createSampler() {
    this.sampler = this.renderer.createSampler(this.options.sampler)
  }

  /** SOURCES **/

  setSourceSize() {
    this.size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
    }
  }

  async loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  async loadImage(source) {
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
      this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
    }
  }

  onVideoLoaded(video) {
    if (!this.sourceLoaded) {
      this.source = video

      this.setSourceSize()
      this.resize()

      if (this.options.texture.useExternalTextures) {
        this.options.sourceType = 'externalVideo'

        // reset texture bindings
        this.setBindings()
      } else {
        this.options.sourceType = 'video'
        this.createTexture()
      }

      if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
        this.videoFrameCallbackId = this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
      }

      this.sourceLoaded = true
    }
  }

  get isVideoSource() {
    return this.source && (this.options.sourceType === 'video' || this.options.sourceType === 'externalVideo')
  }

  loadVideo(source) {
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

  loadCanvas(source) {
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

  onSourceLoaded(callback) {
    if (callback) {
      this._onSourceLoadedCallback = callback
    }

    return this
  }

  onSourceUploaded(callback) {
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
    if (this.options.sourceType === 'externalVideo' || this.options.sourceType === 'canvas') {
      this.shouldUpdate = true
    }

    // if no videoFrameCallback check if the video is actually really playing
    if (
      this.isVideoSource &&
      !this.videoFrameCallbackId &&
      this.source.readyState >= this.source.HAVE_CURRENT_DATA &&
      !this.source.paused
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
      this.source.cancelVideoFrameCallback(this.videoFrameCallbackId)
    }

    if (this.isVideoSource) {
      this.source.removeEventListener('canplaythrough', this.onVideoLoaded, {
        once: true,
      })
    }

    this.texture?.destroy()
    this.texture = null
  }
}
