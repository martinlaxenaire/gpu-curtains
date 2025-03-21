import { isCurtainsRenderer, Renderer } from '../../core/renderers/utils'
import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer'
import { TextureBinding } from '../../core/bindings/TextureBinding'
import { BufferBinding } from '../../core/bindings/BufferBinding'
import { TextureSource } from '../../types/Textures'
import { GPUCurtains } from '../GPUCurtains'
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer'
import { MediaTexture, MediaTextureParams } from '../../core/textures/MediaTexture'
import { Vec2 } from '../../math/Vec2'
import { Mat3 } from '../../math/Mat3'
import { Texture } from '../../core/textures/Texture'

/** Parameters used to create a {@link DOMTexture}. */
export interface DOMTextureParams extends Omit<MediaTextureParams, 'useTransform' | 'viewDimension'> {}

/** @const - default {@link DOMTexture} parameters */
const defaultDOMTextureParams: DOMTextureParams = {
  name: 'texture',
  generateMips: false,
  flipY: false,
  format: 'rgba8unorm',
  premultipliedAlpha: false,
  placeholderColor: [0, 0, 0, 255], // default to black
  useExternalTextures: true,
  fromTexture: null,
  visibility: ['fragment'],
  cache: true,
}

/**
 * Used to create {@link GPUTexture} or {@link GPUExternalTexture}, specially made to handle different kinds of DOM elements {@link TextureSource | sources}, like {@link HTMLImageElement}, {@link HTMLVideoElement} or {@link HTMLCanvasElement}.
 *
 * Handles the various sources loading and uploading, GPU textures creation,{@link BufferBinding | texture model matrix binding} and {@link TextureBinding | GPU texture binding}.
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
 * // create a DOM texture
 * const imageTexture = new DOMTexture(gpuCurtains, {
 *   label: 'My image texture',
 *   name: 'imageTexture',
 * })
 *
 * // load an image
 * await imageTexture.loadImage(document.querySelector('img'))
 * ```
 */
export class DOMTexture extends MediaTexture {
  /** {@link GPUCurtainsRenderer} used by this {@link DOMTexture}. */
  renderer: GPUCurtainsRenderer

  /** {@link DOMProjectedMesh} mesh if any. */
  private _mesh: DOMProjectedMesh | null = null

  /**
   * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link mesh} {@link core/DOM/DOMElement.RectSize | size}.
   * @private
   */
  #parentRatio: Vec2 = new Vec2(1)
  /**
   * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link size | source size}.
   * @private
   */
  #sourceRatio: Vec2 = new Vec2(1)
  /**
   * {@link Vec2} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio.
   * @private
   */
  #coverScale: Vec2 = new Vec2(1)
  /**
   * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link transformOrigin}.
   * @private
   */
  #negatedOrigin: Vec2 = new Vec2()
  /**
   * Rotation {@link Mat3} based on texture {@link rotation}.
   * @private
   */
  #rotationMatrix: Mat3 = new Mat3()

  /**
   * DOMTexture constructor
   * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
   * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
   */
  constructor(renderer: GPUCurtainsRenderer | GPUCurtains, parameters = defaultDOMTextureParams) {
    renderer = isCurtainsRenderer(renderer, 'DOMTexture')

    super(renderer, { ...parameters, useTransform: true, viewDimension: '2d' })

    this.transformOrigin.set(0.5, 0.5)

    this.type = 'DOMTexture'

    this.renderer.addDOMTexture(this)
  }

  /**
   * Get our texture parent {@link mesh} if any.
   */
  get mesh(): DOMProjectedMesh | null {
    return this._mesh
  }

  /**
   * Set our texture parent {@link mesh}.
   * @param value - texture parent {@link mesh} to set.
   */
  set mesh(value: DOMProjectedMesh | null) {
    this._mesh = value
    this.resize()
  }

  /* TEXTURE MATRIX */

  /**
   * Update the {@link modelMatrix}.
   */
  updateModelMatrix() {
    if (!this.mesh) {
      super.updateModelMatrix()
      return
    }

    const parentScale = this.mesh.scale

    const parentWidth = this.mesh.boundingRect.width * parentScale.x
    const parentHeight = this.mesh.boundingRect.height * parentScale.y

    const parentRatio = parentWidth / parentHeight
    const sourceRatio = this.size.width / this.size.height

    if (parentWidth > parentHeight) {
      this.#parentRatio.set(parentRatio, 1)
      this.#sourceRatio.set(1 / sourceRatio, 1)
    } else {
      this.#parentRatio.set(1, 1 / parentRatio)
      this.#sourceRatio.set(1, sourceRatio)
    }

    // cover ratio is a bit tricky!
    const coverRatio =
      parentRatio > sourceRatio !== parentWidth > parentHeight
        ? 1
        : parentWidth > parentHeight
        ? this.#parentRatio.x * this.#sourceRatio.x
        : this.#sourceRatio.y * this.#parentRatio.y

    this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y))
    this.#negatedOrigin.copy(this.transformOrigin).multiplyScalar(-1)

    this.#rotationMatrix.rotateByAngleZ(this.rotation)

    // here we could create a matrix for each translations / scales and do:
    // this.modelMatrix
    //   .identity()
    //   .premultiply(negativeOriginMatrix)
    //   .premultiply(coverScaleMatrix)
    //   .premultiply(parentRatioMatrix)
    //   .premultiply(rotationMatrix)
    //   .premultiply(textureRatioMatrix)
    //   .premultiply(originMatrix)
    //   .translate(this.position)

    // but this is faster!
    this.modelMatrix
      .identity()
      .premultiplyTranslate(this.#negatedOrigin)
      .premultiplyScale(this.#coverScale)
      .premultiplyScale(this.#parentRatio)
      .premultiply(this.#rotationMatrix)
      .premultiplyScale(this.#sourceRatio)
      .premultiplyTranslate(this.transformOrigin)
      .translate(this.offset)

    this.transformBinding.inputs.matrix.shouldUpdate = true
  }

  /**
   * Set our source size and update the {@link modelMatrix}.
   */
  setSourceSize() {
    super.setSourceSize()
    this.updateModelMatrix()
  }

  /**
   * Resize our {@link DOMTexture}.
   */
  resize() {
    super.resize()

    this.updateModelMatrix()
  }

  /**
   * Get our unique source, since {@link DOMTexture} have a fixed '2d' view dimension.
   * @returns - Our unique source, i.e. first element of {@link sources} array if it exists.
   * @readonly
   */
  get source(): TextureSource {
    return this.sources.length ? this.sources[0].source : null
  }

  /**
   * Copy a {@link DOMTexture}.
   * @param texture - {@link DOMTexture} to copy.
   */
  copy(texture: Texture | MediaTexture | DOMTexture) {
    super.copy(texture)
    this.updateModelMatrix()
  }

  /* DESTROY */

  /**
   * Destroy the {@link DOMTexture}.
   */
  destroy() {
    this.renderer.removeDOMTexture(this)

    super.destroy()
  }
}
