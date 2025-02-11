import { Mat4 } from '../../math/Mat4'
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D'
import { RectSize } from '../DOM/DOMElement'
import { Vec3 } from '../../math/Vec3'
import { generateUUID } from '../../utils/utils'

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
  /** callback to execute when one of the {@link Camera#matrices | camera matrices} changed */
  onMatricesChanged?: () => void
}

/** Defines all kind of possible {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} matrix types */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view' | 'viewProjection'
/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>

/**
 * Used to create a perspective {@link Camera} and its projection, model and view matrices.
 *
 * {@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} and {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} automatically create their own {@link Camera} under the hood, so it is unlikely you'd have to create one by yourself.
 *
 * {@link Camera} default perspective settings are:
 * - {@link Camera#fov | field of view}: 50
 * - {@link Camera#near | near plane}: 0.01
 * - {@link Camera#far | far plane}: 150
 *
 * Also note that the {@link Camera} default {@link Camera#position | position} is set at `(0, 0, 10)` so the object created with a default size do not appear too big nor too small.
 */
export class Camera extends Object3D {
  /** The universal unique id of the {@link Camera} */
  uuid: string
  /** {@link CameraObject3DMatrices | Matrices object} of the {@link Camera} */
  matrices: CameraObject3DMatrices

  /** @ignore */
  #fov: number
  /** @ignore */
  #near: number
  /** @ignore */
  #far: number

  /** {@link Vec3 | Up vector} used for {@link lookAt} calculations. */
  up: Vec3

  /** The {@link Camera} frustum width and height */
  size: RectSize
  /** @ignore */
  #pixelRatio: number

  /** Callback to execute when one of the camera {@link matrices} changed */
  onMatricesChanged?: () => void

  /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera} */
  CSSPerspective: number
  /** An object containing the visible width / height at a given z-depth from our camera parameters */
  visibleSize: RectSize

  /**
   * Camera constructor
   * @param parameters - {@link CameraParams | parameters} used to create our {@link Camera}
   */
  constructor(
    {
      fov = 50,
      near = 0.1,
      far = 150,
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

    this.uuid = generateUUID()

    // camera can't be at position (0, 0, 0), it needs some recoil
    // arbitrarily set to 10 so objects of default size (1, 1, 1) don't appear too big
    this.position.set(0, 0, 10)
    this.up = new Vec3(0, 1, 0)

    // callback to run if any of the matrices changed
    this.onMatricesChanged = onMatricesChanged

    // create size object, will be set right after
    this.size = {
      width: 1,
      height: 1,
    }

    this.setPerspective({ fov, near, far, width, height, pixelRatio })
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
   * Get our view matrix
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
   * Get our projection matrix
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
   * Get our view projection matrix
   * @readonly
   */
  get viewProjectionMatrix(): Mat4 {
    return this.matrices.viewProjection.matrix
  }

  /**
   * Set our view dependent matrices shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateViewMatrices() {
    this.matrices.view.shouldUpdate = true
    this.matrices.viewProjection.shouldUpdate = true
  }

  /**
   * Set our projection dependent matrices shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateProjectionMatrices() {
    this.matrices.projection.shouldUpdate = true
    this.matrices.viewProjection.shouldUpdate = true
  }

  /**
   * Update our model matrix and tell our view matrix to update as well
   */
  updateModelMatrix() {
    super.updateModelMatrix()
    this.setVisibleSize()
    this.shouldUpdateViewMatrices()
  }

  /**
   * Update our world matrix and tell our view matrix to update as well
   */
  updateWorldMatrix() {
    super.updateWorldMatrix()
    this.shouldUpdateViewMatrices()
  }

  /**
   * Callback to run when the camera {@link modelMatrix | model matrix} has been updated
   */
  updateMatrixStack() {
    super.updateMatrixStack()

    if (this.matricesNeedUpdate) {
      this.onMatricesChanged()
    }
  }

  /**
   * Get the {@link Camera} {@link Camera.fov | field of view}
   */
  get fov(): number {
    return this.#fov
  }

  /**
   * Set the {@link Camera} {@link Camera.fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
   * @param fov - new field of view
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
   * Get the {@link Camera} {@link Camera.near | near} plane value.
   */
  get near(): number {
    return this.#near
  }

  /**
   * Set the {@link Camera} {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
   * @param near - new near plane value
   */
  set near(near: number) {
    near = Math.max(near ?? this.near, 1e-4)

    if (near !== this.near) {
      this.#near = near
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link Camera} {@link Camera.far | far} plane value.
   */
  get far(): number {
    return this.#far
  }

  /**
   * Set the {@link Camera} {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
   * @param far - new far plane value
   */
  set far(far: number) {
    far = Math.max(far ?? this.far, this.near + 1)

    if (far !== this.far) {
      this.#far = far
      this.shouldUpdateProjectionMatrices()
    }
  }

  /**
   * Get the {@link Camera} {@link Camera.pixelRatio | pixelRatio} value.
   */
  get pixelRatio() {
    return this.#pixelRatio
  }

  /**
   * Set the {@link Camera} {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
   * @param pixelRatio - new pixel ratio value
   */
  set pixelRatio(pixelRatio: number) {
    this.#pixelRatio = pixelRatio ?? this.pixelRatio
    this.setCSSPerspective()
  }

  /**
   * Set the {@link Camera} {@link RectSize.width | width} and {@link RectSize.height | height}. Update the {@link projectionMatrix} only if the width or height actually changed
   * @param size - width and height values to use
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
   * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if needed.
   * @param parameters - {@link CameraPerspectiveOptions | parameters} to use for the perspective
   */
  setPerspective({
    fov = this.fov,
    near = this.near,
    far = this.far,
    width = this.size.width,
    height = this.size.height,
    pixelRatio = this.pixelRatio,
  }: CameraPerspectiveOptions = {}) {
    this.setSize({ width, height })
    this.pixelRatio = pixelRatio
    this.fov = fov
    this.near = near
    this.far = far
  }

  /**
   * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.<br>
   * Used to translate planes along the Z axis using pixel units as CSS would do.<br>
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
   * Get visible width / height at a given z-depth from our {@link Camera} parameters.<br>
   * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}
   * @param depth - depth to use for calculations
   * @returns - visible width and height at given depth
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
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth()
  }

  /**
   * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}
   * @param target - {@link Vec3 | target} to look at
   * @param position - {@link Vec3 | postion} from which to look at
   */
  lookAt(target: Vec3 = new Vec3(), position = this.position) {
    // since we know it's a camera, inverse position and target
    super.lookAt(position, target, this.up)
  }

  /**
   * Updates the {@link Camera} {@link projectionMatrix}
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
   * Get the current {@link Camera} frustum planes in the [left, right, top, bottom, near, far] order, based on its {@link projectionMatrix} and {@link viewMatrix}.
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
