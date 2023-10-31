import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'

export type Object3DMatricesType = 'model'

export interface Object3DTransformMatrix {
  matrix: Mat4
  shouldUpdate: boolean
  onUpdate: () => void
}

export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>

export interface Object3DTransforms {
  origin: {
    model: Vec3
    world?: Vec3
  }
  quaternion: Quat
  rotation: Vec3
  position: {
    world: Vec3
    document?: Vec3
  }
  scale: Vec3
}

/**
 * Object3D class:
 * Used to create an object with transformation properties and a model matrix
 */
export class Object3D {
  transforms: Object3DTransforms
  matrices: Object3DMatrices

  /**
   * Object3D constructor
   */
  constructor() {
    this.setMatrices()
    this.setTransforms()
  }

  /** TRANSFORMS **/

  /**
   * Set our transforms properties and onChange callbacks
   */
  setTransforms() {
    this.transforms = {
      origin: {
        model: new Vec3(),
      },
      quaternion: new Quat(),
      rotation: new Vec3(),
      position: {
        world: new Vec3(),
      },
      scale: new Vec3(1),
    }

    this.rotation.onChange(() => this.applyRotation())
    this.position.onChange(() => this.applyPosition())
    this.scale.onChange(() => this.applyScale())
    this.transformOrigin.onChange(() => this.applyTransformOrigin())
  }

  /**
   * Get/set our rotation vector
   * @readonly
   * @type {Vec3}
   */
  get rotation(): Vec3 {
    return this.transforms.rotation
  }

  set rotation(value: Vec3) {
    this.transforms.rotation = value
    this.applyRotation()
  }

  /**
   * Get/set our quaternion
   * @readonly
   * @type {Quat}
   */
  get quaternion(): Quat {
    return this.transforms.quaternion
  }

  set quaternion(value: Quat) {
    this.transforms.quaternion = value
  }

  /**
   * Get/set our position vector
   * @readonly
   * @type {Vec3}
   */
  get position(): Vec3 {
    return this.transforms.position.world
  }

  set position(value: Vec3) {
    this.transforms.position.world = value
  }

  /**
   * Get/set our scale vector
   * @readonly
   * @type {Vec3}
   */
  get scale(): Vec3 {
    return this.transforms.scale
  }

  set scale(value: Vec3) {
    // force scale to 1 on Z axis
    this.transforms.scale = value
    this.applyScale()
  }

  /**
   * Get/set our transform origin vector
   * @readonly
   * @type {Vec3}
   */
  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  set transformOrigin(value: Vec3) {
    this.transforms.origin.model = value
  }

  /**
   * Apply our rotation and tell our model matrix to update
   */
  applyRotation() {
    this.quaternion.setFromVec3(this.rotation)

    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our model matrix to update
   */
  applyPosition() {
    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our model matrix to update
   */
  applyScale() {
    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our model matrix to update
   */
  applyTransformOrigin() {
    this.shouldUpdateModelMatrix()
  }

  /** MATRICES **/

  /**
   * Set our model matrix
   */
  setMatrices() {
    this.matrices = {
      model: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => this.updateModelMatrix(),
      },
    }
  }

  /**
   * Get/set our model matrix
   * @readonly
   * @type {Mat4}
   */
  get modelMatrix(): Mat4 {
    return this.matrices.model.matrix
  }

  set modelMatrix(value: Mat4) {
    this.matrices.model.matrix = value
    this.matrices.model.shouldUpdate = true
  }

  /**
   * Set our model matrix shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateModelMatrix() {
    this.matrices.model.shouldUpdate = true
  }

  /**
   * Update our model matrix
   */
  updateModelMatrix() {
    // compose our model transformation matrix from custom origin
    this.modelMatrix = this.modelMatrix.composeFromOrigin(
      this.position,
      this.quaternion,
      this.scale,
      this.transformOrigin
    )
  }

  onAfterMatrixStackUpdate() {
    /* allow empty callback */
  }

  /**
   * Tell our model matrix to update
   */
  updateSizeAndPosition() {
    this.shouldUpdateModelMatrix()
  }

  /**
   * Check at each render whether we should update our matrices, and update them if needed
   */
  updateMatrixStack() {
    // check if at least one matrix should update
    const matrixShouldUpdate = !!Object.keys(this.matrices).find((matrixName) => this.matrices[matrixName].shouldUpdate)

    for (const matrixName in this.matrices) {
      if (this.matrices[matrixName].shouldUpdate) {
        this.matrices[matrixName].onUpdate()
        this.matrices[matrixName].shouldUpdate = false
      }
    }

    // callback to run if at least one matrix of the stack has been updated
    if (matrixShouldUpdate) this.onAfterMatrixStackUpdate()
  }
}
