import { Vec3 } from '../../math/Vec3'
import { Mat4 } from '../../math/Mat4'

export interface CameraBasePerspectiveOptions {
  fov?: number
  near?: number
  far?: number
}

export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
  width?: number
  height?: number
  pixelRatio?: number
}

export interface CameraParams extends CameraPerspectiveOptions {
  onPerspectiveChanged?: () => void
  onPositionChanged?: () => void
}

/**
 * Camera class:
 * Used to create a perspective camera and its matricess (projection, model, view).
 */
export class Camera {
  /**
   * The {@link Camera} position
   * @type {Vec3}
   */
  position: Vec3
  /**
   * The {@link Camera} projection matrix
   * @type {Mat4}
   */
  projectionMatrix: Mat4
  /**
   * The {@link Camera} model matrix
   * @type {Mat4}
   */
  modelMatrix: Mat4
  /**
   * The {@link Camera} view matrix
   * @type {Mat4}
   */
  viewMatrix: Mat4

  /**
   * The {@link Camera} field of view
   * @type {number}
   */
  fov: number
  /**
   * The {@link Camera} near plane
   * @type {number}
   */
  near: number
  /**
   * The {@link Camera} far plane
   * @type {number}
   */
  far: number

  /**
   * The {@link Camera} frustum width
   * @type {number}
   */
  width: number
  /**
   * The {@link Camera} frustum height
   * @type {number}
   */
  height: number
  /**
   * The {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs
   * @type {number}
   */
  pixelRatio: number

  /**
   * Callback to run when the {@link Camera} perspective changed
   * @type {function}
   */
  onPerspectiveChanged: () => void
  /**
   * Callback to run when the {@link Camera} {@link position} changed
   * @type {function}
   */
  onPositionChanged: () => void

  /**
   * A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera}
   * @type {number}
   */
  CSSPerspective: number
  /**
   * An object containing the visible width / height at a given z-depth from our camera parameters
   * @type {{width: number, height: number}}
   */
  screenRatio: {
    width: number
    height: number
  }

  /**
   * Flag indicating whether we should update the {@link Camera} {@link projectionMatrix}
   * @type {boolean}
   */
  shouldUpdate: boolean

  /**
   * Camera constructor
   * @param {CameraParams=} parameters - parameters used to create our {@link Camera}
   * @param {number} [parameters.fov=50] - the perspective [field of view]{@link fov}. Should be greater than 0 and lower than 180.
   * @param {number} [parameters.near=0.01] - {@link near} plane, the closest point where a mesh vertex is drawn.
   * @param {number} [parameters.far=150] - {@link far} plane, farthest point where a mesh vertex is drawn.
   * @param {number} [parameters.width=1] - {@link width} used to calculate the {@link Camera} aspect ratio.
   * @param {number} [parameters.height=1] - {@link height} used to calculate the {@link Camera} aspect ratio.
   * @param {number} [parameters.pixelRatio=1] - [pixel ratio]{@link pixelRatio} used to calculate the {@link Camera} aspect ratio.
   * @param {function=} parameters.onPerspectiveChanged - callback to execute when the {@link Camera} perspective changed.
   * @param {function=} parameters.onPositionChanged - callback to execute when the {@link Camera} {@link position} changed.
   */
  constructor(
    {
      fov = 50,
      near = 0.01,
      far = 50,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onPerspectiveChanged = () => {
        /* allow empty callback */
      },
      onPositionChanged = () => {
        /* allow empty callback */
      },
    } = {} as CameraParams
  ) {
    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 1
    this.position = new Vec3(0, 0, 1).onChange(() => this.applyPosition())
    this.projectionMatrix = new Mat4()

    this.modelMatrix = new Mat4()
    this.viewMatrix = new Mat4()

    this.onPerspectiveChanged = onPerspectiveChanged
    this.onPositionChanged = onPositionChanged

    this.shouldUpdate = false

    this.setPerspective(fov, near, far, width, height, pixelRatio)
  }

