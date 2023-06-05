import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { Mat4 } from '../math/Mat4'
import { Quat } from '../math/Quat'
import { isRenderer } from '../utils/renderer-utils'
import { BindGroupSamplerBinding } from './bindGroupBindings/BindGroupSamplerBinding'
import { BindGroupTextureBinding } from './bindGroupBindings/BindGroupTextureBinding'
import { BindGroupBufferBindings } from './bindGroupBindings/BindGroupBufferBindings'

export class Texture {
  constructor(
    renderer,
    options = {
      label: 'Texture',
      name: 'texture',
      generateMips: false,
      flipY: false,
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    }
  ) {
    this.type = 'Texture'

    // we could pass our curtains object OR our curtains renderer object
    renderer = (renderer && renderer.renderer) || renderer

    if (!isRenderer(renderer, this.type)) {
      console.warn('Texture fail')
      return
    }

    this.renderer = renderer

    const defaultOptions = {
      label: '',
      name: '',
      generateMips: false,
      flipY: false,
      addressModeU: 'repeat',
      addressModeV: 'repeat',
      magFilter: 'linear',
      minFilter: 'linear',
      mipmapFilter: 'linear',
    }

    options = { ...defaultOptions, ...options }

    this.options = {
      label: options.label,
      name: options.name,
      sourceType: 'empty',
      texture: {
        generateMips: options.generateMips,
        flipY: options.flipY,
        placeholderColor: [0, 0, 0, 255], // default to black
      },
      sampler: {
        addressModeU: options.addressModeU,
        addressModeV: options.addressModeV,
        magFilter: options.magFilter,
        minFilter: options.minFilter,
        mipmapFilter: options.mipmapFilter,
      },
    }

    this.sampler = null
    this.texture = null
    this.source = null

    // sizes
    this.size = {
      width: 1,
      height: 1,
    }

    this.initTransforms()

    // we will always declare a texture matrix
    this.textureMatrix = new BindGroupBufferBindings({
      label: 'TextureMatrix',
      name: this.options.name + 'Matrix',
      useStruct: false,
      uniforms: {
        matrix: {
          name: this.options.name + 'Matrix',
          type: 'mat4x4f',
          value: new Mat4(),
          onBeforeUpdate: () => this.updateTextureMatrix(),
        },
      },
    })

    this.setBindings()

    this._parent = null

    this.sourceLoaded = false
    this.shouldUpdate = false
    this.shouldBindGroup = false

    // add texture to renderer so it can creates a placeholder texture ASAP
    this.renderer.addTexture(this)
  }

  setBindings() {
    this.bindings = [
      new BindGroupSamplerBinding({
        label: this.options.label + ': ' + this.options.name,
        name: this.options.name,
        bindingType: 'sampler',
        resource: this.sampler,
      }),
      new BindGroupTextureBinding({
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

  initTransforms() {
    this.transforms = {
      origin: new Vec3(0.5, 0.5, 0),
      scale: new Vec3(1),
      position: new Vec3(),
      quaternion: new Quat(),
      rotation: new Vec3(), // only along Z axis!
    }

    this.transformOrigin.onChange(() => this.resize())
    this.scale.onChange(() => this.resize())
    this.position.onChange(() => this.resize())
  }

  get transformOrigin() {
    return this.transforms.origin
  }

  set transformOrigin(value) {
    this.transforms.origin = value
    this.transforms.origin.z = 0
    this.resize()
  }

  get scale() {
    return this.transforms.scale
  }

  set scale(value) {
    this.transforms.scale = value
    this.applyScale()
  }

  applyScale() {
    this.transforms.scale.z = 1
    this.resize()
  }

  get position() {
    return this.transforms.position
  }

  set position(value) {
    this.transforms.position = value
    this.applyPosition()
  }

  applyPosition() {
    this.transforms.position.z = 0
    this.resize()
  }

  get quaternion() {
    return this.transforms.quaternion
  }

  set quaternion(value) {
    this.transforms.quaternion = value
  }

  // rotation along Z axis is inverted relatively to the planes
  get rotation() {
    return -this.transforms.rotation.z
  }

  set rotation(value) {
    this.transforms.rotation.z = -value
    this.applyRotation()
  }

  applyRotation() {
    this.transforms.rotation.x = 0
    this.transforms.rotation.y = 0
    this.quaternion.setFromVec3(this.transforms.rotation)
    this.resize()
  }

  /*** TEXTURE MATRIX ***/

  computeSize() {
    const scale = this.parent && this.parent.scale ? this.parent.scale.clone() : new Vec2(1, 1)

    const parentWidth = this.parent ? this.parent.size.document.width * scale.x : this.size.width
    const parentHeight = this.parent ? this.parent.size.document.height * scale.y : this.size.height

    const sourceWidth = this.size.width
    const sourceHeight = this.size.height

    const sourceRatio = sourceWidth / sourceHeight
    const parentRatio = parentWidth / parentHeight

    // center image in its container
    let xOffset = 0
    let yOffset = 0

    if (parentRatio > sourceRatio) {
      // means parent is larger
      yOffset = Math.min(0, parentHeight - parentWidth * (1 / sourceRatio))
    } else if (parentRatio < sourceRatio) {
      // means parent is taller
      xOffset = Math.min(0, parentWidth - parentHeight * sourceRatio)
    }

    return {
      parentWidth: parentWidth,
      parentHeight: parentHeight,
      sourceWidth: sourceWidth,
      sourceHeight: sourceHeight,
      xOffset: xOffset,
      yOffset: yOffset,
    }
  }

  updateTextureMatrix() {
    const sizes = this.computeSize()

    // calculate scale to apply to the matrix
    const textureScale = new Vec3(
      sizes.parentWidth / (sizes.parentWidth - sizes.xOffset),
      sizes.parentHeight / (sizes.parentHeight - sizes.yOffset),
      1
    )

    // apply texture scale
    textureScale.x /= this.scale.x
    textureScale.y /= this.scale.y

    // compose our texture transformation matrix with adapted scale
    this.textureMatrix.uniforms.matrix.value.composeFromOrigin(
      this.position,
      this.quaternion,
      textureScale,
      this.transformOrigin
    )
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
    this.shouldBindGroup = true
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

      this.shouldBindGroup = true
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

  async loadSource(source) {
    // this.options.source = source
    // this.source = await this.loadImageBitmap(this.options.source)
    //
    // this.size = {
    //   width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
    //   height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
    // }
    //
    // this.textureMatrix.shouldUpdateUniform(this.options.name + 'Matrix')
    //
    // this.sourceLoaded = true // TODO useful?
    // this.createTexture()
  }

  async loadImage(source) {
    this.options.source = source
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
