import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { Mat4 } from '../math/Mat4'
import { UniformBinding } from './UniformBinding'
import { Quat } from '../math/Quat'
import { generateMips } from '../utils/renderer-utils'

export class Texture {
  constructor(
    renderer,
    options = {
      label: 'Texture',
      name: 'texture',
      generateMips: false,
      flipY: true,
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

    if (!renderer || renderer.type !== 'Renderer') {
      return
    }

    this.renderer = renderer

    const defaultOptions = {
      label: '',
      name: '',
      generateMips: false,
      flipY: true,
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
      bindIndex: 0,
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
    this.textureMatrix = new UniformBinding({
      label: 'TextureMatrix',
      name: this.options.name + 'Matrix',
      groupIndex: 1, // TODO dirty?
      bindIndex: this.options.bindIndex + 2, // TODO dirty?
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

    this.uniformGroup = {
      groupIndex: 1,
      bindings: [
        {
          name: this.options.name + 'Sampler',
          groupIndex: 1,
          bindIndex: this.options.bindIndex + 0,
          resource: this.sampler,
          wgslGroupFragment: `var ${this.options.name}Sampler: sampler;`, // TODO
        },
        {
          name: this.options.name,
          groupIndex: 1,
          bindIndex: this.options.bindIndex + 1,
          resource: this.texture,
          wgslGroupFragment: `var ${this.options.name}: texture_2d<f32>;`, // TODO
        },
        this.textureMatrix,
      ],
    }

    this._parent = null

    this.sourceLoaded = false
    this.shouldUpdate = false
    this.shouldBindGroup = false

    // add texture to renderer so it can creates a placeholder texture ASAP
    this.renderer.addTexture(this)
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
    this.textureMatrix.uniforms.matrix.value = this.textureMatrix.uniforms.matrix.value.composeFromOrigin(
      this.position,
      this.quaternion,
      textureScale,
      this.transformOrigin
    )
  }

  resize() {
    if (!this.textureMatrix) return

    this.updateTextureMatrix()
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

  // TODO do it on the Renderer instead?
  uploadTexture(device) {
    if (this.source) {
      device.queue.copyExternalImageToTexture(
        { source: this.source, flipY: this.options.texture.flipY },
        { texture: this.texture },
        { width: this.size.width, height: this.size.height }
      )

      if (this.texture.mipLevelCount > 1) {
        generateMips(device)
      }
    } else {
      device.queue.writeTexture(
        { texture: this.texture },
        new Uint8Array(this.options.texture.placeholderColor),
        { bytesPerRow: 4 },
        { width: 1, height: 1 }
      )
    }

    this.shouldUpdate = false
  }

  createTexture() {
    const textureOptions = this.source
      ? {
          format: 'rgba8unorm',
          mipLevelCount: this.options.texture.generateMips
            ? this.getNumMipLevels(this.size.width, this.size.height)
            : 1,
          size: [this.size.width, this.size.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT,
        }
      : {
          format: 'rgba8unorm',
          size: [this.size.width, this.size.height],
          usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
        }

    this.texture = this.renderer.createTexture(textureOptions)

    this.shouldBindGroup = true
    this.shouldUpdate = true
  }

  createSampler() {
    this.sampler = this.renderer.createSampler(this.options.sampler)
  }

  async loadSource(source) {
    this.options.source = source
    this.source = await this.loadImageBitmap(this.options.source)

    this.size = {
      width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
      height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
    }

    this.textureMatrix.shouldUpdateUniform(this.options.name + 'Matrix')

    this.sourceLoaded = true // TODO useful?
    this.createTexture()
  }

  destroy() {
    this.texture?.destroy()
  }
}
