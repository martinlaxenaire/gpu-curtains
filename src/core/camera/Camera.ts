import { Mat4 } from '../../math/Mat4'
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D'
import { RectSize } from '../DOM/DOMElement'
import { Vec3 } from '../../math/Vec3'

/**
 * Defines Camera basic perspective options
 */
export interface CameraBasePerspectiveOptions {
  /** {@link Camera} perspective field of view. Should be greater than 0 and lower than 180 */
  fov?: number
  /** {@link Camera} near plane, the closest point where a mesh vertex is drawn */
  near?: number
  /** {@link Camera} far plane, the farthest point where a mesh vertex is drawn */
  far?: number
}

/**
 * Defines all Camera perspective options
 */
export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
  /** {@link Camera} frustum width */
  width?: number
  /** {@link Camera} frustum height */
  height?: number
  /** {@link Camera} pixel ratio */
  pixelRatio?: number
}

/**
 * An object defining all possible {@link Camera} class instancing parameters
 */
export interface CameraParams extends CameraPerspectiveOptions {
  /** callback to execute when one of the [camera matrices]{@link Camera#matrices} changed */
  onMatricesChanged?: () => void
}

/** Defines all kind of possible {@link ProjectedObject3D} matrix types */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view'
/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link ProjectedObject3D} */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>

/**
 * Camera class:
 * Used to create a perspective camera and its matrices (projection, model, view).
 * @extends Object3D
 */
export class Camera extends Object3D {
  /** [Matrices object]{@link CameraObject3DMatrices} of the {@link Camera} */
  matrices: CameraObject3DMatrices

  /** Private {@link Camera} field of view */
  #fov: number
  /** Private {@link Camera} near plane */
  #near: number
  /** Private {@link Camera} far plane */
  #far: number

  /** The {@link Camera} frustum width and height */
  size: RectSize
  /** Private {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs */
  #pixelRatio: number

  /** Callback to execute when one of the [camera matrices]{@link Camera#matrices} changed */
  onMatricesChanged?: () => void

