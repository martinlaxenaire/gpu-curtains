import { Camera } from './Camera.mjs';

var __typeError = (msg) => {
  throw TypeError(msg);
};
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
var _left, _right, _top, _bottom;
class OrthographicCamera extends Camera {
  /**
   * OrthographicCamera constructor
   * @param parameters - {@link OrthographicCameraParams} used to create our {@link OrthographicCamera}.
   */
  constructor({
    near = 0.1,
    far = 150,
    left = -1,
    right = 1,
    top = 1,
    bottom = -1,
    pixelRatio = 1,
    onMatricesChanged = () => {
    }
  } = {}) {
    super({ near, far, pixelRatio, onMatricesChanged });
    /** @ignore */
    __privateAdd(this, _left);
    /** @ignore */
    __privateAdd(this, _right);
    /** @ignore */
    __privateAdd(this, _top);
    /** @ignore */
    __privateAdd(this, _bottom);
    this.position.set(0, 0, 10);
    this.setOrthographic({ near, far, left, right, top, bottom, pixelRatio });
  }
  /**
   * Get the {@link OrthographicCamera.left | left} frustum plane value.
   */
  get left() {
    return __privateGet(this, _left);
  }
  /**
   * Set the {@link OrthographicCamera.left | left} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param left - New left frustum plane value.
   */
  set left(left) {
    if (left !== this.left) {
      __privateSet(this, _left, left);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link OrthographicCamera.right | right} frustum plane value.
   */
  get right() {
    return __privateGet(this, _right);
  }
  /**
   * Set the {@link OrthographicCamera.right | right} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param right - New right frustum plane value.
   */
  set right(right) {
    if (right !== this.right) {
      __privateSet(this, _right, right);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link OrthographicCamera.top | top} frustum plane value.
   */
  get top() {
    return __privateGet(this, _top);
  }
  /**
   * Set the {@link OrthographicCamera.top | top} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param top - New top frustum plane value.
   */
  set top(top) {
    if (top !== this.top) {
      __privateSet(this, _top, top);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link OrthographicCamera.bottom | bottom} frustum plane value.
   */
  get bottom() {
    return __privateGet(this, _bottom);
  }
  /**
   * Set the {@link OrthographicCamera.bottom | bottom} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
   * @param bottom - New bottom frustum plane value.
   */
  set bottom(bottom) {
    if (bottom !== this.bottom) {
      __privateSet(this, _bottom, bottom);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Sets the {@link OrthographicCamera} orthographic projection settings. Update the {@link projectionMatrix} if needed.
   * @param parameters - {@link OrthographicCameraOptions} to use for the orthographic projection.
   */
  setOrthographic({
    near = this.near,
    far = this.far,
    left = this.left,
    right = this.right,
    top = this.top,
    bottom = this.bottom,
    pixelRatio = this.pixelRatio
  }) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
    this.pixelRatio = pixelRatio;
    this.near = near;
    this.far = far;
  }
  /**
   * Get visible width / height at a given z-depth from our {@link OrthographicCamera} parameters.
   * @param depth - Depth to use for calculations - unused since width and height does not change according to depth in orthographic projection.
   * @returns - Visible width and height.
   */
  getVisibleSizeAtDepth(depth = 0) {
    return {
      width: this.right - this.left,
      height: this.top - this.bottom
    };
  }
  /**
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth();
  }
  /**
   * Updates the {@link OrthographicCamera} {@link projectionMatrix}.
   */
  updateProjectionMatrix() {
    this.projectionMatrix.makeOrthographic({
      left: this.left,
      right: this.right,
      top: this.top,
      bottom: this.bottom,
      near: this.near,
      far: this.far
    });
  }
  /**
   * Get the current {@link OrthographicCamera} frustum planes in the [left, right, top, bottom, near, far] order.
   * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
   * @readonly
   */
  get frustumPlanes() {
    return [
      new Float32Array([1, 0, 0, -this.right]),
      // Left
      new Float32Array([-1, 0, 0, this.left]),
      // Right
      new Float32Array([0, 1, 0, -this.top]),
      // Bottom
      new Float32Array([0, -1, 0, this.bottom]),
      // Top
      new Float32Array([0, 0, 1, -this.near]),
      // Near
      new Float32Array([0, 0, -1, this.far])
      // Far
    ];
  }
}
_left = new WeakMap();
_right = new WeakMap();
_top = new WeakMap();
_bottom = new WeakMap();

export { OrthographicCamera };
