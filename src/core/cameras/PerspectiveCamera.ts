import { Mat4 } from '../../math/Mat4'
import { RectSize } from '../DOM/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { Camera, CameraBaseOptions, CameraOptions, CameraParams } from './Camera'

/**
 * Defines {@link PerspectiveCamera} basic perspective options.
 */
export interface PerspectiveCameraBaseOptions extends CameraBaseOptions {
  /** {@link PerspectiveCamera} field of view, in degress. Should be greater than 0 and lower than 180. */
  fov?: number
}

/**
 * Defines all {@link PerspectiveCamera} options.
 */
export interface PerspectiveCameraOptions extends CameraOptions, PerspectiveCameraBaseOptions {
  /** {@link PerspectiveCamera} frustum width. */
  width?: number
  /** {@link PerspectiveCamera} frustum height. */
  height?: number
  /** Allow to force the {@link PerspectiveCamera} aspect ratio to a defined value. Default to `false`. */
  forceAspect?: number | false
}

/**
 * An object defining all possible {@link PerspectiveCamera} class instancing parameters.
 */
export interface PerspectiveCameraParams extends CameraParams, PerspectiveCameraOptions {}

/**
 * Used to create a {@link PerspectiveCamera} and its projection, model and view matrices.
 *
 * {@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} and {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} automatically create their own {@link PerspectiveCamera} under the hood, so it is unlikely you'd have to create one by yourself.
 *
 * {@link PerspectiveCamera} default perspective settings are:
 * - {@link PerspectiveCamera#fov | field of view}: 50
 * - {@link PerspectiveCamera#near | near plane}: 0.01
 * - {@link PerspectiveCamera#far | far plane}: 150
 *
 * Also note that the {@link PerspectiveCamera} default {@link PerspectiveCamera#position | position} is set at `(0, 0, 10)` so the object created with a default size do not appear too big nor too small.
 */
export class PerspectiveCamera extends Camera {
  /** @ignore */
  #fov: number
  /** Eventual aspect ratio of the {@link PerspectiveCamera} to use. */
  forceAspect: number | false

  /** The {@link PerspectiveCamera} frustum width and height. */
  size: RectSize

  /**
   * PerspectiveCamera constructor
   * @param parameters - {@link PerspectiveCameraParams} used to create our {@link PerspectiveCamera}.
   */
  constructor(
    {
      fov = 50,
      near = 0.1,
      far = 150,
      width = 1,
      height = 1,
      pixelRatio = 1,
      forceAspect = false,
      onMatricesChanged = () => {
        /* allow empty callback */
      },
    } = {} as PerspectiveCameraParams
  ) {
    super({ near, far, pixelRatio, onMatricesChanged })

    this.forceAspect = forceAspect

    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 10 so objects of default size (1, 1, 1) don't appear too big
    this.position.set(0, 0, 10)

    // create size object, will be set right after
    this.size = {
      width: 1,
      height: 1,
    }

    this.setPerspective({ fov, near, far, width, height, pixelRatio })
  }

  /**
   * Get the {@link PerspectiveCamera.fov | field of view}.
   */
  get fov(): number {
    return this.#fov
  }

  /**
   * Set the {@link PerspectiveCamera.fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed.
   * @param fov - New field of view.
   */
  set fov(fov: number) {
    // clamp between 1 and 179
    fov = Math.max(1, Math.min(fov ?? this.fov, 179))

    if (fov !== this.fov) {
      this.#fov = fov
      this.shouldUpdateProjectionMatrices()
    }

    this.setVisibleSize()
    this.setCSSPerspective()
  }

  /**
   * Set the {@link PerspectiveCamera} {@link RectSize.width | width} and {@link RectSize.height | height}. Update the {@link projectionMatrix} only if the width or height actually changed.
   * @param size - New width and height values to use.
   */
  setSize({ width, height }: RectSize) {
    if (width !== this.size.width || height !== this.size.height) {
      this.shouldUpdateProjectionMatrices()
    }

    this.size.width = width
    this.size.height = height

    this.setVisibleSize()
    this.setCSSPerspective()
  }

  /**
   * Sets the {@link PerspectiveCamera} perspective projection settings. Update the {@link projectionMatrix} if needed.
   * @param parameters - {@link PerspectiveCameraOptions} to use for the perspective projection.
   */
  setPerspective({
    fov = this.fov,
    near = this.near,
    far = this.far,
    width = this.size.width,
    height = this.size.height,
    pixelRatio = this.pixelRatio,
  }: PerspectiveCameraOptions = {}) {
    this.setSize({ width, height })
    this.pixelRatio = pixelRatio
    this.fov = fov
    this.near = near
    this.far = far
  }

