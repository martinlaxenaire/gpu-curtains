import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'

/** Defines all kind of possible {@link Object3D} matrix types */
export type Object3DMatricesType = 'model'

/**
 * Defines an {@link Object3D} matrix object
 */
export interface Object3DTransformMatrix {
  /** The {@link Mat4 | matrix} used */
  matrix: Mat4
  /** Whether we should update the {@link Mat4 | matrix} */
  shouldUpdate: boolean
  /** Function to update our {@link Mat4 | matrix} */
  onUpdate: () => void
}

/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link Object3D} */
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>

/**
 * Defines all necessary {@link Vec3 | vectors}/{@link Quat | quaternions} to compute a 3D {@link Mat4 | model matrix}
 */
export interface Object3DTransforms {
  /** Transformation origin object */
  origin: {
    /** Transformation origin {@link Vec3 | vector} relative to the {@link Object3D} */
    model: Vec3
  }
  /** Model {@link Quat | quaternion} defining its rotation in 3D space */
  quaternion: Quat
  /** Model rotation {@link Vec3 | vector} used to compute its {@link Quat | quaternion} */
  rotation: Vec3
  /** Position object */
  position: {
    /** Position {@link Vec3 | vector} relative to the 3D world */
    world: Vec3
  }
  /** Model 3D scale {@link Vec3 | vector} */
  scale: Vec3
}

/**
 * Used to create an object with transformation properties such as position, scale, rotation and transform origin {@link Vec3 | vectors} and a {@link Quat | quaternion} in order to compute a {@link Mat4 | model matrix}.
 *
 * The transformations {@link Vec3 | vectors} are reactive to changes, which mean that updating one of their components will automatically update the {@link Mat4 | model matrix}.
 */
export class Object3D {
  /** {@link Object3DTransforms | Transformation object} of the {@link Object3D} */
  transforms: Object3DTransforms
  /** {@link Object3DMatrices | Matrices object} of the {@link Object3D} */
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
   * Set our transforms properties and {@link Vec3#onChange | vectors onChange} callbacks
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
   * Get our rotation {@link Vec3 | vector}
   */
  get rotation(): Vec3 {
    return this.transforms.rotation
  }

  /**
   * Set our rotation {@link Vec3 | vector}
   * @param value - new rotation {@link Vec3 | vector}
   */
  set rotation(value: Vec3) {
    this.transforms.rotation = value
    this.applyRotation()
  }

  /**
   * Get our {@link Quat | quaternion}
   */
  get quaternion(): Quat {
    return this.transforms.quaternion
  }

  /**
   * Set our {@link Quat | quaternion}
   * @param value - new {@link Quat | quaternion}
   */
  set quaternion(value: Quat) {
    this.transforms.quaternion = value
  }

  /**
   * Get our position {@link Vec3 | vector}
   */
  get position(): Vec3 {
    return this.transforms.position.world
  }

  /**
   * Set our position {@link Vec3 | vector}
   * @param value - new position {@link Vec3 | vector}
   */
  set position(value: Vec3) {
    this.transforms.position.world = value
  }

  /**
   * Get our scale {@link Vec3 | vector}
   */
  get scale(): Vec3 {
    return this.transforms.scale
  }

  /**
   * Set our scale {@link Vec3 | vector}
   * @param value - new scale {@link Vec3 | vector}
   */
  set scale(value: Vec3) {
    // force scale to 1 on Z axis
    this.transforms.scale = value
    this.applyScale()
  }

  /**
   * Get our transform origin {@link Vec3 | vector}
   */
  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  /**
   * Set our transform origin {@link Vec3 | vector}
   * @param value - new transform origin {@link Vec3 | vector}
   */
  set transformOrigin(value: Vec3) {
    this.transforms.origin.model = value
  }

  /**
   * Apply our rotation and tell our {@link modelMatrix | model matrix} to update
   */
  applyRotation() {
    this.quaternion.setFromVec3(this.rotation)

    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyPosition() {
    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyScale() {
    this.shouldUpdateModelMatrix()
  }

  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyTransformOrigin() {
    this.shouldUpdateModelMatrix()
  }

  /* MATRICES */

  /**
   * Set our {@link modelMatrix | model matrix}
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
   * Get our {@link Mat4 | model matrix}
   */
  get modelMatrix(): Mat4 {
    return this.matrices.model.matrix
  }

  /**
   * Set our {@link Mat4 | model matrix}
   * @param value - new {@link Mat4 | model matrix}
   */
  set modelMatrix(value: Mat4) {
    this.matrices.model.matrix = value
    this.shouldUpdateModelMatrix()
  }

  /**
   * Set our {@link modelMatrix | model matrix} shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateModelMatrix() {
    this.matrices.model.shouldUpdate = true
  }

  /**
   * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}
   * @param target - {@link Vec3 | target} to look at
   */
  lookAt(target: Vec3 = new Vec3()) {
    const rotationMatrix = new Mat4().lookAt(target, this.position)
    this.quaternion.setFromRotationMatrix(rotationMatrix)
    this.shouldUpdateModelMatrix()
  }

  /**
   * Update our {@link modelMatrix | model matrix}
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
