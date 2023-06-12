import { Vec2 } from '../math/Vec2'
import { Vec3 } from '../math/Vec3'
import { isRenderer } from '../utils/renderer-utils'
import { BindGroupSamplerBinding } from './bindGroupBindings/BindGroupSamplerBinding'
import { BindGroupTextureBinding } from './bindGroupBindings/BindGroupTextureBinding'
import { BindGroupBufferBindings } from './bindGroupBindings/BindGroupBufferBindings'
import { Object3D } from './objects3D/Object3D'
import { Mat4 } from '../math/Mat4'
import { Quat } from '../math/Quat'

const textureScale = new Vec3()
const rotationMatrix = new Mat4()

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

  setTransforms() {
    super.setTransforms()

    this.transforms.quaternion.setAxisOrder('ZXY')

    // reset our model transform origin to reflect CSS transform origins
    this.transforms.origin.model = new Vec3(0.5, 0.5, 0)
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

    /**/

    // now the rotation
    const cos = Math.cos(this.rotation.z)
    const sin = Math.sin(this.rotation.z)
    const absCos = Math.abs(cos)
    const absSin = Math.abs(sin)

    const parentRotatedWidth = parentWidth * absCos + parentHeight * absSin
    const parentRotatedHeight = parentWidth * absSin + parentHeight * absCos

    const sourceRotatedWidth = sourceWidth * absCos + sourceHeight * absSin
    const sourceRotatedHeight = sourceWidth * absSin + sourceHeight * absCos

    const rotatedWidthRatio = parentRotatedWidth / parentWidth
    const rotatedHeightRatio = parentRotatedHeight / parentHeight

    // center image in its container
    let xOffset = 0
    let yOffset = 0

    if (parentRatio > sourceRatio) {
      // means parent is larger
      yOffset = parentHeight - parentWidth * (1 / sourceRatio)
    } else {
      // means parent is taller
      xOffset = parentWidth - parentHeight * sourceRatio
    }

    // now get initial scale
    const initialScale = {
      x: parentWidth / (parentWidth - xOffset),
      y: parentHeight / (parentHeight - yOffset),
    }

    // textureScale.x = absCos * initialScale.x * rotatedWidthRatio + absSin * initialScale.y * rotatedHeightRatio
    // textureScale.y = absSin * initialScale.x * rotatedWidthRatio + absCos * initialScale.y * rotatedHeightRatio

    // no
    textureScale.x = absCos * initialScale.x * rotatedWidthRatio + absSin * initialScale.y * rotatedHeightRatio
    textureScale.y = (absSin * initialScale.x) / rotatedHeightRatio + (absCos * initialScale.y) / rotatedWidthRatio

    // no
    textureScale.x = absCos * initialScale.x * rotatedWidthRatio + (absSin * initialScale.y) / rotatedWidthRatio
    textureScale.y = (absSin * initialScale.x) / rotatedHeightRatio + absCos * initialScale.y * rotatedHeightRatio

    // no
    textureScale.x = (absCos * initialScale.x) / rotatedHeightRatio + (absSin * initialScale.y) / rotatedWidthRatio
    textureScale.y = absSin * initialScale.x * rotatedWidthRatio + absCos * initialScale.y * rotatedHeightRatio

    const possibleRatios = [rotatedWidthRatio, 1 / rotatedWidthRatio, rotatedHeightRatio, 1 / rotatedHeightRatio]
    const possibleRatios2 = [parentWidth / parentRotatedWidth, parentRotatedHeight / parentHeight]
    const possibleRatiosHalf = [parentRotatedWidth / parentWidth, parentHeight / parentRotatedHeight]

    const possibleSourceRatios2 = [sourceWidth / sourceRotatedWidth, sourceRotatedHeight / sourceHeight]
    const possibleSourceRatiosHalf = [sourceRotatedWidth / sourceWidth, sourceHeight / sourceRotatedHeight]
    const possibleSourceRatios = [...possibleSourceRatios2, ...possibleSourceRatiosHalf]

    const r1 = Math.floor(Math.random() * 4)
    const r2 = Math.floor(Math.random() * 2)
    const r3 = Math.floor(Math.random() * 2)
    const r4 = Math.floor(Math.random() * 4)

    const cs1 = Math.floor(Math.random() * 2)
    const cs2 = Math.floor(Math.random() * 2)
    const cs3 = Math.floor(Math.random() * 2)
    const cs4 = Math.floor(Math.random() * 2)

    const f1 = Math.floor(Math.random() * 2)
    const f2 = Math.floor(Math.random() * 2)

    // correct values seems to be [1, 0, 1, 0]
    // textureScale.x = absCos * initialScale.x * possibleRatios[r1] + absSin * initialScale.y * possibleRatios2[r2]
    // textureScale.y = absSin * initialScale.x * possibleRatiosHalf[r3] + absCos * initialScale.y * possibleRatios[r4]

    // textureScale.x =
    //   absCos * initialScale.x * possibleSourceRatios[r1] + absSin * initialScale.y * possibleSourceRatiosHalf[r2]
    // textureScale.y =
    //   absSin * initialScale.x * possibleSourceRatios2[r3] + absCos * initialScale.y * possibleSourceRatios[r4]
    //
    // textureScale.x = absCos * initialScale.x * 0.5 + absSin * initialScale.y * possibleSourceRatiosHalf[r2] // 0.75
    // textureScale.y = absSin * initialScale.x * 2 + absCos * initialScale.y * possibleSourceRatios[r4] // 1.5

    // textureScale.x =
    //   absCos * initialScale.x * possibleSourceRatiosHalf[r1] + absSin * initialScale.y * possibleSourceRatiosHalf[r2]
    // textureScale.y =
    //   absSin * initialScale.x * possibleSourceRatios2[r3] + absCos * initialScale.y * possibleSourceRatios2[r4]

    // textureScale.x =
    //   absCos * initialScale.x * possibleFixedRatios[f1] + absSin * initialScale.y * possibleFixedRatios[0]
    // textureScale.y =
    //   absSin * initialScale.x * possibleFixedRatios[1] + absCos * initialScale.y * possibleFixedRatios[f2]

    // textureScale.x = absCos * initialScale.x * 0.5 + absSin * initialScale.y * possibleFixedRatios[0]
    // textureScale.y = absSin * initialScale.x * possibleFixedRatios[1] + absCos * initialScale.y * 2

    // textureScale.x =
    //   (cos * (initialScale.x - 1) + 1) * possibleRatios[r1] - (sin * (initialScale.y - 1) + 1) * possibleRatios2[r2]
    // textureScale.y =
    //   (sin * (initialScale.x - 1) + 1) * possibleRatiosHalf[r3] + (cos * (initialScale.y - 1) + 1) * possibleRatios[r4]

    if (sourceWidth !== 1 && this.options.name === 'planeRotationTexture') {
      // const r1 = Math.floor(Math.random() * 4)
      // const r2 = Math.floor(Math.random() * 4)
      // const r3 = Math.floor(Math.random() * 4)
      // const r4 = Math.floor(Math.random() * 4)
      // textureScale.x =
      //   absCos * initialScale.x * possibleRatios[r1] * cs1 + absSin * initialScale.y * possibleRatios2[r2] * cs2
      // textureScale.y =
      //   absSin * initialScale.x * possibleRatios[r3] * cs3 + absCos * initialScale.y * possibleRatiosHalf[r4] * cs4
      // textureScale.x =
      //   (absCos * (initialScale.x - 1) + 1) * possibleRatios[r1] +
      //   (absSin * (initialScale.y - 1) + 1) * possibleRatios2[r2]
      // textureScale.y =
      //   (absSin * (initialScale.x - 1) + 1) * possibleRatios[r3] +
      //   (absCos * (initialScale.y - 1) + 1) * possibleRatiosHalf[r4]
      //console.log(f1, f2, textureScale)
      //console.log(r1, r2, r3, r4)
      // console.log(r1, r2, r3, r4, cs1, cs2, cs3, cs4)
      //   console.log(
      //     'rotation',
      //     this.rotation.z,
      //     'absCos',
      //     absCos,
      //     'absSin',
      //     absSin,
      //     'rotatedWidthRatio',
      //     rotatedWidthRatio,
      //     'rotatedHeightRatio',
      //     rotatedHeightRatio,
      //     'initialScale',
      //     initialScale,
      //     'textureScale',
      //     textureScale
      //   )
    }

    // textureScale.x *= absCos + absSin
    // textureScale.y /= absCos + absSin

    textureScale.x = initialScale.x
    textureScale.y = initialScale.y
    //
    // textureScale.x = initialScale.x * absCos + initialScale.y * absSin
    // textureScale.y = initialScale.y * absCos + initialScale.x * absSin

    textureScale.x = ((initialScale.x - 1) * cos - (initialScale.y - 1) * sin + 1) * 0.75
    textureScale.y = ((initialScale.y - 1) * cos + (initialScale.x - 1) * sin + 1) * 1.5

    /**/

    /*


    const rotatedSourceWidth =
      Math.abs(sourceWidth * Math.cos(this.rotation.z)) + Math.abs(sourceHeight * Math.sin(this.rotation.z))
    const rotatedSourceHeight =
      Math.abs(sourceWidth * Math.sin(this.rotation.z)) + Math.abs(sourceHeight * Math.cos(this.rotation.z))

    const rotatedSourceRatio = rotatedSourceWidth / rotatedSourceHeight

    const rotationDiff = rotatedSourceRatio / sourceRatio
    const rotationRatio = (sourceWidth + sourceHeight) / (rotatedSourceWidth + rotatedSourceHeight)
    const rotationRatio2 = (sourceWidth * sourceHeight) / (rotatedSourceWidth * rotatedSourceHeight)

    const rotationXRatio = sourceWidth / rotatedSourceWidth
    const rotationYRatio = sourceHeight / rotatedSourceHeight

    // const xAdjust = parentWidth - parentHeight * sourceRatio * rotationXRatio
    // const yAdjust = parentHeight - parentWidth * (1 / (sourceRatio * rotationYRatio))

    // const xAdjust = parentWidth - parentHeight * sourceRatio * rotationRatio
    // const yAdjust = parentHeight - parentWidth * (1 / (sourceRatio * rotationRatio))
    const xAdjust = parentWidth - parentHeight * sourceRatio
    const yAdjust = parentHeight - parentWidth * (1 / sourceRatio)

    if (parentRatio > sourceRatio) {
      // means parent is larger
      yOffset = yAdjust
    } else {
      // means parent is taller
      xOffset = xAdjust
    }

    // yOffset = yAdjust
    // xOffset = xAdjust



    // const newResolution =
    //   parentRatio < rotatedSourceRatio
    //     ? {
    //         x: (absCos * (rotatedSourceWidth * parentHeight)) / rotatedSourceHeight + absSin * parentHeight,
    //         y: absCos * parentHeight + (absSin * (rotatedSourceWidth * parentHeight)) / rotatedSourceHeight,
    //       }
    //     : {
    //         x: absCos * parentWidth + (absSin * (rotatedSourceHeight * parentWidth)) / rotatedSourceWidth,
    //         y: (absCos * (rotatedSourceHeight * parentWidth)) / rotatedSourceWidth + absSin * parentWidth,
    //       }
    //
    // const scaleAdjust =
    //   parentRatio < rotatedSourceRatio
    //     ? {
    //         x: parentWidth - newResolution.x,
    //         y: 0,
    //       }
    //     : {
    //         x: 0,
    //         y: parentHeight - newResolution.y,
    //       }

    // scaleAdjust.x /= newResolution.x
    // scaleAdjust.y /= newResolution.y

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

    // xOffset = absCos * xOffset + absSin * yOffset
    // yOffset = absCos * yOffset + absSin * xOffset

    const scaleX = parentWidth / (parentWidth - xOffset)
    const scaleY = parentHeight / (parentHeight - yOffset)

    // const scaleX = parentWidth / (parentWidth - scaleAdjust.x)
    // const scaleY = parentHeight / (parentHeight - scaleAdjust.y)

    // scaleAdjust.x =
    //   parentWidth / (parentWidth - scaleAdjust.x * absCos) + parentHeight / (parentHeight - scaleAdjust.y * absSin)
    // scaleAdjust.y =
    //   parentHeight / (parentHeight - scaleAdjust.y * absCos) + parentWidth / (parentWidth - scaleAdjust.x * absSin)

    // if (this.options.name === 'planeRotationTexture') {
    //   console.log(scaleX, scaleY, this.rotation.z, sourceRatio, 1 / sourceRatio, parentRatio)
    // }

    // textureScale.set(
    //   scaleX * Math.cos(this.rotation.z) - scaleY * Math.sin(this.rotation.z),
    //   scaleX * Math.sin(this.rotation.z) + scaleY * Math.cos(this.rotation.z),
    //   0
    // )

    //textureScale.set(scaleX, scaleY, 0)

    textureScale.x = scaleX
    textureScale.y = scaleY

    // apply scale based on rotation cos
    textureScale.x = scaleX * absCos
    textureScale.y = scaleY * absCos

    // textureScale.x = scaleX * Math.cos(this.rotation.z)
    // textureScale.y = scaleY * Math.cos(this.rotation.z)

    // now adjust based on rotation sin
    textureScale.x += scaleY * absSin * parentRatio
    textureScale.y += scaleX * absSin * (1 / parentRatio)

    // textureScale.x += scaleY * rotationXRatio
    // textureScale.y += scaleX * rotationYRatio

    // textureScale.x -= scaleY * Math.sin(this.rotation.z) * parentRatio
    // textureScale.y += scaleX * Math.sin(this.rotation.z) * (1 / parentRatio)

    // textureScale.x -= (1 - sourceWidth / rotatedSourceWidth) * absCos
    // textureScale.y -= (1 - rotationRatio) * absCos

    // textureScale.x -= (rotationRatio - 1) * absCos + (1 - rotationRatio) * absSin
    // textureScale.y -= (1 - rotationRatio) * absCos + (rotationRatio - 1) * absSin

    // textureScale.x += (1 - rotationRatio2) * 0.5
    // textureScale.y += (1 - rotationRatio2) * 0.5

    // textureScale.x += (rotationRatio - 1) * 0.75 * absCos
    // textureScale.y += (rotationRatio - 1) * 0.15 * absSin

    //textureScale.y += (rotationRatio - 1) * 0.15 * absSin

    // textureScale.x /= absCos + absSin
    // textureScale.y /= absCos + absSin

    //textureScale.x -= absCos * 0.15 + absSin * 0.15

    // textureScale.x += (1 - rotationRatio) / rotationXRatio + (rotationRatio - 1) / rotationYRatio
    // textureScale.y += (1 - rotationRatio) / rotationYRatio + (rotationRatio - 1) / rotationXRatio

    // textureScale.x -= (1 - rotationRatio) * rotationXRatio
    // textureScale.y -= (1 - rotationRatio) * rotationYRatio

    if (this.rotation.z === -Math.PI / 4 && sourceWidth !== 1) {
      console.log('scaleX', textureScale.x, textureScale.y, sourceRatio * absCos)

      textureScale.x = absCos * Math.hypot(1, 1)
      textureScale.y = (absSin * Math.hypot(1, 1)) / sourceRatio

      // textureScale.x -= test
      // textureScale.y -= test * 0.375
      // textureScale.x *= 0.8
      // textureScale.y *= 0.7
    }

    if (this.rotation.z === -Math.PI / 2 && sourceWidth !== 1) {
      console.log(textureScale)
    }

    // textureScale.x = scaleX
    // textureScale.y = scaleY

    // textureScale.x += ((1 - rotationRatio) * sourceWidth) / rotatedSourceWidth
    // textureScale.y += ((1 - rotationRatio) * sourceHeight) / rotatedSourceHeight

    // textureScale.x -= ((1 - rotationRatio) * sourceWidth) / rotatedSourceWidth
    // textureScale.y -= ((1 - rotationRatio) * sourceHeight) / rotatedSourceHeight

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

    
     */

    return textureScale
  }

  updateTextureMatrix() {
    const textureScale = this.computeScale()

    // const p = new Vec3()
    // const r = new Vec3()
    // const center = new Vec3(0.5, 0.5, 0)
    // p.x = textureScale.x - center.x
    // p.y = textureScale.y - center.y
    // p.z = textureScale.z - center.z
    // //perform rotation
    // r.x = p.x * Math.cos(this.rotation.z) - p.y * Math.sin(this.rotation.z)
    // r.y = p.x * Math.sin(this.rotation.z) + p.y * Math.cos(this.rotation.z)
    // r.z = p.z
    // //translate to correct position
    // textureScale.x = r.x + center.x
    // textureScale.y = r.y + center.y
    // textureScale.z = r.z + center.z

    // apply texture scale
    textureScale.x /= this.scale.x
    textureScale.y /= this.scale.y

    // compose our texture transformation matrix with adapted scale
    //this.modelMatrix.composeFromOrigin(this.position, this.quaternion, textureScale, this.transformOrigin)

    const testMatrix = new Mat4().composeFromOrigin(this.position, this.quaternion, textureScale, this.transformOrigin)

    rotationMatrix.setFromQuaternion(this.quaternion)

    // rotate before scale?
    // https://github.com/mrdoob/three.js/blob/master/examples/webgl_materials_texture_rotation.html#LL132C20-L132C20
    this.modelMatrix
      .identity()
      .translate(this.transformOrigin)
      .scale(textureScale)
      .multiply(rotationMatrix)
      .translate(this.transformOrigin.clone().multiplyScalar(-1))
      .translate(this.position)

    if (this.size.width !== 1 && this.rotation.z === -Math.PI / 2) {
      console.log(textureScale, this.modelMatrix.elements, testMatrix.elements)
    }
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
