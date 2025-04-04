import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'
import { KeyframesAnimation } from '../../extras/animations/KeyframesAnimation'

let objectIndex = 0
const tempMatrix = new Mat4()

/** Defines all kind of possible {@link Object3D} matrix types */
export type Object3DMatricesType = 'model' | 'world'

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
 * Used to create an object with transformation properties such as position, scale, rotation and transform origin {@link Vec3 | vectors} and a {@link Quat | quaternion} in order to compute the {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix}.
 *
 * If an {@link Object3D} does not have any {@link Object3D#parent | parent}, then its {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix} are the same.
 *
 * The transformations {@link Vec3 | vectors} are reactive to changes, which mean that updating one of their components will automatically update the {@link Object3D#modelMatrix | model matrix} and {@link Object3D#worldMatrix | world matrix}.
 */
export class Object3D {
  /** {@link Object3DTransforms | Transformation object} of the {@link Object3D} */
  transforms: Object3DTransforms
  /** {@link Object3DMatrices | Matrices object} of the {@link Object3D} */
  matrices: Object3DMatrices

  /** {@link Vec3} used by the {@link lookAt} method, to determine the orientation of the result. Default to `new Vec3(0, 1, 0).` */
  up: Vec3

  /** {@link Vec3} holding the actual position of this {@link Object3D} from its {@link worldMatrix}. */
  actualPosition: Vec3

  /** Parent {@link Object3D} in the scene graph, used to compute the {@link worldMatrix}. */
  private _parent: null | Object3D
  /** Children {@link Object3D} in the scene graph, used to compute their own {@link worldMatrix}. */
  children: Object3D[]

  /** Index (order of creation) of this {@link Object3D}. Used in the {@link parent} / {@link children} relation. */
  object3DIndex: number

  /** Whether at least one of this {@link Object3D} matrix needs an update. */
  matricesNeedUpdate: boolean

  /**
   * Object3D constructor
   */
  constructor() {
    this._parent = null
    this.children = []

    this.matricesNeedUpdate = false
    this.up = new Vec3(0, 1, 0)
    this.actualPosition = new Vec3()

    Object.defineProperty(this as Object3D, 'object3DIndex', { value: objectIndex++ })

    this.setMatrices()
    this.setTransforms()
  }

  /* PARENT */

  /**
   * Get the parent of this {@link Object3D} if any
   */
  get parent(): Object3D | null {
    return this._parent
  }

  /**
   * Set the parent of this {@link Object3D}
   * @param value - new parent to set, could be an {@link Object3D} or null
   */
  set parent(value: Object3D | null) {
    if (this._parent && value && this._parent.object3DIndex === value.object3DIndex) {
      return
    }

    if (this._parent) {
      // if we already have a parent, remove it first
      this._parent.children = this._parent.children.filter((child) => child.object3DIndex !== this.object3DIndex)
    }

    if (value) {
      this.shouldUpdateWorldMatrix()
    }

    this._parent = value
    this._parent?.children.push(this)
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
   * Set our {@link modelMatrix | model matrix} and {@link worldMatrix | world matrix}
   */
  setMatrices() {
    this.matrices = {
      model: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.updateModelMatrix(),
      },
      world: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.updateWorldMatrix(),
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
    this.shouldUpdateWorldMatrix()
  }

  /**
   * Get our {@link Mat4 | world matrix}
   */
  get worldMatrix(): Mat4 {
    return this.matrices.world.matrix
  }

  /**
   * Set our {@link Mat4 | world matrix}
   * @param value - new {@link Mat4 | world matrix}
   */
  set worldMatrix(value: Mat4) {
    this.matrices.world.matrix = value
    this.shouldUpdateWorldMatrix()
  }

  /**
   * Set our {@link worldMatrix | world matrix} shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateWorldMatrix() {
    this.matrices.world.shouldUpdate = true
  }

  /**
   * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}.
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

    this.applyLookAt(target, this.actualPosition)
  }

  /**
   * Apply a look at rotation based on a target, a position and our {@link up} vectors.
   * @param target - {@link Vec3} target to look at.
   * @param position - {@link Vec3} position from which to look at.
   */
  applyLookAt(target: Vec3, position: Vec3) {
    const rotation = tempMatrix.lookAt(target, position, this.up)
    this.quaternion.setFromRotationMatrix(rotation)
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

    // tell our world matrix to update
    this.shouldUpdateWorldMatrix()
  }

  /**
   * Update our {@link worldMatrix | model matrix}.
   * @param updateParents - Whether to update the {@link parent} {@link worldMatrix} beforehand. Default to `false`.
   * @param updateChildren - Whether to update the {@link children} {@link worldMatrix} afterward. Default to `true`.
   */
  updateWorldMatrix(updateParents = false, updateChildren = true) {
    if (!this.parent) {
      this.worldMatrix.copy(this.modelMatrix)
    } else {
      if (updateParents) {
        this.parent.updateWorldMatrix(true, false)
      }

      this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.modelMatrix)
    }

    this.worldMatrix.getTranslation(this.actualPosition)

    // update the children world matrix as well
    if (updateChildren) {
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].shouldUpdateWorldMatrix()
      }
    }
  }

  /**
   * Check whether at least one of the matrix should be updated
   */
  shouldUpdateMatrices() {
    this.matricesNeedUpdate = !!Object.values(this.matrices).find((matrix) => matrix.shouldUpdate)
  }

  /**
   * Check at each render whether we should update our matrices, and update them if needed
   */
  updateMatrixStack() {
    this.shouldUpdateMatrices()

    if (this.matricesNeedUpdate) {
      for (const matrixName in this.matrices) {
        if (this.matrices[matrixName].shouldUpdate) {
          this.matrices[matrixName].onUpdate()
          this.matrices[matrixName].shouldUpdate = false
        }
      }
    }

    for (let i = 0, l = this.children.length; i < l; i++) {
      this.children[i].updateMatrixStack()
    }
  }

  /**
   * Destroy this {@link Object3D}. Removes its parent and set its children free.
   */
  destroy() {
    for (let i = 0, l = this.children.length; i < l; i++) {
      if (this.children[i]) this.children[i].parent = null
    }

    this.parent = null
  }
}
