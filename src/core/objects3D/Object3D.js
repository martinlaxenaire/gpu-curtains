import { Vec3 } from '../../math/Vec3'
import { Quat } from '../../math/Quat'
import { Mat4 } from '../../math/Mat4'

export class Object3D {
  constructor() {
    this.setTransforms()
    this.setMatrices()
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

  get modelMatrix() {
    return this.matrices.model.matrix
  }

  set modelMatrix(value) {
    this.matrices.model.matrix = value
    this.matrices.model.shouldUpdate = true
  }

  shouldUpdateModelMatrix(sizeChanged = false) {
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

  /** TRANSFORMS **/

  setTransforms() {
    this.transforms = {
      origin: {
        model: new Vec3(0.5, 0.5, 0),
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
  get rotation() {
    return this.transforms.rotation
  }

  set rotation(value) {
    this.transforms.rotation = value
    this.applyRotation()
  }

  get quaternion() {
    return this.transforms.quaternion
  }

  set quaternion(value) {
    this.transforms.quaternion = value
  }

  get position() {
    return this.transforms.position.world
  }

  set position(value) {
    this.transforms.position.world = value
  }

  get scale() {
    return this.transforms.scale
  }

  set scale(value) {
    // force scale to 1 on Z axis
    value.z = 1
    this.transforms.scale = value
    this.applyScale()
  }

  get transformOrigin() {
    return this.transforms.origin.model
  }

  set transformOrigin(value) {
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
    // TODO update textures matrix...
    //this.resize()

    this.shouldUpdateModelMatrix()
  }

  applyTransformOrigin() {
    this.shouldUpdateModelMatrix()
  }
}
