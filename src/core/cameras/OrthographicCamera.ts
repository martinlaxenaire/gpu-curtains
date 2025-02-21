import { Camera, CameraBaseOptions, CameraOptions, CameraParams } from './Camera'
import { RectCoords, RectSize } from '../DOM/DOMElement'
import { Mat4 } from '../../math/Mat4'
import { Vec3 } from '../../math/Vec3'

/**
 * Defines {@link OrthographicCamera} basic perspective options.
 */
export interface OrthographicCameraBaseOptions extends CameraBaseOptions {
  /** Left side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `-1`. */
  left?: number
  /** Right side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `1`. */
  right?: number
  /** Bottom side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `-1`. */
  bottom?: number
  /** Top side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `1`. */
  top?: number
}

/**
 * Defines all {@link OrthographicCamera} options.
 */
export interface OrthographicCameraOptions extends CameraOptions, OrthographicCameraBaseOptions {}

/**
 * An object defining all possible {@link OrthographicCamera} class instancing parameters.
 */
export interface OrthographicCameraParams extends CameraParams, OrthographicCameraOptions {}

export class OrthographicCamera extends Camera {
  /** @ignore */
  #left: number
  /** @ignore */
  #right: number
  /** @ignore */
  #top: number
  /** @ignore */
  #bottom: number

  /**
   * OrthographicCamera constructor
   * @param parameters - {@link OrthographicCameraParams} used to create our {@link OrthographicCamera}.
   */
  constructor(
    {
      near = 0.1,
      far = 150,
      left = -1,
      right = 1,
      top = 1,
      bottom = -1,
      pixelRatio = 1,
      onMatricesChanged = () => {
        /* allow empty callback */
      },
    } = {} as OrthographicCameraParams
  ) {
    super({ near, far, pixelRatio, onMatricesChanged })

    // whatever
    this.position.set(0, 0, 10)

    this.setOrthographic({ near, far, left, right, top, bottom, pixelRatio })
  }

  /**
   * Get the {@link OrthographicCamera.left | left} frustum plane value.
   */
  get left(): number {
    return this.#left
  }

  /**
   * Set the {@link OrthographicCamera.left | left} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param left - New left frustum plane value.
   */
  set left(left: number) {
    if (left !== this.left) {
      this.#left = left
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link OrthographicCamera.right | right} frustum plane value.
   */
  get right(): number {
    return this.#right
  }

  /**
   * Set the {@link OrthographicCamera.right | right} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param right - New right frustum plane value.
   */
  set right(right: number) {
    if (right !== this.right) {
      this.#right = right
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link OrthographicCamera.top | top} frustum plane value.
   */
  get top(): number {
    return this.#top
  }

  /**
   * Set the {@link OrthographicCamera.top | top} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param top - New top frustum plane value.
   */
  set top(top: number) {
    if (top !== this.top) {
      this.#top = top
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link OrthographicCamera.bottom | bottom} frustum plane value.
   */
  get bottom(): number {
    return this.#bottom
  }

  /**
   * Set the {@link OrthographicCamera.bottom | bottom} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param bottom - New bottom frustum plane value.
   */
  set bottom(bottom: number) {
    if (bottom !== this.bottom) {
      this.#bottom = bottom
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Sets the {@link OrthographicCamera} orthographic projection settings. Update the {@link projectionMatrix} if needed.
   * @param parameters - {@link OrthographicCameraOptions} to use for the orthographic projection.
   */
  setOrthographic({
    near = this.near,
    far = this.far,
    left = this.left,
    right = this.right,
    top = this.top,
    bottom = this.bottom,
    pixelRatio = this.pixelRatio,
  }: OrthographicCameraOptions) {
    this.left = left
    this.right = right
    this.top = top
    this.bottom = bottom
    this.pixelRatio = pixelRatio
    this.near = near
    this.far = far
  }

  /**
   * Get visible width / height at a given z-depth from our {@link OrthographicCamera} parameters.
   * @param depth - Depth to use for calculations - unused since width and height does not change according to depth in orthographic projection.
   * @returns - Visible width and height.
   */
  getVisibleSizeAtDepth(depth = 0): RectSize {
    return {
      width: this.right - this.left,
      height: this.top - this.bottom,
    }
  }

  /**
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth()
  }

  /**
   * Updates the {@link OrthographicCamera} {@link projectionMatrix}.
   */
  updateProjectionMatrix() {
    this.projectionMatrix.makeOrthographic({
      left: this.left,
      right: this.right,
      top: this.top,
      bottom: this.bottom,
      near: this.near,
      far: this.far,
    })
  }

  /**
   * Get the current {@link OrthographicCamera} frustum planes in the [left, right, top, bottom, near, far] order.
   * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
   * @readonly
   */
  get frustumPlanes(): Array<Float32Array> {
    return [
      new Float32Array([1, 0, 0, -this.right]), // Left
      new Float32Array([-1, 0, 0, this.left]), // Right
      new Float32Array([0, 1, 0, -this.top]), // Bottom
      new Float32Array([0, -1, 0, this.bottom]), // Top
      new Float32Array([0, 0, 1, -this.near]), // Near
      new Float32Array([0, 0, -1, this.far]), // Far
    ]
  }
}
