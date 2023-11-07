import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'

/** Defines all kind of possible {@link Object3D} matrix types */
export type Object3DMatricesType = 'model'

/**
 * Defines an {@link Object3D} matrix object
 */
export interface Object3DTransformMatrix {
  /** The [matrix]{@link Mat4} used */
  matrix: Mat4
  /** Whether we should update the [matrix]{@link Mat4} */
  shouldUpdate: boolean
  /** Function to update our [matrix]{@link Mat4} */
  onUpdate: () => void
}

/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link Object3D} */
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>

/**
 * Defines all necessary vectors/quaternions to compute a 3D model [matrix]{@link Mat4}
 */
export interface Object3DTransforms {
  /** Transformation origin object */
  origin: {
    /** Transformation origin [vector]{@link Vec3} relative to the {@link Object3D} */
    model: Vec3
    /** Transformation origin [vector]{@link Vec3} relative to the 3D world */
    world?: Vec3
  }
  /** Model [quaternion]{@link Quat} defining its rotation in 3D space */
  quaternion: Quat
  /** Model rotation [vector]{@link Vec3} used to compute its [quaternion]{@link Quat} */
  rotation: Vec3
  /** Position object */
  position: {
    /** Position [vector]{@link Vec3} relative to the 3D world */
    world: Vec3
    /** Position [vector]{@link Vec3} relative to the DOM document */
    document?: Vec3
  }
  /** Model 3D scale [vector]{@link Vec3} */
  scale: Vec3
}

/**
 * Object3D class:
 * Used to create an object with transformation properties and a model matrix
 */
export class Object3D {
  /** [Transformation object]{@link Object3DTransforms} of the {@link Object3D} */
  transforms: Object3DTransforms
  /** [Matrices object]{@link Object3DMatrices} of the {@link Object3D} */
  matrices: Object3DMatrices

  /**
   * Object3D constructor
   */
  constructor() {
    this.setMatrices()
    this.setTransforms()
  }

  /* TRANSFORMS */

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

  /* MATRICES */

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

  /**
   * Callback to run if at least one matrix of the stack has been updated
   */
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