  /**
   * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.
   *
   * Used to translate planes along the Z axis using pixel units as CSS would do.
   *
   * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
   */
  setCSSPerspective() {
    this.CSSPerspective =
      Math.pow(
        Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan((this.fov * 0.5 * Math.PI) / 180)
  }

  /**
   * Get visible width / height at a given z-depth from our {@link PerspectiveCamera} parameters.
   *
   * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}.
   * @param depth - Depth to use for calculations.
   * @returns - Visible width and height at given depth.
   */
  getVisibleSizeAtDepth(depth = 0): RectSize {
    // compensate for cameras not positioned at z=0
    const cameraOffset = this.position.z
    if (depth < cameraOffset) {
      depth -= cameraOffset
    } else {
      depth += cameraOffset
    }

    // vertical fov in radians
    const vFOV = (this.fov * Math.PI) / 180

    // Math.abs to ensure the result is always positive
    const height = 2 * Math.tan(vFOV / 2) * Math.abs(depth)

    return {
      width: (height * this.size.width) / this.size.height,
      height,
    }
  }

  /**
   * Updates the {@link PerspectiveCamera} {@link projectionMatrix}.
   */
  updateProjectionMatrix() {
    this.projectionMatrix.makePerspective({
      fov: this.fov,
      aspect: this.size.width / this.size.height,
      near: this.near,
      far: this.far,
    })
  }

  /**
   * Get the current {@link PerspectiveCamera} frustum planes in the [left, right, top, bottom, near, far] order, based on its {@link projectionMatrix} and {@link viewMatrix}.
   * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
   * @readonly
   */
  get frustumPlanes(): Array<Float32Array> {
    const tempCamMat4 = new Mat4()
    const tempCamVec3 = new Vec3()

    tempCamMat4.copy(this.projectionMatrix).multiply(this.viewMatrix)
    const { elements } = tempCamMat4

    const frustumPlanes = [
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
    ]

    // Left clipping plane
    tempCamVec3.set(elements[3] + elements[0], elements[7] + elements[4], elements[11] + elements[8])
    let l = tempCamVec3.length()
    frustumPlanes[0][0] = tempCamVec3.x / l
    frustumPlanes[0][1] = tempCamVec3.y / l
    frustumPlanes[0][2] = tempCamVec3.z / l
    frustumPlanes[0][3] = (elements[15] + elements[12]) / l

    // Right clipping plane
    tempCamVec3.set(elements[3] - elements[0], elements[7] - elements[4], elements[11] - elements[8])
    l = tempCamVec3.length()
    frustumPlanes[1][0] = tempCamVec3.x / l
    frustumPlanes[1][1] = tempCamVec3.y / l
    frustumPlanes[1][2] = tempCamVec3.z / l
    frustumPlanes[1][3] = (elements[15] - elements[12]) / l

    // Top clipping plane
    tempCamVec3.set(elements[3] - elements[1], elements[7] - elements[5], elements[11] - elements[9])
    l = tempCamVec3.length()
    frustumPlanes[2][0] = tempCamVec3.x / l
    frustumPlanes[2][1] = tempCamVec3.y / l
    frustumPlanes[2][2] = tempCamVec3.z / l
    frustumPlanes[2][3] = (elements[15] - elements[13]) / l

    // Bottom clipping plane
    tempCamVec3.set(elements[3] + elements[1], elements[7] + elements[5], elements[11] + elements[9])
    l = tempCamVec3.length()
    frustumPlanes[3][0] = tempCamVec3.x / l
    frustumPlanes[3][1] = tempCamVec3.y / l
    frustumPlanes[3][2] = tempCamVec3.z / l
    frustumPlanes[3][3] = (elements[15] + elements[13]) / l

    // Near clipping plane
    tempCamVec3.set(elements[2], elements[6], elements[10])
    l = tempCamVec3.length()
    frustumPlanes[4][0] = tempCamVec3.x / l
    frustumPlanes[4][1] = tempCamVec3.y / l
    frustumPlanes[4][2] = tempCamVec3.z / l
    frustumPlanes[4][3] = elements[14] / l

    // Far clipping plane
    tempCamVec3.set(elements[3] - elements[2], elements[7] - elements[6], elements[11] - elements[10])
    l = tempCamVec3.length()
    frustumPlanes[5][0] = tempCamVec3.x / l
    frustumPlanes[5][1] = tempCamVec3.y / l
    frustumPlanes[5][2] = tempCamVec3.z / l
    frustumPlanes[5][3] = (elements[15] - elements[14]) / l

    return frustumPlanes
  }
}
