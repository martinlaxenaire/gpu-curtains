import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'
import { Object3DTransforms } from '../../types/core/objects3D/Object3D'
import { ProjectedObject3DMatrices } from '../../types/core/objects3D/ProjectedObject3D'

export class Object3D {
  transforms: Object3DTransforms
  matrices: ProjectedObject3DMatrices

  constructor() {
    this.setMatrices()
    this.setTransforms()
  }

  /** TRANSFORMS **/

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

  // transform getters / setters
  get rotation(): Vec3 {
    return this.transforms.rotation
  }

  set rotation(value: Vec3) {
    this.transforms.rotation = value
    this.applyRotation()
  }

  get quaternion(): Quat {
    return this.transforms.quaternion
  }

  set quaternion(value: Quat) {
    this.transforms.quaternion = value
  }

  get position(): Vec3 {
    return this.transforms.position.world
  }

  set position(value: Vec3) {
    this.transforms.position.world = value
  }

  get scale(): Vec3 {
    return this.transforms.scale
  }

  set scale(value: Vec3) {
    // force scale to 1 on Z axis
    this.transforms.scale = value
    this.applyScale()
  }

  get transformOrigin(): Vec3 {
    return this.transforms.origin.model
  }

  set transformOrigin(value: Vec3) {
    this.transforms.origin.model = value
  }

  /***
   This will apply our rotation and tells our model view matrix to update
   ***/
  applyRotation() {
    this.quaternion.setFromVec3(this.rotation)

    this.shouldUpdateModelMatrix()
  }

  /***
   This will set our plane position by adding plane computed bounding box values and computed relative position values
   ***/
  applyPosition() {
    this.shouldUpdateModelMatrix()
  }

  applyScale() {
    this.shouldUpdateModelMatrix()
  }

  applyTransformOrigin() {
    this.shouldUpdateModelMatrix()
  }

  /** MATRICES **/

  setMatrices() {
    this.matrices = {
      model: {
        matrix: new Mat4(),
        shouldUpdate: false,
        onUpdate: () => this.updateModelMatrix(),
      },
    }
  }

  get modelMatrix(): Mat4 {
    return this.matrices.model.matrix
  }

  set modelMatrix(value: Mat4) {
    this.matrices.model.matrix = value
    this.matrices.model.shouldUpdate = true
  }

  shouldUpdateModelMatrix() {
    this.matrices.model.shouldUpdate = true
  }

  updateModelMatrix() {
    // compose our model transformation matrix from custom origin
    this.modelMatrix = this.modelMatrix.composeFromOrigin(
      this.position,
      this.quaternion,
      this.scale,
      this.transformOrigin
    )
  }

  updateSizeAndPosition() {
    this.shouldUpdateModelMatrix()
  }
}
