import { Vec3 } from '../../math/Vec3.mjs';
import { Quat } from '../../math/Quat.mjs';
import { Mat4 } from '../../math/Mat4.mjs';

let objectIndex = 0;
class Object3D {
  /**
   * Object3D constructor
   */
  constructor() {
    this._parent = null;
    this.children = [];
    Object.defineProperty(this, "object3DIndex", { value: objectIndex++ });
    this.setMatrices();
    this.setTransforms();
  }
  /* PARENT */
  /**
   * Get the parent of this {@link Object3D} if any
   */
  get parent() {
    return this._parent;
  }
  /**
   * Set the parent of this {@link Object3D}
   * @param value - new parent to set, could be an {@link Object3D} or null
   */
  set parent(value) {
    if (this.parent) {
      this.parent.children = this.parent.children.filter((child) => child.object3DIndex !== this.object3DIndex);
    }
    if (value) {
      this.shouldUpdateWorldMatrix();
    }
    this._parent = value;
    this._parent?.children.push(this);
  }
  /* TRANSFORMS */
  /**
   * Set our transforms properties and {@link Vec3#onChange | vectors onChange} callbacks
   */
  setTransforms() {
    this.transforms = {
      origin: {
        model: new Vec3()
      },
      quaternion: new Quat(),
      rotation: new Vec3(),
      position: {
        world: new Vec3()
      },
      scale: new Vec3(1)
    };
    this.rotation.onChange(() => this.applyRotation());
    this.position.onChange(() => this.applyPosition());
    this.scale.onChange(() => this.applyScale());
    this.transformOrigin.onChange(() => this.applyTransformOrigin());
  }
  /**
   * Get our rotation {@link Vec3 | vector}
   */
  get rotation() {
    return this.transforms.rotation;
  }
  /**
   * Set our rotation {@link Vec3 | vector}
   * @param value - new rotation {@link Vec3 | vector}
   */
  set rotation(value) {
    this.transforms.rotation = value;
    this.applyRotation();
  }
  /**
   * Get our {@link Quat | quaternion}
   */
  get quaternion() {
    return this.transforms.quaternion;
  }
  /**
   * Set our {@link Quat | quaternion}
   * @param value - new {@link Quat | quaternion}
   */
  set quaternion(value) {
    this.transforms.quaternion = value;
  }
  /**
   * Get our position {@link Vec3 | vector}
   */
  get position() {
    return this.transforms.position.world;
  }
  /**
   * Set our position {@link Vec3 | vector}
   * @param value - new position {@link Vec3 | vector}
   */
  set position(value) {
    this.transforms.position.world = value;
  }
  /**
   * Get our scale {@link Vec3 | vector}
   */
  get scale() {
    return this.transforms.scale;
  }
  /**
   * Set our scale {@link Vec3 | vector}
   * @param value - new scale {@link Vec3 | vector}
   */
  set scale(value) {
    this.transforms.scale = value;
    this.applyScale();
  }
  /**
   * Get our transform origin {@link Vec3 | vector}
   */
  get transformOrigin() {
    return this.transforms.origin.model;
  }
  /**
   * Set our transform origin {@link Vec3 | vector}
   * @param value - new transform origin {@link Vec3 | vector}
   */
  set transformOrigin(value) {
    this.transforms.origin.model = value;
  }
  /**
   * Apply our rotation and tell our {@link modelMatrix | model matrix} to update
   */
  applyRotation() {
    this.quaternion.setFromVec3(this.rotation);
    this.shouldUpdateModelMatrix();
  }
  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyPosition() {
    this.shouldUpdateModelMatrix();
  }
  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyScale() {
    this.shouldUpdateModelMatrix();
  }
  /**
   * Tell our {@link modelMatrix | model matrix} to update
   */
  applyTransformOrigin() {
    this.shouldUpdateModelMatrix();
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
        onUpdate: () => this.updateModelMatrix()
      },
      world: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.updateWorldMatrix()
      }
    };
  }
  /**
   * Get our {@link Mat4 | model matrix}
   */
  get modelMatrix() {
    return this.matrices.model.matrix;
  }
  /**
   * Set our {@link Mat4 | model matrix}
   * @param value - new {@link Mat4 | model matrix}
   */
  set modelMatrix(value) {
    this.matrices.model.matrix = value;
    this.shouldUpdateModelMatrix();
  }
  /**
   * Set our {@link modelMatrix | model matrix} shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateModelMatrix() {
    this.matrices.model.shouldUpdate = true;
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Get our {@link Mat4 | world matrix}
   */
  get worldMatrix() {
    return this.matrices.world.matrix;
  }
  /**
   * Set our {@link Mat4 | world matrix}
   * @param value - new {@link Mat4 | world matrix}
   */
  set worldMatrix(value) {
    this.matrices.world.matrix = value;
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Set our {@link worldMatrix | world matrix} shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateWorldMatrix() {
    this.matrices.world.shouldUpdate = true;
  }
  /**
   * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}
   * @param target - {@link Vec3 | target} to look at
   */
  lookAt(target = new Vec3()) {
    const rotationMatrix = new Mat4().lookAt(target, this.position);
    this.quaternion.setFromRotationMatrix(rotationMatrix);
    this.shouldUpdateModelMatrix();
  }
  /**
   * Update our {@link modelMatrix | model matrix}
   */
  updateModelMatrix() {
    this.modelMatrix = this.modelMatrix.composeFromOrigin(
      this.position,
      this.quaternion,
      this.scale,
      this.transformOrigin
    );
    this.shouldUpdateWorldMatrix();
  }
  /**
   * Update our {@link worldMatrix | model matrix}
   */
  updateWorldMatrix() {
    if (!this.parent) {
      this.worldMatrix.copy(this.modelMatrix);
    } else {
      this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.modelMatrix);
    }
    for (const child of this.children) {
      child.shouldUpdateWorldMatrix();
    }
  }
  /**
   * Callback to run if at least one matrix of the stack has been updated
   */
  onAfterMatrixStackUpdate() {
  }
  /**
   * Check at each render whether we should update our matrices, and update them if needed
   */
  updateMatrixStack() {
    const matrixShouldUpdate = !!Object.values(this.matrices).find((matrix) => matrix.shouldUpdate);
    if (matrixShouldUpdate) {
      for (const matrixName in this.matrices) {
        if (this.matrices[matrixName].shouldUpdate) {
          this.matrices[matrixName].onUpdate();
          this.matrices[matrixName].shouldUpdate = false;
        }
      }
      this.onAfterMatrixStackUpdate();
    }
    for (const child of this.children) {
      child.updateMatrixStack();
    }
  }
}

export { Object3D };
