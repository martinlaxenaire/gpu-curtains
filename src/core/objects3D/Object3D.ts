import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'

/** Defines all kind of possible {@link Object3D} matrix types */
export type Object3DMatricesType = 'model'

/**
 * Defines an {@link Object3D} matrix object
 */
export interface Object3DTransformMatrix {
  /** The {@link math/Mat4.Mat4 | matrix} used */
  matrix: Mat4
  /** Whether we should update the {@link math/Mat4.Mat4 | matrix} */
  shouldUpdate: boolean
  /** Function to update our {@link math/Mat4.Mat4 | matrix} */
  onUpdate: () => void
}

/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link Object3D} */
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>

/**
 * Defines all necessary {@link math/Vec3.Vec3 | vectors}/{@link math/Quat.Quat | quaternions} to compute a 3D {@link math/Mat4.Mat4 | model matrix}
 */
export interface Object3DTransforms {
  /** Transformation origin object */
  origin: {
    /** Transformation origin {@link math/Vec3.Vec3 | vector} relative to the {@link Object3D} */
    model: Vec3
  }
  /** Model {@link math/Quat.Quat | quaternion} defining its rotation in 3D space */
  quaternion: Quat
  /** Model rotation {@link math/Vec3.Vec3 | vector} used to compute its {@link math/Quat.Quat | quaternion} */
  rotation: Vec3
  /** Position object */
  position: {
    /** Position {@link math/Vec3.Vec3 | vector} relative to the 3D world */
    world: Vec3
  }
  /** Model 3D scale {@link math/Vec3.Vec3 | vector} */
  scale: Vec3
}

/**
 * Used to create an object with transformation properties and a model matrix
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
   * Set our transforms properties and {@link math/Vec3.Vec3#onChange | vectors onChange} callbacks
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
   * Get our rotation {@link math/Vec3.Vec3 | vector}
   */
  get rotation(): Vec3 {
    return this.transforms.rotation
  }

  /**
   * Set our rotation {@link math/Vec3.Vec3 | vector}
   * @param value - new rotation {@link math/Vec3.Vec3 | vector}
   */
  set rotation(value: Vec3) {
    this.transforms.rotation = value
    this.applyRotation()
  }

  /**
   * Get our {@link math/Quat.Quat | quaternion}
   */
  get quaternion(): Quat {
    return this.transforms.quaternion
  }

  /**
   * Set our {@link math/Quat.Quat | quaternion}
   * @param value - new {@link math/Quat.Quat | quaternion}
   */
  set quaternion(value: Quat) {
    this.transforms.quaternion = value
  }

  /**
   * Get our position {@link math/Vec3.Vec3 | vector}
   */
  get position(): Vec3 {
    return this.transforms.position.world
  }

  /**
   * Set our position {@link math/Vec3.Vec3 | vector}
   * @param value - new position {@link math/Vec3.Vec3 | vector}
   */
  set position(value: Vec3) {
    this.transforms.position.world = value
  }

  /**
   * Get our scale {@link math/Vec3.Vec3 | vector}
   * @readonly
   */
  get scale(): Vec3 {
    return this.transforms.scale
  }

  /**
   * Set our scale {@link math/Vec3.Vec3 | vector}
   * @param value - new scale {@link math/Vec3.Vec3 | vector}
   */
  set scale(value: Vec3) {
    // force scale to 1 on Z axis
    this.transforms.scale = value
    this.applyScale()
  }

  /**
   * Get our transform origin {@link math/Vec3.Vec3 | vector}
   */
  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  /**
   * Set our transform origin {@link math/Vec3.Vec3 | vector}
   * @param value - new transform origin {@link math/Vec3.Vec3 | vector}
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
   * Get our {@link math/Mat4.Mat4 | model matrix}
   */
  get modelMatrix(): Mat4 {
    return this.matrices.model.matrix
  }

  /**
   * Set our {@link math/Mat4.Mat4 | model matrix}
   * @param value - new {@link math/Mat4.Mat4 | model matrix}
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
   * Rotate this {@link Object3D} so it looks at the {@link math/Vec3.Vec3 | target}
   * @param target - {@link math/Vec3.Vec3 | target} to look at
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
