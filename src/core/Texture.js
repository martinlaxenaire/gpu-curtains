import { Vec3 } from '../math/Vec3'
import { isRenderer } from '../utils/renderer-utils'
import { SamplerBindings } from './bindings/SamplerBindings'
import { TextureBindings } from './bindings/TextureBindings'
import { BufferBindings } from './bindings/BufferBindings'
import { Object3D } from './objects3D/Object3D'
import { Mat4 } from '../math/Mat4'

const defaultTextureParams = {
  label: 'Texture',
  name: 'texture',
  texture: {
    generateMips: false,
    flipY: false,
    placeholderColor: [0, 0, 0, 255], // default to black
  },
  sampler: {
    addressModeU: 'repeat',
    addressModeV: 'repeat',
    magFilter: 'linear',
    minFilter: 'linear',
    mipmapFilter: 'linear',
  },
}

export class Texture extends Object3D {
  #planeRatio = new Vec3(1)
  #textureRatio = new Vec3(1)
  #coverScale = new Vec3(1)
  #rotationMatrix = new Mat4()

  constructor(renderer, parameters = defaultTextureParams) {
    super()

    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('Texture fail')
      return
    }

    this.renderer = renderer

    const defaultOptions = {
      ...defaultTextureParams,
      source: null,
      sourceType: null,
    }

    this.options = { ...defaultOptions, ...parameters }

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
      label: 'TextureMatrix',
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
    this.shouldUpdate = false
    this.shouldUpdateBindGroup = false

    // add texture to renderer so it can creates a placeholder texture ASAP
    this.renderer.addTexture(this)
  }

  setBindings() {
    this.bindings = [
      new SamplerBindings({
        label: this.options.label + ': ' + this.options.name,
        name: this.options.name,
        bindingType: 'sampler',
        resource: this.sampler,
      }),
      new TextureBindings({
        label: this.options.label + ': ' + this.options.name + ' sampler',
        name: this.options.name,
        resource: this.texture,
        bindingType: this.options.sourceType === 'video' ? 'externalTexture' : 'texture',
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

  async loadImageBitmap(url) {
    const res = await fetch(url)
    const blob = await res.blob()
    return await createImageBitmap(blob, { colorSpaceConversion: 'none' })
  }

  uploadTexture() {
    this.renderer.uploadTexture(this)
    this.shouldUpdate = false
  }

  uploadVideoTexture() {
    this.texture = this.renderer.importExternalTexture(this.source)
    this.shouldUpdateBindGroup = true
    //this.shouldUpdate = true
    this.shouldUpdate = false
  }

  createTexture() {
    if (!this.source) {
      this.texture = this.renderer.createTexture({
        format: 'rgba8unorm',
        size: [this.size.width, this.size.height], // [1, 1]
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
      })
    } else if (this.options.sourceType !== 'video') {
      // if we already have a texture, destroy it to free GPU memory
      if (this.texture) this.texture.destroy()

      this.texture = this.renderer.createTexture({
        format: 'rgba8unorm',
        mipLevelCount: this.options.texture.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1,
        size: [this.size.width, this.size.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
      })

      this.shouldUpdateBindGroup = true
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

  async loadImage(sourceUrl) {
    this.options.source = sourceUrl
    this.options.sourceType = 'image'

    this.source = await this.loadImageBitmap(this.options.source)

    this.setSourceSize()
    this.resize()

    this.sourceLoaded = true // TODO useful?
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
      this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
    }
  }

  async loadVideo(source) {
    this.options.source = source

    await source
      .play()
      .then(() => {
        this.options.sourceType = 'video'

        // reset texture bindings
        this.setBindings()

        this.source = source

        this.setSourceSize()
        this.resize()

        if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
          this.videoFrameCallbackId = this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this))
        }

        this.sourceLoaded = true // TODO useful?
      })
      .catch((e) => {
        console.log(e)
      })
  }

  loadCanvas(source) {
    this.options.source = source
    this.options.sourceType = 'canvas'

    //this.source = await this.loadImageBitmap(this.options.source)
    this.source = source

    this.setSourceSize()
    this.resize()

    this.sourceLoaded = true // TODO useful?
    this.createTexture()
  }

  destroy() {
    if (this.videoFrameCallbackId) {
      this.options.source.cancelVideoFrameCallback(this.videoFrameCallbackId)
    }

    this.texture?.destroy()
  }
}