  /**
   * Sets the {@link Camera} {@link fov}. Update the {@link projectionMatrix} only if the field of view actually changed
   * @param {number=} fov - new {@link fov}
   */
  setFov(fov: number = this.fov) {
    // clamp between 1 and 179
    fov = Math.max(1, Math.min(fov, 179))

    if (fov !== this.fov) {
      this.fov = fov
      this.setPosition()

      this.shouldUpdate = true
    }

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /**
   * Sets the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
   * @param {number=} near - {@link near} plane value to use
   */
  setNear(near: number = this.near) {
    near = Math.max(near, 0.01)

    if (near !== this.near) {
      this.near = near
      this.shouldUpdate = true
    }
  }

  /**
   * Sets the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
   * @param {number=} far - {@link far} plane value to use
   */
  setFar(far: number = this.far) {
    far = Math.max(far, 50)

    if (far !== this.far) {
      this.far = far
      this.shouldUpdate = true
    }
  }

  /**
   * Sets the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
   * @param {number=} pixelRatio - {@link pixelRatio} value to use
   */
  setPixelRatio(pixelRatio: number = this.pixelRatio) {
    if (pixelRatio !== this.pixelRatio) {
      this.shouldUpdate = true
    }

    this.pixelRatio = pixelRatio
  }

  /**
   * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
   * @param {number=} width - {@link width} value to use
   * @param {number=} height - {@link height} value to use
   */
  setSize(width: number, height: number) {
    if (width !== this.width || height !== this.height) {
      this.shouldUpdate = true
    }

    this.width = width
    this.height = height

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /**
   * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if our {@link shouldUpdate} flag is true
   * @param {number=} fov - field of view to use
   * @param {number=} near - near plane value to use
   * @param {number=} far - far plane value to use
   * @param {number=} width - width value to use
   * @param {number=} height - height value to use
   * @param {number=} pixelRatio - pixel ratio value to use
   */
  // TODO use a parameter object instead?
  setPerspective(
    fov: number = this.fov,
    near: number = this.near,
    far: number = this.far,
    width: number = this.width,
    height: number = this.height,
    pixelRatio: number = this.pixelRatio
  ) {
    this.setPixelRatio(pixelRatio)
    this.setSize(width, height)
    this.setFov(fov)
    this.setNear(near)
    this.setFar(far)

    if (this.shouldUpdate) {
      this.updateProjectionMatrix()
      this.onPerspectiveChanged()
    }
  }

  /**
   * Sets the {@link Camera} {@link position} and update the {@link modelMatrix} and {@link viewMatrix}.
   * @param {Vec3=} position - new {@link Camera}  {@link position}
   */
  setPosition(position: Vec3 = this.position) {
    this.position.copy(position)

    this.applyPosition()
  }

  /**
   * Update the {@link modelMatrix} and {@link viewMatrix}.
   */
  applyPosition() {
    // update matrices
    // prettier-ignore
    this.modelMatrix.set(
      1, 0, 0, 0,
      0, 1, 0, 0,
      0, 0, 1, 0,
      this.position.x, this.position.y, this.position.z, 1,
    )

    this.viewMatrix = this.modelMatrix.clone().getInverse()

    this.setScreenRatios()
    this.onPositionChanged()
  }

  /**
   * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
   * Used to translate planes along the Z axis using pixel units as CSS would do
   * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
   */
  setCSSPerspective() {
    this.CSSPerspective =
      Math.pow(
        Math.pow(this.width / (2 * this.pixelRatio), 2) + Math.pow(this.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan((this.fov * 0.5 * Math.PI) / 180)
  }

  /**
   * Sets visible width / height at a given z-depth from our {@link Camera} parameters
   * Taken from {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269}
   * @param {number=} depth
   */
  setScreenRatios(depth = 0) {
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

    this.screenRatio = {
      width: (height * this.width) / this.height,
      height,
    }
  }

  /**
   * Updates the {@link Camera} {@link projectionMatrix}
   */
  updateProjectionMatrix() {
    const aspect = this.width / this.height

    const top = this.near * Math.tan((Math.PI / 180) * 0.5 * this.fov)
    const height = 2 * top
    const width = aspect * height
    const left = -0.5 * width

    const right = left + width
    const bottom = top - height

    const x = (2 * this.near) / (right - left)
    const y = (2 * this.near) / (top - bottom)

    const a = (right + left) / (right - left)
    const b = (top + bottom) / (top - bottom)
    const c = -(this.far + this.near) / (this.far - this.near)
    const d = (-2 * this.far * this.near) / (this.far - this.near)

    // prettier-ignore
    this.projectionMatrix.set(
      x, 0, 0, 0,
      0, y, 0, 0,
      a, b, c, -1,
      0, 0, d, 0
    )
  }
}