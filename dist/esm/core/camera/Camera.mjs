import { Mat4 } from '../../math/Mat4.mjs';
import { Object3D } from '../objects3D/Object3D.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { generateUUID } from '../../utils/utils.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  member.set(obj, value);
  return value;
};
var _fov, _near, _far, _pixelRatio;
class Camera extends Object3D {
  /**
   * Camera constructor
   * @param parameters - {@link CameraParams | parameters} used to create our {@link Camera}
   */
  constructor({
    fov = 50,
    near = 0.1,
    far = 150,
    width = 1,
    height = 1,
    pixelRatio = 1,
    onMatricesChanged = () => {
    }
  } = {}) {
    super();
    /** @ignore */
    __privateAdd(this, _fov, void 0);
    /** @ignore */
    __privateAdd(this, _near, void 0);
    /** @ignore */
    __privateAdd(this, _far, void 0);
    /** @ignore */
    __privateAdd(this, _pixelRatio, void 0);
    this.uuid = generateUUID();
    this.position.set(0, 0, 10);
    this.up = new Vec3(0, 1, 0);
    this.onMatricesChanged = onMatricesChanged;
    this.size = {
      width: 1,
      height: 1
    };
    this.setPerspective({ fov, near, far, width, height, pixelRatio });
  }
  /**
   * Set our transform and projection matrices
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
   * Get our view matrix
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
   * Get our projection matrix
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
   * Get our view projection matrix
   * @readonly
   */
  get viewProjectionMatrix() {
    return this.matrices.viewProjection.matrix;
  }
  /**
   * Set our view dependent matrices shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateViewMatrices() {
    this.matrices.view.shouldUpdate = true;
    this.matrices.viewProjection.shouldUpdate = true;
  }
  /**
   * Set our projection dependent matrices shouldUpdate flag to true (tell it to update)
   */
  shouldUpdateProjectionMatrices() {
    this.matrices.projection.shouldUpdate = true;
    this.matrices.viewProjection.shouldUpdate = true;
  }
  /**
   * Update our model matrix and tell our view matrix to update as well
   */
  updateModelMatrix() {
    super.updateModelMatrix();
    this.setVisibleSize();
    this.shouldUpdateViewMatrices();
  }
  /**
   * Update our world matrix and tell our view matrix to update as well
   */
  updateWorldMatrix() {
    super.updateWorldMatrix();
    this.shouldUpdateViewMatrices();
  }
  /**
   * Callback to run when the camera {@link modelMatrix | model matrix} has been updated
   */
  updateMatrixStack() {
    super.updateMatrixStack();
    if (this.matricesNeedUpdate) {
      this.onMatricesChanged();
    }
  }
  /**
   * Get the {@link Camera} {@link fov | field of view}
   */
  get fov() {
    return __privateGet(this, _fov);
  }
  /**
   * Set the {@link Camera} {@link fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
   * @param fov - new field of view
   */
  set fov(fov) {
    fov = Math.max(1, Math.min(fov ?? this.fov, 179));
    if (fov !== this.fov) {
      __privateSet(this, _fov, fov);
      this.shouldUpdateProjectionMatrices();
    }
    this.setVisibleSize();
    this.setCSSPerspective();
  }
  /**
   * Get the {@link Camera} {@link near} plane value.
   */
  get near() {
    return __privateGet(this, _near);
  }
  /**
   * Set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
   * @param near - new near plane value
   */
  set near(near) {
    near = Math.max(near ?? this.near, 0.01);
    if (near !== this.near) {
      __privateSet(this, _near, near);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get / set the {@link Camera} {@link far} plane value.
   */
  get far() {
    return __privateGet(this, _far);
  }
  /**
   * Set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
   * @param far - new far plane value
   */
  set far(far) {
    far = Math.max(far ?? this.far, this.near + 1);
    if (far !== this.far) {
      __privateSet(this, _far, far);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link Camera} {@link pixelRatio} value.
   */
  get pixelRatio() {
    return __privateGet(this, _pixelRatio);
  }
  /**
   * Set the {@link Camera} {@link pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
   * @param pixelRatio - new pixel ratio value
   */
  set pixelRatio(pixelRatio) {
    __privateSet(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
    this.setCSSPerspective();
  }
  /**
   * Set the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
   * @param size - {@link width} and {@link height} values to use
   */
  setSize({ width, height }) {
    if (width !== this.size.width || height !== this.size.height) {
      this.shouldUpdateProjectionMatrices();
    }
    this.size.width = width;
    this.size.height = height;
    this.setVisibleSize();
    this.setCSSPerspective();
  }
  /**
   * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if needed.
   * @param parameters - {@link CameraPerspectiveOptions | parameters} to use for the perspective
   */
  setPerspective({
    fov = this.fov,
    near = this.near,
    far = this.far,
    width = this.size.width,
    height = this.size.height,
    pixelRatio = this.pixelRatio
  } = {}) {
    this.setSize({ width, height });
    this.pixelRatio = pixelRatio;
    this.fov = fov;
    this.near = near;
    this.far = far;
  }
  /**
   * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.<br>
   * Used to translate planes along the Z axis using pixel units as CSS would do.<br>
   * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
   */
  setCSSPerspective() {
    this.CSSPerspective = Math.pow(
      Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
      0.5
    ) / Math.tan(this.fov * 0.5 * Math.PI / 180);
  }
  /**
   * Get visible width / height at a given z-depth from our {@link Camera} parameters.<br>
   * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}
   * @param depth - depth to use for calculations
   * @returns - visible width and height at given depth
   */
  getVisibleSizeAtDepth(depth = 0) {
    const cameraOffset = this.position.z;
    if (depth < cameraOffset) {
      depth -= cameraOffset;
    } else {
      depth += cameraOffset;
    }
    const vFOV = this.fov * Math.PI / 180;
    const height = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
    return {
      width: height * this.size.width / this.size.height,
      height
    };
  }
  /**
   * Sets visible width / height at a depth of 0.
   */
  setVisibleSize() {
    this.visibleSize = this.getVisibleSizeAtDepth();
  }
  /**
   * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}
   * @param target - {@link Vec3 | target} to look at
   * @param position - {@link Vec3 | postion} from which to look at
   */
  lookAt(target = new Vec3(), position = this.position) {
    super.lookAt(position, target, this.up);
  }
  /**
   * Updates the {@link Camera} {@link projectionMatrix}
   */
  updateProjectionMatrix() {
    this.projectionMatrix.makePerspective({
      fov: this.fov,
      aspect: this.size.width / this.size.height,
      near: this.near,
      far: this.far
    });
  }
}
_fov = new WeakMap();
_near = new WeakMap();
_far = new WeakMap();
_pixelRatio = new WeakMap();

export { Camera };
