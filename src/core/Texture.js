import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { isRenderer } from '../utils/renderer-utils'
import { BindGroupSamplerBinding } from './bindGroupBindings/BindGroupSamplerBinding'
import { BindGroupTextureBinding } from './bindGroupBindings/BindGroupTextureBinding'
import { BindGroupBufferBindings } from './bindGroupBindings/BindGroupBufferBindings'
import { Object3D } from './objects3D/Object3D'

const textureScale = new Vec3()

export class Texture extends Object3D {
  constructor(
    renderer,
    options = {
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
  ) {
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
      label: '',
      name: '',
      source: null,
      sourceType: null,
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

    this.options = { ...defaultOptions, ...options }

    this.sampler = null
    this.texture = null
    this.source = null

    // sizes
    this.size = {
      width: 1,
      height: 1,
    }

    // we will always declare a texture matrix
    this.textureMatrix = new BindGroupBufferBindings({
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

  applyPosition() {
    super.applyPosition()

    this.transforms.position.z = 0
    this.resize()
  }

  applyRotation() {
    super.applyRotation()

    this.transforms.rotation.x = 0
    this.transforms.rotation.y = 0
    this.quaternion.setFromVec3(this.transforms.rotation)
    this.resize()
  }

  applyScale() {
    super.applyScale()

    this.transforms.scale.z = 1
    this.resize()
  }

  applyTransformOrigin() {
    super.applyTransformOrigin()

    this.transforms.origin.z = 0
    this.resize()
  }

  /*** TEXTURE MATRIX ***/

  computeScale() {
    const scale = this.parent && this.parent.scale ? this.parent.scale.clone() : new Vec2(1, 1)

    const parentWidth = this.parent ? this.parent.size.document.width * scale.x : this.size.width
    const parentHeight = this.parent ? this.parent.size.document.height * scale.y : this.size.height

    const parentRatio = parentWidth / parentHeight

    const sourceWidth = this.size.width
    const sourceHeight = this.size.height

    const sourceRatio = sourceWidth / sourceHeight

    const rotatedSourceWidth =
      Math.abs(sourceWidth * Math.cos(this.rotation.z)) + Math.abs(sourceHeight * Math.sin(this.rotation.z))
    const rotatedSourceHeight =
      Math.abs(sourceWidth * Math.sin(this.rotation.z)) + Math.abs(sourceHeight * Math.cos(this.rotation.z))

    const rotatedSourceRatio = rotatedSourceWidth / rotatedSourceHeight

    const rotationDiff = rotatedSourceRatio / sourceRatio
    const rotationRatio = (sourceWidth + sourceHeight) / (rotatedSourceWidth + rotatedSourceHeight)

    // center image in its container
    let xOffset = 0
    let yOffset = 0

    const rotationXRatio = sourceWidth / rotatedSourceWidth
    const rotationYRatio = sourceHeight / rotatedSourceHeight

    // const xAdjust = parentWidth - parentHeight * sourceRatio * rotationXRatio
    // const yAdjust = parentHeight - parentWidth * (1 / (sourceRatio * rotationYRatio))

    const xAdjust = parentWidth - parentHeight * sourceRatio * rotationRatio
    const yAdjust = parentHeight - parentWidth * (1 / (sourceRatio * rotationRatio))

    if (parentRatio > sourceRatio) {
      // means parent is larger
      yOffset = yAdjust
    } else {
      // means parent is taller
      xOffset = xAdjust
    }

    // xOffset -= Math.sin(this.rotation.z) * (parentHeight - parentWidth * (1 / sourceRatio))
    // yOffset -= Math.sin(this.rotation.z) * (parentWidth - parentHeight * sourceRatio)

    // if (parentRatio > rotatedSourceRatio) {
    //   // means parent is larger
    //   yOffset = Math.min(0, parentHeight - parentWidth * (1 / rotatedSourceRatio))
    // } else {
    //   // means parent is taller
    //   xOffset = Math.min(0, parentWidth - parentHeight * rotatedSourceRatio)
    // }

    //
    // if (parentRatio > rotatedSourceRatio) {
    //   // means parent is larger
    //   yOffset = Math.min(0, yAdjust + Math.abs(xAdjust * Math.sin(this.rotation.z)) * rotationDiff)
    //   xOffset = Math.abs(xAdjust * Math.sin(this.rotation.z)) * rotationDiff
    // } else {
    //   // means parent is taller
    //   xOffset = Math.min(0, xAdjust + Math.abs(yAdjust * Math.sin(this.rotation.z)) * (rotationDiff - 1))
    //   yOffset = Math.abs(yAdjust * Math.sin(this.rotation.z)) * (rotationDiff - 1)
    // }
    //
    // if (this.options.name === 'planeRotationTexture') {
    //   console.log(xOffset, yOffset, this.rotation.z)
    // }

    const scaleX = parentWidth / (parentWidth - xOffset)
    const scaleY = parentHeight / (parentHeight - yOffset)

    // if (this.options.name === 'planeRotationTexture') {
    //   console.log(scaleX, scaleY, this.rotation.z, sourceRatio, 1 / sourceRatio, parentRatio)
    // }

    // textureScale.set(
    //   scaleX * Math.cos(this.rotation.z) - scaleY * Math.sin(this.rotation.z),
    //   scaleX * Math.sin(this.rotation.z) + scaleY * Math.cos(this.rotation.z),
    //   0
    // )

    //textureScale.set(scaleX, scaleY, 0)

    const absCos = Math.abs(Math.cos(this.rotation.z))
    const absSin = Math.abs(Math.sin(this.rotation.z))

    textureScale.x = scaleX * absCos
    textureScale.y = scaleY * absCos

    textureScale.x += scaleY * absSin * parentRatio
    textureScale.y += scaleX * absSin * (1 / parentRatio)

    const angleDiff = Math.abs(Math.abs(Math.sin(this.rotation.z)) + Math.abs(Math.cos(this.rotation.z)))

    // textureScale.x *= rotationRatio
    // textureScale.y *= rotationRatio

    // textureScale.x += rotationRatio - 1
    // textureScale.y += rotationRatio - 1

    // if (this.rotation.z === -Math.PI / 4) {
    //   textureScale.x *= 0.707
    //   textureScale.y *= 0.707
    //
    //   // textureScale.x += absCos - 1
    //   // textureScale.y += absCos - 1
    //
    //   textureScale.x = 1
    //   textureScale.y = 1
    //
    //   console.log('-pi / 4!', rotationRatio, rotationRatio * rotationYRatio, rotationRatio * rotationXRatio)
    // }

    return textureScale
  }

  updateTextureMatrix() {
    const textureScale = this.computeScale()

    // apply texture scale
    textureScale.x /= this.scale.x
    textureScale.y /= this.scale.y

    // compose our texture transformation matrix with adapted scale
    this.modelMatrix.composeFromOrigin(this.position, this.quaternion, textureScale, this.transformOrigin)

    // this.modelMatrix.translate(this.transformOrigin)
    // this.modelMatrix.rotateFromQuaternion(this.quaternion)
    // this.modelMatrix.scale(textureScale)
    // //this.modelMatrix.translate(this.transformOrigin.clone().multiplyScalar(-1))
    // this.modelMatrix.translate(new Vec3(0 * this.transformOrigin.x, 0 * this.transformOrigin.y, 0))
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

  //async loadSource(source) {
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
  //}

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
