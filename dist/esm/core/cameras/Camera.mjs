import { Mat4 } from '../../math/Mat4.mjs';
import { Object3D } from '../objects3D/Object3D.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { generateUUID } from '../../utils/utils.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _near, _far, _pixelRatio;
class Camera extends Object3D {
  /**
   * Camera constructor
   * @param parameters - {@link CameraParams} used to create our {@link Camera}.
   */
  constructor({
    near = 0.1,
    far = 150,
    pixelRatio = 1,
    onMatricesChanged = () => {
    }
  } = {}) {
    super();
    /** @ignore */
    __privateAdd(this, _near);
    /** @ignore */
    __privateAdd(this, _far);
    /** @ignore */
    __privateAdd(this, _pixelRatio);
    this.uuid = generateUUID();
    this.onMatricesChanged = onMatricesChanged;
  }
  /**
   * Set our transform and projection matrices.
   */
  setMatrices() {
    super.setMatrices();
    this.matrices = {
      ...this.matrices,
      view: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => {
          this.viewMatrix.copy(this.worldMatrix).invert();
        }
      },
      projection: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.updateProjectionMatrix()
      },
      viewProjection: {
        matrix: new Mat4(),
        shouldUpdate: true,
        onUpdate: () => this.viewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.viewMatrix)
      }
    };
  }
  /**
   * Get our view matrix.
   * @readonly
   */
  get viewMatrix() {
    return this.matrices.view.matrix;
  }
  set viewMatrix(value) {
    this.matrices.view.matrix = value;
    this.shouldUpdateViewMatrices();
  }
  /**
   * Get our projection matrix.
   * @readonly
   */
  get projectionMatrix() {
    return this.matrices.projection.matrix;
  }
  set projectionMatrix(value) {
    this.matrices.projection.matrix = value;
    this.shouldUpdateProjectionMatrices();
  }
  /**
   * Get our view projection matrix.
   * @readonly
   */
  get viewProjectionMatrix() {
    return this.matrices.viewProjection.matrix;
  }
  /**
   * Set our view dependent matrices shouldUpdate flag to `true` (tell it to update).
   */
  shouldUpdateViewMatrices() {
    this.matrices.view.shouldUpdate = true;
    this.matrices.viewProjection.shouldUpdate = true;
  }
  /**
   * Set our projection dependent matrices shouldUpdate flag to `true` (tell it to update).
   */
  shouldUpdateProjectionMatrices() {
    this.matrices.projection.shouldUpdate = true;
    this.matrices.viewProjection.shouldUpdate = true;
  }
  /**
   * Update our model matrix and tell our view matrix to update as well.
   */
  updateModelMatrix() {
    super.updateModelMatrix();
    this.setVisibleSize();
    this.shouldUpdateViewMatrices();
  }
  /**
   * Update our view matrix whenever we need to update the world matrix.
   */
  shouldUpdateWorldMatrix() {
    super.shouldUpdateWorldMatrix();
    this.shouldUpdateViewMatrices();
  }
  /**
   * Callback to run when the camera {@link modelMatrix | model matrix} has been updated.
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.onMatricesChanged();
    }
  }
  /**
   * Get the {@link Camera.near | near} plane value.
   */
  get near() {
    return __privateGet(this, _near);
  }
  /**
   * Set the {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed.
   * @param near - New near plane value.
   */
  set near(near) {
    near = Math.max(near ?? this.near, 1e-4);
    if (near !== this.near) {
      __privateSet(this, _near, near);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link Camera.far | far} plane value.
   */
  get far() {
    return __privateGet(this, _far);
  }
  /**
   * Set the {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed.
   * @param far - New far plane value.
   */
  set far(far) {
    far = Math.max(far ?? this.far, this.near + 1);
    if (far !== this.far) {
      __privateSet(this, _far, far);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link Camera.pixelRatio | pixelRatio} value.
   */
  get pixelRatio() {
    return __privateGet(this, _pixelRatio);
  }
  /**
   * Set the {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed.
   * @param pixelRatio - New pixel ratio value.
   */
  set pixelRatio(pixelRatio) {
    __privateSet(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
    this.setCSSPerspective();
  }
  /** @ignore */
  setCSSPerspective() {
    this.CSSPerspective = 0;
  }
  /**
   * Get visible width / height at a given z-depth from our {@link Camera} parameters. Useless for this base class, but will be overriden by children classes.
   * @param depth - Depth to use for calculations.
   * @returns - Visible width and height at given depth.
   */
  getVisibleSizeAtDepth(depth = 0) {
    return {
      width: 0,
      height: 0
    };
  }
  /**
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth();
  }
  /**
   * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}.
   * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
   */
  lookAt(target = new Vec3()) {
    this.updateModelMatrix();
    this.updateWorldMatrix(true, false);
    if (this.actualPosition.x === 0 && this.actualPosition.y !== 0 && this.actualPosition.z === 0) {
      this.up.set(0, 0, 1);
    } else {
      this.up.set(0, 1, 0);
    }
    this.applyLookAt(this.actualPosition, target);
  }
  /**
   * Updates the {@link Camera} {@link projectionMatrix}.
   */
  updateProjectionMatrix() {
  }
}
_near = new WeakMap();
_far = new WeakMap();
_pixelRatio = new WeakMap();

export { Camera };
