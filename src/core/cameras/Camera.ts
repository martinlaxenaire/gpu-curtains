import { Mat4 } from '../../math/Mat4'
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D'
import { RectSize } from '../DOM/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { generateUUID } from '../../utils/utils'

/**
 * Defines Camera basic perspective options.
 */
export interface CameraBaseOptions {
  /** {@link Camera} near plane, the closest point where a mesh vertex is drawn. */
  near?: number
  /** {@link Camera} far plane, the farthest point where a mesh vertex is drawn. */
  far?: number
}

/**
 * Defines all Camera perspective options.
 */
export interface CameraOptions extends CameraBaseOptions {
  /** {@link Camera} pixel ratio. */
  pixelRatio?: number
}

/**
 * An object defining all possible {@link Camera} class instancing parameters.
 */
export interface CameraParams extends CameraOptions {
  /** callback to execute when one of the {@link Camera#matrices | camera matrices} changed. */
  onMatricesChanged?: () => void
}

/** Defines all kind of possible {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} matrix types. */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view' | 'viewProjection'
/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}. */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>

/**
 * Used as a base class to create a {@link Camera}.
 *
 * This class is not made to be used directly, you should use the {@link core/cameras/PerspectiveCamera.PerspectiveCamera | PerspectiveCamera} or {@link core/cameras/OrthographicCamera.OrthographicCamera | OrthographicCamera} classes instead.
 */
export class Camera extends Object3D {
  /** The universal unique id of the {@link Camera}. */
  uuid: string
  /** {@link CameraObject3DMatrices | Matrices object} of the {@link Camera}. */
  matrices: CameraObject3DMatrices

  /** @ignore */
  #near: number
  /** @ignore */
  #far: number

  /** @ignore */
  #pixelRatio: number

  /** Callback to execute when one of the camera {@link matrices} changed. */
  onMatricesChanged?: () => void

  /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera}. Useful only with {@link core/cameras/PerspectiveCamera.PerspectiveCamera | PerspectiveCamera}. */
  CSSPerspective: number
  /** An object containing the visible width / height at a given z-depth from our camera parameters. */
  visibleSize: RectSize

  /**
   * Camera constructor
   * @param parameters - {@link CameraParams} used to create our {@link Camera}.
   */
  constructor(
    {
      near = 0.1,
      far = 150,
      pixelRatio = 1,
      onMatricesChanged = () => {
        /* allow empty callback */
      },
    } = {} as CameraParams
  ) {
    // Object3D
    super()

    this.uuid = generateUUID()

    // callback to run if any of the matrices changed
    this.onMatricesChanged = onMatricesChanged
  }

  /**
   * Set our transform and projection matrices.
   */
  setMatrices() {
    super.setMatrices()

    this.matrices = {
      ...this.matrices,
      view: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => {
          this.viewMatrix.copy(this.worldMatrix).invert()
        },
      },
      projection: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.updateProjectionMatrix(),
      },
      viewProjection: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.viewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix),
      },
    }
  }

  /**
   * Get our view matrix.
   * @readonly
   */
  get viewMatrix(): Mat4 {
    return this.matrices.view.matrix
  }

  set viewMatrix(value: Mat4) {
    this.matrices.view.matrix = value
    this.shouldUpdateViewMatrices()
  }

  /**
   * Get our projection matrix.
   * @readonly
   */
  get projectionMatrix(): Mat4 {
    return this.matrices.projection.matrix
  }

  set projectionMatrix(value: Mat4) {
    this.matrices.projection.matrix = value
    this.shouldUpdateProjectionMatrices()
  }

  /**
   * Get our view projection matrix.
   * @readonly
   */
  get viewProjectionMatrix(): Mat4 {
    return this.matrices.viewProjection.matrix
  }

  /**
   * Set our view dependent matrices shouldUpdate flag to `true` (tell it to update).
   */
  shouldUpdateViewMatrices() {
    this.matrices.view.shouldUpdate = true
    this.matrices.viewProjection.shouldUpdate = true
  }

  /**
   * Set our projection dependent matrices shouldUpdate flag to `true` (tell it to update).
   */
  shouldUpdateProjectionMatrices() {
    this.matrices.projection.shouldUpdate = true
    this.matrices.viewProjection.shouldUpdate = true
  }

  /**
   * Update our model matrix and tell our view matrix to update as well.
   */
  updateModelMatrix() {
    super.updateModelMatrix()
    this.setVisibleSize()
    this.shouldUpdateViewMatrices()
  }

  /**
   * Update our view matrix whenever we need to update the world matrix.
   */
  shouldUpdateWorldMatrix() {
    super.shouldUpdateWorldMatrix()
    this.shouldUpdateViewMatrices()
  }

  /**
   * Callback to run when the camera {@link modelMatrix | model matrix} has been updated.
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.onMatricesChanged()
    }
  }

  /**
   * Get the {@link Camera.near | near} plane value.
   */
  get near(): number {
    return this.#near
  }

  /**
   * Set the {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed.
   * @param near - New near plane value.
   */
  set near(near: number) {
    near = Math.max(near ?? this.near, 1e-4)

    if (near !== this.near) {
      this.#near = near
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link Camera.far | far} plane value.
   */
  get far(): number {
    return this.#far
  }

  /**
   * Set the {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed.
   * @param far - New far plane value.
   */
  set far(far: number) {
    far = Math.max(far ?? this.far, this.near + 1)

    if (far !== this.far) {
      this.#far = far
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link Camera.pixelRatio | pixelRatio} value.
   */
  get pixelRatio() {
    return this.#pixelRatio
  }

  /**
   * Set the {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed.
   * @param pixelRatio - New pixel ratio value.
   */
  set pixelRatio(pixelRatio: number) {
    this.#pixelRatio = pixelRatio ?? this.pixelRatio
    this.setCSSPerspective()
  }

  /** @ignore */
  setCSSPerspective() {
    this.CSSPerspective = 0
  }

  /**
   * Get visible width / height at a given z-depth from our {@link Camera} parameters. Useless for this base class, but will be overriden by children classes.
   * @param depth - Depth to use for calculations.
   * @returns - Visible width and height at given depth.
   */
  getVisibleSizeAtDepth(depth = 0): RectSize {
    return {
      width: 0,
      height: 0,
    }
  }

  /**
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth()
  }

  /**
   * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}.
   * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
   */
  lookAt(target: Vec3 = new Vec3()) {
    this.updateModelMatrix()
    this.updateWorldMatrix(true, false)

    if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) {
      this.up.set(0, 0, 1)
    } else {
      this.up.set(0, 1, 0)
    }

    // since we know it's a camera, inverse position and target
    this.applyLookAt(this.actualPosition, target)
  }

  /**
   * Updates the {@link Camera} {@link projectionMatrix}.
   */
  updateProjectionMatrix() {
    /* will be overriden */
  }
}