  /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera} */
  CSSPerspective: number
  /** An object containing the visible width / height at a given z-depth from our camera parameters */
  screenRatio: RectSize

  /**
   * Camera constructor
   * @param parameters - [parameters]{@link CameraParams} used to create our {@link Camera}
   */
  constructor(
    {
      fov = 50,
      near = 0.01,
      far = 50,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onMatricesChanged = () => {
        /* allow empty callback */
      },
    } = {} as CameraParams
  ) {
    // Object3D
    super()

    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 5 so objects of default size (1, 1, 1) don't appear too big
    this.position.set(0, 0, 5)

    // callback to run if any of the matrices changed
    this.onMatricesChanged = onMatricesChanged

    // create size object, will be set right after
    this.size = {
      width: 1,
      height: 1,
    }

    this.setPerspective(fov, near, far, width, height, pixelRatio)
  }

  /**
   * Set our transform and projection matrices
   */
  setMatrices() {
    super.setMatrices()

    this.matrices = {
      ...this.matrices,
      view: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => {
          this.viewMatrix.copy(this.modelMatrix).invert()
        },
      },
      projection: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => this.updateProjectionMatrix(),
      },
    }
  }

  /**
   * Get/set our view matrix
   * @readonly
   */
  get viewMatrix(): Mat4 {
    return this.matrices.view.matrix
  }

  set viewMatrix(value: Mat4) {
    this.matrices.view.matrix = value
    this.matrices.view.shouldUpdate = true
  }

  /**
   * Get/set our projection matrix
   * @readonly
   */
  get projectionMatrix(): Mat4 {
    return this.matrices.projection.matrix
  }

  set projectionMatrix(value: Mat4) {
    this.matrices.projection.matrix = value
    this.shouldUpdateProjectionMatrix()
  }

  /**
   * Set our projection matrix shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateProjectionMatrix() {
    this.matrices.projection.shouldUpdate = true
  }

  /**
   * Update our model matrix and tell our view matrix to update as well
   */
  updateModelMatrix() {
    super.updateModelMatrix()
    this.setScreenRatios()
    this.matrices.view.shouldUpdate = true
  }

  /**
   * Get / set the {@link Camera} [field of view]{@link Camera##fov}. Update the {@link projectionMatrix} only if the field of view actually changed
   * @readonly
   */
  get fov(): number {
    return this.#fov
  }

  set fov(fov: number) {
    // clamp between 1 and 179
    fov = Math.max(1, Math.min(fov ?? this.fov, 179))

    if (fov !== this.fov) {
      this.#fov = fov
      this.shouldUpdateProjectionMatrix()
    }

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /**
   * Get / set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
   * @readonly
   */
  get near(): number {
    return this.#near
  }

  set near(near: number) {
    near = Math.max(near ?? this.near, 0.01)

    if (near !== this.near) {
      this.#near = near
      this.shouldUpdateProjectionMatrix()
    }
  }

  /**
   * Get / set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
   * @readonly
   */
  get far(): number {
    return this.#far
  }

  set far(far: number) {
    far = Math.max(far ?? this.far, this.near + 1)

    if (far !== this.far) {
      this.#far = far
      this.shouldUpdateProjectionMatrix()
    }
  }

  /**
   * Get / set the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
   * @readonly
   */
  get pixelRatio() {
    return this.#pixelRatio
  }

  set pixelRatio(pixelRatio: number) {
    this.#pixelRatio = pixelRatio ?? this.pixelRatio
    this.setCSSPerspective()
  }

  /**
   * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
   * @param size - {@link width} and {@link height} values to use
   */
  setSize({ width, height }: RectSize) {
    if (width !== this.size.width || height !== this.size.height) {
      this.shouldUpdateProjectionMatrix()
    }

    this.size.width = width
    this.size.height = height

    this.setScreenRatios()
    this.setCSSPerspective()
  }

  /**
   * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if our {@link shouldUpdate} flag is true
   * @param fov - field of view to use
   * @param near - near plane value to use
   * @param far - far plane value to use
   * @param width - width value to use
   * @param height - height value to use
   * @param pixelRatio - pixel ratio value to use
   */
  // TODO use a parameter object instead?
  setPerspective(
    fov: number = this.fov,
    near: number = this.near,
    far: number = this.far,
    width: number = this.size.width,
    height: number = this.size.height,
    pixelRatio: number = this.pixelRatio
  ) {
    this.setSize({ width, height })
    this.pixelRatio = pixelRatio
    this.fov = fov
    this.near = near
    this.far = far
  }

  /**
   * Callback to run when the [camera model matrix]{@link Camera#modelMatrix} has been updated
   */
  onAfterMatrixStackUpdate() {
    // callback because matrices changed
    this.onMatricesChanged()
  }

  /**
   * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
   * Used to translate planes along the Z axis using pixel units as CSS would do
   * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
   */
  setCSSPerspective() {
    this.CSSPerspective =
      Math.pow(
        Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan((this.fov * 0.5 * Math.PI) / 180)
  }

  /**
   * Sets visible width / height at a given z-depth from our {@link Camera} parameters
   * Taken from {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269}
   * @param depth - depth to use for calcs
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
      width: (height * this.size.width) / this.size.height,
      height,
    }
  }

  /**
   * Rotate this {@link Object3D} so it looks at the [target]{@link Vec3}
   * @param target - [target]{@link Vec3} to look at
   */
  lookAt(target: Vec3 = new Vec3()) {
    // since we know it's a camera, inverse position and target
    const rotationMatrix = new Mat4().lookAt(this.position, target)
    this.quaternion.setFromRotationMatrix(rotationMatrix)
    this.shouldUpdateModelMatrix()
  }

  /**
   * Updates the {@link Camera} {@link projectionMatrix}
   */
  updateProjectionMatrix() {
    const aspect = this.size.width / this.size.height

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
