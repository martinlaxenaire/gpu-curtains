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
    __privateAdd(this, _fov);
    /** @ignore */
    __privateAdd(this, _near);
    /** @ignore */
    __privateAdd(this, _far);
    /** @ignore */
    __privateAdd(this, _pixelRatio);
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
   * Get the {@link Camera} {@link Camera.fov | field of view}
   */
  get fov() {
    return __privateGet(this, _fov);
  }
  /**
   * Set the {@link Camera} {@link Camera.fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
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
   * Get the {@link Camera} {@link Camera.near | near} plane value.
   */
  get near() {
    return __privateGet(this, _near);
  }
  /**
   * Set the {@link Camera} {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
   * @param near - new near plane value
   */
  set near(near) {
    near = Math.max(near ?? this.near, 1e-4);
    if (near !== this.near) {
      __privateSet(this, _near, near);
      this.shouldUpdateProjectionMatrices();
    }
  }
  /**
   * Get the {@link Camera} {@link Camera.far | far} plane value.
   */
  get far() {
    return __privateGet(this, _far);
  }
  /**
   * Set the {@link Camera} {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
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
   * Get the {@link Camera} {@link Camera.pixelRatio | pixelRatio} value.
   */
  get pixelRatio() {
    return __privateGet(this, _pixelRatio);
  }
  /**
   * Set the {@link Camera} {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
   * @param pixelRatio - new pixel ratio value
   */
  set pixelRatio(pixelRatio) {
    __privateSet(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
    this.setCSSPerspective();
  }
  /**
   * Set the {@link Camera} {@link RectSize.width | width} and {@link RectSize.height | height}. Update the {@link projectionMatrix} only if the width or height actually changed
   * @param size - width and height values to use
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
  /**
   * Get the current {@link Camera} frustum planes in the [left, right, top, bottom, near, far] order, based on its {@link projectionMatrix} and {@link viewMatrix}.
   * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
   * @readonly
   */
  get frustumPlanes() {
    const tempCamMat4 = new Mat4();
    const tempCamVec3 = new Vec3();
    tempCamMat4.copy(this.projectionMatrix).multiply(this.viewMatrix);
    const { elements } = tempCamMat4;
    const frustumPlanes = [
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4),
      new Float32Array(4)
    ];
    tempCamVec3.set(elements[3] + elements[0], elements[7] + elements[4], elements[11] + elements[8]);
    let l = tempCamVec3.length();
    frustumPlanes[0][0] = tempCamVec3.x / l;
    frustumPlanes[0][1] = tempCamVec3.y / l;
    frustumPlanes[0][2] = tempCamVec3.z / l;
    frustumPlanes[0][3] = (elements[15] + elements[12]) / l;
    tempCamVec3.set(elements[3] - elements[0], elements[7] - elements[4], elements[11] - elements[8]);
    l = tempCamVec3.length();
    frustumPlanes[1][0] = tempCamVec3.x / l;
    frustumPlanes[1][1] = tempCamVec3.y / l;
    frustumPlanes[1][2] = tempCamVec3.z / l;
    frustumPlanes[1][3] = (elements[15] - elements[12]) / l;
    tempCamVec3.set(elements[3] - elements[1], elements[7] - elements[5], elements[11] - elements[9]);
    l = tempCamVec3.length();
    frustumPlanes[2][0] = tempCamVec3.x / l;
    frustumPlanes[2][1] = tempCamVec3.y / l;
    frustumPlanes[2][2] = tempCamVec3.z / l;
    frustumPlanes[2][3] = (elements[15] - elements[13]) / l;
    tempCamVec3.set(elements[3] + elements[1], elements[7] + elements[5], elements[11] + elements[9]);
    l = tempCamVec3.length();
    frustumPlanes[3][0] = tempCamVec3.x / l;
    frustumPlanes[3][1] = tempCamVec3.y / l;
    frustumPlanes[3][2] = tempCamVec3.z / l;
    frustumPlanes[3][3] = (elements[15] + elements[13]) / l;
    tempCamVec3.set(elements[2], elements[6], elements[10]);
    l = tempCamVec3.length();
    frustumPlanes[4][0] = tempCamVec3.x / l;
    frustumPlanes[4][1] = tempCamVec3.y / l;
    frustumPlanes[4][2] = tempCamVec3.z / l;
    frustumPlanes[4][3] = elements[14] / l;
    tempCamVec3.set(elements[3] - elements[2], elements[7] - elements[6], elements[11] - elements[10]);
    l = tempCamVec3.length();
    frustumPlanes[5][0] = tempCamVec3.x / l;
    frustumPlanes[5][1] = tempCamVec3.y / l;
    frustumPlanes[5][2] = tempCamVec3.z / l;
    frustumPlanes[5][3] = (elements[15] - elements[14]) / l;
    return frustumPlanes;
  }
}
_fov = new WeakMap();
_near = new WeakMap();
_far = new WeakMap();
_pixelRatio = new WeakMap();

export { Camera };
