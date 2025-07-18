(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.window = global.window || {}));
})(this, (function (exports) { 'use strict';

  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === "x" ? r : r & 3 | 8;
      return v.toString(16).toUpperCase();
    });
  };
  const toCamelCase = (string) => {
    return string.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, "");
  };
  const toKebabCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  let warningThrown = 0;
  const throwWarning = (warning) => {
    if (warningThrown > 100) {
      return;
    } else if (warningThrown === 100) {
      console.warn("GPUCurtains: too many warnings thrown, stop logging.");
    } else {
      console.warn(warning);
    }
    warningThrown++;
  };
  const throwError = (error) => {
    throw new Error(error);
  };

  class Quat {
    /**
     * Quat constructor
     * @param [elements] - initial array to use
     * @param [axisOrder='XYZ'] - axis order to use
     */
    constructor(elements = new Float32Array([0, 0, 0, 1]), axisOrder = "XYZ") {
      this.type = "Quat";
      this.elements = elements;
      this.axisOrder = axisOrder;
    }
    /**
     * Sets the {@link Quat} values from an array
     * @param array - an array of at least 4 elements
     * @returns - this {@link Quat} after being set
     */
    setFromArray(array = new Float32Array([0, 0, 0, 1])) {
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      return this;
    }
    /**
     * Sets the {@link Quat} axis order
     * @param axisOrder - axis order to use
     * @returns - this {@link Quat} after axis order has been set
     */
    setAxisOrder(axisOrder = "XYZ") {
      axisOrder = axisOrder.toUpperCase();
      switch (axisOrder) {
        case "XYZ":
        case "YXZ":
        case "ZXY":
        case "ZYX":
        case "YZX":
        case "XZY":
          this.axisOrder = axisOrder;
          break;
        default:
          this.axisOrder = "XYZ";
      }
      return this;
    }
    /**
     * Copy a {@link Quat} into this {@link Quat}
     * @param quaternion - {@link Quat} to copy
     * @returns - this {@link Quat} after copy
     */
    copy(quaternion = new Quat()) {
      this.elements.set(quaternion.elements);
      this.axisOrder = quaternion.axisOrder;
      return this;
    }
    /**
     * Clone a {@link Quat}
     * @returns - cloned {@link Quat}
     */
    clone() {
      return new Quat().copy(this);
    }
    /**
     * Check if 2 {@link Quat} are equal
     * @param quaternion - {@link Quat} to check against
     * @returns - whether the {@link Quat} are equal or not
     */
    equals(quaternion = new Quat()) {
      return this.elements[0] === quaternion.elements[0] && this.elements[1] === quaternion.elements[1] && this.elements[2] === quaternion.elements[2] && this.elements[3] === quaternion.elements[3] && this.axisOrder === quaternion.axisOrder;
    }
    /**
     * Sets a rotation {@link Quat} using Euler angles {@link Vec3 | vector} and its axis order
     * @param vector - rotation {@link Vec3 | vector} to set our {@link Quat} from
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromVec3(vector) {
      const ax = vector.x * 0.5;
      const ay = vector.y * 0.5;
      const az = vector.z * 0.5;
      const cosx = Math.cos(ax);
      const cosy = Math.cos(ay);
      const cosz = Math.cos(az);
      const sinx = Math.sin(ax);
      const siny = Math.sin(ay);
      const sinz = Math.sin(az);
      if (this.axisOrder === "XYZ") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "YXZ") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      } else if (this.axisOrder === "ZXY") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "ZYX") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      } else if (this.axisOrder === "YZX") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "XZY") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      }
      return this;
    }
    /**
     * Set a {@link Quat} from a rotation axis {@link Vec3 | vector} and an angle
     * @param axis - normalized {@link Vec3 | vector} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromAxisAngle(axis, angle = 0) {
      const halfAngle = angle / 2, s = Math.sin(halfAngle);
      this.elements[0] = axis.x * s;
      this.elements[1] = axis.y * s;
      this.elements[2] = axis.z * s;
      this.elements[3] = Math.cos(halfAngle);
      return this;
    }
    /**
     * Set a {@link Quat} from a rotation {@link Mat4 | matrix}
     * @param matrix - rotation {@link Mat4 | matrix} to use
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromRotationMatrix(matrix) {
      const te = matrix.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
      if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        this.elements[3] = 0.25 / s;
        this.elements[0] = (m32 - m23) * s;
        this.elements[1] = (m13 - m31) * s;
        this.elements[2] = (m21 - m12) * s;
      } else if (m11 > m22 && m11 > m33) {
        const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
        this.elements[3] = (m32 - m23) / s;
        this.elements[0] = 0.25 * s;
        this.elements[1] = (m12 + m21) / s;
        this.elements[2] = (m13 + m31) / s;
      } else if (m22 > m33) {
        const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
        this.elements[3] = (m13 - m31) / s;
        this.elements[0] = (m12 + m21) / s;
        this.elements[1] = 0.25 * s;
        this.elements[2] = (m23 + m32) / s;
      } else {
        const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
        this.elements[3] = (m21 - m12) / s;
        this.elements[0] = (m13 + m31) / s;
        this.elements[1] = (m23 + m32) / s;
        this.elements[2] = 0.25 * s;
      }
      return this;
    }
    /**
     * Get the square length of this {@link Quat}.
     * @returns - square length of this {@link Quat}.
     */
    lengthSq() {
      return this.elements[0] * this.elements[0] + this.elements[1] * this.elements[1] + this.elements[2] * this.elements[2] + this.elements[3] * this.elements[3];
    }
    /**
     * Get the length of this {@link Quat}.
     * @returns - length of this {@link Quat}.
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this {@link Quat}.
     * @returns - normalized {@link Quat}.
     */
    normalize() {
      let l = this.length();
      if (l === 0) {
        this.elements[0] = 0;
        this.elements[1] = 0;
        this.elements[2] = 0;
        this.elements[3] = 1;
      } else {
        l = 1 / l;
        this.elements[0] = this.elements[0] * l;
        this.elements[1] = this.elements[1] * l;
        this.elements[2] = this.elements[2] * l;
        this.elements[3] = this.elements[3] * l;
      }
      return this;
    }
    /**
     * Calculate the spherical linear interpolation of this {@link Quat} by given {@link Quat} and alpha, where alpha is the percent distance.
     * @param quat - {@link Quat} to interpolate towards.
     * @param alpha - spherical interpolation factor in the [0, 1] interval.
     * @returns - this {@link Quat} after spherical linear interpolation.
     */
    slerp(quat = new Quat(), alpha = 0) {
      if (alpha === 0) return this;
      if (alpha === 1) return this.copy(quat);
      const x = this.elements[0], y = this.elements[1], z = this.elements[2], w = this.elements[3];
      let cosHalfTheta = w * quat.elements[3] + x * quat.elements[0] + y * quat.elements[1] + z * quat.elements[2];
      if (cosHalfTheta < 0) {
        this.elements[3] = -quat.elements[3];
        this.elements[0] = -quat.elements[0];
        this.elements[1] = -quat.elements[1];
        this.elements[2] = -quat.elements[2];
        cosHalfTheta = -cosHalfTheta;
      } else {
        this.copy(quat);
      }
      if (cosHalfTheta >= 1) {
        this.elements[3] = w;
        this.elements[0] = x;
        this.elements[1] = y;
        this.elements[2] = z;
        return this;
      }
      const sqrSinHalfTheta = 1 - cosHalfTheta * cosHalfTheta;
      if (sqrSinHalfTheta <= Number.EPSILON) {
        const s = 1 - alpha;
        this.elements[3] = s * w + alpha * this.elements[3];
        this.elements[0] = s * x + alpha * this.elements[0];
        this.elements[1] = s * y + alpha * this.elements[1];
        this.elements[2] = s * z + alpha * this.elements[2];
        this.normalize();
        return this;
      }
      const sinHalfTheta = Math.sqrt(sqrSinHalfTheta);
      const halfTheta = Math.atan2(sinHalfTheta, cosHalfTheta);
      const ratioA = Math.sin((1 - alpha) * halfTheta) / sinHalfTheta, ratioB = Math.sin(alpha * halfTheta) / sinHalfTheta;
      this.elements[3] = w * ratioA + this.elements[3] * ratioB;
      this.elements[0] = x * ratioA + this.elements[0] * ratioB;
      this.elements[1] = y * ratioA + this.elements[1] * ratioB;
      this.elements[2] = z * ratioA + this.elements[2] * ratioB;
      return this;
    }
  }

  class Vec3 {
    /**
     * Vec3 constructor
     * @param x - X component of our {@link Vec3}
     * @param y - Y component of our {@link Vec3}
     * @param z - Z component of our {@link Vec3}
     */
    constructor(x = 0, y = x, z = x) {
      this.type = "Vec3";
      this._x = x;
      this._y = y;
      this._z = z;
    }
    /**
     * Get the X component of the {@link Vec3}
     */
    get x() {
      return this._x;
    }
    /**
     * Set the X component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Y component of the {@link Vec3}
     */
    get y() {
      return this._y;
    }
    /**
     * Set the Y component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Z component of the {@link Vec3}
     */
    get z() {
      return this._z;
    }
    /**
     * Set the Z component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Z component to set
     */
    set z(value) {
      const changed = value !== this._z;
      this._z = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the {@link Vec3} has changed
     * @param callback - callback to run when at least one component of the {@link Vec3} has changed
     * @returns - our {@link Vec3}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the {@link Vec3} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @param z - new Z component to set
     * @returns - this {@link Vec3} after being set
     */
    set(x = 0, y = x, z = x) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    /**
     * Add a {@link Vec3} to this {@link Vec3}
     * @param vector - {@link Vec3} to add
     * @returns - this {@link Vec3} after addition
     */
    add(vector = new Vec3()) {
      this.x += vector.x;
      this.y += vector.y;
      this.z += vector.z;
      return this;
    }
    /**
     * Add a scalar to all the components of this {@link Vec3}
     * @param value - number to add
     * @returns - this {@link Vec3} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      this.z += value;
      return this;
    }
    /**
     * Subtract a {@link Vec3} from this {@link Vec3}
     * @param vector - {@link Vec3} to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    sub(vector = new Vec3()) {
      this.x -= vector.x;
      this.y -= vector.y;
      this.z -= vector.z;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this {@link Vec3}
     * @param value - number to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      this.z -= value;
      return this;
    }
    /**
     * Multiply a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiply(vector = new Vec3(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      this.z *= vector.z;
      return this;
    }
    /**
     * Multiply all components of this {@link Vec3} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      this.z *= value;
      return this;
    }
    /**
     * Divide a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to divide with
     * @returns - this {@link Vec3} after division
     */
    divide(vector = new Vec3(1)) {
      this.x /= vector.x;
      this.y /= vector.y;
      this.z /= vector.z;
      return this;
    }
    /**
     * Divide all components of this {@link Vec3} with a scalar
     * @param value - number to divide with
     * @returns - this {@link Vec3} after division
     */
    divideScalar(value = 1) {
      this.x /= value;
      this.y /= value;
      this.z /= value;
      return this;
    }
    /**
     * Copy a {@link Vec3} into this {@link Vec3}
     * @param vector - {@link Vec3} to copy
     * @returns - this {@link Vec3} after copy
     */
    copy(vector = new Vec3()) {
      this.x = vector.x;
      this.y = vector.y;
      this.z = vector.z;
      return this;
    }
    /**
     * Clone this {@link Vec3}
     * @returns - cloned {@link Vec3}
     */
    clone() {
      return new Vec3(this.x, this.y, this.z);
    }
    /**
     * Apply max values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing max values
     * @returns - {@link Vec3} with max values applied
     */
    max(vector = new Vec3()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      this.z = Math.max(this.z, vector.z);
      return this;
    }
    /**
     * Apply min values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing min values
     * @returns - {@link Vec3} with min values applied
     */
    min(vector = new Vec3()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      this.z = Math.min(this.z, vector.z);
      return this;
    }
    /**
     * Clamp this {@link Vec3} components by min and max {@link Vec3} vectors
     * @param min - minimum {@link Vec3} components to compare with
     * @param max - maximum {@link Vec3} components to compare with
     * @returns - clamped {@link Vec3}
     */
    clamp(min = new Vec3(), max = new Vec3()) {
      this.x = Math.max(min.x, Math.min(max.x, this.x));
      this.y = Math.max(min.y, Math.min(max.y, this.y));
      this.z = Math.max(min.z, Math.min(max.z, this.z));
      return this;
    }
    /**
     * Check if 2 {@link Vec3} are equal
     * @param vector - {@link Vec3} to compare
     * @returns - whether the {@link Vec3} are equals or not
     */
    equals(vector = new Vec3()) {
      return this.x === vector.x && this.y === vector.y && this.z === vector.z;
    }
    /**
     * Get the square length of this {@link Vec3}
     * @returns - square length of this {@link Vec3}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    /**
     * Get the length of this {@link Vec3}
     * @returns - length of this {@link Vec3}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Get the euclidian distance between this {@link Vec3} and another {@link Vec3}
     * @param vector - {@link Vec3} to use for distance calculation
     * @returns - euclidian distance
     */
    distance(vector = new Vec3()) {
      return Math.hypot(vector.x - this.x, vector.y - this.y, vector.z - this.z);
    }
    /**
     * Normalize this {@link Vec3}
     * @returns - normalized {@link Vec3}
     */
    normalize() {
      let len = this.lengthSq();
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      this.z *= len;
      return this;
    }
    /**
     * Calculate the dot product of 2 {@link Vec3}
     * @param vector - {@link Vec3} to use for dot product
     * @returns - dot product of the 2 {@link Vec3}
     */
    dot(vector = new Vec3()) {
      return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }
    /**
     * Get the cross product of this {@link Vec3} with another {@link Vec3}
     * @param vector - {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    cross(vector = new Vec3()) {
      return this.crossVectors(this, vector);
    }
    /**
     * Set this {@link Vec3} as the result of the cross product of two {@link Vec3}
     * @param a - first {@link Vec3} to use for cross product
     * @param b - second {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    crossVectors(a = new Vec3(), b = new Vec3()) {
      const ax = a.x, ay = a.y, az = a.z;
      const bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by;
      this.y = az * bx - ax * bz;
      this.z = ax * by - ay * bx;
      return this;
    }
    /**
     * Calculate the linear interpolation of this {@link Vec3} by given {@link Vec3} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec3} to interpolate towards
     * @param alpha - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec3} after linear interpolation
     */
    lerp(vector = new Vec3(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      this.z += (vector.z - this.z) * alpha;
      return this;
    }
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Vec3}
     * Useful to convert a position {@link Vec3} from plane local world to webgl space using projection view matrix for example
     * Source code from: http://glmatrix.net/docs/vec3.js.html
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix) {
      const x = this._x, y = this._y, z = this._z;
      const mArray = matrix.elements;
      let w = mArray[3] * x + mArray[7] * y + mArray[11] * z + mArray[15];
      w = w || 1;
      this.x = (mArray[0] * x + mArray[4] * y + mArray[8] * z + mArray[12]) / w;
      this.y = (mArray[1] * x + mArray[5] * y + mArray[9] * z + mArray[13]) / w;
      this.z = (mArray[2] * x + mArray[6] * y + mArray[10] * z + mArray[14]) / w;
      return this;
    }
    /**
     * Set this {@link Vec3} to the translation component of a {@link Mat4 | matrix}.
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application.
     */
    setFromMatrixPosition(matrix) {
      const e = matrix.elements;
      this.x = e[12];
      this.y = e[13];
      this.z = e[14];
      return this;
    }
    /**
     * Apply a {@link Quat | quaternion} (rotation in 3D space) to this {@link Vec3}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - this {@link Vec3} with the transformation applied
     */
    applyQuat(quaternion = new Quat()) {
      const x = this.x, y = this.y, z = this.z;
      const qx = quaternion.elements[0], qy = quaternion.elements[1], qz = quaternion.elements[2], qw = quaternion.elements[3];
      const tx = 2 * (qy * z - qz * y);
      const ty = 2 * (qz * x - qx * z);
      const tz = 2 * (qx * y - qy * x);
      this.x = x + qw * tx + qy * tz - qz * ty;
      this.y = y + qw * ty + qz * tx - qx * tz;
      this.z = z + qw * tz + qx * ty - qy * tx;
      return this;
    }
    /**
     * Rotate a {@link Vec3} around and axis by a given angle
     * @param axis - normalized {@link Vec3} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @param quaternion - optional {@link Quat | quaternion} to use for rotation computations
     * @returns - this {@link Vec3} with the rotation applied
     */
    applyAxisAngle(axis = new Vec3(), angle = 0, quaternion = new Quat()) {
      return this.applyQuat(quaternion.setFromAxisAngle(axis, angle));
    }
    /**
     * Transforms the direction of this vector by a {@link Mat4} (the upper left 3 x 3 subset) and then normalizes the result.
     * @param matrix - {@link Mat4} to use for transformation.
     * @returns - this {@link Vec3} with the transformation applied.
     */
    transformDirection(matrix) {
      const x = this.x, y = this.y, z = this.z;
      const e = matrix.elements;
      this.x = e[0] * x + e[4] * y + e[8] * z;
      this.y = e[1] * x + e[5] * y + e[9] * z;
      this.z = e[2] * x + e[6] * y + e[10] * z;
      return this.normalize();
    }
    /**
     * Project a 3D coordinate {@link Vec3} to a 2D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - projected {@link Vec3}
     */
    project(camera) {
      this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix);
      return this;
    }
    /**
     * Unproject a 2D coordinate {@link Vec3} to 3D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - unprojected {@link Vec3}
     */
    unproject(camera) {
      this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix);
      return this;
    }
  }

  const xAxis = new Vec3();
  const yAxis = new Vec3();
  const zAxis = new Vec3();
  class Mat4 {
    // prettier-ignore
    /**
     * Mat4 constructor
     * @param elements - initial array to use, default to identity matrix
     */
    constructor(elements = new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ])) {
      this.type = "Mat4";
      this.elements = elements;
    }
    /***
     * Sets the matrix from 16 numbers
     *
     * @param n11 - number
     * @param n12 - number
     * @param n13 - number
     * @param n14 - number
     * @param n21 - number
     * @param n22 - number
     * @param n23 - number
     * @param n24 - number
     * @param n31 - number
     * @param n32 - number
     * @param n33 - number
     * @param n34 - number
     * @param n41 - number
     * @param n42 - number
     * @param n43 - number
     * @param n44 - number
     *
     * @returns - this {@link Mat4} after being set
     */
    set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
      const te = this.elements;
      te[0] = n11;
      te[1] = n12;
      te[2] = n13;
      te[3] = n14;
      te[4] = n21;
      te[5] = n22;
      te[6] = n23;
      te[7] = n24;
      te[8] = n31;
      te[9] = n32;
      te[10] = n33;
      te[11] = n34;
      te[12] = n41;
      te[13] = n42;
      te[14] = n43;
      te[15] = n44;
      return this;
    }
    /**
     * Sets the {@link Mat4} to an identity matrix
     * @returns - this {@link Mat4} after being set
     */
    identity() {
      this.set(
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets the {@link Mat4} values from an array
     * @param array - array to use
     * @param offset - optional offset in the array to use
     * @returns - this {@link Mat4} after being set
     */
    // prettier-ignore
    setFromArray(array = new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ]), offset = 0) {
      for (let i = 0; i < this.elements.length; i++) {
        this.elements[i] = array[i + offset];
      }
      return this;
    }
    /**
     * Copy another {@link Mat4}
     * @param matrix - matrix to copy
     * @returns - this {@link Mat4} after being set
     */
    copy(matrix = new Mat4()) {
      const array = matrix.elements;
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      this.elements[4] = array[4];
      this.elements[5] = array[5];
      this.elements[6] = array[6];
      this.elements[7] = array[7];
      this.elements[8] = array[8];
      this.elements[9] = array[9];
      this.elements[10] = array[10];
      this.elements[11] = array[11];
      this.elements[12] = array[12];
      this.elements[13] = array[13];
      this.elements[14] = array[14];
      this.elements[15] = array[15];
      return this;
    }
    /**
     * Clone a {@link Mat4}
     * @returns - cloned {@link Mat4}
     */
    clone() {
      return new Mat4().copy(this);
    }
    /**
     * Multiply this {@link Mat4} with another {@link Mat4}.
     * @param matrix - {@link Mat4} to multiply with.
     * @returns - this {@link Mat4} after multiplication.
     */
    multiply(matrix = new Mat4()) {
      return this.multiplyMatrices(this, matrix);
    }
    /**
     * Multiply another {@link Mat4} with this {@link Mat4}.
     * @param matrix - {@link Mat4} to multiply with.
     * @returns - this {@link Mat4} after multiplication.
     */
    premultiply(matrix = new Mat4()) {
      return this.multiplyMatrices(matrix, this);
    }
    /**
     * Multiply two {@link Mat4}.
     * @param a - first {@link Mat4}.
     * @param b - second {@link Mat4}.
     * @returns - {@link Mat4} resulting from the multiplication.
     */
    multiplyMatrices(a = new Mat4(), b = new Mat4()) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
      const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
      const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
      const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
      te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
      te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
      te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
      te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
      te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
      te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
      te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
      te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
      te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
      te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
      te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
      te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
      te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector)).
     * @param vector - translation {@link Vec3} to use.
     * @returns - this {@link Mat4} after the premultiply translate operation.
     */
    premultiplyTranslate(vector = new Vec3()) {
      const a11 = 1;
      const a22 = 1;
      const a33 = 1;
      const a44 = 1;
      const a14 = vector.x;
      const a24 = vector.y;
      const a34 = vector.z;
      const be = this.elements;
      const te = this.elements;
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11 + a14 * b41;
      te[4] = a11 * b12 + a14 * b42;
      te[8] = a11 * b13 + a14 * b43;
      te[12] = a11 * b14 + a14 * b44;
      te[1] = a22 * b21 + a24 * b41;
      te[5] = a22 * b22 + a24 * b42;
      te[9] = a22 * b23 + a24 * b43;
      te[13] = a22 * b24 + a24 * b44;
      te[2] = a33 * b31 + a34 * b41;
      te[6] = a33 * b32 + a34 * b42;
      te[10] = a33 * b33 + a34 * b43;
      te[14] = a33 * b34 + a34 * b44;
      te[3] = a44 * b41;
      te[7] = a44 * b42;
      te[11] = a44 * b43;
      te[15] = a44 * b44;
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector)).
     * @param vector - scale {@link Vec3 | vector} to use.
     * @returns - this {@link Mat4} after the premultiply scale operation.
     */
    premultiplyScale(vector = new Vec3()) {
      const be = this.elements;
      const te = this.elements;
      const a11 = vector.x;
      const a22 = vector.y;
      const a33 = vector.z;
      const a44 = 1;
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11;
      te[4] = a11 * b12;
      te[8] = a11 * b13;
      te[12] = a11 * b14;
      te[1] = a22 * b21;
      te[5] = a22 * b22;
      te[9] = a22 * b23;
      te[13] = a22 * b24;
      te[2] = a33 * b31;
      te[6] = a33 * b32;
      te[10] = a33 * b33;
      te[14] = a33 * b34;
      te[3] = a44 * b41;
      te[7] = a44 * b42;
      te[11] = a44 * b43;
      te[15] = a44 * b44;
      return this;
    }
    /**
     * Get the {@link Mat4} inverse
     * @returns - the inverted {@link Mat4}
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
      const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
      if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
      te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
      te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
      te[4] = t12 * detInv;
      te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
      te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
      te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
      te[8] = t13 * detInv;
      te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
      te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
      te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
      te[12] = t14 * detInv;
      te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
      te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
      te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
      return this;
    }
    /**
     * Clone and invert the {@link Mat4}
     * @returns - inverted cloned {@link Mat4}
     */
    getInverse() {
      return this.clone().invert();
    }
    /**
     * Transpose this {@link Mat4}
     * @returns - the transposed {@link Mat4}
     */
    transpose() {
      let t;
      const te = this.elements;
      t = te[1];
      te[1] = te[4];
      te[4] = t;
      t = te[2];
      te[2] = te[8];
      te[8] = t;
      t = te[3];
      te[3] = te[12];
      te[12] = t;
      t = te[6];
      te[6] = te[9];
      te[9] = t;
      t = te[7];
      te[7] = te[13];
      te[13] = t;
      t = te[11];
      te[11] = te[14];
      te[14] = t;
      return this;
    }
    /**
     * Translate a {@link Mat4}.
     * @param vector - translation {@link Vec3} to use.
     * @returns - translated {@link Mat4}.
     */
    translate(vector = new Vec3()) {
      const a = this.elements;
      a[12] = a[0] * vector.x + a[4] * vector.y + a[8] * vector.z + a[12];
      a[13] = a[1] * vector.x + a[5] * vector.y + a[9] * vector.z + a[13];
      a[14] = a[2] * vector.x + a[6] * vector.y + a[10] * vector.z + a[14];
      a[15] = a[3] * vector.x + a[7] * vector.y + a[11] * vector.z + a[15];
      return this;
    }
    /**
     * Get the translation {@link Vec3} component of a {@link Mat4}
     * @param position - {@link Vec3} to set
     * @returns - translation {@link Vec3} component of this {@link Mat4}
     */
    getTranslation(position = new Vec3()) {
      return position.set(this.elements[12], this.elements[13], this.elements[14]);
    }
    /**
     * Scale a {@link Mat4}
     * @param vector - scale {@link Vec3 | vector} to use
     * @returns - scaled {@link Mat4}
     */
    scale(vector = new Vec3()) {
      const a = this.elements;
      a[0] *= vector.x;
      a[1] *= vector.x;
      a[2] *= vector.x;
      a[3] *= vector.x;
      a[4] *= vector.y;
      a[5] *= vector.y;
      a[6] *= vector.y;
      a[7] *= vector.y;
      a[8] *= vector.z;
      a[9] *= vector.z;
      a[10] *= vector.z;
      a[11] *= vector.z;
      return this;
    }
    /**
     * Rotate a {@link Mat4} from a {@link Quat | quaternion}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - rotated {@link Mat4}
     */
    rotateFromQuaternion(quaternion = new Quat()) {
      const te = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      te[0] = 1 - (yy + zz);
      te[4] = xy - wz;
      te[8] = xz + wy;
      te[1] = xy + wz;
      te[5] = 1 - (xx + zz);
      te[9] = yz - wx;
      te[2] = xz - wy;
      te[6] = yz + wx;
      te[10] = 1 - (xx + yy);
      return this;
    }
    /**
     * Get the maximum scale of the {@link Mat4} on all axes
     * @returns - maximum scale of the {@link Mat4}
     */
    getMaxScaleOnAxis() {
      const te = this.elements;
      const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
      const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
      const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
      return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
    }
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation {@link Vec3 | vector} to use
     * @param quaternion - {@link Quat | quaternion} to use
     * @param scale - translation {@link Vec3 | vector} to use
     * @returns - transformed {@link Mat4}
     */
    compose(translation = new Vec3(), quaternion = new Quat(), scale = new Vec3(1)) {
      const matrix = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;
      const sx = scale.x;
      const sy = scale.y;
      const sz = scale.z;
      matrix[0] = (1 - (yy + zz)) * sx;
      matrix[1] = (xy + wz) * sx;
      matrix[2] = (xz - wy) * sx;
      matrix[3] = 0;
      matrix[4] = (xy - wz) * sy;
      matrix[5] = (1 - (xx + zz)) * sy;
      matrix[6] = (yz + wx) * sy;
      matrix[7] = 0;
      matrix[8] = (xz + wy) * sz;
      matrix[9] = (yz - wx) * sz;
      matrix[10] = (1 - (xx + yy)) * sz;
      matrix[11] = 0;
      matrix[12] = translation.x;
      matrix[13] = translation.y;
      matrix[14] = translation.z;
      matrix[15] = 1;
      return this;
    }
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale, rotating and scaling around the given {@link Vec3 | origin vector}
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation {@link Vec3 | vector} to use
     * @param quaternion - {@link Quat | quaternion} to use
     * @param scale - translation {@link Vec3 | vector} to use
     * @param origin - origin {@link Vec3 | vector} around which to scale and rotate
     * @returns - transformed {@link Mat4}
     */
    composeFromOrigin(translation = new Vec3(), quaternion = new Quat(), scale = new Vec3(1), origin = new Vec3()) {
      const matrix = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;
      const sx = scale.x;
      const sy = scale.y;
      const sz = scale.z;
      const ox = origin.x;
      const oy = origin.y;
      const oz = origin.z;
      const out0 = (1 - (yy + zz)) * sx;
      const out1 = (xy + wz) * sx;
      const out2 = (xz - wy) * sx;
      const out4 = (xy - wz) * sy;
      const out5 = (1 - (xx + zz)) * sy;
      const out6 = (yz + wx) * sy;
      const out8 = (xz + wy) * sz;
      const out9 = (yz - wx) * sz;
      const out10 = (1 - (xx + yy)) * sz;
      matrix[0] = out0;
      matrix[1] = out1;
      matrix[2] = out2;
      matrix[3] = 0;
      matrix[4] = out4;
      matrix[5] = out5;
      matrix[6] = out6;
      matrix[7] = 0;
      matrix[8] = out8;
      matrix[9] = out9;
      matrix[10] = out10;
      matrix[11] = 0;
      matrix[12] = translation.x + ox - (out0 * ox + out4 * oy + out8 * oz);
      matrix[13] = translation.y + oy - (out1 * ox + out5 * oy + out9 * oz);
      matrix[14] = translation.z + oz - (out2 * ox + out6 * oy + out10 * oz);
      matrix[15] = 1;
      return this;
    }
    /**
     * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}
     * @param eye - {@link Vec3 | position vector} of the object that should be rotated
     * @param target - {@link Vec3 | target vector} to look at
     * @param up - up {@link Vec3 | vector}
     * @returns - rotated {@link Mat4}
     */
    lookAt(eye = new Vec3(), target = new Vec3(), up = new Vec3(0, 1, 0)) {
      const te = this.elements;
      zAxis.copy(eye).sub(target);
      if (zAxis.lengthSq() === 0) {
        zAxis.z = 1;
      }
      zAxis.normalize();
      xAxis.crossVectors(up, zAxis);
      if (xAxis.lengthSq() === 0) {
        if (Math.abs(up.z) === 1) {
          zAxis.x += 1e-4;
        } else {
          zAxis.z += 1e-4;
        }
        zAxis.normalize();
        xAxis.crossVectors(up, zAxis);
      }
      xAxis.normalize();
      yAxis.crossVectors(zAxis, xAxis);
      te[0] = xAxis.x;
      te[1] = xAxis.y;
      te[2] = xAxis.z;
      te[3] = 0;
      te[4] = yAxis.x;
      te[5] = yAxis.y;
      te[6] = yAxis.z;
      te[7] = 0;
      te[8] = zAxis.x;
      te[9] = zAxis.y;
      te[10] = zAxis.z;
      te[11] = 0;
      te[12] = eye.x;
      te[13] = eye.y;
      te[14] = eye.z;
      te[15] = 1;
      return this;
    }
    /**
     * Compute a view {@link Mat4} matrix.
     *
     * This is a view matrix which transforms all other objects
     * to be in the space of the view defined by the parameters.
     *
     * Equivalent to `matrix.lookAt(eye, target, up).invert()` but faster.
     *
     * @param eye - the position of the object.
     * @param target - the position meant to be aimed at.
     * @param up - a vector pointing up.
     * @returns - the view {@link Mat4} matrix.
     */
    makeView(eye = new Vec3(), target = new Vec3(), up = new Vec3(0, 1, 0)) {
      const te = this.elements;
      zAxis.copy(eye).sub(target).normalize();
      xAxis.crossVectors(up, zAxis).normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      te[0] = xAxis.x;
      te[1] = yAxis.x;
      te[2] = zAxis.x;
      te[3] = 0;
      te[4] = xAxis.y;
      te[5] = yAxis.y;
      te[6] = zAxis.y;
      te[7] = 0;
      te[8] = xAxis.z;
      te[9] = yAxis.z;
      te[10] = zAxis.z;
      te[11] = 0;
      te[12] = -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z);
      te[13] = -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z);
      te[14] = -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z);
      te[15] = 1;
      return this;
    }
    /**
     * Create an orthographic {@link Mat4} matrix based on the parameters. Transforms from
     *  * the given the left, right, bottom, and top dimensions to -1 +1 in x, and y
     *  * and 0 to +1 in z.
     *
     * @param parameters - {@link OrthographicCameraBaseOptions | parameters} used to create the camera orthographic matrix.
     * @returns - the camera orthographic {@link Mat4} matrix.
     */
    makeOrthographic({
      left = -1,
      right = 1,
      bottom = -1,
      top = 1,
      near = 0.1,
      far = 50
    }) {
      const te = this.elements;
      te[0] = 2 / (right - left);
      te[1] = 0;
      te[2] = 0;
      te[3] = 0;
      te[4] = 0;
      te[5] = 2 / (top - bottom);
      te[6] = 0;
      te[7] = 0;
      te[8] = 0;
      te[9] = 0;
      te[10] = 1 / (near - far);
      te[11] = 0;
      te[12] = (right + left) / (left - right);
      te[13] = (top + bottom) / (bottom - top);
      te[14] = near / (near - far);
      te[15] = 1;
      return this;
    }
    /**
     * Create a perspective {@link Mat4} matrix based on the parameters.
     *
     * Note, The matrix generated sends the viewing frustum to the unit box.
     * We assume a unit box extending from -1 to 1 in the x and y dimensions and
     * from -1 to 1 in the z dimension, as three.js and more generally WebGL handles it.
     *
     * @param parameters - {@link PerspectiveProjectionParams | parameters} used to create the camera perspective matrix.
     * @returns - the camera perspective {@link Mat4} matrix.
     */
    makePerspective({ fov = 90, aspect = 1, near = 0.1, far = 150 }) {
      const top = near * Math.tan(Math.PI / 180 * 0.5 * fov);
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;
      const right = left + width;
      const bottom = top - height;
      const x = 2 * near / (right - left);
      const y = 2 * near / (top - bottom);
      const a = (right + left) / (right - left);
      const b = (top + bottom) / (top - bottom);
      const c = -far / (far - near);
      const d = -far * near / (far - near);
      this.set(
        x,
        0,
        0,
        0,
        0,
        y,
        0,
        0,
        a,
        b,
        c,
        -1,
        0,
        0,
        d,
        0
      );
      return this;
    }
  }

  let objectIndex = 0;
  const tempMatrix = new Mat4();
  class Object3D {
    /**
     * Object3D constructor
     */
    constructor() {
      this._parent = null;
      this.children = [];
      this.matricesNeedUpdate = false;
      this.up = new Vec3(0, 1, 0);
      this.actualPosition = new Vec3();
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
      if (this._parent && value && this._parent.object3DIndex === value.object3DIndex) {
        return;
      }
      if (this._parent) {
        this._parent.children = this._parent.children.filter((child) => child.object3DIndex !== this.object3DIndex);
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
     * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}.
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
      this.applyLookAt(target, this.actualPosition);
    }
    /**
     * Apply a look at rotation based on a target, a position and our {@link up} vectors.
     * @param target - {@link Vec3} target to look at.
     * @param position - {@link Vec3} position from which to look at.
     */
    applyLookAt(target, position) {
      const rotation = tempMatrix.lookAt(target, position, this.up);
      this.quaternion.setFromRotationMatrix(rotation);
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
     * Update our {@link worldMatrix | model matrix}.
     * @param updateParents - Whether to update the {@link parent} {@link worldMatrix} beforehand. Default to `false`.
     * @param updateChildren - Whether to update the {@link children} {@link worldMatrix} afterward. Default to `true`.
     */
    updateWorldMatrix(updateParents = false, updateChildren = true) {
      if (!this.parent) {
        this.worldMatrix.copy(this.modelMatrix);
      } else {
        if (updateParents) {
          this.parent.updateWorldMatrix(true, false);
        }
        this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.modelMatrix);
      }
      this.worldMatrix.getTranslation(this.actualPosition);
      if (updateChildren) {
        for (let i = 0, l = this.children.length; i < l; i++) {
          this.children[i].shouldUpdateWorldMatrix();
        }
      }
    }
    /**
     * Check whether at least one of the matrix should be updated
     */
    shouldUpdateMatrices() {
      this.matricesNeedUpdate = !!Object.values(this.matrices).find((matrix) => matrix.shouldUpdate);
    }
    /**
     * Check at each render whether we should update our matrices, and update them if needed
     */
    updateMatrixStack() {
      this.shouldUpdateMatrices();
      if (this.matricesNeedUpdate) {
        for (const matrixName in this.matrices) {
          if (this.matrices[matrixName].shouldUpdate) {
            this.matrices[matrixName].onUpdate();
            this.matrices[matrixName].shouldUpdate = false;
          }
        }
      }
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].updateMatrixStack();
      }
    }
    /**
     * Destroy this {@link Object3D}. Removes its parent and set its children free.
     */
    destroy() {
      for (let i = 0, l = this.children.length; i < l; i++) {
        if (this.children[i]) this.children[i].parent = null;
      }
      this.parent = null;
    }
  }

  const formatRendererError = (renderer, rendererType = "GPURenderer", type) => {
    const error = type ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}` : `The ${rendererType} is not defined: ${renderer}`;
    throwError(error);
  };
  const isRenderer = (renderer, type) => {
    renderer = renderer && renderer.renderer || renderer;
    const isRenderer2 = renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isRenderer2) {
      formatRendererError(renderer, "GPURenderer", type);
    }
    return renderer;
  };
  const isCameraRenderer = (renderer, type) => {
    renderer = renderer && renderer.renderer || renderer;
    const isCameraRenderer2 = renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isCameraRenderer2) {
      formatRendererError(renderer, "GPUCameraRenderer", type);
    }
    return renderer;
  };
  const isCurtainsRenderer = (renderer, type) => {
    renderer = renderer && renderer.renderer || renderer;
    const isCurtainsRenderer2 = renderer && renderer.type === "GPUCurtainsRenderer";
    if (!isCurtainsRenderer2) {
      formatRendererError(renderer, "GPUCurtainsRenderer", type);
    }
    return renderer;
  };
  const isProjectedMesh = (object) => {
    return "geometry" in object && "material" in object && object instanceof Object3D ? object : false;
  };

  const WebGPUShaderStageConstants = typeof GPUShaderStage !== "undefined" ? GPUShaderStage : {
    VERTEX: 1,
    FRAGMENT: 2,
    COMPUTE: 4
  };
  const WebGPUBufferUsageConstants = typeof GPUBufferUsage !== "undefined" ? GPUBufferUsage : {
    MAP_READ: 1,
    MAP_WRITE: 2,
    COPY_SRC: 4,
    COPY_DST: 8,
    INDEX: 16,
    VERTEX: 32,
    UNIFORM: 64,
    STORAGE: 128,
    INDIRECT: 256,
    QUERY_RESOLVE: 512
  };
  const WebGPUTextureUsageConstants = typeof GPUTextureUsage !== "undefined" ? GPUTextureUsage : {
    COPY_SRC: 1,
    COPY_DST: 2,
    TEXTURE_BINDING: 4,
    STORAGE_BINDING: 8,
    RENDER_ATTACHMENT: 16
  };

  const bindingVisibilities = /* @__PURE__ */ new Map([
    ["vertex", WebGPUShaderStageConstants.VERTEX],
    ["fragment", WebGPUShaderStageConstants.FRAGMENT],
    ["compute", WebGPUShaderStageConstants.COMPUTE]
  ]);
  const getBindingVisibility = (visibilities = []) => {
    return visibilities.reduce((acc, v) => {
      return acc | bindingVisibilities.get(v);
    }, 0);
  };
  const bufferLayouts = {
    i32: { numElements: 1, align: 4, size: 4, type: "i32", View: Int32Array },
    u32: { numElements: 1, align: 4, size: 4, type: "u32", View: Uint32Array },
    f32: { numElements: 1, align: 4, size: 4, type: "f32", View: Float32Array },
    f16: { numElements: 1, align: 2, size: 2, type: "u16", View: Uint16Array },
    vec2f: { numElements: 2, align: 8, size: 8, type: "f32", View: Float32Array },
    vec2i: { numElements: 2, align: 8, size: 8, type: "i32", View: Int32Array },
    vec2u: { numElements: 2, align: 8, size: 8, type: "u32", View: Uint32Array },
    vec2h: { numElements: 2, align: 4, size: 4, type: "u16", View: Uint16Array },
    vec3i: { numElements: 3, align: 16, size: 12, type: "i32", View: Int32Array },
    vec3u: { numElements: 3, align: 16, size: 12, type: "u32", View: Uint32Array },
    vec3f: { numElements: 3, align: 16, size: 12, type: "f32", View: Float32Array },
    vec3h: { numElements: 3, align: 8, size: 6, type: "u16", View: Uint16Array },
    vec4i: { numElements: 4, align: 16, size: 16, type: "i32", View: Int32Array },
    vec4u: { numElements: 4, align: 16, size: 16, type: "u32", View: Uint32Array },
    vec4f: { numElements: 4, align: 16, size: 16, type: "f32", View: Float32Array },
    vec4h: { numElements: 4, align: 8, size: 8, type: "u16", View: Uint16Array },
    // AlignOf(vecR)	SizeOf(array<vecR, C>)
    mat2x2f: { numElements: 4, align: 8, size: 16, type: "f32", View: Float32Array },
    mat2x2h: { numElements: 4, align: 4, size: 8, type: "u16", View: Uint16Array },
    mat3x2f: { numElements: 6, align: 8, size: 24, type: "f32", View: Float32Array },
    mat3x2h: { numElements: 6, align: 4, size: 12, type: "u16", View: Uint16Array },
    mat4x2f: { numElements: 8, align: 8, size: 32, type: "f32", View: Float32Array },
    mat4x2h: { numElements: 8, align: 4, size: 16, type: "u16", View: Uint16Array },
    mat2x3f: { numElements: 8, align: 16, size: 32, pad: [3, 1], type: "f32", View: Float32Array },
    mat2x3h: { numElements: 8, align: 8, size: 16, pad: [3, 1], type: "u16", View: Uint16Array },
    mat3x3f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: "f32", View: Float32Array },
    mat3x3h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: "u16", View: Uint16Array },
    mat4x3f: { numElements: 16, align: 16, size: 64, pad: [3, 1], type: "f32", View: Float32Array },
    mat4x3h: { numElements: 16, align: 8, size: 32, pad: [3, 1], type: "u16", View: Uint16Array },
    mat2x4f: { numElements: 8, align: 16, size: 32, type: "f32", View: Float32Array },
    mat2x4h: { numElements: 8, align: 8, size: 16, type: "u16", View: Uint16Array },
    mat3x4f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: "f32", View: Float32Array },
    mat3x4h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: "u16", View: Uint16Array },
    mat4x4f: { numElements: 16, align: 16, size: 64, type: "f32", View: Float32Array },
    mat4x4h: { numElements: 16, align: 8, size: 32, type: "u16", View: Uint16Array }
  };
  const getBufferLayout = (bufferType) => {
    return bufferLayouts[bufferType];
  };
  const getBindingWGSLVarType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "storage":
          return `var<${binding.bindingType}, ${binding.options.access}>`;
        case "uniform":
        default:
          return "var<uniform>";
      }
    })();
  };
  const getTextureBindingWGSLVarType = (binding) => {
    if (binding.bindingType === "externalTexture") {
      return `var ${binding.name}: texture_external;`;
    }
    return binding.bindingType === "storage" ? `var ${binding.name}: texture_storage_${binding.options.viewDimension.replace("-", "_")}<${binding.options.format}, ${binding.options.access}>;` : binding.bindingType === "depth" ? `var ${binding.name}: texture_depth${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension.replace("-", "_")};` : `var ${binding.name}: texture${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension.replace("-", "_")}<f32>;`;
  };
  const getBindGroupLayoutBindingType = (binding) => {
    if (binding.bindingType === "storage" && binding.options.access === "read_write") {
      return "storage";
    } else if (binding.bindingType === "storage") {
      return "read-only-storage";
    } else {
      return "uniform";
    }
  };
  const getBindGroupLayoutTextureBindingType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "externalTexture":
          return { externalTexture: {} };
        case "storage":
          return {
            storageTexture: {
              format: binding.options.format,
              viewDimension: binding.options.viewDimension
            }
          };
        case "texture":
          return {
            texture: {
              multisampled: binding.options.multisampled,
              viewDimension: binding.options.viewDimension,
              sampleType: binding.options.multisampled ? "unfilterable-float" : "float"
            }
          };
        case "depth":
          return {
            texture: {
              multisampled: binding.options.multisampled,
              viewDimension: binding.options.viewDimension,
              sampleType: "depth"
            }
          };
        default:
          return null;
      }
    })();
  };
  const getBindGroupLayoutTextureBindingCacheKey = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "externalTexture":
          return `externalTexture,${binding.visibility},`;
        case "storage":
          return `storageTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`;
        case "texture":
          return `texture,${binding.options.multisampled},${binding.options.viewDimension},${binding.options.multisampled ? "unfilterable-float" : "float"},${binding.visibility},`;
        case "depth":
          return `depthTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`;
        default:
          return `${binding.visibility},`;
      }
    })();
  };

  class Binding {
    /**
     * Binding constructor
     * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}.
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType = "uniform",
      visibility = ["vertex", "fragment", "compute"]
    }) {
      this.label = label;
      this.name = toCamelCase(name);
      this.bindingType = bindingType;
      this.visibility = getBindingVisibility(visibility);
      this.options = {
        label,
        name,
        bindingType,
        visibility
      };
      this.shouldResetBindGroup = false;
      this.shouldResetBindGroupLayout = false;
      this.cacheKey = `${bindingType},${this.visibility},`;
    }
  }

  class Vec2 {
    /**
     * Vec2 constructor
     * @param x - X component of our {@link Vec2}
     * @param y - Y component of our {@link Vec2}
     */
    constructor(x = 0, y = x) {
      this.type = "Vec2";
      this._x = x;
      this._y = y;
    }
    /**
     * Get the X component of the {@link Vec2}
     */
    get x() {
      return this._x;
    }
    /**
     * Set the X component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Y component of the {@link Vec2}
     */
    get y() {
      return this._y;
    }
    /**
     * Set the Y component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the {@link Vec2} has changed
     * @param callback - callback to run when at least one component of the {@link Vec2} has changed
     * @returns - our {@link Vec2}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the {@link Vec2} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @returns - this {@link Vec2} after being set
     */
    set(x = 0, y = x) {
      this.x = x;
      this.y = y;
      return this;
    }
    /**
     * Add a {@link Vec2} to this {@link Vec2}
     * @param vector - {@link Vec2} to add
     * @returns - this {@link Vec2} after addition
     */
    add(vector = new Vec2()) {
      this.x += vector.x;
      this.y += vector.y;
      return this;
    }
    /**
     * Add a scalar to all the components of this {@link Vec2}
     * @param value - number to add
     * @returns - this {@link Vec2} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      return this;
    }
    /**
     * Subtract a {@link Vec2} from this {@link Vec2}
     * @param vector - {@link Vec2} to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    sub(vector = new Vec2()) {
      this.x -= vector.x;
      this.y -= vector.y;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this {@link Vec2}
     * @param value - number to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      return this;
    }
    /**
     * Multiply a {@link Vec2} with this {@link Vec2}
     * @param vector - {@link Vec2} to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiply(vector = new Vec2(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      return this;
    }
    /**
     * Multiply all components of this {@link Vec2} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      return this;
    }
    /**
     * Divide a {@link Vec2} with this {@link Vec2}
     * @param vector - {@link Vec2} to divide with
     * @returns - this {@link Vec2} after division
     */
    divide(vector = new Vec2(1)) {
      this.x /= vector.x;
      this.y /= vector.y;
      return this;
    }
    /**
     * Divide all components of this {@link Vec2} with a scalar
     * @param value - number to divide with
     * @returns - this {@link Vec2} after division
     */
    divideScalar(value = 1) {
      this.x /= value;
      this.y /= value;
      return this;
    }
    /**
     * Copy a {@link Vec2} into this {@link Vec2}
     * @param vector - {@link Vec2} to copy
     * @returns - this {@link Vec2} after copy
     */
    copy(vector = new Vec2()) {
      this.x = vector.x;
      this.y = vector.y;
      return this;
    }
    /**
     * Clone this {@link Vec2}
     * @returns - cloned {@link Vec2}
     */
    clone() {
      return new Vec2(this.x, this.y);
    }
    /**
     * Apply max values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing max values
     * @returns - {@link Vec2} with max values applied
     */
    max(vector = new Vec2()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      return this;
    }
    /**
     * Apply min values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing min values
     * @returns - {@link Vec2} with min values applied
     */
    min(vector = new Vec2()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      return this;
    }
    /**
     * Clamp this {@link Vec2} components by min and max {@link Vec2} vectors
     * @param min - minimum {@link Vec2} components to compare with
     * @param max - maximum {@link Vec2} components to compare with
     * @returns - clamped {@link Vec2}
     */
    clamp(min = new Vec2(), max = new Vec2()) {
      this.x = Math.max(min.x, Math.min(max.x, this.x));
      this.y = Math.max(min.y, Math.min(max.y, this.y));
      return this;
    }
    /**
     * Check if 2 {@link Vec2} are equal
     * @param vector - {@link Vec2} to compare
     * @returns - whether the {@link Vec2} are equals or not
     */
    equals(vector = new Vec2()) {
      return this.x === vector.x && this.y === vector.y;
    }
    /**
     * Get the square length of this {@link Vec2}
     * @returns - square length of this {@link Vec2}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    /**
     * Get the length of this {@link Vec2}
     * @returns - length of this {@link Vec2}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this {@link Vec2}
     * @returns - normalized {@link Vec2}
     */
    normalize() {
      let len = this.x * this.x + this.y * this.y;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      return this;
    }
    /**
     * Calculate the dot product of 2 {@link Vec2}
     * @param vector - {@link Vec2} to use for dot product
     * @returns - dot product of the 2 {@link Vec2}
     */
    dot(vector = new Vec2()) {
      return this.x * vector.x + this.y * vector.y;
    }
    /**
     * Calculate the linear interpolation of this {@link Vec2} by given {@link Vec2} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec2} to interpolate towards
     * @param [alpha=1] - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec2} after linear interpolation
     */
    lerp(vector = new Vec2(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      return this;
    }
  }

  const slotsPerRow = 4;
  const bytesPerSlot = 4;
  const bytesPerRow = slotsPerRow * bytesPerSlot;
  class BufferElement {
    /**
     * BufferElement constructor
     * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}.
     */
    constructor({ name, key, type = "f32" }) {
      this.name = name;
      this.key = key;
      this.type = type;
      this.baseType = BufferElement.getBaseType(this.type);
      this.bufferLayout = getBufferLayout(this.baseType);
      this.alignment = {
        start: {
          row: 0,
          byte: 0
        },
        end: {
          row: 0,
          byte: 0
        }
      };
      this.setValue = null;
    }
    /**
     * Get the {@link BufferElement} {@link WGSLVariableType | WGSL type}.
     * @param type - Original type passed.
     * @returns - The {@link BufferElement} {@link WGSLVariableType | WGSL type}.
     */
    static getType(type) {
      return type.replace("array", "").replace("<", "").replace(">", "");
    }
    /**
     * Get the {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
     * @param type - Original type passed.
     * @returns - The {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
     */
    static getBaseType(type) {
      return BufferElement.getType(
        type.replace("atomic", "").replace("array", "").replaceAll("<", "").replaceAll(">", "")
      );
    }
    /**
     * Get the total number of rows used by this {@link BufferElement}.
     * @readonly
     */
    get rowCount() {
      return this.alignment.end.row - this.alignment.start.row + 1;
    }
    /**
     * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets.
     * @readonly
     */
    get byteCount() {
      return Math.abs(this.endOffset - this.startOffset) + 1;
    }
    /**
     * Get the total number of bytes used by this {@link BufferElement}, including final padding.
     * @readonly
     */
    get paddedByteCount() {
      return (this.alignment.end.row + 1) * bytesPerRow;
    }
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} starts.
     * @readonly
     */
    get startOffset() {
      return this.getByteCountAtPosition(this.alignment.start);
    }
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} starts.
     * @readonly
     */
    get startOffsetToIndex() {
      return this.startOffset / bytesPerSlot;
    }
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} ends.
     * @readonly
     */
    get endOffset() {
      return this.getByteCountAtPosition(this.alignment.end);
    }
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} ends.
     * @readonly
     */
    get endOffsetToIndex() {
      return Math.floor(this.endOffset / bytesPerSlot);
    }
    /**
     * Get the position at given offset (i.e. byte index).
     * @param offset - Byte index to use.
     */
    getPositionAtOffset(offset = 0) {
      return {
        row: Math.floor(offset / bytesPerRow),
        byte: offset % bytesPerRow
      };
    }
    /**
     * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}.
     * @param position - {@link BufferElementAlignmentPosition | Position} from which to count.
     * @returns - Byte count at the given {@link BufferElementAlignmentPosition | position}.
     */
    getByteCountAtPosition(position = { row: 0, byte: 0 }) {
      return position.row * bytesPerRow + position.byte;
    }
    /**
     * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16).
     * @param position - {@link BufferElementAlignmentPosition | Position}.
     * @returns - Updated {@link BufferElementAlignmentPosition | position}.
     */
    applyOverflowToPosition(position = { row: 0, byte: 0 }) {
      if (position.byte > bytesPerRow - 1) {
        const overflow = position.byte % bytesPerRow;
        position.row += Math.floor(position.byte / bytesPerRow);
        position.byte = overflow;
      }
      return position;
    }
    /**
     * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}.
     * @param p1 - First {@link BufferElementAlignmentPosition | position}.
     * @param p2 - Second {@link BufferElementAlignmentPosition | position}.
     * @returns - Number of bytes.
     */
    getByteCountBetweenPositions(p1 = { row: 0, byte: 0 }, p2 = { row: 0, byte: 0 }) {
      return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1));
    }
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}.
     * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element.
     * @returns - Computed {@link BufferElementAlignment | alignment}.
     */
    getElementAlignment(nextPositionAvailable = { row: 0, byte: 0 }) {
      const alignment = {
        start: nextPositionAvailable,
        end: nextPositionAvailable
      };
      const { size, align } = this.bufferLayout;
      if (nextPositionAvailable.byte % align !== 0) {
        nextPositionAvailable.byte += nextPositionAvailable.byte % align;
      }
      if (size <= bytesPerRow && nextPositionAvailable.byte + size > bytesPerRow) {
        nextPositionAvailable.row += 1;
        nextPositionAvailable.byte = 0;
      } else if (size > bytesPerRow && (nextPositionAvailable.byte > bytesPerRow || nextPositionAvailable.byte > 0)) {
        nextPositionAvailable.row += 1;
        nextPositionAvailable.byte = 0;
      }
      alignment.end = {
        row: nextPositionAvailable.row + Math.ceil(size / bytesPerRow) - 1,
        byte: nextPositionAvailable.byte + (size % bytesPerRow === 0 ? bytesPerRow - 1 : size % bytesPerRow - 1)
        // end of row ? then it ends on slot (bytesPerRow - 1)
      };
      alignment.end = this.applyOverflowToPosition(alignment.end);
      return alignment;
    }
    /**
     * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}.
     * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    setAlignmentFromPosition(position = { row: 0, byte: 0 }) {
      this.alignment = this.getElementAlignment(position);
    }
    /**
     * Set the {@link BufferElementAlignment | alignment} from an offset (byte count).
     * @param startOffset - Offset at which to start inserting the values in the parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    setAlignment(startOffset = 0) {
      this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset));
    }
    /**
     * Set this {@link BufferElement} {@link view} into a parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayBuffer - The parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayView - The parent {@link core/bindings/BufferBinding.BufferBinding#arrayView | BufferBinding arrayView}.
     */
    setView(arrayBuffer, arrayView) {
      this.view = new this.bufferLayout.View(
        arrayBuffer,
        this.startOffset,
        this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
      );
    }
    /**
     * Set the {@link view} value from a float or an int.
     * @param value - Float or int to use.
     */
    setValueFromNumber(value) {
      this.view[0] = value;
    }
    /**
     * Set the {@link view} value from a {@link Vec2} or an array.
     * @param value - {@link Vec2} or array to use.
     */
    setValueFromVec2(value) {
      this.view[0] = value.x ?? value[0] ?? 0;
      this.view[1] = value.y ?? value[1] ?? 0;
    }
    /**
     * Set the {@link view} value from a {@link Vec3} or an array.
     * @param value - {@link Vec3} or array to use.
     */
    setValueFromVec3(value) {
      this.view[0] = value.x ?? value[0] ?? 0;
      this.view[1] = value.y ?? value[1] ?? 0;
      this.view[2] = value.z ?? value[2] ?? 0;
    }
    /**
     * Set the {@link view} value from a {@link Mat4} or {@link Quat}.
     * @param value - {@link Mat4} or {@link Quat} to use.
     */
    setValueFromMat4OrQuat(value) {
      this.view.set(value.elements);
    }
    /**
     * Set the {@link view} value from a {@link Mat3}.
     * @param value - {@link Mat3} to use.
     */
    setValueFromMat3(value) {
      this.setValueFromArrayWithPad(value.elements);
    }
    /**
     * Set the {@link view} value from an array.
     * @param value - Array to use.
     */
    setValueFromArray(value) {
      this.view.set(value);
    }
    /**
     * Set the {@link view} value from an array with pad applied.
     * @param value - Array to use.
     */
    setValueFromArrayWithPad(value) {
      for (let i = 0, offset = 0; i < this.view.length; i += this.bufferLayout.pad[0] + this.bufferLayout.pad[1], offset++) {
        for (let j = 0; j < this.bufferLayout.pad[0]; j++) {
          this.view[i + j] = value[i + j - offset];
        }
      }
    }
    /**
     * Update the {@link view} based on the new value.
     * @param value - New value to use.
     */
    update(value) {
      if (!this.setValue) {
        this.setValue = ((value2) => {
          if (typeof value2 === "number") {
            return this.setValueFromNumber;
          } else if (this.type === "vec2f") {
            return this.setValueFromVec2;
          } else if (this.type === "vec3f") {
            return this.setValueFromVec3;
          } else if (this.type === "mat3x3f") {
            return value2.elements ? this.setValueFromMat3 : this.setValueFromArrayWithPad;
          } else if (value2.elements) {
            return this.setValueFromMat4OrQuat;
          } else if (ArrayBuffer.isView(value2) || Array.isArray(value2)) {
            if (!this.bufferLayout.pad) {
              return this.setValueFromArray;
            } else {
              return this.setValueFromArrayWithPad;
            }
          } else {
            throwWarning(`${this.constructor.name}: value passed to ${this.name} cannot be used: ${value2}`);
          }
        })(value);
      }
      this.setValue(value);
    }
    /**
     * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data.
     * @returns - Extracted data from the {@link Float32Array}.
     */
    extractDataFromBufferResult(result) {
      return result.slice(this.startOffsetToIndex, this.endOffsetToIndex);
    }
  }

  class BufferArrayElement extends BufferElement {
    /**
     * BufferArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}.
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type });
      this.arrayLength = arrayLength;
      this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements);
    }
    /**
     * Get the array stride between two elements of the array, in indices.
     * @readonly
     */
    get arrayStrideToIndex() {
      return this.arrayStride / bytesPerSlot;
    }
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}.
     * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the arrayStride between two array elements. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - Offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    setAlignment(startOffset = 0) {
      super.setAlignment(startOffset);
      const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(this.endOffset + 1));
      this.arrayStride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end);
      this.alignment.end = this.getPositionAtOffset(this.endOffset + this.arrayStride * (this.numElements - 1));
    }
    /**
     * Set the strided {@link view} value from an array.
     * @param value - Array to use.
     */
    setValueFromArray(value) {
      let valueIndex = 0;
      const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT;
      const stride = Math.ceil(viewLength / this.numElements);
      for (let i = 0; i < this.numElements; i++) {
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          this.view[j + i * stride] = value[valueIndex];
          valueIndex++;
        }
      }
    }
  }

  class BufferInterleavedArrayElement extends BufferArrayElement {
    /**
     * BufferInterleavedArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferInterleavedArrayElement}
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type, arrayLength });
      this.arrayStride = 1;
      this.arrayLength = arrayLength;
      this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements);
    }
    /**
     * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
     * @readonly
     */
    get byteCount() {
      return this.bufferLayout.size * this.numElements;
    }
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
     * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
     */
    setAlignment(startOffset = 0, stride = 0) {
      this.alignment = this.getElementAlignment(this.getPositionAtOffset(startOffset));
      this.arrayStride = stride;
      this.alignment.end = this.getPositionAtOffset(this.endOffset + stride * (this.numElements - 1));
    }
    /**
     * Set the {@link viewSetFunction} and {@link view} into a parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayBuffer - The {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayView - The {@link core/bindings/BufferBinding.BufferBinding#arrayView | BufferBinding arrayView}.
     */
    setView(arrayBuffer, arrayView) {
      this.view = new this.bufferLayout.View(this.bufferLayout.numElements * this.numElements);
      this.viewSetFunction = ((arrayView2) => {
        switch (this.bufferLayout.View) {
          case Int32Array:
            return arrayView2.setInt32.bind(arrayView2);
          case Uint16Array:
            return arrayView2.setUint16.bind(arrayView2);
          case Uint32Array:
            return arrayView2.setUint32.bind(arrayView2);
          case Float32Array:
          default:
            return arrayView2.setFloat32.bind(arrayView2);
        }
      })(arrayView);
    }
    /**
     * Update the {@link view} based on the new value, and then update the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer} using sub arrays.
     * @param value - New value to use.
     */
    update(value) {
      super.update(value);
      for (let i = 0; i < this.numElements; i++) {
        const subarray = this.view.subarray(
          i * this.bufferLayout.numElements,
          i * this.bufferLayout.numElements + this.bufferLayout.numElements
        );
        const startByteOffset = this.startOffset + i * this.arrayStride;
        subarray.forEach((value2, index) => {
          this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value2, true);
        });
      }
    }
    /**
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data.
     */
    extractDataFromBufferResult(result) {
      const interleavedResult = new Float32Array(this.arrayLength);
      for (let i = 0; i < this.numElements; i++) {
        const resultOffset = this.startOffsetToIndex + i * this.arrayStrideToIndex;
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          interleavedResult[i * this.bufferLayout.numElements + j] = result[resultOffset + j];
        }
      }
      return interleavedResult;
    }
  }

  const bufferUsages = /* @__PURE__ */ new Map([
    ["copySrc", WebGPUBufferUsageConstants.COPY_SRC],
    ["copyDst", WebGPUBufferUsageConstants.COPY_DST],
    ["index", WebGPUBufferUsageConstants.INDEX],
    ["indirect", WebGPUBufferUsageConstants.INDIRECT],
    ["mapRead", WebGPUBufferUsageConstants.MAP_READ],
    ["mapWrite", WebGPUBufferUsageConstants.MAP_WRITE],
    ["queryResolve", WebGPUBufferUsageConstants.QUERY_RESOLVE],
    ["storage", WebGPUBufferUsageConstants.STORAGE],
    ["uniform", WebGPUBufferUsageConstants.UNIFORM],
    ["vertex", WebGPUBufferUsageConstants.VERTEX]
  ]);
  const getBufferUsages = (usages = []) => {
    return usages.reduce((acc, v) => {
      return acc | bufferUsages.get(v);
    }, 0);
  };

  class Buffer {
    /**
     * Buffer constructors
     * @param parameters - {@link BufferParams | parameters} used to create our Buffer
     */
    constructor({
      label = "Buffer",
      size = 0,
      usage = ["copySrc", "copyDst"],
      mappedAtCreation = false
    } = {}) {
      this.type = "Buffer";
      this.reset();
      this.uuid = generateUUID();
      this.consumers = /* @__PURE__ */ new Set();
      this.options = {
        label,
        size,
        usage: getBufferUsages(usage),
        mappedAtCreation
      };
    }
    /** Reset the {@link GPUBuffer} value to `null`. */
    reset() {
      this.GPUBuffer = null;
    }
    /** Allow to dynamically set the size of the {@link GPUBuffer}. */
    set size(value) {
      this.options.size = value;
    }
    /**
     * Create a {@link GPUBuffer} based on the descriptor stored in the {@link Buffer.options | Buffer options}.
     * @param renderer - {@link core/renderers/GPURenderer.GPURenderer | renderer} used to create the {@link GPUBuffer}.
     * @param options - optional way to update the {@link Buffer.options | Buffer options} previously set before creating the {@link GPUBuffer}.
     */
    createBuffer(renderer, options = {}) {
      const { usage, ...staticOptions } = options;
      this.options = {
        ...this.options,
        ...staticOptions,
        ...usage !== void 0 && { usage: getBufferUsages(usage) }
      };
      this.setBuffer(renderer.createBuffer(this));
    }
    /**
     * Set the {@link Buffer.GPUBuffer | GPUBuffer}. This allows to use a {@link Buffer} with a {@link Buffer.GPUBuffer | GPUBuffer} created separately.
     * @param GPUBuffer - GPU buffer to use.
     */
    setBuffer(GPUBuffer) {
      this.GPUBuffer = GPUBuffer;
    }
    /**
     * Copy an {@link Buffer#GPUBuffer | Buffer GPUBuffer} and its {@link options} into this {@link Buffer}.
     * @param buffer - {@link Buffer} to use for the copy.
     * @param destroyPreviousBuffer - whether to destroy the previous {@link Buffer} before the copy.
     */
    copy(buffer, destroyPreviousBuffer = false) {
      if (destroyPreviousBuffer) {
        this.destroy();
      }
      this.options = buffer.options;
      this.GPUBuffer = buffer.GPUBuffer;
      this.consumers = /* @__PURE__ */ new Set([...this.consumers, ...buffer.consumers]);
    }
    /**
     * Map the {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    async mapBufferAsync() {
      if (!this.GPUBuffer || this.GPUBuffer.mapState !== "unmapped") return new Float32Array(0);
      await this.GPUBuffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(this.GPUBuffer.getMappedRange().slice(0));
      this.GPUBuffer.unmap();
      return result;
    }
    /**
     * Destroy the {@link GPUBuffer} and {@link reset} its value.
     */
    destroy() {
      this.GPUBuffer?.destroy();
      this.reset();
      this.consumers.clear();
    }
  }

  var __typeError$w = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$w = (obj, member, msg) => member.has(obj) || __typeError$w("Cannot " + msg);
  var __privateGet$u = (obj, member, getter) => (__accessCheck$w(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$w = (obj, member, value) => member.has(obj) ? __typeError$w("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$t = (obj, member, value, setter) => (__accessCheck$w(obj, member, "write to private field"), member.set(obj, value), value);
  var _parent;
  const _BufferBinding = class _BufferBinding extends Binding {
    /**
     * BufferBinding constructor
     * @param parameters - {@link BufferBindingParams | parameters} used to create our BufferBindings
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType,
      visibility,
      useStruct = true,
      access = "read",
      usage = [],
      struct = {},
      childrenBindings = [],
      buffer = null,
      parent = null,
      minOffset = 256,
      offset = 0
    }) {
      bindingType = bindingType ?? "uniform";
      super({ label, name, bindingType, visibility });
      /** @ignore */
      __privateAdd$w(this, _parent);
      this.options = {
        ...this.options,
        useStruct,
        access,
        usage,
        struct,
        childrenBindings,
        buffer,
        parent,
        minOffset,
        offset
      };
      this.cacheKey += `${useStruct},${access},`;
      this.arrayBufferSize = 0;
      this.shouldUpdate = false;
      this.useStruct = useStruct;
      this.bufferElements = [];
      this.inputs = {};
      this.buffer = this.options.buffer ?? new Buffer();
      if (Object.keys(struct).length) {
        this.setBindings(struct);
        this.setInputsAlignment();
      }
      this.setChildrenBindings(childrenBindings);
      if (Object.keys(struct).length || this.childrenBindings.length) {
        this.setBufferAttributes();
        this.setWGSLFragment();
      }
      this.parent = parent;
    }
    /**
     * Clone a {@link BufferBindingParams#struct | struct object} width new default values.
     * @param struct - New cloned struct object.
     */
    static cloneStruct(struct) {
      return Object.keys(struct).reduce((acc, bindingKey) => {
        const binding = struct[bindingKey];
        let value;
        if (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value)) {
          value = new binding.value.constructor(binding.value.length);
        } else if (typeof binding.value === "number") {
          value = 0;
        } else {
          value = new binding.value.constructor();
        }
        return {
          ...acc,
          [bindingKey]: {
            type: binding.type,
            value
          }
        };
      }, {});
    }
    /**
     * Get the {@link BufferBinding} parent if any.
     * @readonly
     * @returns - The {@link BufferBinding} parent if any.
     */
    get parent() {
      return __privateGet$u(this, _parent);
    }
    /**
     * Set the new {@link BufferBinding} parent.
     * @param value - New {@link BufferBinding} parent to set if any.
     */
    set parent(value) {
      if (!!value) {
        this.parentView = new DataView(value.arrayBuffer, this.offset, this.getMinOffsetSize(this.arrayBufferSize));
        const getAllBufferElements = (binding) => {
          const getBufferElements = (binding2) => {
            return binding2.bufferElements;
          };
          return [
            ...getBufferElements(binding),
            binding.childrenBindings.map((child) => getAllBufferElements(child)).flat()
          ].flat();
        };
        const bufferElements = getAllBufferElements(this);
        this.parentViewSetBufferEls = bufferElements.map((bufferElement) => {
          switch (bufferElement.bufferLayout.View) {
            case Int32Array:
              return {
                bufferElement,
                viewSetFunction: this.parentView.setInt32.bind(this.parentView)
              };
            case Uint16Array:
              return {
                bufferElement,
                viewSetFunction: this.parentView.setUint16.bind(this.parentView)
              };
            case Uint32Array:
              return {
                bufferElement,
                viewSetFunction: this.parentView.setUint32.bind(this.parentView)
              };
            case Float32Array:
            default:
              return {
                bufferElement,
                viewSetFunction: this.parentView.setFloat32.bind(this.parentView)
              };
          }
        });
        if (!this.parent && this.buffer.GPUBuffer && !this.options.buffer) {
          this.buffer.destroy();
        }
      } else {
        this.parentView = null;
        this.parentViewSetBufferEls = null;
      }
      __privateSet$t(this, _parent, value);
    }
    /**
     * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
     * @param value - Size to round.
     */
    getMinOffsetSize(value) {
      return Math.ceil(value / this.options.minOffset) * this.options.minOffset;
    }
    /**
     * Get this {@link BufferBinding} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
     * @readonly
     * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
     */
    get offset() {
      return this.getMinOffsetSize(this.options.offset * this.getMinOffsetSize(this.arrayBufferSize));
    }
    /**
     * Get {@link GPUDevice.createBindGroupLayout().descriptor.entries.resource | GPUBindGroupLayout entry resource}.
     * @readonly
     */
    get resourceLayout() {
      return {
        buffer: {
          type: getBindGroupLayoutBindingType(this)
        },
        ...this.parent && { offset: this.offset, size: this.arrayBufferSize }
      };
    }
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey() {
      return `buffer,${getBindGroupLayoutBindingType(this)},${this.visibility},`;
    }
    /**
     * Get {@link GPUDevice.createBindGroup().descriptor.entries.resource | GPUBindGroup entry resource}.
     * @readonly
     */
    get resource() {
      return {
        buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
        ...this.parent && { offset: this.offset, size: this.arrayBufferSize }
      };
    }
    /**
     * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
     * @param params - params to use for cloning
     */
    clone(params = {}) {
      let { struct, childrenBindings, parent, ...defaultParams } = params;
      const { label, name, bindingType, visibility, useStruct, access, usage } = this.options;
      defaultParams = { ...{ label, name, bindingType, visibility, useStruct, access, usage }, ...defaultParams };
      const bufferBindingCopy = new this.constructor(defaultParams);
      struct = struct || _BufferBinding.cloneStruct(this.options.struct);
      bufferBindingCopy.options.struct = struct;
      bufferBindingCopy.setBindings(struct);
      bufferBindingCopy.arrayBufferSize = this.arrayBufferSize;
      bufferBindingCopy.arrayBuffer = new ArrayBuffer(bufferBindingCopy.arrayBufferSize);
      bufferBindingCopy.arrayView = new DataView(
        bufferBindingCopy.arrayBuffer,
        0,
        bufferBindingCopy.arrayBuffer.byteLength
      );
      if (!bufferBindingCopy.options.buffer) {
        bufferBindingCopy.buffer.size = bufferBindingCopy.arrayBuffer.byteLength;
      }
      this.bufferElements.forEach((bufferElement) => {
        const newBufferElement = new bufferElement.constructor({
          name: bufferElement.name,
          key: bufferElement.key,
          type: bufferElement.type,
          ...bufferElement.arrayLength && {
            arrayLength: bufferElement.arrayLength
          }
        });
        newBufferElement.alignment = JSON.parse(JSON.stringify(bufferElement.alignment));
        if (bufferElement.arrayStride) {
          newBufferElement.arrayStride = bufferElement.arrayStride;
        }
        newBufferElement.setView(bufferBindingCopy.arrayBuffer, bufferBindingCopy.arrayView);
        bufferBindingCopy.bufferElements.push(newBufferElement);
      });
      if (this.options.childrenBindings) {
        bufferBindingCopy.options.childrenBindings = this.options.childrenBindings;
        bufferBindingCopy.options.childrenBindings.forEach((child) => {
          const count = child.count ? Math.max(1, child.count) : 1;
          bufferBindingCopy.cacheKey += `child(count:${count}):${child.binding.cacheKey}`;
        });
        bufferBindingCopy.options.childrenBindings.forEach((child) => {
          bufferBindingCopy.childrenBindings = [
            ...bufferBindingCopy.childrenBindings,
            Array.from(Array(Math.max(1, child.count || 1)).keys()).map((i) => {
              return child.binding.clone({
                ...child.binding.options,
                // clone struct with new arrays
                struct: _BufferBinding.cloneStruct(child.binding.options.struct)
              });
            })
          ].flat();
        });
        bufferBindingCopy.childrenBindings.forEach((binding, index) => {
          let offset = this.arrayView.byteLength;
          for (let i = 0; i < index; i++) {
            offset += this.childrenBindings[i].arrayBuffer.byteLength;
          }
          binding.bufferElements.forEach((bufferElement, i) => {
            bufferElement.alignment.start.row = this.childrenBindings[index].bufferElements[i].alignment.start.row;
            bufferElement.alignment.end.row = this.childrenBindings[index].bufferElements[i].alignment.end.row;
          });
          binding.arrayView = new DataView(bufferBindingCopy.arrayBuffer, offset, binding.arrayBuffer.byteLength);
          for (const bufferElement of binding.bufferElements) {
            bufferElement.setView(bufferBindingCopy.arrayBuffer, binding.arrayView);
          }
        });
      }
      bufferBindingCopy.setWGSLFragment();
      if (parent) {
        bufferBindingCopy.parent = parent;
      }
      bufferBindingCopy.shouldUpdate = bufferBindingCopy.arrayBufferSize > 0;
      return bufferBindingCopy;
    }
    /**
     * Format bindings struct and set our {@link inputs}
     * @param bindings - bindings inputs
     */
    setBindings(bindings) {
      for (const bindingKey of Object.keys(bindings)) {
        const binding = {};
        for (const key in bindings[bindingKey]) {
          if (key !== "value") {
            binding[key] = bindings[bindingKey][key];
          }
        }
        binding.name = bindingKey;
        Object.defineProperty(binding, "value", {
          get() {
            return binding._value;
          },
          set(v) {
            binding._value = v;
            binding.shouldUpdate = true;
          }
        });
        binding.value = bindings[bindingKey].value;
        if (binding.value instanceof Vec2 || binding.value instanceof Vec3) {
          const _onChangeCallback = binding.value._onChangeCallback;
          binding.value._onChangeCallback = () => {
            if (_onChangeCallback) {
              _onChangeCallback();
            }
            binding.shouldUpdate = true;
          };
        }
        this.inputs[bindingKey] = binding;
        this.cacheKey += `${bindingKey},${bindings[bindingKey].type},`;
      }
    }
    /**
     * Set this {@link BufferBinding} optional {@link BufferBinding.childrenBindings | childrenBindings}.
     * @param childrenBindings - Array of {@link BufferBindingChildrenBinding} to use as {@link BufferBinding.childrenBindings | childrenBindings}.
     */
    setChildrenBindings(childrenBindings) {
      this.childrenBindings = [];
      if (childrenBindings && childrenBindings.length) {
        const childrenArray = [];
        childrenBindings.sort((a, b) => {
          const countA = a.count ? Math.max(a.count) : a.forceArray ? 1 : 0;
          const countB = b.count ? Math.max(b.count) : b.forceArray ? 1 : 0;
          return countA - countB;
        }).forEach((child) => {
          if (child.count && child.count > 1 || child.forceArray) {
            childrenArray.push(child.binding);
          }
        });
        if (childrenArray.length > 1) {
          childrenArray.shift();
          throwWarning(
            `BufferBinding: "${this.label}" contains multiple children bindings arrays. These children bindings cannot be added to the BufferBinding: "${childrenArray.map((child) => child.label).join(", ")}"`
          );
          childrenArray.forEach((removedChildBinding) => {
            childrenBindings = childrenBindings.filter((child) => child.binding.name !== removedChildBinding.name);
          });
        }
        this.options.childrenBindings = childrenBindings;
        childrenBindings.forEach((child) => {
          const count = child.count ? Math.max(1, child.count) : 1;
          this.cacheKey += `child(count:${count}):${child.binding.cacheKey}`;
          this.childrenBindings = [
            ...this.childrenBindings,
            Array.from(Array(count).keys()).map((i) => {
              return child.binding.clone({
                ...child.binding.options,
                // clone struct with new arrays
                struct: _BufferBinding.cloneStruct(child.binding.options.struct)
              });
            })
          ].flat();
        });
      }
    }
    /**
     * Set the buffer alignments from {@link inputs}.
     */
    setInputsAlignment() {
      let orderedBindings = Object.keys(this.inputs);
      const arrayBindings = orderedBindings.filter((bindingKey) => {
        return this.inputs[bindingKey].type.includes("array");
      });
      if (arrayBindings.length) {
        orderedBindings.sort((bindingKeyA, bindingKeyB) => {
          const isBindingAArray = Math.min(0, this.inputs[bindingKeyA].type.indexOf("array"));
          const isBindingBArray = Math.min(0, this.inputs[bindingKeyB].type.indexOf("array"));
          return isBindingAArray - isBindingBArray;
        });
        if (arrayBindings.length > 1) {
          orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey));
        }
      }
      for (const bindingKey of orderedBindings) {
        const binding = this.inputs[bindingKey];
        const bufferElementOptions = {
          name: toCamelCase(binding.name ?? bindingKey),
          key: bindingKey,
          type: binding.type
        };
        const isArray = binding.type.includes("array") && (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value));
        this.bufferElements.push(
          isArray ? new BufferArrayElement({
            ...bufferElementOptions,
            arrayLength: binding.value.length
          }) : new BufferElement(bufferElementOptions)
        );
      }
      this.bufferElements.forEach((bufferElement, index) => {
        const startOffset = index === 0 ? 0 : this.bufferElements[index - 1].endOffset + 1;
        bufferElement.setAlignment(startOffset);
      });
      if (arrayBindings.length > 1) {
        const arraySizes = arrayBindings.map((bindingKey) => {
          const binding = this.inputs[bindingKey];
          const bufferLayout = getBufferLayout(BufferElement.getBaseType(binding.type));
          return Math.ceil(binding.value.length / bufferLayout.numElements);
        });
        const equalSize = arraySizes.every((size, i, array) => size === array[0]);
        if (equalSize) {
          const interleavedBufferElements = arrayBindings.map((bindingKey) => {
            const binding = this.inputs[bindingKey];
            return new BufferInterleavedArrayElement({
              name: toCamelCase(binding.name ?? bindingKey),
              key: bindingKey,
              type: binding.type,
              arrayLength: binding.value.length
            });
          });
          const tempBufferElements = arrayBindings.map((bindingKey) => {
            const binding = this.inputs[bindingKey];
            return new BufferElement({
              name: toCamelCase(binding.name ?? bindingKey),
              key: bindingKey,
              type: BufferElement.getType(binding.type)
            });
          });
          tempBufferElements.forEach((bufferElement, index) => {
            if (index === 0) {
              if (this.bufferElements.length) {
                bufferElement.setAlignmentFromPosition({
                  row: this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1,
                  byte: 0
                });
              } else {
                bufferElement.setAlignment(0);
              }
            } else {
              bufferElement.setAlignment(tempBufferElements[index - 1].endOffset + 1);
            }
          });
          const totalStride = tempBufferElements[tempBufferElements.length - 1].endOffset + 1 - tempBufferElements[0].startOffset;
          interleavedBufferElements.forEach((bufferElement, index) => {
            bufferElement.setAlignment(
              tempBufferElements[index].startOffset,
              Math.ceil(totalStride / bytesPerRow) * bytesPerRow
            );
          });
          this.bufferElements = [...this.bufferElements, ...interleavedBufferElements];
        } else {
          throwWarning(
            `BufferBinding: "${this.label}" contains multiple array inputs that should use an interleaved array, but their sizes do not match. These inputs cannot be added to the BufferBinding: "${arrayBindings.join(
            ", "
          )}"`
          );
        }
      }
    }
    /**
     * Set our buffer attributes:
     * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
     */
    setBufferAttributes() {
      const bufferElementsArrayBufferSize = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].paddedByteCount : 0;
      this.arrayBufferSize = bufferElementsArrayBufferSize;
      this.childrenBindings.forEach((binding) => {
        this.arrayBufferSize += binding.arrayBufferSize;
      });
      this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize);
      this.arrayView = new DataView(this.arrayBuffer, 0, bufferElementsArrayBufferSize);
      this.childrenBindings.forEach((binding, index) => {
        let offset = bufferElementsArrayBufferSize;
        for (let i = 0; i < index; i++) {
          offset += this.childrenBindings[i].arrayBuffer.byteLength;
        }
        const bufferElLastRow = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1 : 0;
        const bindingLastRow = index > 0 ? this.childrenBindings[index - 1].bufferElements.length ? this.childrenBindings[index - 1].bufferElements[this.childrenBindings[index - 1].bufferElements.length - 1].alignment.end.row + 1 : 0 : 0;
        binding.bufferElements.forEach((bufferElement) => {
          const rowOffset = index === 0 ? bufferElLastRow + bindingLastRow : bindingLastRow;
          bufferElement.alignment.start.row += rowOffset;
          bufferElement.alignment.end.row += rowOffset;
        });
        binding.arrayView = new DataView(this.arrayBuffer, offset, binding.arrayBuffer.byteLength);
        for (const bufferElement of binding.bufferElements) {
          bufferElement.setView(this.arrayBuffer, binding.arrayView);
        }
      });
      if (!this.options.buffer) {
        this.buffer.size = this.arrayBuffer.byteLength;
      }
      for (const bufferElement of this.bufferElements) {
        bufferElement.setView(this.arrayBuffer, this.arrayView);
      }
      this.shouldUpdate = this.arrayBufferSize > 0;
    }
    /**
     * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
     */
    setWGSLFragment() {
      if (!this.bufferElements.length && !this.childrenBindings.length) return;
      const kebabCaseLabel = toKebabCase(this.label);
      if (this.useStruct) {
        const structs = {};
        structs[kebabCaseLabel] = {};
        const bufferElements = this.bufferElements.filter(
          (bufferElement) => !(bufferElement instanceof BufferInterleavedArrayElement)
        );
        const interleavedBufferElements = this.bufferElements.filter(
          (bufferElement) => bufferElement instanceof BufferInterleavedArrayElement
        );
        if (interleavedBufferElements.length) {
          const arrayLength = this.bindingType === "uniform" ? `, ${interleavedBufferElements[0].numElements}` : "";
          if (bufferElements.length) {
            structs[`${kebabCaseLabel}Element`] = {};
            interleavedBufferElements.forEach((binding) => {
              structs[`${kebabCaseLabel}Element`][binding.name] = BufferElement.getType(binding.type);
            });
            bufferElements.forEach((binding) => {
              structs[kebabCaseLabel][binding.name] = binding.type;
            });
            const interleavedBufferName = this.bufferElements.find((bufferElement) => bufferElement.name === "elements") ? `${this.name}Elements` : "elements";
            structs[kebabCaseLabel][interleavedBufferName] = `array<${kebabCaseLabel}Element${arrayLength}>`;
            const varType = getBindingWGSLVarType(this);
            this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
          } else {
            this.bufferElements.forEach((binding) => {
              structs[kebabCaseLabel][binding.name] = BufferElement.getType(binding.type);
            });
            const varType = getBindingWGSLVarType(this);
            this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}${arrayLength}>;`];
          }
        } else {
          bufferElements.forEach((binding) => {
            const bindingType = this.bindingType === "uniform" && "numElements" in binding ? `array<${BufferElement.getType(binding.type)}, ${binding.numElements}>` : binding.type;
            structs[kebabCaseLabel][binding.name] = bindingType;
          });
          const varType = getBindingWGSLVarType(this);
          this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
        }
        if (this.childrenBindings.length) {
          this.options.childrenBindings.forEach((child) => {
            structs[kebabCaseLabel][child.binding.name] = child.count && child.count > 1 || child.forceArray ? this.bindingType === "uniform" && child.binding.bindingType === "uniform" ? `array<${toKebabCase(child.binding.label)}, ${child.count}>` : `array<${toKebabCase(child.binding.label)}>` : toKebabCase(child.binding.label);
          });
        }
        const additionalBindings = this.childrenBindings.length ? this.options.childrenBindings.map((child) => child.binding.wgslStructFragment).join("\n\n") + "\n\n" : "";
        this.wgslStructFragment = additionalBindings + Object.keys(structs).reverse().map((struct) => {
          return `struct ${struct} {
	${Object.keys(structs[struct]).map((binding) => `${binding}: ${structs[struct][binding]}`).join(",\n	")}
};`;
        }).join("\n\n");
      } else {
        this.wgslStructFragment = "";
        this.wgslGroupFragment = this.bufferElements.map((binding) => {
          const varType = getBindingWGSLVarType(this);
          return `${varType} ${binding.name}: ${binding.type};`;
        });
      }
    }
    /**
     * Set a {@link BufferBinding#shouldUpdate | binding shouldUpdate} flag to `true` to update our {@link arrayBuffer} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName = "") {
      if (this.inputs[bindingName]) {
        this.inputs[bindingName].shouldUpdate = true;
      }
    }
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link inputs} has changed, run its `onBeforeUpdate` callback then updates our {@link arrayBuffer} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
     */
    update() {
      if (this.options.buffer) {
        this.shouldUpdate = false;
        return;
      }
      const inputs = Object.values(this.inputs);
      for (const binding of inputs) {
        const bufferElement = this.bufferElements.find((bufferEl) => bufferEl.key === binding.name);
        if (binding.shouldUpdate && bufferElement) {
          binding.onBeforeUpdate && binding.onBeforeUpdate();
          bufferElement.update(binding.value);
          this.shouldUpdate = true;
          binding.shouldUpdate = false;
        }
      }
      this.childrenBindings.forEach((binding) => {
        binding.update();
        if (binding.shouldUpdate) {
          this.shouldUpdate = true;
        }
        binding.shouldUpdate = false;
      });
      if (this.shouldUpdate && this.parent && this.parentViewSetBufferEls) {
        let index = 0;
        this.parentViewSetBufferEls.forEach((viewSetBuffer, i) => {
          const { bufferElement, viewSetFunction } = viewSetBuffer;
          bufferElement.view.forEach((value) => {
            viewSetFunction(index * bufferElement.view.BYTES_PER_ELEMENT, value, true);
            index++;
          });
        });
        this.parent.shouldUpdate = true;
        this.shouldUpdate = false;
      }
    }
    /**
     * Extract the data corresponding to a specific {@link BufferElement} from a {@link Float32Array} holding the {@link BufferBinding#buffer | GPU buffer} data of this {@link BufferBinding}
     * @param parameters - parameters used to extract the data
     * @param parameters.result - {@link Float32Array} holding {@link GPUBuffer} data
     * @param parameters.bufferElementName - name of the {@link BufferElement} to use to extract the data
     * @returns - extracted data from the {@link Float32Array}
     */
    extractBufferElementDataFromBufferResult({
      result,
      bufferElementName
    }) {
      const bufferElement = this.bufferElements.find((bufferElement2) => bufferElement2.name === bufferElementName);
      if (bufferElement) {
        return bufferElement.extractDataFromBufferResult(result);
      } else {
        return result;
      }
    }
  };
  _parent = new WeakMap();
  let BufferBinding = _BufferBinding;

  class WritableBufferBinding extends BufferBinding {
    /**
     * WritableBufferBinding constructor
     * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
     */
    constructor({
      label = "Work",
      name = "work",
      bindingType,
      visibility,
      useStruct = true,
      access = "read_write",
      usage = [],
      struct = {},
      childrenBindings = [],
      buffer = null,
      parent = null,
      minOffset = 256,
      offset = 0,
      shouldCopyResult = false
    }) {
      bindingType = "storage";
      visibility = ["compute"];
      super({
        label,
        name,
        bindingType,
        visibility,
        useStruct,
        access,
        usage,
        struct,
        childrenBindings,
        buffer,
        parent,
        minOffset,
        offset
      });
      this.options = {
        ...this.options,
        shouldCopyResult
      };
      this.shouldCopyResult = shouldCopyResult;
      this.cacheKey += `${shouldCopyResult},`;
      this.resultBuffer = new Buffer();
    }
  }

  class BindGroup {
    /**
     * BindGroup constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
     * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}.
     */
    constructor(renderer, { label = "BindGroup", index = 0, bindings = [], uniforms, storages } = {}) {
      this.type = "BindGroup";
      this.setRenderer(renderer);
      this.options = {
        label,
        index,
        bindings,
        ...uniforms && { uniforms },
        ...storages && { storages }
      };
      this.index = index;
      this.uuid = generateUUID();
      this.bindings = [];
      this.bufferBindings = [];
      this.uniforms = {};
      this.storages = {};
      bindings.length && this.addBindings(bindings);
      if (this.options.uniforms || this.options.storages) this.setInputBindings();
      this.layoutCacheKey = "";
      this.pipelineCacheKey = "";
      this.resetEntries();
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.needsPipelineFlush = false;
      this.consumers = /* @__PURE__ */ new Set();
      this.renderer.addBindGroup(this);
    }
    /**
     * Set or reset this {@link BindGroup} {@link BindGroup.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
    }
    /**
     * Sets our {@link BindGroup#index | bind group index}.
     * @param index - {@link BindGroup#index | bind group index} to set.
     */
    setIndex(index) {
      this.index = index;
    }
    /**
     * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array.
     * @param bindings - {@link bindings} to add.
     */
    addBindings(bindings = []) {
      bindings.forEach((binding) => {
        this.addBinding(binding);
      });
    }
    /**
     * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array.
     * @param binding - binding to add.
     */
    addBinding(binding) {
      if ("buffer" in binding) {
        if (binding.parent) {
          this.renderer.deviceManager.bufferBindings.set(binding.parent.cacheKey, binding.parent);
          binding.parent.buffer.consumers.add(this.uuid);
        } else {
          this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
          binding.buffer.consumers.add(this.uuid);
        }
        if ("resultBuffer" in binding) {
          binding.resultBuffer.consumers.add(this.uuid);
        }
        this.bufferBindings.push(binding);
        if (binding.bindingType === "uniform") {
          this.uniforms[binding.name] = binding.inputs;
        } else {
          this.storages[binding.name] = binding.inputs;
        }
      }
      this.bindings.push(binding);
    }
    /**
     * Destroy a {@link BufferBinding} buffers.
     * @param binding - {@link BufferBinding} from which to destroy the buffers.
     */
    destroyBufferBinding(binding) {
      if ("buffer" in binding) {
        this.renderer.removeBuffer(binding.buffer);
        binding.buffer.consumers.delete(this.uuid);
        if (!binding.buffer.consumers.size) {
          binding.buffer.destroy();
        }
        if (binding.parent) {
          binding.parent.buffer.consumers.delete(this.uuid);
          if (!binding.parent.buffer.consumers.size) {
            this.renderer.removeBuffer(binding.parent.buffer);
            binding.parent.buffer.destroy();
          }
        }
      }
      if ("resultBuffer" in binding) {
        this.renderer.removeBuffer(binding.resultBuffer);
        binding.resultBuffer.consumers.delete(this.uuid);
        if (!binding.resultBuffer.consumers.size) {
          binding.resultBuffer.destroy();
        }
      }
    }
    /**
     * Creates Bindings based on a list of inputs.
     * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}.
     * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding.
     * @returns - A {@link bindings} array.
     */
    createInputBindings(bindingType = "uniform", inputs = {}) {
      let bindings = [
        ...Object.keys(inputs).map((inputKey) => {
          const binding = inputs[inputKey];
          if (!binding.struct) return;
          const bindingParams = {
            label: toKebabCase(binding.label || inputKey),
            name: inputKey,
            bindingType,
            visibility: binding.access === "read_write" ? ["compute"] : binding.visibility,
            useStruct: true,
            // by default
            access: binding.access ?? "read",
            // read by default
            ...binding.usage && { usage: binding.usage },
            struct: binding.struct,
            ...binding.shouldCopyResult !== void 0 && { shouldCopyResult: binding.shouldCopyResult }
          };
          if (binding.useStruct !== false) {
            let key = `${bindingType},${binding.visibility === void 0 ? "all" : binding.access === "read_write" ? "compute" : binding.visibility},true,${binding.access ?? "read"},`;
            Object.keys(binding.struct).forEach((bindingKey) => {
              key += `${bindingKey},${binding.struct[bindingKey].type},`;
            });
            if (binding.shouldCopyResult !== void 0) {
              key += `${binding.shouldCopyResult},`;
            }
            const cachedBinding = this.renderer.deviceManager.bufferBindings.get(key);
            if (cachedBinding) {
              return cachedBinding.clone(bindingParams);
            }
          }
          const BufferBindingConstructor = bindingParams.access === "read_write" ? WritableBufferBinding : BufferBinding;
          return binding.useStruct !== false ? new BufferBindingConstructor(bindingParams) : Object.keys(binding.struct).map((bindingKey) => {
            bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey);
            bindingParams.name = inputKey + bindingKey;
            bindingParams.useStruct = false;
            bindingParams.struct = { [bindingKey]: binding.struct[bindingKey] };
            return new BufferBindingConstructor(bindingParams);
          });
        })
      ].flat();
      bindings = bindings.filter(Boolean);
      bindings.forEach((binding) => {
        this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
      });
      return bindings;
    }
    /**
     * Create and adds {@link bindings} based on inputs provided upon creation.
     */
    setInputBindings() {
      this.addBindings([
        ...this.createInputBindings("uniform", this.options.uniforms),
        ...this.createInputBindings("storage", this.options.storages)
      ]);
    }
    /**
     * Get whether the GPU bind group is ready to be created.
     * It can be created if it has {@link bindings} and has not been created yet.
     * @readonly
     */
    get shouldCreateBindGroup() {
      return !this.bindGroup && !!this.bindings.length;
    }
    /**
     * Reset our {@link BindGroup} {@link entries}.
     */
    resetEntries() {
      this.entries = {
        bindGroupLayout: [],
        bindGroup: []
      };
    }
    /**
     * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}.
     */
    createBindGroup() {
      this.fillEntries();
      this.setBindGroupLayout();
      this.setBindGroup();
    }
    /**
     * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}.
     */
    resetBindGroup() {
      this.entries.bindGroup = [];
      this.pipelineCacheKey = "";
      for (const binding of this.bindings) {
        this.addBindGroupEntry(binding);
      }
      this.setBindGroup();
    }
    /**
     * Add a {@link BindGroup#entries.bindGroup | bindGroup entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupEntry(binding) {
      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource
      });
      this.pipelineCacheKey += binding.cacheKey;
    }
    /**
     * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
     */
    resetBindGroupLayout() {
      this.entries.bindGroupLayout = [];
      this.layoutCacheKey = "";
      for (const binding of this.bindings) {
        this.addBindGroupLayoutEntry(binding);
      }
      this.setBindGroupLayout();
    }
    /**
     * Add a {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupLayoutEntry(binding) {
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility
      });
      this.layoutCacheKey += binding.resourceLayoutCacheKey;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
     */
    loseContext() {
      this.resetEntries();
      for (const binding of this.bufferBindings) {
        binding.buffer.reset();
        if (binding.parent) {
          binding.parent.buffer.reset();
        }
        if ("resultBuffer" in binding) {
          binding.resultBuffer.reset();
        }
      }
      this.bindGroup = null;
      this.bindGroupLayout = null;
      this.needsPipelineFlush = true;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to update our bindings.
     */
    restoreContext() {
      if (this.shouldCreateBindGroup) {
        this.createBindGroup();
      }
      for (const bufferBinding of this.bufferBindings) {
        bufferBinding.shouldUpdate = true;
      }
    }
    /**
     * Creates binding GPUBuffer with correct params.
     * @param binding - The binding element.
     * @param optionalLabel - Optional label to use for the {@link GPUBuffer}.
     */
    createBindingBuffer(binding, optionalLabel = null) {
      binding.buffer.createBuffer(this.renderer, {
        label: optionalLabel || this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
        usage: [...["copySrc", "copyDst", binding.bindingType], ...binding.options.usage]
      });
      if ("resultBuffer" in binding) {
        binding.resultBuffer.createBuffer(this.renderer, {
          label: this.options.label + ": Result buffer from: " + binding.label,
          size: binding.arrayBuffer.byteLength,
          usage: ["copyDst", "mapRead"]
        });
      }
      this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
    }
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer struct, create a GPUBuffer first if needed
     */
    fillEntries() {
      for (const binding of this.bindings) {
        if (!binding.visibility) {
          binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        }
        if ("buffer" in binding) {
          if (binding.parent && !binding.parent.buffer.GPUBuffer) {
            this.createBindingBuffer(binding.parent, binding.parent.options.label);
          } else if (!binding.buffer.GPUBuffer && !binding.parent) {
            this.createBindingBuffer(binding);
          }
        }
        this.addBindGroupLayoutEntry(binding);
        this.addBindGroupEntry(binding);
      }
    }
    /**
     * Get a bind group binding by name/key
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName = "") {
      return this.bindings.find((binding) => binding.name === bindingName);
    }
    /**
     * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
     */
    setBindGroupLayout() {
      const bindGroupLayout = this.renderer.deviceManager.bindGroupLayouts.get(this.layoutCacheKey);
      if (bindGroupLayout) {
        this.bindGroupLayout = bindGroupLayout;
      } else {
        this.bindGroupLayout = this.renderer.createBindGroupLayout({
          label: this.options.label + " layout",
          entries: this.entries.bindGroupLayout
        });
        this.renderer.deviceManager.bindGroupLayouts.set(this.layoutCacheKey, this.bindGroupLayout);
      }
    }
    /**
     * Create a GPUBindGroup and set our {@link bindGroup}
     */
    setBindGroup() {
      this.bindGroup = this.renderer.createBindGroup({
        label: this.options.label,
        layout: this.bindGroupLayout,
        entries: this.entries.bindGroup
      });
    }
    /**
     * Check whether we should update (write) our {@link GPUBuffer} or not.
     */
    updateBufferBindings() {
      this.bindings.forEach((binding, index) => {
        if ("buffer" in binding) {
          binding.update();
          if (binding.shouldUpdate && binding.buffer.GPUBuffer) {
            if (!binding.useStruct && binding.bufferElements.length > 1) {
              this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.bufferElements[index].view);
            } else {
              this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.arrayBuffer);
            }
            binding.shouldUpdate = false;
          }
        }
      });
    }
    /**
     * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
     * Called at each render from the parentMesh {@link core/materials/Material.Material | material}
     */
    update() {
      this.updateBufferBindings();
      const needBindGroupReset = this.bindings.some((binding) => binding.shouldResetBindGroup);
      const needBindGroupLayoutReset = this.bindings.some((binding) => binding.shouldResetBindGroupLayout);
      if (needBindGroupReset || needBindGroupLayoutReset) {
        this.renderer.onAfterCommandEncoderSubmission.add(
          () => {
            for (const binding of this.bindings) {
              binding.shouldResetBindGroup = false;
              binding.shouldResetBindGroupLayout = false;
            }
          },
          { once: true }
        );
      }
      if (needBindGroupLayoutReset) {
        this.resetBindGroupLayout();
        this.needsPipelineFlush = true;
      }
      if (needBindGroupReset) {
        this.resetBindGroup();
      }
    }
    /**
     * Clones a {@link BindGroup} from a list of {@link BindGroup.bindings | bindings}.
     * Useful to create a new bind group with already created buffers, but swapped.
     * @param parameters - parameters to use for cloning.
     * @param parameters.bindings - our input {@link BindGroup.bindings | bindings}.
     * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not.
     * @returns - the cloned {@link BindGroup}.
     */
    clone({
      bindings = [],
      keepLayout = false
    } = {}) {
      const params = { ...this.options };
      params.label += " (copy)";
      const bindGroupCopy = new this.constructor(this.renderer, {
        label: params.label
      });
      bindGroupCopy.setIndex(this.index);
      bindGroupCopy.options = params;
      const bindingsRef = bindings.length ? bindings : this.bindings;
      for (const binding of bindingsRef) {
        bindGroupCopy.addBinding(binding);
        if ("buffer" in binding) {
          if (binding.parent && !binding.parent.buffer.GPUBuffer) {
            this.createBindingBuffer(binding.parent, binding.parent.options.label);
            binding.parent.buffer.consumers.add(bindGroupCopy.uuid);
          } else if (!binding.buffer.GPUBuffer && !binding.parent) {
            this.createBindingBuffer(binding);
          }
          if ("resultBuffer" in binding) {
            binding.resultBuffer.consumers.add(bindGroupCopy.uuid);
          }
        }
        if (!keepLayout) {
          bindGroupCopy.addBindGroupLayoutEntry(binding);
        }
        bindGroupCopy.addBindGroupEntry(binding);
      }
      if (keepLayout) {
        bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout];
        bindGroupCopy.layoutCacheKey = this.layoutCacheKey;
      }
      bindGroupCopy.setBindGroupLayout();
      bindGroupCopy.setBindGroup();
      return bindGroupCopy;
    }
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy() {
      this.renderer.removeBindGroup(this);
      for (const binding of this.bufferBindings) {
        this.destroyBufferBinding(binding);
      }
      this.bindings = [];
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.resetEntries();
    }
  }

  class TextureBinding extends Binding {
    /**
     * TextureBinding constructor
     * @param parameters - {@link TextureBindingParams | parameters} used to create our {@link TextureBinding}
     */
    constructor({
      label = "Texture",
      name = "texture",
      bindingType,
      visibility,
      texture,
      format = "rgba8unorm",
      access = "write",
      viewDimension = "2d",
      multisampled = false
    }) {
      bindingType = bindingType ?? "texture";
      if (bindingType === "storage") {
        visibility = ["compute"];
      }
      super({ label, name, bindingType, visibility });
      this.options = {
        ...this.options,
        texture,
        format,
        access,
        viewDimension,
        multisampled
      };
      this.cacheKey += `${format},${access},${viewDimension},${multisampled},`;
      this.resource = texture;
      this.setWGSLFragment();
    }
    /**
     * Get bind group layout entry resource, either for {@link GPUDevice.createBindGroupLayout().texture | GPUBindGroupLayout entry texture resource}, {@link GPUDevice.createBindGroupLayout().storageTexture | GPUBindGroupLayout entry storageTexture resource} or {@link GPUDevice.createBindGroupLayout().externalTexture | GPUBindGroupLayout entry externalTexture resource}.
     * @readonly
     */
    get resourceLayout() {
      return getBindGroupLayoutTextureBindingType(this);
    }
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey() {
      return getBindGroupLayoutTextureBindingCacheKey(this);
    }
    /**
     * Get the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
     */
    get resource() {
      return this.texture instanceof GPUTexture ? this.texture.createView({ label: this.options.label + " view", dimension: this.options.viewDimension }) : this.texture instanceof GPUExternalTexture ? this.texture : null;
    }
    /**
     * Set the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
     * @param value - new bind group resource
     */
    set resource(value) {
      if (value || this.texture) this.shouldResetBindGroup = true;
      this.texture = value;
    }
    /**
     * Set or update our {@link Binding#bindingType | bindingType} and our WGSL code snippet
     * @param bindingType - the new {@link Binding#bindingType | binding type}
     */
    setBindingType(bindingType) {
      if (bindingType !== this.bindingType) {
        if (bindingType) this.shouldResetBindGroupLayout = true;
        this.bindingType = bindingType;
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
        this.setWGSLFragment();
      }
    }
    /**
     * Set or update our texture {@link TextureBindingParams#format | format}. Note that if the texture is a `storage` {@link bindingType} and the `format` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param format - new texture {@link TextureBindingParams#format | format} value to use
     */
    setFormat(format) {
      const isNewFormat = format !== this.options.format;
      this.options.format = format;
      if (isNewFormat && this.bindingType === "storage") {
        this.setWGSLFragment();
        this.shouldResetBindGroupLayout = true;
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
      }
    }
    /**
     * Set or update our texture {@link TextureBindingParams#multisampled | multisampled}. Note that if the texture is not a `storage` {@link bindingType} and the `multisampled` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param multisampled - new texture {@link TextureBindingParams#multisampled | multisampled} value to use
     */
    setMultisampled(multisampled) {
      const isNewMultisampled = multisampled !== this.options.multisampled;
      this.options.multisampled = multisampled;
      if (isNewMultisampled && this.bindingType !== "storage") {
        this.setWGSLFragment();
        this.shouldResetBindGroupLayout = true;
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
      }
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [`${getTextureBindingWGSLVarType(this)}`];
    }
  }

  const textureUsages = /* @__PURE__ */ new Map([
    ["copySrc", WebGPUTextureUsageConstants.COPY_SRC],
    ["copyDst", WebGPUTextureUsageConstants.COPY_DST],
    ["renderAttachment", WebGPUTextureUsageConstants.RENDER_ATTACHMENT],
    ["storageBinding", WebGPUTextureUsageConstants.STORAGE_BINDING],
    ["textureBinding", WebGPUTextureUsageConstants.TEXTURE_BINDING]
  ]);
  const getTextureUsages = (usages = []) => {
    return usages.reduce((acc, v) => {
      return acc | textureUsages.get(v);
    }, 0);
  };
  const getDefaultTextureUsage = (usages = [], textureType) => {
    if (usages.length) {
      return getTextureUsages(usages);
    }
    return textureType !== "storage" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
  };
  const getDefaultMediaTextureUsage = (usages = []) => {
    return getDefaultTextureUsage(usages, "texture");
  };
  const getNumMipLevels = (...sizes) => {
    const maxSize = Math.max(...sizes);
    return 1 + Math.log2(maxSize) | 0;
  };

  var __typeError$v = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$v = (obj, member, msg) => member.has(obj) || __typeError$v("Cannot " + msg);
  var __privateGet$t = (obj, member, getter) => (__accessCheck$v(obj, member, "read from private field"), member.get(obj));
  var __privateAdd$v = (obj, member, value) => member.has(obj) ? __typeError$v("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$s = (obj, member, value, setter) => (__accessCheck$v(obj, member, "write to private field"), member.set(obj, value), value);
  var _autoResize;
  const defaultTextureParams = {
    label: "Texture",
    name: "renderTexture",
    // default to 'renderTexture' for render target usage
    type: "texture",
    access: "write",
    fromTexture: null,
    viewDimension: "2d",
    sampleCount: 1,
    qualityRatio: 1,
    // copy external texture options
    generateMips: false,
    flipY: false,
    premultipliedAlpha: false,
    aspect: "all",
    colorSpace: "srgb",
    autoDestroy: true
  };
  class Texture {
    /**
     * Texture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
     */
    constructor(renderer, parameters = defaultTextureParams) {
      /** Whether this texture should be automatically resized when the {@link Renderer renderer} size changes. Default to true. */
      __privateAdd$v(this, _autoResize, true);
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " Texture" : "Texture");
      this.type = "Texture";
      this.renderer = renderer;
      this.uuid = generateUUID();
      this.options = { ...defaultTextureParams, ...parameters };
      if (this.options.format === "rgba32float" && this.renderer.device && !this.renderer.device.features.has("float32-filterable")) {
        this.options.format = "rgba16float";
      }
      if (parameters.fromTexture) {
        this.options.format = parameters.fromTexture.texture.format;
        this.options.sampleCount = parameters.fromTexture.texture.sampleCount;
        this.options.viewDimension = parameters.fromTexture.options.viewDimension;
      }
      if (!this.options.format) {
        this.options.format = this.renderer.options.context.format;
      }
      const { width, height } = this.renderer.canvas;
      this.size = this.options.fixedSize ? {
        width: this.options.fixedSize.width * this.options.qualityRatio,
        height: this.options.fixedSize.height * this.options.qualityRatio,
        depth: this.options.fixedSize.depth ?? this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
      } : {
        width: Math.floor(width * this.options.qualityRatio),
        height: Math.floor(height * this.options.qualityRatio),
        depth: this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
      };
      if (this.options.fixedSize) {
        __privateSet$s(this, _autoResize, false);
      }
      this.setBindings();
      this.renderer.addTexture(this);
      this.createTexture();
    }
    /**
     * Reset this {@link Texture} {@link Texture.renderer | renderer}, and resize it if needed.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.removeTexture(this);
      }
      renderer = isRenderer(renderer, this.options.label + " Texture");
      this.renderer = renderer;
      this.renderer.addTexture(this);
      const { width, height } = this.renderer.canvas;
      if (__privateGet$t(this, _autoResize) && (this.size.width !== width * this.options.qualityRatio || this.size.height !== height * this.options.qualityRatio)) {
        this.resize();
      }
    }
    /**
     * Set our {@link Texture#bindings | bindings}.
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": " + this.options.name + " texture",
          name: this.options.name,
          bindingType: this.options.type,
          visibility: this.options.visibility,
          texture: this.texture,
          format: this.options.format,
          viewDimension: this.options.viewDimension,
          multisampled: this.options.sampleCount > 1
        })
      ];
    }
    /**
     * Get our {@link TextureBinding | texture binding}.
     * @readonly
     */
    get textureBinding() {
      return this.bindings[0];
    }
    /**
     * Copy another {@link Texture} into this {@link Texture}.
     * @param texture - {@link Texture} to copy.
     */
    copy(texture) {
      this.options.fromTexture = texture;
      this.createTexture();
    }
    /**
     * Copy a {@link GPUTexture} directly into this {@link Texture}. Mainly used for depth textures.
     * @param texture - {@link GPUTexture} to copy.
     */
    copyGPUTexture(texture) {
      this.size = {
        width: texture.width,
        height: texture.height,
        depth: texture.depthOrArrayLayers
      };
      this.options.format = texture.format;
      this.options.sampleCount = texture.sampleCount;
      this.texture = texture;
      this.textureBinding.setFormat(this.options.format);
      this.textureBinding.setMultisampled(this.options.sampleCount > 1);
      this.textureBinding.resource = this.texture;
    }
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
     */
    createTexture() {
      if (!this.renderer.device || !this.size.width || !this.size.height) return;
      if (this.options.fromTexture) {
        this.copyGPUTexture(this.options.fromTexture.texture);
        return;
      }
      this.texture?.destroy();
      this.texture = this.renderer.createTexture({
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height, this.size.depth ?? 1],
        dimensions: this.options.viewDimension,
        sampleCount: this.options.sampleCount,
        mipLevelCount: this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1) : 1,
        usage: getDefaultTextureUsage(this.options.usage, this.options.type)
      });
      this.textureBinding.resource = this.texture;
    }
    /**
     * Upload a source to the GPU and use it for our {@link texture}.
     * @param parameters - parameters used to upload the source.
     * @param parameters.source - source to use for our {@link texture}.
     * @param parameters.width - source width.
     * @param parameters.height - source height.
     * @param parameters.depth - source depth.
     * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the source copy.
     */
    uploadSource({
      source,
      width = this.size.width,
      height = this.size.height,
      depth = this.size.depth,
      origin = [0, 0, 0],
      colorSpace = "srgb"
    }) {
      this.renderer.deviceManager.copyExternalImageToTexture(
        { source, flipY: this.options.flipY },
        { texture: this.texture, premultipliedAlpha: this.options.premultipliedAlpha, origin, colorSpace },
        [width, height, depth]
      );
      if (this.texture.mipLevelCount > 1) {
        this.renderer.generateMips(this);
      }
    }
    /**
     * Use data as the {@link texture} source and upload it to the GPU.
     * @param parameters - parameters used to upload the source.
     * @param parameters.width - data source width.
     * @param parameters.height - data source height.
     * @param parameters.depth - data source depth.
     * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the data source copy.
     * @param parameters.data - {@link Float32Array} data to use as source.
     */
    uploadData({
      width = this.size.width,
      height = this.size.height,
      depth = this.size.depth,
      origin = [0, 0, 0],
      data = new Float32Array(width * height * 4)
    }) {
      this.renderer.device.queue.writeTexture(
        { texture: this.texture, origin },
        data,
        { bytesPerRow: width * data.BYTES_PER_ELEMENT * 4, rowsPerImage: height },
        [width, height, depth]
      );
      if (this.texture.mipLevelCount > 1) {
        this.renderer.generateMips(this);
      }
    }
    /**
     * Update our {@link Texture} quality ratio and resize it.
     * @param qualityRatio - New quality ratio to use.
     */
    setQualityRatio(qualityRatio = 1) {
      this.options.qualityRatio = qualityRatio;
      this.resize();
    }
    /**
     * Resize our {@link Texture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update.
     * @param size - the optional new {@link TextureSize | size} to set.
     */
    resize(size = null) {
      if (!__privateGet$t(this, _autoResize)) return;
      if (!size) {
        const { width, height } = this.renderer.canvas;
        size = {
          width: Math.floor(width * this.options.qualityRatio),
          height: Math.floor(height * this.options.qualityRatio),
          depth: this.size.depth
        };
      }
      if (size.width === this.size.width && size.height === this.size.height && size.depth === this.size.depth) {
        return;
      }
      this.setSize(size);
    }
    /**
     * Set our {@link Texture} {@link Texture.size | size}, recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update.
     * @param size - the new {@link TextureSize | size} to set.
     */
    setSize(size) {
      this.size = size;
      this.createTexture();
    }
    /**
     * Destroy our {@link Texture}.
     */
    destroy() {
      this.renderer.removeTexture(this);
      if (!this.options.fromTexture) {
        this.texture?.destroy();
      }
      this.texture = null;
    }
  }
  _autoResize = new WeakMap();

  class Mat3 {
    // prettier-ignore
    /**
     * Mat3 constructor
     * @param elements - initial array to use, default to identity matrix
     */
    constructor(elements = new Float32Array([
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ])) {
      this.type = "Mat3";
      this.elements = elements;
    }
    /**
     * Sets the matrix from 9 numbers
     *
     * @param n11 - number
     * @param n12 - number
     * @param n13 - number
     * @param n21 - number
     * @param n22 - number
     * @param n23 - number
     * @param n31 - number
     * @param n32 - number
     * @param n33 - number
     * @returns - this {@link Mat3} after being set
     */
    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
      const te = this.elements;
      te[0] = n11;
      te[1] = n21;
      te[2] = n31;
      te[3] = n12;
      te[4] = n22;
      te[5] = n32;
      te[6] = n13;
      te[7] = n23;
      te[8] = n33;
      return this;
    }
    /**
     * Sets the {@link Mat3} to an identity matrix
     * @returns - this {@link Mat3} after being set
     */
    identity() {
      this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
      return this;
    }
    /**
     * Sets the {@link Mat3} values from an array
     * @param array - array to use
     * @param offset - optional offset in the array to use
     * @returns - this {@link Mat3} after being set
     */
    // prettier-ignore
    setFromArray(array = new Float32Array([
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ]), offset = 0) {
      for (let i = 0; i < this.elements.length; i++) {
        this.elements[i] = array[i + offset];
      }
      return this;
    }
    /**
     * Copy another {@link Mat3}
     * @param matrix - matrix to copy
     * @returns - this {@link Mat3} after being set
     */
    copy(matrix = new Mat3()) {
      const array = matrix.elements;
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      this.elements[4] = array[4];
      this.elements[5] = array[5];
      this.elements[6] = array[6];
      this.elements[7] = array[7];
      this.elements[8] = array[8];
      return this;
    }
    /**
     * Clone a {@link Mat3}
     * @returns - cloned {@link Mat3}
     */
    clone() {
      return new Mat3().copy(this);
    }
    /**
     * Set a {@link Mat3} from a {@link Mat4}.
     * @param matrix - {@link Mat4} to use.
     * @returns - this {@link Mat3} after being set.
     */
    setFromMat4(matrix = new Mat4()) {
      const me = matrix.elements;
      this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]);
      return this;
    }
    /**
     * Multiply this {@link Mat3} with another {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    multiply(matrix = new Mat3()) {
      return this.multiplyMatrices(this, matrix);
    }
    /**
     * Multiply another {@link Mat3} with this {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    premultiply(matrix = new Mat3()) {
      return this.multiplyMatrices(matrix, this);
    }
    /**
     * Multiply two {@link Mat3}
     * @param a - first {@link Mat3}
     * @param b - second {@link Mat3}
     * @returns - {@link Mat3} resulting from the multiplication
     */
    multiplyMatrices(a = new Mat3(), b = new Mat3()) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[3], a13 = ae[6];
      const a21 = ae[1], a22 = ae[4], a23 = ae[7];
      const a31 = ae[2], a32 = ae[5], a33 = ae[8];
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31;
      te[3] = a11 * b12 + a12 * b22 + a13 * b32;
      te[6] = a11 * b13 + a12 * b23 + a13 * b33;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31;
      te[4] = a21 * b12 + a22 * b22 + a23 * b32;
      te[7] = a21 * b13 + a22 * b23 + a23 * b33;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31;
      te[5] = a31 * b12 + a32 * b22 + a33 * b32;
      te[8] = a31 * b13 + a32 * b23 + a33 * b33;
      return this;
    }
    /**
     * Invert this {@link Mat3}.
     * @returns - this {@link Mat3} after being inverted
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8], t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13, det = n11 * t11 + n21 * t12 + n31 * t13;
      if (det === 0) return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n31 * n23 - n33 * n21) * detInv;
      te[2] = (n32 * n21 - n31 * n22) * detInv;
      te[3] = t12 * detInv;
      te[4] = (n33 * n11 - n31 * n13) * detInv;
      te[5] = (n31 * n12 - n32 * n11) * detInv;
      te[6] = t13 * detInv;
      te[7] = (n21 * n13 - n23 * n11) * detInv;
      te[8] = (n22 * n11 - n21 * n12) * detInv;
      return this;
    }
    /**
     * Transpose this {@link Mat3}.
     * @returns - this {@link Mat3} after being transposed
     */
    transpose() {
      let tmp;
      const m = this.elements;
      tmp = m[1];
      m[1] = m[3];
      m[3] = tmp;
      tmp = m[2];
      m[2] = m[6];
      m[6] = tmp;
      tmp = m[5];
      m[5] = m[7];
      m[7] = tmp;
      return this;
    }
    /**
     * Compute a normal {@link Mat3} matrix from a {@link Mat4} transformation matrix.
     * @param matrix - {@link Mat4} transformation matrix
     * @returns - this {@link Mat3} after being inverted and transposed
     */
    getNormalMatrix(matrix = new Mat4()) {
      return this.setFromMat4(matrix).invert().transpose();
    }
    /**
     * Set a transformation matrix from translation, scale and center 2D coordinates and a rotation. Useful to compute UV transformation matrices.
     * @param tx - translation along X axis.
     * @param ty - translation along Y axis.
     * @param sx - Scale along X axis.
     * @param sy - Scale along Y axis.
     * @param rotation - Rotation in radians.
     * @param cx - Center of the transformation along X axis.
     * @param cy - Center of the transformation along Y axis.
     */
    setUVTransform(tx = 0, ty = 0, sx = 1, sy = 1, rotation = 0, cx = 0, cy = 0) {
      const c = Math.cos(rotation);
      const s = Math.sin(rotation);
      this.set(
        sx * c,
        sx * s,
        -sx * (c * cx + s * cy) + cx + tx,
        -sy * s,
        sy * c,
        -sy * (-s * cx + c * cy) + cy + ty,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Rotate this {@link Mat3} by a given angle around X axis, counterclockwise.
     * @param theta - Angle to rotate along X axis.
     * @returns - this {@link Mat3} after rotation.
     */
    rotateByAngleX(theta = 0) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      this.set(1, 0, 0, 0, c, s, 0, -s, c);
      return this;
    }
    /**
     * Rotate this {@link Mat3} by a given angle around Y axis, counterclockwise.
     * @param theta - Angle to rotate along Y axis.
     * @returns - this {@link Mat3} after rotation.
     */
    rotateByAngleY(theta = 0) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      this.set(c, 0, s, 0, 1, 0, -s, 0, c);
      return this;
    }
    /**
     * Rotate this {@link Mat3} by a given angle around Z axis, counterclockwise.
     * @param theta - Angle to rotate along Z axis.
     * @returns - this {@link Mat3} after rotation.
     */
    rotateByAngleZ(theta = 0) {
      const c = Math.cos(theta);
      const s = Math.sin(theta);
      this.set(c, -s, 0, s, c, 0, 0, 0, 1);
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat3} by a translate matrix (i.e. translateMatrix = new Mat3().translate(vector)).
     * @param vector - translation {@link Vec2} to use.
     * @returns - this {@link Mat3} after the premultiply translate operation.
     */
    premultiplyTranslate(vector = new Vec2()) {
      const a11 = 1, a22 = 1, a33 = 1;
      const a13 = vector.x, a23 = vector.y;
      const be = this.elements;
      const te = this.elements;
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[0] = a11 * b11 + a13 * b31;
      te[3] = a11 * b12 + a13 * b32;
      te[6] = a11 * b13 + a13 * b33;
      te[1] = a22 * b21 + a23 * b31;
      te[4] = a22 * b22 + a23 * b32;
      te[7] = a22 * b23 + a23 * b33;
      te[2] = a33 * b31;
      te[5] = a33 * b32;
      te[8] = a33 * b33;
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat3} by a scale matrix (i.e. translateMatrix = new Mat3().scale(vector)).
     * @param vector - scale {@link Vec2} to use.
     * @returns - this {@link Mat3} after the premultiply scale operation.
     */
    premultiplyScale(vector = new Vec2()) {
      const a11 = vector.x, a22 = vector.y, a33 = 1;
      const be = this.elements;
      const te = this.elements;
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[0] = a11 * b11;
      te[3] = a11 * b12;
      te[6] = a11 * b13;
      te[1] = a22 * b21;
      te[4] = a22 * b22;
      te[7] = a22 * b23;
      te[2] = a33 * b31;
      te[5] = a33 * b32;
      te[8] = a33 * b33;
      return this;
    }
    /**
     * Translate a {@link Mat3}.
     * @param vector - translation {@link Vec2} to use.
     * @returns - translated {@link Mat3}.
     */
    translate(vector = new Vec2()) {
      const tx = vector.x, ty = vector.y;
      const be = this.elements;
      const te = this.elements;
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[6] = b11 * tx + b12 * ty + b13;
      te[7] = b21 * tx + b22 * ty + b23;
      te[8] = b31 * tx + b32 * ty + b33;
      return this;
    }
  }

  var __typeError$u = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$u = (obj, member, msg) => member.has(obj) || __typeError$u("Cannot " + msg);
  var __privateGet$s = (obj, member, getter) => (__accessCheck$u(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$u = (obj, member, value) => member.has(obj) ? __typeError$u("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$r = (obj, member, value, setter) => (__accessCheck$u(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$c = (obj, member, method) => (__accessCheck$u(obj, member, "access private method"), method);
  var _sourcesLoaded, _sourcesUploaded, _rotation, _MediaTexture_instances, setSourceLoaded_fn;
  const defaultMediaTextureParams = {
    label: "Texture",
    name: "texture",
    useExternalTextures: true,
    fromTexture: null,
    viewDimension: "2d",
    format: "rgba8unorm",
    // copy external texture options
    generateMips: false,
    flipY: false,
    premultipliedAlpha: false,
    colorSpace: "srgb",
    autoDestroy: true,
    // texture transform
    useTransform: false,
    placeholderColor: [0, 0, 0, 255],
    // default to solid black
    cache: true
  };
  const _MediaTexture = class _MediaTexture extends Texture {
    /**
     * Texture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
     */
    constructor(renderer, parameters = defaultMediaTextureParams) {
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " MediaTexture" : "MediaTexture");
      const params = { ...defaultMediaTextureParams, ...parameters };
      const { useTransform, placeholderColor, useExternalTextures, cache, ...baseTextureParams } = params;
      super(renderer, {
        ...baseTextureParams,
        ...{
          sampleCount: 1,
          type: "texture",
          access: "write",
          qualityRatio: 1,
          aspect: "all",
          // force fixed size to disable texture destroy on resize
          fixedSize: { width: parameters.fixedSize?.width ?? 1, height: parameters.fixedSize?.height ?? 1 }
        }
      });
      __privateAdd$u(this, _MediaTexture_instances);
      /** Whether the sources have been loaded. */
      __privateAdd$u(this, _sourcesLoaded);
      /** Whether the sources have been uploaded to the GPU, handled by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#texturesQueue | GPUDeviceManager texturesQueue array}. */
      __privateAdd$u(this, _sourcesUploaded);
      /** Rotation to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
      __privateAdd$u(this, _rotation);
      // callbacks / events
      /** function assigned to the {@link onSourceLoaded} callback */
      this._onSourceLoadedCallback = (source) => {
      };
      /** function assigned to the {@link onAllSourcesLoaded} callback */
      this._onAllSourcesLoadedCallback = () => {
      };
      /** function assigned to the {@link onSourceUploaded} callback */
      this._onSourceUploadedCallback = (source) => {
      };
      /** function assigned to the {@link onAllSourcesUploaded} callback */
      this._onAllSourcesUploadedCallback = () => {
      };
      this.type = "MediaTexture";
      this.options = {
        ...this.options,
        useTransform,
        placeholderColor,
        cache,
        useExternalTextures: !!useExternalTextures,
        ...{
          sources: [],
          sourcesTypes: []
        }
      };
      if (parameters.fromTexture && parameters.fromTexture instanceof _MediaTexture) {
        this.options.sources = parameters.fromTexture.options.sources;
        this.options.sourcesTypes = parameters.fromTexture.options.sourcesTypes;
        this.sources = parameters.fromTexture.sources;
      }
      __privateSet$r(this, _rotation, 0);
      this.offset = new Vec2().onChange(() => this.updateModelMatrix());
      this.scale = new Vec2(1).onChange(() => this.updateModelMatrix());
      this.transformOrigin = new Vec2().onChange(() => this.updateModelMatrix());
      this.modelMatrix = new Mat3();
      this.transformBinding = null;
      if (this.options.useTransform) {
        this.transformBinding = new BufferBinding({
          label: toKebabCase(this.options.name),
          name: this.options.name,
          struct: {
            matrix: {
              type: "mat3x3f",
              value: this.modelMatrix
            }
          }
        });
        this.updateModelMatrix();
      }
      this.externalTexture = null;
      this.sources = [];
      this.videoFrameCallbackIds = /* @__PURE__ */ new Map();
      this.sourcesLoaded = false;
      this.sourcesUploaded = false;
      this.renderer.uploadTexture(this);
    }
    /**
     * Get whether all our {@link sources} have been loaded.
     */
    get sourcesLoaded() {
      return __privateGet$s(this, _sourcesLoaded);
    }
    /**
     * Set whether all our {@link sources} have been loaded.
     * @param value - boolean flag indicating if all the {@link sources} have been loaded.
     */
    set sourcesLoaded(value) {
      if (value && !this.sourcesLoaded) {
        this._onAllSourcesLoadedCallback && this._onAllSourcesLoadedCallback();
      }
      __privateSet$r(this, _sourcesLoaded, value);
    }
    /**
     * Get whether all our {@link sources} have been uploaded.
     */
    get sourcesUploaded() {
      return __privateGet$s(this, _sourcesUploaded);
    }
    /**
     * Set whether all our {@link sources} have been uploaded.
     * @param value - boolean flag indicating if all the {@link sources} have been uploaded
     */
    set sourcesUploaded(value) {
      if (value && !this.sourcesUploaded) {
        this._onAllSourcesUploadedCallback && this._onAllSourcesUploadedCallback();
      }
      __privateSet$r(this, _sourcesUploaded, value);
    }
    /* TRANSFORM */
    /**
     * Get the actual {@link rotation} value.
     * @returns - the actual {@link rotation} value.
     */
    get rotation() {
      return __privateGet$s(this, _rotation);
    }
    /**
     * Set the actual {@link rotation} value and update the {@link modelMatrix}.
     * @param value - new {@link rotation} value to use.
     */
    set rotation(value) {
      __privateSet$r(this, _rotation, value);
      this.updateModelMatrix();
    }
    /**
     * Update the {@link modelMatrix} using the {@link offset}, {@link rotation}, {@link scale} and {@link transformOrigin} and tell the {@link transformBinding} to update, only if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`.
     */
    updateModelMatrix() {
      if (this.options.useTransform) {
        this.modelMatrix.setUVTransform(
          this.offset.x,
          this.offset.y,
          this.scale.x,
          this.scale.y,
          this.rotation,
          this.transformOrigin.x,
          this.transformOrigin.y
        );
        this.transformBinding.inputs.matrix.shouldUpdate = true;
      } else {
        throwWarning(
          `Texture: Cannot update ${this.options.name} transformation since its useTransform property has been set to false. You should set it to true when creating the Texture.`
        );
      }
    }
    /**
     * Set our {@link Texture#bindings | bindings}.
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": " + this.options.name + " texture",
          name: this.options.name,
          bindingType: this.options.type,
          visibility: this.options.visibility,
          texture: this.texture,
          format: this.options.format,
          viewDimension: this.options.viewDimension,
          multisampled: false
        })
      ];
    }
    /**
     * Copy another {@link Texture} into this {@link Texture}.
     * @param texture - {@link Texture} to copy.
     */
    copy(texture) {
      if (this.size.depth !== texture.size.depth) {
        throwWarning(
          `${this.options.label}: cannot copy a ${texture.options.label} because the depth sizes differ: ${this.size.depth} vs ${texture.size.depth}.`
        );
        return;
      }
      if (texture instanceof _MediaTexture) {
        if (this.options.sourcesTypes[0] === "externalVideo" && texture.options.sourcesTypes[0] !== "externalVideo") {
          throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`);
          return;
        } else if (this.options.sourcesTypes[0] !== "externalVideo" && texture.options.sourcesTypes[0] === "externalVideo") {
          throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`);
          return;
        }
        this.options.fixedSize = texture.options.fixedSize;
        this.sources = texture.sources;
        this.options.sources = texture.options.sources;
        this.options.sourcesTypes = texture.options.sourcesTypes;
        this.sourcesLoaded = texture.sourcesLoaded;
        this.sourcesUploaded = texture.sourcesUploaded;
      }
      super.copy(texture);
    }
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
     */
    createTexture() {
      if (!this.renderer.device || !this.size.width || !this.size.height) return;
      if (this.options.fromTexture && (!(this.options.fromTexture instanceof _MediaTexture) || this.options.fromTexture.sourcesUploaded)) {
        this.copyGPUTexture(this.options.fromTexture.texture);
        return;
      }
      const options = {
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height, this.size.depth ?? 1],
        dimensions: this.options.viewDimension,
        sampleCount: this.options.sampleCount,
        usage: getDefaultMediaTextureUsage(this.options.usage)
      };
      if (!this.sources?.length) {
        options.mipLevelCount = 1;
        this.texture?.destroy();
        this.texture = this.renderer.createTexture(options);
        this.textureBinding.resource = this.texture;
      } else if (!this.options.sourcesTypes.includes("externalVideo")) {
        options.mipLevelCount = this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1) : 1;
        this.texture?.destroy();
        this.texture = this.renderer.createTexture(options);
        this.textureBinding.resource = this.texture;
      }
    }
    /**
     * Resize our {@link MediaTexture}.
     */
    resize() {
      if (this.sources.length === 1 && this.sources[0] && this.sources[0].source instanceof HTMLCanvasElement && (this.sources[0].source.width !== this.size.width || this.sources[0].source.height !== this.size.height)) {
        this.setSourceSize();
        this.sources[0].shouldUpdate = true;
      } else {
        super.resize();
      }
    }
    /* SOURCES */
    /**
     * Set the {@link size} based on the first available loaded {@link sources}.
     */
    setSourceSize() {
      const source = this.sources.filter(Boolean).find((source2) => !!source2.sourceLoaded);
      this.options.fixedSize.width = Math.max(
        1,
        source.source.naturalWidth || source.source.width || source.source.videoWidth
      );
      this.options.fixedSize.height = Math.max(
        1,
        source.source.naturalHeight || source.source.height || source.source.videoHeight
      );
      this.size.width = this.options.fixedSize.width;
      this.size.height = this.options.fixedSize.height;
    }
    /**
     * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link MediaTextureSource.source | source}.
     * @param url - URL of the image to load.
     * @returns - the newly created {@link ImageBitmap}.
     */
    async loadImageBitmap(url) {
      if (url.includes(".webp")) {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            createImageBitmap(img, { colorSpaceConversion: "none" }).then(resolve).catch(reject);
          };
          img.onerror = reject;
          img.src = url;
        });
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        return await createImageBitmap(blob, { colorSpaceConversion: "none" });
      }
    }
    /**
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link MediaTextureSource.source | source} and create the {@link GPUTexture}.
     * @param source - the image URL or {@link HTMLImageElement} to load.
     */
    async loadImage(source) {
      const url = typeof source === "string" ? source : source.getAttribute("src");
      const sourceIndex = this.options.sources.length;
      if (this.size.depth > 1) {
        this.options.sources.push(url);
        this.options.sourcesTypes.push("image");
      } else {
        this.options.sources = [url];
        this.options.sourcesTypes = ["image"];
      }
      if (this.options.cache) {
        const cachedTexture = this.renderer.textures.filter((t) => t instanceof _MediaTexture && t.uuid !== this.uuid).find((t) => {
          const sourceIndex2 = t.options.sources.findIndex((source2) => source2 === url);
          if (sourceIndex2 === -1) return null;
          return t.sources[sourceIndex2]?.sourceLoaded && t.texture && t.size.depth === this.size.depth;
        });
        if (cachedTexture) {
          this.copy(cachedTexture);
          return;
        }
      }
      const loadedSource = await this.loadImageBitmap(url);
      this.useImageBitmap(loadedSource, sourceIndex);
    }
    /**
     * Use an already loaded {@link ImageBitmap} as a {@link sources}.
     * @param imageBitmap - {@link ImageBitmap} to use.
     * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
     */
    useImageBitmap(imageBitmap, sourceIndex = 0) {
      if (this.size.depth > 1) {
        this.sources[sourceIndex] = {
          source: imageBitmap,
          externalSource: null,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true
        };
      } else {
        this.sources = [
          {
            source: imageBitmap,
            externalSource: null,
            sourceLoaded: true,
            sourceUploaded: false,
            shouldUpdate: true
          }
        ];
      }
      this.setSourceSize();
      __privateMethod$c(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, imageBitmap);
    }
    /**
     * Load and create images using {@link loadImage} from an array of images sources as strings or {@link HTMLImageElement}. Useful for cube maps.
     * @param sources - Array of images sources as strings or {@link HTMLImageElement} to load.
     */
    async loadImages(sources) {
      for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
        this.loadImage(sources[i]);
      }
    }
    /**
     * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
     */
    uploadVideoTexture() {
      const source = this.sources[0];
      const video = source.source;
      if (source && video) {
        this.texture?.destroy();
        this.texture = null;
        try {
          source.externalSource = new VideoFrame(video);
        } catch (e) {
          const offscreen = new OffscreenCanvas(this.size.width, this.size.height);
          offscreen.getContext("2d");
          source.externalSource = new VideoFrame(offscreen, { timestamp: 0 });
        }
        this.externalTexture = this.renderer.importExternalTexture(source.externalSource, this.options.label);
        this.textureBinding.resource = this.externalTexture;
        this.textureBinding.setBindingType("externalTexture");
        source.shouldUpdate = false;
        this.setSourceUploaded(0);
      }
    }
    /**
     * Close an external source {@link VideoFrame} if any.
     */
    closeVideoFrame() {
      const source = this.sources[0];
      if (source && source.externalSource) {
        source.externalSource.close();
      }
    }
    // weirldy enough, we don't have to do anything in that callback
    // because the <video> is not visible in the viewport, the video playback is throttled
    // and the rendering is janky
    // using requestVideoFrameCallback helps preventing this but is unsupported in Firefox at the moment
    // WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    /**
     * Set our {@link MediaTextureSource.shouldUpdate | source shouldUpdate} flag to true at each new video frame.
     */
    onVideoFrameCallback(sourceIndex = 0) {
      if (this.videoFrameCallbackIds.get(sourceIndex)) {
        this.sources[sourceIndex].shouldUpdate = true;
        this.sources[sourceIndex].source.requestVideoFrameCallback(
          this.onVideoFrameCallback.bind(this, sourceIndex)
        );
      }
    }
    /**
     * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the {@link HTMLVideoElement} as a {@link MediaTextureSource.source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
     * @param video - the newly loaded {@link HTMLVideoElement}.
     * @param sourceIndex - Index of the {@link HTMLVideoElement} in the {@link sources} array.
     */
    onVideoLoaded(video, sourceIndex = 0) {
      if (!this.sources[sourceIndex].sourceLoaded) {
        if (this.options.sources[sourceIndex] instanceof MediaStream && video.paused) {
          video.addEventListener(
            "play",
            () => {
              this.sources[sourceIndex].sourceLoaded = true;
              this.sources[sourceIndex].shouldUpdate = true;
              this.setSourceSize();
            },
            { once: true }
          );
        } else {
          this.sources[sourceIndex].sourceLoaded = true;
          this.sources[sourceIndex].shouldUpdate = true;
          this.setSourceSize();
        }
        const videoFrameCallbackId = video.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this, sourceIndex));
        this.videoFrameCallbackIds.set(sourceIndex, videoFrameCallbackId);
        __privateMethod$c(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, video);
      }
    }
    /**
     * Get whether the provided source is a video.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the source is a video or not.
     */
    isVideoSource(source) {
      return source instanceof HTMLVideoElement;
    }
    /**
     * Get whether the provided video source is ready to be played.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the video source is ready to be played.
     */
    isVideoSourceReady(source) {
      if (!this.isVideoSource(source)) return false;
      return source.readyState >= source.HAVE_CURRENT_DATA;
    }
    /**
     * Get whether the provided video source is ready to be uploaded.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the video source is ready to be uploaded.
     */
    shouldUpdateVideoSource(source) {
      if (!this.isVideoSource(source)) return false;
      return this.isVideoSourceReady(source) && !source.paused;
    }
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback.
     * @param source - the video URL or {@link HTMLVideoElement} to load.
     */
    loadVideo(source) {
      let video;
      const sourceIndex = this.options.sources.length;
      if (typeof source === "string") {
        video = document.createElement("video");
        video.src = source;
      } else {
        video = source;
      }
      video.preload = "auto";
      video.muted = true;
      video.loop = true;
      video.crossOrigin = "anonymous";
      video.setAttribute("playsinline", "");
      this.useVideo(video, sourceIndex);
      if (isNaN(video.duration)) {
        video.load();
      }
    }
    /**
     * Use a {@link HTMLVideoElement} as a {@link sources}.
     * @param video - {@link HTMLVideoElement} to use.
     * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
     */
    useVideo(video, sourceIndex = 0) {
      const source = video.src ? video.src : video.srcObject ?? null;
      if (!source) {
        throwWarning(`MediaTexture (${this.options.label}): Can not use this video as it as no source.`);
        return;
      }
      if (this.size.depth > 1) {
        this.options.sources.push(source);
        this.options.sourcesTypes.push("video");
        this.sources[sourceIndex] = {
          source: video,
          externalSource: null,
          sourceLoaded: false,
          sourceUploaded: false,
          shouldUpdate: false
        };
      } else {
        this.options.sources = [source];
        this.options.sourcesTypes = [this.options.useExternalTextures ? "externalVideo" : "video"];
        this.sources = [
          {
            source: video,
            externalSource: null,
            sourceLoaded: false,
            sourceUploaded: false,
            shouldUpdate: false
          }
        ];
      }
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        this.onVideoLoaded(video, sourceIndex);
      } else {
        video.addEventListener("canplaythrough", this.onVideoLoaded.bind(this, video, sourceIndex), {
          once: true
        });
      }
    }
    /**
     * Load and create videos using {@link loadVideo} from an array of videos sources as strings or {@link HTMLVideoElement}. Useful for cube maps.
     * @param sources - Array of images sources as strings or {@link HTMLVideoElement} to load.
     */
    loadVideos(sources) {
      for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
        this.loadVideo(sources[i]);
      }
    }
    /**
     * Load a {@link HTMLCanvasElement} and use it as one of our {@link sources}.
     * @param source - the {@link HTMLCanvasElement} to use.
     */
    loadCanvas(source) {
      if (this.size.depth > 1) {
        const sourceIndex = this.options.sources.length;
        this.options.sources.push(source);
        this.options.sourcesTypes.push("canvas");
        this.sources[sourceIndex] = {
          source,
          externalSource: null,
          sourceLoaded: true,
          sourceUploaded: false,
          shouldUpdate: true
        };
      } else {
        this.options.sources = [source];
        this.options.sourcesTypes = ["canvas"];
        this.sources = [
          {
            source,
            externalSource: null,
            sourceLoaded: true,
            sourceUploaded: false,
            shouldUpdate: true
          }
        ];
      }
      this.setSourceSize();
      __privateMethod$c(this, _MediaTexture_instances, setSourceLoaded_fn).call(this, source);
    }
    /**
     * Load an array of {@link HTMLCanvasElement} using {@link loadCanvas} . Useful for cube maps.
     * @param sources - Array of {@link HTMLCanvasElement} to load.
     */
    loadCanvases(sources) {
      for (let i = 0; i < Math.min(this.size.depth, sources.length); i++) {
        this.loadCanvas(sources[i]);
      }
    }
    /**
     * Set the {@link MediaTextureSource.sourceUploaded | sourceUploaded} flag to true for the {@link MediaTextureSource.source | source} at a given index in our {@link sources} array. If all {@link sources} have been uploaded, set our {@link sourcesUploaded} flag to true.
     * @param sourceIndex - Index of the {@link MediaTextureSource.source | source} in the {@link sources} array.
     */
    setSourceUploaded(sourceIndex = 0) {
      this.sources[sourceIndex].sourceUploaded = true;
      this._onSourceUploadedCallback && this._onSourceUploadedCallback(this.sources[sourceIndex].source);
      const nbSourcesUploaded = this.sources.filter((source) => source.sourceUploaded)?.length || 0;
      if (nbSourcesUploaded === this.size.depth) {
        this.sourcesUploaded = true;
      }
    }
    /**
     * Callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
     * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
     * @returns - our {@link MediaTexture}
     */
    onSourceLoaded(callback) {
      if (callback) {
        this._onSourceLoadedCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when all of the {@link MediaTextureSource.source | source} have been loaded.
     * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} have been loaded.
     * @returns - our {@link MediaTexture}
     */
    onAllSourcesLoaded(callback) {
      if (callback) {
        this._onAllSourcesLoadedCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when one of the {@link MediaTextureSource.source} has been uploaded to the GPU.
     * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been uploaded to the GPU.
     * @returns - our {@link MediaTexture}.
     */
    onSourceUploaded(callback) {
      if (callback) {
        this._onSourceUploadedCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when all of the {@link MediaTextureSource.source | source} have been uploaded to the GPU.
     * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} been uploaded to the GPU.
     * @returns - our {@link MediaTexture}.
     */
    onAllSourcesUploaded(callback) {
      if (callback) {
        this._onAllSourcesUploadedCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Update a {@link MediaTexture} by uploading the {@link texture} if needed.
     * */
    update() {
      this.sources?.forEach((source, sourceIndex) => {
        if (!source.sourceLoaded) return;
        const sourceType = this.options.sourcesTypes[sourceIndex];
        if (sourceType === "externalVideo") {
          source.shouldUpdate = true;
        }
        if (source.shouldUpdate && sourceType !== "externalVideo") {
          if (this.size.width !== this.texture.width || this.size.height !== this.texture.height || this.options.generateMips && this.texture && this.texture.mipLevelCount <= 1) {
            this.createTexture();
          }
          this.renderer.uploadTexture(this, sourceIndex);
          source.shouldUpdate = false;
        }
      });
    }
    /**
     * Destroy the {@link MediaTexture}.
     */
    destroy() {
      if (this.videoFrameCallbackIds.size) {
        for (const [sourceIndex, id] of this.videoFrameCallbackIds) {
          this.sources[sourceIndex].source.cancelVideoFrameCallback(id);
        }
      }
      this.sources.forEach((source) => {
        if (this.isVideoSource(source.source)) {
          source.source.removeEventListener(
            "canplaythrough",
            this.onVideoLoaded.bind(this, source.source),
            {
              once: true
            }
          );
        }
      });
      super.destroy();
    }
  };
  _sourcesLoaded = new WeakMap();
  _sourcesUploaded = new WeakMap();
  _rotation = new WeakMap();
  _MediaTexture_instances = new WeakSet();
  /* EVENTS */
  /**
   * Called each time a source has been loaded.
   * @param source - {@link TextureSource} that has just been loaded.
   * @private
   */
  setSourceLoaded_fn = function(source) {
    this._onSourceLoadedCallback && this._onSourceLoadedCallback(source);
    const nbSourcesLoaded = this.sources.filter((source2) => source2.sourceLoaded)?.length || 0;
    if (nbSourcesLoaded === this.size.depth) {
      this.sourcesLoaded = true;
    }
  };
  let MediaTexture = _MediaTexture;

  var __typeError$t = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$t = (obj, member, msg) => member.has(obj) || __typeError$t("Cannot " + msg);
  var __privateGet$r = (obj, member, getter) => (__accessCheck$t(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$t = (obj, member, value) => member.has(obj) ? __typeError$t("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var _parentRatio, _sourceRatio, _coverScale, _negatedOrigin, _rotationMatrix;
  const defaultDOMTextureParams = {
    name: "texture",
    generateMips: false,
    flipY: false,
    format: "rgba8unorm",
    premultipliedAlpha: false,
    placeholderColor: [0, 0, 0, 255],
    // default to black
    useExternalTextures: true,
    fromTexture: null,
    visibility: ["fragment"],
    cache: true
  };
  class DOMTexture extends MediaTexture {
    /**
     * DOMTexture constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
     * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
     */
    constructor(renderer, parameters = defaultDOMTextureParams) {
      renderer = isCurtainsRenderer(renderer, "DOMTexture");
      super(renderer, { ...parameters, useTransform: true, viewDimension: "2d" });
      /** {@link DOMProjectedMesh} mesh if any. */
      this._mesh = null;
      /**
       * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link mesh} {@link core/DOM/DOMElement.RectSize | size}.
       * @private
       */
      __privateAdd$t(this, _parentRatio, new Vec2(1));
      /**
       * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link size | source size}.
       * @private
       */
      __privateAdd$t(this, _sourceRatio, new Vec2(1));
      /**
       * {@link Vec2} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio.
       * @private
       */
      __privateAdd$t(this, _coverScale, new Vec2(1));
      /**
       * {@link Vec2} used for {@link modelMatrix} calculations, based on {@link transformOrigin}.
       * @private
       */
      __privateAdd$t(this, _negatedOrigin, new Vec2());
      /**
       * Rotation {@link Mat3} based on texture {@link rotation}.
       * @private
       */
      __privateAdd$t(this, _rotationMatrix, new Mat3());
      this.transformOrigin.set(0.5, 0.5);
      this.type = "DOMTexture";
      this.renderer.addDOMTexture(this);
    }
    /**
     * Get our texture parent {@link mesh} if any.
     */
    get mesh() {
      return this._mesh;
    }
    /**
     * Set our texture parent {@link mesh}.
     * @param value - texture parent {@link mesh} to set.
     */
    set mesh(value) {
      this._mesh = value;
      this.resize();
    }
    /* TEXTURE MATRIX */
    /**
     * Update the {@link modelMatrix}.
     */
    updateModelMatrix() {
      if (!this.mesh) {
        super.updateModelMatrix();
        return;
      }
      const parentScale = this.mesh.scale;
      const parentWidth = this.mesh.boundingRect.width * parentScale.x;
      const parentHeight = this.mesh.boundingRect.height * parentScale.y;
      const parentRatio = parentWidth / parentHeight;
      const sourceRatio = this.size.width / this.size.height;
      if (parentWidth > parentHeight) {
        __privateGet$r(this, _parentRatio).set(parentRatio, 1);
        __privateGet$r(this, _sourceRatio).set(1 / sourceRatio, 1);
      } else {
        __privateGet$r(this, _parentRatio).set(1, 1 / parentRatio);
        __privateGet$r(this, _sourceRatio).set(1, sourceRatio);
      }
      const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? __privateGet$r(this, _parentRatio).x * __privateGet$r(this, _sourceRatio).x : __privateGet$r(this, _sourceRatio).y * __privateGet$r(this, _parentRatio).y;
      __privateGet$r(this, _coverScale).set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y));
      __privateGet$r(this, _negatedOrigin).copy(this.transformOrigin).multiplyScalar(-1);
      __privateGet$r(this, _rotationMatrix).rotateByAngleZ(this.rotation);
      this.modelMatrix.identity().premultiplyTranslate(__privateGet$r(this, _negatedOrigin)).premultiplyScale(__privateGet$r(this, _coverScale)).premultiplyScale(__privateGet$r(this, _parentRatio)).premultiply(__privateGet$r(this, _rotationMatrix)).premultiplyScale(__privateGet$r(this, _sourceRatio)).premultiplyTranslate(this.transformOrigin).translate(this.offset);
      this.transformBinding.inputs.matrix.shouldUpdate = true;
    }
    /**
     * Set our source size and update the {@link modelMatrix}.
     */
    setSourceSize() {
      super.setSourceSize();
      this.updateModelMatrix();
    }
    /**
     * Resize our {@link DOMTexture}.
     */
    resize() {
      super.resize();
      this.updateModelMatrix();
    }
    /**
     * Get our unique source, since {@link DOMTexture} have a fixed '2d' view dimension.
     * @returns - Our unique source, i.e. first element of {@link sources} array if it exists.
     * @readonly
     */
    get source() {
      return this.sources.length ? this.sources[0].source : null;
    }
    /**
     * Copy a {@link DOMTexture}.
     * @param texture - {@link DOMTexture} to copy.
     */
    copy(texture) {
      super.copy(texture);
      this.updateModelMatrix();
    }
    /* DESTROY */
    /**
     * Destroy the {@link DOMTexture}.
     */
    destroy() {
      this.renderer.removeDOMTexture(this);
      super.destroy();
    }
  }
  _parentRatio = new WeakMap();
  _sourceRatio = new WeakMap();
  _coverScale = new WeakMap();
  _negatedOrigin = new WeakMap();
  _rotationMatrix = new WeakMap();

  var __typeError$s = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$s = (obj, member, msg) => member.has(obj) || __typeError$s("Cannot " + msg);
  var __privateGet$q = (obj, member, getter) => (__accessCheck$s(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$s = (obj, member, value) => member.has(obj) ? __typeError$s("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$q = (obj, member, value, setter) => (__accessCheck$s(obj, member, "write to private field"), member.set(obj, value), value);
  var _transformedTextures;
  class TextureBindGroup extends BindGroup {
    /**
     * TextureBindGroup constructor
     * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object.
     * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}.
     */
    constructor(renderer, { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] } = {}) {
      const type = "TextureBindGroup";
      renderer = isRenderer(renderer, type);
      super(renderer, { label, index, bindings, uniforms, storages });
      /**
       * Array containing all the {@link MediaTexture} that handle a transformation {@link MediaTexture#modelMatrix | modelMatrix}.
       * @private
       */
      __privateAdd$s(this, _transformedTextures);
      this.options = {
        ...this.options,
        // will be filled after
        textures: [],
        samplers: []
      };
      if (textures.length) {
        for (const texture of textures) {
          this.addTexture(texture);
        }
      }
      if (samplers.length) {
        for (const sampler of samplers) {
          this.addSampler(sampler);
        }
      }
      this.type = type;
      this.texturesMatricesBinding = null;
    }
    /**
     * Set or reset this {@link TextureBindGroup} {@link TextureBindGroup.renderer | renderer}, and update the {@link samplers} and {@link textures} renderer as well.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      const shadowTextures = /* @__PURE__ */ new Set();
      if (this.renderer && "shadowCastingLights" in this.renderer) {
        this.renderer.shadowCastingLights.forEach((light) => {
          if (light.shadow.isActive && light.shadow.depthTexture) {
            shadowTextures.add(light.shadow.depthTexture.uuid);
          }
        });
      }
      super.setRenderer(renderer);
      if (this.options && this.samplers) {
        this.samplers.forEach((sampler) => {
          sampler.setRenderer(this.renderer);
        });
      }
      if (this.options && this.textures) {
        this.textures.forEach((texture) => {
          if (!shadowTextures.has(texture.uuid)) {
            texture.setRenderer(this.renderer);
          }
        });
      }
    }
    /**
     * Adds a texture to the {@link textures} array and {@link bindings}.
     * @param texture - texture to add.
     */
    addTexture(texture) {
      this.textures.push(texture);
      this.addBindings([...texture.bindings]);
    }
    /**
     * Get the current {@link textures} array.
     * @readonly
     */
    get textures() {
      return this.options.textures;
    }
    /**
     * Adds a sampler to the {@link samplers} array and {@link bindings}.
     * @param sampler
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
      this.addBindings([sampler.binding]);
    }
    /**
     * Get the current {@link samplers} array.
     * @readonly
     */
    get samplers() {
      return this.options.samplers;
    }
    /**
     * Get whether the GPU bind group is ready to be created.
     * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all {@link GPUTexture} and {@link GPUSampler} are created.
     * @readonly
     */
    get shouldCreateBindGroup() {
      return !this.bindGroup && !!this.bindings.length && !this.textures.find((texture) => !(texture.texture || texture.externalTexture)) && !this.samplers.find((sampler) => !sampler.sampler);
    }
    /**
     * Set the {@link texturesMatricesBinding} if needed.
     */
    setTexturesMatricesBinding() {
      __privateSet$q(this, _transformedTextures, this.textures.filter(
        (texture) => (texture instanceof MediaTexture || texture instanceof DOMTexture) && !!texture.transformBinding
      ));
      const texturesBindings = __privateGet$q(this, _transformedTextures).map((texture) => {
        return texture.transformBinding;
      });
      if (texturesBindings.length) {
        const label = "Textures matrices";
        const name = "texturesMatrices";
        this.texturesMatricesBinding = new BufferBinding({
          label,
          name,
          childrenBindings: texturesBindings.map((textureBinding) => {
            return {
              binding: textureBinding,
              count: 1,
              forceArray: false
            };
          })
        });
        this.texturesMatricesBinding.childrenBindings.forEach((childrenBinding, i) => {
          childrenBinding.inputs.matrix.value = texturesBindings[i].inputs.matrix.value;
        });
        this.texturesMatricesBinding.buffer.consumers.add(this.uuid);
        const hasMatricesBinding = this.bindings.find((binding) => binding.name === name);
        if (!hasMatricesBinding) {
          this.addBinding(this.texturesMatricesBinding);
        }
      }
    }
    /**
     * Create the {@link texturesMatricesBinding} and {@link bindGroup}.
     */
    createBindGroup() {
      this.setTexturesMatricesBinding();
      super.createBindGroup();
    }
    /**
     * Update the {@link TextureBindGroup#textures | bind group textures}:
     * - Check if they need to copy their source texture.
     * - Upload video texture if needed.
     */
    updateTextures() {
      for (const texture of this.textures) {
        if (texture instanceof MediaTexture) {
          if (texture.options.fromTexture && texture.options.fromTexture instanceof MediaTexture && texture.options.fromTexture.sourcesUploaded && !texture.sourcesUploaded) {
            texture.copy(texture.options.fromTexture);
          }
          const firstSource = texture.sources.length && texture.sources[0];
          if (firstSource && firstSource.shouldUpdate && texture.options.sourcesTypes[0] && texture.options.sourcesTypes[0] === "externalVideo") {
            texture.uploadVideoTexture();
          }
        }
      }
      if (this.texturesMatricesBinding) {
        __privateGet$q(this, _transformedTextures).forEach((texture, i) => {
          this.texturesMatricesBinding.childrenBindings[i].inputs.matrix.shouldUpdate = !!texture.transformBinding.inputs.matrix.shouldUpdate;
          if (texture.transformBinding.inputs.matrix.shouldUpdate) {
            this.renderer.onAfterCommandEncoderSubmission.add(
              () => {
                texture.transformBinding.inputs.matrix.shouldUpdate = false;
              },
              { once: true }
            );
          }
        });
      }
    }
    /**
     * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed.
     */
    update() {
      this.updateTextures();
      super.update();
    }
    /**
     * Destroy our {@link TextureBindGroup}.
     */
    destroy() {
      super.destroy();
      this.options.textures = [];
      this.options.samplers = [];
    }
  }
  _transformedTextures = new WeakMap();

  class SamplerBinding extends Binding {
    /**
     * SamplerBinding constructor
     * @param parameters - {@link SamplerBindingParams | parameters} used to create our SamplerBindings
     */
    constructor({
      label = "Sampler",
      name = "sampler",
      bindingType,
      visibility,
      sampler,
      type = "filtering"
    }) {
      bindingType = bindingType ?? "sampler";
      super({ label, name, bindingType, visibility });
      this.cacheKey += `${type},`;
      this.options = {
        ...this.options,
        sampler,
        type
      };
      this.resource = sampler;
      this.setWGSLFragment();
    }
    /**
     * Get {@link GPUDevice.createBindGroupLayout().sampler | GPUBindGroupLayout entry resource}.
     * @readonly
     */
    get resourceLayout() {
      return {
        sampler: {
          type: this.options.type
          // TODO set shouldResetBindGroupLayout to true if it changes afterwards
        }
      };
    }
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey() {
      return `sampler,${this.options.type},${this.visibility},`;
    }
    /**
     * Get the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
     */
    get resource() {
      return this.sampler;
    }
    /**
     * Set the {@link GPUDevice.createBindGroup().entries.resource | GPUBindGroup entry resource}.
     * @param value - new bind group resource
     */
    set resource(value) {
      if (value && this.sampler) this.shouldResetBindGroup = true;
      this.sampler = value;
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [
        `var ${this.name}: ${this.options.type === "comparison" ? `${this.bindingType}_comparison` : this.bindingType};`
      ];
    }
  }

  var __typeError$r = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$r = (obj, member, msg) => member.has(obj) || __typeError$r("Cannot " + msg);
  var __privateGet$p = (obj, member, getter) => (__accessCheck$r(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$r = (obj, member, value) => member.has(obj) ? __typeError$r("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$p = (obj, member, value, setter) => (__accessCheck$r(obj, member, "write to private field"), member.set(obj, value), value);
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
      __privateAdd$r(this, _near);
      /** @ignore */
      __privateAdd$r(this, _far);
      /** @ignore */
      __privateAdd$r(this, _pixelRatio);
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
      return __privateGet$p(this, _near);
    }
    /**
     * Set the {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed.
     * @param near - New near plane value.
     */
    set near(near) {
      near = Math.max(near ?? this.near, 1e-4);
      if (near !== this.near) {
        __privateSet$p(this, _near, near);
        this.shouldUpdateProjectionMatrices();
      }
    }
    /**
     * Get the {@link Camera.far | far} plane value.
     */
    get far() {
      return __privateGet$p(this, _far);
    }
    /**
     * Set the {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed.
     * @param far - New far plane value.
     */
    set far(far) {
      far = Math.max(far ?? this.far, this.near + 1);
      if (far !== this.far) {
        __privateSet$p(this, _far, far);
        this.shouldUpdateProjectionMatrices();
      }
    }
    /**
     * Get the {@link Camera.pixelRatio | pixelRatio} value.
     */
    get pixelRatio() {
      return __privateGet$p(this, _pixelRatio);
    }
    /**
     * Set the {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed.
     * @param pixelRatio - New pixel ratio value.
     */
    set pixelRatio(pixelRatio) {
      __privateSet$p(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
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

  var __typeError$q = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$q = (obj, member, msg) => member.has(obj) || __typeError$q("Cannot " + msg);
  var __privateGet$o = (obj, member, getter) => (__accessCheck$q(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$q = (obj, member, value) => member.has(obj) ? __typeError$q("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$o = (obj, member, value, setter) => (__accessCheck$q(obj, member, "write to private field"), member.set(obj, value), value);
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
      __privateAdd$q(this, _left);
      /** @ignore */
      __privateAdd$q(this, _right);
      /** @ignore */
      __privateAdd$q(this, _top);
      /** @ignore */
      __privateAdd$q(this, _bottom);
      this.position.set(0, 0, 10);
      this.setOrthographic({ near, far, left, right, top, bottom, pixelRatio });
    }
    /**
     * Get the {@link OrthographicCamera.left | left} frustum plane value.
     */
    get left() {
      return __privateGet$o(this, _left);
    }
    /**
     * Set the {@link OrthographicCamera.left | left} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param left - New left frustum plane value.
     */
    set left(left) {
      if (left !== this.left) {
        __privateSet$o(this, _left, left);
        this.shouldUpdateProjectionMatrices();
      }
    }
    /**
     * Get the {@link OrthographicCamera.right | right} frustum plane value.
     */
    get right() {
      return __privateGet$o(this, _right);
    }
    /**
     * Set the {@link OrthographicCamera.right | right} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param right - New right frustum plane value.
     */
    set right(right) {
      if (right !== this.right) {
        __privateSet$o(this, _right, right);
        this.shouldUpdateProjectionMatrices();
      }
    }
    /**
     * Get the {@link OrthographicCamera.top | top} frustum plane value.
     */
    get top() {
      return __privateGet$o(this, _top);
    }
    /**
     * Set the {@link OrthographicCamera.top | top} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param top - New top frustum plane value.
     */
    set top(top) {
      if (top !== this.top) {
        __privateSet$o(this, _top, top);
        this.shouldUpdateProjectionMatrices();
      }
    }
    /**
     * Get the {@link OrthographicCamera.bottom | bottom} frustum plane value.
     */
    get bottom() {
      return __privateGet$o(this, _bottom);
    }
    /**
     * Set the {@link OrthographicCamera.bottom | bottom} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param bottom - New bottom frustum plane value.
     */
    set bottom(bottom) {
      if (bottom !== this.bottom) {
        __privateSet$o(this, _bottom, bottom);
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

  var __typeError$p = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$p = (obj, member, msg) => member.has(obj) || __typeError$p("Cannot " + msg);
  var __privateGet$n = (obj, member, getter) => (__accessCheck$p(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$p = (obj, member, value) => member.has(obj) ? __typeError$p("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$n = (obj, member, value, setter) => (__accessCheck$p(obj, member, "write to private field"), member.set(obj, value), value);
  var _fov;
  class PerspectiveCamera extends Camera {
    /**
     * PerspectiveCamera constructor
     * @param parameters - {@link PerspectiveCameraParams} used to create our {@link PerspectiveCamera}.
     */
    constructor({
      fov = 50,
      near = 0.1,
      far = 150,
      width = 1,
      height = 1,
      pixelRatio = 1,
      forceAspect = false,
      onMatricesChanged = () => {
      }
    } = {}) {
      super({ near, far, pixelRatio, onMatricesChanged });
      /** @ignore */
      __privateAdd$p(this, _fov);
      this.forceAspect = forceAspect;
      this.position.set(0, 0, 10);
      this.size = {
        width: 1,
        height: 1
      };
      this.setPerspective({ fov, near, far, width, height, pixelRatio });
    }
    /**
     * Get the {@link PerspectiveCamera.fov | field of view}.
     */
    get fov() {
      return __privateGet$n(this, _fov);
    }
    /**
     * Set the {@link PerspectiveCamera.fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed.
     * @param fov - New field of view.
     */
    set fov(fov) {
      fov = Math.max(1, Math.min(fov ?? this.fov, 179));
      if (fov !== this.fov) {
        __privateSet$n(this, _fov, fov);
        this.shouldUpdateProjectionMatrices();
      }
      this.setVisibleSize();
      this.setCSSPerspective();
    }
    /**
     * Set the {@link PerspectiveCamera} {@link RectSize.width | width} and {@link RectSize.height | height}. Update the {@link projectionMatrix} only if the width or height actually changed.
     * @param size - New width and height values to use.
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
     * Sets the {@link PerspectiveCamera} perspective projection settings. Update the {@link projectionMatrix} if needed.
     * @param parameters - {@link PerspectiveCameraOptions} to use for the perspective projection.
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
     * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.
     *
     * Used to translate planes along the Z axis using pixel units as CSS would do.
     *
     * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
     */
    setCSSPerspective() {
      this.CSSPerspective = Math.pow(
        Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan(this.fov * 0.5 * Math.PI / 180);
    }
    /**
     * Get visible width / height at a given z-depth from our {@link PerspectiveCamera} parameters.
     *
     * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}.
     * @param depth - Depth to use for calculations.
     * @returns - Visible width and height at given depth.
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
     * Updates the {@link PerspectiveCamera} {@link projectionMatrix}.
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
     * Get the current {@link PerspectiveCamera} frustum planes in the [left, right, top, bottom, near, far] order, based on its {@link projectionMatrix} and {@link viewMatrix}.
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

  class Sampler {
    /**
     * Sampler constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}.
     * @param parameters - {@link SamplerParams | parameters} used to create this {@link Sampler}.
     */
    constructor(renderer, {
      label = "Sampler",
      name,
      addressModeU = "repeat",
      addressModeV = "repeat",
      magFilter = "linear",
      minFilter = "linear",
      mipmapFilter = "linear",
      maxAnisotropy = 1,
      type = "filtering",
      compare = null
    } = {}) {
      this.type = "Sampler";
      this.uuid = generateUUID();
      this.label = label;
      this.setRenderer(renderer);
      if (!name && !this.renderer.production) {
        name = "sampler" + this.renderer.samplers.length;
        throwWarning(
          `Sampler: you are trying to create a sampler without the mandatory name parameter. A default name will be used instead: ${name}`
        );
      }
      this.name = name;
      this.options = {
        addressModeU,
        addressModeV,
        magFilter,
        minFilter,
        mipmapFilter,
        maxAnisotropy,
        type,
        ...compare !== null && { compare }
      };
      this.createSampler();
      this.createBinding();
    }
    /**
     * Set or reset this {@link Sampler} {@link Sampler.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.label + " " + this.type);
      this.renderer = renderer;
    }
    /**
     * Set the {@link GPUSampler}.
     */
    createSampler() {
      this.sampler = this.renderer.createSampler(this);
      if (this.binding) {
        this.binding.resource = this.sampler;
      }
    }
    /**
     * Set the {@link SamplerBinding | binding}.
     */
    createBinding() {
      this.binding = new SamplerBinding({
        label: this.label,
        name: this.name,
        bindingType: "sampler",
        sampler: this.sampler,
        type: this.options.type
      });
    }
  }

  class Material {
    /**
     * Material constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link Material}.
     * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material.
     */
    constructor(renderer, parameters) {
      this.type = "Material";
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { shaders, label, useAsyncPipeline, uniforms, storages, bindings, bindGroups, samplers, textures } = parameters;
      this.options = {
        shaders,
        label: label || this.constructor.name,
        useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
        ...uniforms !== void 0 && { uniforms },
        ...storages !== void 0 && { storages },
        ...bindings !== void 0 && { bindings },
        ...bindGroups !== void 0 && { bindGroups },
        ...samplers !== void 0 && { samplers },
        ...textures !== void 0 && { textures }
      };
      this.bindGroups = [];
      this.texturesBindGroups = [];
      this.clonedBindGroups = [];
      this.setBindGroups();
      this.setTextures();
      this.setSamplers();
    }
    /**
     * Set or reset this {@link Material} {@link Material.renderer | renderer}. Also reset the {@link bindGroups} renderer.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.setRenderer(this.renderer);
      });
      if (this.pipelineEntry) {
        this.pipelineEntry.setRenderer(this.renderer);
      }
    }
    /**
     * Set the {@link pipelineEntry}.
     */
    setPipelineEntry() {
    }
    /**
     * Check if all bind groups are ready, and create them if needed.
     */
    async compileMaterial() {
      const createBindGroups = () => {
        const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0;
        const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength;
        if (!bindGroupsReady) {
          this.createBindGroups();
        }
      };
      if (this.renderer.ready) {
        createBindGroups();
      } else {
        await new Promise((resolve) => {
          const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
            () => {
              if (this.renderer.device) {
                this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
                createBindGroups();
                resolve();
              }
            },
            { once: false }
          );
        });
      }
    }
    /**
     * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled.
     * @readonly
     */
    get ready() {
      return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready);
    }
    /**
     * Get the {@link Material} pipeline buffers cache key based on its {@link BindGroup} cache keys.
     * @returns - Current cache key.
     * @readonly
     */
    get cacheKey() {
      let cacheKey = "";
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.bindings.forEach((binding) => {
          cacheKey += binding.name + ",";
        });
        cacheKey += bindGroup.pipelineCacheKey;
      });
      return cacheKey;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to `null`, so they will be reset next time we try to render.
     */
    loseContext() {
      for (const texture of this.textures) {
        texture.texture = null;
        if (texture instanceof MediaTexture) {
          texture.sources.forEach((source) => source.sourceUploaded = false);
          texture.sourcesUploaded = false;
        }
      }
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach(
        (bindGroup) => bindGroup.loseContext()
      );
      this.pipelineEntry.pipeline = null;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our samplers, textures and bind groups.
     */
    restoreContext() {
      for (const sampler of this.samplers) {
        sampler.createSampler();
        sampler.binding.resource = sampler.sampler;
      }
      for (const texture of this.textures) {
        if (texture instanceof MediaTexture) {
          texture.sources.forEach((source) => {
            if (source.sourceLoaded) {
              source.shouldUpdate = true;
            }
          });
        }
        texture.resize(texture.size);
      }
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
        bindGroup.restoreContext();
      });
    }
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="full"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    async getShaderCode(shaderType = "full") {
      shaderType = (() => {
        switch (shaderType) {
          case "vertex":
          case "fragment":
          case "compute":
          case "full":
            return shaderType;
          default:
            return "full";
        }
      })();
      if (this.pipelineEntry) {
        return this.pipelineEntry.shaders[shaderType].code;
      } else {
        return new Promise((resolve) => {
          const taskId = this.renderer.onBeforeRenderScene.add(
            () => {
              if (this.pipelineEntry) {
                this.renderer.onBeforeRenderScene.remove(taskId);
                resolve(this.pipelineEntry.shaders[shaderType].code);
              }
            },
            { once: false }
          );
        });
      }
    }
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="vertex"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    async getAddedShaderCode(shaderType = "vertex") {
      shaderType = (() => {
        switch (shaderType) {
          case "vertex":
          case "fragment":
          case "compute":
            return shaderType;
          default:
            return "vertex";
        }
      })();
      if (this.pipelineEntry) {
        return this.pipelineEntry.shaders[shaderType].head;
      } else {
        return new Promise((resolve) => {
          const taskId = this.renderer.onBeforeRenderScene.add(
            () => {
              if (this.pipelineEntry) {
                this.renderer.onBeforeRenderScene.remove(taskId);
                resolve(this.pipelineEntry.shaders[shaderType].head);
              }
            },
            { once: false }
          );
        });
      }
    }
    /* BIND GROUPS */
    /**
     * Prepare and set our bind groups based on inputs and bindGroups Material parameters.
     */
    setBindGroups() {
      this.uniforms = {};
      this.storages = {};
      this.inputsBindGroups = [];
      this.inputsBindings = /* @__PURE__ */ new Map();
      if (this.options.uniforms || this.options.storages || this.options.bindings) {
        const inputsBindGroup = new BindGroup(this.renderer, {
          label: this.options.label + ": Bindings bind group",
          uniforms: this.options.uniforms,
          storages: this.options.storages,
          bindings: this.options.bindings
        });
        this.processBindGroupBindings(inputsBindGroup);
        this.inputsBindGroups.push(inputsBindGroup);
        inputsBindGroup.consumers.add(this.uuid);
      }
      this.options.bindGroups?.forEach((bindGroup) => {
        this.processBindGroupBindings(bindGroup);
        this.inputsBindGroups.push(bindGroup);
        bindGroup.consumers.add(this.uuid);
      });
    }
    /**
     * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct.
     * @readonly
     */
    get texturesBindGroup() {
      return this.texturesBindGroups[0];
    }
    /**
     * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
     * @param bindGroup - The {@link BindGroup} to process.
     */
    processBindGroupBindings(bindGroup) {
      for (const inputBinding of bindGroup.bindings) {
        this.inputsBindings.set(inputBinding.name, inputBinding);
      }
      this.uniforms = {
        ...this.uniforms,
        ...bindGroup.uniforms
      };
      this.storages = {
        ...this.storages,
        ...bindGroup.storages
      };
    }
    /**
     * Create the bind groups if they need to be created.
     */
    createBindGroups() {
      if (this.texturesBindGroup.shouldCreateBindGroup) {
        this.texturesBindGroup.setIndex(this.bindGroups.length);
        this.texturesBindGroup.createBindGroup();
        this.bindGroups.push(this.texturesBindGroup);
      }
      for (const bindGroup of this.inputsBindGroups) {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.setIndex(this.bindGroups.length);
          bindGroup.createBindGroup();
          this.bindGroups.push(bindGroup);
        }
      }
      this.options.bindGroups?.forEach((bindGroup) => {
        if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          bindGroup.setIndex(this.bindGroups.length);
          this.bindGroups.push(bindGroup);
        }
        if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          this.texturesBindGroups.push(bindGroup);
          for (const texture of bindGroup.textures) {
            if (!this.textures.find((t) => t.uuid !== texture.uuid)) {
              this.textures.push(texture);
            }
          }
        }
      });
    }
    /**
     * Clones a {@link BindGroup} from a list of buffers.
     * Useful to create a new{@link BindGroup} with already created buffers, but swapped.
     * @param parameters - parameters used to clone the {@link BindGroup}.
     * @param parameters.bindGroup - the {@link BindGroup} to clone.
     * @param parameters.bindings - our input binding buffers.
     * @param parameters.keepLayout - whether we should keep original bind group layout or not.
     * @returns - the cloned {@link BindGroup}.
     */
    cloneBindGroup({
      bindGroup,
      bindings = [],
      keepLayout = true
    }) {
      if (!bindGroup) return null;
      const clone = bindGroup.clone({ bindings, keepLayout });
      this.clonedBindGroups.push(clone);
      return clone;
    }
    /**
     * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
     * @param bindingName - the binding name/key to look for.
     * @returns - {@link BindGroup} found or null if not found.
     */
    getBindGroupByBindingName(bindingName = "") {
      return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
        return bindGroup.bindings.find((binding) => binding.name === bindingName);
      });
    }
    /**
     * Destroy a {@link BindGroup}, only if it is not used by another object.
     * @param bindGroup - {@link BindGroup} to eventually destroy.
     */
    destroyBindGroup(bindGroup) {
      bindGroup.consumers.delete(this.uuid);
      if (!bindGroup.consumers.size) {
        bindGroup.destroy();
      }
    }
    /**
     * Destroy all {@link BindGroup}.
     */
    destroyBindGroups() {
      this.bindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.clonedBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.texturesBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.texturesBindGroups = [];
      this.inputsBindGroups = [];
      this.bindGroups = [];
      this.clonedBindGroups = [];
    }
    /**
     * Update all {@link BindGroup}.
     */
    updateBindGroups() {
      for (const bindGroup of this.bindGroups) {
        this.updateBindGroup(bindGroup);
      }
    }
    /**
     * {@link BindGroup#update | Update a BindGroup}:
     * - Update the textures if it's a {@link texturesBindGroups | textures bind group}.
     * - Update its {@link BindGroup#bufferBindings | buffer bindings}.
     * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}.
     * - Check if we need to flush the pipeline.
     * @param bindGroup - {@link BindGroup} to update.
     */
    updateBindGroup(bindGroup) {
      bindGroup.update();
      if (bindGroup.needsPipelineFlush && this.pipelineEntry?.ready) {
        this.setPipelineEntry();
        bindGroup.needsPipelineFlush = false;
      }
    }
    /* INPUTS */
    /**
     * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key.
     * @returns - The found binding, or null if not found.
     */
    getBindingByName(bindingName = "") {
      return this.inputsBindings.get(bindingName);
    }
    /**
     * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}.
     * @param bindingName - The binding name or key.
     * @returns - The found binding, or null if not found.
     */
    getBufferBindingByName(bindingName = "") {
      const bufferBinding = this.getBindingByName(bindingName);
      return bufferBinding && "buffer" in bufferBinding ? bufferBinding : void 0;
    }
    /**
     * Force setting a given {@link BufferBindingInput | buffer binding} shouldUpdate flag to `true` to update it at next render.
     * @param bufferBindingName - The buffer binding name.
     * @param bindingName - The binding name.
     */
    shouldUpdateInputsBindings(bufferBindingName, bindingName) {
      if (!bufferBindingName) return;
      const bufferBinding = this.getBindingByName(bufferBindingName);
      if (bufferBinding) {
        if (!bindingName) {
          Object.keys(bufferBinding.inputs).forEach(
            (bindingKey) => bufferBinding.shouldUpdateBinding(bindingKey)
          );
        } else {
          bufferBinding.shouldUpdateBinding(bindingName);
        }
      }
    }
    /* SAMPLERS & TEXTURES */
    /**
     * Prepare our {@link Material.textures | textures} array and set the {@link TextureBindGroup}.
     */
    setTextures() {
      this.textures = [];
      this.texturesBindGroups.push(
        new TextureBindGroup(this.renderer, {
          label: this.options.label + ": Textures bind group"
        })
      );
      this.texturesBindGroup.consumers.add(this.uuid);
      this.options.textures?.forEach((texture) => {
        this.addTexture(texture);
      });
    }
    /**
     * Add a {@link MediaTexture} or {@link Texture} to our {@link textures} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
     * @param texture - {@link MediaTexture} or {@link Texture} to add.
     */
    addTexture(texture) {
      this.textures.push(texture);
      if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
        this.texturesBindGroup.addTexture(texture);
      }
      if (texture instanceof MediaTexture && texture.options.useTransform) {
        texture.transformBinding.inputs.matrix.shouldUpdate = true;
      }
    }
    /**
     * Destroy a {@link MediaTexture} or {@link Texture}, only if it is not used by another object or cached.
     * @param texture - {@link MediaTexture} or {@link Texture} to eventually destroy.
     */
    destroyTexture(texture) {
      if (texture.options.cache) return;
      if (!texture.options.autoDestroy) return;
      const objectsUsingTexture = this.renderer.getObjectsByTexture(texture);
      const shouldDestroy = !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid);
      if (shouldDestroy) {
        texture.destroy();
      }
    }
    /**
     * Destroy all the Material {@link textures}.
     */
    destroyTextures() {
      this.textures?.forEach((texture) => this.destroyTexture(texture));
      this.textures = [];
    }
    /**
     * Prepare our {@link Material.samplers | samplers} array and always add a default {@link Sampler} if not already passed as parameter.
     */
    setSamplers() {
      this.samplers = [];
      this.options.samplers?.forEach((sampler) => {
        this.addSampler(sampler);
      });
      const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === "defaultSampler");
      if (!hasDefaultSampler) {
        const sampler = new Sampler(this.renderer, { label: "Default sampler", name: "defaultSampler" });
        this.addSampler(sampler);
      }
    }
    /**
     * Add a {@link Sampler} to our {@link samplers} array, and add it to the textures bind group only if used in the shaders (avoid binding useless data).
     * @param sampler - {@link Sampler} to add.
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
      if (this.options.shaders && this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(sampler.name) !== -1 || this.options.shaders && this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(sampler.name) !== -1 || this.options.shaders && this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1) {
        this.texturesBindGroup.addSampler(sampler);
      }
    }
    /* BUFFER RESULTS */
    /**
     * Map a {@link Buffer#GPUBuffer | Buffer's GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param buffer - {@link Buffer} to use for mapping.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    async getBufferResult(buffer) {
      return await buffer.mapBufferAsync();
    }
    /**
     * Map the content of a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
     * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    async getBufferBindingResultByBindingName(bindingName = "") {
      const binding = this.getBufferBindingByName(bindingName);
      if (binding && "buffer" in binding) {
        const dstBuffer = this.renderer.copyBufferToBuffer({
          srcBuffer: binding.buffer
        });
        return await this.getBufferResult(dstBuffer);
      } else {
        return new Float32Array(0);
      }
    }
    /**
     * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}.
     * @param parameters - Parameters used to get the result.
     * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}.
     * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards.
     * @returns - {@link Float32Array} holding {@link GPUBuffer} data.
     */
    async getBufferElementResultByNames({
      bindingName,
      bufferElementName
    }) {
      const result = await this.getBufferBindingResultByBindingName(bindingName);
      if (!bufferElementName || result.length) {
        return result;
      } else {
        const binding = this.getBufferBindingByName(bindingName);
        if (binding) {
          return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
        } else {
          return result;
        }
      }
    }
    /* RENDER */
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline.
     * Finally, updates all the {@link bindGroups | bind groups}.
     */
    onBeforeRender() {
      this.compileMaterial();
      this.updateBindGroups();
    }
    /**
     * Set the current pipeline.
     * @param pass - Current pass encoder.
     */
    setPipeline(pass) {
      this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
    }
    /**
     * Use the {@link Renderer#pipelineManager | renderer pipelineManager} to only set the bind groups that are not already set.
     * @param pass - Current pass encoder.
     */
    setActiveBindGroups(pass) {
      this.renderer.pipelineManager.setActiveBindGroups(pass, this.bindGroups);
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups.
     * @param pass - Current pass encoder.
     */
    render(pass) {
      if (!this.ready) return;
      this.setPipeline(pass);
      this.setActiveBindGroups(pass);
    }
    /**
     * Destroy the Material.
     */
    destroy() {
      this.destroyBindGroups();
      this.destroyTextures();
    }
  }

  class ComputeMaterial extends Material {
    /**
     * ComputeMaterial constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeMaterial}.
     * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}.
     */
    constructor(renderer, parameters) {
      const type = "ComputeMaterial";
      renderer = isRenderer(renderer, type);
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      let { shaders, dispatchSize } = parameters;
      if (!shaders || !shaders.compute) {
        shaders = {
          compute: {
            code: "",
            entryPoint: "main"
          }
        };
      }
      if (!shaders.compute.code) {
        shaders.compute.code = "@compute @workgroup_size(1) fn main(){}";
      }
      if (!shaders.compute.entryPoint) {
        shaders.compute.entryPoint = "main";
      }
      this.options = {
        ...this.options,
        shaders,
        ...parameters.dispatchSize !== void 0 && { dispatchSize: parameters.dispatchSize }
      };
      if (!dispatchSize) {
        dispatchSize = 1;
      }
      if (Array.isArray(dispatchSize)) {
        dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1);
        dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1);
        dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1);
      } else if (!isNaN(dispatchSize)) {
        dispatchSize = [Math.ceil(dispatchSize), 1, 1];
      }
      this.dispatchSize = dispatchSize;
    }
    /**
     * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link ComputePipelineEntry} from cache or if we should create a new one.
     */
    setPipelineEntry() {
      this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline(this);
    }
    /**
     * Compile the {@link ComputePipelineEntry}.
     */
    async compilePipelineEntry() {
      await this.pipelineEntry.compilePipelineEntry();
    }
    /**
     * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline.
     */
    async compileMaterial() {
      if (this.ready) return;
      await super.compileMaterial();
      if (!this.pipelineEntry) {
        this.setPipelineEntry();
      }
      if (this.pipelineEntry && this.pipelineEntry.canCompile) {
        await this.compilePipelineEntry();
      }
    }
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="compute"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    async getShaderCode(shaderType = "compute") {
      return await super.getShaderCode(shaderType);
    }
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="compute"] - Shader to get the code from
     * @returns - The corresponding shader code
     */
    async getAddedShaderCode(shaderType = "compute") {
      return await super.getAddedShaderCode(shaderType);
    }
    /* RENDER */
    /**
     * If a custom render function has been defined instead of the default one, register the callback
     * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     */
    useCustomRender(callback) {
      if (callback) {
        this._useCustomRenderCallback = callback;
      }
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups.
     * @param pass - Current compute pass encoder.
     */
    render(pass) {
      if (!this.ready) return;
      this.setPipeline(pass);
      if (this._useCustomRenderCallback !== void 0) {
        this._useCustomRenderCallback(pass);
      } else {
        for (const bindGroup of this.bindGroups) {
          pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        }
        pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2]);
      }
    }
    /* RESULT BUFFER */
    /**
     * Copy all writable binding buffers that need it.
     * @param commandEncoder - Current command encoder.
     */
    copyBufferToResult(commandEncoder) {
      for (const bindGroup of this.bindGroups) {
        bindGroup.bufferBindings.forEach((binding) => {
          if (binding.shouldCopyResult) {
            this.renderer.copyBufferToBuffer({
              srcBuffer: binding.buffer,
              dstBuffer: binding.resultBuffer,
              commandEncoder
            });
          }
        });
      }
    }
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
     * @param parameters - Parameters used to get the result.
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
     * @param parameters.bufferElementName - Pptional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
     */
    async getComputeResult({
      bindingName = "",
      bufferElementName = ""
    }) {
      const binding = this.getBufferBindingByName(bindingName);
      if (binding && "resultBuffer" in binding) {
        const result = await this.getBufferResult(binding.resultBuffer);
        if (bufferElementName && result.length) {
          return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
        } else {
          return result;
        }
      } else {
        return new Float32Array(0);
      }
    }
  }

  var __typeError$o = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$o = (obj, member, msg) => member.has(obj) || __typeError$o("Cannot " + msg);
  var __privateGet$m = (obj, member, getter) => (__accessCheck$o(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$o = (obj, member, value) => member.has(obj) ? __typeError$o("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$m = (obj, member, value, setter) => (__accessCheck$o(obj, member, "write to private field"), member.set(obj, value), value);
  var _autoRender$2, _active;
  let computePassIndex = 0;
  class ComputePass {
    /**
     * ComputePass constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputePass}.
     * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}.
     */
    constructor(renderer, parameters = {}) {
      /**
       * Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically.
       * @private
       */
      __privateAdd$o(this, _autoRender$2, true);
      /** Flag indicating whether this {@link ComputePass} should run or not, much like the {@link core/meshes/Mesh.Mesh#visible | Mesh visible} flag. */
      __privateAdd$o(this, _active, true);
      // callbacks / events
      /** function assigned to the {@link onReady} callback. */
      this._onReadyCallback = () => {
      };
      /** function assigned to the {@link onBeforeRender} callback. */
      this._onBeforeRenderCallback = () => {
      };
      /** function assigned to the {@link onRender} callback. */
      this._onRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterRender} callback. */
      this._onAfterRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterResize} callback. */
      this._onAfterResizeCallback = () => {
      };
      const type = "ComputePass";
      renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
      parameters.label = parameters.label ?? "ComputePass " + renderer.computePasses?.length;
      this.renderer = renderer;
      this.type = type;
      this.uuid = generateUUID();
      Object.defineProperty(this, "index", { value: computePassIndex++ });
      const {
        label,
        shaders,
        renderOrder,
        uniforms,
        storages,
        bindings,
        bindGroups,
        samplers,
        textures,
        autoRender,
        active,
        useAsyncPipeline,
        texturesOptions,
        dispatchSize
      } = parameters;
      this.options = {
        label,
        shaders,
        ...autoRender !== void 0 && { autoRender },
        ...active !== void 0 && { active },
        ...renderOrder !== void 0 && { renderOrder },
        ...dispatchSize !== void 0 && { dispatchSize },
        useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
        texturesOptions
        // TODO default
      };
      this.renderOrder = renderOrder ?? 0;
      if (autoRender !== void 0) {
        __privateSet$m(this, _autoRender$2, autoRender);
      }
      if (active !== void 0) {
        __privateSet$m(this, _active, active);
      }
      this.userData = {};
      this.ready = false;
      this.setMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        uniforms,
        storages,
        bindings,
        bindGroups,
        samplers,
        textures,
        useAsyncPipeline,
        dispatchSize
      });
      this.addToScene(true);
    }
    /**
     * Get or set whether the compute pass is ready to render (the material has been successfully compiled).
     * @readonly
     */
    get ready() {
      return this._ready;
    }
    set ready(value) {
      if (value) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /**
     * Add our {@link ComputePass} to the scene and optionally to the renderer.
     * @param addToRenderer - Whether to add this {@link ComputePass} to the {@link Renderer#computePasses | Renderer computePasses array}.
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.computePasses.push(this);
      }
      if (__privateGet$m(this, _autoRender$2)) {
        this.renderer.scene.addComputePass(this);
      }
    }
    /**
     * Remove our {@link ComputePass} from the scene and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link ComputePass} from the {@link Renderer#computePasses | Renderer computePasses array}.
     */
    removeFromScene(removeFromRenderer = false) {
      if (__privateGet$m(this, _autoRender$2)) {
        this.renderer.scene.removeComputePass(this);
      }
      if (removeFromRenderer) {
        this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
      }
    }
    /**
     * Set a new {@link Renderer} for this {@link ComputePass}.
     * @param renderer - new {@link Renderer} to set.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.options.label + " ComputePass");
      this.material?.setRenderer(renderer);
      this.removeFromScene(true);
      this.renderer = renderer;
      this.addToScene(true);
    }
    /**
     * Create the compute pass material.
     * @param computeParameters - {@link ComputeMaterial} parameters.
     */
    setMaterial(computeParameters) {
      this.useMaterial(new ComputeMaterial(this.renderer, computeParameters));
    }
    /**
     * Set or update the {@link ComputePass} {@link ComputeMaterial}.
     * @param material - New {@link ComputeMaterial} to use.
     */
    useMaterial(material) {
      this.material = material;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render.
     */
    loseContext() {
      this.material.loseContext();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     */
    restoreContext() {
      this.material.restoreContext();
    }
    /**
     * Get the active property value.
     */
    get active() {
      return __privateGet$m(this, _active);
    }
    /**
     * Set the active property value.
     * @param value - New active value.
     */
    set active(value) {
      __privateSet$m(this, _active, value);
    }
    /* TEXTURES */
    /**
     * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
     * @readonly
     */
    get textures() {
      return this.material?.textures || [];
    }
    /**
     * Create a new {@link MediaTexture}.
     * @param options - {@link MediaTextureParams | MediaTexture parameters}.
     * @returns - Newly created {@link MediaTexture}.
     */
    createMediaTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      if (!options.label) {
        options.label = this.options.label + " " + options.name;
      }
      const texture = new MediaTexture(this.renderer, { ...options, ...this.options.texturesOptions });
      this.addTexture(texture);
      return texture;
    }
    /**
     * Create a new {@link Texture}.
     * @param  options - {@link TextureParams | Texture parameters}.
     * @returns - newly created {@link Texture}.
     */
    createTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      const texture = new Texture(this.renderer, options);
      this.addTexture(texture);
      return texture;
    }
    /**
     * Add a {@link Texture} or {@link MediaTexture}.
     * @param texture - {@link Texture} to add.
     */
    addTexture(texture) {
      this.material.addTexture(texture);
    }
    /**
     * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}.
     * @readonly
     */
    get uniforms() {
      return this.material?.uniforms;
    }
    /**
     * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}.
     * @readonly
     */
    get storages() {
      return this.material?.storages;
    }
    /**
     * Called from the renderer, useful to trigger an after resize callback.
     */
    resize() {
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /** EVENTS **/
    /**
     * Callback to run when the {@link ComputePass} is ready.
     * @param callback - Callback to run when {@link ComputePass} is ready.
     * @returns - Our {@link ComputePass}.
     */
    onReady(callback) {
      if (callback) {
        this._onReadyCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run before the {@link ComputePass} is rendered.
     * @param callback - Callback to run just before {@link ComputePass} will be rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when the {@link ComputePass} is rendered.
     * @param callback - Callback to run when {@link ComputePass} is rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run after the {@link ComputePass} has been rendered.
     * @param callback - Callback to run just after {@link ComputePass} has been rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback used to run a custom render function instead of the default one. This won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     * @returns - Our {@link ComputePass}.
     */
    useCustomRender(callback) {
      this.material.useCustomRender(callback);
      return this;
    }
    /**
     * Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
     * @param callback - Callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
     * @returns - Our {@link ComputePass}.
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /**
     * Called before rendering the {@link ComputePass}.
     * Checks if the material is ready and eventually update its bindings.
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready) return;
      if (this.active) {
        this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      }
      this.material.onBeforeRender();
      if (this.material && this.material.ready && !this.ready) {
        this.ready = true;
      }
    }
    /**
     * Render our {@link ComputeMaterial}.
     * @param pass - Current compute pass encoder.
     */
    onRenderPass(pass) {
      if (!this.material.ready) return;
      this._onRenderCallback && this._onRenderCallback();
      this.material.render(pass);
    }
    /**
     * Called after having rendered the {@link ComputePass}.
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback();
    }
    /**
     * Render our compute pass.
     * Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}.
     * @param pass - Current compute pass encoder.
     */
    render(pass) {
      this.onBeforeRenderPass();
      if (!this.renderer.ready || !this.active) return;
      !this.renderer.production && pass.pushDebugGroup(this.options.label);
      this.onRenderPass(pass);
      !this.renderer.production && pass.popDebugGroup();
      this.onAfterRenderPass();
    }
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array.
     * @param commandEncoder - Current GPU command encoder.
     */
    copyBufferToResult(commandEncoder) {
      this.material?.copyBufferToResult(commandEncoder);
    }
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
     * @param parameters - Parameters used to get the result
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
     * @param parameters.bufferElementName - Optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
     * @returns - The mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
     */
    async getComputeResult({
      bindingName,
      bufferElementName
    }) {
      return await this.material?.getComputeResult({ bindingName, bufferElementName });
    }
    /**
     * Remove the {@link ComputePass} from the {@link core/scenes/Scene.Scene | Scene} and destroy it.
     */
    remove() {
      this.removeFromScene(true);
      this.destroy();
    }
    /**
     * Destroy the {@link ComputePass}.
     */
    destroy() {
      this.material?.destroy();
    }
  }
  _autoRender$2 = new WeakMap();
  _active = new WeakMap();

  const points = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
  class Box3 {
    /**
     * Box3 constructor
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    constructor(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min = min;
      this.max = max;
    }
    /**
     * Set a {@link Box3} from two min and max {@link Vec3 | vectors}
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    set(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min.copy(min);
      this.max.copy(max);
      return this;
    }
    /**
     * Check whether the {@link Box3} min and max values have actually been set
     */
    isEmpty() {
      return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }
    /**
     * Copy a {@link Box3} into this {@link Box3}.
     * @param box - {@link Box3} to copy
     */
    copy(box) {
      this.set(box.min.clone(), box.max.clone());
      return this;
    }
    /**
     * Clone this {@link Box3}
     * @returns - cloned {@link Box3}
     */
    clone() {
      return new Box3().copy(this);
    }
    /**
     * Get the {@link Box3} center
     * @readonly
     * @returns - {@link Vec3 | center vector} of the {@link Box3}
     */
    get center() {
      return this.max.clone().add(this.min).multiplyScalar(0.5);
    }
    /**
     * Get the {@link Box3} size
     * @readonly
     * @returns - {@link Vec3 | size vector} of the {@link Box3}
     */
    get size() {
      return this.max.clone().sub(this.min);
    }
    /**
     * Get the {@link Box3} radius
     * @readonly
     * @returns - radius of the {@link Box3}
     */
    get radius() {
      return this.max.distance(this.min) * 0.5;
    }
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Box3}
     * Useful to apply a transformation {@link Mat4 | matrix} to a {@link Box3}
     * @param matrix - {@link Mat4 | matrix} to use
     * @param transformedBox - {@link Box3 | transformed Box3} to set
     * @returns - the {@link Box3 | transformed Box3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix = new Mat4(), transformedBox = new Box3()) {
      if (this.isEmpty()) return this;
      const corners = [];
      if (this.min.z === this.max.z) {
        corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[1] = points[1].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[2] = points[2].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[3] = points[3].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[4] = points[4].set(0, 0, 0).applyMat4(matrix);
      } else {
        corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[1] = points[1].set(this.min.x, this.min.y, this.max.z).applyMat4(matrix);
        corners[2] = points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[3] = points[3].set(this.min.x, this.max.y, this.max.z).applyMat4(matrix);
        corners[4] = points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[5] = points[5].set(this.max.x, this.min.y, this.max.z).applyMat4(matrix);
        corners[6] = points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[7] = points[7].set(this.max.x, this.max.y, this.max.z).applyMat4(matrix);
      }
      for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
        transformedBox.min.min(corners[i]);
        transformedBox.max.max(corners[i]);
      }
      return transformedBox;
    }
  }

  const defaultDOMFrustumMargins = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  class DOMFrustum {
    /**
     * DOMFrustum constructor
     * @param {DOMFrustumParams} parameters - {@link DOMFrustumParams | parameters} used to create our {@link DOMFrustum}
     */
    constructor({
      boundingBox = new Box3(),
      modelViewProjectionMatrix = new Mat4(),
      containerBoundingRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0
      },
      DOMFrustumMargins = defaultDOMFrustumMargins,
      onReEnterView = () => {
      },
      onLeaveView = () => {
      }
    }) {
      this.boundingBox = boundingBox;
      this.clipSpaceOBB = new Box3();
      this.modelViewProjectionMatrix = modelViewProjectionMatrix;
      this.containerBoundingRect = containerBoundingRect;
      this.DOMFrustumMargins = { ...defaultDOMFrustumMargins, ...DOMFrustumMargins };
      this.clipSpaceBoundingRect = {
        top: 0,
        left: 0,
        width: 0,
        height: 0
      };
      this.projectedBoundingRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0
      };
      this.onReEnterView = onReEnterView;
      this.onLeaveView = onLeaveView;
      this.isIntersecting = false;
    }
    /**
     * Set our {@link containerBoundingRect} (called on resize)
     * @param boundingRect - new bounding rectangle
     */
    setContainerBoundingRect(boundingRect) {
      this.containerBoundingRect = boundingRect;
    }
    /**
     * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
     * @readonly
     */
    get DOMFrustumBoundingRect() {
      return {
        top: this.projectedBoundingRect.top - this.DOMFrustumMargins.top,
        right: this.projectedBoundingRect.right + this.DOMFrustumMargins.right,
        bottom: this.projectedBoundingRect.bottom + this.DOMFrustumMargins.bottom,
        left: this.projectedBoundingRect.left - this.DOMFrustumMargins.left
      };
    }
    /**
     * Compute the oriented bounding box in clip space.
     */
    computeClipSpaceOBB() {
      this.clipSpaceOBB.set();
      this.boundingBox.applyMat4(this.modelViewProjectionMatrix, this.clipSpaceOBB);
    }
    /**
     * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox}, i.e. apply OBB to document coordinates and set {@link projectedBoundingRect}.
     */
    setDocumentCoordsFromClipSpaceOBB() {
      this.computeClipSpaceOBB();
      this.clipSpaceBoundingRect = {
        top: this.clipSpaceOBB.max.y,
        left: this.clipSpaceOBB.min.x,
        width: this.clipSpaceOBB.max.x - this.clipSpaceOBB.min.x,
        height: this.clipSpaceOBB.max.y - this.clipSpaceOBB.min.y
      };
      const minX = (this.clipSpaceOBB.min.x + 1) * 0.5;
      const maxX = (this.clipSpaceOBB.max.x + 1) * 0.5;
      const minY = 1 - (this.clipSpaceOBB.min.y + 1) * 0.5;
      const maxY = 1 - (this.clipSpaceOBB.max.y + 1) * 0.5;
      const { width, height, top, left } = this.containerBoundingRect;
      this.projectedBoundingRect = {
        left: minX * width + left,
        x: minX * width + left,
        top: maxY * height + top,
        y: maxY * height + top,
        right: maxX * width + left,
        bottom: minY * height + top,
        width: maxX * width + left - (minX * width + left),
        height: minY * height + top - (maxY * height + top)
      };
    }
    /**
     * Apply the bounding sphere in clip space to document coordinates and set {@link projectedBoundingRect}.
     * @param boundingSphere - bounding sphere in clip space.
     */
    setDocumentCoordsFromClipSpaceSphere(boundingSphere = { center: new Vec3(), radius: 0 }) {
      this.clipSpaceBoundingRect = {
        top: boundingSphere.center.y + boundingSphere.radius,
        left: boundingSphere.center.x - boundingSphere.radius,
        width: boundingSphere.radius * 2,
        height: boundingSphere.radius * 2
      };
      const centerX = (boundingSphere.center.x + 1) * 0.5;
      const centerY = 1 - (boundingSphere.center.y + 1) * 0.5;
      const { width, height, top, left } = this.containerBoundingRect;
      this.projectedBoundingRect.width = boundingSphere.radius * height;
      this.projectedBoundingRect.height = boundingSphere.radius * height;
      this.projectedBoundingRect.left = centerX * width + left - this.projectedBoundingRect.width * 0.5;
      this.projectedBoundingRect.x = this.projectedBoundingRect.left;
      this.projectedBoundingRect.top = centerY * height + top - this.projectedBoundingRect.height * 0.5;
      this.projectedBoundingRect.y = this.projectedBoundingRect.top;
      this.projectedBoundingRect.right = this.projectedBoundingRect.left + this.projectedBoundingRect.width;
      this.projectedBoundingRect.bottom = this.projectedBoundingRect.top + this.projectedBoundingRect.height;
    }
    /**
     * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}.
     */
    intersectsContainer() {
      if (Math.round(this.DOMFrustumBoundingRect.right) <= this.containerBoundingRect.left || Math.round(this.DOMFrustumBoundingRect.left) >= this.containerBoundingRect.left + this.containerBoundingRect.width || Math.round(this.DOMFrustumBoundingRect.bottom) <= this.containerBoundingRect.top || Math.round(this.DOMFrustumBoundingRect.top) >= this.containerBoundingRect.top + this.containerBoundingRect.height) {
        if (this.isIntersecting) {
          this.onLeaveView();
        }
        this.isIntersecting = false;
      } else {
        if (!this.isIntersecting) {
          this.onReEnterView();
        }
        this.isIntersecting = true;
      }
    }
  }

  class Geometry {
    /**
     * Geometry constructor
     * @param parameters - {@link GeometryParams | parameters} used to create our Geometry
     */
    constructor({
      verticesOrder = "ccw",
      topology = "triangle-list",
      instancesCount = 1,
      vertexBuffers = [],
      mapBuffersAtCreation = true
    } = {}) {
      this.verticesCount = 0;
      this.verticesOrder = verticesOrder;
      this.topology = topology;
      this.instancesCount = instancesCount;
      this.ready = false;
      this.boundingBox = new Box3();
      this.type = "Geometry";
      this.uuid = generateUUID();
      this.indirectDraw = null;
      this.vertexBuffers = [];
      this.consumers = /* @__PURE__ */ new Set();
      this.options = {
        verticesOrder,
        topology,
        instancesCount,
        vertexBuffers,
        mapBuffersAtCreation
      };
      const attributesBuffer = vertexBuffers.find((vertexBuffer) => vertexBuffer.name === "attributes");
      if (!vertexBuffers.length || !attributesBuffer) {
        this.addVertexBuffer({
          name: "attributes"
        });
      } else if (attributesBuffer) {
        vertexBuffers.sort((a, b) => {
          const aIndex = a.name !== "attributes" ? Infinity : -1;
          const bIndex = b.name !== "attributes" ? Infinity : -1;
          return aIndex - bIndex;
        });
      }
      for (const vertexBuffer of vertexBuffers) {
        this.addVertexBuffer({
          stepMode: vertexBuffer.stepMode ?? "vertex",
          name: vertexBuffer.name,
          attributes: vertexBuffer.attributes,
          ...vertexBuffer.array && { array: vertexBuffer.array },
          ...vertexBuffer.buffer && { buffer: vertexBuffer.buffer },
          ...vertexBuffer.bufferOffset && { bufferOffset: vertexBuffer.bufferOffset },
          ...vertexBuffer.bufferSize && { bufferSize: vertexBuffer.bufferSize }
        });
      }
      if (attributesBuffer) {
        this.setWGSLFragment();
      }
    }
    /**
     * Reset all the {@link vertexBuffers | vertex buffers} when the device is lost
     */
    loseContext() {
      this.ready = false;
      for (const vertexBuffer of this.vertexBuffers) {
        vertexBuffer.buffer.destroy();
      }
    }
    /**
     * Restore the {@link Geometry} buffers on context restoration
     * @param renderer - The {@link Renderer} used to recreate the buffers
     */
    restoreContext(renderer) {
      if (this.ready) return;
      for (const vertexBuffer of this.vertexBuffers) {
        if (!vertexBuffer.buffer.GPUBuffer && vertexBuffer.buffer.consumers.size === 0) {
          vertexBuffer.buffer.createBuffer(renderer);
          this.uploadBuffer(renderer, vertexBuffer);
        }
        vertexBuffer.buffer.consumers.add(this.uuid);
      }
      this.ready = true;
    }
    /**
     * Add a vertex buffer to our Geometry, set its attributes and return it
     * @param parameters - vertex buffer {@link VertexBufferParams | parameters}
     * @returns - newly created {@link VertexBuffer | vertex buffer}
     */
    addVertexBuffer({
      stepMode = "vertex",
      name,
      attributes = [],
      buffer = null,
      array = null,
      bufferOffset = 0,
      bufferSize = null
    } = {}) {
      buffer = buffer || new Buffer();
      const vertexBuffer = {
        name: name ?? "attributes" + this.vertexBuffers.length,
        stepMode,
        arrayStride: 0,
        bufferLength: 0,
        attributes: [],
        buffer,
        array,
        bufferOffset,
        bufferSize
      };
      attributes?.forEach((attribute) => {
        this.setAttribute({
          vertexBuffer,
          ...attribute
        });
      });
      this.vertexBuffers.push(vertexBuffer);
      return vertexBuffer;
    }
    /**
     * Get a vertex buffer by name
     * @param name - our vertex buffer name
     * @returns - found {@link VertexBuffer | vertex buffer} or null if not found
     */
    getVertexBufferByName(name = "") {
      return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name);
    }
    /**
     * Set a vertex buffer attribute
     * @param parameters - attributes {@link VertexBufferAttributeParams | parameters}
     */
    setAttribute({
      vertexBuffer = this.vertexBuffers[0],
      name,
      type = "vec3f",
      bufferFormat = "float32x3",
      size = 3,
      array = new Float32Array(this.verticesCount * size),
      verticesStride = 1
    }) {
      const attributes = vertexBuffer.attributes;
      const attributesLength = attributes.length;
      if (!name) name = "geometryAttribute" + attributesLength;
      if (name === "position" && (type !== "vec3f" || bufferFormat !== "float32x3" || size !== 3)) {
        throwWarning(
          `Geometry 'position' attribute must have this exact properties set:
	type: 'vec3f',
	bufferFormat: 'float32x3',
	size: 3`
        );
        type = "vec3f";
        bufferFormat = "float32x3";
        size = 3;
      }
      let arrayLength = array.length;
      const attributeCount = arrayLength / size;
      if (name === "position") {
        this.verticesCount = attributeCount;
      }
      if (vertexBuffer.stepMode === "vertex" && this.verticesCount && this.verticesCount !== attributeCount * verticesStride) {
        throwError(
          `Geometry vertex attribute error. Attribute array of size ${size} must be of length: ${this.verticesCount * size}, current given: ${array.length}. (${this.verticesCount} vertices).`
        );
      } else if (vertexBuffer.stepMode === "instance" && attributeCount !== this.instancesCount) {
        if (vertexBuffer.buffer) {
          arrayLength = this.instancesCount * size;
        } else {
          throwError(
            `Geometry instance attribute error. Attribute array of size ${size} must be of length: ${this.instancesCount * size}, current given: ${array.length}. (${this.instancesCount} instances).`
          );
        }
      }
      const attribute = {
        name,
        type,
        bufferFormat,
        size,
        bufferLength: arrayLength,
        offset: attributesLength ? attributes.reduce((accumulator, currentValue) => {
          return accumulator + currentValue.bufferLength;
        }, 0) : 0,
        bufferOffset: attributesLength ? attributes[attributesLength - 1].bufferOffset + attributes[attributesLength - 1].size * 4 : 0,
        array,
        verticesStride
      };
      vertexBuffer.bufferLength += attribute.bufferLength * verticesStride;
      vertexBuffer.arrayStride += attribute.size;
      vertexBuffer.attributes.push(attribute);
    }
    /**
     * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
     * @readonly
     */
    get shouldCompute() {
      return this.vertexBuffers.length && !this.vertexBuffers[0].array;
    }
    /**
     * Get an attribute by name
     * @param name - name of the attribute to find
     * @returns - found {@link VertexBufferAttribute | attribute} or null if not found
     */
    getAttributeByName(name) {
      let attribute;
      for (const vertexBuffer of this.vertexBuffers) {
        attribute = vertexBuffer.attributes.find((attribute2) => attribute2.name === name);
        if (attribute) break;
      }
      return attribute;
    }
    /**
     * Compute the normal {@link Vec3} from a triangle defined by three {@link Vec3} by computing edges {@link Vec3}.
     * @param vertex1 - first triangle position
     * @param vertex2 - second triangle position
     * @param vertex3 - third triangle position
     * @param edge1 - first edge
     * @param edge2 - second edge
     * @param normal - flat normal generated.
     */
    computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal) {
      edge1.copy(vertex2).sub(vertex1);
      edge2.copy(vertex3).sub(vertex1);
      normal.crossVectors(edge1, edge2).normalize();
    }
    /**
     * Compute {@link Geometry} flat normals in case the `normal` attribute is missing.
     */
    computeFlatNormals() {
      const positionAttribute = this.getAttributeByName("position");
      const vertex1 = new Vec3();
      const vertex2 = new Vec3();
      const vertex3 = new Vec3();
      const edge1 = new Vec3();
      const edge2 = new Vec3();
      const normal = new Vec3();
      const posLength = positionAttribute.array.length;
      const normalArray = new Float32Array(posLength);
      for (let i = 0; i < posLength; i += positionAttribute.size * 3) {
        vertex1.set(positionAttribute.array[i], positionAttribute.array[i + 1], positionAttribute.array[i + 2]);
        vertex2.set(positionAttribute.array[i + 3], positionAttribute.array[i + 4], positionAttribute.array[i + 5]);
        vertex3.set(positionAttribute.array[i + 6], positionAttribute.array[i + 7], positionAttribute.array[i + 8]);
        this.computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal);
        for (let j = 0; j < 3; j++) {
          normalArray[i + j * 3] = normal.x;
          normalArray[i + 1 + j * 3] = normal.y;
          normalArray[i + 2 + j * 3] = normal.z;
        }
      }
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: normalArray
      });
    }
    /**
     * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
     * Also compute the Geometry bounding box.
     */
    computeGeometry() {
      if (this.ready) return;
      this.vertexBuffers.forEach((vertexBuffer, index) => {
        if (index === 0) {
          const hasPositionAttribute = vertexBuffer.attributes.find(
            (attribute) => attribute.name === "position"
          );
          if (!hasPositionAttribute) {
            throwError(`Geometry must have a 'position' attribute`);
          }
          if (hasPositionAttribute.type !== "vec3f" || hasPositionAttribute.bufferFormat !== "float32x3" || hasPositionAttribute.size !== 3) {
            throwWarning(
              `Geometry 'position' attribute must have this exact properties set:
	type: 'vec3f',
	bufferFormat: 'float32x3',
	size: 3`
            );
            hasPositionAttribute.type = "vec3f";
            hasPositionAttribute.bufferFormat = "float32x3";
            hasPositionAttribute.size = 3;
          }
          const hasNormalAttribute = vertexBuffer.attributes.find(
            (attribute) => attribute.name === "normal"
          );
          if (!hasNormalAttribute) {
            this.computeFlatNormals();
            this.setWGSLFragment();
          }
        }
        vertexBuffer.array = new Float32Array(vertexBuffer.bufferLength);
        let currentIndex = 0;
        let attributeIndex = 0;
        for (let i = 0; i < vertexBuffer.bufferLength; i += vertexBuffer.arrayStride) {
          for (let j = 0; j < vertexBuffer.attributes.length; j++) {
            const { name, size, array, verticesStride } = vertexBuffer.attributes[j];
            for (let s = 0; s < size; s++) {
              const attributeValue = array[Math.floor(attributeIndex / verticesStride) * size + s];
              vertexBuffer.array[currentIndex] = attributeValue ?? 0;
              if (name === "position") {
                if (s % 3 === 0) {
                  if (this.boundingBox.min.x > attributeValue) this.boundingBox.min.x = attributeValue;
                  if (this.boundingBox.max.x < attributeValue) this.boundingBox.max.x = attributeValue;
                } else if (s % 3 === 1) {
                  if (this.boundingBox.min.y > attributeValue) this.boundingBox.min.y = attributeValue;
                  if (this.boundingBox.max.y < attributeValue) this.boundingBox.max.y = attributeValue;
                } else if (s % 3 === 2) {
                  if (this.boundingBox.min.z > attributeValue) this.boundingBox.min.z = attributeValue;
                  if (this.boundingBox.max.z < attributeValue) this.boundingBox.max.z = attributeValue;
                }
              }
              currentIndex++;
            }
          }
          attributeIndex++;
        }
      });
      if (!this.wgslStructFragment) {
        this.setWGSLFragment();
      }
    }
    /**
     * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
     */
    setWGSLFragment() {
      let locationIndex = -1;
      this.wgslStructFragment = `struct Attributes {
	@builtin(vertex_index) vertexIndex : u32,
	@builtin(instance_index) instanceIndex : u32,${this.vertexBuffers.map((vertexBuffer) => {
      return vertexBuffer.attributes.map((attribute) => {
        locationIndex++;
        return `
	@location(${locationIndex}) ${attribute.name}: ${attribute.type}`;
      });
    }).join(",")}
};`;
      this.layoutCacheKey = this.vertexBuffers.map((vertexBuffer) => {
        return vertexBuffer.name + "," + vertexBuffer.attributes.map((attribute) => {
          return `${attribute.name},${attribute.size}`;
        });
      }).join(",") + ",";
    }
    /**
     * Create the {@link Geometry} {@link vertexBuffers | vertex buffers}.
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label = this.type }) {
      if (this.ready) return;
      for (const vertexBuffer of this.vertexBuffers) {
        if (!vertexBuffer.bufferSize) {
          vertexBuffer.bufferSize = vertexBuffer.array.length * vertexBuffer.array.constructor.BYTES_PER_ELEMENT;
        }
        if (!vertexBuffer.buffer.GPUBuffer && !vertexBuffer.buffer.consumers.size) {
          vertexBuffer.buffer.createBuffer(renderer, {
            label: label + ": " + vertexBuffer.name + " buffer",
            size: vertexBuffer.bufferSize,
            usage: this.options.mapBuffersAtCreation ? ["vertex"] : ["copyDst", "vertex"],
            mappedAtCreation: this.options.mapBuffersAtCreation
          });
          this.uploadBuffer(renderer, vertexBuffer);
        }
        vertexBuffer.buffer.consumers.add(this.uuid);
      }
      this.ready = true;
    }
    /**
     * Upload a {@link GeometryBuffer} to the GPU.
     * @param renderer - {@link Renderer} used to upload the buffer.
     * @param buffer - {@link GeometryBuffer} holding a {@link Buffer} and a typed array to upload.
     */
    uploadBuffer(renderer, buffer) {
      if (this.options.mapBuffersAtCreation) {
        new buffer.array.constructor(buffer.buffer.GPUBuffer.getMappedRange()).set(
          buffer.array
        );
        buffer.buffer.GPUBuffer.unmap();
      } else {
        renderer.queueWriteBuffer(buffer.buffer.GPUBuffer, 0, buffer.array);
      }
    }
    /**
     * Set the {@link indirectDraw} parameters to draw this {@link Geometry} with an {@link extras/buffers/IndirectBuffer.IndirectBuffer | IndirectBuffer}.
     * @param parameters -  {@link IndirectDrawParams | indirect draw parameters} to use for this {@link Geometry}.
     */
    useIndirectBuffer({ buffer, offset = 0 }) {
      this.indirectDraw = {
        buffer,
        offset
      };
    }
    /** RENDER **/
    /**
     * Set our render pass geometry vertex buffers
     * @param pass - current render pass
     */
    setGeometryBuffers(pass) {
      this.vertexBuffers.forEach((vertexBuffer, index) => {
        pass.setVertexBuffer(index, vertexBuffer.buffer.GPUBuffer, vertexBuffer.bufferOffset, vertexBuffer.bufferSize);
      });
    }
    /**
     * Draw our geometry. Can use indirect drawing if {@link indirectDraw} is set up.
     * @param pass - current render pass.
     */
    drawGeometry(pass) {
      if (this.indirectDraw && this.indirectDraw.buffer && this.indirectDraw.buffer.GPUBuffer) {
        pass.drawIndirect(this.indirectDraw.buffer.GPUBuffer, this.indirectDraw.offset);
      } else {
        pass.draw(this.verticesCount, this.instancesCount);
      }
    }
    /**
     * Set our vertex buffers then draw the geometry.
     * @param pass - current render pass.
     */
    render(pass) {
      if (!this.ready) return;
      this.setGeometryBuffers(pass);
      this.drawGeometry(pass);
    }
    /**
     * Destroy our geometry vertex buffers.
     * @param renderer - current {@link Renderer}, in case we want to remove the {@link VertexBuffer#buffer | buffers} from the cache.
     */
    destroy(renderer = null) {
      this.ready = false;
      for (const vertexBuffer of this.vertexBuffers) {
        vertexBuffer.buffer.consumers.delete(this.uuid);
        if (!vertexBuffer.buffer.consumers.size) {
          vertexBuffer.buffer.destroy();
        }
        vertexBuffer.array = null;
        if (renderer) renderer.removeBuffer(vertexBuffer.buffer);
      }
    }
  }

  class IndexedGeometry extends Geometry {
    /**
     * IndexedGeometry constructor
     * @param parameters - {@link GeometryParams | parameters} used to create our IndexedGeometry
     */
    constructor({
      verticesOrder = "ccw",
      topology = "triangle-list",
      instancesCount = 1,
      vertexBuffers = [],
      mapBuffersAtCreation = true
    } = {}) {
      super({ verticesOrder, topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
      this.type = "IndexedGeometry";
    }
    /**
     * Reset all the {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer} when the device is lost
     */
    loseContext() {
      super.loseContext();
      if (this.indexBuffer) {
        this.indexBuffer.buffer.destroy();
      }
    }
    /**
     * Restore the {@link IndexedGeometry} buffers on context restoration
     * @param renderer - The {@link Renderer} used to recreate the buffers
     */
    restoreContext(renderer) {
      if (this.ready) return;
      if (!this.indexBuffer.buffer.GPUBuffer) {
        this.indexBuffer.buffer.createBuffer(renderer);
        this.uploadBuffer(renderer, this.indexBuffer);
        this.indexBuffer.buffer.consumers.add(this.uuid);
      }
      super.restoreContext(renderer);
    }
    /**
     * Compute {@link IndexedGeometry} flat normals in case the `normal` attribute is missing.
     */
    computeFlatNormals() {
      const positionAttribute = this.getAttributeByName("position");
      const vertex1 = new Vec3();
      const vertex2 = new Vec3();
      const vertex3 = new Vec3();
      const edge1 = new Vec3();
      const edge2 = new Vec3();
      const normal = new Vec3();
      const posLength = positionAttribute.array.length;
      const normalArray = new Float32Array(posLength);
      const nbIndices = this.indexBuffer.array.length;
      for (let i = 0; i < nbIndices; i += 3) {
        const i0 = this.indexBuffer.array[i] * 3;
        const i1 = this.indexBuffer.array[i + 1] * 3;
        const i2 = this.indexBuffer.array[i + 2] * 3;
        if (posLength < i0 + 2) continue;
        vertex1.set(positionAttribute.array[i0], positionAttribute.array[i0 + 1], positionAttribute.array[i0 + 2]);
        if (posLength < i1 + 2) continue;
        vertex2.set(positionAttribute.array[i1], positionAttribute.array[i1 + 1], positionAttribute.array[i1 + 2]);
        if (posLength < i2 + 2) continue;
        vertex3.set(positionAttribute.array[i2], positionAttribute.array[i2 + 1], positionAttribute.array[i2 + 2]);
        this.computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal);
        for (let j = 0; j < 3; j++) {
          normalArray[this.indexBuffer.array[i + j] * 3] = normal.x;
          normalArray[this.indexBuffer.array[i + j] * 3 + 1] = normal.y;
          normalArray[this.indexBuffer.array[i + j] * 3 + 2] = normal.z;
        }
      }
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: normalArray
      });
    }
    /**
     * If we have less than 65.536 vertices, we should use a Uin16Array to hold our index buffer values
     * @readonly
     */
    get useUint16IndexArray() {
      return this.verticesCount < 256 * 256;
    }
    /**
     * Set our {@link indexBuffer}
     * @param parameters - {@link IndexedGeometryIndexBufferOptions | parameters} used to create our index buffer
     */
    setIndexBuffer({
      bufferFormat = "uint32",
      array = new Uint32Array(0),
      buffer = new Buffer(),
      bufferOffset = 0,
      bufferSize = null
    }) {
      this.indexBuffer = {
        array,
        bufferFormat,
        bufferLength: array.length,
        buffer,
        bufferOffset,
        bufferSize: bufferSize !== null ? bufferSize : array.length * array.constructor.BYTES_PER_ELEMENT
      };
    }
    /**
     * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
     */
    setWGSLFragment() {
      super.setWGSLFragment();
      if (this.indexBuffer) {
        this.layoutCacheKey += "indexFormat," + this.indexBuffer.bufferFormat + ",";
      }
    }
    /**
     * Create the {@link Geometry} {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer}.
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label = this.type }) {
      if (!this.indexBuffer.buffer.GPUBuffer) {
        this.indexBuffer.buffer.createBuffer(renderer, {
          label: label + ": index buffer",
          size: this.indexBuffer.array.byteLength,
          usage: this.options.mapBuffersAtCreation ? ["index"] : ["copyDst", "index"],
          mappedAtCreation: this.options.mapBuffersAtCreation
        });
        this.uploadBuffer(renderer, this.indexBuffer);
      }
      this.indexBuffer.buffer.consumers.add(this.uuid);
      super.createBuffers({ renderer, label });
    }
    /** RENDER **/
    /**
     * First, set our render pass geometry vertex buffers
     * Then, set our render pass geometry index buffer
     * @param pass - current render pass
     */
    setGeometryBuffers(pass) {
      super.setGeometryBuffers(pass);
      pass.setIndexBuffer(
        this.indexBuffer.buffer.GPUBuffer,
        this.indexBuffer.bufferFormat,
        this.indexBuffer.bufferOffset,
        this.indexBuffer.bufferSize
      );
    }
    /**
     * Draw our indexed geometry. Can use indirect drawing if {@link indirectDraw} is set up.
     * @param pass - current render pass.
     */
    drawGeometry(pass) {
      if (this.indirectDraw && this.indirectDraw.buffer && this.indirectDraw.buffer.GPUBuffer) {
        pass.drawIndexedIndirect(this.indirectDraw.buffer.GPUBuffer, this.indirectDraw.offset);
      } else {
        pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount);
      }
    }
    /**
     * Destroy our indexed geometry vertex buffers and index buffer.
     * @param renderer - current {@link Renderer}, in case we want to remove the {@link IndexBuffer#buffer | buffer} from the cache.
     */
    destroy(renderer = null) {
      super.destroy(renderer);
      if (this.indexBuffer) {
        this.indexBuffer.buffer.consumers.delete(this.uuid);
        this.indexBuffer.buffer.destroy();
        if (renderer) renderer.removeBuffer(this.indexBuffer.buffer);
      }
    }
  }

  class PlaneGeometry extends IndexedGeometry {
    /**
     * PlaneGeometry constructor
     * @param parameters - {@link PlaneGeometryParams | parameters} used to create our PlaneGeometry
     */
    constructor({
      widthSegments = 1,
      heightSegments = 1,
      instancesCount = 1,
      vertexBuffers = [],
      topology
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation: true });
      this.type = "PlaneGeometry";
      widthSegments = Math.floor(widthSegments);
      heightSegments = Math.floor(heightSegments);
      this.definition = {
        id: widthSegments * heightSegments + widthSegments,
        width: widthSegments,
        height: heightSegments,
        count: widthSegments * heightSegments
      };
      const verticesCount = (this.definition.width + 1) * (this.definition.height + 1);
      const attributes = this.getIndexedVerticesAndUVs(verticesCount);
      for (const attribute of Object.values(attributes)) {
        this.setAttribute(attribute);
      }
      this.setIndexArray();
    }
    /**
     * Set our PlaneGeometry index array
     */
    setIndexArray() {
      const indexArray = this.useUint16IndexArray ? new Uint16Array(this.definition.count * 6) : new Uint32Array(this.definition.count * 6);
      let index = 0;
      for (let y = 0; y < this.definition.height; y++) {
        for (let x = 0; x < this.definition.width; x++) {
          indexArray[index++] = x + y * (this.definition.width + 1);
          indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1);
          indexArray[index++] = x + 1 + y * (this.definition.width + 1);
          indexArray[index++] = x + 1 + y * (this.definition.width + 1);
          indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1);
          indexArray[index++] = this.definition.width + x + 2 + y * (this.definition.width + 1);
        }
      }
      this.setIndexBuffer({
        array: indexArray,
        bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
      });
    }
    /**
     * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
     * @param verticesCount - {@link Geometry#verticesCount | number of vertices} of our {@link PlaneGeometry}
     * @returns - our position and uv {@link VertexBufferAttributeParams | attributes}
     */
    getIndexedVerticesAndUVs(verticesCount) {
      const uv = {
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        array: new Float32Array(verticesCount * 2)
      };
      const position = {
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
        size: 3,
        array: new Float32Array(verticesCount * 3)
      };
      const normal = {
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
        size: 3,
        array: new Float32Array(verticesCount * 3)
      };
      let positionOffset = 0;
      let normalOffset = 0;
      let uvOffset = 0;
      for (let y = 0; y <= this.definition.height; y++) {
        for (let x = 0; x <= this.definition.width; x++) {
          uv.array[uvOffset++] = 1 - x / this.definition.width;
          uv.array[uvOffset++] = 1 - y / this.definition.height;
          position.array[positionOffset++] = 1 - x * 2 / this.definition.width;
          position.array[positionOffset++] = y * 2 / this.definition.height - 1;
          position.array[positionOffset++] = 0;
          normal.array[normalOffset++] = 0;
          normal.array[normalOffset++] = 0;
          normal.array[normalOffset++] = 1;
        }
      }
      return { position, uv, normal };
    }
  }

  function sRGBToLinearFloat(c) {
    return c < 0.04045 ? c * 0.0773993808 : Math.pow(c * 0.9478672986 + 0.0521327014, 2.4);
  }
  function linearTosRGBFloat(c) {
    return c < 31308e-7 ? c * 12.92 : 1.055 * Math.pow(c, 0.41666) - 0.055;
  }
  function sRGBToLinear(vector = new Vec3()) {
    vector.x = sRGBToLinearFloat(vector.x);
    vector.y = sRGBToLinearFloat(vector.y);
    vector.z = sRGBToLinearFloat(vector.z);
    return vector;
  }
  function linearTosRGB(vector = new Vec3()) {
    vector.x = linearTosRGBFloat(vector.x);
    vector.y = linearTosRGBFloat(vector.y);
    vector.z = linearTosRGBFloat(vector.z);
    return vector;
  }

  var __typeError$n = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$n = (obj, member, msg) => member.has(obj) || __typeError$n("Cannot " + msg);
  var __privateGet$l = (obj, member, getter) => (__accessCheck$n(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$n = (obj, member, value) => member.has(obj) ? __typeError$n("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$l = (obj, member, value, setter) => (__accessCheck$n(obj, member, "write to private field"), member.set(obj, value), value);
  var _intensity$1, _intensityColor;
  class Light extends Object3D {
    /**
     * Light constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link Light}.
     * @param parameters - {@link LightParams} used to create this {@link Light}.
     */
    constructor(renderer, { label = "", color = new Vec3(1), intensity = 1, type = "lights" } = {}) {
      super();
      /** @ignore */
      __privateAdd$n(this, _intensity$1);
      /**
       * A {@link Vec3} holding the {@link Light} {@link color} multiplied by its {@link intensity}.
       * @private
       */
      __privateAdd$n(this, _intensityColor);
      this.type = type;
      this.setRenderer(renderer);
      this.uuid = generateUUID();
      this.options = {
        label,
        color,
        intensity
      };
      this.color = color;
      __privateSet$l(this, _intensityColor, this.color.clone());
      this.color.onChange(() => this.onPropertyChanged("color", this.actualColor));
      this.intensity = intensity;
      this.userData = {};
    }
    /**
     * Set or reset this light {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      const hasRenderer = !!this.renderer;
      if (this.renderer) {
        this.renderer.removeLight(this);
      }
      renderer = isCameraRenderer(renderer, this.type);
      this.renderer = renderer;
      if (this.index === void 0) {
        this.index = this.renderer.lights.filter((light) => light.type === this.type).length;
      }
      if (!this.renderer.lightsBindingParams || this.index + 1 > this.renderer.lightsBindingParams[this.type].max) {
        this.onMaxLightOverflow(this.type);
      }
      this.renderer.addLight(this);
      this.setRendererBinding();
      if (hasRenderer) {
        this.reset(false);
      }
    }
    /**
     * Set or reset this {@link Light} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding() {
      if (this.renderer.bindings[this.type]) {
        this.rendererBinding = this.renderer.bindings[this.type];
      }
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link Light} has been overflowed or when updating the {@link Light} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link Light} shadow if any.
     */
    reset(resetShadow = true) {
      this.setRendererBinding();
      this.onPropertyChanged("color", this.actualColor);
    }
    /**
     * Get this {@link Light} intensity.
     * @returns - The {@link Light} intensity.
     */
    get intensity() {
      return __privateGet$l(this, _intensity$1);
    }
    /**
     * Set this {@link Light} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Light} intensity.
     */
    set intensity(value) {
      __privateSet$l(this, _intensity$1, value);
      this.onPropertyChanged("color", this.actualColor);
    }
    /**
     * Get the actual {@link Vec3} color used in the shader: convert {@link color} to linear space, then multiply by {@link intensity}.
     * @returns - Actual {@link Vec3} color used in the shader.
     */
    get actualColor() {
      return sRGBToLinear(__privateGet$l(this, _intensityColor).copy(this.color)).multiplyScalar(this.intensity);
    }
    /**
     * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
     * @param propertyKey - name of the property to update.
     * @param value - new value of the property.
     */
    onPropertyChanged(propertyKey, value) {
      if (this.rendererBinding && this.rendererBinding.inputs[propertyKey]) {
        if (value instanceof Vec3) {
          this.rendererBinding.inputs[propertyKey].value[this.index * 3] = value.x;
          this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 1] = value.y;
          this.rendererBinding.inputs[propertyKey].value[this.index * 3 + 2] = value.z;
        } else {
          this.rendererBinding.inputs[propertyKey].value[this.index] = value;
        }
        this.rendererBinding.inputs[propertyKey].shouldUpdate = true;
        this.renderer.shouldUpdateCameraLightsBindGroup();
      }
    }
    /**
     * Tell the {@link renderer} that the maximum number for this {@link type} of light has been overflown.
     * @param lightsType - {@link type} of light.
     */
    onMaxLightOverflow(lightsType) {
      this.renderer.onMaxLightOverflow(lightsType, this.index);
      if (this.rendererBinding) {
        this.rendererBinding = this.renderer.bindings[lightsType];
      }
    }
    // explicitly disable rotation, scale and transformation origin
    /** @ignore */
    applyRotation() {
    }
    /** @ignore */
    applyScale() {
    }
    /** @ignore */
    applyTransformOrigin() {
    }
    /**
     * Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
     */
    onBeforeRenderScene() {
      this._onBeforeRenderCallback && this._onBeforeRenderCallback();
    }
    /**
     * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the {@link Light} matrices. The callback won't be called if the {@link renderer} is not ready.
     * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
     * @returns - our {@link Light}
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Remove this {@link Light} from the {@link renderer} and destroy it.
     */
    remove() {
      this.renderer.removeLight(this);
      this.destroy();
    }
    /**
     * Destroy this {@link Light}.
     */
    destroy() {
      super.destroy();
    }
  }
  _intensity$1 = new WeakMap();
  _intensityColor = new WeakMap();

  class AmbientLight extends Light {
    /**
     * AmbientLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link AmbientLight}.
     * @param parameters - {@link LightBaseParams} used to create this {@link AmbientLight}.
     */
    constructor(renderer, { label = "AmbientLight", color = new Vec3(1), intensity = 0.1 } = {}) {
      const type = "ambientLights";
      super(renderer, { label, color, intensity, type });
    }
    // explicitly disable position as well
    /** @ignore */
    applyPosition() {
    }
  }

  var __typeError$m = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$m = (obj, member, msg) => member.has(obj) || __typeError$m("Cannot " + msg);
  var __privateGet$k = (obj, member, getter) => (__accessCheck$m(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$m = (obj, member, value) => member.has(obj) ? __typeError$m("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$k = (obj, member, value, setter) => (__accessCheck$m(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$b = (obj, member, method) => (__accessCheck$m(obj, member, "access private method"), method);
  var _useStencil, _RenderPass_instances, updateDepthAttachmentSettings_fn;
  class RenderPass {
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}.
     */
    constructor(renderer, {
      label = "Render Pass",
      sampleCount = 4,
      qualityRatio = 1,
      fixedSize = null,
      // color
      useColorAttachments = true,
      renderToSwapChain = true,
      colorAttachments = [],
      // depth
      useDepth = true,
      depthTexture = null,
      depthLoadOp = "clear",
      depthStoreOp = "store",
      depthClearValue = 1,
      depthFormat = "depth24plus",
      depthReadOnly = false,
      stencilClearValue = 0,
      stencilLoadOp = "clear",
      stencilStoreOp = "store",
      stencilReadOnly = false
    } = {}) {
      __privateAdd$m(this, _RenderPass_instances);
      /** Whether the {@link RenderPass} should handle stencil. Default to `false`, eventually set to `true` based on the {@link depthTexture} format. */
      __privateAdd$m(this, _useStencil);
      this.type = "RenderPass";
      renderer = isRenderer(renderer, label + " " + this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      this.viewport = null;
      this.scissorRect = null;
      __privateSet$k(this, _useStencil, false);
      if (useColorAttachments) {
        const defaultColorAttachment = {
          loadOp: "clear",
          storeOp: "store",
          clearValue: [0, 0, 0, 0],
          targetFormat: this.renderer.options.context.format
        };
        if (!colorAttachments.length) {
          colorAttachments = [defaultColorAttachment];
        } else {
          colorAttachments = colorAttachments.map((colorAttachment) => {
            return { ...defaultColorAttachment, ...colorAttachment };
          });
        }
      }
      this.options = {
        label,
        sampleCount,
        qualityRatio,
        fixedSize,
        // color
        useColorAttachments,
        renderToSwapChain,
        colorAttachments,
        // depth
        useDepth,
        ...depthTexture !== void 0 && { depthTexture },
        depthLoadOp,
        depthStoreOp,
        depthClearValue,
        depthFormat,
        depthReadOnly,
        stencilClearValue,
        stencilLoadOp,
        stencilStoreOp,
        stencilReadOnly
      };
      this.renderer.renderPasses.set(this.uuid, this);
      if (this.renderer.device) {
        this.init();
      }
    }
    /**
     * Initialize the {@link RenderPass} textures and descriptor.
     */
    init() {
      if (this.options.useDepth) {
        this.createDepthTexture();
      }
      this.viewTextures = [];
      this.resolveTargets = [];
      if (this.options.useColorAttachments && (!this.options.renderToSwapChain || this.options.sampleCount > 1)) {
        this.createViewTextures();
        this.createResolveTargets();
      }
      this.setRenderPassDescriptor();
    }
    /**
     * Reset this {@link RenderPass} {@link RenderPass.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.renderPasses.delete(this.uuid);
      }
      renderer = isRenderer(renderer, this.options.label + " " + this.type);
      this.renderer = renderer;
      if (this.options.useDepth && !this.options.depthTexture) {
        this.depthTexture.setRenderer(this.renderer);
      }
      this.viewTextures.forEach((texture) => {
        texture.setRenderer(this.renderer);
      });
      this.resolveTargets.forEach((texture) => {
        if (texture) {
          texture.setRenderer(this.renderer);
        }
      });
      this.renderer.renderPasses.set(this.uuid, this);
    }
    /**
     * Create and set our {@link depthTexture | depth texture}.
     */
    createDepthTexture() {
      if (this.options.depthTexture) {
        this.depthTexture = this.options.depthTexture;
        this.options.depthFormat = this.options.depthTexture.options.format;
      } else {
        this.depthTexture = new Texture(this.renderer, {
          label: this.options.label + " depth texture",
          name: "depthTexture",
          format: this.options.depthFormat,
          sampleCount: this.options.sampleCount,
          qualityRatio: this.options.qualityRatio,
          ...this.options.fixedSize && { fixedSize: this.options.fixedSize },
          type: "depth",
          usage: ["renderAttachment", "textureBinding"]
        });
      }
      if (this.depthTexture.options.format.includes("stencil")) {
        __privateSet$k(this, _useStencil, true);
      }
    }
    /**
     * Create and set our {@link viewTextures | view textures}.
     */
    createViewTextures() {
      this.options.colorAttachments.forEach((colorAttachment, index) => {
        this.viewTextures.push(
          new Texture(this.renderer, {
            label: `${this.options.label} colorAttachment[${index}] view texture`,
            name: `colorAttachment${index}ViewTexture`,
            format: colorAttachment.targetFormat,
            sampleCount: this.options.sampleCount,
            qualityRatio: this.options.qualityRatio,
            ...this.options.fixedSize && { fixedSize: this.options.fixedSize },
            type: "texture",
            usage: ["copySrc", "copyDst", "renderAttachment", "textureBinding"]
          })
        );
      });
    }
    /**
     * Create and set our {@link resolveTargets | resolve targets} in case the {@link viewTextures} are multisampled.
     *
     * Note that if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}, the first resolve target will be set to `null` as the current swap chain texture will be used anyway in the render loop (see {@link updateView}).
     */
    createResolveTargets() {
      if (this.options.sampleCount > 1) {
        this.options.colorAttachments.forEach((colorAttachment, index) => {
          this.resolveTargets.push(
            this.options.renderToSwapChain && index === 0 ? null : new Texture(this.renderer, {
              label: `${this.options.label} resolve target[${index}] texture`,
              name: `resolveTarget${index}Texture`,
              format: colorAttachment.targetFormat,
              sampleCount: 1,
              qualityRatio: this.options.qualityRatio,
              type: "texture"
            })
          );
        });
      }
    }
    /**
     * Get the textures outputted by this {@link RenderPass}, which means the {@link viewTextures} if not multisampled, or their {@link resolveTargets} else (beware that the first resolve target might be `null` if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}).
     * @readonly
     */
    get outputTextures() {
      return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures;
    }
    /**
     * Set our render pass {@link descriptor}.
     */
    setRenderPassDescriptor(depthTextureView = null) {
      this.descriptor = {
        label: this.options.label + " descriptor",
        colorAttachments: this.options.colorAttachments.map((colorAttachment, index) => {
          return {
            // view
            view: this.viewTextures[index]?.texture.createView({
              label: this.viewTextures[index]?.texture.label + " view"
            }),
            ...this.resolveTargets.length && {
              resolveTarget: this.resolveTargets[index]?.texture.createView({
                label: this.resolveTargets[index]?.texture.label + " view"
              })
            },
            // clear values
            clearValue: colorAttachment.clearValue,
            // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
            // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
            loadOp: colorAttachment.loadOp,
            // storeOp: 'store' means store the result of what we draw.
            // We could also pass 'discard' which would throw away what we draw.
            // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
            storeOp: colorAttachment.storeOp,
            // eventual depth slice
            ...colorAttachment.depthSlice !== void 0 && {
              depthSlice: colorAttachment.depthSlice
            }
          };
        }),
        ...this.options.useDepth && {
          depthStencilAttachment: {
            view: depthTextureView || this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + " view"
            }),
            ...this.depthStencilAttachmentSettings
          }
        }
      };
    }
    /**
     * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
     * @readonly
     */
    get depthStencilAttachmentSettings() {
      const depthReadOnly = !!this.options.depthReadOnly;
      const stencilReadOnly = !!this.options.stencilReadOnly;
      return {
        depthClearValue: this.options.depthClearValue,
        // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
        ...!depthReadOnly && { depthLoadOp: this.options.depthLoadOp, depthStoreOp: this.options.depthStoreOp },
        depthReadOnly,
        ...__privateGet$k(this, _useStencil) && {
          ...!stencilReadOnly && {
            stencilLoadOp: this.options.stencilLoadOp,
            stencilStoreOp: this.options.stencilStoreOp
          },
          stencilReadOnly
        }
      };
    }
    /**
     * Set the {@link viewport} to use if any.
     * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
     */
    setViewport(viewport = null) {
      this.viewport = viewport;
    }
    /**
     * Set the {@link scissorRect} to use if any.
     * @param scissorRect - {@link RectBBox} size to use for scissors. Can be set to `null` to cancel the {@link scissorRect}.
     */
    setScissorRect(scissorRect = null) {
      this.scissorRect = scissorRect;
    }
    /**
     * Begin the {@link GPURenderPassEncoder} and eventually set the {@link viewport} and {@link scissorRect}.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     * @param descriptor - Custom {@link https://gpuweb.github.io/types/interfaces/GPURenderPassDescriptor.html | GPURenderPassDescriptor} to use if any. Default to {@link RenderPass#descriptor | descriptor}.
     * @returns - The created {@link GPURenderPassEncoder}.
     */
    beginRenderPass(commandEncoder, descriptor = this.descriptor) {
      const pass = commandEncoder.beginRenderPass(descriptor);
      if (this.viewport) {
        pass.setViewport(
          this.viewport.left,
          this.viewport.top,
          this.viewport.width,
          this.viewport.height,
          this.viewport.minDepth,
          this.viewport.maxDepth
        );
      }
      if (this.scissorRect) {
        pass.setScissorRect(this.scissorRect.left, this.scissorRect.top, this.scissorRect.width, this.scissorRect.height);
      }
      return pass;
    }
    /**
     * Update our {@link RenderPass} textures quality ratio.
     * @param qualityRatio - New quality ratio to use.
     */
    setQualityRatio(qualityRatio = 1) {
      if (this.options.qualityRatio === qualityRatio) return;
      this.options.qualityRatio = qualityRatio;
      this.viewTextures.forEach((viewTexture) => {
        viewTexture.setQualityRatio(this.options.qualityRatio);
      });
      this.resolveTargets.forEach((resolveTarget) => {
        resolveTarget?.setQualityRatio(this.options.qualityRatio);
      });
      if (!this.options.depthTexture && this.options.useDepth) {
        this.depthTexture.setQualityRatio(this.options.qualityRatio);
      }
      this.resize();
    }
    /**
     * Resize our {@link RenderPass}: reset its {@link Texture}.
     */
    resize() {
      if (!this.renderer.device) return;
      if (this.options.useDepth) {
        this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
          label: this.depthTexture.options.label + " view"
        });
      }
      this.viewTextures.forEach((viewTexture, index) => {
        this.descriptor.colorAttachments[index].view = viewTexture.texture.createView({
          label: viewTexture.options.label + " view"
        });
      });
      this.resolveTargets.forEach((resolveTarget, index) => {
        if (resolveTarget) {
          this.descriptor.colorAttachments[index].resolveTarget = resolveTarget.texture.createView({
            label: resolveTarget.options.label + " view"
          });
        }
      });
    }
    /**
     * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation}.
     * @param loadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#loadop | load operation} to use.
     * @param colorAttachmentIndex - index of the color attachment for which to use this load operation.
     */
    setLoadOp(loadOp = "clear", colorAttachmentIndex = 0) {
      if (this.options.useColorAttachments) {
        if (this.options.colorAttachments[colorAttachmentIndex]) {
          this.options.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
        }
        if (this.descriptor) {
          if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
            this.descriptor.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
          }
        }
      }
    }
    /**
     * Set the {@link descriptor} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation}.
     * @param depthLoadOp - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthloadop | depth load operation} to use.
     */
    setDepthLoadOp(depthLoadOp = "clear") {
      this.options.depthLoadOp = depthLoadOp;
      __privateMethod$b(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
    }
    /**
     * Set the new {@link RenderPassParams.depthReadOnly | depthReadOnly} setting.
     * @param value - Whether the depth buffer should be read-only or not.
     */
    setDepthReadOnly(value) {
      this.options.depthReadOnly = value;
      __privateMethod$b(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
    }
    /**
     * Set the new {@link RenderPassParams.stencilReadOnly | stencilReadOnly} setting.
     * @param value - Whether the stencil buffer should be read-only or not.
     */
    setStencilReadOnly(value) {
      this.options.stencilReadOnly = value;
      __privateMethod$b(this, _RenderPass_instances, updateDepthAttachmentSettings_fn).call(this);
    }
    /**
     * Set our {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURendererContextOptions#alphaMode | premultiplied alpha mode}, your `R`, `G` and `B` channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#clearvalue | clear colors value} to use.
     * @param colorAttachmentIndex - index of the color attachment for which to use this clear value.
     */
    setClearValue(clearValue = [0, 0, 0, 0], colorAttachmentIndex = 0) {
      if (this.options.useColorAttachments) {
        if (this.renderer.options.context.alphaMode === "premultiplied") {
          const alpha = clearValue[3];
          clearValue[0] = Math.min(clearValue[0], alpha);
          clearValue[1] = Math.min(clearValue[1], alpha);
          clearValue[2] = Math.min(clearValue[2], alpha);
        }
        if (this.options.colorAttachments[colorAttachmentIndex]) {
          this.options.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
        }
        if (this.descriptor) {
          if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
            this.descriptor.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
          }
        }
      }
    }
    /**
     * Set the current {@link descriptor} texture {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#view | view} and {@link GPUCommandEncoder.beginRenderPass().resolveTarget | resolveTarget} (depending on whether we're using multisampling).
     * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
     * @returns - the {@link GPUTexture | texture} to render to.
     */
    updateView(renderTexture = null) {
      if (!this.options.colorAttachments.length || !this.options.renderToSwapChain) {
        return renderTexture;
      }
      if (!renderTexture) {
        renderTexture = this.renderer.context.getCurrentTexture();
        renderTexture.label = `${this.renderer.type} context current texture`;
      }
      if (this.options.sampleCount > 1) {
        this.descriptor.colorAttachments[0].view = this.viewTextures[0].texture.createView({
          label: this.viewTextures[0].options.label + " view"
        });
        this.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView({
          label: renderTexture.label + " resolve target view"
        });
      } else {
        this.descriptor.colorAttachments[0].view = renderTexture.createView({
          label: renderTexture.label + " view"
        });
      }
      return renderTexture;
    }
    /**
     * Destroy our {@link RenderPass}.
     */
    destroy() {
      this.viewTextures.forEach((viewTexture) => viewTexture.destroy());
      this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy());
      if (!this.options.depthTexture && this.depthTexture) {
        this.depthTexture.destroy();
      }
      this.renderer.renderPasses.delete(this.uuid);
    }
  }
  _useStencil = new WeakMap();
  _RenderPass_instances = new WeakSet();
  /**
   * Update the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUCommandEncoder/beginRenderPass#depthstencil_attachment_object_structure | descriptor depthStencilAttachment} settings, except for the {@link depthTexture} view.
   * @private
   */
  updateDepthAttachmentSettings_fn = function() {
    if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
      this.descriptor.depthStencilAttachment = {
        view: this.descriptor.depthStencilAttachment.view,
        ...this.depthStencilAttachmentSettings
      };
    }
  };

  var __typeError$l = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$l = (obj, member, msg) => member.has(obj) || __typeError$l("Cannot " + msg);
  var __privateGet$j = (obj, member, getter) => (__accessCheck$l(obj, member, "read from private field"), member.get(obj));
  var __privateAdd$l = (obj, member, value) => member.has(obj) ? __typeError$l("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$j = (obj, member, value, setter) => (__accessCheck$l(obj, member, "write to private field"), member.set(obj, value), value);
  var _autoRender$1;
  class RenderTarget {
    /**
     * RenderTarget constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}.
     * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}.
     */
    constructor(renderer, parameters = {}) {
      /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. */
      __privateAdd$l(this, _autoRender$1, true);
      this.type = "RenderTarget";
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { label, colorAttachments, depthTexture, autoRender, renderTextureName, ...renderPassParams } = parameters;
      const depthTextureToUse = !!depthTexture ? depthTexture : this.renderer.renderPass.options.sampleCount === (parameters.sampleCount ?? 4) && (!renderPassParams.qualityRatio || renderPassParams.qualityRatio === 1) && !renderPassParams.fixedSize && (!parameters.depthFormat || parameters.depthFormat === this.renderer.renderPass.depthTexture.options.format) ? this.renderer.renderPass.depthTexture : null;
      this.options = {
        label,
        ...renderPassParams,
        ...depthTextureToUse && { depthTexture: depthTextureToUse },
        ...colorAttachments && { colorAttachments },
        renderTextureName: renderTextureName ?? "renderTexture",
        autoRender: autoRender === void 0 ? true : autoRender
      };
      if (autoRender !== void 0) {
        __privateSet$j(this, _autoRender$1, autoRender);
      }
      this.renderPass = new RenderPass(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
        ...colorAttachments && { colorAttachments },
        depthTexture: this.options.depthTexture,
        ...renderPassParams
      });
      if (renderPassParams.useColorAttachments !== false) {
        this.renderTexture = new Texture(this.renderer, {
          label: this.options.label ? `${this.options.label} Render Texture` : "Render Target render texture",
          name: this.options.renderTextureName,
          format: colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat ? colorAttachments[0].targetFormat : this.renderer.options.context.format,
          ...this.options.qualityRatio !== void 0 && { qualityRatio: this.options.qualityRatio },
          ...this.options.fixedSize !== void 0 && { fixedSize: this.options.fixedSize },
          usage: ["copySrc", "copyDst", "renderAttachment", "textureBinding"]
        });
      }
      this.addToScene();
    }
    /**
     * Reset this {@link RenderTarget} {@link RenderTarget.renderer | renderer}. Also set the {@link renderPass} renderer.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.removeFromScene();
      }
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
      if (this.options.depthTexture) {
        this.options.depthTexture.setRenderer(this.renderer);
      }
      this.renderPass.setRenderer(this.renderer);
      if (this.renderTexture) {
        this.renderTexture.setRenderer(this.renderer);
      }
      this.addToScene();
    }
    /**
     * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
     *
     * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
     *
     * @readonly
     */
    get outputTextures() {
      return !this.renderPass.outputTextures.length ? !this.renderTexture ? [] : [this.renderTexture] : this.renderPass.outputTextures.map((texture, index) => {
        return index === 0 && this.renderPass.options.renderToSwapChain ? this.renderTexture : texture;
      });
    }
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      this.renderer.renderTargets.push(this);
      if (__privateGet$j(this, _autoRender$1)) {
        this.renderer.scene.addRenderTarget(this);
      }
    }
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (__privateGet$j(this, _autoRender$1)) {
        this.renderer.scene.removeRenderTarget(this);
      }
      this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
    }
    /**
     * Update our {@link RenderTarget} {@link renderTexture} and {@link renderPass} quality ratio.
     * @param qualityRatio - New quality ratio to use.
     */
    setQualityRatio(qualityRatio = 1) {
      this.options.qualityRatio = qualityRatio;
      this.renderTexture?.setQualityRatio(qualityRatio);
      this.renderPass?.setQualityRatio(qualityRatio);
    }
    /**
     * Resize our {@link renderPass}.
     */
    resize() {
      if (this.options.depthTexture) {
        this.renderPass.options.depthTexture.texture = this.options.depthTexture.texture;
      }
      this.renderPass?.resize();
    }
    /**
     * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}.
     */
    remove() {
      this.destroy();
    }
    /**
     * Destroy our {@link RenderTarget}.
     */
    destroy() {
      this.renderer.meshes.forEach((mesh) => {
        if (mesh.outputTarget && mesh.outputTarget.uuid === this.uuid) {
          mesh.setOutputTarget(null);
        }
      });
      this.renderer.shaderPasses.forEach((shaderPass) => {
        if (shaderPass.outputTarget && shaderPass.outputTarget.uuid === this.uuid) {
          shaderPass.outputTarget = null;
          shaderPass.setOutputTarget(null);
        }
      });
      this.removeFromScene();
      this.renderPass?.destroy();
      this.renderTexture?.destroy();
    }
  }
  _autoRender$1 = new WeakMap();

  class ProjectedObject3D extends Object3D {
    /**
     * ProjectedObject3D constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link ProjectedObject3D}
     */
    constructor(renderer) {
      super();
      renderer = isCameraRenderer(renderer, "ProjectedObject3D");
      this.camera = renderer.camera;
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyPosition() {
      super.applyPosition();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyRotation() {
      super.applyRotation();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyScale() {
      super.applyScale();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyTransformOrigin() {
      super.applyTransformOrigin();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Set our transform and projection matrices
     */
    setMatrices() {
      super.setMatrices();
      this.matrices = {
        ...this.matrices,
        modelView: {
          matrix: new Mat4(),
          shouldUpdate: true,
          onUpdate: () => {
            this.modelViewMatrix.multiplyMatrices(this.viewMatrix, this.worldMatrix);
          }
        },
        modelViewProjection: {
          matrix: new Mat4(),
          shouldUpdate: true,
          onUpdate: () => {
            this.modelViewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.modelViewMatrix);
          }
        },
        normal: {
          matrix: new Mat3(),
          shouldUpdate: true,
          onUpdate: () => {
            this.normalMatrix.getNormalMatrix(this.worldMatrix);
          }
        }
      };
    }
    /**
     * Get our {@link modelViewMatrix | model view matrix}
     */
    get modelViewMatrix() {
      return this.matrices.modelView.matrix;
    }
    /**
     * Set our {@link modelViewMatrix | model view matrix}
     * @param value - new {@link modelViewMatrix | model view matrix}
     */
    set modelViewMatrix(value) {
      this.matrices.modelView.matrix = value;
      this.matrices.modelView.shouldUpdate = true;
    }
    /**
     * Get our {@link Camera#viewMatrix | camera view matrix}
     * @readonly
     */
    get viewMatrix() {
      return this.camera.viewMatrix;
    }
    /**
     * Get our {@link Camera#projectionMatrix | camera projection matrix}
     * @readonly
     */
    get projectionMatrix() {
      return this.camera.projectionMatrix;
    }
    /**
     * Get our {@link modelViewProjectionMatrix | model view projection matrix}
     */
    get modelViewProjectionMatrix() {
      return this.matrices.modelViewProjection.matrix;
    }
    /**
     * Set our {@link modelViewProjectionMatrix | model view projection matrix}
     * @param value - new {@link modelViewProjectionMatrix | model view projection matrix}s
     */
    set modelViewProjectionMatrix(value) {
      this.matrices.modelViewProjection.matrix = value;
      this.matrices.modelViewProjection.shouldUpdate = true;
    }
    /**
     * Get our {@link normalMatrix | normal matrix}
     */
    get normalMatrix() {
      return this.matrices.normal.matrix;
    }
    /**
     * Set our {@link normalMatrix | normal matrix}
     * @param value - new {@link normalMatrix | normal matrix}
     */
    set normalMatrix(value) {
      this.matrices.normal.matrix = value;
      this.matrices.normal.shouldUpdate = true;
    }
    /**
     * Set our projection matrices shouldUpdate flags to true (tell them to update)
     */
    shouldUpdateProjectionMatrixStack() {
      this.matrices.modelView.shouldUpdate = true;
      this.matrices.modelViewProjection.shouldUpdate = true;
    }
    /**
     * When the world matrix update, tell our projection matrix to update as well
     */
    shouldUpdateWorldMatrix() {
      super.shouldUpdateWorldMatrix();
      this.shouldUpdateProjectionMatrixStack();
      this.matrices.normal.shouldUpdate = true;
    }
    /**
     * Tell all our matrices to update
     */
    shouldUpdateMatrixStack() {
      this.shouldUpdateModelMatrix();
      this.shouldUpdateProjectionMatrixStack();
    }
  }

  let pipelineId = 0;
  class PipelineEntry {
    /**
     * PipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link PipelineEntry}
     */
    constructor(parameters) {
      this.type = "PipelineEntry";
      this.uuid = generateUUID();
      let { renderer } = parameters;
      const { label, shaders, useAsync, bindGroups, cacheKey } = parameters;
      renderer = isRenderer(renderer, label ? label + " " + this.type : this.type);
      this.renderer = renderer;
      Object.defineProperty(this, "index", { value: pipelineId++ });
      this.layout = null;
      this.pipeline = null;
      this.status = {
        compiling: false,
        compiled: false,
        error: null
      };
      this.options = {
        label,
        shaders,
        useAsync: useAsync !== void 0 ? useAsync : true,
        bindGroups,
        cacheKey
      };
      this.bindGroups = bindGroups;
    }
    /**
     * Set or reset this {@link PipelineEntry} {@link PipelineEntry.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.options.label + " " + this.type);
      this.renderer = renderer;
    }
    /**
     * Get whether the {@link pipeline} is ready, i.e. successfully compiled
     * @readonly
     */
    get ready() {
      return !this.status.compiling && this.status.compiled && !this.status.error;
    }
    /**
     * Get whether the {@link pipeline} is ready to be compiled, i.e. we have not already tried to compile it, and it's not currently compiling neither
     * @readonly
     */
    get canCompile() {
      return !this.status.compiling && !this.status.compiled && !this.status.error;
    }
    /* SHADERS */
    /**
     * Create a {@link GPUShaderModule}
     * @param parameters - Parameters used
     * @param parameters.code - patched WGSL code string
     * @param parameters.type - {@link MaterialShadersType | shader type}
     * @returns - compiled {@link GPUShaderModule} if successful
     */
    createShaderModule({ code = "", type = "vertex" }) {
      const shaderModule = this.renderer.createShaderModule({
        label: this.options.label + ": " + type + " shader module",
        code
      });
      if ("getCompilationInfo" in shaderModule && !this.renderer.production) {
        shaderModule.getCompilationInfo().then((compilationInfo) => {
          for (const message of compilationInfo.messages) {
            let formattedMessage = "";
            if (message.lineNum) {
              formattedMessage += `Line ${message.lineNum}:${message.linePos} - ${code.substring(
              message.offset,
              message.offset + message.length
            )}
`;
            }
            formattedMessage += message.message;
            switch (message.type) {
              case "error":
                console.error(`${this.options.label} compilation error:
${formattedMessage}`);
                break;
              case "warning":
                console.warn(`${this.options.label} compilation warning:
${formattedMessage}`);
                break;
              case "info":
                console.log(`${this.options.label} compilation information:
${formattedMessage}`);
                break;
            }
          }
        });
      }
      return shaderModule;
    }
    /* SETUP */
    /**
     * Create the {@link PipelineEntry} shaders
     */
    createShaders() {
    }
    /**
     * Create the pipeline entry {@link layout}
     */
    createPipelineLayout() {
      this.layout = this.renderer.createPipelineLayout({
        label: this.options.label + " layout",
        bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout)
      });
    }
    /**
     * Create the {@link PipelineEntry} descriptor.
     */
    createPipelineDescriptor() {
    }
    /**
     * Flush a {@link PipelineEntry}, i.e. reset its {@link bindGroups | bind groups}, {@link layout} and descriptor and recompile the {@link pipeline}.
     * Used when one of the bind group or rendering property has changed.
     * @param newBindGroups - new {@link bindGroups | bind groups} in case they have changed.
     * @param cacheKey - new {@link core/materials/Material.Material#cacheKey | Material cacheKey} in case it has changed.
     */
    flushPipelineEntry(newBindGroups = [], cacheKey = "") {
      this.options.bindGroups = newBindGroups;
      this.options.cacheKey = cacheKey;
      this.status.compiling = false;
      this.status.compiled = false;
      this.status.error = null;
      this.bindGroups = newBindGroups;
      this.compilePipelineEntry();
    }
    /**
     * Set up a {@link pipeline} by creating the shaders, the {@link layout} and the descriptor
     */
    compilePipelineEntry() {
      this.status.compiling = true;
      this.createShaders();
      this.createPipelineLayout();
      this.createPipelineDescriptor();
    }
  }

  const getPositionHelpers = (
    /* wgsl */
    `
fn getWorldPosition(position: vec3f) -> vec4f {
  return matrices.model * vec4f(position, 1.0);
}

fn getOutputPosition(position: vec3f) -> vec4f {
  return camera.projection * camera.view * matrices.model * vec4f(position, 1.0);
}`
  );

  const getNormalHelpers = (
    /* wgsl */
    `
fn getWorldNormal(normal: vec3f) -> vec3f {
  return normalize(matrices.normal * normal);
}

fn getViewNormal(normal: vec3f) -> vec3f {
  return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
}`
  );

  const getUVCover = (
    /* wgsl */
    `
fn getUVCover(uv: vec2f, textureMatrix: mat3x3f) -> vec2f {
  return (textureMatrix * vec3f(uv, 1.0)).xy;
}`
  );

  const getVertexToUVCoords = (
    /* wgsl */
    `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
}
`
  );

  const shaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
      getUVCover
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {
      /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
      getUVCover,
      /** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
      getVertexToUVCoords
    }
  };
  const ProjectedShaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Get output `position` (`vec4f`) vector by applying model view projection matrix to the attribute `position` (`vec3f`) vector. */
      getPositionHelpers,
      /** Get `normal` (`vec3f`) in world or view space. */
      getNormalHelpers
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {}
  };

  class RenderPipelineEntry extends PipelineEntry {
    /**
     * RenderPipelineEntry constructor
     * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters) {
      let { renderer, ...pipelineParams } = parameters;
      const { label, attributes, bindGroups, cacheKey, ...renderingOptions } = pipelineParams;
      const type = "RenderPipelineEntry";
      isRenderer(renderer, label ? label + " " + type : type);
      super(parameters);
      this.type = type;
      this.shaders = {
        vertex: {
          head: "",
          code: "",
          module: null,
          constants: /* @__PURE__ */ new Map()
        },
        fragment: {
          head: "",
          code: "",
          module: null,
          constants: /* @__PURE__ */ new Map()
        },
        full: {
          head: "",
          code: "",
          module: null,
          constants: /* @__PURE__ */ new Map()
        }
      };
      this.descriptor = null;
      this.options = {
        ...this.options,
        attributes,
        ...renderingOptions
      };
      this.attributes = attributes;
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders() {
      this.shaders.vertex.head = "";
      this.shaders.vertex.code = "";
      this.shaders.fragment.head = "";
      this.shaders.fragment.code = "";
      this.shaders.full.head = "";
      this.shaders.full.code = "";
      for (const chunk in shaderChunks.vertex) {
        this.shaders.vertex.head = `${shaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
        this.shaders.full.head = `${shaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
      }
      if (this.options.shaders.fragment) {
        for (const chunk in shaderChunks.fragment) {
          this.shaders.fragment.head = `${shaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
          if (this.shaders.full.head.indexOf(shaderChunks.fragment[chunk]) === -1) {
            this.shaders.full.head = `${shaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
          }
        }
        if (this.options.shaders.fragment.constants) {
          for (const [key, value] of Object.entries(this.options.shaders.fragment.constants)) {
            this.shaders.fragment.constants.set(key, value);
          }
        }
      }
      if (this.options.rendering.useProjection) {
        for (const chunk in ProjectedShaderChunks.vertex) {
          this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
          this.shaders.full.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
        }
        if (this.options.shaders.fragment) {
          for (const chunk in ProjectedShaderChunks.fragment) {
            this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
            if (this.shaders.full.head.indexOf(ProjectedShaderChunks.fragment[chunk]) === -1) {
              this.shaders.full.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
            }
          }
        }
      }
      if (this.options.shaders.vertex.constants) {
        for (const [key, value] of Object.entries(this.options.shaders.vertex.constants)) {
          this.shaders.vertex.constants.set(key, value);
        }
      }
      this.shaders.vertex.constants.forEach((value, key) => this.shaders.full.constants.set(key, value));
      this.shaders.fragment.constants.forEach((value, key) => this.shaders.full.constants.set(key, value));
      this.shaders.vertex.constants.forEach((value, key) => {
        const type = typeof value === "boolean" ? "bool" : "f32";
        this.shaders.vertex.head += `override ${key}: ${type} = ${value};
`;
      });
      this.shaders.fragment.constants.forEach((value, key) => {
        const type = typeof value === "boolean" ? "bool" : "f32";
        this.shaders.fragment.head += `override ${key}: ${type} = ${value};
`;
      });
      this.shaders.full.constants.forEach((value, key) => {
        const type = typeof value === "boolean" ? "bool" : "f32";
        this.shaders.full.head += `override ${key}: ${type};
`;
      });
      const groupsBindings = [];
      for (const bindGroup of this.bindGroups) {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              visibility: binding.options.visibility,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      }
      for (const groupBinding of groupsBindings) {
        if (groupBinding.visibility.includes("vertex")) {
          if (groupBinding.wgslStructFragment && this.shaders.vertex.head.indexOf(groupBinding.wgslStructFragment) === -1) {
            this.shaders.vertex.head = `
${groupBinding.wgslStructFragment}
${this.shaders.vertex.head}`;
          }
          if (this.shaders.vertex.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
            this.shaders.vertex.head = `${this.shaders.vertex.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
            if (groupBinding.newLine) this.shaders.vertex.head += `
`;
          }
        }
        if (this.options.shaders.fragment && groupBinding.visibility.includes("fragment")) {
          if (groupBinding.wgslStructFragment && this.shaders.fragment.head.indexOf(groupBinding.wgslStructFragment) === -1) {
            this.shaders.fragment.head = `
${groupBinding.wgslStructFragment}
${this.shaders.fragment.head}`;
          }
          if (this.shaders.fragment.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
            this.shaders.fragment.head = `${this.shaders.fragment.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
            if (groupBinding.newLine) this.shaders.fragment.head += `
`;
          }
        }
        if (groupBinding.wgslStructFragment && this.shaders.full.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.full.head = `
${groupBinding.wgslStructFragment}
${this.shaders.full.head}`;
        }
        if (this.shaders.full.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.full.head = `${this.shaders.full.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine) this.shaders.full.head += `
`;
        }
      }
      this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
      this.shaders.full.head = `${this.attributes.wgslStructFragment}
${this.shaders.full.head}`;
      this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
      if (this.options.shaders.fragment)
        this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
      if (this.options.shaders.fragment) {
        if (this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0) {
          this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code;
        } else {
          this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code + this.options.shaders.fragment.code;
        }
      }
    }
    /* SETUP */
    /**
     * Get whether the shaders modules have been created
     * @readonly
     */
    get shadersModulesReady() {
      return !(!this.shaders.vertex.module || this.options.shaders.fragment && !this.shaders.fragment.module);
    }
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      const isSameShader = typeof this.options.shaders.fragment === "object" && this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0;
      this.shaders.vertex.module = this.createShaderModule({
        code: this.shaders[isSameShader ? "full" : "vertex"].code,
        type: "vertex"
      });
      if (this.options.shaders.fragment) {
        this.shaders.fragment.module = this.createShaderModule({
          code: this.shaders[isSameShader ? "full" : "fragment"].code,
          type: "fragment"
        });
      }
    }
    /**
     * Get default transparency blend state.
     * @returns - The default transparency blend state.
     */
    static getDefaultTransparentBlending() {
      return {
        color: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha"
        },
        alpha: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        }
      };
    }
    /**
     * Create the render pipeline {@link descriptor}.
     */
    createPipelineDescriptor() {
      if (!this.shadersModulesReady) return;
      let vertexLocationIndex = -1;
      if (this.options.rendering.targets.length) {
        if (this.options.rendering.transparent) {
          this.options.rendering.targets[0].blend = this.options.rendering.targets[0].blend ? this.options.rendering.targets[0].blend : RenderPipelineEntry.getDefaultTransparentBlending();
        }
      } else {
        this.options.rendering.targets = [];
      }
      this.descriptor = {
        label: this.options.label,
        layout: this.layout,
        vertex: {
          module: this.shaders.vertex.module,
          entryPoint: this.options.shaders.vertex.entryPoint,
          buffers: this.attributes.vertexBuffers.map((vertexBuffer) => {
            return {
              stepMode: vertexBuffer.stepMode,
              arrayStride: vertexBuffer.arrayStride * 4,
              // 4 bytes each
              attributes: vertexBuffer.attributes.map((attribute) => {
                vertexLocationIndex++;
                return {
                  shaderLocation: vertexLocationIndex,
                  offset: attribute.bufferOffset,
                  // previous attribute size * 4
                  format: attribute.bufferFormat
                };
              })
            };
          }),
          ...this.options.shaders.vertex.constants && { constants: this.options.shaders.vertex.constants }
        },
        ...this.options.shaders.fragment && {
          fragment: {
            module: this.shaders.fragment.module,
            entryPoint: this.options.shaders.fragment.entryPoint,
            targets: this.options.rendering.targets,
            ...this.options.shaders.fragment.constants && { constants: this.options.shaders.fragment.constants }
          }
        },
        primitive: {
          topology: this.options.rendering.topology,
          frontFace: this.options.rendering.verticesOrder,
          cullMode: this.options.rendering.cullMode,
          unclippedDepth: this.options.rendering.unclippedDepth,
          ...this.options.rendering.stripIndexFormat && {
            stripIndexFormat: this.options.rendering.stripIndexFormat
          }
        },
        ...this.options.rendering.depth && {
          depthStencil: {
            depthBias: this.options.rendering.depthBias,
            depthBiasClamp: this.options.rendering.depthBiasClamp,
            depthBiasSlopeScale: this.options.rendering.depthBiasSlopeScale,
            depthWriteEnabled: this.options.rendering.depthWriteEnabled,
            depthCompare: this.options.rendering.depthCompare,
            format: this.options.rendering.depthFormat,
            ...this.options.rendering.stencil && {
              stencilFront: this.options.rendering.stencil.front,
              stencilBack: this.options.rendering.stencil.back,
              stencilReadMask: this.options.rendering.stencil.stencilReadMask,
              stencilWriteMask: this.options.rendering.stencil.stencilWriteMask
            }
          }
        },
        multisample: {
          count: this.options.rendering.sampleCount,
          alphaToCoverageEnabled: this.options.rendering.alphaToCoverageEnabled,
          mask: this.options.rendering.mask
        }
      };
    }
    /**
     * Create the render {@link pipeline}
     */
    createRenderPipeline() {
      if (!this.shadersModulesReady) return;
      try {
        this.pipeline = this.renderer.createRenderPipeline(this.descriptor);
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Asynchronously create the render {@link pipeline}
     * @returns - void promise result
     */
    async createRenderPipelineAsync() {
      if (!this.shadersModulesReady) return;
      try {
        this.pipeline = await this.renderer.createRenderPipelineAsync(this.descriptor);
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
     */
    async compilePipelineEntry() {
      super.compilePipelineEntry();
      if (this.options.useAsync) {
        await this.createRenderPipelineAsync();
      } else {
        this.createRenderPipeline();
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      }
    }
  }

  const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
    const renderingOptions = [
      "useProjection",
      "transparent",
      "depth",
      "depthWriteEnabled",
      "depthCompare",
      "depthFormat",
      "cullMode",
      "sampleCount",
      "targets",
      "stencil",
      "verticesOrder",
      "topology"
    ];
    return renderingOptions.map((key) => {
      if (newOptions[key] !== void 0 && baseOptions[key] === void 0 || baseOptions[key] !== void 0 && newOptions[key] === void 0) {
        return key;
      } else if (Array.isArray(newOptions[key]) || typeof newOptions[key] === "object") {
        return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]) ? key : false;
      } else {
        return newOptions[key] !== baseOptions[key] ? key : false;
      }
    }).filter(Boolean);
  };

  const getDefaultProjectedVertexShaderCode = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
  @location(2) worldPosition: vec3f,
  @location(3) viewDirection: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = getOutputPosition(attributes.position);
  vsOutput.uv = attributes.uv;
  vsOutput.normal = getWorldNormal(attributes.normal);
  let worldPosition: vec4f = getWorldPosition(attributes.position);
  vsOutput.worldPosition = worldPosition.xyz / worldPosition.w;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
  
  return vsOutput;
}`
  );

  const getDefaultVertexShaderCode = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = vec4f(attributes.position, 1.0);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`
  );

  const getDefaultFragmentCode = (
    /* wgsl */
    `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`
  );

  class RenderMaterial extends Material {
    /**
     * RenderMaterial constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link RenderMaterial}.
     * @param parameters - {@link RenderMaterialParams} used to create our {@link RenderMaterial}.
     */
    constructor(renderer, parameters) {
      const type = "RenderMaterial";
      renderer = isRenderer(renderer, type);
      if (!parameters.shaders) {
        parameters.shaders = {};
      }
      if (!parameters.shaders?.vertex) {
        parameters.shaders.vertex = {
          code: parameters.useProjection ? getDefaultProjectedVertexShaderCode : getDefaultVertexShaderCode,
          entryPoint: "main"
        };
      }
      if (!parameters.shaders.vertex.entryPoint) {
        parameters.shaders.vertex.entryPoint = "main";
      }
      if (parameters.shaders.fragment === void 0) {
        parameters.shaders.fragment = {
          entryPoint: "main",
          code: getDefaultFragmentCode
        };
      }
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      const { shaders } = parameters;
      const {
        useProjection,
        transparent,
        // depth stencil
        depth,
        depthWriteEnabled,
        depthCompare,
        depthFormat,
        depthBias,
        depthBiasClamp,
        depthBiasSlopeScale,
        stencil,
        // multisample
        sampleCount,
        alphaToCoverageEnabled,
        mask,
        // primitive
        cullMode,
        verticesOrder,
        topology,
        unclippedDepth
      } = parameters;
      let { targets } = parameters;
      if (targets === void 0) {
        targets = [
          {
            format: this.renderer.options.context.format
          }
        ];
      }
      if (targets && targets.length && !targets[0].format) {
        targets[0].format = this.renderer.options.context.format;
      }
      if (stencil) {
        if (!stencil.front) {
          stencil.front = {};
        }
        if (stencil.front && !stencil.back) {
          stencil.back = stencil.front;
        }
        if (!stencil.stencilReference) {
          stencil.stencilReference = 0;
        }
        if (!stencil.stencilReadMask) {
          stencil.stencilReadMask = 16777215;
        }
        if (!stencil.stencilWriteMask) {
          stencil.stencilWriteMask = 16777215;
        }
      }
      this.options = {
        ...this.options,
        shaders,
        rendering: {
          useProjection,
          transparent,
          // depth stencil
          depth,
          depthWriteEnabled,
          depthCompare,
          depthFormat,
          depthBias: depthBias !== void 0 ? depthBias : 0,
          depthBiasClamp: depthBiasClamp !== void 0 ? depthBiasClamp : 0,
          depthBiasSlopeScale: depthBiasSlopeScale !== void 0 ? depthBiasSlopeScale : 0,
          ...stencil && { stencil },
          // multisample
          sampleCount,
          alphaToCoverageEnabled: !!alphaToCoverageEnabled,
          mask: mask !== void 0 ? mask : 16777215,
          // targets
          targets,
          // primitive
          cullMode,
          verticesOrder,
          topology,
          unclippedDepth: !!unclippedDepth
        }
      };
      this.attributes = null;
      this.pipelineEntry = null;
    }
    /**
     * Set or reset this {@link RenderMaterial} {@link RenderMaterial.renderer | renderer}. Will also update the renderer camera bind group if needed.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.useCameraBindGroup && this.renderer) {
        this.renderer.cameraLightsBindGroup.consumers.delete(this.uuid);
      }
      super.setRenderer(renderer);
      if (this.useCameraBindGroup) {
        this.bindGroups[0] = this.renderer.cameraLightsBindGroup;
        this.renderer.cameraLightsBindGroup.consumers.add(this.uuid);
      }
    }
    /**
     * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
     */
    setPipelineEntry() {
      this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline(this);
    }
    /**
     * Compile the {@link RenderPipelineEntry}.
     */
    async compilePipelineEntry() {
      await this.pipelineEntry.compilePipelineEntry();
    }
    /**
     * Check if attributes and all bind groups are ready, create them if needed, set {@link RenderPipelineEntry} bind group buffers and compile the pipeline.
     */
    async compileMaterial() {
      if (this.ready) return;
      await super.compileMaterial();
      if (this.attributes && !this.pipelineEntry) {
        this.setPipelineEntry();
      }
      if (this.pipelineEntry && this.pipelineEntry.canCompile) {
        await this.compilePipelineEntry();
      }
    }
    /**
     * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
     * @param renderingOptions - New {@link RenderMaterialRenderingOptions | rendering options} properties to be set.
     */
    setRenderingOptions(renderingOptions = {}) {
      if (renderingOptions.transparent && renderingOptions.targets.length && !renderingOptions.targets[0].blend) {
        renderingOptions.targets[0].blend = RenderPipelineEntry.getDefaultTransparentBlending();
      }
      const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering);
      const oldRenderingOptions = { ...this.options.rendering };
      this.options.rendering = { ...this.options.rendering, ...renderingOptions };
      if (this.pipelineEntry) {
        if (this.pipelineEntry.ready && newProperties.length) {
          if (!this.renderer.production) {
            const oldProps = newProperties.map((key) => {
              return {
                [key]: Array.isArray(oldRenderingOptions[key]) ? oldRenderingOptions[key].map((optKey) => optKey) : oldRenderingOptions[key]
              };
            });
            const newProps = newProperties.map((key) => {
              return {
                [key]: Array.isArray(renderingOptions[key]) ? renderingOptions[key].map((optKey) => optKey) : renderingOptions[key]
              };
            });
            throwWarning(
              `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be recompiled. This should be avoided.

Old rendering options: ${JSON.stringify(
              oldProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}

--------

New rendering options: ${JSON.stringify(
              newProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}`
            );
          }
          this.setPipelineEntry();
        } else {
          this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering };
        }
      }
    }
    /* ATTRIBUTES */
    /**
     * Get all useful {@link core/geometries/Geometry.Geometry | Geometry} properties needed to create attributes buffers.
     * @param geometry - The geometry to draw.
     */
    setAttributesFromGeometry(geometry) {
      this.attributes = {
        wgslStructFragment: geometry.wgslStructFragment,
        vertexBuffers: geometry.vertexBuffers,
        layoutCacheKey: geometry.layoutCacheKey
      };
      if ("indexBuffer" in geometry && geometry.indexBuffer && geometry.topology.includes("strip")) {
        this.setRenderingOptions({
          ...this.options.rendering,
          stripIndexFormat: geometry.indexBuffer.bufferFormat
        });
      }
    }
    /**
     * Get the {@link RenderMaterial} pipeline buffers cache key based on its {@link core/bindGroups/BindGroup.BindGroup | BindGroup} cache keys and eventually {@link attributes} cache keys.
     * @returns - Current cache key.
     * @readonly
     */
    get cacheKey() {
      let cacheKey = this.attributes?.layoutCacheKey || "";
      return cacheKey + super.cacheKey;
    }
    /* BIND GROUPS */
    /**
     * Get whether this {@link RenderMaterial} uses the renderer camera and lights bind group.
     * @readonly
     * */
    get useCameraBindGroup() {
      return "cameraLightsBindGroup" in this.renderer && this.options.rendering.useProjection;
    }
    /**
     * Create the bind groups if they need to be created, but first add camera and lights bind group if needed.
     */
    createBindGroups() {
      if (this.useCameraBindGroup) {
        this.bindGroups.push(this.renderer.cameraLightsBindGroup);
        this.renderer.cameraLightsBindGroup.consumers.add(this.uuid);
      }
      super.createBindGroups();
    }
    /**
     * Update all bind groups, except for the camera and light bind groups if present, as it is already updated by the renderer itself.
     */
    updateBindGroups() {
      const startBindGroupIndex = this.useCameraBindGroup ? 1 : 0;
      if (this.useCameraBindGroup && this.bindGroups.length) {
        if (this.bindGroups[0].needsPipelineFlush && this.pipelineEntry.ready) {
          this.pipelineEntry.flushPipelineEntry(this.bindGroups);
        }
      }
      for (let i = startBindGroupIndex; i < this.bindGroups.length; i++) {
        this.updateBindGroup(this.bindGroups[i]);
      }
    }
    /**
     * Render the material if it is ready. Call super, and the set the pass encoder stencil reference if needed.
     * @param pass - Current pass encoder.
     */
    render(pass) {
      if (!this.ready) return;
      super.render(pass);
      if (this.options.rendering.stencil) {
        pass.setStencilReference(this.options.rendering.stencil.stencilReference ?? 0);
      }
    }
  }

  var __typeError$k = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$k = (obj, member, msg) => member.has(obj) || __typeError$k("Cannot " + msg);
  var __privateGet$i = (obj, member, getter) => (__accessCheck$k(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$k = (obj, member, value) => member.has(obj) ? __typeError$k("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$i = (obj, member, value, setter) => (__accessCheck$k(obj, member, "write to private field"), member.set(obj, value), value);
  let meshIndex = 0;
  const defaultMeshBaseParams = {
    // material
    autoRender: true,
    useProjection: false,
    useAsyncPipeline: true,
    // rendering
    cullMode: "back",
    depth: true,
    depthWriteEnabled: true,
    depthCompare: "less",
    depthFormat: "depth24plus",
    transparent: false,
    visible: true,
    renderOrder: 0,
    // textures
    texturesOptions: {},
    renderBundle: null
  };
  function MeshBaseMixin(Base) {
    var _autoRender, _a;
    return _a = class extends Base {
      /**
       * MeshBase constructor
       *
       * @typedef MeshBaseArrayParams
       * @type {array}
       * @property {(Renderer|GPUCurtains)} 0 - our {@link Renderer} class object
       * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
       * @property {MeshBaseParams} 2 - {@link MeshBaseParams | Mesh base parameters}
       *
       * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
       */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultMeshBaseParams, ...params[2] }
        );
        /** Whether we should add this {@link MeshBase} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
        __privateAdd$k(this, _autoRender, true);
        // callbacks / events
        /** function assigned to the {@link onReady} callback */
        this._onReadyCallback = () => {
        };
        /** function assigned to the {@link onBeforeRender} callback */
        this._onBeforeRenderCallback = () => {
        };
        /** function assigned to the {@link onRender} callback */
        this._onRenderCallback = () => {
        };
        /** function assigned to the {@link onAfterRender} callback */
        this._onAfterRenderCallback = () => {
        };
        /** function assigned to the {@link onAfterResize} callback */
        this._onAfterResizeCallback = () => {
        };
        let renderer = params[0];
        const parameters = { ...defaultMeshBaseParams, ...params[2] };
        this.type = "MeshBase";
        this.uuid = generateUUID();
        Object.defineProperty(this, "index", { value: meshIndex++ });
        renderer = isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const {
          label,
          shaders,
          geometry,
          visible,
          renderOrder,
          outputTarget,
          additionalOutputTargets,
          useCustomScenePassEntry,
          renderBundle,
          texturesOptions,
          autoRender,
          ...meshParameters
        } = parameters;
        this.outputTarget = outputTarget ?? null;
        this.renderBundle = renderBundle ?? null;
        this.additionalOutputTargets = additionalOutputTargets || [];
        meshParameters.sampleCount = !!meshParameters.sampleCount ? meshParameters.sampleCount : this.outputTarget ? this.outputTarget.renderPass.options.sampleCount : this.renderer && this.renderer.renderPass ? this.renderer.renderPass.options.sampleCount : 1;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          label: label ?? "Mesh " + this.renderer.meshes.length,
          ...shaders !== void 0 ? { shaders } : {},
          ...outputTarget !== void 0 && { outputTarget },
          ...renderBundle !== void 0 && { renderBundle },
          texturesOptions,
          ...autoRender !== void 0 && { autoRender },
          useCustomScenePassEntry,
          ...meshParameters
        };
        if (autoRender !== void 0) {
          __privateSet$i(this, _autoRender, autoRender);
        }
        this.visible = visible;
        this.renderOrder = renderOrder;
        this.ready = false;
        this.userData = {};
        if (geometry) {
          this.useGeometry(geometry);
        }
        this.setMaterial({
          ...this.cleanupRenderMaterialParameters({ ...this.options }),
          ...geometry && { verticesOrder: geometry.verticesOrder, topology: geometry.topology }
        });
        this.addToScene(true);
      }
      /**
       * Get private #autoRender value
       * @readonly
       */
      get autoRender() {
        return __privateGet$i(this, _autoRender);
      }
      /**
       * Get/set whether a Mesh is ready or not
       * @readonly
       */
      get ready() {
        return this._ready;
      }
      set ready(value) {
        if (value && !this._ready) {
          this._onReadyCallback && this._onReadyCallback();
        }
        this._ready = value;
      }
      /* SCENE */
      /**
       * Add a Mesh to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer. Can patch the {@link RenderMaterial} render options to match the {@link RenderPass} used to draw this Mesh.
       * @param addToRenderer - whether to add this Mesh to the {@link Renderer#meshes | Renderer meshes array}
       */
      addToScene(addToRenderer = false) {
        if (addToRenderer) {
          this.renderer.meshes.push(this);
        }
        this.setRenderingOptionsForRenderPass(this.outputTarget ? this.outputTarget.renderPass : this.renderer.renderPass);
        if (__privateGet$i(this, _autoRender)) {
          this.renderer.scene.addMesh(this);
          if (this.additionalOutputTargets.length) {
            this.additionalOutputTargets.forEach((renderTarget) => {
              this.renderer.scene.addMeshToRenderTargetStack(this, renderTarget);
            });
          }
        }
      }
      /**
       * Remove a Mesh from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
       * @param removeFromRenderer - whether to remove this Mesh from the {@link Renderer#meshes | Renderer meshes array}
       */
      removeFromScene(removeFromRenderer = false) {
        if (__privateGet$i(this, _autoRender)) {
          this.renderer.scene.removeMesh(this);
        }
        if (removeFromRenderer) {
          this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
        }
      }
      /**
       * Set a new {@link Renderer} for this Mesh
       * @param renderer - new {@link Renderer} to set
       */
      setRenderer(renderer) {
        renderer = renderer && renderer.renderer || renderer;
        if (!renderer || !(renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer")) {
          throwWarning(
            `${this.options.label}: Cannot set ${renderer} as a renderer because it is not of a valid Renderer type.`
          );
          return;
        }
        this.material?.setRenderer(renderer);
        const oldRenderer = this.renderer;
        this.removeFromScene(true);
        this.renderer = renderer;
        this.addToScene(true);
        if (!oldRenderer.meshes.length) {
          oldRenderer.onBeforeRenderScene.add(
            (commandEncoder) => {
              oldRenderer.forceClear(commandEncoder);
            },
            { once: true }
          );
        }
      }
      /**
       * Assign or remove a {@link RenderTarget} to this Mesh.
       * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a {@link RenderTarget} as well.
       * @param outputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}.
       */
      setOutputTarget(outputTarget) {
        if (outputTarget && outputTarget.type !== "RenderTarget") {
          throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget.type}`);
          return;
        }
        this.removeFromScene();
        this.outputTarget = outputTarget;
        this.addToScene();
      }
      /**
       * Assign or remove a {@link RenderBundle} to this Mesh.
       * @param renderBundle - the {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
       * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
       */
      setRenderBundle(renderBundle, updateScene = true) {
        if (updateScene) {
          this.removeFromScene();
          this.renderBundle = renderBundle;
          this.addToScene();
        } else {
          this.renderBundle = renderBundle;
        }
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
       * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
       */
      loseContext() {
        this.ready = false;
        this.geometry.loseContext();
        this.material.loseContext();
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
       */
      restoreContext() {
        this.geometry.restoreContext(this.renderer);
        this.material.restoreContext();
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing
       */
      setShaders() {
        const { shaders } = this.options;
        if (!shaders) {
          this.options.shaders = {
            vertex: {
              code: getDefaultVertexShaderCode,
              entryPoint: "main"
            },
            fragment: {
              code: getDefaultFragmentCode,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: getDefaultVertexShaderCode,
              entryPoint: "main"
            };
          }
          if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
            shaders.fragment = {
              code: getDefaultFragmentCode,
              entryPoint: "main"
            };
          }
        }
      }
      /* GEOMETRY */
      /**
       * Set or update the Mesh {@link Geometry}
       * @param geometry - new {@link Geometry} to use
       */
      useGeometry(geometry) {
        if (this.geometry) {
          if (geometry.shouldCompute) {
            geometry.computeGeometry();
          }
          if (this.geometry.layoutCacheKey !== geometry.layoutCacheKey) {
            throwWarning(
              `${this.options.label} (${this.type}): the current and new geometries do not have the same vertexBuffers layout, causing a probable pipeline recompilation. This should be avoided.

Current geometry layout:

${this.geometry.wgslStructFragment}

--------

New geometry layout:

${geometry.wgslStructFragment}`
            );
            this.material.setAttributesFromGeometry(geometry);
            this.material.setPipelineEntry();
          }
          this.geometry.consumers.delete(this.uuid);
          if (this.options.renderBundle) {
            this.options.renderBundle.ready = false;
          }
        }
        this.geometry = geometry;
        this.geometry.consumers.add(this.uuid);
        this.computeGeometry();
        if (this.material) {
          const renderingOptions = {
            ...this.material.options.rendering,
            ...{ verticesOrder: geometry.verticesOrder, topology: geometry.topology }
          };
          this.material.setRenderingOptions(renderingOptions);
        }
      }
      /**
       * Compute the Mesh geometry if needed
       */
      computeGeometry() {
        if (this.geometry.shouldCompute) {
          this.geometry.computeGeometry();
        }
      }
      /**
       * Set our Mesh geometry: create buffers and add attributes to material
       */
      setGeometry() {
        if (this.geometry) {
          if (!this.geometry.ready) {
            this.geometry.createBuffers({
              renderer: this.renderer,
              label: this.options.label + " geometry"
            });
          }
          this.setMaterialGeometryAttributes();
        }
      }
      /* MATERIAL */
      /**
       * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
       * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
       */
      setRenderingOptionsForRenderPass(renderPass) {
        const renderingOptions = {
          // transparency (blend)
          transparent: this.transparent,
          // sample count
          sampleCount: renderPass.options.sampleCount,
          // color attachments
          ...renderPass.options.colorAttachments.length && {
            targets: renderPass.options.colorAttachments.map((colorAttachment, index) => {
              return {
                // patch format...
                format: colorAttachment.targetFormat,
                // ...but keep original blend values if any
                ...this.options.targets?.length && this.options.targets[index] && this.options.targets[index].blend && {
                  blend: this.options.targets[index].blend
                }
              };
            })
          },
          // depth
          depth: renderPass.options.useDepth,
          ...renderPass.options.useDepth && {
            depthFormat: renderPass.options.depthFormat
          }
        };
        this.material?.setRenderingOptions({ ...this.material.options.rendering, ...renderingOptions });
      }
      /**
       * Hook used to clean up parameters before sending them to the {@link RenderMaterial}.
       * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
       * @returns - cleaned parameters
       */
      cleanupRenderMaterialParameters(parameters) {
        delete parameters.additionalOutputTargets;
        delete parameters.autoRender;
        delete parameters.outputTarget;
        delete parameters.renderBundle;
        delete parameters.texturesOptions;
        delete parameters.useCustomScenePassEntry;
        return parameters;
      }
      /**
       * Set or update the Mesh {@link RenderMaterial}
       * @param material - new {@link RenderMaterial} to use
       */
      useMaterial(material) {
        let currentCacheKey = null;
        if (this.material) {
          if (this.geometry) {
            currentCacheKey = this.material.cacheKey;
          }
          if (this.options.renderBundle) {
            this.options.renderBundle.ready = false;
          }
        }
        this.material = material;
        if (this.geometry) {
          this.material.setAttributesFromGeometry(this.geometry);
        }
        this.transparent = this.material.options.rendering.transparent;
        if (currentCacheKey && currentCacheKey !== this.material.cacheKey) {
          if (this.material.ready) {
            this.material.setPipelineEntry();
          } else {
            this.material.compileMaterial();
          }
        }
      }
      /**
       * Patch the shaders if needed, then set the Mesh material
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        this.setShaders();
        meshParameters.shaders = this.options.shaders;
        meshParameters.label = meshParameters.label + " material";
        this.useMaterial(new RenderMaterial(this.renderer, meshParameters));
      }
      /**
       * Set Mesh material attributes
       */
      setMaterialGeometryAttributes() {
        if (this.material && !this.material.attributes) {
          this.material.setAttributesFromGeometry(this.geometry);
        }
      }
      /**
       * Get the transparent property value
       */
      get transparent() {
        return this._transparent;
      }
      /**
       * Set the transparent property value. Update the {@link RenderMaterial} rendering options and {@link core/scenes/Scene.Scene | Scene} stack if needed.
       * @param value
       */
      set transparent(value) {
        const switchTransparency = this.transparent !== void 0 && value !== this.transparent;
        if (switchTransparency) {
          this.removeFromScene();
        }
        this._transparent = value;
        if (switchTransparency) {
          this.addToScene();
        }
      }
      /**
       * Get the visible property value
       */
      get visible() {
        return this._visible;
      }
      /**
       * Set the visible property value
       * @param value - new visibility value
       */
      set visible(value) {
        this._visible = value;
      }
      /* TEXTURES */
      /**
       * Get our {@link RenderMaterial#textures | RenderMaterial textures array}.
       * @readonly
       */
      get textures() {
        return this.material?.textures || [];
      }
      /**
       * Create a new {@link MediaTexture}.
       * @param options - {@link MediaTextureParams | MediaTexture parameters}.
       * @returns - newly created {@link MediaTexture}.
       */
      createMediaTexture(options) {
        if (!options.name) {
          options.name = "texture" + this.textures.length;
        }
        if (!options.label) {
          options.label = this.options.label + " " + options.name;
        }
        const texturesOptions = { ...options, ...this.options.texturesOptions };
        if (this.renderBundle) {
          texturesOptions.useExternalTextures = false;
        }
        const mediaTexture = new MediaTexture(this.renderer, texturesOptions);
        this.addTexture(mediaTexture);
        return mediaTexture;
      }
      /**
       * Create a new {@link Texture}
       * @param  options - {@link TextureParams | Texture parameters}
       * @returns - newly created {@link Texture}
       */
      createTexture(options) {
        if (!options.name) {
          options.name = "texture" + this.textures.length;
        }
        const texture = new Texture(this.renderer, options);
        this.addTexture(texture);
        return texture;
      }
      /**
       * Add a {@link Texture} or {@link MediaTexture}.
       * @param texture - {@link Texture} or {@link MediaTexture} to add.
       */
      addTexture(texture) {
        if (this.renderBundle) {
          this.renderBundle.ready = false;
        }
        this.material.addTexture(texture);
      }
      /* BINDINGS */
      /**
       * Get the current {@link RenderMaterial} uniforms
       * @readonly
       */
      get uniforms() {
        return this.material?.uniforms;
      }
      /**
       * Get the current {@link RenderMaterial} storages
       * @readonly
       */
      get storages() {
        return this.material?.storages;
      }
      /* RESIZE */
      /**
       * Resize the Mesh.
       * @param boundingRect - optional new {@link DOMElementBoundingRect} to use.
       */
      resize(boundingRect) {
        if (super.resize) {
          super.resize(boundingRect);
        }
        this.resizeTextures();
        this._onAfterResizeCallback && this._onAfterResizeCallback();
      }
      /**
       * Resize the {@link textures}.
       */
      resizeTextures() {
        this.textures?.forEach((texture) => {
          if (texture.options.fromTexture) {
            texture.copy(texture.options.fromTexture);
          }
        });
      }
      /* EVENTS */
      /**
       * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
       * @param callback - Callback to run when {@link MeshBase} is ready.
       * @returns - Our Mesh.
       */
      onReady(callback) {
        if (callback) {
          this._onReadyCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
       * @param callback - Callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
       * @returns - Our Mesh
       */
      onBeforeRender(callback) {
        if (callback) {
          this._onBeforeRenderCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
       * @param callback - Callback to run just before rendering the {@link MeshBase}.
       * @returns - Our Mesh.
       */
      onRender(callback) {
        if (callback) {
          this._onRenderCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
       * @param callback - Callback to run just after {@link MeshBase} has been rendered.
       * @returns - Our Mesh.
       */
      onAfterRender(callback) {
        if (callback) {
          this._onAfterRenderCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute just after a Mesh has been resized.
       * @param callback - Callback to run just after {@link MeshBase} has been resized.
       * @returns - Our Mesh.
       */
      onAfterResize(callback) {
        if (callback) {
          this._onAfterResizeCallback = callback;
        }
        return this;
      }
      /* RENDER */
      /**
       * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
       */
      onBeforeRenderScene() {
        if (!this.renderer.ready || !this.ready || !this.visible) return;
        this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      }
      /**
       * Called before rendering the Mesh.
       * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial}).
       * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings.
       */
      onBeforeRenderPass() {
        if (!this.renderer.ready) return;
        this.setGeometry();
        if (this.visible && this.ready) {
          this._onRenderCallback && this._onRenderCallback();
        }
        this.material.onBeforeRender();
        this.ready = this.material && this.material.ready && this.geometry && this.geometry.ready;
      }
      /**
       * Render our {@link MeshBase} if the {@link RenderMaterial} is ready.
       * @param pass - Current render pass encoder.
       */
      onRenderPass(pass) {
        if (!this.ready) return;
        this.renderPass(pass);
      }
      /**
       * Render the {@link material} and {@link geometry}.
       * @param pass - Current render pass encoder.
       */
      renderPass(pass) {
        this.material.render(pass);
        this.geometry.render(pass);
      }
      /**
       * Called after having rendered the Mesh.
       */
      onAfterRenderPass() {
        this._onAfterRenderCallback && this._onAfterRenderCallback();
      }
      /**
       * Render our Mesh:
       * - Execute {@link onBeforeRenderPass}.
       * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}.
       * - Execute super render call if it exists.
       * - {@link onRenderPass | render} our {@link material} and {@link geometry}.
       * - Execute {@link onAfterRenderPass}.
       * @param pass - Current render pass encoder.
       */
      render(pass) {
        this.onBeforeRenderPass();
        if (!this.renderer.ready || !this.visible) return;
        !this.renderer.production && pass.pushDebugGroup(this.options.label);
        this.onRenderPass(pass);
        !this.renderer.production && pass.popDebugGroup();
        this.onAfterRenderPass();
      }
      /* DESTROY */
      /**
       * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it.
       */
      remove() {
        this.removeFromScene(true);
        this.destroy();
        if (!this.renderer.meshes.length) {
          this.renderer.onBeforeRenderScene.add(
            (commandEncoder) => {
              this.renderer.forceClear(commandEncoder);
            },
            { once: true }
          );
        }
      }
      /**
       * Destroy the Mesh.
       */
      destroy() {
        if (super.destroy) {
          super.destroy();
        }
        this.material?.destroy();
        this.geometry.consumers.delete(this.uuid);
        if (!this.geometry.consumers.size) {
          this.geometry?.destroy(this.renderer);
        }
      }
    }, _autoRender = new WeakMap(), _a;
  }

  const getDefaultNormalFragmentCode = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  // normals
  return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
}`
  );

  const getPCFDirectionalShadowContribution = (
    /* wgsl */
    `
fn getPCFDirectionalShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[index];
  
  // get shadow coords
  let projectedShadowCoords: vec4f = directionalShadow.projectionMatrix * directionalShadow.viewMatrix * vec4(worldPosition, 1.0);
  var shadowCoords: vec3f = projectedShadowCoords.xyz / projectedShadowCoords.w;
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  return getPCFBaseShadowContribution(
    shadowCoords,
    directionalShadow.pcfSamples,
    directionalShadow.bias,
    directionalShadow.intensity,
    depthTexture
  );
}
`
  );

  const getPCFDirectionalShadows = (renderer) => {
    const directionalLights = renderer.shadowCastingLights.filter(
      (light) => light.type === "directionalLights"
    );
    const minDirectionalLights = Math.max(renderer.lightsBindingParams.directionalLights.max, 1);
    return (
      /* wgsl */
      `
fn getPCFDirectionalShadows(worldPosition: vec3f) -> array<f32, ${minDirectionalLights}> {
  var directionalShadowContribution: array<f32, ${minDirectionalLights}>;
  
  var lightDirection: vec3f;
  
  ${directionalLights.map((light, index) => {
      return `lightDirection = worldPosition - directionalLights.elements[${index}].direction;
      
      ${light.shadow.isActive ? `
      if(directionalShadows.directionalShadowsElements[${index}].isActive > 0) {
        directionalShadowContribution[${index}] = getPCFDirectionalShadowContribution(
          ${index},
          worldPosition,
          directionalShadowDepthTexture${index}
        );
      } else {
        directionalShadowContribution[${index}] = 1.0;
      }
          ` : `directionalShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return directionalShadowContribution;
}
`
    );
  };

  const getPCFPointShadowContribution = (
    /* wgsl */
    `
fn getPCFPointShadowContribution(index: i32, shadowPosition: vec4f, depthCubeTexture: texture_depth_cube) -> f32 {
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[index];

  // Percentage-closer filtering. Sample texels in the region
  // to smooth the result.
  var visibility = 0.0;
  var closestDepth = 0.0;
  let currentDepth: f32 = shadowPosition.w;
  let cameraRange: f32 = pointShadow.cameraFar - pointShadow.cameraNear;
  let normalizedDepth: f32 = (shadowPosition.w - pointShadow.cameraNear) / cameraRange;

  let maxSize: f32 = f32(max(textureDimensions(depthCubeTexture).x, textureDimensions(depthCubeTexture).y));

  let texelSize: vec3f = vec3(1.0 / maxSize);
  let sampleCount: i32 = pointShadow.pcfSamples;
  let maxSamples: f32 = f32(sampleCount) - 1.0;
  
  for (var x = 0; x < sampleCount; x++) {
    for (var y = 0; y < sampleCount; y++) {
      for (var z = 0; z < sampleCount; z++) {
        let offset = texelSize * vec3(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5,
          f32(z) - maxSamples * 0.5
        );

        closestDepth = textureSampleCompareLevel(
          depthCubeTexture,
          depthComparisonSampler,
          shadowPosition.xyz + offset,
          normalizedDepth - pointShadow.bias
        );

        closestDepth *= cameraRange;

        visibility += select(0.0, 1.0, currentDepth <= closestDepth);
      }
    }
  }
  
  visibility /= f32(sampleCount * sampleCount * sampleCount);
  
  visibility = mix(1.0, visibility, saturate(pointShadow.intensity));
  
  return visibility;
}`
  );

  const getPCFPointShadows = (renderer) => {
    const pointLights = renderer.shadowCastingLights.filter((light) => light.type === "pointLights");
    const minPointLights = Math.max(renderer.lightsBindingParams.pointLights.max, 1);
    return (
      /* wgsl */
      `
fn getPCFPointShadows(worldPosition: vec3f) -> array<f32, ${minPointLights}> {
  var pointShadowContribution: array<f32, ${minPointLights}>;
  
  var lightDirection: vec3f;
  var lightDistance: f32;
  var lightColor: vec3f;
  
  ${pointLights.map((light, index) => {
      return `lightDirection = pointLights.elements[${index}].position - worldPosition;
      
      lightDistance = length(lightDirection);
      lightColor = pointLights.elements[${index}].color * rangeAttenuation(pointLights.elements[${index}].range, lightDistance, 2.0);
      
      ${light.shadow.isActive ? `
      if(pointShadows.pointShadowsElements[${index}].isActive > 0 && length(lightColor) > EPSILON) {
        pointShadowContribution[${index}] = getPCFPointShadowContribution(
          ${index},
          vec4(lightDirection, length(lightDirection)),
          pointShadowCubeDepthTexture${index}
        );
      } else {
        pointShadowContribution[${index}] = 1.0;
      }
            ` : `pointShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return pointShadowContribution;
}
`
    );
  };

  const getPCFSpotShadows = (renderer) => {
    const spotLights = renderer.shadowCastingLights.filter((light) => light.type === "spotLights");
    const minSpotLights = Math.max(renderer.lightsBindingParams.spotLights.max, 1);
    return (
      /* wgsl */
      `
fn getPCFSpotShadows(worldPosition: vec3f) -> array<f32, ${minSpotLights}> {
  var spotShadowContribution: array<f32, ${minSpotLights}>;
  
  var lightDirection: vec3f;
  
  ${spotLights.map((light, index) => {
      return `lightDirection = worldPosition - spotLights.elements[${index}].direction;
      
      ${light.shadow.isActive ? `
      if(spotShadows.spotShadowsElements[${index}].isActive > 0) {
        spotShadowContribution[${index}] = getPCFSpotShadowContribution(
          ${index},
          worldPosition,
          spotShadowDepthTexture${index}
        );
      } else {
        spotShadowContribution[${index}] = 1.0;
      }
          ` : `spotShadowContribution[${index}] = 1.0;`}`;
    }).join("\n")}
  
  return spotShadowContribution;
}
`
    );
  };

  const getPCFSpotShadowContribution = (
    /* wgsl */
    `
fn getPCFSpotShadowContribution(index: i32, worldPosition: vec3f, depthTexture: texture_depth_2d) -> f32 {
  let spotShadow: SpotShadowsElement = spotShadows.spotShadowsElements[index];
  
  // get shadow coords
  let projectedShadowCoords: vec4f = spotShadow.projectionMatrix * spotShadow.viewMatrix * vec4(worldPosition, 1.0);
  var shadowCoords: vec3f = projectedShadowCoords.xyz / projectedShadowCoords.w;
  
  // Convert XY to (0, 1)
  // Y is flipped because texture coords are Y-down.
  shadowCoords = vec3(
    shadowCoords.xy * vec2(0.5, -0.5) + vec2(0.5),
    shadowCoords.z
  );
  
  return getPCFBaseShadowContribution(
    shadowCoords,
    spotShadow.pcfSamples,
    spotShadow.bias,
    spotShadow.intensity,
    depthTexture
  );
}
`
  );

  const getPCFBaseShadowContribution = (
    /* wgsl */
    `
fn getPCFBaseShadowContribution(
  shadowCoords: vec3f,
  pcfSamples: i32,
  bias: f32,
  intensity: f32,
  depthTexture: texture_depth_2d
) -> f32 {
  var visibility = 0.0;
  
  let inFrustum: bool = shadowCoords.x >= 0.0 && shadowCoords.x <= 1.0 && shadowCoords.y >= 0.0 && shadowCoords.y <= 1.0;
  let frustumTest: bool = inFrustum && shadowCoords.z <= 1.0;
  
  if(frustumTest) {
    // Percentage-closer filtering. Sample texels in the region
    // to smooth the result.
    let size: vec2f = vec2f(textureDimensions(depthTexture).xy);
  
    let texelSize: vec2f = 1.0 / size;
    
    let sampleCount: i32 = pcfSamples;
    let maxSamples: f32 = f32(sampleCount) - 1.0;
  
    for (var x = 0; x < sampleCount; x++) {
      for (var y = 0; y < sampleCount; y++) {
        let offset = texelSize * vec2(
          f32(x) - maxSamples * 0.5,
          f32(y) - maxSamples * 0.5
        );
        
        visibility += textureSampleCompareLevel(
          depthTexture,
          depthComparisonSampler,
          shadowCoords.xy + offset,
          shadowCoords.z - bias
        );
      }
    }
    visibility /= f32(sampleCount * sampleCount);
    
    visibility = mix(1.0, visibility, saturate(intensity));
  }
  else {
    visibility = 1.0;
  }
  
  return visibility;
}
`
  );

  const defaultProjectedMeshParams = {
    // frustum culling and visibility
    frustumCulling: "OBB",
    DOMFrustumMargins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    },
    receiveShadows: false,
    castShadows: false,
    transmissive: false
  };
  function ProjectedMeshBaseMixin(Base) {
    return class ProjectedMeshBase extends MeshBaseMixin(Base) {
      /**
       * ProjectedMeshBase constructor
       *
       * @typedef MeshBaseArrayParams
       * @type {array}
       * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
       * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
       * @property {ProjectedMeshParameters} 2 - Projected Mesh parameters
       *
       * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
       */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultProjectedMeshParams, ...params[2], ...{ useProjection: true } }
        );
        // callbacks / events
        /** function assigned to the {@link onReEnterView} callback */
        this._onReEnterViewCallback = () => {
        };
        /** function assigned to the {@link onLeaveView} callback */
        this._onLeaveViewCallback = () => {
        };
        let renderer = params[0];
        const parameters = {
          ...defaultProjectedMeshParams,
          ...params[2],
          ...{ useProjection: true }
        };
        this.type = "MeshTransformed";
        renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const { frustumCulling, DOMFrustumMargins, receiveShadows, castShadows, transmissive } = parameters;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          frustumCulling,
          DOMFrustumMargins,
          receiveShadows,
          castShadows,
          transmissive
        };
        if (this.options.castShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.addShadowCastingMesh(this);
            }
          });
        }
        this.setDOMFrustum();
      }
      /**
       * Set or reset this Mesh {@link renderer}.
       * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
       */
      setRenderer(renderer) {
        if (this.renderer && this.options.castShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.removeMesh(this);
            }
          });
        }
        if (this.options.transmissive) {
          renderer = isCameraRenderer(renderer, this.options.label + " " + renderer.type);
          renderer.createTransmissionTarget();
          let transmissiveTexture = this.material.textures.find(
            (texture) => texture.options.name === "transmissionBackgroundTexture"
          );
          if (transmissiveTexture) {
            transmissiveTexture.copy(renderer.transmissionTarget.texture);
          }
        }
        super.setRenderer(renderer);
        this.camera = this.renderer.camera;
        if (this.options.castShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.addShadowCastingMesh(this);
            }
          });
        }
      }
      /**
       * Assign or remove a {@link RenderBundle} to this Mesh.
       * @param renderBundle - The {@link RenderBundle} to assign or null if we want to remove the current {@link RenderBundle}.
       * @param updateScene - Whether to remove and then re-add the Mesh from the {@link core/scenes/Scene.Scene | Scene} or not.
       */
      setRenderBundle(renderBundle, updateScene = true) {
        if (this.renderBundle && renderBundle && this.renderBundle.uuid === renderBundle.uuid) return;
        const hasRenderBundle = !!this.renderBundle;
        const bindGroup = this.material.getBindGroupByBindingName("matrices");
        const matrices = this.material.getBufferBindingByName("matrices");
        if (this.renderBundle && !renderBundle && matrices.parent) {
          matrices.parent = null;
          matrices.shouldResetBindGroup = true;
          bindGroup.createBindingBuffer(matrices);
        }
        super.setRenderBundle(renderBundle, updateScene);
        if (this.renderBundle && this.renderBundle.binding) {
          if (hasRenderBundle) {
            bindGroup.destroyBufferBinding(matrices);
          }
          matrices.options.offset = this.renderBundle.meshes.size - 1;
          matrices.parent = this.renderBundle.binding;
          matrices.shouldResetBindGroup = true;
        }
      }
      /**
       * Reset the {@link BufferBinding | matrices buffer binding} parent and offset and tell its bind group to update.
       * @param offset - New offset to use in the parent {@link RenderBundle#binding | RenderBundle binding}.
       */
      patchRenderBundleBinding(offset = 0) {
        const matrices = this.material.getBufferBindingByName("matrices");
        matrices.options.offset = offset;
        matrices.parent = this.renderBundle.binding;
        matrices.shouldResetBindGroup = true;
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing.
       * Can also patch the fragment shader if the mesh should receive shadows.
       */
      setShaders() {
        const { shaders } = this.options;
        if (!shaders) {
          this.options.shaders = {
            vertex: {
              code: getDefaultProjectedVertexShaderCode,
              entryPoint: "main"
            },
            fragment: {
              code: getDefaultNormalFragmentCode,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: getDefaultProjectedVertexShaderCode,
              entryPoint: "main"
            };
          }
          if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
            shaders.fragment = {
              code: getDefaultNormalFragmentCode,
              entryPoint: "main"
            };
          }
        }
        if (this.options.receiveShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            light.shadow.addShadowReceivingMesh(this);
          });
          const hasActiveShadows = this.renderer.shadowCastingLights.find((light) => light.shadow.isActive);
          if (hasActiveShadows && shaders.fragment) {
            shaders.fragment.code = getPCFBaseShadowContribution + getPCFDirectionalShadows(this.renderer) + getPCFDirectionalShadowContribution + getPCFPointShadows(this.renderer) + getPCFPointShadowContribution + getPCFSpotShadows(this.renderer) + getPCFSpotShadowContribution + shaders.fragment.code;
          }
        }
        return shaders;
      }
      /* GEOMETRY */
      /**
       * Set or update the Projected Mesh {@link Geometry}
       * @param geometry - new {@link Geometry} to use
       */
      useGeometry(geometry) {
        super.useGeometry(geometry);
        if (this.renderer && this.options.castShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.updateMeshGeometry(this, geometry);
            }
          });
        }
        if (this.domFrustum) {
          this.domFrustum.boundingBox = this.geometry.boundingBox;
        }
        this.shouldUpdateMatrixStack();
      }
      /**
       * Set the Mesh frustum culling
       */
      setDOMFrustum() {
        this.domFrustum = new DOMFrustum({
          boundingBox: this.geometry?.boundingBox,
          modelViewProjectionMatrix: this.modelViewProjectionMatrix,
          containerBoundingRect: this.renderer.boundingRect,
          DOMFrustumMargins: this.options.DOMFrustumMargins,
          onReEnterView: () => {
            this._onReEnterViewCallback && this._onReEnterViewCallback();
          },
          onLeaveView: () => {
            this._onLeaveViewCallback && this._onLeaveViewCallback();
          }
        });
        this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins;
        this.frustumCulling = this.options.frustumCulling;
      }
      /**
       * Get whether the Mesh is currently in the {@link camera} frustum.
       * @readonly
       */
      get isInFrustum() {
        return this.domFrustum.isIntersecting;
      }
      /* MATERIAL */
      /**
       * Hook used to clean up parameters before sending them to the material.
       * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
       * @returns - cleaned parameters
       */
      cleanupRenderMaterialParameters(parameters) {
        delete parameters.castShadows;
        delete parameters.DOMFrustumMargins;
        delete parameters.frustumCulling;
        delete parameters.receiveShadows;
        delete parameters.transmissive;
        if (this.options.receiveShadows) {
          const depthTextures = [];
          let depthSamplers = [];
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              depthTextures.push(light.shadow.depthTexture);
              depthSamplers.push(light.shadow.depthComparisonSampler);
            }
          });
          depthSamplers = depthSamplers.filter(
            (sampler, i, array) => array.findIndex((s) => s.uuid === sampler.uuid) === i
          );
          if (parameters.textures) {
            parameters.textures = [...parameters.textures, ...depthTextures];
          } else {
            parameters.textures = depthTextures;
          }
          if (parameters.samplers) {
            parameters.samplers = [...parameters.samplers, ...depthSamplers];
          } else {
            parameters.samplers = depthSamplers;
          }
        }
        if (this.options.transmissive) {
          this.renderer.createTransmissionTarget();
          const transmissionTexture = new Texture(this.renderer, {
            label: this.options.label + " transmission texture",
            name: "transmissionBackgroundTexture",
            fromTexture: this.renderer.transmissionTarget.texture
          });
          if (parameters.textures) {
            parameters.textures = [...parameters.textures, transmissionTexture];
          } else {
            parameters.textures = [transmissionTexture];
          }
          if (parameters.samplers) {
            parameters.samplers = [...parameters.samplers, this.renderer.transmissionTarget.sampler];
          } else {
            parameters.samplers = [this.renderer.transmissionTarget.sampler];
          }
        }
        return super.cleanupRenderMaterialParameters(parameters);
      }
      /**
       * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        const matricesUniforms = {
          label: "Matrices",
          name: "matrices",
          visibility: ["vertex", "fragment"],
          minOffset: this.renderer.device ? this.renderer.device.limits.minUniformBufferOffsetAlignment : 256,
          struct: {
            model: {
              type: "mat4x4f",
              value: this.worldMatrix
            },
            modelView: {
              // model view matrix (world matrix multiplied by camera view matrix)
              type: "mat4x4f",
              value: this.modelViewMatrix
            },
            normal: {
              // normal matrix
              type: "mat3x3f",
              value: this.normalMatrix
            }
          }
        };
        if (this.options.renderBundle && this.options.renderBundle.binding) {
          matricesUniforms.parent = this.options.renderBundle.binding;
          matricesUniforms.offset = this.options.renderBundle.meshes.size;
        }
        const meshTransformationBinding = new BufferBinding(matricesUniforms);
        if (!meshParameters.bindings) meshParameters.bindings = [];
        meshParameters.bindings.unshift(meshTransformationBinding);
        super.setMaterial(meshParameters);
      }
      /**
       * Update this Mesh camera {@link BindGroup}. Useful if the Mesh needs to be rendered with a different {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#camera | camera} than the {@link CameraRenderer} one.
       * @param cameraBindGroup - New camera {@link BindGroup} to use. Should be a clon from the {@link CameraRenderer} one.
       */
      setCameraBindGroup(cameraBindGroup) {
        if (this.material && this.material.useCameraBindGroup && this.material.bindGroups.length) {
          this.material.bindGroups[0] = cameraBindGroup;
        }
      }
      /**
       * Get the visible property value
       */
      get visible() {
        return this._visible;
      }
      /**
       * Set the visible property value
       * @param value - new visibility value
       */
      set visible(value) {
        this.shouldUpdateMatrixStack();
        this._visible = value;
      }
      /* SIZE & TRANSFORMS */
      /**
       * Resize our {@link ProjectedMeshBaseClass}
       * @param boundingRect - the new bounding rectangle
       */
      resize(boundingRect) {
        if (this.domFrustum) this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect);
        super.resize(boundingRect);
      }
      /**
       * Get our {@link DOMFrustum} projected bounding rectangle
       * @readonly
       */
      get projectedBoundingRect() {
        return this.domFrustum?.projectedBoundingRect;
      }
      /* EVENTS */
      /**
       * Assign a callback function to _onReEnterViewCallback
       * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
       * @returns - our Mesh
       */
      onReEnterView(callback) {
        if (callback) {
          this._onReEnterViewCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onLeaveViewCallback
       * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
       * @returns - our Mesh
       */
      onLeaveView(callback) {
        if (callback) {
          this._onLeaveViewCallback = callback;
        }
        return this;
      }
      /* RENDER */
      /**
       * Get the geometry bounding sphere in clip space.
       * @readonly
       */
      get clipSpaceBoundingSphere() {
        const { center, radius, min, max } = this.geometry.boundingBox;
        const translation = this.worldMatrix.getTranslation();
        const maxWorldRadius = radius * this.worldMatrix.getMaxScaleOnAxis();
        const cMin = center.clone().add(translation);
        cMin.z += min.z;
        const cMax = center.clone().add(translation);
        cMax.z += max.z;
        const sMin = cMin.clone();
        sMin.y += maxWorldRadius;
        const sMax = cMax.clone();
        sMax.y += maxWorldRadius;
        cMin.applyMat4(this.camera.viewProjectionMatrix);
        cMax.applyMat4(this.camera.viewProjectionMatrix);
        sMin.applyMat4(this.camera.viewProjectionMatrix);
        sMax.applyMat4(this.camera.viewProjectionMatrix);
        const rMin = cMin.distance(sMin);
        const rMax = cMax.distance(sMax);
        const rectMin = {
          xMin: cMin.x - rMin,
          xMax: cMin.x + rMin,
          yMin: cMin.y - rMin,
          yMax: cMin.y + rMin
        };
        const rectMax = {
          xMin: cMax.x - rMax,
          xMax: cMax.x + rMax,
          yMin: cMax.y - rMax,
          yMax: cMax.y + rMax
        };
        const rect = {
          xMin: Math.min(rectMin.xMin, rectMax.xMin),
          yMin: Math.min(rectMin.yMin, rectMax.yMin),
          xMax: Math.max(rectMin.xMax, rectMax.xMax),
          yMax: Math.max(rectMin.yMax, rectMax.yMax)
        };
        const sphereCenter = cMax.add(cMin).multiplyScalar(0.5).clone();
        sphereCenter.x = (rect.xMax + rect.xMin) / 2;
        sphereCenter.y = (rect.yMax + rect.yMin) / 2;
        const sphereRadius = Math.max(rect.xMax - rect.xMin, rect.yMax - rect.yMin) * 0.5;
        return {
          center: sphereCenter,
          radius: sphereRadius
        };
      }
      /**
       * Check if the Mesh lies inside the {@link camera} view frustum or not using the test defined by {@link frustumCulling}.
       */
      checkFrustumCulling() {
        if (this.matricesNeedUpdate) {
          if (this.domFrustum && this.frustumCulling) {
            if (this.frustumCulling === "sphere") {
              this.domFrustum.setDocumentCoordsFromClipSpaceSphere(this.clipSpaceBoundingSphere);
            } else {
              this.domFrustum.setDocumentCoordsFromClipSpaceOBB();
            }
            this.domFrustum.intersectsContainer();
          }
        }
      }
      /**
       * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
       */
      onBeforeRenderPass() {
        if (this.material && this.matricesNeedUpdate) {
          this.material.shouldUpdateInputsBindings("matrices");
        }
        super.onBeforeRenderPass();
      }
      /**
       * Render our Mesh if the {@link RenderMaterial} is ready and if it is not frustum culled.
       * @param pass - current render pass
       */
      onRenderPass(pass) {
        if (!this.ready) return;
        if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulling) {
          this.renderPass(pass);
        }
      }
      /**
       * Destroy the Mesh, and handle shadow casting or receiving meshes.
       */
      destroy() {
        if (this.options.castShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.removeMesh(this);
            }
          });
        }
        if (this.options.receiveShadows) {
          this.renderer.shadowCastingLights.forEach((light) => {
            light.shadow.removeShadowReceivingMesh(this);
          });
        }
        super.destroy();
      }
    };
  }

  class Mesh extends ProjectedMeshBaseMixin(ProjectedObject3D) {
    /**
     * Mesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Mesh}.
     * @param parameters - {@link ProjectedMeshParameters | parameters} use to create this {@link Mesh}.
     */
    constructor(renderer, parameters = {}) {
      renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " Mesh" : "Mesh");
      super(renderer, null, parameters);
      this.type = "Mesh";
    }
  }

  var __typeError$j = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$j = (obj, member, msg) => member.has(obj) || __typeError$j("Cannot " + msg);
  var __privateAdd$j = (obj, member, value) => member.has(obj) ? __typeError$j("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod$a = (obj, member, method) => (__accessCheck$j(obj, member, "access private method"), method);
  var _IndirectBuffer_instances, createIndirectBuffer_fn, addGeometryToIndirectMappedBuffer_fn;
  const indirectBufferEntrySize = 5;
  class IndirectBuffer {
    /**
     * IndirectBuffer constructor.
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link IndirectBuffer}.
     * @param parameters - {@link IndirectBufferParams | parameters} used to create this {@link IndirectBuffer}.
     */
    constructor(renderer, { label = "Indirect buffer", geometries = [], minEntrySize = indirectBufferEntrySize } = {}) {
      __privateAdd$j(this, _IndirectBuffer_instances);
      this.type = "IndirectBuffer";
      this.setRenderer(renderer);
      this.uuid = generateUUID();
      this.options = {
        label,
        geometries,
        minEntrySize
      };
      this.geometries = /* @__PURE__ */ new Map();
      this.buffer = null;
      this.addGeometries(geometries);
      this.renderer.indirectBuffers.set(this.uuid, this);
    }
    /**
     * Set or reset this {@link IndirectBuffer} {@link IndirectBuffer.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
    }
    /**
     * Get the number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
     * @returns - Number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
     * @readonly
     */
    get size() {
      return this.geometries.size;
    }
    /**
     * Add multiple {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
     * @param geometries - Array of {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
     */
    addGeometries(geometries = []) {
      geometries.forEach((geometry) => this.addGeometry(geometry));
    }
    /**
     * Add a {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
     * @param geometry - A {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
     */
    addGeometry(geometry) {
      this.geometries.set(geometry.uuid, geometry);
    }
    /**
     * Get the byte offset in the {@link buffer} at a given index.
     * @param index - Index to get the byte offset from.
     * @returns - Byte offset in the {@link buffer} at a given index.
     */
    getByteOffsetAtIndex(index = 0) {
      return index * this.options.minEntrySize * Uint32Array.BYTES_PER_ELEMENT;
    }
    /**
     * Create the {@link buffer} as soon as the {@link core/renderers/GPURenderer.GPURenderer#device | device} is ready.
     */
    create() {
      if (this.renderer.ready) {
        __privateMethod$a(this, _IndirectBuffer_instances, createIndirectBuffer_fn).call(this);
      } else {
        const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
          () => {
            if (this.renderer.device) {
              this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
              __privateMethod$a(this, _IndirectBuffer_instances, createIndirectBuffer_fn).call(this);
            }
          },
          { once: false }
        );
      }
    }
    /**
     * Destroy this {@link IndirectBuffer}. Reset all {@link geometries} {@link Geometry#indirectDraw | indirectDraw} properties and destroy the {@link Buffer}.
     */
    destroy() {
      this.renderer.removeBuffer(this.buffer);
      this.renderer.indirectBuffers.delete(this.uuid);
      this.geometries.forEach((geometry) => geometry.indirectDraw = null);
      this.buffer?.destroy();
      this.buffer = null;
      this.geometries = null;
    }
  }
  _IndirectBuffer_instances = new WeakSet();
  /**
   * Create the {@link buffer} (or destroy it if it already exists) with the right size, create its {@link GPUBuffer} in a mapped state, add all {@link geometries} attributes to the mapped buffer and tell the {@link geometries} to use this {@link IndirectBuffer}.
   * @private
   */
  createIndirectBuffer_fn = function() {
    const size = this.getByteOffsetAtIndex(this.geometries.size);
    if (this.buffer) {
      this.buffer.destroy();
      this.buffer.options.size = size;
    } else {
      this.buffer = new Buffer({
        label: this.options.label,
        size,
        usage: ["copyDst", "indirect", "storage"],
        mappedAtCreation: true
      });
    }
    this.buffer.consumers.add(this.uuid);
    this.buffer.createBuffer(this.renderer);
    const indirectMappedBuffer = new Uint32Array(this.buffer.GPUBuffer.getMappedRange());
    let offset = 0;
    this.geometries.forEach((geometry) => {
      __privateMethod$a(this, _IndirectBuffer_instances, addGeometryToIndirectMappedBuffer_fn).call(this, geometry, indirectMappedBuffer, offset * this.options.minEntrySize);
      geometry.useIndirectBuffer({ buffer: this.buffer, offset: this.getByteOffsetAtIndex(offset) });
      offset++;
    });
    this.buffer.GPUBuffer.unmap();
  };
  /**
   * Add a {@link Geometry} or {@link IndexedGeometry} attributes to the {@link buffer} mapped array buffer.
   * @param geometry - {@link Geometry} or {@link IndexedGeometry} to add the attributes from
   * @param mappedBuffer - The {@link buffer} mapped array buffer
   * @param index - Index in the {@link buffer} mapped array buffer at which to add the attributes.
   * @private
   */
  addGeometryToIndirectMappedBuffer_fn = function(geometry, mappedBuffer, index = 0) {
    if ("indexBuffer" in geometry && geometry.indexBuffer) {
      mappedBuffer[index] = geometry.indexBuffer.bufferLength;
      mappedBuffer[index + 1] = geometry.instancesCount;
      mappedBuffer[index + 2] = 0;
      mappedBuffer[index + 3] = 0;
      mappedBuffer[index + 4] = 0;
    } else {
      mappedBuffer[index] = geometry.verticesCount;
      mappedBuffer[index + 1] = geometry.instancesCount;
      mappedBuffer[index + 2] = 0;
      mappedBuffer[index + 3] = 0;
      mappedBuffer[index + 4] = 0;
    }
  };

  var __typeError$i = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$i = (obj, member, msg) => member.has(obj) || __typeError$i("Cannot " + msg);
  var __privateGet$h = (obj, member, getter) => (__accessCheck$i(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$i = (obj, member, value) => member.has(obj) ? __typeError$i("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$h = (obj, member, value, setter) => (__accessCheck$i(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$9 = (obj, member, method) => (__accessCheck$i(obj, member, "access private method"), method);
  var _useProjection, _ready, _RenderBundle_instances, setBinding_fn, patchBindingOffset_fn, onSizeChanged_fn, setDescriptor_fn, encodeRenderCommands_fn, cleanUp_fn;
  let bundleIndex = 0;
  class RenderBundle {
    /**
     * RenderBundle constructor
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link RenderBundle}.
     * @param parameters - {@link RenderBundleParams | parameters} use to create this {@link RenderBundle}.
     */
    constructor(renderer, {
      label,
      renderPass = null,
      renderOrder = 0,
      transparent = null,
      visible = true,
      size = 0,
      useBuffer = false,
      useIndirectDraw = false
    } = {}) {
      __privateAdd$i(this, _RenderBundle_instances);
      /** @ignore */
      // whether this render bundle should be added to the 'projected' or 'unProjected' Scene stacks.
      __privateAdd$i(this, _useProjection);
      /** @ignore */
      __privateAdd$i(this, _ready);
      this.type = "RenderBundle";
      renderer = isRenderer(renderer, this.type);
      this.uuid = generateUUID();
      Object.defineProperty(this, "index", { value: bundleIndex++ });
      this.renderOrder = renderOrder;
      this.transparent = transparent;
      this.visible = visible;
      label = label ?? this.type + this.index;
      this.options = {
        label,
        renderPass,
        useBuffer,
        size,
        useIndirectDraw
      };
      this.meshes = /* @__PURE__ */ new Map();
      this.encoder = null;
      this.bundle = null;
      __privateSet$h(this, _ready, false);
      this.binding = null;
      this.indirectBuffer = null;
      this.setRenderer(renderer);
      if (this.options.useIndirectDraw) {
        this.indirectBuffer = new IndirectBuffer(this.renderer);
      }
      if (this.options.useBuffer) {
        __privateSet$h(this, _useProjection, true);
        if (this.options.size !== 0) {
          __privateMethod$9(this, _RenderBundle_instances, setBinding_fn).call(this);
        } else {
          this.options.useBuffer = false;
          if (!this.renderer.production) {
            throwWarning(
              `${this.options.label} (${this.type}): Cannot use a single transformation buffer if the size parameter has not been set upon creation.`
            );
          }
        }
      }
    }
    /**
     * Set the {@link RenderBundle} {@link RenderBundle.renderer | renderer} and eventually remove/add to the {@link core/scenes/Scene.Scene | Scene}.
     * @param renderer - new {@link Renderer} to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.removeFromScene();
        this.renderer.renderBundles.delete(this.uuid);
      }
      this.renderer = renderer;
      this.renderer.renderBundles.set(this.uuid, this);
      if (this.meshes.size >= 1) {
        this.addToScene();
      }
    }
    /**
     * Add our {@link RenderBundle} to the {@link core/scenes/Scene.Scene | Scene}.
     * Once we have at least one mesh in our {@link meshes} Map, we can add the {@link RenderBundle} to the {@link core/scenes/Scene.Scene | Scene} at the right place.
     */
    addToScene() {
      const firstEntry = this.meshes.entries().next();
      if (firstEntry && firstEntry.value && firstEntry.value.length && firstEntry.value[1]) {
        const mesh = firstEntry.value[1];
        const isTransparent = !!mesh.transparent;
        if (this.transparent === null) {
          this.transparent = isTransparent;
        }
        if (mesh.type !== "ShaderPass" && mesh.type !== "PingPongPlane") {
          const { useProjection } = mesh.material.options.rendering;
          if (this.useProjection === null) {
            this.useProjection = useProjection;
          }
          const projectionStack = this.renderer.scene.getMeshProjectionStack(mesh);
          this.renderer.scene.addRenderBundle(this, projectionStack);
        } else {
          this.size = 1;
          mesh.renderOrder = this.renderOrder;
          this.useProjection = false;
        }
      }
    }
    /**
     * Remove our {@link RenderBundle} from the {@link core/scenes/Scene.Scene | Scene}.
     */
    removeFromScene() {
      this.renderer.scene.removeRenderBundle(this);
    }
    /**
     * Get whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not (useful to know in which {@link core/scenes/Scene.Scene | Scene} stack it has been added.
     * @readonly
     * @returns - Whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
     */
    get useProjection() {
      return __privateGet$h(this, _useProjection);
    }
    /**
     * Set whether our {@link RenderBundle} handles {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} or not.
     * @param value - New projection value.
     */
    set useProjection(value) {
      __privateSet$h(this, _useProjection, value);
    }
    /**
     * Set the new {@link RenderBundle} size. Should be used before adding or removing {@link meshes} to the {@link RenderBundle} if the {@link bundle} has already been created (especially if it's using a {@link binding}).
     * @param value - New size to set.
     */
    set size(value) {
      if (value !== this.options.size) {
        if (this.ready && !this.renderer.production) {
          throwWarning(
            `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not change its size after it has been created.`
          );
        }
        this.ready = false;
        __privateMethod$9(this, _RenderBundle_instances, onSizeChanged_fn).call(this, value);
        this.options.size = value;
      }
    }
    /**
     * Get whether our {@link RenderBundle} is ready.
     * @readonly
     * @returns - Whether our {@link RenderBundle} is ready.
     */
    get ready() {
      return this.renderer.ready && __privateGet$h(this, _ready);
    }
    /**
     * Set whether our {@link RenderBundle} is ready and encode it if needed.
     * @param value - New ready state.
     */
    set ready(value) {
      if (value && !this.ready) {
        const init = () => {
          this.size = this.meshes.size;
          if (this.options.useIndirectDraw) {
            this.meshes.forEach((mesh) => {
              this.indirectBuffer.addGeometry(mesh.geometry);
            });
            this.indirectBuffer.create();
          }
          __privateMethod$9(this, _RenderBundle_instances, encodeRenderCommands_fn).call(this);
          __privateSet$h(this, _ready, value);
        };
        if (this.renderer.device) {
          init();
        } else {
          const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
            () => {
              if (this.renderer.device) {
                this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
                init();
              }
            },
            { once: false }
          );
        }
      } else if (!value && this.ready) {
        this.bundle = null;
        __privateSet$h(this, _ready, value);
      }
    }
    /**
     * Called by the {@link core/scenes/Scene.Scene | Scene} to eventually add a {@link RenderedMesh | mesh} to this {@link RenderBundle}. Can set the {@link RenderBundleOptions#renderPass | render pass} if needed. If the {@link RenderBundleOptions#renderPass | render pass} is already set and the mesh output {@link RenderPass} does not match, it won't be added.
     * @param mesh - {@link RenderedMesh | Mesh} to eventually add.
     * @param outputPass - The mesh output {@link RenderPass}.
     */
    addMesh(mesh, outputPass) {
      if (!this.options.renderPass) {
        this.options.renderPass = outputPass;
      } else if (outputPass.uuid !== this.options.renderPass.uuid) {
        if (!this.renderer.production) {
          throwWarning(
            `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because the output render passes do not match.`
          );
        }
        mesh.renderBundle = null;
        return;
      }
      if (mesh.options.stencil) {
        if (!this.renderer.production) {
          throwWarning(
            `${this.options.label} (${this.type}): Cannot add Mesh ${mesh.options.label} to this render bundle because stencil operations are not supported by render bundles.`
          );
        }
        mesh.renderBundle = null;
        return;
      }
      if (this.ready && !this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not add meshes to it after it has been created (mesh added: ${mesh.options.label}).`
        );
      }
      this.ready = false;
      this.meshes.set(mesh.uuid, mesh);
      if (this.meshes.size === 1) {
        this.addToScene();
      }
    }
    /**
     * Remove any {@link RenderedMesh | rendered mesh} from this {@link RenderBundle}.
     * @param mesh - {@link RenderedMesh | Mesh} to remove.
     */
    removeSceneObject(mesh) {
      if (this.ready && !this.renderer.production) {
        throwWarning(
          `${this.options.label} (${this.type}): The content of a render bundle is meant to be static. You should not remove meshes from it after it has been created (mesh removed: ${mesh.options.label}).`
        );
      }
      this.ready = false;
      this.meshes.delete(mesh.uuid);
      mesh.setRenderBundle(null, false);
      if (this.options.useIndirectDraw) {
        mesh.geometry.indirectDraw = null;
      }
    }
    /**
     * Remove a {@link SceneStackedMesh | scene stacked mesh} from this {@link RenderBundle}.
     * @param mesh - {@link SceneStackedMesh | Scene stacked mesh} to remove.
     * @param keepMesh - Whether to preserve the mesh in order to render it normally again. Default to `true`.
     */
    removeMesh(mesh, keepMesh = true) {
      this.removeSceneObject(mesh);
      if (keepMesh && mesh.type !== "ShaderPass" && mesh.type !== "PingPongPlane") {
        this.renderer.scene.addMesh(mesh);
      }
      if (this.meshes.size === 0) {
        this.renderer.scene.removeRenderBundle(this);
      }
    }
    /**
     * Update the {@link binding} buffer if needed.
     */
    updateBinding() {
      if (this.binding && this.binding.shouldUpdate && this.binding.buffer.GPUBuffer) {
        this.renderer.queueWriteBuffer(this.binding.buffer.GPUBuffer, 0, this.binding.arrayBuffer);
        this.binding.shouldUpdate = false;
      }
    }
    /**
     * If one of the {@link meshes} is using a {@link core/textures/Texture.Texture | Texture} dependent of the {@link renderer}, invalidate the {@link RenderBundle} in order to resize the {@link core/textures/Texture.Texture | Texture}.
     */
    resize() {
      for (const [_uuid, mesh] of this.meshes) {
        const hasRenderTexture = mesh.textures.find((texture) => !texture.options.fixedSize);
        if (hasRenderTexture) {
          this.ready = false;
          break;
        }
      }
    }
    /**
     * Render the {@link RenderBundle}.
     *
     * If it is ready, execute each {@link core/meshes/Mesh.Mesh.onBeforeRenderPass | mesh onBeforeRenderPass method}, {@link updateBinding | update the binding} if needed, execute the {@link bundle} and finally execute each {@link core/meshes/Mesh.Mesh.onAfterRenderPass | mesh onAfterRenderPass method}.
     *
     * If not, just render its {@link meshes} as usual and check whether they are all ready and if we can therefore encode our {@link RenderBundle}.
     * @param pass - {@link GPURenderPassEncoder} to use.
     */
    render(pass) {
      if (!this.renderer.ready) return;
      if (this.ready && this.bundle && this.visible) {
        this.meshes.forEach((mesh) => {
          mesh.onBeforeRenderPass();
        });
        this.updateBinding();
        this.renderer.pipelineManager.resetCurrentPipeline();
        if (!this.renderer.production) {
          pass.pushDebugGroup(`${this.options.label}: execute bundle`);
        }
        pass.executeBundles([this.bundle]);
        if (!this.renderer.production) {
          pass.popDebugGroup();
        }
        this.renderer.pipelineManager.resetCurrentPipeline();
        this.meshes.forEach((mesh) => {
          mesh.onAfterRenderPass();
        });
      }
      if (!this.ready) {
        let isReady = true;
        for (const [_key, mesh] of this.meshes) {
          mesh.render(pass);
          if (!mesh.ready) {
            isReady = false;
          }
          for (const texture of mesh.textures) {
            if (texture instanceof MediaTexture && !texture.sourcesUploaded) {
              isReady = false;
            }
          }
        }
        this.updateBinding();
        this.ready = isReady;
      }
    }
    /**
     * Called when the {@link core/renderers/GPURenderer.GPURenderer#device | WebGPU device} has been lost.
     * Just set the {@link ready} flag to `false` to eventually invalidate the {@link bundle}.
     */
    loseContext() {
      this.ready = false;
    }
    /**
     * Empty the {@link RenderBundle}. Can eventually re-add the {@link SceneStackedMesh | scene stacked meshes} to the {@link core/scenes/Scene.Scene | Scene} in order to render them normally again.
     * @param keepMeshes - Whether to preserve the {@link meshes} in order to render them normally again. Default to `true`.
     */
    empty(keepMeshes = true) {
      this.ready = false;
      this.meshes.forEach((mesh) => {
        this.removeMesh(mesh, keepMeshes);
      });
      this.size = 0;
    }
    /**
     * Remove the {@link RenderBundle}, i.e. destroy it while preserving the {@link SceneStackedMesh | scene stacked meshes} by re-adding them to the {@link core/scenes/Scene.Scene | Scene}.
     */
    remove() {
      this.empty(true);
      __privateMethod$9(this, _RenderBundle_instances, cleanUp_fn).call(this);
    }
    /**
     * Remove the {@link RenderBundle} from our {@link core/scenes/Scene.Scene | Scene}, {@link RenderedMesh#remove | remove the meshes}, eventually destroy the {@link binding} and remove the {@link RenderBundle} from the {@link Renderer}.
     */
    destroy() {
      this.ready = false;
      this.meshes.forEach((mesh) => {
        mesh.remove();
      });
      this.size = 0;
      __privateMethod$9(this, _RenderBundle_instances, cleanUp_fn).call(this);
    }
  }
  _useProjection = new WeakMap();
  _ready = new WeakMap();
  _RenderBundle_instances = new WeakSet();
  /**
   * Set the {@link binding} and patches its array and buffer size if needed.
   * @private
   */
  setBinding_fn = function() {
    this.binding = new BufferBinding({
      label: this.options.label + " matrices",
      name: "matrices",
      visibility: ["vertex", "fragment"],
      struct: {
        model: {
          type: "array<mat4x4f>",
          value: new Float32Array(16 * this.options.size)
        },
        modelView: {
          type: "array<mat4x4f>",
          value: new Float32Array(16 * this.options.size)
        },
        normal: {
          type: "array<mat3x3f>",
          value: new Float32Array(12 * this.options.size)
        }
      }
    });
    __privateMethod$9(this, _RenderBundle_instances, patchBindingOffset_fn).call(this, this.options.size);
  };
  /**
   * Path the {@link binding} array and buffer size with the minimum {@link core/renderers/GPURenderer.GPURenderer#device | device} buffer offset alignment.
   * @param size - new {@link binding} size to use.
   * @private
   */
  patchBindingOffset_fn = function(size) {
    const minOffset = this.renderer.device?.limits.minUniformBufferOffsetAlignment || 256;
    if (this.binding.arrayBufferSize < size * minOffset) {
      this.binding.arrayBufferSize = size * minOffset;
      this.binding.arrayBuffer = new ArrayBuffer(this.binding.arrayBufferSize);
      this.binding.arrayView = new DataView(this.binding.arrayBuffer, 0, this.binding.arrayBufferSize);
      this.binding.buffer.size = this.binding.arrayBuffer.byteLength;
    }
  };
  /**
   * Called each time the {@link RenderBundle} size has actually changed.
   * @param newSize - new {@link RenderBundle} size to set.
   * @private
   */
  onSizeChanged_fn = function(newSize) {
    if (newSize > this.options.size && this.binding) {
      __privateMethod$9(this, _RenderBundle_instances, patchBindingOffset_fn).call(this, newSize);
      let offset = 0;
      this.meshes.forEach((mesh) => {
        mesh.patchRenderBundleBinding(offset);
        offset++;
      });
      if (this.binding.buffer.GPUBuffer) {
        this.binding.buffer.GPUBuffer.destroy();
        this.binding.buffer.createBuffer(this.renderer, {
          label: this.binding.options.label,
          usage: [
            ...["copySrc", "copyDst", this.binding.bindingType],
            ...this.binding.options.usage
          ]
        });
        this.binding.shouldUpdate = true;
      }
    }
  };
  /**
   * Set the {@link descriptor} based on the {@link RenderBundleOptions#renderPass | render pass}.
   * @private
   */
  setDescriptor_fn = function() {
    this.descriptor = {
      ...this.options.renderPass.options.colorAttachments && {
        colorFormats: this.options.renderPass.options.colorAttachments.map(
          (colorAttachment) => colorAttachment.targetFormat
        )
      },
      ...this.options.renderPass.options.useDepth && {
        depthStencilFormat: this.options.renderPass.options.depthFormat
      },
      sampleCount: this.options.renderPass.options.sampleCount
    };
  };
  /**
   * Create the {@link descriptor}, {@link encoder} and {@link bundle} used by this {@link RenderBundle}.
   * @private
   */
  encodeRenderCommands_fn = function() {
    __privateMethod$9(this, _RenderBundle_instances, setDescriptor_fn).call(this);
    this.renderer.pipelineManager.resetCurrentPipeline();
    this.encoder = this.renderer.device.createRenderBundleEncoder({
      ...this.descriptor,
      label: this.options.label + " (encoder)"
    });
    if (!this.renderer.production) {
      this.encoder.pushDebugGroup(`${this.options.label}: create encoder`);
    }
    this.meshes.forEach((mesh) => {
      mesh.material.render(this.encoder);
      mesh.geometry.render(this.encoder);
    });
    if (!this.renderer.production) {
      this.encoder.popDebugGroup();
    }
    this.bundle = this.encoder.finish({ label: this.options.label + " (bundle)" });
    this.renderer.pipelineManager.resetCurrentPipeline();
  };
  /**
   * Destroy the {@link binding} buffer if needed and remove the {@link RenderBundle} from the {@link Renderer}.
   * @private
   */
  cleanUp_fn = function() {
    if (this.binding) {
      this.renderer.removeBuffer(this.binding.buffer);
      this.binding.buffer.destroy();
    }
    if (this.indirectBuffer) {
      this.indirectBuffer.destroy();
    }
    this.renderer.renderBundles.delete(this.uuid);
  };

  var __typeError$h = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$h = (obj, member, msg) => member.has(obj) || __typeError$h("Cannot " + msg);
  var __privateGet$g = (obj, member, getter) => (__accessCheck$h(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$h = (obj, member, value) => member.has(obj) ? __typeError$h("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$g = (obj, member, value, setter) => (__accessCheck$h(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$8 = (obj, member, method) => (__accessCheck$h(obj, member, "access private method"), method);
  var _intensity, _bias, _normalBias, _pcfSamples, _isActive, _autoRender, _receivingMeshes, _Shadow_instances, setParameters_fn;
  const shadowStruct = {
    isActive: {
      type: "i32",
      value: 0
    },
    pcfSamples: {
      type: "i32",
      value: 0
    },
    bias: {
      type: "f32",
      value: 0
    },
    normalBias: {
      type: "f32",
      value: 0
    },
    intensity: {
      type: "f32",
      value: 0
    }
  };
  class Shadow {
    /**
     * Shadow constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link Shadow}.
     * @param parameters - {@link ShadowBaseParams} used to create this {@link Shadow}.
     */
    constructor(renderer, {
      light,
      intensity = 1,
      bias = 0,
      normalBias = 0,
      pcfSamples = 1,
      depthTextureSize = new Vec2(512),
      depthTextureFormat = "depth24plus",
      autoRender = true,
      useRenderBundle = true
    } = {}) {
      __privateAdd$h(this, _Shadow_instances);
      /** @ignore */
      __privateAdd$h(this, _intensity);
      /** @ignore */
      __privateAdd$h(this, _bias);
      /** @ignore */
      __privateAdd$h(this, _normalBias);
      /** @ignore */
      __privateAdd$h(this, _pcfSamples);
      /** @ignore */
      __privateAdd$h(this, _isActive);
      /** @ignore */
      __privateAdd$h(this, _autoRender);
      /** Map of all the shadow receiving {@link Mesh}. */
      __privateAdd$h(this, _receivingMeshes);
      this.setRenderer(renderer);
      this.light = light;
      this.index = this.light.index;
      this.options = {
        light,
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        useRenderBundle
      };
      this.sampleCount = 1;
      this.castingMeshes = /* @__PURE__ */ new Map();
      __privateSet$g(this, _receivingMeshes, /* @__PURE__ */ new Map());
      this.depthMeshes = /* @__PURE__ */ new Map();
      this.renderBundle = null;
      __privateMethod$8(this, _Shadow_instances, setParameters_fn).call(this, {
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle
      });
      this.isActive = false;
    }
    /**
     * Set or reset this shadow {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      const oldRenderer = this.renderer;
      renderer = isCameraRenderer(renderer, this.constructor.name);
      this.renderer = renderer;
      this.setRendererBinding();
      if (this.depthPassTarget) {
        this.depthPassTarget.setRenderer(this.renderer);
      }
      if (this.renderBundle) {
        this.renderBundle.setRenderer(this.renderer);
      }
      this.castingMeshes = /* @__PURE__ */ new Map();
      this.renderer.meshes.forEach((mesh) => {
        if ("castShadows" in mesh.options && mesh.options.castShadows) {
          this.castingMeshes.set(mesh.uuid, mesh);
        }
      });
      this.depthMeshes?.forEach((depthMesh) => {
        depthMesh.setRenderer(this.renderer);
      });
      if (oldRenderer) {
        this.reset();
        if (__privateGet$g(this, _autoRender)) {
          this.setDepthPass();
        }
      }
    }
    /** @ignore */
    setRendererBinding() {
      this.rendererBinding = null;
    }
    /**
     * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
     * Called internally by the associated {@link core/lights/Light.Light | Light} if any shadow parameters are specified when creating it. Can also be called directly.
     * @param parameters - Parameters to use for this {@link Shadow}.
     */
    cast({
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      useRenderBundle
    } = {}) {
      __privateMethod$8(this, _Shadow_instances, setParameters_fn).call(this, {
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle
      });
      this.isActive = true;
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link core/lights/Light.Light | lights} has been overflowed or when the {@link renderer} has changed.
     */
    reset() {
      this.onPropertyChanged("isActive", this.isActive ? 1 : 0);
      if (this.isActive) {
        this.onPropertyChanged("intensity", this.intensity);
        this.onPropertyChanged("bias", this.bias);
        this.onPropertyChanged("normalBias", this.normalBias);
        this.onPropertyChanged("pcfSamples", this.pcfSamples);
      }
    }
    /**
     * Update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} input value and tell the {@link CameraRenderer#cameraLightsBindGroup | renderer camera, lights and shadows} bind group to update.
     * @param propertyKey - name of the property to update.
     * @param value - new value of the property.
     */
    onPropertyChanged(propertyKey, value) {
      if (this.rendererBinding && this.rendererBinding.childrenBindings.length > this.index) {
        if (value instanceof Mat4) {
          for (let i = 0; i < value.elements.length; i++) {
            this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value[i] = value.elements[i];
          }
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true;
        } else if (value instanceof Vec3) {
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].shouldUpdate = true;
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value.copy(value);
        } else {
          this.rendererBinding.childrenBindings[this.index].inputs[propertyKey].value = value;
        }
        this.renderer.shouldUpdateCameraLightsBindGroup();
      }
    }
    /**
     * Get whether this {@link Shadow} is actually casting shadows.
     * @returns - Whether this {@link Shadow} is actually casting shadows.
     */
    get isActive() {
      return __privateGet$g(this, _isActive);
    }
    /**
     * Start or stop casting shadows.
     * @param value - New active state.
     */
    set isActive(value) {
      if (!value && this.isActive) {
        this.destroy();
      } else if (value && !this.isActive) {
        if (this.renderer.ready) {
          this.init();
        } else {
          const taskId = this.renderer.onBeforeCommandEncoderCreation.add(
            () => {
              if (this.renderer.ready) {
                this.renderer.onBeforeCommandEncoderCreation.remove(taskId);
                this.init();
              }
            },
            { once: false }
          );
        }
      }
      __privateSet$g(this, _isActive, value);
    }
    /**
     * Get this {@link Shadow} intensity.
     * @returns - The {@link Shadow} intensity.
     */
    get intensity() {
      return __privateGet$g(this, _intensity);
    }
    /**
     * Set this {@link Shadow} intensity and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} intensity.
     */
    set intensity(value) {
      __privateSet$g(this, _intensity, value);
      this.onPropertyChanged("intensity", this.intensity);
      if (!value) {
        this.clearDepthTexture();
      }
    }
    /**
     * Get this {@link Shadow} bias.
     * @returns - The {@link Shadow} bias.
     */
    get bias() {
      return __privateGet$g(this, _bias);
    }
    /**
     * Set this {@link Shadow} bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} bias.
     */
    set bias(value) {
      __privateSet$g(this, _bias, value);
      this.onPropertyChanged("bias", this.bias);
    }
    /**
     * Get this {@link Shadow} normal bias.
     * @returns - The {@link Shadow} normal bias.
     */
    get normalBias() {
      return __privateGet$g(this, _normalBias);
    }
    /**
     * Set this {@link Shadow} normal bias and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} normal bias.
     */
    set normalBias(value) {
      __privateSet$g(this, _normalBias, value);
      this.onPropertyChanged("normalBias", this.normalBias);
    }
    /**
     * Get this {@link Shadow} PCF samples count.
     * @returns - The {@link Shadow} PCF samples count.
     */
    get pcfSamples() {
      return __privateGet$g(this, _pcfSamples);
    }
    /**
     * Set this {@link Shadow} PCF samples count and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link Shadow} PCF samples count.
     */
    set pcfSamples(value) {
      __privateSet$g(this, _pcfSamples, Math.max(1, Math.ceil(value)));
      this.onPropertyChanged("pcfSamples", this.pcfSamples);
    }
    /**
     * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget} and start rendering to the shadow map.
     */
    init() {
      if (!this.depthComparisonSampler) {
        const samplerExists = this.renderer.samplers.find((sampler) => sampler.name === "depthComparisonSampler");
        this.depthComparisonSampler = samplerExists || new Sampler(this.renderer, {
          label: "Depth comparison sampler",
          name: "depthComparisonSampler",
          // we do not want to repeat the shadows
          addressModeU: "clamp-to-edge",
          addressModeV: "clamp-to-edge",
          compare: "less",
          minFilter: "linear",
          magFilter: "linear",
          type: "comparison"
        });
      }
      this.setDepthTexture();
      this.depthTextureSize.onChange(() => this.onDepthTextureSizeChanged());
      if (!this.depthPassTarget) {
        this.createDepthPassTarget();
      }
      if (this.options.useRenderBundle && !this.renderBundle) {
        this.renderBundle = new RenderBundle(this.renderer, {
          label: `Depth render bundle for ${this.light.type}Shadow ${this.index}`,
          renderPass: this.depthPassTarget.renderPass,
          transparent: false,
          useBuffer: true,
          size: 1
        });
      }
      if (__privateGet$g(this, _autoRender)) {
        this.setDepthPass();
        this.onPropertyChanged("isActive", 1);
      }
    }
    /**
     * Reset the {@link depthTexture} when the {@link depthTextureSize} changes.
     */
    onDepthTextureSizeChanged() {
      this.setDepthTexture();
    }
    /**
     * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
     */
    setDepthTexture() {
      if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) {
        this.depthTexture.options.fixedSize.width = this.depthTextureSize.x;
        this.depthTexture.options.fixedSize.height = this.depthTextureSize.y;
        this.depthTexture.size.width = this.depthTextureSize.x;
        this.depthTexture.size.height = this.depthTextureSize.y;
        this.depthTexture.createTexture();
        if (this.depthPassTarget) {
          this.depthPassTarget.resize();
        }
      } else if (!this.depthTexture) {
        this.createDepthTexture();
      }
    }
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture() {
    }
    /** Destroy the {@link depthTexture}. */
    destroyDepthTexture() {
      this.depthTexture?.destroy();
      this.depthTexture = null;
      this.depthTextureSize.onChange(() => {
      });
    }
    /**
     * Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
     */
    clearDepthTexture() {
      if (!this.depthTexture || !this.depthTexture.texture) return;
      const commandEncoder = this.renderer.device.createCommandEncoder();
      !this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
      const renderPassDescriptor = {
        colorAttachments: [],
        depthStencilAttachment: {
          view: this.depthTexture.texture.createView({
            label: "Clear " + this.depthTexture.texture.label + " view"
          }),
          depthLoadOp: "clear",
          // Clear the depth attachment
          depthClearValue: 1,
          // Clear to the maximum depth (farthest possible depth)
          depthStoreOp: "store"
          // Store the cleared depth
        }
      };
      const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
      passEncoder.end();
      !this.renderer.production && commandEncoder.popDebugGroup();
      this.renderer.device.queue.submit([commandEncoder.finish()]);
    }
    /**
     * Create the {@link depthPassTarget}.
     */
    createDepthPassTarget() {
      this.depthPassTarget = new RenderTarget(this.renderer, {
        label: `Depth pass render target for ${this.light.type}Shadow ${this.index}`,
        useColorAttachments: false,
        depthTexture: this.depthTexture,
        sampleCount: this.sampleCount,
        autoRender: __privateGet$g(this, _autoRender)
      });
    }
    /**
     * Set our {@link depthPassTarget} corresponding {@link CameraRenderer#scene | scene} render pass entry custom render pass.
     */
    setDepthPass() {
      const renderPassEntry = this.renderer.scene.getRenderTargetPassEntry(this.depthPassTarget);
      renderPassEntry.useCustomRenderPass = (commandEncoder) => {
        if (this.renderer.ready) {
          this.render(commandEncoder);
        }
      };
    }
    /**
     * Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
     * - Render all the depth meshes.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     */
    render(commandEncoder) {
      if (!this.castingMeshes.size || !this.light.intensity || !this.intensity) return;
      let shouldRender = false;
      for (const [_uuid, mesh] of this.castingMeshes) {
        if (mesh.visible) {
          shouldRender = true;
          break;
        }
      }
      if (!shouldRender) {
        this.clearDepthTexture();
        return;
      }
      this.renderDepthPass(commandEncoder);
      this.renderer.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Render the shadow map only once. Useful with static scenes if autoRender has been set to `false` to only take one snapshot of the shadow map.
     */
    async renderOnce() {
      if (!__privateGet$g(this, _autoRender)) {
        this.onPropertyChanged("isActive", 1);
        await Promise.all(
          [...this.depthMeshes.values()].map(async (depthMesh) => {
            depthMesh.setGeometry();
            await depthMesh.material.compileMaterial();
          })
        );
        this.renderer.onBeforeRenderScene.add(
          (commandEncoder) => {
            this.render(commandEncoder);
          },
          {
            once: true
          }
        );
      }
    }
    /**
     * Render all the {@link castingMeshes} into the {@link depthPassTarget}.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     */
    renderDepthPass(commandEncoder) {
      this.renderer.pipelineManager.resetCurrentPipeline();
      const depthPass = this.depthPassTarget.renderPass.beginRenderPass(commandEncoder);
      if (!this.renderer.production)
        depthPass.pushDebugGroup(`${this.light.type}Shadow (index: ${this.index}): depth pass`);
      if (this.renderBundle) {
        this.renderBundle.render(depthPass);
      } else {
        for (const [uuid, depthMesh] of this.depthMeshes) {
          if (!this.castingMeshes.get(uuid)?.visible) {
            continue;
          }
          depthMesh.render(depthPass);
        }
      }
      if (!this.renderer.production) depthPass.popDebugGroup();
      depthPass.end();
    }
    /**
     * Get the default depth pass vertex shader for this {@link Shadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings = [], geometry }) {
      return {
        /** Returned code. */
        code: `@vertex fn main(@location(0) position: vec4f) -> @builtin(position) vec4f { return position; }`
      };
    }
    /**
     * Get the default depth pass fragment shader for this {@link Shadow}.
     * @returns - A {@link ShaderOptions} if a depth pass fragment shader is needed, `false` otherwise.
     */
    getDefaultShadowDepthFs() {
      return false;
    }
    /**
     * Patch the given {@link Mesh | mesh} material parameters to create the depth mesh.
     * @param mesh - original {@link Mesh | mesh} to use.
     * @param parameters - Optional additional parameters to use for the depth mesh.
     * @returns - Patched parameters.
     */
    patchShadowCastingMeshParams(mesh, parameters = {}) {
      parameters = { ...mesh.material.options.rendering, ...parameters };
      parameters.targets = [];
      const bindings = [];
      mesh.material.inputsBindings.forEach((binding) => {
        if (binding.name.includes("skin") || binding.name.includes("morphTarget")) {
          bindings.push(binding);
        }
      });
      const instancesBinding = mesh.material.getBufferBindingByName("instances");
      if (instancesBinding) {
        bindings.push(instancesBinding);
      }
      if (parameters.bindings) {
        parameters.bindings = [...bindings, ...parameters.bindings];
      } else {
        parameters.bindings = [...bindings];
      }
      if (!parameters.shaders) {
        parameters.shaders = {
          vertex: this.getDefaultShadowDepthVs({ bindings, geometry: mesh.geometry }),
          fragment: this.getDefaultShadowDepthFs()
        };
      }
      return parameters;
    }
    /**
     * Add a {@link Mesh} to the shadow map. Internally called by the {@link Mesh} if its `castShadows` parameters has been set to `true`, but can also be called externally to selectively cast shadows or to add specific parameters (such as custom depth pass shaders).
     * - {@link patchShadowCastingMeshParams | Patch} the parameters.
     * - Create a new depth {@link Mesh} with the patched parameters.
     * - Add the {@link Mesh} to the {@link castingMeshes} Map.
     * @param mesh - {@link Mesh} to add to the shadow map.
     * @param parameters - Optional {@link RenderMaterialParams | parameters} to use for the depth mesh.
     */
    addShadowCastingMesh(mesh, parameters = {}) {
      if (this.castingMeshes.get(mesh.uuid)) return;
      mesh.options.castShadows = true;
      parameters = this.patchShadowCastingMeshParams(mesh, parameters);
      if (this.depthMeshes.get(mesh.uuid)) {
        this.depthMeshes.get(mesh.uuid).remove();
        this.depthMeshes.delete(mesh.uuid);
      }
      if (this.renderBundle) {
        this.renderBundle.size = this.depthMeshes.size + 1;
      }
      const depthMesh = new Mesh(this.renderer, {
        label: `${this.light.type}Shadow (index: ${this.index}) ${mesh.options.label} depth mesh`,
        ...parameters,
        geometry: mesh.geometry,
        // explicitly set empty output targets
        // we just want to write to the depth texture
        targets: [],
        outputTarget: this.depthPassTarget,
        frustumCulling: false,
        // draw shadow even if original mesh is hidden
        autoRender: __privateGet$g(this, _autoRender),
        ...this.renderBundle && { renderBundle: this.renderBundle }
      });
      if (!__privateGet$g(this, _autoRender) && this.renderBundle) {
        this.renderBundle.meshes.set(depthMesh.uuid, depthMesh);
      }
      depthMesh.parent = mesh;
      this.depthMeshes.set(mesh.uuid, depthMesh);
      this.castingMeshes.set(mesh.uuid, mesh);
    }
    /**
     * Add a shadow receiving {@link Mesh} to the #receivingMeshes {@link Map}.
     * @param mesh - Shadow receiving {@link Mesh} to add.
     */
    addShadowReceivingMesh(mesh) {
      __privateGet$g(this, _receivingMeshes).set(mesh.uuid, mesh);
    }
    /**
     * Remove a shadow receiving {@link Mesh} from the #receivingMeshes {@link Map}.
     * @param mesh - Shadow receiving {@link Mesh} to remove.
     */
    removeShadowReceivingMesh(mesh) {
      __privateGet$g(this, _receivingMeshes).delete(mesh.uuid);
      if (__privateGet$g(this, _receivingMeshes).size === 0 && !this.isActive) {
        this.destroyDepthTexture();
      }
    }
    /**
     * Remove a {@link Mesh} from the shadow map and destroy its depth mesh.
     * @param mesh - {@link Mesh} to remove.
     */
    removeMesh(mesh) {
      const depthMesh = this.depthMeshes.get(mesh.uuid);
      if (depthMesh) {
        depthMesh.remove();
        this.depthMeshes.delete(mesh.uuid);
      }
      this.castingMeshes.delete(mesh.uuid);
      if (this.castingMeshes.size === 0) {
        this.clearDepthTexture();
      }
    }
    /**
     * If one of the {@link castingMeshes} had its geometry change, update the corresponding depth mesh geometry as well.
     * @param mesh - Original {@link Mesh} which geometry just changed.
     * @param geometry - New {@link Mesh} {@link Geometry} to use.
     */
    updateMeshGeometry(mesh, geometry) {
      const depthMesh = this.depthMeshes.get(mesh.uuid);
      if (depthMesh) {
        depthMesh.useGeometry(geometry);
      }
    }
    /**
     * Destroy the {@link Shadow}.
     */
    destroy() {
      this.onPropertyChanged("isActive", 0);
      __privateSet$g(this, _isActive, false);
      if (this.renderBundle) {
        this.renderBundle.destroy();
      }
      this.castingMeshes.forEach((mesh) => this.removeMesh(mesh));
      this.castingMeshes = /* @__PURE__ */ new Map();
      this.depthMeshes = /* @__PURE__ */ new Map();
      this.depthPassTarget?.destroy();
      if (__privateGet$g(this, _receivingMeshes).size === 0) {
        this.destroyDepthTexture();
      }
    }
  }
  _intensity = new WeakMap();
  _bias = new WeakMap();
  _normalBias = new WeakMap();
  _pcfSamples = new WeakMap();
  _isActive = new WeakMap();
  _autoRender = new WeakMap();
  _receivingMeshes = new WeakMap();
  _Shadow_instances = new WeakSet();
  // TODO unused for now, should we really consider this case?
  // updateIndex(index: number) {
  //   const shouldUpdateIndex = index !== this.index
  //
  //   this.index = index
  //
  //   if (shouldUpdateIndex) {
  //     throwWarning(`This ${this.light.type}Shadow index has changed, the shaders need to be recreated`)
  //   }
  // }
  /**
   * Set the {@link Shadow} parameters.
   * @param parameters - Parameters to use for this {@link Shadow}.
   * @private
   */
  setParameters_fn = function({
    intensity = 1,
    bias = 0,
    normalBias = 0,
    pcfSamples = 1,
    depthTextureSize = new Vec2(512),
    depthTextureFormat = "depth24plus",
    autoRender = true,
    useRenderBundle = true
  } = {}) {
    this.intensity = intensity;
    this.bias = bias;
    this.normalBias = normalBias;
    this.pcfSamples = pcfSamples;
    this.depthTextureSize = depthTextureSize;
    this.depthTextureFormat = depthTextureFormat;
    __privateSet$g(this, _autoRender, autoRender);
    this.options.useRenderBundle = useRenderBundle;
  };

  const declareAttributesVars$1 = ({ geometry }) => {
    let attributeVars = geometry.vertexBuffers.map(
      (vertexBuffer) => vertexBuffer.attributes.map((attribute) => {
        return (
          /* wgsl */
          `
  var ${attribute.name}: ${attribute.type} = attributes.${attribute.name};`
        );
      }).join("")
    ).join("\n");
    attributeVars += /* wgsl */
    `
  var instanceIndex: u32 = attributes.instanceIndex;
  `;
    return attributeVars;
  };

  const getMorphTargets = ({ bindings = [], geometry }) => {
    let morphTargets = "";
    const morphTargetsBindings = bindings.filter((binding) => binding.name.includes("morphTarget"));
    morphTargetsBindings.forEach((binding) => {
      const morphAttributes = Object.values(binding.inputs).filter((input) => input.name !== "weight");
      morphAttributes.forEach((input) => {
        const bindingType = BufferElement.getType(input.type);
        const attribute = geometry.getAttributeByName(input.name);
        if (attribute) {
          const attributeType = attribute.type;
          const attributeBindingVar = morphAttributes.length === 1 ? `${binding.name}.${input.name}[attributes.vertexIndex]` : `${binding.name}.elements[attributes.vertexIndex].${input.name}`;
          if (bindingType === attributeType) {
            morphTargets += `${input.name} += ${binding.name}.weight * ${attributeBindingVar};
	`;
          } else {
            if (bindingType === "vec3f" && attributeType === "vec4f") {
              morphTargets += `${input.name} += ${binding.name}.weight * vec4(${attributeBindingVar}, 0.0);
	`;
            }
          }
        }
      });
    });
    return morphTargets;
  };

  const getVertexSkinnedPositionNormal = ({ bindings = [], geometry }) => {
    let output = "";
    const hasInstances = geometry.instancesCount > 1 && bindings.find((binding) => binding.name === "instances");
    const skinJoints = [];
    const skinWeights = [];
    if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
      geometry.vertexBuffers.forEach((vertexBuffer) => {
        vertexBuffer.attributes.forEach((attribute) => {
          if (attribute.name.includes("joints")) {
            skinJoints.push(attribute);
          }
          if (attribute.name.includes("weights")) {
            skinWeights.push(attribute);
          }
        });
      });
    }
    const skinBindings = bindings.filter((binding) => binding.name.includes("skin"));
    const hasSkin = skinJoints.length && skinWeights.length && skinBindings.length;
    if (hasSkin) {
      output += hasInstances ? `
  var instancesWorldPosition = array<vec4f, ${geometry.instancesCount}>();
  var instancesNormal = array<vec3f, ${geometry.instancesCount}>();
      ` : "";
      output += `
  let skinJoints: vec4f = ${skinJoints.map((skinJoint) => skinJoint.name).join(" + ")};`;
      output += `
  var skinWeights: vec4f = ${skinWeights.map((skinWeight) => skinWeight.name).join(" + ")};
  
  let skinWeightsSum = dot(skinWeights, vec4(1.0));
  if(skinWeightsSum > 0.0) {
    skinWeights = skinWeights / skinWeightsSum;
  }
    `;
      skinBindings.forEach((binding, bindingIndex) => {
        output += /* wgsl */
        `
  ${hasInstances ? "// instancing with different skins: joints calculations for skin " + bindingIndex + "\n" : ""}
  // position
  let skinMatrix_${bindingIndex}: mat4x4f = 
    skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].jointMatrix +
    skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].jointMatrix +
    skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].jointMatrix +
    skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].jointMatrix;
      
  ${hasInstances ? "instancesWorldPosition[" + bindingIndex + "] = skinMatrix_" + bindingIndex + " * worldPosition;" : "worldPosition = skinMatrix_" + bindingIndex + " * worldPosition;"}
      
  // normal
  let skinNormalMatrix_${bindingIndex}: mat4x4f = 
    skinWeights.x * ${binding.name}.joints[u32(skinJoints.x)].normalMatrix +
    skinWeights.y * ${binding.name}.joints[u32(skinJoints.y)].normalMatrix +
    skinWeights.z * ${binding.name}.joints[u32(skinJoints.z)].normalMatrix +
    skinWeights.w * ${binding.name}.joints[u32(skinJoints.w)].normalMatrix;
    
  let skinNormalMatrix_${bindingIndex}_3: mat3x3f = mat3x3f(
    vec3(skinNormalMatrix_${bindingIndex}[0].xyz),
    vec3(skinNormalMatrix_${bindingIndex}[1].xyz),
    vec3(skinNormalMatrix_${bindingIndex}[2].xyz)
  );
      
  ${hasInstances ? "instancesNormal[" + bindingIndex + "] = skinNormalMatrix_" + bindingIndex + "_3 * normal;" : "normal = skinNormalMatrix_" + bindingIndex + "_3 * normal;"}
      `;
      });
    }
    output += /* wgsl */
    `
  var modelMatrix: mat4x4f;
  `;
    if (hasInstances) {
      if (hasSkin) {
        output += /* wgsl */
        `
  worldPosition = instancesWorldPosition[instanceIndex];
  normal = instancesNormal[instanceIndex];
      `;
      }
      output += /* wgsl */
      `
  modelMatrix = instances.matrices[instanceIndex].model;
  worldPosition = modelMatrix * worldPosition;
  
  normal = normalize(instances.matrices[instanceIndex].normal * normal);
    `;
    } else {
      output += /* wgsl */
      `
  modelMatrix = matrices.model;
  worldPosition = modelMatrix * worldPosition;
  normal = getWorldNormal(normal);
    `;
    }
    return output;
  };

  const getVertexTransformedPositionNormal = ({
    bindings = [],
    geometry
  }) => {
    let output = "";
    output += getMorphTargets({ bindings, geometry });
    output += /* wgsl */
    `
  var worldPosition: vec4f = vec4(position, 1.0);
  `;
    output += getVertexSkinnedPositionNormal({ bindings, geometry });
    return output;
  };

  const getDefaultDirectionalShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
    /* wgsl */
    `
@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  let directionalShadow: DirectionalShadowsElement = directionalShadows.directionalShadowsElements[${lightIndex}];
  
  ${declareAttributesVars$1({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  let viewMatrix: mat4x4f = directionalShadow.viewMatrix;
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Light direction remains constant in shadow space
  let lightDirection: vec3f = normalize((viewMatrix * vec4(-directionalShadow.direction, 0.0)).xyz);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = directionalShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  // Transform to shadow clip space
  return directionalShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
}`
  );

  var __typeError$g = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$g = (obj, member, msg) => member.has(obj) || __typeError$g("Cannot " + msg);
  var __privateGet$f = (obj, member, getter) => (__accessCheck$g(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$g = (obj, member, value) => member.has(obj) ? __typeError$g("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$f = (obj, member, value, setter) => (__accessCheck$g(obj, member, "write to private field"), member.set(obj, value), value);
  var _direction$2;
  const directionalShadowStruct = {
    ...shadowStruct,
    direction: {
      type: "vec3f",
      value: new Vec3()
    },
    viewMatrix: {
      type: "mat4x4f",
      value: new Float32Array(16)
    },
    projectionMatrix: {
      type: "mat4x4f",
      value: new Float32Array(16)
    }
  };
  class DirectionalShadow extends Shadow {
    /**
     * DirectionalShadow constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalShadow}.
     * @param parameters - {@link DirectionalShadowParams} used to create this {@link DirectionalShadow}.
     */
    constructor(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      useRenderBundle,
      camera = {
        left: -10,
        right: 10,
        bottom: -10,
        top: 10,
        near: 0.1,
        far: 150
      }
    } = {}) {
      super(renderer, {
        light,
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle
      });
      /**
       * Direction of the parent {@link DirectionalLight}. Duplicate to avoid adding the {@link DirectionalLight} binding to vertex shaders.
       * @private
       */
      __privateAdd$g(this, _direction$2);
      this.options = {
        ...this.options,
        camera
      };
      this.camera = new OrthographicCamera({
        left: camera.left,
        right: camera.right,
        top: camera.top,
        bottom: camera.bottom,
        near: camera.near,
        far: camera.far,
        onMatricesChanged: () => {
          this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
          this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
        }
      });
      this.camera.position.set(0);
      this.camera.parent = this.light;
      __privateSet$f(this, _direction$2, new Vec3());
    }
    /**
     * Set or reset this {@link DirectionalShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding() {
      this.rendererBinding = this.renderer.bindings.directionalShadows;
    }
    /**
     * Set the parameters and start casting shadows by setting the {@link isActive} setter to `true`.<br>
     * Called internally by the associated {@link DirectionalLight} if any shadow parameters are specified when creating it. Can also be called directly.
     * @param parameters - parameters to use for this {@link DirectionalShadow}.
     */
    cast({
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      useRenderBundle,
      camera
    } = {}) {
      if (camera) {
        this.camera.left = camera.left ?? -10;
        this.camera.right = camera.right ?? 10;
        this.camera.top = camera.top ?? 10;
        this.camera.bottom = camera.bottom ?? -10;
        this.camera.near = camera.near ?? 0.1;
        this.camera.far = camera.far ?? 150;
      }
      super.cast({
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle
      });
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link DirectionalLight} has been overflowed or when the {@link renderer} has changed.
     */
    reset() {
      this.setRendererBinding();
      super.reset();
      this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
      this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
      this.onPropertyChanged("direction", __privateGet$f(this, _direction$2));
    }
    /**
     * Copy the {@link DirectionalLight} direction and update binding.
     * @param direction - {@link DirectionalLight} direction to copy.
     */
    setDirection(direction = new Vec3()) {
      __privateGet$f(this, _direction$2).copy(direction);
      this.onPropertyChanged("direction", __privateGet$f(this, _direction$2));
    }
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture() {
      this.depthTexture = new Texture(this.renderer, {
        label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
        name: "directionalShadowDepthTexture" + this.index,
        type: "depth",
        format: this.depthTextureFormat,
        sampleCount: this.sampleCount,
        fixedSize: {
          width: this.depthTextureSize.x,
          height: this.depthTextureSize.y
        },
        autoDestroy: false
        // do not destroy when removing a mesh
      });
    }
    /**
     * Get the default depth pass vertex shader for this {@link Shadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings = [], geometry }) {
      return {
        /** Returned code. */
        code: getDefaultDirectionalShadowDepthVs(this.index, { bindings, geometry })
      };
    }
  }
  _direction$2 = new WeakMap();

  var __typeError$f = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$f = (obj, member, msg) => member.has(obj) || __typeError$f("Cannot " + msg);
  var __privateGet$e = (obj, member, getter) => (__accessCheck$f(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$f = (obj, member, value) => member.has(obj) ? __typeError$f("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$e = (obj, member, value, setter) => (__accessCheck$f(obj, member, "write to private field"), member.set(obj, value), value);
  var _direction$1;
  class DirectionalLight extends Light {
    /**
     * DirectionalLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link DirectionalLight}.
     * @param parameters - {@link DirectionalLightBaseParams} used to create this {@link DirectionalLight}.
     */
    constructor(renderer, {
      label = "DirectionalLight",
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(1),
      target = new Vec3(),
      shadow = null
    } = {}) {
      const type = "directionalLights";
      super(renderer, { label, color, intensity, type });
      /**
       * The {@link Vec3 | direction} of the {@link DirectionalLight} is the {@link target} minus the actual {@link position}.
       * @private
       */
      __privateAdd$f(this, _direction$1);
      this.options = {
        ...this.options,
        position,
        target,
        shadow
      };
      __privateSet$e(this, _direction$1, new Vec3());
      this.position.copy(position);
      this.target = new Vec3();
      this.target.onChange(() => {
        this.lookAt(this.target);
      });
      this.target.copy(target);
      this.position.onChange(() => {
        this.lookAt(this.target);
      });
      if (this.target.lengthSq() === 0) {
        this.lookAt(this.target);
      }
      this.parent = this.renderer.scene;
      this.shadow = new DirectionalShadow(this.renderer, {
        autoRender: false,
        // will be set by calling cast()
        light: this
      });
      if (shadow) {
        this.shadow.cast(shadow);
      }
    }
    /**
     * Set or reset this {@link DirectionalLight} {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      super.setRenderer(renderer);
      if (this.shadow) {
        this.shadow.setRenderer(renderer);
      }
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link DirectionalLight} has been overflowed or when updating the {@link DirectionalLight} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link DirectionalLight} shadow if any. Set to `true` when the {@link renderer} number of {@link DirectionalLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
     */
    reset(resetShadow = true) {
      super.reset();
      this.onPropertyChanged("direction", __privateGet$e(this, _direction$1));
      if (this.shadow && resetShadow) {
        this.shadow.reset();
      }
    }
    /**
     * Get this {@link DirectionalLight} intensity.
     * @returns - The {@link DirectionalLight} intensity.
     */
    get intensity() {
      return super.intensity;
    }
    /**
     * Set this {@link DirectionalLight} intensity and clear shadow if intensity is `0`.
     * @param value - The new {@link DirectionalLight} intensity.
     */
    set intensity(value) {
      super.intensity = value;
      if (this.shadow && this.shadow.isActive && !value) {
        this.shadow.clearDepthTexture();
      }
    }
    /**
     * Set the {@link DirectionalLight} direction based on the {@link target} and the {@link worldMatrix} translation.
     */
    setDirection() {
      __privateGet$e(this, _direction$1).copy(this.target).sub(this.actualPosition).normalize();
      this.onPropertyChanged("direction", __privateGet$e(this, _direction$1));
      if (this.shadow) {
        this.shadow.setDirection(__privateGet$e(this, _direction$1));
      }
    }
    /**
     * Rotate this {@link DirectionalLight} so it looks at the {@link Vec3 | target}.
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
     * If the {@link modelMatrix | model matrix} has been updated, set the new direction from the {@link worldMatrix} translation.
     */
    updateMatrixStack() {
      super.updateMatrixStack();
      if (this.matricesNeedUpdate) {
        this.setDirection();
      }
    }
    /**
     * Tell the {@link renderer} that the maximum number of {@link DirectionalLight} has been overflown.
     * @param lightsType - {@link type} of this light.
     */
    onMaxLightOverflow(lightsType) {
      super.onMaxLightOverflow(lightsType);
      this.shadow?.setRendererBinding();
    }
    /**
     * Destroy this {@link DirectionalLight} and associated {@link DirectionalShadow}.
     */
    destroy() {
      super.destroy();
      this.shadow?.destroy();
    }
  }
  _direction$1 = new WeakMap();

  const getDefaultPointShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
    /* wgsl */
    `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> PointShadowVSOutput {  
  var pointShadowVSOutput: PointShadowVSOutput;
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  ${declareAttributesVars$1({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  let worldPos = worldPosition.xyz / worldPosition.w;
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  let viewMatrix: mat4x4f = pointShadow.viewMatrices[cubeFace.face];
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;
  let lightViewPos: vec3f = (viewMatrix * vec4(pointShadow.position, 1.0)).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Compute light direction in shadow space
  let lightDirection: vec3f = normalize(lightViewPos - shadowViewPos);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = pointShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  pointShadowVSOutput.position = pointShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
  pointShadowVSOutput.worldPosition = worldPos;
  
  return pointShadowVSOutput;
}`
  );

  const getDefaultPointShadowDepthFs = (lightIndex = 0) => (
    /* wgsl */
    `
struct PointShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@fragment fn main(fsInput: PointShadowVSOutput) -> @builtin(frag_depth) f32 {
  let pointShadow: PointShadowsElement = pointShadows.pointShadowsElements[${lightIndex}];
  
  // get distance between fragment and light source
  var lightDistance: f32 = length(fsInput.worldPosition - pointShadow.position);
    
  // map to [0, 1] range by dividing by far plane - near plane
  lightDistance = (lightDistance - pointShadow.cameraNear) / (pointShadow.cameraFar - pointShadow.cameraNear);
  
  // write this as modified depth
  return saturate(lightDistance);
}`
  );

  var __typeError$e = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$e = (obj, member, msg) => member.has(obj) || __typeError$e("Cannot " + msg);
  var __privateGet$d = (obj, member, getter) => (__accessCheck$e(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$e = (obj, member, value) => member.has(obj) ? __typeError$e("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$d = (obj, member, value, setter) => (__accessCheck$e(obj, member, "write to private field"), member.set(obj, value), value);
  var _tempCubeDirection, _viewMatrices;
  const pointShadowStruct = {
    ...shadowStruct,
    position: {
      type: "vec3f",
      value: new Vec3()
    },
    cameraNear: {
      type: "f32",
      value: 0
    },
    cameraFar: {
      type: "f32",
      value: 0
    },
    projectionMatrix: {
      type: "mat4x4f",
      value: new Float32Array(16)
    },
    viewMatrices: {
      type: "array<mat4x4f>",
      value: new Float32Array(16 * 6)
    }
  };
  class PointShadow extends Shadow {
    /**
     * PointShadow constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link PointShadow}.
     * @param parameters - {@link PointShadowParams} used to create this {@link PointShadow}.
     */
    constructor(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender
    } = {}) {
      super(renderer, {
        light,
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle: false
      });
      /**
       * {@link Vec3} used to calculate the actual current direction based on the {@link PointLight} position.
       * @private
       */
      __privateAdd$e(this, _tempCubeDirection);
      /**
       * Array of {@link Mat4} view matrices to use for cube map faces rendering.
       * @private
       */
      __privateAdd$e(this, _viewMatrices);
      this.cubeDirections = [
        new Vec3(-1, 0, 0),
        new Vec3(1, 0, 0),
        new Vec3(0, -1, 0),
        new Vec3(0, 1, 0),
        new Vec3(0, 0, -1),
        new Vec3(0, 0, 1)
      ];
      __privateSet$d(this, _tempCubeDirection, new Vec3());
      this.cubeUps = [
        new Vec3(0, -1, 0),
        new Vec3(0, -1, 0),
        new Vec3(0, 0, 1),
        new Vec3(0, 0, -1),
        new Vec3(0, -1, 0),
        new Vec3(0, -1, 0)
      ];
      __privateSet$d(this, _viewMatrices, []);
      for (let i = 0; i < 6; i++) {
        __privateGet$d(this, _viewMatrices).push(new Mat4());
      }
      this.camera = new PerspectiveCamera({
        fov: 90,
        near: 0.1,
        far: this.light.range !== 0 ? this.light.range : 150,
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y,
        onMatricesChanged: () => {
          this.onProjectionMatrixChanged();
        }
      });
      this.camera.matrices.view.onUpdate = () => {
        this.updateViewMatrices();
      };
      this.camera.position.set(0);
      this.camera.parent = this.light;
    }
    /**
     * Set or reset this {@link PointShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding() {
      this.rendererBinding = this.renderer.bindings.pointShadows;
    }
    /**
     * Set the parameters and start casting shadows. Force not using a {@link core/renderPasses/RenderBundle.RenderBundle | RenderBundle} since we'll need to swap faces bind groups during render.
     * @param parameters - Parameters to use for this {@link PointShadow}.
     */
    cast(parameters = {}) {
      super.cast({ ...parameters, useRenderBundle: false });
    }
    /**
     * Set the {@link depthComparisonSampler}, {@link depthTexture}, {@link depthPassTarget}, compute the {@link PointShadow#camera.projectionMatrix | camera projection matrix} and start rendering to the shadow map.
     */
    init() {
      super.init();
      this.onProjectionMatrixChanged();
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link PointLight} has been overflowed or when the {@link renderer} has changed.
     */
    reset() {
      this.setRendererBinding();
      super.reset();
      this.onProjectionMatrixChanged();
      this.updateViewMatrices();
      this.setPosition();
    }
    /**
     * Copy the {@link PointLight} actual position and update binding.
     */
    setPosition() {
      this.onPropertyChanged("position", this.light.actualPosition);
    }
    /**
     * Called whenever the {@link PerspectiveCamera#projectionMatrix | camera projectionMatrix} changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    onProjectionMatrixChanged() {
      this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
      this.onPropertyChanged("cameraNear", this.camera.near);
      this.onPropertyChanged("cameraFar", this.camera.far);
    }
    /**
     * Update the #viewMatrices and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    updateViewMatrices() {
      for (let i = 0; i < 6; i++) {
        __privateGet$d(this, _tempCubeDirection).copy(this.cubeDirections[i]).add(this.camera.actualPosition);
        __privateGet$d(this, _viewMatrices)[i].makeView(this.camera.actualPosition, __privateGet$d(this, _tempCubeDirection), this.cubeUps[i]);
        for (let j = 0; j < 16; j++) {
          this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.value[i * 16 + j] = __privateGet$d(this, _viewMatrices)[i].elements[j];
        }
      }
      this.onViewMatricesChanged();
    }
    /**
     * Called whenever the #viewMatrices changed (or on reset) to update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    onViewMatricesChanged() {
      this.rendererBinding.childrenBindings[this.index].inputs.viewMatrices.shouldUpdate = true;
    }
    /**
     * Set or resize the {@link depthTexture} and eventually resize the {@link depthPassTarget} as well.
     */
    setDepthTexture() {
      if (this.depthTexture && (this.depthTexture.size.width !== this.depthTextureSize.x || this.depthTexture.size.height !== this.depthTextureSize.y)) {
        const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
        this.depthTexture.options.fixedSize.width = maxSize;
        this.depthTexture.options.fixedSize.height = maxSize;
        this.depthTexture.size.width = maxSize;
        this.depthTexture.size.height = maxSize;
        this.depthTexture.createTexture();
        if (this.depthPassTarget) {
          this.depthPassTarget.resize();
        }
      } else if (!this.depthTexture) {
        this.createDepthTexture();
      }
    }
    /**
     * Create the cube {@link depthTexture}.
     */
    createDepthTexture() {
      const maxSize = Math.max(this.depthTextureSize.x, this.depthTextureSize.y);
      this.depthTexture = new Texture(this.renderer, {
        label: `${this.light.options.label} (index: ${this.index}) shadow depth texture`,
        name: "pointShadowCubeDepthTexture" + this.index,
        type: "depth",
        format: this.depthTextureFormat,
        viewDimension: "cube",
        sampleCount: this.sampleCount,
        fixedSize: {
          width: maxSize,
          height: maxSize
        },
        autoDestroy: false
        // do not destroy when removing a mesh
      });
    }
    /**
     * Clear the content of the depth texture. Called whenever the {@link castingMeshes} {@link Map} is empty after having removed a mesh, or if all {@link castingMeshes} `visible` properties are `false`.
     */
    clearDepthTexture() {
      if (!this.depthTexture || !this.depthTexture.texture) return;
      const commandEncoder = this.renderer.device.createCommandEncoder();
      !this.renderer.production && commandEncoder.pushDebugGroup(`Clear ${this.depthTexture.texture.label} command encoder`);
      for (let i = 0; i < 6; i++) {
        const view = this.depthTexture.texture.createView({
          label: "Clear " + this.depthTexture.texture.label + " cube face view",
          dimension: "2d",
          arrayLayerCount: 1,
          baseArrayLayer: i
        });
        const renderPassDescriptor = {
          colorAttachments: [],
          depthStencilAttachment: {
            view,
            depthLoadOp: "clear",
            // Clear the depth attachment
            depthClearValue: 1,
            // Clear to the maximum depth (farthest possible depth)
            depthStoreOp: "store"
            // Store the cleared depth
          }
        };
        const passEncoder = this.depthPassTarget.renderPass.beginRenderPass(commandEncoder, renderPassDescriptor);
        passEncoder.end();
      }
      !this.renderer.production && commandEncoder.popDebugGroup();
      this.renderer.device.queue.submit([commandEncoder.finish()]);
    }
    /**
     * Render the depth pass. Called by the {@link CameraRenderer#scene | scene} when rendering the {@link depthPassTarget} render pass entry, or by the {@link renderOnce} method.<br />
     * - For each face of the depth cube texture:
     *   - Set the {@link depthPassTarget} descriptor depth texture view to our depth cube texture current face.
     *   - Render all the depth meshes.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     */
    render(commandEncoder) {
      if (!this.castingMeshes.size || !this.light.intensity || !this.intensity) return;
      let shouldRender = false;
      for (const [_uuid, mesh] of this.castingMeshes) {
        if (mesh.visible) {
          shouldRender = true;
          break;
        }
      }
      if (!shouldRender) {
        this.clearDepthTexture();
        return;
      }
      for (let face = 0; face < 6; face++) {
        this.depthPassTarget.renderPass.setRenderPassDescriptor(
          this.depthTexture.texture.createView({
            label: this.depthTexture.texture.label + " cube face view " + face,
            dimension: "2d",
            arrayLayerCount: 1,
            baseArrayLayer: face
          })
        );
        this.renderDepthPass(commandEncoder, face);
      }
      this.renderer.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Render all the {@link castingMeshes} into the {@link depthPassTarget}. Before rendering them, we swap the cube face bind group with the {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} at the index containing the current face onto which we'll draw.
     * @param commandEncoder - {@link GPUCommandEncoder} to use.
     * @param face - Current cube map face onto which we're drawing.
     */
    renderDepthPass(commandEncoder, face = 0) {
      this.renderer.pipelineManager.resetCurrentPipeline();
      const depthPass = commandEncoder.beginRenderPass(this.depthPassTarget.renderPass.descriptor);
      if (!this.renderer.production)
        depthPass.pushDebugGroup(`${this.light.type}Shadow (index: ${this.index}): depth pass for face ${face}`);
      for (const [uuid, depthMesh] of this.depthMeshes) {
        if (!this.castingMeshes.get(uuid)?.visible) {
          continue;
        }
        const cubeFaceBindGroupIndex = depthMesh.material.bindGroups.length - 1;
        this.renderer.pointShadowsCubeFaceBindGroups[face].setIndex(cubeFaceBindGroupIndex);
        depthMesh.material.bindGroups[cubeFaceBindGroupIndex] = this.renderer.pointShadowsCubeFaceBindGroups[face];
        if (face === 0) {
          depthMesh.render(depthPass);
        } else {
          depthMesh.material.onBeforeRender();
          depthMesh.onRenderPass(depthPass);
        }
      }
      if (!this.renderer.production) depthPass.popDebugGroup();
      depthPass.end();
    }
    /**
     * Get the default depth pass vertex shader for this {@link PointShadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings = [], geometry }) {
      return {
        /** Returned code. */
        code: getDefaultPointShadowDepthVs(this.index, { bindings, geometry })
      };
    }
    /**
     * Get the default depth pass {@link types/Materials.ShaderOptions | fragment shader options} for this {@link PointShadow}.
     * @returns - A {@link types/Materials.ShaderOptions | ShaderOptions} with the depth pass fragment shader.
     */
    getDefaultShadowDepthFs() {
      return {
        /** Returned code. */
        code: getDefaultPointShadowDepthFs(this.index)
      };
    }
    /**
     * Patch the given {@link Mesh} material parameters to create the depth mesh. Here we'll be adding the first {@link CameraRenderer.pointShadowsCubeFaceBindGroups | renderer pointShadowsCubeFaceBindGroups} bind group containing the face index onto which we'll be drawing. This bind group will be swapped when rendering using {@link renderDepthPass}.
     * @param mesh - original {@link Mesh} to use.
     * @param parameters - Optional additional parameters to use for the depth mesh.
     * @returns - Patched parameters.
     */
    patchShadowCastingMeshParams(mesh, parameters = {}) {
      if (!parameters.bindGroups) {
        parameters.bindGroups = [];
      }
      parameters.bindGroups = [...parameters.bindGroups, this.renderer.pointShadowsCubeFaceBindGroups[0]];
      return super.patchShadowCastingMeshParams(mesh, parameters);
    }
  }
  _tempCubeDirection = new WeakMap();
  _viewMatrices = new WeakMap();

  var __typeError$d = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$d = (obj, member, msg) => member.has(obj) || __typeError$d("Cannot " + msg);
  var __privateGet$c = (obj, member, getter) => (__accessCheck$d(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$d = (obj, member, value) => member.has(obj) ? __typeError$d("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$c = (obj, member, value, setter) => (__accessCheck$d(obj, member, "write to private field"), member.set(obj, value), value);
  var _range$1;
  class PointLight extends Light {
    /**
     * PointLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link PointLight}.
     * @param parameters - {@link PointLightBaseParams} used to create this {@link PointLight}.
     */
    constructor(renderer, {
      label = "PointLight",
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(),
      range = 0,
      shadow = null
    } = {}) {
      const type = "pointLights";
      super(renderer, { label, color, intensity, type });
      /** @ignore */
      __privateAdd$d(this, _range$1);
      this.options = {
        ...this.options,
        position,
        range,
        shadow
      };
      this.position.copy(position);
      this.range = range;
      this.parent = this.renderer.scene;
      this.shadow = new PointShadow(this.renderer, {
        autoRender: false,
        // will be set by calling cast()
        light: this
      });
      if (shadow) {
        this.shadow.cast(shadow);
      }
    }
    /**
     * Set or reset this {@link PointLight} {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      super.setRenderer(renderer);
      if (this.shadow) {
        this.shadow.setRenderer(renderer);
      }
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link PointLight} has been overflowed or when updating the {@link PointLight} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link PointLight} shadow if any. Set to `true` when the {@link renderer} number of {@link PointLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
     */
    reset(resetShadow = true) {
      super.reset();
      this.onPropertyChanged("range", this.range);
      this.onPropertyChanged("position", this.actualPosition);
      if (this.shadow && resetShadow) {
        this.shadow.reset();
      }
    }
    /**
     * Get this {@link PointLight} intensity.
     * @returns - The {@link PointLight} intensity.
     */
    get intensity() {
      return super.intensity;
    }
    /**
     * Set this {@link PointLight} intensity and clear shadow if intensity is `0`.
     * @param value - The new {@link PointLight} intensity.
     */
    set intensity(value) {
      super.intensity = value;
      if (this.shadow && this.shadow.isActive && !value) {
        this.shadow.clearDepthTexture();
      }
    }
    /**
     * Get this {@link PointLight} range.
     * @returns - The {@link PointLight} range.
     */
    get range() {
      return __privateGet$c(this, _range$1);
    }
    /**
     * Set this {@link PointLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link PointLight} range.
     */
    set range(value) {
      __privateSet$c(this, _range$1, Math.max(0, value));
      this.onPropertyChanged("range", this.range);
      if (this.shadow && this.range !== 0) {
        this.shadow.camera.far = this.range;
      }
    }
    /**
     * Set the {@link PointLight} position based on the {@link worldMatrix} translation.
     */
    setPosition() {
      this.onPropertyChanged("position", this.actualPosition);
      if (this.shadow) {
        this.shadow.setPosition();
      }
    }
    /**
     * If the {@link modelMatrix | model matrix} has been updated, set the new position from the {@link worldMatrix} translation.
     */
    updateMatrixStack() {
      super.updateMatrixStack();
      if (this.matricesNeedUpdate) {
        this.setPosition();
      }
    }
    /**
     * Tell the {@link renderer} that the maximum number of {@link PointLight} has been overflown.
     * @param lightsType - {@link type} of this light.
     */
    onMaxLightOverflow(lightsType) {
      super.onMaxLightOverflow(lightsType);
      this.shadow?.setRendererBinding();
    }
    /**
     * Destroy this {@link PointLight} and associated {@link PointShadow}.
     */
    destroy() {
      super.destroy();
      this.shadow?.destroy();
    }
  }
  _range$1 = new WeakMap();

  const getDefaultSpotShadowDepthVs = (lightIndex = 0, { bindings = [], geometry }) => (
    /* wgsl */
    `
struct SpotShadowVSOutput {
  @builtin(position) position: vec4f,
  @location(0) worldPosition: vec3f,
}

@vertex fn main(
  attributes: Attributes,
) -> @builtin(position) vec4f {  
  var spotShadowVSOutput: SpotShadowVSOutput;
  let spotShadow: SpotShadowsElement = spotShadows.spotShadowsElements[${lightIndex}];
  
  ${declareAttributesVars$1({ geometry })}
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  // shadows calculations in view space instead of world space
  // prevents world-space scaling issues for normal bias
  let viewMatrix: mat4x4f = spotShadow.viewMatrix;
  var shadowViewPos: vec3f = (viewMatrix * worldPosition).xyz;
  let lightViewPos: vec3f = (viewMatrix * vec4(spotShadow.position, 1.0)).xyz;

  // Transform normal into shadow view space
  let shadowNormal: vec3f = normalize((viewMatrix * vec4(normal, 0.0)).xyz);
  
  // Compute light direction in shadow space
  let lightDirection: vec3f = normalize(lightViewPos - shadowViewPos);
  
  let NdotL: f32 = dot(shadowNormal, lightDirection);
  let sinNdotL = sqrt(1.0 - NdotL * NdotL);
  let normalBias: f32 = spotShadow.normalBias * sinNdotL;
  
  // Apply bias in shadow view space
  shadowViewPos -= shadowNormal * normalBias;
  
  return spotShadow.projectionMatrix * vec4(shadowViewPos, 1.0);
}`
  );

  const spotShadowStruct = {
    ...shadowStruct,
    position: {
      type: "vec3f",
      value: new Vec3()
    },
    viewMatrix: {
      type: "mat4x4f",
      value: new Float32Array(16)
    },
    projectionMatrix: {
      type: "mat4x4f",
      value: new Float32Array(16)
    }
  };
  class SpotShadow extends Shadow {
    /**
     * SpotShadow constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotShadow}.
     * @param parameters - {@link SpotShadowParams} used to create this {@link SpotShadow}.
     */
    constructor(renderer, {
      light,
      intensity,
      bias,
      normalBias,
      pcfSamples,
      depthTextureSize,
      depthTextureFormat,
      autoRender,
      useRenderBundle
    } = {}) {
      super(renderer, {
        light,
        intensity,
        bias,
        normalBias,
        pcfSamples,
        depthTextureSize,
        depthTextureFormat,
        autoRender,
        useRenderBundle
      });
      this.focus = 1;
      this.camera = new PerspectiveCamera({
        near: 0.1,
        far: this.light.range !== 0 ? this.light.range : 150,
        fov: 180 / Math.PI * 2 * this.light.angle * this.focus,
        width: this.options.depthTextureSize.x,
        height: this.options.depthTextureSize.y,
        onMatricesChanged: () => {
          this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
          this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
        }
      });
      this.camera.position.set(0);
      this.camera.parent = this.light;
    }
    /**
     * Set or reset this {@link SpotShadow} {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     */
    setRendererBinding() {
      this.rendererBinding = this.renderer.bindings.spotShadows;
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of corresponding {@link SpotLight} has been overflowed or when the {@link renderer} has changed.
     */
    reset() {
      this.setRendererBinding();
      super.reset();
      this.onPropertyChanged("projectionMatrix", this.camera.projectionMatrix);
      this.onPropertyChanged("viewMatrix", this.camera.viewMatrix);
      this.setPosition();
    }
    /**
     * Copy the {@link SpotLight} actual position and update binding.
     */
    setPosition() {
      this.onPropertyChanged("position", this.light.actualPosition);
    }
    /**
     * Set the {@link PerspectiveCamera#fov | camera fov} based on the {@link SpotLight#angle | SpotLight angle}.
     */
    setCameraFov() {
      this.camera.fov = 180 / Math.PI * 2 * this.light.angle * this.focus;
    }
    /**
     * Reset the {@link depthTexture} when the {@link depthTextureSize} changes and update camera ratio.
     */
    onDepthTextureSizeChanged() {
      super.setDepthTexture();
      this.camera.setSize({
        width: this.depthTextureSize.x,
        height: this.depthTextureSize.y
      });
    }
    /**
     * Create the {@link depthTexture}.
     */
    createDepthTexture() {
      this.depthTexture = new Texture(this.renderer, {
        label: `${this.light.options.label} (index: ${this.light.index}) shadow depth texture`,
        name: "spotShadowDepthTexture" + this.index,
        type: "depth",
        format: this.depthTextureFormat,
        sampleCount: this.sampleCount,
        fixedSize: {
          width: this.depthTextureSize.x,
          height: this.depthTextureSize.y
        },
        autoDestroy: false
        // do not destroy when removing a mesh
      });
    }
    /**
     * Get the default depth pass vertex shader for this {@link SpotShadow}.
     * parameters - {@link VertexShaderInputBaseParams} used to compute the output `worldPosition` and `normal` vectors.
     * @returns - Depth pass vertex shader.
     */
    getDefaultShadowDepthVs({ bindings = [], geometry }) {
      return {
        /** Returned code. */
        code: getDefaultSpotShadowDepthVs(this.index, { bindings, geometry })
      };
    }
  }

  var __typeError$c = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$c = (obj, member, msg) => member.has(obj) || __typeError$c("Cannot " + msg);
  var __privateGet$b = (obj, member, getter) => (__accessCheck$c(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$c = (obj, member, value) => member.has(obj) ? __typeError$c("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$b = (obj, member, value, setter) => (__accessCheck$c(obj, member, "write to private field"), member.set(obj, value), value);
  var _direction, _angle, _penumbra, _range;
  class SpotLight extends Light {
    /**
     * SpotLight constructor
     * @param renderer - {@link CameraRenderer} or {@link GPUCurtains} used to create this {@link SpotLight}.
     * @param parameters - {@link SpotLightBaseParams} used to create this {@link SpotLight}.
     */
    constructor(renderer, {
      label = "SpotLight",
      color = new Vec3(1),
      intensity = 1,
      position = new Vec3(1),
      target = new Vec3(),
      angle = Math.PI / 3,
      penumbra = 0,
      range = 0,
      shadow = null
    } = {}) {
      const type = "spotLights";
      super(renderer, { label, color, intensity, type });
      /**
       * The {@link Vec3 | direction} of the {@link SpotLight} is the {@link target} minus the actual {@link position}.
       * @private
       */
      __privateAdd$c(this, _direction);
      /** @ignore */
      __privateAdd$c(this, _angle);
      /** @ignore */
      __privateAdd$c(this, _penumbra);
      /** @ignore */
      __privateAdd$c(this, _range);
      this.options = {
        ...this.options,
        position,
        range,
        angle,
        penumbra,
        target,
        shadow
      };
      __privateSet$b(this, _direction, new Vec3());
      this.position.copy(position);
      this.target = new Vec3();
      this.target.onChange(() => {
        this.lookAt(this.target);
      });
      this.target.copy(target);
      this.position.onChange(() => {
        this.lookAt(this.target);
      });
      if (this.target.lengthSq() === 0) {
        this.lookAt(this.target);
      }
      this.angle = angle;
      this.penumbra = penumbra;
      this.range = range;
      this.parent = this.renderer.scene;
      this.shadow = new SpotShadow(this.renderer, {
        autoRender: false,
        // will be set by calling cast()
        light: this
      });
      if (shadow) {
        this.shadow.cast(shadow);
      }
    }
    /**
     * Set or reset this {@link SpotLight} {@link CameraRenderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      super.setRenderer(renderer);
      if (this.shadow) {
        this.shadow.setRenderer(renderer);
      }
    }
    /**
     * Resend all properties to the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}. Called when the maximum number of {@link SpotLight} has been overflowed or when updating the {@link SpotLight} {@link renderer}.
     * @param resetShadow - Whether to reset the {@link SpotLight} shadow if any. Set to `true` when the {@link renderer} number of {@link SpotLight} has been overflown, `false` when the {@link renderer} has been changed (since the shadow will reset itself).
     */
    reset(resetShadow = true) {
      super.reset();
      this.onPropertyChanged("range", this.range);
      this.onPropertyChanged("coneCos", Math.cos(this.angle));
      this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
      this.onPropertyChanged("position", this.actualPosition);
      this.onPropertyChanged("direction", __privateGet$b(this, _direction));
      if (this.shadow && resetShadow) {
        this.shadow.reset();
      }
    }
    /**
     * Get this {@link SpotLight} intensity.
     * @returns - The {@link SpotLight} intensity.
     */
    get intensity() {
      return super.intensity;
    }
    /**
     * Set this {@link SpotLight} intensity and clear shadow if intensity is `0`.
     * @param value - The new {@link SpotLight} intensity.
     */
    set intensity(value) {
      super.intensity = value;
      if (this.shadow && this.shadow.isActive && !value) {
        this.shadow.clearDepthTexture();
      }
    }
    /**
     * Set the {@link SpotLight} position and direction based on the {@link target} and the {@link worldMatrix} translation.
     */
    setPositionDirection() {
      this.onPropertyChanged("position", this.actualPosition);
      __privateGet$b(this, _direction).copy(this.target).sub(this.actualPosition).normalize();
      this.onPropertyChanged("direction", __privateGet$b(this, _direction));
      if (this.shadow) {
        this.shadow.setPosition();
      }
    }
    /**
     * Get this {@link SpotLight} angle.
     * @returns - The {@link SpotLight} angle.
     */
    get angle() {
      return __privateGet$b(this, _angle);
    }
    /**
     * Set this {@link SpotLight} angle and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} angle in the `[0, PI / 2]` range.
     */
    set angle(value) {
      __privateSet$b(this, _angle, Math.min(Math.PI / 2, Math.max(0, value)));
      this.onPropertyChanged("coneCos", Math.cos(this.angle));
      this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
      this.shadow?.setCameraFov();
    }
    /**
     * Get this {@link SpotLight} penumbra.
     * @returns - The {@link SpotLight} penumbra.
     */
    get penumbra() {
      return __privateGet$b(this, _penumbra);
    }
    /**
     * Set this {@link SpotLight} penumbra and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} penumbra in the `[0, 1]` range.
     */
    set penumbra(value) {
      __privateSet$b(this, _penumbra, Math.min(1, Math.max(0, value)));
      this.onPropertyChanged("penumbraCos", Math.cos(this.angle * (1 - this.penumbra)));
    }
    /**
     * Get this {@link SpotLight} range.
     * @returns - The {@link SpotLight} range.
     */
    get range() {
      return __privateGet$b(this, _range);
    }
    /**
     * Set this {@link SpotLight} range and update the {@link CameraRenderer} corresponding {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param value - The new {@link SpotLight} range.
     */
    set range(value) {
      __privateSet$b(this, _range, Math.max(0, value));
      this.onPropertyChanged("range", this.range);
      if (this.shadow && this.range !== 0) {
        this.shadow.camera.far = this.range;
      }
    }
    /**
     * Rotate this {@link SpotLight} so it looks at the {@link Vec3 | target}.
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
     * If the {@link modelMatrix | model matrix} has been updated, set the new position and direction from the {@link worldMatrix} translation.
     */
    updateMatrixStack() {
      super.updateMatrixStack();
      if (this.matricesNeedUpdate) {
        this.setPositionDirection();
      }
    }
    /**
     * Tell the {@link renderer} that the maximum number of {@link SpotLight} has been overflown.
     * @param lightsType - {@link type} of this light.
     */
    onMaxLightOverflow(lightsType) {
      super.onMaxLightOverflow(lightsType);
      this.shadow?.setRendererBinding();
    }
    /**
     * Destroy this {@link SpotLight} and associated {@link SpotShadow}.
     */
    destroy() {
      super.destroy();
      this.shadow?.destroy();
    }
  }
  _direction = new WeakMap();
  _angle = new WeakMap();
  _penumbra = new WeakMap();
  _range = new WeakMap();

  class CacheManager {
    /**
     * CacheManager constructor
     */
    constructor() {
      this.planeGeometries = [];
    }
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition.id | definition id}
     * @param planeGeometry - {@link PlaneGeometry} to check
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometry(planeGeometry) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id);
    }
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition | definition id}
     * @param planeGeometryID - {@link PlaneGeometry#definition.id | PlaneGeometry definition id}
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometryByID(planeGeometryID) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometryID);
    }
    /**
     * Add a {@link PlaneGeometry} to our cache {@link planeGeometries} array
     * @param planeGeometry
     */
    addPlaneGeometry(planeGeometry) {
      this.planeGeometries.push(planeGeometry);
    }
    /**
     * Destroy our {@link CacheManager}
     */
    destroy() {
      this.planeGeometries = [];
    }
  }
  const cacheManager = new CacheManager();

  class FullscreenPlane extends MeshBaseMixin(class {
  }) {
    /**
     * FullscreenPlane constructor
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}.
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link FullscreenPlane}.
     */
    constructor(renderer, parameters = {}) {
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " FullscreenQuadMesh" : "FullscreenQuadMesh");
      let geometry = cacheManager.getPlaneGeometryByID(2);
      if (!geometry) {
        geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 });
        cacheManager.addPlaneGeometry(geometry);
      }
      if (!parameters.shaders || !parameters.shaders.vertex) {
        ["uniforms", "storages"].forEach((bindingType) => {
          Object.values(parameters[bindingType] ?? {}).forEach(
            (binding) => binding.visibility = ["fragment"]
          );
        });
      }
      parameters.depthWriteEnabled = false;
      if (!parameters.label) {
        parameters.label = "FullscreenQuadMesh";
      }
      super(renderer, null, { geometry, ...parameters });
      this.size = {
        document: {
          width: this.renderer.boundingRect.width,
          height: this.renderer.boundingRect.height,
          top: this.renderer.boundingRect.top,
          left: this.renderer.boundingRect.left
        }
      };
      this.type = "FullscreenQuadMesh";
    }
    /**
     * Resize our {@link FullscreenPlane}.
     * @param boundingRect - the new bounding rectangle.
     */
    resize(boundingRect = null) {
      this.size.document = boundingRect ?? this.renderer.boundingRect;
      super.resize(boundingRect);
    }
    /**
     * Take the pointer {@link Vec2} position relative to the document and returns it relative to our {@link FullscreenPlane}.
     * It ranges from -1 to 1 on both axis.
     * @param mouseCoords - pointer {@link Vec2} coordinates.
     * @returns - the mapped {@link Vec2} coordinates in the [-1, 1] range.
     */
    mouseToPlaneCoords(mouseCoords = new Vec2()) {
      return new Vec2(
        (mouseCoords.x - this.size.document.left) / this.size.document.width * 2 - 1,
        1 - (mouseCoords.y - this.size.document.top) / this.size.document.height * 2
      );
    }
  }

  class ComputePipelineEntry extends PipelineEntry {
    /**
     * ComputePipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link ComputePipelineEntry}
     */
    constructor(parameters) {
      const { label, renderer, bindGroups } = parameters;
      const type = "ComputePipelineEntry";
      isRenderer(renderer, label ? label + " " + type : type);
      super(parameters);
      this.type = type;
      this.shaders = {
        compute: {
          head: "",
          code: "",
          module: null,
          constants: /* @__PURE__ */ new Map()
        }
      };
      this.descriptor = null;
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the {@link bindGroups | bind groups}) WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders() {
      this.shaders.compute.head = "";
      this.shaders.compute.code = "";
      if (this.options.shaders.compute.constants) {
        for (const [key, value] of Object.entries(this.options.shaders.compute.constants)) {
          this.shaders.compute.constants.set(key, value);
        }
      }
      this.shaders.compute.constants.forEach((value, key) => {
        const type = typeof value === "boolean" ? "bool" : "f32";
        this.shaders.compute.head += `override ${key}: ${type} = ${value};
`;
      });
      const groupsBindings = [];
      for (const bindGroup of this.bindGroups) {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      }
      for (const groupBinding of groupsBindings) {
        if (groupBinding.wgslStructFragment && this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.compute.head = `
${groupBinding.wgslStructFragment}
${this.shaders.compute.head}`;
        }
        if (this.shaders.compute.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.compute.head = `${this.shaders.compute.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
        }
        if (groupBinding.newLine) this.shaders.compute.head += `
`;
      }
      this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code;
    }
    /* SETUP */
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      this.shaders.compute.module = this.createShaderModule({
        code: this.shaders.compute.code,
        type: "compute"
      });
    }
    /**
     * Create the compute pipeline {@link descriptor}
     */
    createPipelineDescriptor() {
      if (!this.shaders.compute.module) return;
      this.descriptor = {
        label: this.options.label,
        layout: this.layout,
        compute: {
          module: this.shaders.compute.module,
          entryPoint: this.options.shaders.compute.entryPoint,
          ...this.options.shaders.compute.constants && {
            constants: this.options.shaders.compute.constants
          }
        }
      };
    }
    /**
     * Create the compute {@link pipeline}
     */
    createComputePipeline() {
      if (!this.shaders.compute.module) return;
      try {
        this.pipeline = this.renderer.createComputePipeline(this.descriptor);
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Asynchronously create the compute {@link pipeline}
     * @returns - void promise result
     */
    async createComputePipelineAsync() {
      if (!this.shaders.compute.module) return;
      try {
        this.pipeline = await this.renderer.createComputePipelineAsync(this.descriptor);
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our compute {@link pipeline}
     */
    async compilePipelineEntry() {
      super.compilePipelineEntry();
      if (this.options.useAsync) {
        await this.createComputePipelineAsync();
      } else {
        this.createComputePipeline();
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      }
    }
  }

  class PipelineManager {
    constructor() {
      this.type = "PipelineManager";
      this.currentPipelineIndex = null;
      this.pipelineEntries = [];
      this.activeBindGroups = [];
    }
    /**
     * Get all the already created {@link RenderPipelineEntry}.
     * @readonly
     */
    get renderPipelines() {
      return this.pipelineEntries.filter(
        (pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry
      );
    }
    /**
     * Get all the already created {@link ComputePipelineEntry}.
     * @readonly
     */
    get computePipelines() {
      return this.pipelineEntries.filter(
        (pipelineEntry) => pipelineEntry instanceof ComputePipelineEntry
      );
    }
    /**
     * Compare two {@link ShaderOptions | shader objects}.
     * @param shaderA - First {@link ShaderOptions | shader object} to compare.
     * @param shaderB - Second {@link ShaderOptions | shader object} to compare.
     * @returns - Whether the two {@link ShaderOptions | shader objects} code and entryPoint match.
     */
    compareShaders(shaderA, shaderB) {
      return shaderA.code === shaderB.code && shaderA.entryPoint === shaderB.entryPoint;
    }
    /**
     * Check if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}.
     * @returns - Found {@link RenderPipelineEntry}, or null if not found.
     */
    isSameRenderPipeline(parameters) {
      let cachedPipeline = null;
      const renderPipelines = this.renderPipelines;
      for (const renderPipeline of renderPipelines) {
        const { options } = renderPipeline;
        const { shaders, rendering, cacheKey } = parameters;
        if (cacheKey !== options.cacheKey) continue;
        const differentParams = compareRenderingOptions(rendering, options.rendering);
        if (differentParams.length) continue;
        const sameVertexShader = this.compareShaders(shaders.vertex, options.shaders.vertex);
        if (!sameVertexShader) continue;
        const sameFragmentShader = !shaders.fragment && !options.shaders.fragment || this.compareShaders(shaders.fragment, options.shaders.fragment);
        if (!sameFragmentShader) continue;
        cachedPipeline = renderPipeline;
        break;
      }
      return cachedPipeline;
    }
    /**
     * Check if the provided {@link PipelineEntryParams | PipelineEntry parameters} belongs to an already created {@link ComputePipelineEntry}.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}.
     * @returns - Found {@link ComputePipelineEntry}, or null if not found.
     */
    isSameComputePipeline(parameters) {
      let cachedPipeline = null;
      const computePipelines = this.computePipelines;
      for (const computePipeline of computePipelines) {
        const { options } = computePipeline;
        const { shaders, cacheKey } = parameters;
        if (cacheKey !== options.cacheKey) continue;
        const sameComputeShader = this.compareShaders(shaders.compute, options.shaders.compute);
        if (!sameComputeShader) continue;
        cachedPipeline = computePipeline;
        break;
      }
      return cachedPipeline;
    }
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param material - {@link RenderMaterial} used to create the pipeline.
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created.
     */
    createRenderPipeline(material) {
      const { renderer, attributes, bindGroups, cacheKey, options } = material;
      const { shaders, label, useAsyncPipeline, rendering } = options;
      const parameters = {
        renderer,
        label: label + " render pipeline",
        shaders,
        useAsync: useAsyncPipeline,
        bindGroups,
        cacheKey,
        rendering,
        attributes
      };
      const existingPipelineEntry = this.isSameRenderPipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new RenderPipelineEntry(parameters);
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param material - {@link ComputeMaterial} used to create the pipeline.
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(material) {
      const { renderer, bindGroups, cacheKey, options } = material;
      const { shaders, label, useAsyncPipeline } = options;
      const parameters = {
        renderer,
        label: label + " compute pipeline",
        shaders,
        useAsync: useAsyncPipeline,
        bindGroups,
        cacheKey
      };
      const existingPipelineEntry = this.isSameComputePipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new ComputePipelineEntry(parameters);
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Check if the given {@link AllowedPipelineEntries | PipelineEntry} is already set, if not set it
     * @param pass - current pass encoder
     * @param pipelineEntry - the {@link AllowedPipelineEntries | PipelineEntry} to set
     */
    setCurrentPipeline(pass, pipelineEntry) {
      if (pipelineEntry.index !== this.currentPipelineIndex) {
        pass.setPipeline(pipelineEntry.pipeline);
        this.currentPipelineIndex = pipelineEntry.index;
      }
    }
    /**
     * Track the active/already set {@link core/bindGroups/BindGroup.BindGroup | bind groups} to avoid `setBindGroup()` redundant calls.
     * @param pass - current pass encoder.
     * @param bindGroups - array {@link core/bindGroups/BindGroup.BindGroup | bind groups} passed by the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
     */
    setActiveBindGroups(pass, bindGroups) {
      bindGroups.forEach((bindGroup, index) => {
        if (!this.activeBindGroups[index] || this.activeBindGroups[index].uuid !== bindGroup.uuid || this.activeBindGroups[index].index !== bindGroup.index) {
          this.activeBindGroups[index] = bindGroup;
          pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        }
      });
    }
    /**
     * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} and {@link activeBindGroups} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
     */
    resetCurrentPipeline() {
      this.currentPipelineIndex = null;
      this.activeBindGroups = [];
    }
  }

  class ResizeManager {
    /**
     * ResizeManager constructor
     */
    constructor() {
      this.shouldWatch = true;
      this.entries = [];
      if (typeof window === "object" && "ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver((observedEntries) => {
          const allEntries = observedEntries.map((observedEntry) => {
            return this.entries.filter((e) => e.element.isSameNode(observedEntry.target));
          }).flat().sort((a, b) => b.priority - a.priority);
          allEntries?.forEach((entry) => {
            if (entry && entry.callback) {
              entry.callback();
            }
          });
        });
      }
    }
    /**
     * Set {@link ResizeManager.shouldWatch | shouldWatch}.
     * @param shouldWatch - whether to watch or not.
     */
    useObserver(shouldWatch = true) {
      this.shouldWatch = shouldWatch;
    }
    /**
     * Track an {@link HTMLElement} size change and execute a callback function when it happens.
     * @param entry - {@link ResizeManagerEntry | entry} to watch.
     */
    observe({ element, priority, callback }) {
      if (!element || !this.shouldWatch) return;
      this.resizeObserver?.observe(element);
      const entry = {
        element,
        priority,
        callback
      };
      this.entries.push(entry);
    }
    /**
     * Unobserve an {@link HTMLElement} and remove it from our {@link entries} array.
     * @param element - {@link HTMLElement} to unobserve.
     */
    unobserve(element) {
      this.resizeObserver?.unobserve(element);
      this.entries = this.entries.filter((e) => !e.element.isSameNode(element));
    }
    /**
     * Destroy our {@link ResizeManager}.
     */
    destroy() {
      this.resizeObserver?.disconnect();
    }
  }
  const resizeManager = new ResizeManager();

  class DOMElement {
    /**
     * DOMElement constructor
     * @param parameters - {@link DOMElementParams | parameters} used to create our DOMElement
     */
    constructor({
      element = document.body,
      priority = 1,
      onSizeChanged = (boundingRect = null) => {
      },
      onPositionChanged = (boundingRect = null) => {
      }
    } = {}) {
      if (typeof element === "string") {
        this.element = document.querySelector(element);
        if (!this.element) {
          const notFoundEl = typeof element === "string" ? `'${element}' selector` : `${element} HTMLElement`;
          throwError(`DOMElement: corresponding ${notFoundEl} not found.`);
        }
      } else {
        this.element = element;
      }
      this.priority = priority;
      this.isResizing = false;
      this.onSizeChanged = onSizeChanged;
      this.onPositionChanged = onPositionChanged;
      this.resizeManager = resizeManager;
      this.resizeManager.observe({
        element: this.element,
        priority: this.priority,
        callback: () => {
          this.setSize();
        }
      });
      this.setSize();
    }
    /**
     * Check whether 2 bounding rectangles are equals
     * @param rect1 - first bounding rectangle
     * @param rect2 - second bounding rectangle
     * @returns - whether the rectangles are equals or not
     */
    compareBoundingRect(rect1, rect2) {
      return !["x", "y", "left", "top", "right", "bottom", "width", "height"].some((k) => rect1[k] !== rect2[k]);
    }
    /**
     * Get our element bounding rectangle
     */
    get boundingRect() {
      return this._boundingRect;
    }
    /**
     * Set our element bounding rectangle
     * @param boundingRect - new bounding rectangle
     */
    set boundingRect(boundingRect) {
      const isSameRect = !!this.boundingRect && this.compareBoundingRect(boundingRect, this.boundingRect);
      this._boundingRect = {
        top: boundingRect.top,
        right: boundingRect.right,
        bottom: boundingRect.bottom,
        left: boundingRect.left,
        width: boundingRect.width,
        height: boundingRect.height,
        x: boundingRect.x,
        y: boundingRect.y
      };
      if (!isSameRect) {
        this.onSizeChanged(this.boundingRect);
      }
    }
    /**
     * Update our element bounding rectangle because the scroll position has changed
     * @param delta - scroll delta values along X and Y axis
     */
    updateScrollPosition(delta = { x: 0, y: 0 }) {
      if (this.isResizing) return;
      this._boundingRect.top += delta.y;
      this._boundingRect.left += delta.x;
      if (delta.x || delta.y) {
        this.onPositionChanged(this.boundingRect);
      }
    }
    /**
     * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
     * @param boundingRect - new bounding rectangle
     */
    setSize(boundingRect = null) {
      if (!this.element || this.isResizing) return;
      this.isResizing = true;
      this.boundingRect = boundingRect ?? this.element.getBoundingClientRect();
      setTimeout(() => {
        this.isResizing = false;
      }, 10);
    }
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy() {
      this.resizeManager.unobserve(this.element);
    }
  }

  var __typeError$b = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$b = (obj, member, msg) => member.has(obj) || __typeError$b("Cannot " + msg);
  var __privateGet$a = (obj, member, getter) => (__accessCheck$b(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$b = (obj, member, value) => member.has(obj) ? __typeError$b("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$a = (obj, member, value, setter) => (__accessCheck$b(obj, member, "write to private field"), member.set(obj, value), value);
  var _shouldLoadColors, _shouldLoadDepth;
  const camPosA = new Vec3();
  const camPosB = new Vec3();
  const posA = new Vec3();
  const posB = new Vec3();
  class Scene extends Object3D {
    /**
     * Scene constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}.
     */
    constructor({ renderer }) {
      super();
      /**
       * Keep track of whether the next render pass should set its `loadOp` to `'load'` when rendering.
       * @private
       */
      __privateAdd$b(this, _shouldLoadColors);
      /**
       * Keep track of whether the next render pass should set its `depthLoadOp` to `'load'` when rendering.
       * @private
       */
      __privateAdd$b(this, _shouldLoadDepth);
      renderer = isRenderer(renderer, "Scene");
      this.renderer = renderer;
      __privateSet$a(this, _shouldLoadColors, false);
      __privateSet$a(this, _shouldLoadDepth, false);
      this.computePassEntries = [];
      this.renderPassEntries = {
        /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here. */
        pingPong: [],
        /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here. */
        renderTarget: [],
        /** Array of {@link RenderPassEntry} containing {@link ShaderPass} that will render directly to the screen before rendering any other pass to the screen. Useful to perform "blit" pass before actually rendering the usual scene content. */
        prePass: [],
        /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first and default entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. You can create following entries for custom scene rendering management process. */
        screen: [],
        /**Array of {@link RenderPassEntry} containing post processing {@link ShaderPass} that will render directly to the screen after everything has been drawn. */
        postProPass: []
      };
    }
    /**
     * Create a new {@link RenderPassEntry} in the {@link renderPassEntries} `screen` array.
     * @param label - Optional label to use for this {@link RenderPassEntry}.
     * @param order - Optional order into which insert this {@link renderPassEntries} `screen` array. A positive number means at the end of the array, a negative number means at the beginning. Default to `1`.
     * @returns - The new {@link RenderPassEntry}.
     */
    createScreenPassEntry(label = "", order = 1) {
      const screenPassEntry = {
        label,
        renderPass: this.renderer.renderPass,
        renderTexture: null,
        onBeforeRenderPass: null,
        onAfterRenderPass: null,
        useCustomRenderPass: null,
        element: null,
        // explicitly set to null
        stack: {
          unProjected: {
            opaque: [],
            transparent: []
          },
          projected: {
            opaque: [],
            transparent: []
          }
        }
      };
      if (order >= 0) {
        this.renderPassEntries.screen.push(screenPassEntry);
      } else {
        this.renderPassEntries.screen.unshift(screenPassEntry);
      }
      return screenPassEntry;
    }
    /**
     * Set the main {@link Renderer} render pass entry.
     */
    setMainRenderPassEntry() {
      this.createScreenPassEntry("Main scene screen render pass");
    }
    /**
     * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
     * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test.
     */
    getRenderPassEntryLength(renderPassEntry) {
      if (!renderPassEntry) {
        return 0;
      } else {
        return renderPassEntry.element ? renderPassEntry.element.visible ? 1 : 0 : renderPassEntry.stack.unProjected.opaque.length + renderPassEntry.stack.unProjected.transparent.length + renderPassEntry.stack.projected.opaque.length + renderPassEntry.stack.projected.transparent.length;
      }
    }
    /**
     * Add a {@link ComputePass} to our scene {@link computePassEntries} array.
     * @param computePass - {@link ComputePass} to add.
     */
    addComputePass(computePass) {
      this.computePassEntries.push(computePass);
      this.computePassEntries.sort((a, b) => {
        if (a.renderOrder !== b.renderOrder) {
          return a.renderOrder - b.renderOrder;
        } else {
          return a.index - b.index;
        }
      });
    }
    /**
     * Remove a {@link ComputePass} from our scene {@link computePassEntries} array.
     * @param computePass - {@link ComputePass} to remove.
     */
    removeComputePass(computePass) {
      this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
    }
    /**
     * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
     * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}.
     * @param renderTarget - {@link RenderTarget} to add.
     */
    addRenderTarget(renderTarget) {
      if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
        this.renderPassEntries.renderTarget.push({
          label: renderTarget.options.label ? `${renderTarget.options.label} pass entry` : `RenderTarget ${renderTarget.uuid} pass entry`,
          renderPass: renderTarget.renderPass,
          renderTexture: renderTarget.renderTexture,
          onBeforeRenderPass: null,
          onAfterRenderPass: null,
          useCustomRenderPass: null,
          element: null,
          // explicitly set to null
          stack: {
            unProjected: {
              opaque: [],
              transparent: []
            },
            projected: {
              opaque: [],
              transparent: []
            }
          }
        });
    }
    /**
     * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
     * @param renderTarget - {@link RenderTarget} to add.
     */
    removeRenderTarget(renderTarget) {
      this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
        (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
      );
    }
    /**
     * Get the {@link RenderPassEntry} in the {@link renderPassEntries} `renderTarget` array (or `screen` array if no {@link RenderTarget} is passed) corresponding to the given {@link RenderTarget}.
     * @param renderTarget - {@link RenderTarget} to use to retrieve the {@link RenderPassEntry} if any.
     * @returns - {@link RenderPassEntry} found.
     */
    getRenderTargetPassEntry(renderTarget = null) {
      return renderTarget ? this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === renderTarget.renderPass.uuid
      ) : this.renderPassEntries.screen.find((passEntry) => passEntry.renderPass.uuid === this.renderer.renderPass.uuid);
    }
    /**
     * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not.
     * @param mesh - Mesh to check.
     * @returns - The corresponding render pass entry {@link Stack}.
     */
    getMeshProjectionStack(mesh) {
      const renderPassEntry = mesh.options.useCustomScenePassEntry ? mesh.options.useCustomScenePassEntry : "transmissive" in mesh.options && mesh.options.transmissive ? this.renderer.transmissionTarget.passEntry : this.getRenderTargetPassEntry(mesh.outputTarget);
      const { stack } = renderPassEntry;
      return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
    }
    /**
     * Order a {@link SceneStackedObject} array by using the {@link core/meshes/Mesh.Mesh.renderOrder | renderOrder} or {@link core/meshes/Mesh.Mesh.index | index} properties.
     * @param stack - {@link SceneStackedObject} to sort, filled with {@link RenderedMesh} or {@link RenderBundle}.
     */
    orderStack(stack) {
      stack.sort((a, b) => {
        return a.renderOrder - b.renderOrder || a.index - b.index;
      });
    }
    /**
     * Test whether a {@link SceneStackedObject} is a {@link RenderBundle} or not.
     * @param object - Object to test.
     * @returns - Whether the object is a {@link RenderBundle} or not.
     */
    isStackObjectRenderBundle(object) {
      return object.type === "RenderBundle";
    }
    /**
     * Add a {@link SceneStackedMesh} to the given {@link RenderTarget} corresponding {@link RenderPassEntry}.
     * @param mesh - {@link SceneStackedMesh} to add.
     * @param renderTarget - {@link RenderTarget} to get the {@link RenderPassEntry} from. If not set, will add to the first {@link renderPassEntries} `screen` array entry.
     */
    addMeshToRenderTargetStack(mesh, renderTarget = null) {
      const renderPassEntry = this.getRenderTargetPassEntry(renderTarget);
      const { stack } = renderPassEntry;
      const projectionStack = mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
      const isTransparent = !!mesh.transparent;
      const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque;
      similarMeshes.push(mesh);
      this.orderStack(similarMeshes);
    }
    /**
     * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}.
     * @param mesh - Mesh to add.
     */
    addMesh(mesh) {
      if (mesh.renderBundle) {
        mesh.renderBundle.addMesh(mesh, mesh.outputTarget ? mesh.outputTarget.renderPass : this.renderer.renderPass);
      }
      const { useProjection } = mesh.material.options.rendering;
      if (!mesh.renderBundle) {
        const projectionStack = this.getMeshProjectionStack(mesh);
        const isTransparent = !!mesh.transparent;
        const similarMeshes = isTransparent ? projectionStack.transparent : projectionStack.opaque;
        similarMeshes.push(mesh);
        this.orderStack(similarMeshes);
      }
      if ("parent" in mesh && !mesh.parent && useProjection) {
        mesh.parent = this;
      }
    }
    /**
     * Remove a Mesh from our {@link Scene}.
     * @param mesh - Mesh to remove.
     */
    removeMesh(mesh) {
      if (mesh.renderBundle) {
        mesh.renderBundle.removeMesh(mesh, false);
      } else {
        const projectionType = mesh.material.options.rendering.useProjection ? "projected" : "unProjected";
        const isTransparent = !!mesh.transparent;
        const transparencyType = isTransparent ? "transparent" : "opaque";
        for (const renderPassEntries of Object.values(this.renderPassEntries)) {
          renderPassEntries.forEach((renderPassEntry) => {
            if (renderPassEntry.stack) {
              renderPassEntry.stack[projectionType][transparencyType] = renderPassEntry.stack[projectionType][transparencyType].filter((m) => m.uuid !== mesh.uuid);
            }
          });
        }
      }
      if ("transmissive" in mesh.options && mesh.options.transmissive) {
        const transmissivePassEntry = this.renderer.transmissionTarget.passEntry;
        const nbTransmissiveObjects = transmissivePassEntry ? this.getRenderPassEntryLength(transmissivePassEntry) : 0;
        if (nbTransmissiveObjects === 0) {
          this.renderer.destroyTransmissionTarget();
        }
      }
      if ("parent" in mesh && mesh.parent && mesh.parent.object3DIndex === this.object3DIndex) {
        mesh.parent = null;
      }
    }
    /**
     * Add a {@link RenderBundle} to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * @param renderBundle - {@link RenderBundle} to add.
     * @param projectionStack - {@link ProjectionStack} onto which to add the {@link RenderBundle}.
     */
    addRenderBundle(renderBundle, projectionStack) {
      const similarObjects = !!renderBundle.transparent ? projectionStack.transparent : projectionStack.opaque;
      similarObjects.push(renderBundle);
      this.orderStack(similarObjects);
    }
    /**
     * Remove a {@link RenderBundle} from our {@link Scene}.
     * @param renderBundle - {@link RenderBundle} to remove.
     */
    removeRenderBundle(renderBundle) {
      const isProjected = !!renderBundle.useProjection;
      const projectionType = isProjected ? "projected" : "unProjected";
      const isTransparent = !!renderBundle.transparent;
      const transparencyType = isTransparent ? "transparent" : "opaque";
      const renderPassEntry = this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === renderBundle.options.renderPass?.uuid
      );
      if (renderPassEntry) {
        const { stack } = renderPassEntry;
        const projectionStack = stack[projectionType];
        projectionStack[transparencyType] = projectionStack[transparencyType].filter(
          (bundle) => bundle.uuid !== renderBundle.uuid
        );
      } else {
        this.renderPassEntries.screen.forEach((renderPassEntry2) => {
          if (renderPassEntry2.stack) {
            renderPassEntry2.stack[projectionType][transparencyType] = renderPassEntry2.stack[projectionType][transparencyType].filter((m) => m.uuid !== renderBundle.uuid);
          }
        });
      }
    }
    /**
     * Add a {@link ShaderPass} to our scene {@link renderPassEntries} `prePass` or `postProPass` array.
     * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}.
     * This also handles the {@link renderPassEntries} `postProPass` array entries order: We will first draw selective passes and then finally global post processing passes.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
     * @param shaderPass - {@link ShaderPass} to add.
     */
    addShaderPass(shaderPass) {
      const onBeforeRenderPass = shaderPass.inputTarget || shaderPass.outputTarget ? null : (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTexture && swapChainTexture) {
          this.renderer.copyGPUTextureToTexture(swapChainTexture, shaderPass.renderTexture, commandEncoder);
        }
        this.renderer.postProcessingPass.setLoadOp("clear");
      };
      const onAfterRenderPass = shaderPass.options.copyOutputToRenderTexture ? (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTexture && swapChainTexture) {
          this.renderer.copyGPUTextureToTexture(swapChainTexture, shaderPass.renderTexture, commandEncoder);
        }
      } : null;
      const outputPass = shaderPass.outputTarget ? shaderPass.outputTarget.renderPass : !shaderPass.options.isPrePass ? this.renderer.postProcessingPass : this.renderer.renderPass;
      const label = shaderPass.options.isPrePass ? shaderPass.options.label + " scene pre pass" : shaderPass.options.label + " scene post processing pass";
      const shaderPassEntry = {
        label,
        // use output target or postprocessing render pass
        renderPass: outputPass,
        // render to output target renderTexture or directly to screen
        renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
        onBeforeRenderPass,
        onAfterRenderPass,
        useCustomRenderPass: null,
        element: shaderPass,
        stack: null
        // explicitly set to null
      };
      if (shaderPass.renderBundle) {
        const { renderBundle } = shaderPass;
        if (renderBundle.meshes.size >= 1) {
          throwWarning(
            `${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 ShaderPass to a render bundle. This ShaderPass will not be added: ${shaderPass.options.label}`
          );
          shaderPass.renderBundle = null;
        } else {
          renderBundle.addMesh(shaderPass, outputPass);
        }
      }
      if (!shaderPass.options.isPrePass) {
        this.renderPassEntries.postProPass.push(shaderPassEntry);
        this.renderPassEntries.postProPass.sort((a, b) => {
          const isPostProA = a.element && !a.element.outputTarget;
          const renderOrderA = a.element ? a.element.renderOrder : 0;
          const indexA = a.element ? a.element.index : 0;
          const isPostProB = b.element && !b.element.outputTarget;
          const renderOrderB = b.element ? b.element.renderOrder : 0;
          const indexB = b.element ? b.element.index : 0;
          if (isPostProA && !isPostProB) {
            return 1;
          } else if (!isPostProA && isPostProB) {
            return -1;
          } else if (renderOrderA !== renderOrderB) {
            return renderOrderA - renderOrderB;
          } else {
            return indexA - indexB;
          }
        });
      } else {
        this.renderPassEntries.prePass.push(shaderPassEntry);
        this.renderPassEntries.prePass.sort(
          (a, b) => a.element.renderOrder - b.element.renderOrder || a.element.index - b.element.index
        );
      }
    }
    /**
     * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} `prePass` or `postProPass` array.
     * @param shaderPass - {@link ShaderPass} to remove.
     */
    removeShaderPass(shaderPass) {
      if (shaderPass.renderBundle) {
        shaderPass.renderBundle.empty();
      }
      if (!shaderPass.options.isPrePass) {
        this.renderPassEntries.postProPass = this.renderPassEntries.postProPass.filter(
          (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
        );
      } else {
        this.renderPassEntries.prePass = this.renderPassEntries.prePass.filter(
          (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
        );
      }
    }
    /**
     * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
     * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}.
     * @param pingPongPlane - {@link PingPongPlane} to add.
     */
    addPingPongPlane(pingPongPlane) {
      this.renderPassEntries.pingPong.push({
        label: pingPongPlane.options.label + " scene pass",
        renderPass: pingPongPlane.outputTarget.renderPass,
        renderTexture: pingPongPlane.outputTarget.renderTexture,
        onBeforeRenderPass: null,
        onAfterRenderPass: (commandEncoder, swapChainTexture) => {
          this.renderer.copyGPUTextureToTexture(swapChainTexture, pingPongPlane.renderTexture, commandEncoder);
        },
        useCustomRenderPass: null,
        element: pingPongPlane,
        stack: null
        // explicitly set to null
      });
      if (pingPongPlane.renderBundle) {
        const { renderBundle } = pingPongPlane;
        if (renderBundle.meshes.size >= 1) {
          throwWarning(
            `${renderBundle.options.label} (${renderBundle.type}): Cannot add more than 1 PingPongPlane to a render bundle. This PingPongPlane will not be added: ${pingPongPlane.options.label}`
          );
          pingPongPlane.renderBundle = null;
        } else {
          renderBundle.addMesh(pingPongPlane, pingPongPlane.outputTarget.renderPass);
        }
      }
      this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder);
    }
    /**
     * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
     * @param pingPongPlane - {@link PingPongPlane} to remove.
     */
    removePingPongPlane(pingPongPlane) {
      if (pingPongPlane.renderBundle) {
        pingPongPlane.renderBundle.empty();
      }
      this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
        (entry) => entry.element.uuid !== pingPongPlane.uuid
      );
    }
    /**
     * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
     * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
     * @returns - The {@link RenderPassEntry} if found.
     */
    getObjectRenderPassEntry(object) {
      if (object.type === "RenderTarget") {
        return this.renderPassEntries.renderTarget.find(
          (entry) => entry.renderPass.uuid === object.renderPass.uuid
        );
      } else if (object.type === "PingPongPlane") {
        return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid);
      } else if (object.type === "ShaderPass") {
        if (object.options.isPrePass) {
          return this.renderPassEntries.prePass.find((entry) => entry.element?.uuid === object.uuid);
        } else {
          return this.renderPassEntries.postProPass.find((entry) => entry.element?.uuid === object.uuid);
        }
      } else {
        const entryType = object.outputTarget ? "renderTarget" : "screen";
        if (object.renderBundle) {
          return this.renderPassEntries[entryType].find((entry) => {
            return [
              ...entry.stack.unProjected.opaque,
              ...entry.stack.unProjected.transparent,
              ...entry.stack.projected.opaque,
              ...entry.stack.projected.transparent
            ].filter((object2) => object2.type === "RenderBundle").some((bundle) => {
              return bundle.meshes.get(object.uuid);
            });
          });
        } else {
          return this.renderPassEntries[entryType].find((entry) => {
            return [
              ...entry.stack.unProjected.opaque,
              ...entry.stack.unProjected.transparent,
              ...entry.stack.projected.opaque,
              ...entry.stack.projected.transparent
            ].some((mesh) => mesh.uuid === object.uuid);
          });
        }
      }
    }
    /**
     * Sort transparent projected meshes by their render order or distance to the camera (farther meshes should be drawn first).
     * @param meshes - Transparent projected meshes array to sort.
     */
    sortTransparentMeshes(meshes) {
      meshes.sort((meshA, meshB) => {
        if (meshA.renderOrder !== meshB.renderOrder) {
          return meshA.renderOrder - meshB.renderOrder;
        }
        if (this.isStackObjectRenderBundle(meshA) || this.isStackObjectRenderBundle(meshB)) {
          return meshA.renderOrder - meshB.renderOrder;
        }
        meshA.geometry ? posA.copy(meshA.geometry.boundingBox.center).applyMat4(meshA.worldMatrix) : meshA.worldMatrix.getTranslation(posA);
        meshB.geometry ? posB.copy(meshB.geometry.boundingBox.center).applyMat4(meshB.worldMatrix) : meshB.worldMatrix.getTranslation(posB);
        const radiusA = meshA.geometry ? meshA.geometry.boundingBox.radius * meshA.worldMatrix.getMaxScaleOnAxis() : 0;
        const radiusB = meshB.geometry ? meshB.geometry.boundingBox.radius * meshB.worldMatrix.getMaxScaleOnAxis() : 0;
        return meshB.camera.worldMatrix.getTranslation(camPosB).distance(posB) - radiusB - (meshA.camera.worldMatrix.getTranslation(camPosA).distance(posA) - radiusA);
      });
    }
    /**
     * Here we render a {@link RenderPassEntry}:
     * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture.
     * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified.
     * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}.
     * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | camera and lights bind group} and draw projected opaque / transparent meshes.
     * - End the {@link GPURenderPassEncoder | GPU render pass encoder}.
     * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified.
     * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     * @param renderPassEntry - {@link RenderPassEntry} to render.
     */
    renderSinglePassEntry(commandEncoder, renderPassEntry) {
      const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture);
      renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture);
      if (renderPassEntry.useCustomRenderPass) {
        renderPassEntry.useCustomRenderPass(commandEncoder);
      } else {
        const pass = renderPassEntry.renderPass.beginRenderPass(commandEncoder);
        if (!this.renderer.production) {
          pass.pushDebugGroup(
            renderPassEntry.element ? `${renderPassEntry.element.options.label} render pass using ${renderPassEntry.renderPass.options.label} descriptor` : `Render stack pass using ${renderPassEntry.renderPass.options.label}${renderPassEntry.renderTexture ? " onto " + renderPassEntry.renderTexture.options.label : ""}`
          );
        }
        if (renderPassEntry.element) {
          if (renderPassEntry.element.renderBundle) {
            renderPassEntry.element.renderBundle.render(pass);
          } else {
            renderPassEntry.element.render(pass);
          }
        } else if (renderPassEntry.stack) {
          for (const mesh of renderPassEntry.stack.unProjected.opaque) {
            mesh.render(pass);
          }
          for (const mesh of renderPassEntry.stack.unProjected.transparent) {
            mesh.render(pass);
          }
          if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
            for (const mesh of renderPassEntry.stack.projected.opaque) {
              mesh.render(pass);
            }
            this.sortTransparentMeshes(renderPassEntry.stack.projected.transparent);
            for (const mesh of renderPassEntry.stack.projected.transparent) {
              mesh.render(pass);
            }
          }
        }
        if (!this.renderer.production) pass.popDebugGroup();
        pass.end();
      }
      renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture);
      this.renderer.pipelineManager.resetCurrentPipeline();
      if (renderPassEntry.renderPass.options.useDepth && renderPassEntry.renderPass.options.renderToSwapChain && !renderPassEntry.renderPass.options.depthReadOnly && renderPassEntry.renderPass.options.depthStoreOp === "store" && renderPassEntry.renderPass.depthTexture.uuid === this.renderer.renderPass.depthTexture?.uuid) {
        __privateSet$a(this, _shouldLoadDepth, true);
      }
    }
    /**
     * Before actually rendering the scene, update matrix stack and frustum culling checks. Batching these calls greatly improve performance. Called by the {@link renderer} before rendering.
     */
    onBeforeRender() {
      if ("lights" in this.renderer) {
        this.renderer.lights.forEach((light) => {
          light.onBeforeRenderScene();
        });
      }
      this.renderer.meshes.forEach((mesh) => {
        mesh.onBeforeRenderScene();
      });
      this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.update());
      this.updateMatrixStack();
      this.renderer.animations.forEach((targetsAnimation) => targetsAnimation.onAfterUpdate());
      for (const mesh of this.renderer.meshes) {
        if ("checkFrustumCulling" in mesh && mesh.visible) {
          mesh.checkFrustumCulling();
        }
      }
    }
    /**
     * Render our {@link Scene}.
     * - Execute {@link onBeforeRender} first.
     * - Then render {@link computePassEntries}.
     * - And finally render our {@link renderPassEntries}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     */
    render(commandEncoder) {
      for (const computePass of this.computePassEntries) {
        const pass = commandEncoder.beginComputePass();
        if (!this.renderer.production) pass.pushDebugGroup(`${computePass.options.label}: begin compute pass`);
        computePass.render(pass);
        if (!this.renderer.production) pass.popDebugGroup();
        pass.end();
        computePass.copyBufferToResult(commandEncoder);
        this.renderer.pipelineManager.resetCurrentPipeline();
      }
      __privateSet$a(this, _shouldLoadColors, false);
      __privateSet$a(this, _shouldLoadDepth, false);
      for (const renderPassEntryType in this.renderPassEntries) {
        if (renderPassEntryType === "postProPass") {
          this.renderer.renderPass.setDepthReadOnly(false);
          this.renderer.renderPass.setDepthLoadOp("clear");
          __privateSet$a(this, _shouldLoadColors, true);
        }
        this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
          if (!this.getRenderPassEntryLength(renderPassEntry)) return;
          if (renderPassEntryType === "prePass" || renderPassEntryType === "postProPass") {
            renderPassEntry.renderPass.setDepthReadOnly(true);
          } else {
            renderPassEntry.renderPass.setDepthReadOnly(false);
          }
          if (renderPassEntryType === "postProPass" && renderPassEntry.renderPass.uuid !== this.renderer.postProcessingPass.uuid) {
            __privateSet$a(this, _shouldLoadColors, false);
          }
          renderPassEntry.renderPass.setLoadOp(__privateGet$a(this, _shouldLoadColors) ? "load" : "clear");
          renderPassEntry.renderPass.setDepthLoadOp(
            __privateGet$a(this, _shouldLoadDepth) && !renderPassEntry.renderPass.options.depthReadOnly ? "load" : "clear"
          );
          this.renderSinglePassEntry(commandEncoder, renderPassEntry);
          if (renderPassEntryType !== "renderTarget") {
            __privateSet$a(this, _shouldLoadColors, true);
          }
        });
      }
    }
  }
  _shouldLoadColors = new WeakMap();
  _shouldLoadDepth = new WeakMap();

  var __typeError$a = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$a = (obj, member, msg) => member.has(obj) || __typeError$a("Cannot " + msg);
  var __privateGet$9 = (obj, member, getter) => (__accessCheck$a(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$a = (obj, member, value) => member.has(obj) ? __typeError$a("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$9 = (obj, member, value, setter) => (__accessCheck$a(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet$9(obj, member, value);
    },
    get _() {
      return __privateGet$9(obj, member, getter);
    }
  });
  var _taskCount;
  class TasksQueueManager {
    /**
     * TaskQueueManager constructor
     */
    constructor() {
      /** Private number to assign a unique id to each {@link TaskQueueItem | task queue item} */
      __privateAdd$a(this, _taskCount, 0);
      this.queue = [];
    }
    /**
     * Add a {@link TaskQueueItem | task queue item} to the queue
     * @param callback - callback to add to the {@link TaskQueueItem | task queue item}
     * @param parameters - {@link TaskQueueItemParams | parameters} of the {@link TaskQueueItem | task queue item} to add
     * @returns - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item}, useful to later remove the task if needed
     */
    add(callback = (args) => {
    }, { order = this.queue.length, once = false } = {}) {
      const task = {
        callback,
        order,
        once,
        id: __privateGet$9(this, _taskCount)
      };
      __privateWrapper(this, _taskCount)._++;
      this.queue.push(task);
      this.queue.sort((a, b) => {
        return a.order - b.order;
      });
      return task.id;
    }
    /**
     * Remove a {@link TaskQueueItem | task queue item} from the queue
     * @param taskId - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item} to remove
     */
    remove(taskId = 0) {
      this.queue = this.queue.filter((task) => task.id !== taskId);
    }
    /**
     * Execute the {@link TasksQueueManager#queue | tasks queue array}
     */
    execute(args) {
      this.queue.forEach((task) => {
        task.callback(args);
        if (task.once) {
          this.remove(task.id);
        }
      });
    }
  }
  _taskCount = new WeakMap();

  var __typeError$9 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$9 = (obj, member, msg) => member.has(obj) || __typeError$9("Cannot " + msg);
  var __privateGet$8 = (obj, member, getter) => (__accessCheck$9(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$9 = (obj, member, value) => member.has(obj) ? __typeError$9("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$8 = (obj, member, value, setter) => (__accessCheck$9(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$7 = (obj, member, method) => (__accessCheck$9(obj, member, "access private method"), method);
  var _mipsGeneration, _GPUDeviceManager_instances, createSamplers_fn;
  class GPUDeviceManager {
    /**
     * GPUDeviceManager constructor
     * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}.
     */
    constructor({
      label,
      production = false,
      adapterOptions = {},
      requiredFeatures = [],
      requestAdapterLimits = [],
      autoRender = true,
      onError = () => {
      },
      onDeviceLost = (info) => {
      },
      onDeviceDestroyed = (info) => {
      }
    } = {}) {
      __privateAdd$9(this, _GPUDeviceManager_instances);
      /** function assigned to the {@link onBeforeRender} callback. */
      this._onBeforeRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterRender} callback. */
      this._onAfterRenderCallback = () => {
      };
      /** @ignore */
      // mips generation cache handling
      __privateAdd$9(this, _mipsGeneration);
      this.index = 0;
      this.ready = false;
      this.options = {
        label: label ?? "GPUDeviceManager instance",
        production,
        adapterOptions,
        requiredFeatures,
        requestAdapterLimits,
        autoRender
      };
      this.onError = onError;
      this.onDeviceLost = onDeviceLost;
      this.onDeviceDestroyed = onDeviceDestroyed;
      this.gpu = navigator.gpu;
      this.setPipelineManager();
      this.setDeviceObjects();
      __privateSet$8(this, _mipsGeneration, {
        sampler: null,
        module: null,
        pipelineByFormat: {}
      });
      if (this.options.autoRender) {
        this.animate();
      }
    }
    /**
     * Set our {@link adapter} and {@link device} if possible.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async setAdapterAndDevice({ adapter = null, device = null } = {}) {
      await this.setAdapter(adapter);
      await this.setDevice(device);
    }
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set. Allow to use already created adapter and device.
     */
    async init({ adapter = null, device = null } = {}) {
      await this.setAdapterAndDevice({ adapter, device });
      if (this.device) {
        __privateMethod$7(this, _GPUDeviceManager_instances, createSamplers_fn).call(this);
        for (const renderer of this.renderers) {
          if (!renderer.context) {
            renderer.setContext();
          }
        }
      }
    }
    /**
     * Set our {@link GPUDeviceManager.adapter | adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @param adapter - {@link GPUAdapter} to use if set.
     */
    async setAdapter(adapter = null) {
      if (!this.gpu) {
        this.onError();
        throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
      }
      if (adapter) {
        this.adapter = adapter;
      } else {
        try {
          this.adapter = await this.gpu?.requestAdapter(this.options.adapterOptions);
          if (!this.adapter) {
            this.onError();
            throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
          }
        } catch (e) {
          this.onError();
          throwError("GPUDeviceManager: " + e.message);
        }
      }
    }
    /**
     * Set our {@link GPUDeviceManager.device | device}.
     * @param device - {@link GPUDevice} to use if set.
     */
    async setDevice(device = null) {
      if (device) {
        this.device = device;
        this.ready = true;
        this.index++;
      } else {
        try {
          const { limits } = this.adapter;
          const requiredLimits = {};
          for (const key in limits) {
            if (this.options.requestAdapterLimits.includes(key)) {
              requiredLimits[key] = limits[key];
            }
          }
          this.device = await this.adapter?.requestDevice({
            label: this.options.label + " " + this.index,
            requiredFeatures: this.options.requiredFeatures,
            requiredLimits
          });
          if (this.device) {
            this.ready = true;
            this.index++;
          }
        } catch (error) {
          this.onError();
          throwError(
            `${this.options.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`
          );
        }
      }
      this.device?.lost.then((info) => {
        throwWarning(`${this.options.label}: WebGPU device was lost: ${info.message}`);
        this.loseDevice();
        if (info.reason !== "destroyed") {
          this.onDeviceLost(info);
        } else {
          this.onDeviceDestroyed(info);
        }
      });
    }
    /**
     * Set our {@link pipelineManager | pipeline manager}.
     */
    setPipelineManager() {
      this.pipelineManager = new PipelineManager();
    }
    /**
     * Called when the {@link device} is lost.
     * Reset all our renderers.
     */
    loseDevice() {
      this.ready = false;
      this.pipelineManager.resetCurrentPipeline();
      const usedPipelineEntries = /* @__PURE__ */ new Set();
      this.deviceRenderedObjects.forEach((object) => {
        if (object.material && object.material.pipelineEntry) {
          usedPipelineEntries.add(object.material.pipelineEntry.uuid);
        }
      });
      this.pipelineManager.pipelineEntries = this.pipelineManager.pipelineEntries.filter(
        (pipelineEntry) => usedPipelineEntries.has(pipelineEntry.uuid)
      );
      this.samplers.forEach((sampler) => sampler.sampler = null);
      this.renderers.forEach((renderer) => renderer.loseContext());
      this.bindGroupLayouts.clear();
      this.buffers.clear();
      __privateSet$8(this, _mipsGeneration, {
        sampler: null,
        module: null,
        pipelineByFormat: {}
      });
    }
    /**
     * Called when the {@link device} should be restored.
     * Restore all our renderers.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async restoreDevice({ adapter = null, device = null } = {}) {
      await this.setAdapterAndDevice({ adapter, device });
      if (this.device) {
        __privateMethod$7(this, _GPUDeviceManager_instances, createSamplers_fn).call(this);
        this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.create());
        this.renderers.forEach((renderer) => renderer.restoreContext());
      }
    }
    /**
     * Set all objects arrays that we'll keep track of.
     */
    setDeviceObjects() {
      this.renderers = [];
      this.bindGroups = /* @__PURE__ */ new Map();
      this.buffers = /* @__PURE__ */ new Map();
      this.indirectBuffers = /* @__PURE__ */ new Map();
      this.bindGroupLayouts = /* @__PURE__ */ new Map();
      this.bufferBindings = /* @__PURE__ */ new Map();
      this.samplers = [];
      this.texturesQueue = [];
    }
    /**
     * Add a {@link Renderer} to our {@link renderers} array.
     * @param renderer - {@link Renderer} to add.
     */
    addRenderer(renderer) {
      this.renderers.push(renderer);
    }
    /**
     * Remove a {@link Renderer} from our {@link renderers} array.
     * @param renderer - {@link Renderer} to remove.
     */
    removeRenderer(renderer) {
      this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid);
    }
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}.
     * @readonly
     */
    get deviceRenderedObjects() {
      return this.renderers.map((renderer) => renderer.renderedObjects).flat();
    }
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add.
     */
    addBindGroup(bindGroup) {
      this.bindGroups.set(bindGroup.uuid, bindGroup);
    }
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove.
     */
    removeBindGroup(bindGroup) {
      this.bindGroups.delete(bindGroup.uuid);
    }
    /**
     * Add a {@link GPUBuffer} to our our {@link buffers} array.
     * @param buffer - {@link Buffer} to add.
     */
    addBuffer(buffer) {
      this.buffers.set(buffer.uuid, buffer);
    }
    /**
     * Remove a {@link Buffer} from our {@link buffers} Map.
     * @param buffer - {@link Buffer} to remove.
     */
    removeBuffer(buffer) {
      this.buffers.delete(buffer?.uuid);
    }
    /**
     * Add a {@link Sampler} to our {@link samplers} array.
     * @param sampler - {@link Sampler} to add.
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
    }
    /**
     * Remove a {@link Sampler} from our {@link samplers} array.
     * @param sampler - {@link Sampler} to remove.
     */
    removeSampler(sampler) {
      this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid);
    }
    /**
     * Copy an external image to the GPU.
     * @param source - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageSourceInfo.html | GPUCopyExternalImageSourceInfo (WebGPU API reference)} to use.
     * @param destination - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageDestInfo.html | GPUCopyExternalImageDestInfo (WebGPU API reference)} to use.
     * @param copySize - {@link https://gpuweb.github.io/types/types/GPUExtent3DStrict.html | GPUExtent3DStrict (WebGPU API reference)} to use.
     */
    copyExternalImageToTexture(source, destination, copySize) {
      this.device?.queue.copyExternalImageToTexture(source, destination, copySize);
    }
    /**
     * Upload a {@link MediaTexture#texture | texture} to the GPU.
     * @param texture - {@link MediaTexture} containing the {@link GPUTexture} to upload.
     * @param sourceIndex - Index of the source to upload (for cube maps). Default to `0`.
     */
    uploadTexture(texture, sourceIndex = 0) {
      if ("sources" in texture && texture.sources.length) {
        try {
          this.device?.queue.copyExternalImageToTexture(
            {
              source: texture.sources[sourceIndex].source,
              flipY: texture.options.flipY
            },
            {
              texture: texture.texture,
              premultipliedAlpha: texture.options.premultipliedAlpha,
              aspect: texture.options.aspect,
              colorSpace: texture.options.colorSpace,
              origin: [0, 0, sourceIndex]
            },
            { width: texture.size.width, height: texture.size.height, depthOrArrayLayers: 1 }
          );
          if (texture.texture.mipLevelCount > 1) {
            this.generateMips(texture);
          }
          this.texturesQueue.push({
            sourceIndex,
            texture
          });
        } catch ({ message }) {
          throwError(`GPUDeviceManager: could not upload texture: ${texture.options.name} because: ${message}`);
        }
      } else {
        for (let i = 0; i < texture.size.depth; i++) {
          this.device?.queue.writeTexture(
            { texture: texture.texture, origin: [0, 0, i] },
            new Uint8Array(texture.options.placeholderColor),
            { bytesPerRow: texture.size.width * 4 },
            { width: 1, height: 1, depthOrArrayLayers: 1 }
          );
        }
      }
    }
    /**
     * Mips generation helper on the GPU using our {@link device}. Caches sampler, module and pipeline (by {@link GPUTexture} formats) for faster generation.
     * Ported from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
     * @param texture - {@link Texture} for which to generate the mips.
     * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
     */
    generateMips(texture, commandEncoder = null) {
      if (!this.device) return;
      if (!__privateGet$8(this, _mipsGeneration).module) {
        __privateGet$8(this, _mipsGeneration).module = this.device.createShaderModule({
          label: "textured quad shaders for mip level generation",
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `
        });
        __privateGet$8(this, _mipsGeneration).sampler = this.device.createSampler({
          minFilter: "linear",
          magFilter: "linear"
        });
      }
      if (!__privateGet$8(this, _mipsGeneration).pipelineByFormat[texture.texture.format]) {
        __privateGet$8(this, _mipsGeneration).pipelineByFormat[texture.texture.format] = this.device.createRenderPipeline({
          label: "Mip level generator pipeline",
          layout: "auto",
          vertex: {
            module: __privateGet$8(this, _mipsGeneration).module
          },
          fragment: {
            module: __privateGet$8(this, _mipsGeneration).module,
            targets: [{ format: texture.texture.format }]
          }
        });
      }
      const pipeline = __privateGet$8(this, _mipsGeneration).pipelineByFormat[texture.texture.format];
      const encoder = commandEncoder || this.device.createCommandEncoder({
        label: "Mip gen encoder"
      });
      let width = texture.texture.width;
      let height = texture.texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);
        for (let layer = 0; layer < texture.texture.depthOrArrayLayers; ++layer) {
          const bindGroup = this.device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: __privateGet$8(this, _mipsGeneration).sampler },
              {
                binding: 1,
                resource: texture.texture.createView({
                  dimension: "2d",
                  baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1
                })
              }
            ]
          });
          const renderPassDescriptor = {
            label: "Mip generation render pass",
            colorAttachments: [
              {
                view: texture.texture.createView({
                  dimension: "2d",
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1
                }),
                loadOp: "clear",
                storeOp: "store"
              }
            ]
          };
          const pass = encoder.beginRenderPass(renderPassDescriptor);
          pass.setPipeline(pipeline);
          pass.setBindGroup(0, bindGroup);
          pass.draw(6);
          pass.end();
        }
        ++baseMipLevel;
      }
      if (!commandEncoder) {
        const commandBuffer = encoder.finish();
        this.device.queue.submit([commandBuffer]);
      }
    }
    /* RENDER */
    /**
     * Create a requestAnimationFrame loop and run it.
     */
    animate() {
      this.render();
      this.animationFrameID = requestAnimationFrame(this.animate.bind(this));
    }
    /**
     * Called each frame before rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUDeviceManager}.
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Called each frame after rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUDeviceManager}.
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Render everything:
     * - call all our {@link onBeforeRender} callback.
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks.
     * - create a {@link GPUCommandEncoder}.
     * - render all our {@link renderers}.
     * - submit our {@link GPUCommandBuffer}.
     * - upload {@link MediaTexture#texture | MediaTexture textures} that need it.
     * - empty our {@link texturesQueue} array.
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks.
     * - call all our {@link onAfterRender} callback.
     */
    render() {
      if (!this.ready) return;
      this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      for (const renderer of this.renderers) {
        if (renderer.shouldRender) renderer.onBeforeCommandEncoder();
      }
      const commandEncoder = this.device?.createCommandEncoder({ label: this.options.label + " command encoder" });
      !this.options.production && commandEncoder.pushDebugGroup(this.options.label + " command encoder: main render loop");
      this.renderers.forEach((renderer) => renderer.render(commandEncoder));
      !this.options.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
      for (const texture of this.texturesQueue) {
        texture.texture.setSourceUploaded(texture.sourceIndex);
      }
      this.texturesQueue = [];
      for (const renderer of this.renderers) {
        if (renderer.shouldRender) renderer.onAfterCommandEncoder();
      }
      this._onAfterRenderCallback && this._onAfterRenderCallback();
    }
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}.
     */
    destroy() {
      if (this.animationFrameID) {
        cancelAnimationFrame(this.animationFrameID);
      }
      this.animationFrameID = null;
      this.device?.destroy();
      this.device = null;
      this.renderers.forEach((renderer) => renderer.destroy());
      this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.buffers.forEach((buffer) => buffer?.destroy());
      this.indirectBuffers.forEach((indirectBuffer) => indirectBuffer.destroy());
      this.setDeviceObjects();
    }
  }
  _mipsGeneration = new WeakMap();
  _GPUDeviceManager_instances = new WeakSet();
  /**
   * Create or recreate (on device restoration) all {@link samplers}.
   * @private
   */
  createSamplers_fn = function() {
    this.samplers.forEach((sampler) => {
      sampler.createSampler();
    });
  };

  class GPURenderer {
    /**
     * GPURenderer constructor
     * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}.
     */
    constructor({
      deviceManager,
      label,
      container,
      pixelRatio = 1,
      autoResize = true,
      context = {},
      renderPass
    }) {
      // callbacks / events
      /** function assigned to the {@link onBeforeRender} callback. */
      this._onBeforeRenderCallback = (commandEncoder) => {
      };
      /** function assigned to the {@link onAfterRender} callback. */
      this._onAfterRenderCallback = (commandEncoder) => {
      };
      /** function assigned to the {@link onResize} callback. */
      this._onResizeCallback = () => {
      };
      /** function assigned to the {@link onAfterResize} callback. */
      this._onAfterResizeCallback = () => {
      };
      this.type = "GPURenderer";
      this.uuid = generateUUID();
      if (!deviceManager || !(deviceManager instanceof GPUDeviceManager)) {
        throwError(
          label ? `${label} (${this.type}): no device manager or wrong device manager provided: ${typeof deviceManager} (${deviceManager?.constructor.name})` : `${this.type}: no device manager or wrong device manager provided: ${typeof deviceManager} (${deviceManager?.constructor.name})`
        );
      }
      if (!label) {
        label = `${this.constructor.name}${deviceManager.renderers.length}`;
      }
      this.deviceManager = deviceManager;
      this.deviceManager.addRenderer(this);
      this.shouldRender = true;
      this.shouldRenderScene = true;
      const contextOptions = {
        ...{
          alphaMode: "premultiplied",
          format: this.deviceManager.gpu?.getPreferredCanvasFormat() || "bgra8unorm"
        },
        ...context
      };
      renderPass = { ...{ useDepth: true, sampleCount: 4 }, ...renderPass };
      this.options = {
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        context: contextOptions,
        renderPass
      };
      this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
      const isOffscreenCanvas = container instanceof OffscreenCanvas;
      const isContainerCanvas = isOffscreenCanvas || container instanceof HTMLCanvasElement;
      this.canvas = isContainerCanvas ? container : document.createElement("canvas");
      const { width, height } = this.canvas;
      this.rectBBox = {
        width,
        height,
        top: 0,
        left: 0
      };
      this.viewport = null;
      this.scissorRect = null;
      this.setScene();
      this.setTasksQueues();
      this.setRendererObjects();
      this.setMainRenderPasses();
      if (!isOffscreenCanvas) {
        this.domElement = new DOMElement({
          element: container,
          priority: 5,
          // renderer callback need to be called first
          onSizeChanged: () => {
            if (this.options.autoResize) this.resize();
          }
        });
        this.resize();
        if (!isContainerCanvas) {
          this.domElement.element.appendChild(this.canvas);
        }
      }
      if (this.deviceManager.device) {
        this.setContext();
      }
    }
    /**
     * Set the renderer {@link RectBBox} and canvas sizes.
     * @param rectBBox - The optional new {@link canvas} {@link RectBBox} to set.
     */
    setSize(rectBBox = null) {
      rectBBox = {
        ...{
          width: Math.max(1, this.boundingRect.width),
          height: Math.max(1, this.boundingRect.height),
          top: this.boundingRect.top,
          left: this.boundingRect.left
        },
        ...rectBBox
      };
      this.rectBBox = rectBBox;
      const renderingSize = {
        width: this.rectBBox.width,
        height: this.rectBBox.height
      };
      renderingSize.width *= this.pixelRatio;
      renderingSize.height *= this.pixelRatio;
      this.clampToMaxDimension(renderingSize);
      this.canvas.width = Math.floor(renderingSize.width);
      this.canvas.height = Math.floor(renderingSize.height);
      if (this.canvas.style) {
        this.canvas.style.width = this.rectBBox.width + "px";
        this.canvas.style.height = this.rectBBox.height + "px";
      }
    }
    /**
     * Set the renderer, {@link renderPass} and {@link postProcessingPass} {@link viewport} values. Beware that if you use a {@link viewport}, you should resize it yourself so it does not overflow the `canvas` in the `onResize` callback to avoid issues.
     * @param viewport - {@link RenderPassViewport} settings to use. Can be set to `null` to cancel the {@link viewport}.
     */
    setViewport(viewport = null) {
      if (!viewport) {
        this.viewport = null;
        this.renderPass?.setViewport(null);
        this.postProcessingPass?.setViewport(null);
      } else {
        viewport = {
          ...{
            width: this.canvas.width,
            height: this.canvas.height,
            top: 0,
            left: 0,
            minDepth: 0,
            maxDepth: 1
          },
          ...viewport
        };
        let { width, height, top, left, minDepth, maxDepth } = viewport;
        width = Math.min(width, this.canvas.width);
        height = Math.min(height, this.canvas.height);
        top = Math.max(0, top);
        left = Math.max(0, left);
        this.viewport = {
          width,
          height,
          top,
          left,
          minDepth,
          maxDepth
        };
        this.renderPass?.setViewport(this.viewport);
        this.postProcessingPass?.setViewport(this.viewport);
      }
    }
    /**
     * Set the renderer, {@link renderPass} and {@link postProcessingPass} {@link GPURenderer#scissorRect | scissorRect} values. Beware that if you use a {@link GPURenderer#scissorRect | scissorRect}, you should resize it yourself so it does not overflow the `canvas` in the `onResize` callback to avoid issues.
     * @param scissorRect - {@link RectBBox} settings to use. Can be set to `null` to cancel the {@link GPURenderer#scissorRect | scissorRect}.
     */
    setScissorRect(scissorRect = null) {
      if (!scissorRect) {
        this.scissorRect = null;
        this.renderPass?.setScissorRect(null);
        this.postProcessingPass?.setScissorRect(null);
      } else {
        scissorRect = {
          ...{
            width: this.canvas.width,
            height: this.canvas.height,
            top: 0,
            left: 0
          },
          ...scissorRect
        };
        let { width, height, top, left } = scissorRect;
        width = Math.min(width, this.canvas.width);
        height = Math.min(height, this.canvas.height);
        top = Math.max(0, top);
        left = Math.max(0, left);
        this.scissorRect = {
          width,
          height,
          top,
          left
        };
        this.renderPass?.setScissorRect(this.scissorRect);
        this.postProcessingPass?.setScissorRect(this.scissorRect);
      }
    }
    /**
     * Set the renderer {@link GPURenderer.pixelRatio | pixel ratio} and {@link resize} it.
     * @param pixelRatio - New pixel ratio to use.
     */
    setPixelRatio(pixelRatio = 1) {
      this.pixelRatio = pixelRatio;
      this.resize(this.rectBBox);
    }
    /**
     * Resize our {@link GPURenderer}.
     * @param rectBBox - The optional new {@link canvas} {@link RectBBox} to set.
     */
    resize(rectBBox = null) {
      this.setSize(rectBBox);
      this._onResizeCallback && this._onResizeCallback();
      this.resizeObjects();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /**
     * Resize all tracked objects ({@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes).
     */
    resizeObjects() {
      this.renderBundles.forEach((renderBundle) => renderBundle.resize());
      this.textures.forEach((texture) => {
        texture.resize();
      });
      this.renderPass?.resize();
      this.postProcessingPass?.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize());
      this.computePasses.forEach((computePass) => computePass.resize());
      this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
      this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
      this.resizeMeshes();
    }
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes() {
      this.meshes.forEach((mesh) => {
        mesh.resize(this.boundingRect);
      });
    }
    /**
     * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}. If there's no {@link domElement | DOM Element} (like when using an offscreen canvas for example), the {@link rectBBox} values are used.
     */
    get boundingRect() {
      if (!!this.domElement && !!this.domElement.boundingRect) {
        return this.domElement.boundingRect;
      } else if (!!this.domElement) {
        const boundingRect = this.domElement.element?.getBoundingClientRect();
        return {
          top: boundingRect.top,
          right: boundingRect.right,
          bottom: boundingRect.bottom,
          left: boundingRect.left,
          width: boundingRect.width,
          height: boundingRect.height,
          x: boundingRect.x,
          y: boundingRect.y
        };
      } else {
        return {
          top: this.rectBBox.top,
          right: this.rectBBox.left + this.rectBBox.width,
          bottom: this.rectBBox.top + this.rectBBox.height,
          left: this.rectBBox.left,
          width: this.rectBBox.width,
          height: this.rectBBox.height,
          x: this.rectBBox.left,
          y: this.rectBBox.top
        };
      }
    }
    /**
     * Clamp to max WebGPU texture dimensions.
     * @param dimension - Width and height dimensions to clamp.
     */
    clampToMaxDimension(dimension) {
      if (this.device) {
        dimension.width = Math.min(this.device.limits.maxTextureDimension2D, dimension.width);
        dimension.height = Math.min(this.device.limits.maxTextureDimension2D, dimension.height);
      }
    }
    /* USEFUL DEVICE MANAGER OBJECTS */
    /**
     * Get our {@link GPUDeviceManager#device | device}.
     * @readonly
     */
    get device() {
      return this.deviceManager.device;
    }
    /**
     * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set.
     * @readonly
     */
    get ready() {
      return this.deviceManager.ready && !!this.context && !!this.boundingRect.width && !!this.boundingRect.height;
    }
    /**
     * Get our {@link core/renderers/GPUDeviceManager.GPUDeviceManagerBaseParams#production | GPUDeviceManager production flag}.
     * @readonly
     */
    get production() {
      return this.deviceManager.options.production;
    }
    /**
     * Get all the created {@link GPUDeviceManager#samplers | samplers}.
     * @readonly
     */
    get samplers() {
      return this.deviceManager.samplers;
    }
    /**
     * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}.
     * @readonly
     */
    get buffers() {
      return this.deviceManager.buffers;
    }
    /**
     * Get all the created {@link GPUDeviceManager#indirectBuffers | indirect buffers}.
     * @readonly
     */
    get indirectBuffers() {
      return this.deviceManager.indirectBuffers;
    }
    /**
     * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}.
     * @readonly
     */
    get pipelineManager() {
      return this.deviceManager.pipelineManager;
    }
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}.
     * @readonly
     */
    get deviceRenderedObjects() {
      return this.deviceManager.deviceRenderedObjects;
    }
    /**
     * Configure our {@link context} with the given options.
     */
    configureContext() {
      this.context.configure({
        device: this.device,
        ...this.options.context,
        // needed so we can copy textures for post processing usage
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
        //viewFormats: []
      });
    }
    /**
     * Set our {@link context} if possible and initialize the {@link renderPass} and {@link postProcessingPass}.
     */
    setContext() {
      this.context = this.canvas.getContext("webgpu");
      if (this.device) {
        this.configureContext();
        this.textures.forEach((texture) => {
          if (!texture.texture) {
            texture.createTexture();
          }
        });
        this.renderPasses.forEach((renderPass) => renderPass.init());
      }
    }
    /**
     * Called when the {@link GPUDeviceManager#device | device} is lost.
     * Force all our scene objects to lose context.
     */
    loseContext() {
      this.renderBundles.forEach((bundle) => bundle.loseContext());
      this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext());
    }
    /**
     * Called when the {@link GPUDeviceManager#device | device} should be restored.
     * Configure the context again, resize the {@link RenderTarget | render targets} and {@link Texture | textures}, restore our {@link renderedObjects | rendered objects} context.
     */
    restoreContext() {
      this.configureContext();
      this.textures.forEach((texture) => {
        texture.createTexture();
      });
      this.renderPass?.resize();
      this.postProcessingPass?.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize());
      this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext());
      this.environmentMaps.forEach((environmentMap) => {
        environmentMap.computeBRDFLUTTexture();
        environmentMap.computeFromHDR();
      });
    }
    /* PIPELINES, SCENE & MAIN RENDER PASS */
    /**
     * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen and our {@link postProcessingPass | postprocessing pass} that will be used for any additional postprocessing render passes.
     */
    setMainRenderPasses() {
      this.renderPass = new RenderPass(this, {
        label: this.options.label + " render pass",
        ...this.options.renderPass
      });
      this.scene.setMainRenderPassEntry();
      this.postProcessingPass = new RenderPass(this, {
        label: this.options.label + " post processing render pass",
        // no need to handle depth or perform MSAA on a fullscreen quad
        useDepth: false,
        sampleCount: 1
      });
    }
    /**
     * Set our {@link scene}.
     */
    setScene() {
      this.scene = new Scene({ renderer: this });
    }
    /* BUFFERS & BINDINGS */
    /**
     * Create a {@link !GPUBuffer}.
     * @param buffer - {@link Buffer} to use for buffer creation.
     * @returns - newly created {@link !GPUBuffer}.
     */
    createBuffer(buffer) {
      const GPUBuffer = this.deviceManager.device?.createBuffer(buffer.options);
      this.deviceManager.addBuffer(buffer);
      return GPUBuffer;
    }
    /**
     * Remove a {@link Buffer} from our {@link GPUDeviceManager#buffers | buffers Map}.
     * @param buffer - {@link Buffer} to remove.
     */
    removeBuffer(buffer) {
      this.deviceManager.removeBuffer(buffer);
    }
    /**
     * Write to a {@link GPUBuffer}.
     * @param buffer - {@link GPUBuffer} to write to.
     * @param bufferOffset - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer#bufferoffset | Buffer offset}.
     * @param data - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUQueue/writeBuffer#data | Data} to write.
     */
    queueWriteBuffer(buffer, bufferOffset, data) {
      this.deviceManager.device?.queue.writeBuffer(buffer, bufferOffset, data);
    }
    /**
     * Copy a source {@link Buffer#GPUBuffer | Buffer GPUBuffer} into a destination {@link Buffer#GPUBuffer | Buffer GPUBuffer}.
     * @param parameters - Parameters used to realize the copy.
     * @param parameters.srcBuffer - Source {@link Buffer}.
     * @param [parameters.dstBuffer] - Destination {@link Buffer}. Will create a new one if none provided.
     * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
     * @returns - Destination {@link Buffer} after copy.
     */
    copyBufferToBuffer({
      srcBuffer,
      dstBuffer,
      commandEncoder
    }) {
      if (!srcBuffer || !srcBuffer.GPUBuffer) {
        throwWarning(
          `${this.options.label} (${this.type}): cannot copy to buffer because the source buffer has not been provided`
        );
        return null;
      }
      if (!dstBuffer) {
        dstBuffer = new Buffer();
      }
      if (!dstBuffer.GPUBuffer) {
        dstBuffer.createBuffer(this, {
          label: `GPURenderer (${this.options.label}): destination copy buffer from: ${srcBuffer.options.label}`,
          size: srcBuffer.GPUBuffer.size,
          //usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
          usage: ["copyDst", "mapRead"]
        });
      }
      if (srcBuffer.GPUBuffer.mapState !== "unmapped") {
        throwWarning(
          `${this.options.label} (${this.type}): Cannot copy from ${srcBuffer.GPUBuffer} because it is currently mapped`
        );
        return;
      }
      if (dstBuffer.GPUBuffer.mapState !== "unmapped") {
        throwWarning(
          `${this.options.label} (${this.type}): Cannot copy from ${dstBuffer.GPUBuffer} because it is currently mapped`
        );
        return;
      }
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = this.deviceManager.device?.createCommandEncoder({
          label: `${this.type} (${this.options.label}): Copy buffer command encoder`
        });
        !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Copy buffer command encoder`);
      }
      commandEncoder.copyBufferToBuffer(srcBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer.size);
      if (!hasCommandEncoder) {
        !this.production && commandEncoder.popDebugGroup();
        const commandBuffer = commandEncoder.finish();
        this.deviceManager.device?.queue.submit([commandBuffer]);
      }
      return dstBuffer;
    }
    /* BIND GROUPS & LAYOUTS */
    /**
     * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}.
     * @readonly
     */
    get bindGroups() {
      return this.deviceManager.bindGroups;
    }
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | Bind group} to add.
     */
    addBindGroup(bindGroup) {
      this.deviceManager.addBindGroup(bindGroup);
    }
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | Bind group} to remove.
     */
    removeBindGroup(bindGroup) {
      this.deviceManager.removeBindGroup(bindGroup);
    }
    /**
     * Create a {@link GPUBindGroupLayout}.
     * @param bindGroupLayoutDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroupLayout#descriptor | GPUBindGroupLayoutDescriptor}.
     * @returns - Newly created {@link GPUBindGroupLayout}.
     */
    createBindGroupLayout(bindGroupLayoutDescriptor) {
      return this.deviceManager.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    /**
     * Create a {@link GPUBindGroup}.
     * @param bindGroupDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createBindGroup#descriptor | GPUBindGroupDescriptor}.
     * @returns - Newly created {@link GPUBindGroup}.
     */
    createBindGroup(bindGroupDescriptor) {
      return this.deviceManager.device?.createBindGroup(bindGroupDescriptor);
    }
    /* SHADERS & PIPELINES */
    /**
     * Create a {@link GPUShaderModule}.
     * @param shaderModuleDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule#descriptor | GPUShaderModuleDescriptor}
     * @returns - Newly created {@link GPUShaderModule}.
     */
    createShaderModule(shaderModuleDescriptor) {
      return this.device?.createShaderModule(shaderModuleDescriptor);
    }
    /**
     * Create a {@link GPUPipelineLayout}.
     * @param pipelineLayoutDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createPipelineLayout#descriptor | GPUPipelineLayoutDescriptor}.
     * @returns - Newly created {@link GPUPipelineLayout}.
     */
    createPipelineLayout(pipelineLayoutDescriptor) {
      return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
    }
    /**
     * Create a {@link GPURenderPipeline}.
     * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#descriptor | GPURenderPipelineDescriptor}.
     * @returns - Newly created {@link GPURenderPipeline}.
     */
    createRenderPipeline(pipelineDescriptor) {
      return this.device?.createRenderPipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPURenderPipeline}.
     * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#descriptor | GPURenderPipelineDescriptor}.
     * @returns - Newly created {@link GPURenderPipeline}.
     */
    async createRenderPipelineAsync(pipelineDescriptor) {
      return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
    }
    /**
     * Create a {@link GPUComputePipeline}.
     * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline#descriptor | GPUComputePipelineDescriptor}.
     * @returns - Newly created {@link GPUComputePipeline}.
     */
    createComputePipeline(pipelineDescriptor) {
      return this.device?.createComputePipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPUComputePipeline}.
     * @param pipelineDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createComputePipeline#descriptor | GPUComputePipelineDescriptor}.
     * @returns - Newly created {@link GPUComputePipeline}.
     */
    async createComputePipelineAsync(pipelineDescriptor) {
      return await this.device?.createComputePipelineAsync(pipelineDescriptor);
    }
    /* TEXTURES */
    /**
     * Add a {@link Texture} to our {@link textures} array.
     * @param texture - {@link Texture} to add.
     */
    addTexture(texture) {
      this.textures.push(texture);
    }
    /**
     * Remove a {@link Texture} from our {@link textures} array.
     * @param texture - {@link Texture} to remove.
     */
    removeTexture(texture) {
      this.textures = this.textures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Create a {@link GPUTexture}.
     * @param textureDescriptor - {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createTexture#descriptor | GPUTextureDescriptor}.
     * @returns - Newly created {@link GPUTexture}.
     */
    createTexture(textureDescriptor) {
      return this.deviceManager.device?.createTexture(textureDescriptor);
    }
    /**
     * Upload a {@link MediaTexture#texture | texture} or {@link DOMTexture#texture | texture} to the GPU.
     * @param texture - {@link MediaTexture} or {@link DOMTexture} containing the {@link GPUTexture} to upload.
     * @param sourceIndex - Index of the source to upload (for cube maps). Default to `0`.
     */
    uploadTexture(texture, sourceIndex = 0) {
      this.deviceManager.uploadTexture(texture, sourceIndex);
    }
    /**
     * Generate mips on the GPU using our {@link GPUDeviceManager}.
     * @param texture - {@link Texture}, {@link MediaTexture} or {@link DOMTexture} for which to generate the mips.
     * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
     */
    generateMips(texture, commandEncoder = null) {
      this.deviceManager.generateMips(texture, commandEncoder);
    }
    /**
     * Import a {@link GPUExternalTexture}.
     * @param source - {@link HTMLVideoElement} or {@link VideoFrame} source.
     * @param label - Optional label of the texture.
     * @returns - {@link GPUExternalTexture}.
     */
    importExternalTexture(source, label = "") {
      return this.deviceManager.device?.importExternalTexture({ label, source });
    }
    /**
     * Copy a {@link GPUTexture} to a {@link Texture} using a {@link GPUCommandEncoder}. Automatically generate mips after copy if the {@link Texture} needs it.
     * @param gpuTexture - {@link GPUTexture} source to copy from.
     * @param texture - {@link Texture} destination to copy onto.
     * @param commandEncoder - {@link GPUCommandEncoder} to use for copy operation.
     */
    copyGPUTextureToTexture(gpuTexture, texture, commandEncoder) {
      if (gpuTexture.width !== texture.texture.width || gpuTexture.height !== texture.texture.height || gpuTexture.depthOrArrayLayers !== texture.texture.depthOrArrayLayers) {
        return;
      }
      commandEncoder.copyTextureToTexture(
        {
          texture: gpuTexture
        },
        {
          texture: texture.texture
        },
        [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers]
      );
      if (texture.options.generateMips) {
        this.generateMips(texture, commandEncoder);
      }
    }
    /**
     * Copy a {@link Texture} to a {@link Texture} using a {@link GPUCommandEncoder}. Automatically generate mips after copy if the destination {@link Texture} needs it.
     * @param texture1 - {@link Texture} source to copy from.
     * @param texture2 - {@link Texture} destination to copy onto.
     * @param commandEncoder - {@link GPUCommandEncoder} to use for copy operation.
     */
    copyTextureToTexture(texture1, texture2, commandEncoder) {
      this.copyGPUTextureToTexture(texture1.texture, texture2, commandEncoder);
    }
    /**
     * Copy a {@link Texture} to a {@link GPUTexture} using a {@link GPUCommandEncoder}.
     * @param texture - {@link Texture} source to copy from.
     * @param gpuTexture - {@link GPUTexture} destination to copy onto.
     * @param commandEncoder - {@link GPUCommandEncoder} to use for copy operation.
     */
    copyTextureToGPUTexture(texture, gpuTexture, commandEncoder) {
      if (gpuTexture.width !== texture.texture.width || gpuTexture.height !== texture.texture.height || gpuTexture.depthOrArrayLayers !== texture.texture.depthOrArrayLayers) {
        return;
      }
      commandEncoder.copyTextureToTexture(
        {
          texture: texture.texture
        },
        {
          texture: gpuTexture
        },
        [gpuTexture.width, gpuTexture.height, gpuTexture.depthOrArrayLayers]
      );
    }
    /* SAMPLERS */
    /**
     * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
     * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
     * @param sampler - {@link Sampler} to create.
     * @returns - {@link GPUSampler} from cache or newly created {@link GPUSampler}.
     */
    createSampler(sampler) {
      const existingSampler = this.samplers.find((existingSampler2) => {
        return JSON.stringify(existingSampler2.options) === JSON.stringify(sampler.options) && existingSampler2.sampler;
      });
      if (existingSampler) {
        return existingSampler.sampler;
      } else {
        const { type, ...samplerOptions } = sampler.options;
        const gpuSampler = this.deviceManager.device?.createSampler({
          label: sampler.label,
          ...samplerOptions
        });
        this.deviceManager.addSampler(sampler);
        return gpuSampler;
      }
    }
    /**
     * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}.
     * @param sampler - {@link Sampler} to remove.
     */
    removeSampler(sampler) {
      this.deviceManager.removeSampler(sampler);
    }
    /* OBJECTS & TASKS */
    /**
     * Set different tasks queue managers to execute callbacks at different phases of our render call:
     * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder.
     * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}.
     * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}.
     * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder.
     */
    setTasksQueues() {
      this.onBeforeCommandEncoderCreation = new TasksQueueManager();
      this.onBeforeRenderScene = new TasksQueueManager();
      this.onAfterRenderScene = new TasksQueueManager();
      this.onAfterCommandEncoderSubmission = new TasksQueueManager();
    }
    /**
     * Set all objects arrays and {@link Map} that we'll keep track of.
     */
    setRendererObjects() {
      this.computePasses = [];
      this.pingPongPlanes = [];
      this.shaderPasses = [];
      this.renderPasses = /* @__PURE__ */ new Map();
      this.renderTargets = [];
      this.meshes = [];
      this.textures = [];
      this.environmentMaps = /* @__PURE__ */ new Map();
      this.renderBundles = /* @__PURE__ */ new Map();
      this.animations = /* @__PURE__ */ new Map();
    }
    /**
     * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes).
     * @readonly
     */
    get renderedObjects() {
      return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes];
    }
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
     * Useful (but slow) to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | Bind group} to check.
     */
    getObjectsByBindGroup(bindGroup) {
      return this.deviceRenderedObjects.filter((object) => {
        return [
          ...object.material.bindGroups,
          ...object.material.inputsBindGroups,
          ...object.material.clonedBindGroups
        ].some((bG) => bG.uuid === bindGroup.uuid);
      });
    }
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link DOMTexture}, {@link MediaTexture} or {@link Texture}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param texture - {@link DOMTexture}, {@link MediaTexture} or {@link Texture} to check.
     */
    getObjectsByTexture(texture) {
      return this.deviceRenderedObjects.filter((object) => {
        return object.material.textures.some((t) => t.uuid === texture.uuid);
      });
    }
    /* EVENTS */
    /**
     * Assign a callback function to _onBeforeRenderCallback.
     * @param callback - callback to run just before the {@link render} method will be executed.
     * @returns - Our renderer.
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onAfterRenderCallback.
     * @param callback - callback to run just after the {@link render} method has been executed.
     * @returns - Our renderer.
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run after the {@link GPURenderer} has been resized but before the {@link resizeObjects} method has been executed (before the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes are resized).
     * @param callback - callback to execute.
     * @returns - Our renderer.
     */
    onResize(callback) {
      if (callback) {
        this._onResizeCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run after the {@link GPURenderer} has been resized and after the {@link resizeObjects} method has been executed (after the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes have been resized).
     * @param callback - callback to execute.
     * @returns - Our renderer.
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Render a single {@link ComputePass}.
     * @param commandEncoder - current {@link GPUCommandEncoder} to use.
     * @param computePass - {@link ComputePass} to run.
     * @param copyBuffer - Whether to copy all writable binding buffers that need it.
     */
    renderSingleComputePass(commandEncoder, computePass, copyBuffer = true) {
      const pass = commandEncoder.beginComputePass();
      computePass.render(pass);
      pass.end();
      if (copyBuffer) {
        computePass.copyBufferToResult(commandEncoder);
      }
    }
    /**
     * Render a single {@link RenderedMesh | Mesh}.
     * @param commandEncoder - current {@link GPUCommandEncoder}.
     * @param mesh - {@link RenderedMesh | Mesh} to render.
     */
    renderSingleMesh(commandEncoder, mesh) {
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      mesh.render(pass);
      pass.end();
    }
    /**
     * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}.
     * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render.
     */
    renderOnce(objects) {
      const commandEncoder = this.device?.createCommandEncoder({
        label: "Render once command encoder"
      });
      !this.production && commandEncoder.pushDebugGroup("Render once command encoder");
      this.pipelineManager.resetCurrentPipeline();
      objects.forEach((object) => {
        if (object.type === "ComputePass") {
          this.renderSingleComputePass(commandEncoder, object);
        } else {
          this.renderSingleMesh(commandEncoder, object);
        }
      });
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
      this.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
     * @param commandEncoder - {@link GPUCommandEncoder} to use if any.
     * @param renderPass - {@link RenderPass} to clear. Default to {@link GPURenderer#renderPass | renderPass}.
     */
    forceClear(commandEncoder, renderPass = this.renderPass) {
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = this.device?.createCommandEncoder({
          label: `${this.type} (${this.options.label}): Force clear command encoder`
        });
        !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Force clear command encoder`);
      }
      renderPass.updateView();
      renderPass.setDepthReadOnly(false);
      renderPass.setLoadOp("clear");
      renderPass.setDepthLoadOp("clear");
      const pass = commandEncoder.beginRenderPass(renderPass.descriptor);
      pass.end();
      if (!hasCommandEncoder) {
        !this.production && commandEncoder.popDebugGroup();
        const commandBuffer = commandEncoder.finish();
        this.device?.queue.submit([commandBuffer]);
      }
    }
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created. Used to update the {@link Scene} matrix stack.
     */
    onBeforeCommandEncoder() {
      if (!this.ready) return;
      if (this.shouldRenderScene) this.scene?.onBeforeRender();
      this.onBeforeCommandEncoderCreation.execute();
    }
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
     */
    onAfterCommandEncoder() {
      if (!this.ready) return;
      this.textures.forEach((texture) => {
        if (texture instanceof MediaTexture) {
          texture.closeVideoFrame();
        }
      });
      this.onAfterCommandEncoderSubmission.execute();
    }
    /**
     * Called at each draw call to render our scene and its content.
     * @param commandEncoder - current {@link GPUCommandEncoder}.
     */
    render(commandEncoder) {
      if (!this.ready || !this.shouldRender) return;
      this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
      this.onBeforeRenderScene.execute(commandEncoder);
      if (this.shouldRenderScene) {
        this.textures.forEach((texture) => {
          if (texture instanceof MediaTexture) {
            texture.update();
          }
        });
        this.scene?.render(commandEncoder);
      }
      this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
      this.onAfterRenderScene.execute(commandEncoder);
    }
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well.
     */
    destroy() {
      this.deviceManager.renderers = this.deviceManager.renderers.filter((renderer) => renderer.uuid !== this.uuid);
      this.domElement?.destroy();
      this.renderBundles.forEach((bundle) => bundle.destroy());
      this.animations = /* @__PURE__ */ new Map();
      this.renderPass?.destroy();
      this.postProcessingPass?.destroy();
      this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
      this.renderedObjects.forEach((sceneObject) => sceneObject.remove());
      this.textures.forEach((texture) => texture.destroy());
      this.context?.unconfigure();
    }
  }

  var __typeError$8 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$8 = (obj, member, msg) => member.has(obj) || __typeError$8("Cannot " + msg);
  var __privateGet$7 = (obj, member, getter) => (__accessCheck$8(obj, member, "read from private field"), member.get(obj));
  var __privateAdd$8 = (obj, member, value) => member.has(obj) ? __typeError$8("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$7 = (obj, member, value, setter) => (__accessCheck$8(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$6 = (obj, member, method) => (__accessCheck$8(obj, member, "access private method"), method);
  var _shouldUpdateCameraLightsBindGroup, _GPUCameraRenderer_instances, initLights_fn, updateLightsCount_fn;
  class GPUCameraRenderer extends GPURenderer {
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({
      deviceManager,
      label,
      container,
      pixelRatio = 1,
      autoResize = true,
      context = {},
      renderPass,
      camera = {},
      lights = {}
    }) {
      super({
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        context,
        renderPass
      });
      __privateAdd$8(this, _GPUCameraRenderer_instances);
      /** @ignore */
      __privateAdd$8(this, _shouldUpdateCameraLightsBindGroup);
      this.type = "GPUCameraRenderer";
      camera = { ...{ fov: 50, near: 0.1, far: 1e3 }, ...camera };
      if (lights !== false) {
        lights = {
          ...{
            maxAmbientLights: 2,
            maxDirectionalLights: 5,
            maxPointLights: 5,
            maxSpotLights: 5,
            useUniformsForShadows: false
          },
          ...lights
        };
      }
      this.options = {
        ...this.options,
        camera,
        lights
      };
      this.bindings = {};
      __privateSet$7(this, _shouldUpdateCameraLightsBindGroup, true);
      this.lights = [];
      this.cameraViewport = null;
      this.setCamera(camera);
      this.setCameraBinding();
      if (this.options.lights) {
        __privateMethod$6(this, _GPUCameraRenderer_instances, initLights_fn).call(this);
      }
      this.setCameraLightsBindGroup();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext() {
      super.loseContext();
      this.cameraLightsBindGroup.loseContext();
      this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.loseContext());
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraLightsBindGroup | camera, lights and shadows bind group} bindings.
     */
    restoreContext() {
      super.restoreContext();
      this.cameraLightsBindGroup?.restoreContext();
      this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.restoreContext());
      this.updateCameraBindings();
    }
    /**
     * Set our {@link renderPass | main render pass} and our {@link transmissionTarget} sampler.
     */
    setMainRenderPasses() {
      super.setMainRenderPasses();
      this.transmissionTarget = {
        sampler: new Sampler(this, {
          label: "Transmission sampler",
          name: "transmissionSampler",
          magFilter: "linear",
          minFilter: "linear",
          mipmapFilter: "linear",
          addressModeU: "clamp-to-edge",
          addressModeV: "clamp-to-edge"
        })
      };
    }
    /* CAMERA */
    /**
     * Set the default {@link camera}.
     * @param cameraParameters - {@link PerspectiveCameraBaseOptions | parameters} used to create the {@link camera}.
     */
    setCamera(cameraParameters) {
      const { width, height } = this.rectBBox;
      this.useCamera(
        new PerspectiveCamera({
          fov: cameraParameters.fov,
          near: cameraParameters.near,
          far: cameraParameters.far,
          width,
          height,
          pixelRatio: this.pixelRatio,
          onMatricesChanged: () => {
            this.onCameraMatricesChanged();
          }
        })
      );
    }
    /**
     * Tell our {@link GPUCameraRenderer} to use this {@link RendererCamera}. If a {@link RendererCamera | camera} has already been set, reset the {@link GPUCameraRenderer#bindings.camera | camera binding} inputs view values and the {@link meshes} {@link RendererCamera} object.
     * @param camera - New {@link RendererCamera} to use.
     * @returns - This {@link GPUCameraRenderer} with its {@link RendererCamera | camera} type updated.
     */
    useCamera(camera) {
      if (this.camera && camera && this.camera.uuid === camera.uuid) return;
      if (this.camera) {
        this.camera.parent = null;
        this.camera.onMatricesChanged = () => {
        };
      }
      this.camera = camera;
      this.camera.parent = this.scene;
      this.resizeCamera();
      if (this.bindings.camera) {
        this.camera.onMatricesChanged = () => this.onCameraMatricesChanged();
        this.bindings.camera.inputs.view.value = this.camera.viewMatrix;
        this.bindings.camera.inputs.projection.value = this.camera.projectionMatrix;
        this.bindings.camera.inputs.position.value = this.camera.actualPosition;
        for (const mesh of this.meshes) {
          if ("modelViewMatrix" in mesh) {
            mesh.camera = this.camera;
          }
        }
      }
      return this;
    }
    /**
     * Update the {@link cameraViewport} if needed (i.e. if the camera use a different aspect ratio than the renderer).
     */
    updateCameraViewport() {
      let { width, height } = this.canvas;
      if (this.viewport) {
        width = Math.min(width, this.viewport.width);
        height = Math.min(height, this.viewport.height);
      }
      if (this.camera instanceof PerspectiveCamera && this.camera.forceAspect) {
        width = Math.min(width, height * this.camera.forceAspect);
        height = Math.min(width / this.camera.forceAspect, height);
        this.setCameraViewport({
          width,
          height,
          top: (this.canvas.height - height) * 0.5,
          left: (this.canvas.width - width) * 0.5,
          minDepth: 0,
          maxDepth: 1
        });
      } else {
        this.setCameraViewport();
      }
    }
    /**
     * Resize the {@link camera}, first by updating the {@link cameraViewport} and then resetting the {@link camera} projection.
     */
    resizeCamera() {
      this.updateCameraViewport();
      const { width, height } = this.cameraViewport ?? this.viewport ?? this.canvas;
      if (this.camera instanceof PerspectiveCamera) {
        this.camera?.setPerspective({
          width,
          height,
          pixelRatio: this.pixelRatio
        });
      } else if (this.camera instanceof OrthographicCamera) {
        const aspect = width / height;
        const frustumSize = this.camera.top * 2;
        this.camera.setOrthographic({
          left: -frustumSize * aspect / 2,
          right: frustumSize * aspect / 2,
          pixelRatio: this.pixelRatio
        });
      }
    }
    /**
     * Set the {@link cameraViewport} (that should be contained within the renderer {@link GPURenderer#viewport | viewport} if any) and update the {@link renderPass} and {@link postProcessingPass} {@link GPURenderer#viewport | viewport} values.
     * @param viewport - {@link RenderPassViewport} settings to use if any.
     */
    setCameraViewport(viewport = null) {
      this.cameraViewport = viewport;
      if (!this.cameraViewport) {
        this.renderPass?.setViewport(this.viewport);
        this.postProcessingPass?.setViewport(this.viewport);
      } else {
        if (this.viewport) {
          const aspect = this.cameraViewport.width / this.cameraViewport.height;
          this.cameraViewport.width = Math.min(this.viewport.width, this.viewport.height * aspect);
          this.cameraViewport.height = Math.min(this.cameraViewport.width / aspect, this.viewport.height);
          this.cameraViewport.left = Math.max(0, (this.viewport.width - this.cameraViewport.width) * 0.5);
          this.cameraViewport.top = Math.max(0, (this.viewport.height - this.cameraViewport.height) * 0.5);
        }
        this.renderPass?.setViewport(this.cameraViewport);
        this.postProcessingPass?.setViewport(this.cameraViewport);
      }
    }
    /**
     * Resize the {@link camera} whenever the {@link GPURenderer#viewport | viewport} is updated.
     * @param viewport - {@link RenderPassViewport} settings to use if any. Can be set to `null` to cancel the {@link GPURenderer#viewport | viewport}.
     */
    setViewport(viewport = null) {
      super.setViewport(viewport);
      this.resizeCamera();
    }
    /**
     * Update the {@link core/renderers/GPURenderer.ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes.
     */
    onCameraMatricesChanged() {
      this.updateCameraBindings();
      for (const mesh of this.meshes) {
        if ("modelViewMatrix" in mesh) {
          mesh.shouldUpdateProjectionMatrixStack();
        }
      }
    }
    /**
     * Create a {@link BufferBinding} from a given {@link Camera}. Used internally but can also be used to create a new {@link BufferBinding} from a different camera than this renderer's {@link RendererCamera | camera}.
     * @param camera - {@link Camera} to use to create the {@link BufferBinding}.
     * @param label - Optional label to use for the {@link BufferBinding}.
     * @returns - Newly created {@link BufferBinding}.
     */
    createCameraBinding(camera, label = "Camera") {
      return new BufferBinding({
        label,
        name: "camera",
        visibility: ["vertex", "fragment"],
        struct: {
          view: {
            // camera view matrix
            type: "mat4x4f",
            value: camera.viewMatrix
          },
          projection: {
            // camera projection matrix
            type: "mat4x4f",
            value: camera.projectionMatrix
          },
          position: {
            // camera world position
            type: "vec3f",
            value: camera.actualPosition
          }
        }
      });
    }
    /**
     * Set the {@link GPUCameraRenderer#bindings.camera | camera BufferBinding}.
     */
    setCameraBinding() {
      this.bindings.camera = this.createCameraBinding(this.camera);
    }
    /**
     * Add a {@link Light} to the {@link lights} array.
     * @param light - {@link Light} to add.
     */
    addLight(light) {
      this.lights.push(light);
      __privateMethod$6(this, _GPUCameraRenderer_instances, updateLightsCount_fn).call(this, light.type);
    }
    /**
     * Remove a {@link Light} from the {@link lights} array.
     * @param light - {@link Light} to remove.
     */
    removeLight(light) {
      this.lights = this.lights.filter((l) => l.uuid !== light.uuid);
      __privateMethod$6(this, _GPUCameraRenderer_instances, updateLightsCount_fn).call(this, light.type);
    }
    /**
     * Set the lights {@link BufferBinding} based on the {@link lightsBindingParams}.
     */
    setLightsBinding() {
      if (!this.options.lights) return;
      this.lightsBindingParams = {
        ambientLights: {
          max: this.options.lights.maxAmbientLights,
          label: "Ambient lights",
          params: {
            color: {
              type: "array<vec3f>",
              size: 3
            }
          }
        },
        directionalLights: {
          max: this.options.lights.maxDirectionalLights,
          label: "Directional lights",
          params: {
            color: {
              type: "array<vec3f>",
              size: 3
            },
            direction: {
              type: "array<vec3f>",
              size: 3
            }
          }
        },
        pointLights: {
          max: this.options.lights.maxPointLights,
          label: "Point lights",
          params: {
            color: {
              type: "array<vec3f>",
              size: 3
            },
            position: {
              type: "array<vec3f>",
              size: 3
            },
            range: {
              type: "array<f32>",
              size: 1
            }
          }
        },
        spotLights: {
          max: this.options.lights.maxSpotLights,
          label: "Spot lights",
          params: {
            color: {
              type: "array<vec3f>",
              size: 3
            },
            direction: {
              type: "array<vec3f>",
              size: 3
            },
            position: {
              type: "array<vec3f>",
              size: 3
            },
            coneCos: {
              type: "array<f32>",
              size: 1
            },
            penumbraCos: {
              type: "array<f32>",
              size: 1
            },
            range: {
              type: "array<f32>",
              size: 1
            }
          }
        }
      };
      const lightsBindings = {
        ambientLights: null,
        directionalLights: null,
        pointLights: null,
        spotLights: null
      };
      Object.keys(lightsBindings).forEach((lightsType) => {
        this.setLightsTypeBinding(lightsType);
      });
    }
    /**
     * Set or reset the {@link BufferBinding} for a given {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} for which to create the {@link BufferBinding}.
     */
    setLightsTypeBinding(lightsType) {
      const structParams = Object.keys(this.lightsBindingParams[lightsType].params).map((paramKey) => {
        return {
          key: paramKey,
          type: this.lightsBindingParams[lightsType].params[paramKey].type,
          size: this.lightsBindingParams[lightsType].params[paramKey].size
        };
      }).reduce((acc, binding) => {
        acc[binding.key] = {
          type: binding.type,
          value: new Float32Array(Math.max(this.lightsBindingParams[lightsType].max, 1) * binding.size)
        };
        return acc;
      }, {});
      this.bindings[lightsType] = new BufferBinding({
        label: this.lightsBindingParams[lightsType].label,
        name: lightsType,
        bindingType: "storage",
        visibility: ["fragment", "compute"],
        // TODO needed in compute?
        struct: {
          count: {
            type: "i32",
            value: 0
          },
          ...structParams
        }
      });
    }
    /**
     * Called when a {@link LightsType | type of light} has overflown its maximum capacity. Destroys the associated {@link BufferBinding} (and eventually the associated shadow {@link BufferBinding}), recreates the {@link cameraLightsBindGroup | camera, lights and shadows bind group} and reset all lights for this {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} that has overflown its maximum capacity.
     * @param lightIndex - The {@link Light#index | light index} that caused overflow. Will be used to reset the new max light count.
     */
    onMaxLightOverflow(lightsType, lightIndex = 0) {
      if (!this.options.lights) {
        if (!this.production) {
          throwWarning(
            `${this.options.label} (${this.type}): You are adding a light (${lightsType}) to a renderer that should not initially handle lights. The renderer bind group will be re-created. This should be avoided.`
          );
        }
        __privateMethod$6(this, _GPUCameraRenderer_instances, initLights_fn).call(this);
        this.cameraLightsBindGroup.destroy();
        this.setCameraLightsBindGroup();
      } else {
        if (!this.production) {
          throwWarning(
            `${this.options.label} (${this.type}): You are overflowing the current max lights count of '${this.lightsBindingParams[lightsType].max}' for this type of lights: ${lightsType}. This should be avoided by setting a larger ${"max" + lightsType.charAt(0).toUpperCase() + lightsType.slice(1)} when instancing your ${this.type}.`
          );
        }
        this.lightsBindingParams[lightsType].max = Math.max(this.lightsBindingParams[lightsType].max, lightIndex + 1);
        const oldLightBinding = this.cameraLightsBindGroup.getBindingByName(lightsType);
        if (oldLightBinding) {
          this.cameraLightsBindGroup.destroyBufferBinding(oldLightBinding);
        }
        this.setLightsTypeBinding(lightsType);
        const lightBindingIndex = this.cameraLightsBindGroup.bindings.findIndex((binding) => binding.name === lightsType);
        if (lightBindingIndex !== -1) {
          this.cameraLightsBindGroup.bindings[lightBindingIndex] = this.bindings[lightsType];
        } else {
          this.bindings[lightsType].shouldResetBindGroup = true;
          this.bindings[lightsType].shouldResetBindGroupLayout = true;
          this.cameraLightsBindGroup.addBinding(this.bindings[lightsType]);
          this.shouldUpdateCameraLightsBindGroup();
        }
        if (lightsType === "directionalLights" || lightsType === "pointLights" || lightsType === "spotLights") {
          const shadowsType = lightsType.replace("Lights", "") + "Shadows";
          const oldShadowsBinding = this.cameraLightsBindGroup.getBindingByName(shadowsType);
          if (oldShadowsBinding) {
            this.cameraLightsBindGroup.destroyBufferBinding(oldShadowsBinding);
          }
          this.setShadowsTypeBinding(lightsType);
          const shadowsBindingIndex = this.cameraLightsBindGroup.bindings.findIndex(
            (binding) => binding.name === shadowsType
          );
          if (shadowsBindingIndex !== -1) {
            this.cameraLightsBindGroup.bindings[shadowsBindingIndex] = this.bindings[shadowsType];
          } else {
            this.bindings[shadowsType].shouldResetBindGroup = true;
            this.bindings[shadowsType].shouldResetBindGroupLayout = true;
            this.cameraLightsBindGroup.addBinding(this.bindings[shadowsType]);
            this.shouldUpdateCameraLightsBindGroup();
          }
        }
        this.cameraLightsBindGroup.resetEntries();
        this.cameraLightsBindGroup.createBindGroup();
        this.lights.forEach((light) => {
          if (light.type === lightsType) {
            light.reset();
          }
        });
      }
    }
    /* SHADOW MAPS */
    /**
     * Get all the current {@link ShadowCastingLights | lights that can cast shadows}.
     * @returns - All {@link ShadowCastingLights | lights that can cast shadows}.
     */
    get shadowCastingLights() {
      return this.lights?.filter(
        (light) => light.type === "directionalLights" || light.type === "pointLights" || light.type === "spotLights"
      );
    }
    /**
     * Set the shadows {@link BufferBinding} based on the {@link shadowsBindingsStruct}.
     */
    setShadowsBinding() {
      this.shadowsBindingsStruct = {
        directional: directionalShadowStruct,
        point: pointShadowStruct,
        spot: spotShadowStruct
      };
      this.setShadowsTypeBinding("directionalLights");
      this.setShadowsTypeBinding("pointLights");
      this.setShadowsTypeBinding("spotLights");
    }
    /**
     * Set or reset the associated shadow {@link BufferBinding} for a given {@link LightsType | type of light}.
     * @param lightsType - {@link LightsType | Type of light} for which to create the associated shadow {@link BufferBinding}.
     */
    setShadowsTypeBinding(lightsType) {
      const type = lightsType.replace("Lights", "");
      const shadowsType = type + "Shadows";
      const struct = this.shadowsBindingsStruct[type];
      const label = type.charAt(0).toUpperCase() + type.slice(1) + " shadows";
      this.bindings[shadowsType] = new BufferBinding({
        label,
        name: shadowsType,
        bindingType: this.options.lights && this.options.lights.useUniformsForShadows ? "uniform" : "storage",
        visibility: ["vertex", "fragment", "compute"],
        // TODO needed in compute?
        childrenBindings: [
          {
            binding: new BufferBinding({
              label: label + " element",
              name: shadowsType + "Elements",
              bindingType: "uniform",
              visibility: ["vertex", "fragment"],
              struct
            }),
            count: Math.max(1, this.lightsBindingParams[lightsType].max),
            forceArray: true
            // needs to be iterable anyway!
          }
        ]
      });
    }
    /* CAMERA, LIGHTS & SHADOWS BIND GROUP */
    /**
     * Set the {@link cameraLightsBindGroup | camera, lights and shadows bind group}.
     */
    setCameraLightsBindGroup() {
      this.cameraLightsBindGroup = new BindGroup(this, {
        label: this.options.label + ": Camera and lights uniform bind group",
        bindings: Object.keys(this.bindings).map((bindingName) => this.bindings[bindingName]).flat()
      });
      this.cameraLightsBindGroup.consumers.add(this.uuid);
      this.pointShadowsCubeFaceBindGroups = [];
      for (let face = 0; face < 6; face++) {
        const cubeFace = new BufferBinding({
          label: "Cube face",
          name: "cubeFace",
          bindingType: "uniform",
          visibility: ["vertex"],
          struct: {
            face: {
              type: "u32",
              value: face
            }
          }
        });
        const cubeBindGroup = new BindGroup(this, {
          label: `Cube face bind group ${face}`,
          bindings: [cubeFace]
        });
        cubeBindGroup.createBindGroup();
        cubeBindGroup.consumers.add(this.uuid);
        this.pointShadowsCubeFaceBindGroups.push(cubeBindGroup);
      }
      if (this.device) {
        this.createCameraLightsBindGroup();
      }
    }
    /**
     * Create the {@link cameraLightsBindGroup | camera, lights and shadows bind group} buffers
     */
    createCameraLightsBindGroup() {
      if (this.cameraLightsBindGroup && this.cameraLightsBindGroup.shouldCreateBindGroup) {
        this.cameraLightsBindGroup.setIndex(0);
        this.cameraLightsBindGroup.createBindGroup();
      }
    }
    /**
     * Tell our  {@link cameraLightsBindGroup | camera, lights and shadows bind group} to update.
     */
    shouldUpdateCameraLightsBindGroup() {
      __privateSet$7(this, _shouldUpdateCameraLightsBindGroup, true);
    }
    /**
     * Tell our {@link GPUCameraRenderer#bindings.camera | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
     */
    updateCameraBindings() {
      this.bindings.camera?.shouldUpdateBinding("view");
      this.bindings.camera?.shouldUpdateBinding("projection");
      this.bindings.camera?.shouldUpdateBinding("position");
      this.shouldUpdateCameraLightsBindGroup();
    }
    /**
     * Update the {@link cameraLightsBindGroup | camera and lights BindGroup}.
     */
    updateCameraLightsBindGroup() {
      if (this.cameraLightsBindGroup && __privateGet$7(this, _shouldUpdateCameraLightsBindGroup)) {
        this.cameraLightsBindGroup.update();
        __privateSet$7(this, _shouldUpdateCameraLightsBindGroup, false);
      }
    }
    /**
     * Get all objects ({@link core/renderers/GPURenderer.RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraLightsBindGroup | camera and lights bind group}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup) {
      return this.deviceRenderedObjects.filter((object) => {
        return [
          ...object.material.bindGroups,
          ...object.material.inputsBindGroups,
          ...object.material.clonedBindGroups,
          this.cameraLightsBindGroup
        ].some((bG) => bG.uuid === bindGroup.uuid);
      });
    }
    /* TRANSMISSIVE */
    /**
     * Create the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if not already created.
     */
    createTransmissionTarget() {
      if (!this.transmissionTarget.texture) {
        this.transmissionTarget.passEntry = this.scene.createScreenPassEntry("Transmission scene screen render pass");
        this.transmissionTarget.texture = new Texture(this, {
          label: "Transmission background scene render target output",
          name: "transmissionBackgroundTexture",
          generateMips: true,
          // needed for roughness LOD!
          format: this.options.context.format,
          autoDestroy: false
        });
        this.transmissionTarget.passEntry.onBeforeRenderPass = (commandEncoder, swapChainTexture) => {
          this.copyGPUTextureToTexture(swapChainTexture, this.transmissionTarget.texture, commandEncoder);
        };
      }
    }
    /**
     * Destroy the {@link transmissionTarget} {@link Texture} and {@link RenderPassEntry} if already created.
     */
    destroyTransmissionTarget() {
      if (this.transmissionTarget.texture) {
        this.transmissionTarget.texture.destroy();
        this.scene.renderPassEntries.screen = this.scene.renderPassEntries.screen.filter(
          (passEntry) => passEntry.label !== "Transmission scene screen render pass"
        );
        this.transmissionTarget.texture = null;
        this.transmissionTarget.passEntry = null;
      }
    }
    /**
     * Resize our {@link GPUCameraRenderer} and resize our {@link camera} before anything else.
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    resize(rectBBox = null) {
      this.setSize(rectBBox);
      this.resizeCamera();
      this._onResizeCallback && this._onResizeCallback();
      this.resizeObjects();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /* RENDER */
    /**
     * {@link createCameraLightsBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}.
     * @param commandEncoder - Current {@link GPUCommandEncoder}.
     */
    render(commandEncoder) {
      if (!this.ready) return;
      this.createCameraLightsBindGroup();
      this.updateCameraLightsBindGroup();
      super.render(commandEncoder);
      if (this.cameraLightsBindGroup) {
        this.cameraLightsBindGroup.needsPipelineFlush = false;
      }
    }
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy() {
      this.cameraLightsBindGroup?.destroy();
      this.pointShadowsCubeFaceBindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.destroyTransmissionTarget();
      this.lights.forEach((light) => light.destroy());
      super.destroy();
      this.lights.forEach((light) => this.removeLight(light));
    }
  }
  _shouldUpdateCameraLightsBindGroup = new WeakMap();
  _GPUCameraRenderer_instances = new WeakSet();
  /* LIGHTS */
  /**
   * Initialize the lights and shadows bindings.
   * @private
   */
  initLights_fn = function() {
    if (!this.options.lights) {
      this.options.lights = {
        maxAmbientLights: 2,
        maxDirectionalLights: 5,
        maxPointLights: 5,
        maxSpotLights: 5,
        useUniformsForShadows: false
      };
    }
    this.setLightsBinding();
    this.setShadowsBinding();
  };
  /**
   * Update the lights count for the given {@link LightsType} based on the max light index.
   * @param lightsType - {@link LightsType} for which to update the light count.
   * @private
   */
  updateLightsCount_fn = function(lightsType) {
    let maxIndex = 0;
    this.lights.filter((light) => light.type === lightsType).forEach((light) => {
      maxIndex = Math.max(maxIndex, light.index + 1);
    });
    this.bindings[lightsType].inputs.count.value = maxIndex;
    this.bindings[lightsType].inputs.count.shouldUpdate = true;
  };

  const getDefaultShaderPassFragmentCode = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(renderTexture, defaultSampler, fsInput.uv);
}`
  );

  class ShaderPass extends FullscreenPlane {
    /**
     * ShaderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
     */
    constructor(renderer, parameters = {}) {
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
      parameters.isPrePass = !!parameters.isPrePass;
      const defaultBlend = {
        color: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        },
        alpha: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        }
      };
      if (!parameters.isPrePass) {
        if (!parameters.targets) {
          parameters.targets = [
            {
              blend: defaultBlend
            }
          ];
        } else if (parameters.targets && parameters.targets.length && !parameters.targets[0].blend) {
          parameters.targets[0].blend = defaultBlend;
        }
      }
      parameters.label = parameters.label ?? "ShaderPass " + renderer.shaderPasses?.length;
      parameters.sampleCount = !!parameters.sampleCount ? parameters.sampleCount : renderer && renderer.renderPass && parameters.isPrePass ? renderer.renderPass.options.sampleCount : renderer && renderer.postProcessingPass ? renderer && renderer.postProcessingPass.options.sampleCount : 1;
      if (!parameters.shaders) {
        parameters.shaders = {};
      }
      if (!parameters.shaders.fragment) {
        parameters.shaders.fragment = {
          code: getDefaultShaderPassFragmentCode,
          entryPoint: "main"
        };
      }
      parameters.depth = parameters.isPrePass;
      super(renderer, parameters);
      this.options = {
        ...this.options,
        copyOutputToRenderTexture: parameters.copyOutputToRenderTexture,
        isPrePass: parameters.isPrePass
      };
      if (parameters.inputTarget) {
        this.setInputTarget(parameters.inputTarget);
      }
      if (this.outputTarget) {
        this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass);
      }
      this.type = "ShaderPass";
      this.renderTexture = this.createTexture({
        label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
        name: parameters.renderTextureName ?? "renderTexture",
        fromTexture: this.inputTarget ? this.inputTarget.renderTexture : null,
        usage: ["copySrc", "copyDst", "textureBinding"],
        ...this.outputTarget && this.outputTarget.options.qualityRatio && { qualityRatio: this.outputTarget.options.qualityRatio }
      });
    }
    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.copyOutputToRenderTexture;
      delete parameters.inputTarget;
      delete parameters.isPrePass;
      super.cleanupRenderMaterialParameters(parameters);
      return parameters;
    }
    /**
     * Assign or remove an input {@link RenderTarget} to this {@link ShaderPass}, which can be different from what has just been drawn to the {@link core/renderers/GPURenderer.GPURenderer#context | context} current texture.
     *
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
     * @param inputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
     */
    setInputTarget(inputTarget) {
      if (inputTarget && inputTarget.type !== "RenderTarget") {
        throwWarning(`${this.options.label ?? this.type}: inputTarget is not a RenderTarget: ${inputTarget}`);
        return;
      }
      this.removeFromScene();
      this.inputTarget = inputTarget;
      this.addToScene();
      if (this.renderTexture) {
        if (inputTarget) {
          this.renderTexture.copy(this.inputTarget.renderTexture);
        } else {
          this.renderTexture.options.fromTexture = null;
          this.renderTexture.createTexture();
        }
      }
    }
    /**
     * Add the {@link ShaderPass} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer as well.
     * @param addToRenderer - whether to add this {@link ShaderPass} to the {@link Renderer#shaderPasses | Renderer shaderPasses array}
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.shaderPasses.push(this);
      }
      this.setRenderingOptionsForRenderPass(
        this.outputTarget ? this.outputTarget.renderPass : this.options.isPrePass ? this.renderer.renderPass : this.renderer.postProcessingPass
      );
      if (this.autoRender) {
        this.renderer.scene.addShaderPass(this);
      }
    }
    /**
     * Remove the {@link ShaderPass} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link ShaderPass} from the {@link Renderer#shaderPasses | Renderer shaderPasses array}
     */
    removeFromScene(removeFromRenderer = false) {
      if (this.outputTarget && removeFromRenderer) {
        this.outputTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removeShaderPass(this);
      }
      if (removeFromRenderer) {
        this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid);
      }
    }
  }

  const constants = (
    /* wgsl */
    `
const PI = ${Math.PI};
const RECIPROCAL_PI = ${1 / Math.PI};
const RECIPROCAL_PI2 = ${0.5 / Math.PI};
const EPSILON = 1e-6;`
  );

  const common = (
    /* wgsl */
    `
fn lessThan3(a: vec3f, b: vec3f) -> vec3f {
  return vec3f(vec3<bool>(a.x < b.x, a.y < b.y, a.z < b.z));
}

fn pow2( x: f32 ) -> f32 {
  return x * x;
}

fn pow3( x: f32 ) -> f32 {
  return x * x * x;
}

fn pow4( x: f32 ) -> f32 {
  return pow2(x) * pow2(x);
}

fn isinf(value: f32) -> bool {
  return value > 1.0e38 || value < -1.0e38;
}

fn BRDF_Lambert(diffuseColor: vec3f) -> vec3f {
  return RECIPROCAL_PI * diffuseColor;
}

fn F_Schlick(f0: vec3f, f90: f32, VdotH: f32) -> vec3f {
  let fresnel: f32 = exp2( ( - 5.55473 * VdotH - 6.98316 ) * VdotH );
  return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
`
  );

  const toneMappingUtils = (
    /* wgsl */
    `
// linear <-> sRGB conversions
fn linearTosRGB(linear: vec3f) -> vec3f {
  return vec3( mix( pow( linear.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), linear.rgb * 12.92, vec3( lessThan3( linear.rgb, vec3( 0.0031308 ) ) ) ) );
}

fn linearTosRGB_4(linear: vec4f) -> vec4f {
  return vec4( linearTosRGB(linear.rgb), linear.a );
}

fn sRGBToLinear(srgb: vec3f) -> vec3f {
  if (all(srgb <= vec3(0.04045))) {
    return srgb / vec3(12.92);
  }
  return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
}

fn sRGBToLinear_4(srgb: vec4f) -> vec4f {
  return vec4( sRGBToLinear(srgb.rgb), srgb.a );
}

// source: https://www.cs.utah.edu/docs/techreports/2002/pdf/UUCS-02-001.pdf
fn ReinhardToneMapping( color: vec3f ) -> vec3f {
	return saturate( color / ( vec3( 1.0 ) + color ) );
}

// source: http://filmicworlds.com/blog/filmic-tonemapping-operators/
fn CineonToneMapping( color: vec3f ) -> vec3f {
	// filmic operator by Jim Hejl and Richard Burgess-Dawson
	let maxColor = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( maxColor * ( 6.2 * maxColor + 0.5 ) ) / ( maxColor * ( 6.2 * maxColor + 1.7 ) + 0.06 ), vec3( 2.2 ) );

}

// https://modelviewer.dev/examples/tone-mapping
fn KhronosToneMapping( color: vec3f ) -> vec3f {
  var toneMapColor = color; 
  const startCompression: f32 = 0.8 - 0.04;
  const desaturation: f32 = 0.15;
  var x: f32 = min(toneMapColor.r, min(toneMapColor.g, toneMapColor.b));
  var offset: f32 = select(0.04, x - 6.25 * x * x, x < 0.08);
  toneMapColor = toneMapColor - offset;
  var peak: f32 = max(toneMapColor.r, max(toneMapColor.g, toneMapColor.b));
  if (peak < startCompression) {
    return toneMapColor;
  }
  const d: f32 = 1. - startCompression;
  let newPeak: f32 = 1. - d * d / (peak + d - startCompression);
  toneMapColor *= newPeak / peak;
  let g: f32 = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
  return mix(toneMapColor, newPeak * vec3(1, 1, 1), g);
}
`
  );

  const getLightsInfos = (
    /* wgsl */
    `
struct ReflectedLight {
  directDiffuse: vec3f,
  directSpecular: vec3f,
  indirectDiffuse: vec3f,
  indirectSpecular: vec3f,
}

struct DirectLight {
  color: vec3f,
  direction: vec3f,
  visible: bool,
}

fn rangeAttenuation(range: f32, distance: f32, decay: f32) -> f32 {
  var distanceFalloff: f32 = 1.0 / max( pow( distance, decay ), 0.01 );
  if ( range > 0.0 ) {
    distanceFalloff *= pow2( saturate( 1.0 - pow4( distance / range )) );
  }
  
  return distanceFalloff;
}

fn spotAttenuation(coneCosine: f32, penumbraCosine: f32, angleCosine: f32) -> f32 {
  return smoothstep( coneCosine, penumbraCosine, angleCosine );
}

fn getDirectionalLightInfo(directionalLight: DirectionalLightsElement, ptr_light: ptr<function, DirectLight>) {
  (*ptr_light).color = directionalLight.color;
  (*ptr_light).direction = -directionalLight.direction;
  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;
}

fn getPointLightInfo(pointLight: PointLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  let lightDirection: vec3f = pointLight.position - worldPosition;
  (*ptr_light).direction = normalize(lightDirection);
  let lightDistance: f32 = length(lightDirection);
  (*ptr_light).color = pointLight.color;
  (*ptr_light).color *= rangeAttenuation(pointLight.range, lightDistance, 2.0);
  (*ptr_light).visible = length((*ptr_light).color) > EPSILON;
}

fn getSpotLightInfo(spotLight: SpotLightsElement, worldPosition: vec3f, ptr_light: ptr<function, DirectLight>) {
  let lVector: vec3f = spotLight.position - worldPosition;
  let lightDirection: vec3f = normalize(lVector);
  (*ptr_light).direction = lightDirection;

  let angleCos: f32 = dot(lightDirection, -spotLight.direction);

  let spotAttenuation: f32 = spotAttenuation(spotLight.coneCos, spotLight.penumbraCos, angleCos);

  if (spotAttenuation > 0.0) {
    let lightDistance: f32 = length(lVector);

    (*ptr_light).color = spotLight.color * spotAttenuation;
    (*ptr_light).color *= rangeAttenuation(spotLight.range, lightDistance, 2.0);
    (*ptr_light).visible = length((*ptr_light).color) > EPSILON;

  } else {
    (*ptr_light).color = vec3(0.0);
    (*ptr_light).visible = false;
  }
}
`
  );

  const REIndirectDiffuse = (
    /* wgsl */
    `
fn getIndirectDiffuse(irradiance: vec3f, diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  (*ptr_reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}

// Indirect Diffuse RenderEquations
fn RE_IndirectDiffuse(irradiance: vec3f, diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  var totalAmbientIrradiance: vec3f = irradiance;
  
  for(var i: i32 = 0; i < ambientLights.count; i++) {
    totalAmbientIrradiance += ambientLights.color[i];
  }
  
  getIndirectDiffuse(totalAmbientIrradiance, diffuseColor, ptr_reflectedLight);
}
`
  );

  const getLambertDirect = (
    /* wgsl */
    `
fn getLambertDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let NdotL = saturate(dot(normal, directLight.direction));
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}
`
  );

  const getPCFShadows = (
    /* wgsl */
    `
  let pointShadows = getPCFPointShadows(worldPosition);
  let directionalShadows = getPCFDirectionalShadows(worldPosition);
  let spotShadows = getPCFSpotShadows(worldPosition);
`
  );

  const applyDirectionalShadows = (
    /* wgsl */
    `
    directLight.color *= directionalShadows[i];
`
  );

  const applyPointShadows = (
    /* wgsl */
    `
    directLight.color *= pointShadows[i];
`
  );

  const applySpotShadows = (
    /* wgsl */
    `
    directLight.color *= spotShadows[i];
`
  );

  const getLambertShading = ({ receiveShadows = false } = {}) => {
    return (
      /* wgsl */
      `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}
  
  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ""}
    getLambertDirect(normal, outputColor.rgb, directLight, &reflectedLight);
  }

  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ""}
    getLambertDirect(normal, outputColor.rgb, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyDirectionalShadows : ""}
    getLambertDirect(normal, outputColor.rgb, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, outputColor.rgb, &reflectedLight);
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  totalIndirect *= occlusion;
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;`
    );
  };

  const applyToneMapping = ({ toneMapping = "Khronos" } = {}) => {
    let toneMappingOutput = (
      /* wgsl */
      `
  let exposure: f32 = 1.0; // TODO
  outputColor *= exposure;
  `
    );
    toneMappingOutput += (() => {
      switch (toneMapping) {
        case "Khronos":
          return (
            /* wgsl */
            `
  outputColor = vec4(KhronosToneMapping(outputColor.rgb), outputColor.a);
  `
          );
        case "Reinhard":
          return `
  outputColor = vec4(ReinhardToneMapping(outputColor.rgb), outputColor.a);
        `;
        case "Cineon":
          return `
  outputColor = vec4(CineonToneMapping(outputColor.rgb), outputColor.a);
        `;
        case false:
        default:
          return `
  outputColor = saturate(outputColor);
        `;
      }
    })();
    toneMappingOutput += /* wgsl */
    `
  outputColor = linearTosRGB_4(outputColor);
  `;
    return toneMappingOutput;
  };

  const lambertUtils = (
    /* wgsl */
    `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${toneMappingUtils}
`
  );
  const getLambert = ({ addUtils = true, receiveShadows = false, toneMapping, useOcclusion = false } = {}) => (
    /* wgsl */
    `
${addUtils ? lambertUtils : ""}
${getLambertDirect}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  var outputColor: vec4f = color;

  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
  );

  const getPhongDirect = (
    /* wgsl */
    `
fn D_BlinnPhong( shininess: f32, NdotH: f32 ) -> f32 {
  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( NdotH, shininess );
}

fn BRDF_BlinnPhong(
  normal: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  shininess: f32,
  directLight: DirectLight
) -> vec3f {
  let H: vec3f = normalize(viewDirection + directLight.direction);
  
  let NdotH: f32 = saturate(dot(normal, H));
  let VdotH: f32 = saturate(dot(viewDirection, H));
  
  let F: vec3f = F_Schlick(specularColor, 1.0, VdotH);
  let G: f32 = 0.25; // blinn phong implicit
  let D = D_BlinnPhong(shininess, NdotH);
  
  let specular: vec3f = F * G * D;
        
  return specular;
}

fn getPhongDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let NdotL = saturate(dot(normal, directLight.direction));
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
  (*ptr_reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( normal, viewDirection, specularColor, shininess, directLight ) * specularStrength;
}
`
  );

  const getPhongShading = ({ receiveShadows = false } = {}) => {
    return (
      /* wgsl */
      `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {  
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ""}
    getPhongDirect(normal, outputColor.rgb, viewDirection, specularColor, specularIntensity, shininess, directLight, &reflectedLight);
  }
  
  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ""}
    getPhongDirect(normal, outputColor.rgb, viewDirection, specularColor, specularIntensity, shininess, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyDirectionalShadows : ""}
    getPhongDirect(normal, outputColor.rgb, viewDirection, specularColor, specularIntensity, shininess, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, outputColor.rgb, &reflectedLight);
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  totalIndirect *= occlusion;
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;`
    );
  };

  const getPhong = ({ addUtils = true, receiveShadows = false, toneMapping, useOcclusion = false } = {}) => (
    /* wgsl */
    `
${addUtils ? lambertUtils : ""}
${getPhongDirect}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  shininess: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  var outputColor: vec4f = color;

  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
  );

  const REIndirectSpecular = (
    /* wgsl */
    `
// Indirect Specular RenderEquations
fn RE_IndirectSpecular(
  radiance: vec3f,
  irradiance: vec3f,
  normal: vec3f,
  diffuseColor: vec3f,
  specularFactor: f32,
  specularColorFactor: vec3f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  iBLGGXFresnel: IBLGGXFresnel,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let k_D: vec3f = diffuseColor * (1.0 - iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms);

  // we just add radiance and irradiance to the indirect contributions using iBLGGXFresnel
  // we might need to adjust when implementing clearcoat, sheen or iridescence

  // we remove RECIPROCAL_PI multiplication since the LUT already ensures energy conservation
  let cosineWeightedIrradiance: vec3f = irradiance;
  // let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;  

  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FssEss * radiance;
  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FmsEms * cosineWeightedIrradiance;
  
  (*ptr_reflectedLight).indirectDiffuse += k_D * cosineWeightedIrradiance;
}
`
  );

  const getIBLTransmission = (
    /* wgsl */
    `
fn getVolumeTransmissionRay(normal: vec3f, viewDirection: vec3f, thickness: f32, ior: f32, modelScale: vec3f) -> vec3f {
  let refractionVector = refract(-viewDirection, normal, 1.0 / ior);    
  return normalize(refractionVector) * thickness * modelScale;
}

fn applyIorToRoughness(roughness: f32, ior: f32) -> f32 {
  return roughness * saturate(ior * 2.0 - 2.0);
}

fn getTransmissionSample( fragCoord: vec2f, roughness: f32, ior: f32, transmissionSceneTexture: texture_2d<f32>, sampler: sampler ) -> vec4f {
  let transmissionSamplerSize: vec2f = vec2f(textureDimensions(transmissionSceneTexture));
  let lod: f32 = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
  return textureSampleLevel( transmissionSceneTexture, sampler, fragCoord.xy, lod );
}

fn volumeAttenuation(transmissionDistance: f32, attenuationColor: vec3f, attenuationDistance: f32) -> vec3f {
  if (isinf(attenuationDistance)) {
    return vec3(1.0);
  } else {
    let attenuationCoefficient = -log(attenuationColor) / attenuationDistance;
    let transmittance = exp(-attenuationCoefficient * transmissionDistance);
    return transmittance;
  }
}

fn getIBLVolumeRefraction(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  diffuseColor: vec4f,
  specularColor: vec3f,
  specularF90: f32,
  position: vec3f,
  modelScale: vec3f,
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  dispersion: f32,
  ior: f32,
  thickness: f32,
  attenuationColor: vec3f,
  attenuationDistance: f32,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
) -> vec4f {
    // TODO dispersion
    var transmittedLight: vec4f;
    var transmissionRayLength: f32;
    var transmittance: vec3f;
    
    // Calculate the transmission ray
    let transmissionRay: vec3f = getVolumeTransmissionRay(normal, viewDirection, thickness, ior, modelScale);
    let refractedRayExit = position + transmissionRay;

    // Transform to NDC space
    let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
    var refractionCoords = ndcPos.xy / ndcPos.w;
    refractionCoords = (refractionCoords + 1.0) / 2.0;
    refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu Y flip

    // Sample the transmission texture
    transmittedLight = getTransmissionSample(refractionCoords, roughness, ior, transmissionBackgroundTexture, defaultSampler);

    // Compute transmittance
    transmittance = diffuseColor.rgb * volumeAttenuation(length(transmissionRay), attenuationColor, attenuationDistance);

    // Apply attenuation to transmitted light
    let attenuatedColor = transmittance * transmittedLight.rgb;

    // Compute Fresnel term using an environment BRDF
    let F = EnvironmentBRDF(normal, viewDirection, specularColor, specularF90, roughness);

    // Average the transmittance for a single factor
    let transmittanceFactor = (transmittance.r + transmittance.g + transmittance.b) / 3.0;

    // Combine results into the final color
    return vec4(
      (1.0 - F) * attenuatedColor,
      1.0 - (1.0 - transmittedLight.a) * transmittanceFactor
    );
}

fn getIBLVolumeRefractionWithDispersion(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  diffuseColor: vec4f,
  specularColor: vec3f,
  specularF90: f32,
  position: vec3f,
  modelScale: vec3f,
  viewMatrix: mat4x4f,
  projMatrix: mat4x4f,
  dispersion: f32,
  ior: f32,
  thickness: f32,
  attenuationColor: vec3f,
  attenuationDistance: f32,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
) -> vec4f {
    var transmittedLight: vec4f;
    var transmissionRayLength: f32;
    var transmittance: vec3f;
    
    let halfSpread: f32 = (ior - 1.0) * 0.025 * dispersion;
    let iors: vec3f = vec3(ior - halfSpread, ior, ior + halfSpread);
    
    for(var i: i32 = 0; i < 3; i++) {
      let transmissionRay: vec3f = getVolumeTransmissionRay(normal, viewDirection, thickness, iors[i], modelScale);
      transmissionRayLength = length(transmissionRay);
      let refractedRayExit = position + transmissionRay;

      // Transform to NDC space
      let ndcPos = projMatrix * viewMatrix * vec4(refractedRayExit, 1.0);
      var refractionCoords = ndcPos.xy / ndcPos.w;
      refractionCoords = (refractionCoords + 1.0) / 2.0;
      refractionCoords = vec2(refractionCoords.x, 1.0 - refractionCoords.y); // webgpu Y flip
      
      let transmissionSample: vec4f = getTransmissionSample(refractionCoords, roughness, iors[i], transmissionBackgroundTexture, defaultSampler);
      
      transmittedLight[i] = transmissionSample[i];
      transmittedLight.a += transmissionSample.a;
      
      // Compute transmittance
      let diffuse: vec3f = diffuseColor.rgb;
      transmittance[i] = diffuse[i] * volumeAttenuation(length(transmissionRay), attenuationColor, attenuationDistance)[i];
    }
    
    transmittedLight.a /= 3.0;

    // Apply attenuation to transmitted light
    let attenuatedColor = transmittance * transmittedLight.rgb;

    // Compute Fresnel term using an environment BRDF
    let F = EnvironmentBRDF(normal, viewDirection, specularColor, specularF90, roughness);

    // Average the transmittance for a single factor
    let transmittanceFactor = (transmittance.r + transmittance.g + transmittance.b) / 3.0;

    // Combine results into the final color
    return vec4(
      (1.0 - F) * attenuatedColor,
      1.0 - (1.0 - transmittedLight.a) * transmittanceFactor
    );
}
`
  );

  const BRDF_GGX = (
    /* wgsl */
    `
fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );

  let denom: f32 = (pow2( NdotH ) * (a2 - 1.0) + 1.0);

  return RECIPROCAL_PI * a2 / ( pow2( denom ) );
}

fn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );
  
  let gv: f32 = NdotL * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotV ) );
  let gl: f32 = NdotV * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotL ) );

  return 0.5 / max( gv + gl, EPSILON );
}

fn BRDF_GGX(
  NdotV: f32,
  NdotL: f32,
  NdotH: f32,
  VdotH: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f
) -> vec3f {
  // cook-torrance brdf
  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
  let D: f32 = DistributionGGX(NdotH, roughness);
  let F: vec3f = F_Schlick(specularColor, specularFactor, VdotH);
  
  return G * D * F;
}
`
  );

  const getPBRDirect = (
    /* wgsl */
    `
${BRDF_GGX}

fn EnvironmentBRDF(
  normal: vec3<f32>, 
  viewDir: vec3<f32>, 
  specularColor: vec3<f32>, 
  specularF90: f32, 
  roughness: f32
) -> vec3<f32> {
  let fab = DFGApprox(normal, viewDir, roughness);
  return specularColor * fab.x + specularF90 * fab.y;
}

fn computeSpecularOcclusion( NdotV: f32, occlusion: f32, roughness: f32 ) -> f32 {
	return saturate(pow(NdotV + occlusion, exp2(- 16.0 * roughness - 1.0)) - 1.0 + occlusion);
}

fn getPBRDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let H: vec3f = normalize(viewDirection + directLight.direction);
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let NdotH: f32 = saturate(dot(normal, H));
  let VdotH: f32 = saturate(dot(viewDirection, H));

  let irradiance: vec3f = NdotL * directLight.color;
  let ggx: vec3f = BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, specularFactor, specularColor);
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
  );

  const getIBLIndirectIrradiance$1 = ({
    environmentMap = null
  }) => {
    let iblIndirectDiffuse = "";
    if (environmentMap) {
      iblIndirectDiffuse += /* wgs */
      `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    baseDiffuseColor.rgb,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`;
    }
    return iblIndirectDiffuse;
  };

  const getIBLIndirectRadiance$1 = ({
    environmentMap = null
  }) => {
    let iblIndirectSpecular = "";
    if (environmentMap) {
      iblIndirectSpecular += /* wgs */
      `
  radiance += getIBLIndirectRadiance(
    normal,
    viewDirection,
    roughness,
    specularColor,
    specularIntensity,
    iBLGGXFresnel,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );`;
    }
    return iblIndirectSpecular;
  };

  const getIBLVolumeRefraction = ({
    transmissionBackgroundTexture = null,
    extensionsUsed = []
  }) => {
    const hasDispersion = extensionsUsed.includes("KHR_materials_dispersion");
    const iblVolumeRefractionFunction = hasDispersion ? "getIBLVolumeRefractionWithDispersion" : "getIBLVolumeRefraction";
    return transmissionBackgroundTexture ? (
      /* wgsl */
      `
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    normalize(viewDirection),
    roughness, 
    baseDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    modelScale,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    ${transmissionBackgroundTexture.texture.options.name},
    ${transmissionBackgroundTexture.sampler.name},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
    ) : "";
  };

  const getIBLGGXFresnel$1 = ({
    environmentMap = null
  }) => {
    let iblIGGXFresnel = (
      /* wgsl */
      `
  var iBLGGXFresnel: IBLGGXFresnel;`
    );
    if (environmentMap && environmentMap.lutTexture) {
      iblIGGXFresnel += /* wgsl */
      `
  iBLGGXFresnel = getIBLGGXFresnel(
    normal,
    viewDirection,
    roughness,
    specularColor,
    specularIntensity,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
    } else {
      iblIGGXFresnel += /* wgsl */
      `
  computeMultiscattering(
    normal,
    viewDirection,
    specularColor,
    specularIntensity,
    roughness,
    &iBLGGXFresnel
  );`;
    }
    return iblIGGXFresnel;
  };

  const getPBRShading = ({
    receiveShadows = false,
    environmentMap = null,
    transmissionBackgroundTexture = null,
    extensionsUsed = []
  } = {}) => {
    return (
      /* wgsl */
      `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}
  
  let baseDiffuseColor: vec4f = outputColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularIntensity, 1.0, metallic);
  specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity, outputColor.rgb, metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ""}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ""}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyDirectionalShadows : ""}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  var irradiance: vec3f = vec3(0.0);
  var iblIrradiance: vec3f = vec3(0.0);
  var radiance: vec3f = vec3(0.0);
  
  // IBL indirect contributions
  ${getIBLGGXFresnel$1({ environmentMap })}
  ${getIBLIndirectIrradiance$1({ environmentMap })}
  ${getIBLIndirectRadiance$1({ environmentMap })}
  
  // ambient lights
  RE_IndirectDiffuse(irradiance, baseDiffuseColor.rgb, &reflectedLight);
  
  // indirect specular (and diffuse) from IBL
  RE_IndirectSpecular(
    radiance,
    iblIrradiance,
    normal,
    baseDiffuseColor.rgb,
    specularF90,
    specularColor,
    viewDirection,
    metallic,
    roughness,
    iBLGGXFresnel,
    &reflectedLight
  );
  
  reflectedLight.indirectDiffuse *= occlusion;
  
  let NdotV: f32 = saturate(dot(geometryNormal, viewDirection));
  reflectedLight.indirectSpecular *= computeSpecularOcclusion(NdotV, occlusion, roughness);
  
  var totalDiffuse: vec3f = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse;
  let totalSpecular: vec3f = reflectedLight.indirectSpecular + reflectedLight.directSpecular;
  
  ${getIBLVolumeRefraction({ transmissionBackgroundTexture, extensionsUsed })}
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;`
    );
  };

  const getPBR = ({
    addUtils = true,
    receiveShadows = false,
    toneMapping,
    useOcclusion = false,
    environmentMap = null,
    transmissionBackgroundTexture = null,
    extensionsUsed = []
  } = {}) => (
    /* wgsl */
    `
${addUtils ? lambertUtils : ""}
${REIndirectSpecular}
${getIBLTransmission}
${getPBRDirect}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularIntensity: f32,
  specularColor: vec3f,
  ior: f32,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  var outputColor: vec4f = color;
  
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
  );

  const getVertexOutputStructContent = ({
    geometry,
    additionalVaryings = []
  }) => {
    const tangentAttribute = geometry.getAttributeByName("tangent");
    const attributes = [];
    if (geometry.vertexBuffers && geometry.vertexBuffers.length) {
      geometry.vertexBuffers.forEach((vertexBuffer) => {
        vertexBuffer.attributes.forEach((attribute) => {
          if (attribute.name !== "position") {
            attributes.push(attribute);
          }
        });
      });
    }
    if (tangentAttribute) {
      attributes.push({
        name: "bitangent",
        type: "vec3f"
      });
    }
    const structAttributes = attributes.map((attribute, index) => {
      return `
  @location(${index}) ${attribute.type === "u32" || attribute.type === "i32" ? "@interpolate(flat) " : " "}${attribute.name}: ${attribute.type},`;
    }).join("");
    const additionalVaryingsOutput = additionalVaryings.map((attribute, index) => {
      return `
  @location(${attributes.length + 3 + index}) ${attribute.type === "u32" || attribute.type === "i32" ? "@interpolate(flat) " : " "}${attribute.name}: ${attribute.type},`;
    }).join("");
    return `
  @builtin(position) position: vec4f,
  ${structAttributes}
  @location(${attributes.length}) viewDirection: vec3f,
  @location(${attributes.length + 1}) worldPosition: vec3f,
  @location(${attributes.length + 2}) modelScale: vec3f,
  ${additionalVaryingsOutput}`;
  };

  const getVertexOutputStruct = ({
    geometry,
    additionalVaryings = []
  }) => {
    return (
      /* wgsl */
      `
struct VSOutput {
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
    );
  };

  const getVertexOutput = ({ geometry }) => {
    let output = (
      /* wgsl */
      `
  vsOutput.position = camera.projection * camera.view * worldPosition;
  vsOutput.normal = normal;
  vsOutput.worldPosition = worldPosition.xyz / worldPosition.w;
  vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
  vsOutput.modelScale = vec3(
    length(modelMatrix[0].xyz),
    length(modelMatrix[1].xyz),
    length(modelMatrix[2].xyz)
  );
  `
    );
    const tangentAttribute = geometry.getAttributeByName("tangent");
    if (tangentAttribute) {
      output += /* wgsl */
      `
  vsOutput.tangent = normalize(modelMatrix * tangent);
  vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * vsOutput.tangent.w;
    `;
    }
    output += geometry.vertexBuffers.map(
      (vertexBuffer) => vertexBuffer.attributes.filter((attr) => attr.name !== "normal" && attr.name !== "position" && attr.name !== "tangent").map((attribute) => {
        return (
          /* wgsl */
          `
  vsOutput.${attribute.name} = ${attribute.name};`
        );
      }).join("")
    ).join("\n");
    return output;
  };

  const patchAdditionalChunks = (chunks = null) => {
    if (!chunks) {
      chunks = {
        additionalHead: "",
        preliminaryContribution: "",
        additionalContribution: ""
      };
    } else {
      if (!chunks.additionalHead) {
        chunks.additionalHead = "";
      }
      if (!chunks.preliminaryContribution) {
        chunks.preliminaryContribution = "";
      }
      if (!chunks.additionalContribution) {
        chunks.additionalContribution = "";
      }
    }
    return chunks;
  };

  const getVertexShaderCode = ({
    bindings = [],
    geometry,
    chunks = null,
    additionalVaryings = []
  }) => {
    chunks = patchAdditionalChunks(chunks);
    return (
      /* wgsl */
      `
${chunks.additionalHead}
  
${getVertexOutputStruct({ geometry, additionalVaryings })}
  
@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;
    
  ${declareAttributesVars$1({ geometry })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getVertexTransformedPositionNormal({ bindings, geometry })}
  
  ${getVertexOutput({ geometry })}
  
  // user defined additional contribution
  ${chunks.additionalContribution}

  return vsOutput;
}`
    );
  };

  const getFragmentInputStruct = ({
    geometry,
    additionalVaryings = []
  }) => {
    return (
      /* wgsl */
      `
struct FSInput {
  @builtin(front_facing) frontFacing: bool,
  ${getVertexOutputStructContent({ geometry, additionalVaryings })}
};`
    );
  };

  const declareAttributesVars = ({
    geometry,
    additionalVaryings = []
  }) => {
    let attributeVars = (
      /* wgsl */
      `
  let fragmentPosition: vec4f = fsInput.position;
  let frontFacing: bool = fsInput.frontFacing;
  `
    );
    const normalAttribute = geometry && geometry.getAttributeByName("normal");
    const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
    const disabledAttributes = ["position", "normal", "tangent", "color", "joints", "weights"];
    const attributes = [];
    if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
      geometry.vertexBuffers.forEach((vertexBuffer) => {
        vertexBuffer.attributes.forEach((attribute) => {
          if (!disabledAttributes.some((attr) => attribute.name.includes(attr))) {
            attributes.push(attribute);
          }
        });
      });
    }
    attributeVars += attributes.map((attribute) => {
      return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
    }).join("");
    if (normalAttribute) {
      attributeVars += /* wgsl */
      `
  var normal: vec3f = normalize(fsInput.normal);
    `;
    } else {
      attributeVars += /* wgsl */
      `
  // silly default normal
  var normal: vec3f = vec3(0.0, 0.0, 1.0);
    `;
    }
    if (tangentAttribute) {
      attributeVars += /* wgsl */
      `
  var tangent: vec3f = normalize(fsInput.tangent.xyz);
  var bitangent: vec3f = normalize(fsInput.bitangent);
    `;
    } else {
      attributeVars += /* wgsl */
      `
  var tangent: vec3f;
  var bitangent: vec3f;
    `;
    }
    attributeVars += /* wgsl */
    `
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = normalize(fsInput.viewDirection);
  let modelScale: vec3f = fsInput.modelScale;
  `;
    attributeVars += additionalVaryings.map((attribute) => {
      return `
  var ${attribute.name}: ${attribute.type} = fsInput.${attribute.name};`;
    }).join("");
    return attributeVars;
  };

  const declareMaterialVars = ({
    materialUniform = null,
    materialUniformName = "material",
    shadingModel = "PBR",
    environmentMap = null
  } = {}) => {
    var materialStruct = materialUniform && materialUniform.struct || {};
    var materialVars = "";
    if (materialStruct.color) {
      materialVars += /* wgsl */
      `
  var baseColorFactor: vec3f = ${materialUniformName}.color;`;
    } else {
      materialVars += /* wgsl */
      `
  var baseColorFactor: vec3f = vec3(1.0);`;
    }
    if (materialStruct.opacity) {
      materialVars += /* wgsl */
      `
  var baseOpacityFactor: f32 = ${materialUniformName}.opacity;`;
    } else {
      materialVars += /* wgsl */
      `
  var baseOpacityFactor: f32 = 1.0;`;
    }
    if (materialStruct.alphaCutoff) {
      materialVars += /* wgsl */
      `
  var alphaCutoff: f32 = ${materialUniformName}.alphaCutoff;`;
    } else {
      materialVars += /* wgsl */
      `
  var alphaCutoff: f32 = 0.0;`;
    }
    if (shadingModel !== "Unlit") {
      if (materialStruct.normalScale) {
        materialVars += /* wgsl */
        `
  var normalScale: vec2f = ${materialUniformName}.normalScale;`;
      } else {
        materialVars += /* wgsl */
        `
  var normalScale: vec2f = vec2(1.0);`;
      }
      if (materialStruct.occlusionIntensity) {
        materialVars += /* wgsl */
        `
  var occlusionIntensity: f32 = ${materialUniformName}.occlusionIntensity;`;
      } else {
        materialVars += /* wgsl */
        `
  var occlusionIntensity: f32 = 1.0;`;
      }
      if (materialStruct.emissiveColor) {
        materialVars += /* wgsl */
        `
  var emissive: vec3f = ${materialUniformName}.emissiveColor;`;
      } else {
        materialVars += /* wgsl */
        `
  var emissive: vec3f = vec3(0.0);`;
      }
      if (materialStruct.emissiveIntensity) {
        materialVars += /* wgsl */
        `
  var emissiveStrength: f32 = ${materialUniformName}.emissiveIntensity;`;
      } else {
        materialVars += /* wgsl */
        `
  var emissiveStrength: f32 = 1.0;`;
      }
    }
    if (shadingModel === "Phong" || shadingModel === "PBR") {
      if (materialStruct.metallic) {
        materialVars += /* wgsl */
        `
  var metallic: f32 = ${materialUniformName}.metallic;`;
      } else {
        materialVars += /* wgsl */
        `
  var metallic: f32 = 1.0;`;
      }
      if (materialStruct.roughness) {
        materialVars += /* wgsl */
        `
  var roughness: f32 = ${materialUniformName}.roughness;`;
      } else {
        materialVars += /* wgsl */
        `
  var roughness: f32 = 1.0;`;
      }
      if (materialStruct.specularIntensity) {
        materialVars += /* wgsl */
        `
  var specularIntensity: f32 = ${materialUniformName}.specularIntensity;`;
      } else {
        materialVars += /* wgsl */
        `
  var specularIntensity: f32 = 1.0;`;
      }
      if (materialStruct.specularColor) {
        materialVars += /* wgsl */
        `
  var specularColor: vec3f = ${materialUniformName}.specularColor;`;
      } else {
        materialVars += /* wgsl */
        `
  var specularColor: vec3f = vec3(1.0);`;
      }
      if (materialStruct.ior) {
        materialVars += /* wgsl */
        `
  var ior: f32 = ${materialUniformName}.ior;`;
      } else {
        materialVars += /* wgsl */
        `
  var ior: f32 = 1.5;`;
      }
      if (shadingModel === "Phong") {
        if (materialStruct.shininess) {
          materialVars += /* wgsl */
          `
  var shininess: f32 = ${materialUniformName}.shininess;`;
        } else {
          materialVars += /* wgsl */
          `
  // approximating phong shading from PBR properties
  // arbitrary computation of diffuse, shininess and specular color from roughness and metallic  
  baseColorFactor = mix(baseColorFactor, vec3(0.0), metallic);
  specularColor = mix(specularColor, baseColorFactor, metallic);
  // from https://graphicrants.blogspot.com/2013/08/specular-brdf-reference.html
  var shininess: f32 = clamp(2.0 / (roughness * roughness * roughness * roughness) - 2.0, 1000.0);
  `;
        }
      }
    }
    if (shadingModel === "PBR") {
      if (materialStruct.transmission) {
        materialVars += /* wgsl */
        `
  var transmission: f32 = ${materialUniformName}.transmission;`;
      } else {
        materialVars += /* wgsl */
        `
  var transmission: f32 = 0.0;`;
      }
      if (materialStruct.dispersion) {
        materialVars += /* wgsl */
        `
  var dispersion: f32 = ${materialUniformName}.dispersion;`;
      } else {
        materialVars += /* wgsl */
        `
  var dispersion: f32 = 0.0;`;
      }
      if (materialStruct.thickness) {
        materialVars += /* wgsl */
        `
  var thickness: f32 = ${materialUniformName}.thickness;`;
      } else {
        materialVars += /* wgsl */
        `
  var thickness: f32 = 0.0;`;
      }
      if (materialStruct.attenuationDistance) {
        materialVars += /* wgsl */
        `
  var attenuationDistance: f32 = ${materialUniformName}.attenuationDistance;`;
      } else {
        materialVars += /* wgsl */
        `
  var attenuationDistance: f32 = 1.0e38;`;
      }
      if (materialStruct.attenuationColor) {
        materialVars += /* wgsl */
        `
  var attenuationColor: vec3f = ${materialUniformName}.attenuationColor;`;
      } else {
        materialVars += /* wgsl */
        `
  var attenuationColor: vec3f = vec3(1.0);`;
      }
      if (!!environmentMap) {
        if (materialStruct.envRotation) {
          materialVars += /* wgsl */
          `
  var envRotation: mat3x3f = ${materialUniformName}.envRotation;`;
        } else {
          materialVars += /* wgsl */
          `
  var envRotation: mat3x3f = mat3x3f();`;
        }
        if (materialStruct.envDiffuseIntensity) {
          materialVars += /* wgsl */
          `
  var envDiffuseIntensity: f32 = ${materialUniformName}.envDiffuseIntensity;`;
        } else {
          materialVars += /* wgsl */
          `
  var envDiffuseIntensity: f32 = 1.0;`;
        }
        if (materialStruct.envSpecularIntensity) {
          materialVars += /* wgsl */
          `
  var envSpecularIntensity: f32 = ${materialUniformName}.envSpecularIntensity;`;
        } else {
          materialVars += /* wgsl */
          `
  var envSpecularIntensity: f32 = 1.0;`;
        }
      }
    }
    return materialVars;
  };

  const getBaseColor = ({
    geometry = null,
    baseColorTexture = null
  } = {}) => {
    let baseColor = (
      /* wgsl */
      `
  var baseColor: vec4f = vec4(baseColorFactor, baseOpacityFactor);
  `
    );
    const colorAttributes = [];
    if (geometry && geometry.vertexBuffers && geometry.vertexBuffers.length) {
      geometry.vertexBuffers.forEach((vertexBuffer) => {
        vertexBuffer.attributes.forEach((attribute) => {
          if (attribute.name.includes("color")) {
            colorAttributes.push(attribute);
          }
        });
      });
    }
    colorAttributes.forEach((colorAttribute) => {
      if (colorAttribute.type === "vec3f") {
        baseColor += /* wgsl */
        `
  baseColor *= vec4(fsInput.${colorAttribute.name}, 1.0);`;
      } else {
        baseColor += /* wgsl */
        `
  baseColor *= fsInput.${colorAttribute.name};`;
      }
    });
    if (baseColorTexture) {
      baseColor += /* wgsl */
      `
  var baseColorUV: vec2f = ${baseColorTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in baseColorTexture.texture.options && baseColorTexture.texture.options.useTransform) {
        baseColor += /* wgsl */
        `
  baseColorUV = (texturesMatrices.${baseColorTexture.texture.options.name}.matrix * vec3(baseColorUV, 1.0)).xy;`;
      }
      baseColor += /* wgsl */
      `
  let baseColorSample: vec4f = textureSample(${baseColorTexture.texture.options.name}, ${baseColorTexture.sampler?.name ?? "defaultSampler"}, baseColorUV);
  baseColor *= baseColorSample;
  `;
    }
    baseColor += /* wgsl */
    `
  if (baseColor.a < alphaCutoff) {
    discard;
  }
  
  outputColor = baseColor;
  `;
    return baseColor;
  };

  const getUnlitFragmentShaderCode = ({
    chunks = null,
    toneMapping = "Khronos",
    geometry,
    additionalVaryings = [],
    materialUniform = null,
    materialUniformName = "material",
    baseColorTexture = null
  }) => {
    chunks = patchAdditionalChunks(chunks);
    return (
      /* wgsl */
      `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Unlit" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
    );
  };

  const getNormalTangentBitangent = ({
    geometry = null,
    normalTexture = null
  } = {}) => {
    let normalTangentBitangent = (
      /* wgsl */
      `
  let faceDirection = select(-1.0, 1.0, frontFacing);
  let geometryNormal: vec3f = faceDirection * normal;`
    );
    const tangentAttribute = geometry && geometry.getAttributeByName("tangent");
    const hasTangent = !!(normalTexture && tangentAttribute);
    if (normalTexture) {
      normalTangentBitangent += /* wgsl */
      `
  var normalUV: vec2f = ${normalTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in normalTexture.texture.options && normalTexture.texture.options.useTransform) {
        normalTangentBitangent += /* wgsl */
        `
  normalUV = (texturesMatrices.${normalTexture.texture.options.name}.matrix * vec3(normalUV, 1.0)).xy;`;
      }
      if (!hasTangent) {
        normalTangentBitangent += /* wgsl */
        `
  bitangent = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  
  if (1.0 - abs(NdotUp) <= EPSILON) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  tangent = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);
  `;
      }
      normalTangentBitangent += /* wgsl */
      `
  let tbn = mat3x3f(tangent, bitangent, geometryNormal);
  let normalMap = textureSample(${normalTexture.texture.options.name}, ${normalTexture.sampler?.name ?? "defaultSampler"}, normalUV).rgb;
  normal = normalize(tbn * (2.0 * normalMap - vec3(vec2(normalScale), 1.0)));`;
    } else {
      normalTangentBitangent += /* wgsl */
      `
  normal = geometryNormal;`;
    }
    return normalTangentBitangent;
  };

  const getEmissiveOcclusion = ({
    emissiveTexture = null,
    occlusionTexture = null
  } = {}) => {
    let emissiveOcclusion = (
      /* wgsl */
      `
  var occlusion: f32 = 1.0;`
    );
    if (emissiveTexture) {
      emissiveOcclusion += /* wgsl */
      `
  var emissiveUV: vec2f = ${emissiveTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in emissiveTexture.texture.options && emissiveTexture.texture.options.useTransform) {
        emissiveOcclusion += /* wgsl */
        `
  emissiveUV = (texturesMatrices.${emissiveTexture.texture.options.name}.matrix * vec3(emissiveUV, 1.0)).xy;`;
      }
      emissiveOcclusion += /* wgsl */
      `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture.options.name}, ${emissiveTexture.sampler?.name ?? "defaultSampler"}, emissiveUV).rgb;
  emissive *= emissiveSample;`;
    }
    emissiveOcclusion += /* wgsl */
    `
  emissive *= emissiveStrength;`;
    if (occlusionTexture) {
      emissiveOcclusion += /* wgsl */
      `
  var occlusionUV: vec2f = ${occlusionTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in occlusionTexture.texture.options && occlusionTexture.texture.options.useTransform) {
        emissiveOcclusion += /* wgsl */
        `
  occlusionUV = (${occlusionTexture.texture.options.name}Matrix * vec3(occlusionUV, 1.0)).xy;`;
      }
      emissiveOcclusion += /* wgsl */
      `
  occlusion = textureSample(${occlusionTexture.texture.options.name}, ${occlusionTexture.sampler?.name ?? "defaultSampler"}, occlusionUV).r;`;
    }
    emissiveOcclusion += /* wgsl */
    `
  occlusion = 1.0 + occlusionIntensity * (occlusion - 1.0);`;
    return emissiveOcclusion;
  };

  const getLambertFragmentShaderCode = ({
    chunks = null,
    toneMapping = "Khronos",
    geometry,
    additionalVaryings = [],
    materialUniform = null,
    materialUniformName = "material",
    receiveShadows = false,
    baseColorTexture = null,
    normalTexture = null,
    emissiveTexture = null,
    occlusionTexture = null
  }) => {
    chunks = patchAdditionalChunks(chunks);
    return (
      /* wgsl */
      `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${getLambertDirect}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Lambert" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}  
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
    );
  };

  const getMetallicRoughness = ({
    metallicRoughnessTexture = null
  } = {}) => {
    let metallicRoughness = "";
    if (metallicRoughnessTexture) {
      metallicRoughness += /* wgsl */
      `
  var metallicRoughnessUV: vec2f = ${metallicRoughnessTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in metallicRoughnessTexture.texture.options && metallicRoughnessTexture.texture.options.useTransform) {
        metallicRoughness += /* wgsl */
        `
  metallicRoughnessUV = (${metallicRoughnessTexture.texture.options.name}Matrix * vec3(metallicRoughnessUV, 1.0)).xy;`;
      }
      metallicRoughness += /* wgsl */
      `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture.options.name}, ${metallicRoughnessTexture.sampler?.name ?? "defaultSampler"}, metallicRoughnessUV);
  
  metallic = metallic * metallicRoughness.b;
  roughness = roughness * metallicRoughness.g;
  `;
    }
    metallicRoughness += /* wgsl */
    `
  metallic = saturate(metallic);
  roughness = clamp(roughness, 0.0525, 1.0);
  `;
    return metallicRoughness;
  };

  const getSpecular = ({
    specularTexture = null,
    specularFactorTexture = null,
    specularColorTexture = null
  } = {}) => {
    let specular = "";
    if (specularTexture) {
      specular += /* wgsl */
      `
  var specularUV: vec2f = ${specularTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in specularTexture.texture.options && specularTexture.texture.options.useTransform) {
        specular += /* wgsl */
        `
  specularUV = (${specularTexture.texture.options.name}Matrix * vec3(specularUV, 1.0)).xy;`;
      }
      specular += /* wgsl */
      `
  let specularSample: vec4f = textureSample(${specularTexture.texture.options.name}, ${specularTexture.sampler?.name ?? "defaultSampler"}, specularUV);
  
  specularIntensity = specularIntensity * specularSample.a;
  specularColor = specularColor * specularSample.rgb;`;
    } else {
      if (specularFactorTexture) {
        specular += /* wgsl */
        `
  var specularFactorUV: vec2f = ${specularFactorTexture.texCoordAttributeName ?? "uv"};`;
        if ("useTransform" in specularFactorTexture.texture.options && specularFactorTexture.texture.options.useTransform) {
          specular += /* wgsl */
          `
  specularFactorUV = (${specularFactorTexture.texture.options.name}Matrix * vec3(specularFactorUV, 1.0)).xy;`;
        }
        specular += /* wgsl */
        `
  let specularFactorSample: vec4f = textureSample(${specularFactorTexture.texture.options.name}, ${specularFactorTexture.sampler?.name ?? "defaultSampler"}, specularFactorUV);
  
  specularIntensity = specularIntensity * specularSample.a;`;
      }
      if (specularColorTexture) {
        specular += /* wgsl */
        `
  var specularColorUV: vec2f = ${specularColorTexture.texCoordAttributeName ?? "uv"};`;
        if ("useTransform" in specularColorTexture.texture.options && specularColorTexture.texture.options.useTransform) {
          specular += /* wgsl */
          `
  specularColorUV = (${specularColorTexture.texture.options.name}Matrix * vec3(specularColorUV, 1.0)).xy;`;
        }
        specular += /* wgsl */
        `
  let specularColorSample: vec4f = textureSample(${specularColorTexture.texture.options.name}, ${specularColorTexture.sampler?.name ?? "defaultSampler"}, specularColorUV);
  
  specularColor = specularColor * specularSample.rgb;`;
      }
    }
    return specular;
  };

  const getPhongFragmentShaderCode = ({
    chunks = null,
    toneMapping = "Khronos",
    geometry,
    additionalVaryings = [],
    materialUniform = null,
    materialUniformName = "material",
    receiveShadows = false,
    baseColorTexture = null,
    normalTexture = null,
    emissiveTexture = null,
    occlusionTexture = null,
    metallicRoughnessTexture = null,
    specularTexture = null,
    specularFactorTexture = null,
    specularColorTexture = null
  }) => {
    chunks = patchAdditionalChunks(chunks);
    return (
      /* wgsl */
      `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${getPhongDirect}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Phong" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
    );
  };

  const getIBLGGXFresnel = (
    /*  */
    `
// multi scattering equations
// not used for now since our IBL GGX Fresnel already handles energy conseervation
// could be used if we dropped the environment map LUT texture
fn DFGApprox(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
) -> vec2f {
  let dotNV: f32 = saturate(dot( normal, viewDirection ));

	let c0: vec4f = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	let c1: vec4f = vec4( 1, 0.0425, 1.04, - 0.04 );

	let r: vec4f = roughness * c0 + c1;
	let a004: f32 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	
	let fab: vec2f = vec2( - 1.04, 1.04 ) * a004 + r.zw;

	return fab;
}

struct IBLGGXFresnel {
  FssEss: vec3f,
  FmsEms: vec3f
}

struct TotalScattering {
  single: vec3f,
  multi: vec3f,
}

fn computeMultiscattering(
  normal: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  f90: f32,
  roughness: f32,
  ptr_totalScattering: ptr<function, IBLGGXFresnel>
) {
  let fab: vec2f = DFGApprox( normal, viewDirection, roughness );

	let Fr: vec3f = specularColor;

	let FssEss: vec3f = Fr * fab.x + f90 * fab.y;

	let Ess: f32 = fab.x + fab.y;
	let Ems: f32 = 1.0 - Ess;

	let Favg: vec3f = Fr + ( 1.0 - Fr ) * 0.047619; // 1/21
	let Fms: vec3f = FssEss * Favg / ( 1.0 - Ems * Favg );

	(*ptr_totalScattering).FssEss += FssEss;
	(*ptr_totalScattering).FmsEms += Fms * Ems;
}

fn getIBLGGXFresnel(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  f0: vec3f,
  specularWeight: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>
) -> IBLGGXFresnel {
  var iBLGGXFresnel: IBLGGXFresnel;
  
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  
  let brdfSamplePoint: vec2f = saturate(vec2(NdotV, roughness));
  
  let brdf: vec3f = textureSample(
    lutTexture,
    clampSampler,
    brdfSamplePoint
  ).rgb;
  
  let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;
  let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);
  iBLGGXFresnel.FssEss = specularWeight * (k_S * brdf.x + brdf.y);
  let Ems: f32 = (1.0 - (brdf.x + brdf.y));
  let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);
  iBLGGXFresnel.FmsEms = Ems * iBLGGXFresnel.FssEss * F_avg / (1.0 - F_avg * Ems);
  
  return iBLGGXFresnel;
}
`
  );

  const getIBLIndirectIrradiance = (
    /* wgsl */
    `
fn getIBLIndirectIrradiance(
  normal: vec3f,
  diffuseColor: vec3f,
  clampSampler: sampler,
  envDiffuseTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envDiffuseIntensity: f32,
) -> vec3f {
  // IBL diffuse (irradiance)
  let diffuseLight: vec4f = textureSample(
    envDiffuseTexture,
    clampSampler,
    normal * envRotation
  );

  return diffuseLight.rgb * envDiffuseIntensity;
}
`
  );

  const getIBLIndirectRadiance = (
    /* wgsl */
    `
fn getIBLIndirectRadiance(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  specularColor: vec3f,
  specularFactor: f32,
  iBLGGXFresnel: IBLGGXFresnel,
  clampSampler: sampler,
  envSpecularTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envSpecularIntensity: f32,
)-> vec3f {
  let N: vec3f = normal;
  let V: vec3f = viewDirection;
  let NdotV: f32 = saturate(dot(N, V));

  let reflection: vec3f = normalize(reflect(-V, N));

  let lod: f32 = roughness * f32(textureNumLevels(envSpecularTexture) - 1);

  let specularLight: vec4f = textureSampleLevel(
    envSpecularTexture,
    clampSampler,
    reflection * envRotation,
    lod
  );

  return specularLight.rgb * envSpecularIntensity;
}
`
  );

  const getTransmissionThickness = ({
    transmissionTexture = null,
    thicknessTexture = null
  } = {}) => {
    let transmissionThickness = "";
    if (transmissionTexture) {
      transmissionThickness += /* wgsl */
      `
  var transmissionUV: vec2f = ${transmissionTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in transmissionTexture.texture.options && transmissionTexture.texture.options.useTransform) {
        transmissionThickness += /* wgsl */
        `
  transmissionUV = (${transmissionTexture.texture.options.name}Matrix * vec3(transmissionUV, 1.0)).xy;`;
      }
      transmissionThickness += /* wgsl */
      `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture.options.name}, ${transmissionTexture.sampler?.name ?? "defaultSampler"}, transmissionUV);
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`;
    }
    if (thicknessTexture) {
      transmissionThickness += /* wgsl */
      `
  var thicknessUV: vec2f = ${thicknessTexture.texCoordAttributeName ?? "uv"};`;
      if ("useTransform" in thicknessTexture.texture.options && thicknessTexture.texture.options.useTransform) {
        transmissionThickness += /* wgsl */
        `
  thicknessUV = (${thicknessTexture.texture.options.name}Matrix * vec3(thicknessUV, 1.0)).xy;`;
      }
      transmissionThickness += /* wgsl */
      `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture.options.name}, ${thicknessTexture.sampler?.name ?? "defaultSampler"}, thicknessUV);
  
  thickness *= thicknessSample.g;`;
    }
    return transmissionThickness;
  };

  const getPBRFragmentShaderCode = ({
    chunks = null,
    toneMapping = "Khronos",
    geometry,
    additionalVaryings = [],
    materialUniform = null,
    materialUniformName = "material",
    extensionsUsed = [],
    receiveShadows = false,
    baseColorTexture = null,
    normalTexture = null,
    emissiveTexture = null,
    occlusionTexture = null,
    metallicRoughnessTexture = null,
    specularTexture = null,
    specularFactorTexture = null,
    specularColorTexture = null,
    transmissionTexture = null,
    thicknessTexture = null,
    transmissionBackgroundTexture = null,
    environmentMap = null
  }) => {
    chunks = patchAdditionalChunks(chunks);
    return (
      /* wgsl */
      `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${REIndirectSpecular}
${getPBRDirect}
${getIBLGGXFresnel}
${getIBLIndirectIrradiance}
${getIBLIndirectRadiance}
${getIBLTransmission}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "PBR", environmentMap })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getTransmissionThickness({ transmissionTexture, thicknessTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
    );
  };

  const getFragmentShaderCode = ({
    shadingModel = "PBR",
    chunks = null,
    toneMapping = "Khronos",
    geometry,
    additionalVaryings = [],
    materialUniform = null,
    materialUniformName = "material",
    extensionsUsed = [],
    receiveShadows = false,
    baseColorTexture = null,
    normalTexture = null,
    emissiveTexture = null,
    occlusionTexture = null,
    metallicRoughnessTexture = null,
    specularTexture = null,
    specularFactorTexture = null,
    specularColorTexture = null,
    transmissionTexture = null,
    thicknessTexture = null,
    transmissionBackgroundTexture = null,
    environmentMap = null
  }) => {
    return (() => {
      switch (shadingModel) {
        case "Unlit":
          return getUnlitFragmentShaderCode({
            chunks,
            toneMapping,
            geometry,
            additionalVaryings,
            materialUniform,
            materialUniformName,
            baseColorTexture
          });
        case "Lambert":
          return getLambertFragmentShaderCode({
            chunks,
            toneMapping,
            geometry,
            additionalVaryings,
            materialUniform,
            materialUniformName,
            receiveShadows,
            baseColorTexture,
            normalTexture,
            emissiveTexture,
            occlusionTexture
          });
        case "Phong":
          return getPhongFragmentShaderCode({
            chunks,
            toneMapping,
            geometry,
            additionalVaryings,
            materialUniform,
            materialUniformName,
            receiveShadows,
            baseColorTexture,
            normalTexture,
            emissiveTexture,
            occlusionTexture,
            metallicRoughnessTexture,
            specularTexture,
            specularFactorTexture,
            specularColorTexture
          });
        case "PBR":
        default:
          return getPBRFragmentShaderCode({
            chunks,
            toneMapping,
            geometry,
            additionalVaryings,
            materialUniform,
            materialUniformName,
            extensionsUsed,
            receiveShadows,
            baseColorTexture,
            normalTexture,
            emissiveTexture,
            occlusionTexture,
            metallicRoughnessTexture,
            specularTexture,
            specularFactorTexture,
            specularColorTexture,
            transmissionTexture,
            thicknessTexture,
            transmissionBackgroundTexture,
            environmentMap
          });
      }
    })();
  };

  var __typeError$7 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$7 = (obj, member, msg) => member.has(obj) || __typeError$7("Cannot " + msg);
  var __privateGet$6 = (obj, member, getter) => (__accessCheck$7(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$7 = (obj, member, value) => member.has(obj) ? __typeError$7("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$6 = (obj, member, value, setter) => (__accessCheck$7(obj, member, "write to private field"), member.set(obj, value), value);
  var _DOMObjectWorldPosition, _DOMObjectWorldScale, _DOMObjectDepthScaleRatio;
  class DOMObject3D extends ProjectedObject3D {
    /**
     * DOMObject3D constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}.
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}.
     * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}.
     */
    constructor(renderer, element, parameters = {}) {
      super(renderer);
      /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3DTransforms#position.world | world position} accounting the {@link DOMObject3DTransforms#position.document | additional document translation} converted into world space. */
      __privateAdd$7(this, _DOMObjectWorldPosition, new Vec3());
      /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3D} world scale accounting the {@link DOMObject3D#size.world | DOMObject3D world size}. */
      __privateAdd$7(this, _DOMObjectWorldScale, new Vec3(1));
      /** Private number representing the scale ratio of the {@link DOMObject3D} along Z axis to apply. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis. */
      __privateAdd$7(this, _DOMObjectDepthScaleRatio, 1);
      /** Helper {@link Box3 | bounding box} used to map the 3D object onto the 2D DOM element. */
      this.boundingBox = new Box3(new Vec3(-1), new Vec3(1));
      /** function assigned to the {@link onAfterDOMElementResize} callback. */
      this._onAfterDOMElementResizeCallback = () => {
      };
      renderer = isCurtainsRenderer(renderer, "DOMObject3D");
      this.renderer = renderer;
      this.size = {
        shouldUpdate: true,
        normalizedWorld: {
          size: new Vec2(1),
          position: new Vec2()
        },
        cameraWorld: {
          size: new Vec2(1)
        },
        scaledWorld: {
          size: new Vec3(1),
          position: new Vec3()
        }
      };
      this.watchScroll = parameters.watchScroll;
      this.camera = this.renderer.camera;
      this.boundingBox.min.onChange(() => this.shouldUpdateComputedSizes());
      this.boundingBox.max.onChange(() => this.shouldUpdateComputedSizes());
      this.setDOMElement(element);
      this.renderer.domObjects.push(this);
    }
    /**
     * Set or reset this {@link DOMObject3D} {@link DOMObject3D.renderer | renderer}.
     * @param renderer - New {@link GPUCurtainsRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.domObjects = this.renderer.domObjects.filter(
          (object) => object.object3DIndex !== this.object3DIndex
        );
      }
      renderer = isCurtainsRenderer(renderer, "DOMObject3D");
      this.renderer = renderer;
      this.renderer.domObjects.push(this);
    }
    /**
     * Set the {@link domElement | DOM Element}.
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
     */
    setDOMElement(element) {
      this.domElement = new DOMElement({
        element,
        onSizeChanged: (boundingRect) => this.resize(boundingRect),
        onPositionChanged: () => this.onPositionChanged()
      });
      this.updateSizeAndPosition();
    }
    /**
     * Update size and position when the {@link domElement | DOM Element} position changed.
     */
    onPositionChanged() {
      if (this.watchScroll) {
        this.shouldUpdateComputedSizes();
      }
    }
    /**
     * Reset the {@link domElement | DOMElement}.
     * @param element - The new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
     */
    resetDOMElement(element) {
      if (this.domElement) {
        this.domElement.destroy();
      }
      this.setDOMElement(element);
    }
    /**
     * Resize the {@link DOMObject3D}.
     * @param boundingRect - New {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}.
     */
    resize(boundingRect = null) {
      if (!boundingRect && (!this.domElement || this.domElement?.isResizing)) return;
      this.updateSizeAndPosition();
      this._onAfterDOMElementResizeCallback && this._onAfterDOMElementResizeCallback();
    }
    /* BOUNDING BOXES GETTERS */
    /**
     * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}.
     * @readonly
     */
    get boundingRect() {
      return this.domElement?.boundingRect ?? {
        width: 1,
        height: 1,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        x: 0,
        y: 0
      };
    }
    /* TRANSFOMS */
    /**
     * Set our transforms properties and {@link Vec3#onChange | onChange vector} callbacks.
     */
    setTransforms() {
      super.setTransforms();
      this.transforms.origin.model.set(0.5, 0.5, 0);
      this.transforms.origin.world = new Vec3();
      this.transforms.position.document = new Vec3();
      this.documentPosition.onChange(() => this.applyPosition());
      this.transformOrigin.onChange(() => this.setWorldTransformOrigin());
    }
    /**
     * Get the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}.
     */
    get documentPosition() {
      return this.transforms.position.document;
    }
    /**
     * Set the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}.
     * @param value - Additional translation relative to the document to apply.
     */
    set documentPosition(value) {
      this.transforms.position.document = value;
      this.applyPosition();
    }
    /**
     * Get the {@link domElement | DOM element} scale in world space.
     * @readonly
     */
    get DOMObjectWorldScale() {
      return __privateGet$6(this, _DOMObjectWorldScale).clone();
    }
    /**
     * Get the {@link DOMObject3D} scale in world space (accounting for {@link scale}).
     * @readonly
     */
    get worldScale() {
      return this.DOMObjectWorldScale.multiply(this.scale);
    }
    /**
     * Get the {@link DOMObject3D} position in world space.
     * @readonly
     */
    get worldPosition() {
      return __privateGet$6(this, _DOMObjectWorldPosition).clone();
    }
    /**
     * Get the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}.
     */
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    /**
     * Set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}.
     * @param value - New transform origin.
     */
    set transformOrigin(value) {
      this.transforms.origin.model = value;
      this.setWorldTransformOrigin();
    }
    /**
     * Get the {@link DOMObject3D} transform origin in world space.
     */
    get worldTransformOrigin() {
      return this.transforms.origin.world;
    }
    /**
     * Set the {@link DOMObject3D} transform origin in world space.
     * @param value - New world space transform origin.
     */
    set worldTransformOrigin(value) {
      this.transforms.origin.world = value;
    }
    /**
     * Check whether at least one of the matrix should be updated.
     */
    shouldUpdateMatrices() {
      super.shouldUpdateMatrices();
      if (this.matricesNeedUpdate || this.size.shouldUpdate) {
        this.updateSizeAndPosition();
        this.matricesNeedUpdate = true;
      }
      this.size.shouldUpdate = false;
    }
    /**
     * Set the {@link DOMObject3D#size.shouldUpdate | size shouldUpdate} flag to true to compute the new sizes before next matrices calculations.
     */
    shouldUpdateComputedSizes() {
      this.size.shouldUpdate = true;
    }
    /**
     * Update the {@link DOMObject3D} sizes and position.
     */
    updateSizeAndPosition() {
      this.setWorldSizes();
      this.applyDocumentPosition();
      this.shouldUpdateModelMatrix();
    }
    /**
     * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space.
     */
    applyDocumentPosition() {
      let worldPosition = new Vec3(0, 0, 0);
      if (!this.documentPosition.equals(worldPosition)) {
        worldPosition = this.documentToWorldSpace(this.documentPosition);
      }
      __privateGet$6(this, _DOMObjectWorldPosition).set(
        this.position.x + this.size.scaledWorld.position.x + worldPosition.x,
        this.position.y + this.size.scaledWorld.position.y + worldPosition.y,
        this.position.z + this.size.scaledWorld.position.z + this.documentPosition.z / this.camera.CSSPerspective
      );
    }
    /**
     * Apply the transform origin and set the {@link DOMObject3D} world transform origin.
     */
    applyTransformOrigin() {
      if (!this.size) return;
      this.setWorldTransformOrigin();
      super.applyTransformOrigin();
    }
    /* MATRICES */
    /**
     * Update the {@link modelMatrix | model matrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale.
     */
    updateModelMatrix() {
      this.modelMatrix.composeFromOrigin(
        __privateGet$6(this, _DOMObjectWorldPosition),
        this.quaternion,
        this.scale,
        this.worldTransformOrigin
      );
      this.modelMatrix.scale(this.DOMObjectWorldScale);
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}.
     * @param vector - Document position {@link Vec3 | vector} converted to world space.
     */
    documentToWorldSpace(vector = new Vec3()) {
      return new Vec3(
        vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.visibleSize.width,
        -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.visibleSize.height,
        vector.z
      );
    }
    /**
     * Compute the {@link DOMObject3D#size | world sizes}.
     */
    computeWorldSizes() {
      const containerBoundingRect = this.renderer.boundingRect;
      const planeCenter = {
        x: this.boundingRect.width / 2 + this.boundingRect.left,
        y: this.boundingRect.height / 2 + this.boundingRect.top
      };
      const containerCenter = {
        x: containerBoundingRect.width / 2 + containerBoundingRect.left,
        y: containerBoundingRect.height / 2 + containerBoundingRect.top
      };
      const { size, center } = this.boundingBox;
      if (size.x !== 0 && size.y !== 0 && size.z !== 0) {
        center.divide(size);
      }
      this.size.normalizedWorld.size.set(
        this.boundingRect.width / containerBoundingRect.width,
        this.boundingRect.height / containerBoundingRect.height
      );
      this.size.normalizedWorld.position.set(
        (planeCenter.x - containerCenter.x) / containerBoundingRect.width,
        (containerCenter.y - planeCenter.y) / containerBoundingRect.height
      );
      this.size.cameraWorld.size.set(
        this.size.normalizedWorld.size.x * this.camera.visibleSize.width,
        this.size.normalizedWorld.size.y * this.camera.visibleSize.height
      );
      this.size.scaledWorld.size.set(this.size.cameraWorld.size.x / size.x, this.size.cameraWorld.size.y / size.y, 1);
      this.size.scaledWorld.size.z = this.size.scaledWorld.size.y * (size.x / size.y / (this.boundingRect.width / this.boundingRect.height));
      this.size.scaledWorld.position.set(
        this.size.normalizedWorld.position.x * this.camera.visibleSize.width,
        this.size.normalizedWorld.position.y * this.camera.visibleSize.height,
        0
      );
    }
    /**
     * Compute and set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin.
     */
    setWorldSizes() {
      this.computeWorldSizes();
      this.setWorldScale();
      this.setWorldTransformOrigin();
    }
    /**
     * Set the {@link worldScale} accounting for scaled world size and {@link DOMObjectDepthScaleRatio}.
     */
    setWorldScale() {
      __privateGet$6(this, _DOMObjectWorldScale).set(
        this.size.scaledWorld.size.x,
        this.size.scaledWorld.size.y,
        this.size.scaledWorld.size.z * __privateGet$6(this, _DOMObjectDepthScaleRatio)
      );
      this.shouldUpdateMatrixStack();
    }
    /**
     * Set {@link DOMObjectDepthScaleRatio}. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis.
     * @param value - Depth scale ratio value to use.
     */
    set DOMObjectDepthScaleRatio(value) {
      __privateSet$6(this, _DOMObjectDepthScaleRatio, value);
      this.setWorldScale();
    }
    /**
     * Set the {@link DOMObject3D} world transform origin and tell the matrices to update.
     */
    setWorldTransformOrigin() {
      this.transforms.origin.world = new Vec3(
        (this.transformOrigin.x * 2 - 1) * // between -1 and 1
        __privateGet$6(this, _DOMObjectWorldScale).x,
        -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
        __privateGet$6(this, _DOMObjectWorldScale).y,
        this.transformOrigin.z * __privateGet$6(this, _DOMObjectWorldScale).z
      );
      this.shouldUpdateMatrixStack();
    }
    /**
     * Update the {@link domElement | DOM Element} scroll position.
     * @param delta - Last {@link utils/ScrollManager.ScrollManager.delta | scroll delta values}.
     */
    updateScrollPosition(delta = { x: 0, y: 0 }) {
      if (delta.x || delta.y) {
        this.domElement.updateScrollPosition(delta);
      }
    }
    /**
     * Callback to execute just after the {@link domElement} has been resized.
     * @param callback - Callback to run just after {@link domElement} has been resized.
     * @returns - Our {@link DOMObject3D}.
     */
    onAfterDOMElementResize(callback) {
      if (callback) {
        this._onAfterDOMElementResizeCallback = callback;
      }
      return this;
    }
    /**
     * Destroy our {@link DOMObject3D}.
     */
    destroy() {
      super.destroy();
      this.renderer.domObjects = this.renderer.domObjects.filter((object) => object.object3DIndex !== this.object3DIndex);
      this.domElement?.destroy();
    }
  }
  _DOMObjectWorldPosition = new WeakMap();
  _DOMObjectWorldScale = new WeakMap();
  _DOMObjectDepthScaleRatio = new WeakMap();

  const defaultDOMMeshParams = {
    autoloadSources: true,
    watchScroll: true,
    domTextures: []
  };
  class DOMMesh extends ProjectedMeshBaseMixin(DOMObject3D) {
    /**
     * DOMMesh constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
     * @param parameters - {@link DOMMeshParams | parameters} used to create this {@link DOMMesh}
     */
    constructor(renderer, element, parameters) {
      parameters = { ...defaultDOMMeshParams, ...parameters };
      const { autoloadSources, watchScroll, domTextures, ...projectedMeshParams } = parameters;
      super(renderer, element, parameters);
      // callbacks / events
      /** function assigned to the {@link onLoading} callback */
      this._onLoadingCallback = (texture) => {
      };
      isCurtainsRenderer(renderer, parameters.label ? parameters.label + " DOMMesh" : "DOMMesh");
      this.type = "DOMMesh";
      this.domTextures = [];
      domTextures.forEach((texture) => {
        this.addTexture(texture);
        this.onDOMTextureAdded(texture);
      });
      this.autoloadSources = autoloadSources;
      this.sourcesReady = false;
      this.setInitSources();
    }
    /**
     * Set or reset this {@link DOMMesh} {@link DOMMesh.renderer | renderer}.
     * @param renderer - New {@link GPUCurtainsRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.domMeshes = this.renderer.domMeshes.filter((m) => m.uuid !== this.uuid);
      }
      renderer = isCurtainsRenderer(renderer, this.options.label + " DOMMesh");
      super.setRenderer(renderer);
      this.renderer = renderer;
      this.renderer.domMeshes.push(this);
    }
    /**
     * Get/set whether our {@link material} and {@link geometry} are ready.
     * @readonly
     */
    get ready() {
      return this._ready;
    }
    set ready(value) {
      if (value && !this._ready && this.sourcesReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /**
     * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded.
     * @readonly
     */
    get sourcesReady() {
      return this._sourcesReady;
    }
    set sourcesReady(value) {
      if (value && !this._sourcesReady && this.ready) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._sourcesReady = value;
    }
    /**
     * Add a {@link DOMMesh} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - whether to add this {@link DOMMesh} to the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
     */
    addToScene(addToRenderer = false) {
      super.addToScene(addToRenderer);
      if (addToRenderer) {
        this.renderer.domMeshes.push(this);
      }
    }
    /**
     * Remove a {@link DOMMesh} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link DOMMesh} from the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}.
     */
    removeFromScene(removeFromRenderer = false) {
      super.removeFromScene(removeFromRenderer);
      if (removeFromRenderer) {
        this.renderer.domMeshes = this.renderer.domMeshes.filter((m) => m.uuid !== this.uuid);
      }
    }
    /**
     * Resize the {@link textures} and {@link domTextures}.
     */
    resizeTextures() {
      super.resizeTextures();
      this.domTextures?.forEach((texture) => {
        texture.resize();
      });
    }
    /**
     * Apply scale and update {@link DOMTexture#modelMatrix | DOMTexture modelMatrix}.
     */
    applyScale() {
      super.applyScale();
      this.domTextures?.forEach((texture) => {
        texture.updateModelMatrix();
      });
    }
    /* DOM TEXTURES */
    /**
     * Create a new {@link DOMTexture}.
     * @param options - {@link DOMTextureParams | DOMTexture parameters}.
     * @returns - newly created {@link DOMTexture}.
     */
    createDOMTexture(options) {
      const defaultName = "texture" + this.textures.length;
      if (!options.label) {
        options.label = this.options.label + " " + (options.name ?? defaultName);
      }
      if (!options.name) {
        options.name = defaultName;
      }
      const { viewDimension, useTransform, ...domTextureParams } = this.options.texturesOptions;
      const texturesOptions = { ...options, ...domTextureParams };
      if (this.renderBundle) {
        texturesOptions.useExternalTextures = false;
      }
      const domTexture = new DOMTexture(this.renderer, texturesOptions);
      this.addTexture(domTexture);
      this.onDOMTextureAdded(domTexture);
      return domTexture;
    }
    /**
     * Callback run when a new {@link DOMTexture} has been added.
     * @param domTexture - newly created DOMTexture.
     */
    onDOMTextureAdded(domTexture) {
      domTexture.mesh = this;
      this.domTextures.push(domTexture);
    }
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated {@link DOMTexture}.
     */
    setInitSources() {
      let loaderSize = 0;
      let sourcesLoaded = 0;
      if (this.autoloadSources) {
        const images = this.domElement.element.querySelectorAll("img");
        const videos = this.domElement.element.querySelectorAll("video");
        const canvases = this.domElement.element.querySelectorAll("canvas");
        loaderSize = images.length + videos.length + canvases.length;
        const onSourceUploaded = (texture) => {
          sourcesLoaded++;
          this._onLoadingCallback && this._onLoadingCallback(texture);
          if (sourcesLoaded === loaderSize) {
            this.sourcesReady = true;
          }
        };
        if (!loaderSize) {
          this.sourcesReady = true;
        }
        if (images.length) {
          images.forEach((image) => {
            const texture = this.createDOMTexture({
              name: image.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
            });
            texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadImage(image.src);
          });
        }
        if (videos.length) {
          videos.forEach((video) => {
            const texture = this.createDOMTexture({
              name: video.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
            });
            texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadVideo(video);
          });
        }
        if (canvases.length) {
          canvases.forEach((canvas) => {
            const texture = this.createDOMTexture({
              name: canvas.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
            });
            texture.onAllSourcesUploaded(() => onSourceUploaded(texture)).loadCanvas(canvas);
          });
        }
      } else {
        this.sourcesReady = true;
      }
    }
    /**
     * Reset/change the {@link domElement | DOM Element}.
     * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
     */
    resetDOMElement(element) {
      if (!!element) {
        super.resetDOMElement(element);
        this.domTextures.forEach((texture) => texture.resize());
      } else if (!element && !this.renderer.production) {
        throwWarning(
          `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
        );
      }
    }
    /**
     * Get our {@link DOMMesh#domElement | DOM Element} {@link core/DOM/DOMElement.DOMElement#boundingRect | bounding rectangle} accounting for current {@link core/renderers/GPURenderer.GPURenderer#pixelRatio | renderer pixel ratio}.
     */
    get pixelRatioBoundingRect() {
      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const scaleBoundingRect = this.renderer.pixelRatio / devicePixelRatio;
      return Object.keys(this.domElement.boundingRect).reduce(
        (a, key) => ({ ...a, [key]: this.domElement.boundingRect[key] * scaleBoundingRect }),
        {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );
    }
    /**
     * Compute the Mesh geometry if needed.
     */
    computeGeometry() {
      super.computeGeometry();
      this.boundingBox.copy(this.geometry.boundingBox);
    }
    /* EVENTS */
    /**
     * Called each time one of the initial sources associated {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
     * @param callback - callback to call each time a {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU.
     * @returns - our {@link DOMMesh}.
     */
    onLoading(callback) {
      if (callback) {
        this._onLoadingCallback = callback;
      }
      return this;
    }
  }

  const defaultPlaneParams = {
    label: "Plane",
    // geometry
    instancesCount: 1,
    vertexBuffers: []
  };
  class Plane extends DOMMesh {
    /**
     * Plane constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
     * @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
     */
    constructor(renderer, element, parameters = {}) {
      renderer = isCurtainsRenderer(renderer, parameters.label ? parameters.label + " Plane" : "Plane");
      const params = { ...defaultPlaneParams, ...parameters };
      let { geometry, widthSegments, heightSegments, ...DOMMeshParams2 } = params;
      const { instancesCount, vertexBuffers, ...materialParams } = DOMMeshParams2;
      if (!geometry || geometry.type !== "PlaneGeometry") {
        widthSegments = widthSegments ?? 1;
        heightSegments = heightSegments ?? 1;
        const geometryID = widthSegments * heightSegments + widthSegments;
        if (!vertexBuffers.length) {
          geometry = cacheManager.getPlaneGeometryByID(geometryID);
        }
        if (!geometry) {
          geometry = new PlaneGeometry({ widthSegments, heightSegments, instancesCount, vertexBuffers });
          cacheManager.addPlaneGeometry(geometry);
        } else {
          geometry.instancesCount = instancesCount;
        }
      }
      super(renderer, element, { geometry, ...materialParams });
      this.type = "Plane";
    }
  }

  class GPUCurtainsRenderer extends GPUCameraRenderer {
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}.
     */
    constructor({
      deviceManager,
      label,
      container,
      pixelRatio = 1,
      autoResize = true,
      context = {},
      renderPass,
      camera,
      lights
    }) {
      super({
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        context,
        renderPass,
        camera,
        lights
      });
      this.type = "GPUCurtainsRenderer";
    }
    /**
     * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements.
     */
    setRendererObjects() {
      super.setRendererObjects();
      this.domMeshes = [];
      this.domObjects = [];
      this.domTextures = [];
    }
    /**
     * Add a {@link DOMTexture} to our {@link domTextures | DOM textures array}.
     * @param texture - {@link DOMTexture} to add.
     */
    addDOMTexture(texture) {
      this.domTextures.push(texture);
    }
    /**
     * Remove a {@link DOMTexture} from our {@link domTextures | textures array}.
     * @param texture - {@link DOMTexture} to remove.
     */
    removeDOMTexture(texture) {
      this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/cameras/PerspectiveCamera.PerspectiveCamera#position | position} or {@link core/cameras/PerspectiveCamera.PerspectiveCamera#size | size} changed.
     */
    onCameraMatricesChanged() {
      super.onCameraMatricesChanged();
      this.domObjects.forEach((domObject) => {
        domObject.updateSizeAndPosition();
      });
    }
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes() {
      this.meshes.forEach((mesh) => {
        if (!("domElement" in mesh)) {
          mesh.resize(this.boundingRect);
        }
      });
      this.domObjects.forEach((domObject) => {
        if (!domObject.domElement.isResizing) {
          domObject.domElement.setSize();
        }
      });
    }
  }

  var __typeError$6 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$6 = (obj, member, msg) => member.has(obj) || __typeError$6("Cannot " + msg);
  var __privateGet$5 = (obj, member, getter) => (__accessCheck$6(obj, member, "read from private field"), member.get(obj));
  var __privateAdd$6 = (obj, member, value) => member.has(obj) ? __typeError$6("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$5 = (obj, member, value, setter) => (__accessCheck$6(obj, member, "write to private field"), member.set(obj, value), value);
  var __setScroll;
  class ScrollManager {
    /**
     * ScrollManager constructor
     * @param parameters - {@link ScrollManagerParams | parameters} used to create this {@link ScrollManager}
     */
    constructor({
      scroll = { x: 0, y: 0 },
      delta = { x: 0, y: 0 },
      shouldWatch = true,
      onScroll = (delta2 = { x: 0, y: 0 }) => {
      }
    } = {}) {
      /** @ignore */
      __privateAdd$6(this, __setScroll);
      this.scroll = scroll;
      this.delta = delta;
      this.shouldWatch = shouldWatch;
      this.onScroll = onScroll;
      __privateSet$5(this, __setScroll, this.setScroll.bind(this));
      if (this.shouldWatch) {
        window.addEventListener("scroll", __privateGet$5(this, __setScroll), { passive: true });
      }
    }
    /**
     * Called by the scroll event listener
     */
    setScroll() {
      this.updateScrollValues({ x: window.pageXOffset, y: window.pageYOffset });
    }
    /**
     * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
     * Internally called by the scroll event listener
     * Could be called externally as well if the user wants to handle the scroll by himself
     * @param parameters - {@link core/DOM/DOMElement.DOMPosition | scroll values}
     */
    updateScrollValues({ x, y }) {
      const lastScroll = this.scroll;
      this.scroll = { x, y };
      this.delta = {
        x: lastScroll.x - this.scroll.x,
        y: lastScroll.y - this.scroll.y
      };
      if (this.onScroll) {
        this.onScroll(this.delta);
      }
    }
    /**
     * Destroy our scroll manager (just remove our event listner if it had been added previously)
     */
    destroy() {
      if (this.shouldWatch) {
        window.removeEventListener("scroll", __privateGet$5(this, __setScroll), { passive: true });
      }
    }
  }
  __setScroll = new WeakMap();

  class GPUCurtains {
    /**
     * GPUCurtains constructor
     * @param parameters - {@link GPUCurtainsParams | parameters} used to create this {@link GPUCurtains}.
     */
    constructor({
      container,
      label,
      pixelRatio = window.devicePixelRatio ?? 1,
      context = {},
      production = false,
      adapterOptions = {},
      renderPass,
      camera,
      lights,
      autoRender = true,
      autoResize = true,
      watchScroll = true
    } = {}) {
      // callbacks / events
      /** function assigned to the {@link onScroll} callback. */
      this._onScrollCallback = () => {
      };
      /** function assigned to the {@link onError} callback. */
      this._onErrorCallback = () => {
      };
      /** function assigned to the {@link onContextLost} callback. */
      this._onContextLostCallback = () => {
      };
      /** function assigned to the {@link onContextLost} callback. */
      this._onContextDestroyedCallback = () => {
      };
      this.type = "CurtainsGPU";
      this.options = {
        container,
        label,
        pixelRatio,
        camera,
        lights,
        production,
        adapterOptions,
        context,
        renderPass,
        autoRender,
        autoResize,
        watchScroll
      };
      this.setDeviceManager();
      if (container) {
        this.setContainer(container);
      }
      this.initScroll();
    }
    /**
     * Set the {@link GPUCurtains.container | container}.
     * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use.
     */
    setContainer(container) {
      if (!container) {
        const container2 = document.createElement("div");
        container2.setAttribute("id", "curtains-gpu-canvas");
        document.body.appendChild(container2);
        this.options.container = container2;
      } else {
        if (typeof container === "string") {
          container = document.querySelector(container);
          if (!container) {
            const container2 = document.createElement("div");
            container2.setAttribute("id", "curtains-gpu-canvas");
            document.body.appendChild(container2);
            this.options.container = container2;
          } else {
            this.options.container = container;
          }
        } else if (container instanceof Element) {
          this.options.container = container;
        }
      }
      this.container = this.options.container;
      this.setMainRenderer();
    }
    /**
     * Set the default {@link GPUCurtainsRenderer | renderer}.
     */
    setMainRenderer() {
      this.createCurtainsRenderer({
        // TODO ...this.options?
        label: this.options.label || "GPUCurtains main GPUCurtainsRenderer",
        container: this.options.container,
        pixelRatio: this.options.pixelRatio,
        autoResize: this.options.autoResize,
        context: this.options.context,
        renderPass: this.options.renderPass,
        camera: this.options.camera,
        lights: this.options.lights
      });
    }
    /**
     * Patch the options with default values before creating a {@link Renderer}.
     * @param parameters - Parameters to patch.
     */
    patchRendererOptions(parameters) {
      if (parameters.pixelRatio === void 0) parameters.pixelRatio = this.options.pixelRatio;
      if (parameters.autoResize === void 0) parameters.autoResize = this.options.autoResize;
      return parameters;
    }
    /**
     * Create a new {@link GPURenderer} instance.
     * @param parameters - {@link GPURendererParams | parameters} to use.
     */
    createRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPURenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Create a new {@link GPUCameraRenderer} instance.
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use.
     */
    createCameraRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPUCameraRenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Create a new {@link GPUCurtainsRenderer} instance.
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use.
     */
    createCurtainsRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPUCurtainsRenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Set our {@link GPUDeviceManager}.
     */
    setDeviceManager() {
      this.deviceManager = new GPUDeviceManager({
        label: "GPUCurtains default device",
        production: this.options.production,
        adapterOptions: this.options.adapterOptions,
        autoRender: this.options.autoRender,
        onError: () => setTimeout(() => {
          this._onErrorCallback && this._onErrorCallback();
        }, 0),
        onDeviceLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info),
        onDeviceDestroyed: (info) => this._onContextDestroyedCallback && this._onContextDestroyedCallback(info)
      });
    }
    /**
     * Get all created {@link Renderer}.
     * @readonly
     */
    get renderers() {
      return this.deviceManager.renderers;
    }
    /**
     * Get the first created {@link Renderer} if any.
     * @readonly
     */
    get renderer() {
      return this.renderers[0];
    }
    /**
     * Set the {@link GPUDeviceManager} {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} if possible, then set all created {@link Renderer} contexts.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async setDevice({ adapter = null, device = null } = {}) {
      await this.deviceManager.init({ adapter, device });
    }
    /**
     * Restore the {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device}.
     */
    async restoreContext() {
      await this.deviceManager.restoreDevice();
    }
    /* RENDERER TRACKED OBJECTS */
    /**
     * Get all the created {@link PingPongPlane}.
     * @readonly
     */
    get pingPongPlanes() {
      return this.renderers?.map((renderer) => renderer.pingPongPlanes).flat();
    }
    /**
     * Get all the created {@link ShaderPass}.
     * @readonly
     */
    get shaderPasses() {
      return this.renderers?.map((renderer) => renderer.shaderPasses).flat();
    }
    /**
     * Get all the created {@link SceneStackedMesh | meshes}.
     * @readonly
     */
    get meshes() {
      return this.renderers?.map((renderer) => renderer.meshes).flat();
    }
    /**
     * Get all the created {@link DOMMesh | DOM Meshes} (including {@link Plane | planes}).
     * @readonly
     */
    get domMeshes() {
      return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domMeshes).flat();
    }
    /**
     * Get all created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll.
     * @readonly
     */
    get domObjects() {
      return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domObjects).flat();
    }
    /**
     * Get all the created {@link Plane | planes}.
     * @readonly
     */
    get planes() {
      return this.domMeshes.filter((domMesh) => domMesh instanceof Plane);
    }
    /**
     * Get all the created {@link ComputePass | compute passes}.
     * @readonly
     */
    get computePasses() {
      return this.renderers?.map((renderer) => renderer.computePasses).flat();
    }
    /**
     * Get our {@link GPUCurtainsRenderer#boundingRect | default GPUCurtainsRenderer bounding rectangle}.
     */
    get boundingRect() {
      return this.renderer?.boundingRect;
    }
    /* SCROLL */
    /**
     * Set the {@link scrollManager}.
     */
    initScroll() {
      this.scrollManager = new ScrollManager({
        // init values
        scroll: {
          x: window.pageXOffset,
          y: window.pageYOffset
        },
        delta: {
          x: 0,
          y: 0
        },
        shouldWatch: this.options.watchScroll,
        onScroll: (delta) => this.updateScroll(delta)
      });
    }
    /**
     * Update all {@link DOMMesh#updateScrollPosition | DOMMesh scroll positions}.
     * @param delta - Last {@link ScrollManager#delta | scroll delta values}.
     */
    updateScroll(delta = { x: 0, y: 0 }) {
      this.domObjects.forEach((domObject) => {
        if (domObject.domElement && domObject.watchScroll) {
          domObject.updateScrollPosition(delta);
        }
      });
      this._onScrollCallback && this._onScrollCallback();
    }
    /**
     * Update our {@link ScrollManager#scroll | scrollManager scroll values}. Called each time the scroll has changed if {@link GPUCurtains#options.watchScroll | watchScroll option} is set to true. Could be called externally as well.
     * @param scroll - New {@link DOMPosition | scroll values}.
     */
    updateScrollValues(scroll = { x: 0, y: 0 }) {
      this.scrollManager.updateScrollValues(scroll);
    }
    /**
     * Get our {@link ScrollManager#delta | scrollManager delta values}.
     * @readonly
     */
    get scrollDelta() {
      return this.scrollManager.delta;
    }
    /**
     * Get our {@link ScrollManager#scroll | scrollManager scroll values}.
     * @readonly
     */
    get scrollValues() {
      return this.scrollManager.scroll;
    }
    /* EVENTS */
    /**
     * Called each frame before rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUCurtains}.
     */
    onBeforeRender(callback) {
      this.deviceManager.onBeforeRender(callback);
      return this;
    }
    /**
     * Called each frame after rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUCurtains}.
     */
    onAfterRender(callback) {
      this.deviceManager.onAfterRender(callback);
      return this;
    }
    /**
     * Called each time the {@link ScrollManager#scroll | scrollManager scroll values} changed.
     * @param callback - callback to run each time the {@link ScrollManager#scroll | scrollManager scroll values} changed.
     * @returns - our {@link GPUCurtains}.
     */
    onScroll(callback) {
      if (callback) {
        this._onScrollCallback = callback;
      }
      return this;
    }
    /**
     * Called if there's been an error while trying to create the {@link GPUDeviceManager#device | device}.
     * @param callback - callback to run if there's been an error while trying to create the {@link GPUDeviceManager#device | device}.
     * @returns - our {@link GPUCurtains}.
     */
    onError(callback) {
      if (callback) {
        this._onErrorCallback = callback;
      }
      return this;
    }
    /**
     * Called whenever the {@link GPUDeviceManager#device | device} is lost.
     * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} is lost.
     * @returns - our {@link GPUCurtains}.
     */
    onContextLost(callback) {
      if (callback) {
        this._onContextLostCallback = callback;
      }
      return this;
    }
    /**
     * Called whenever the {@link GPUDeviceManager#device | device} has been intentionally destroyed.
     * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} has been destroyed.
     * @returns - our {@link GPUCurtains}.
     */
    onContextDestroyed(callback) {
      if (callback) {
        this._onContextDestroyedCallback = callback;
      }
      return this;
    }
    /**
     * Render our {@link GPUDeviceManager}.
     */
    render() {
      this.deviceManager.render();
    }
    /**
     * Destroy our {@link GPUCurtains} and {@link GPUDeviceManager}.
     */
    destroy() {
      this.deviceManager.destroy();
      this.scrollManager?.destroy();
    }
  }

  var __typeError$5 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$5 = (obj, member, msg) => member.has(obj) || __typeError$5("Cannot " + msg);
  var __privateGet$4 = (obj, member, getter) => (__accessCheck$5(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$5 = (obj, member, value) => member.has(obj) ? __typeError$5("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$4 = (obj, member, value, setter) => (__accessCheck$5(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$5 = (obj, member, method) => (__accessCheck$5(obj, member, "access private method"), method);
  var _element, _offset, _isOrbiting, _spherical, _rotateStart, _isPaning, _panStart, _panDelta, __onContextMenu, __onMouseDown, __onMouseMove, __onMouseUp, __onTouchStart, __onTouchMove, __onTouchEnd, __onMouseWheel, _OrbitControls_instances, setBaseParams_fn, addEvents_fn, removeEvents_fn, onMouseDown_fn, onTouchStart_fn, onMouseMove_fn, onTouchMove_fn, onMouseUp_fn, onTouchEnd_fn, onMouseWheel_fn, onContextMenu_fn, update_fn, rotate_fn, pan_fn, zoom_fn;
  const tempVec2a = new Vec2();
  const tempVec2b = new Vec2();
  const tempVec3$1 = new Vec3();
  class OrbitControls {
    /**
     * OrbitControls constructor
     * @param parameters - parameters to use.
     */
    constructor({
      camera,
      element = null,
      target = new Vec3(),
      // zoom
      enableZoom = true,
      minZoom = 0,
      maxZoom = Infinity,
      zoomSpeed = 1,
      // rotate
      enableRotate = true,
      minPolarAngle = 0,
      maxPolarAngle = Math.PI,
      minAzimuthAngle = -Infinity,
      maxAzimuthAngle = Infinity,
      rotateSpeed = 1,
      // pan
      enablePan = true,
      panSpeed = 1
    }) {
      __privateAdd$5(this, _OrbitControls_instances);
      /**
       * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
       * @private
       */
      __privateAdd$5(this, _element, null);
      /** @ignore */
      __privateAdd$5(this, _offset, new Vec3());
      /** @ignore */
      __privateAdd$5(this, _isOrbiting, false);
      /** @ignore */
      __privateAdd$5(this, _spherical, { radius: 1, phi: 0, theta: 0 });
      /** @ignore */
      __privateAdd$5(this, _rotateStart, new Vec2());
      /** @ignore */
      __privateAdd$5(this, _isPaning, false);
      /** @ignore */
      __privateAdd$5(this, _panStart, new Vec2());
      /** @ignore */
      __privateAdd$5(this, _panDelta, new Vec3());
      /** @ignore */
      __privateAdd$5(this, __onContextMenu);
      /** @ignore */
      __privateAdd$5(this, __onMouseDown);
      /** @ignore */
      __privateAdd$5(this, __onMouseMove);
      /** @ignore */
      __privateAdd$5(this, __onMouseUp);
      /** @ignore */
      __privateAdd$5(this, __onTouchStart);
      /** @ignore */
      __privateAdd$5(this, __onTouchMove);
      /** @ignore */
      __privateAdd$5(this, __onTouchEnd);
      /** @ignore */
      __privateAdd$5(this, __onMouseWheel);
      if (!camera) {
        throwWarning("OrbitControls: cannot initialize without a camera.");
        return;
      }
      __privateMethod$5(this, _OrbitControls_instances, setBaseParams_fn).call(this, {
        target,
        enableZoom,
        minZoom,
        maxZoom,
        zoomSpeed,
        enableRotate,
        minPolarAngle,
        maxPolarAngle,
        minAzimuthAngle,
        maxAzimuthAngle,
        rotateSpeed,
        enablePan,
        panSpeed
      });
      __privateSet$4(this, __onContextMenu, __privateMethod$5(this, _OrbitControls_instances, onContextMenu_fn).bind(this));
      __privateSet$4(this, __onMouseDown, __privateMethod$5(this, _OrbitControls_instances, onMouseDown_fn).bind(this));
      __privateSet$4(this, __onMouseMove, __privateMethod$5(this, _OrbitControls_instances, onMouseMove_fn).bind(this));
      __privateSet$4(this, __onMouseUp, __privateMethod$5(this, _OrbitControls_instances, onMouseUp_fn).bind(this));
      __privateSet$4(this, __onTouchStart, __privateMethod$5(this, _OrbitControls_instances, onTouchStart_fn).bind(this));
      __privateSet$4(this, __onTouchMove, __privateMethod$5(this, _OrbitControls_instances, onTouchMove_fn).bind(this));
      __privateSet$4(this, __onTouchEnd, __privateMethod$5(this, _OrbitControls_instances, onTouchEnd_fn).bind(this));
      __privateSet$4(this, __onMouseWheel, __privateMethod$5(this, _OrbitControls_instances, onMouseWheel_fn).bind(this));
      this.element = element ?? (typeof window !== "undefined" ? window : null);
      this.useCamera(camera);
    }
    /**
     * Allow to set or reset this {@link OrbitControls.camera | OrbitControls camera}.
     * @param camera - New {@link OrbitControls.camera | camera} to use.
     */
    useCamera(camera) {
      this.camera = camera;
      this.camera.lookAt(this.target);
      this.target.onChange(() => {
        __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
      });
      __privateGet$4(this, _offset).copy(this.camera.position).sub(this.target);
      __privateGet$4(this, _spherical).radius = __privateGet$4(this, _offset).length();
      __privateGet$4(this, _spherical).theta = Math.atan2(__privateGet$4(this, _offset).x, __privateGet$4(this, _offset).z);
      __privateGet$4(this, _spherical).phi = Math.acos(Math.min(Math.max(__privateGet$4(this, _offset).y / __privateGet$4(this, _spherical).radius, -1), 1));
      __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
    }
    /**
     * Reset the {@link OrbitControls} values.
     * @param parameters - Parameters used to reset the values. Those are the same as {@link OrbitControlsBaseParams} with an additional position parameter to allow to override the {@link OrbitControls} position.
     */
    reset({
      position,
      target,
      // zoom
      enableZoom = this.enableZoom,
      minZoom = this.minZoom,
      maxZoom = this.maxZoom,
      zoomSpeed = this.zoomSpeed,
      // rotate
      enableRotate = this.enableRotate,
      minPolarAngle = this.minPolarAngle,
      maxPolarAngle = this.maxPolarAngle,
      minAzimuthAngle = this.minAzimuthAngle,
      maxAzimuthAngle = this.maxAzimuthAngle,
      rotateSpeed = this.rotateSpeed,
      // pan
      enablePan = this.enablePan,
      panSpeed = this.panSpeed
    } = {}) {
      __privateMethod$5(this, _OrbitControls_instances, setBaseParams_fn).call(this, {
        target,
        enableZoom,
        minZoom,
        maxZoom,
        zoomSpeed,
        enableRotate,
        minPolarAngle,
        maxPolarAngle,
        minAzimuthAngle,
        maxAzimuthAngle,
        rotateSpeed,
        enablePan,
        panSpeed
      });
      if (position) {
        this.updatePosition(position);
      }
    }
    /**
     * Allow to override the {@link camera} position.
     * @param position - new {@link camera} position to set.
     */
    updatePosition(position = new Vec3()) {
      position.sub(this.target);
      __privateGet$4(this, _spherical).radius = position.length();
      __privateGet$4(this, _spherical).theta = Math.atan2(position.x, position.z);
      __privateGet$4(this, _spherical).phi = Math.acos(Math.min(Math.max(position.y / __privateGet$4(this, _spherical).radius, -1), 1));
      __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
    }
    /**
     * Set the element to use for event listeners. Can remove previous event listeners first if needed.
     * @param value - {@link HTMLElement} (or {@link Window} element) to use.
     */
    set element(value) {
      if (__privateGet$4(this, _element) && (!value || __privateGet$4(this, _element) !== value)) {
        __privateMethod$5(this, _OrbitControls_instances, removeEvents_fn).call(this);
      }
      __privateSet$4(this, _element, value);
      if (value) {
        __privateMethod$5(this, _OrbitControls_instances, addEvents_fn).call(this);
      }
    }
    /**
     * Get our element to use for event listeners.
     * @returns - {@link HTMLElement} (or {@link Window} element) used.
     */
    get element() {
      return __privateGet$4(this, _element);
    }
    /**
     * Destroy the {@link OrbitControls}.
     */
    destroy() {
      this.element = null;
    }
  }
  _element = new WeakMap();
  _offset = new WeakMap();
  _isOrbiting = new WeakMap();
  _spherical = new WeakMap();
  _rotateStart = new WeakMap();
  _isPaning = new WeakMap();
  _panStart = new WeakMap();
  _panDelta = new WeakMap();
  __onContextMenu = new WeakMap();
  __onMouseDown = new WeakMap();
  __onMouseMove = new WeakMap();
  __onMouseUp = new WeakMap();
  __onTouchStart = new WeakMap();
  __onTouchMove = new WeakMap();
  __onTouchEnd = new WeakMap();
  __onMouseWheel = new WeakMap();
  _OrbitControls_instances = new WeakSet();
  /**
   * Set / reset base params
   * @ignore
   */
  setBaseParams_fn = function({
    target,
    // zoom
    enableZoom = this.enableZoom,
    minZoom = this.minZoom,
    maxZoom = this.maxZoom,
    zoomSpeed = this.zoomSpeed,
    // rotate
    enableRotate = this.enableRotate,
    minPolarAngle = this.minPolarAngle,
    maxPolarAngle = this.maxPolarAngle,
    minAzimuthAngle = this.minAzimuthAngle,
    maxAzimuthAngle = this.maxAzimuthAngle,
    rotateSpeed = this.rotateSpeed,
    // pan
    enablePan = this.enablePan,
    panSpeed = this.panSpeed
  } = {}) {
    if (target) {
      this.target = target;
    }
    this.enableZoom = enableZoom;
    this.minZoom = minZoom;
    this.maxZoom = maxZoom;
    this.zoomSpeed = zoomSpeed;
    this.enableRotate = enableRotate;
    this.minPolarAngle = minPolarAngle;
    this.maxPolarAngle = maxPolarAngle;
    this.minAzimuthAngle = minAzimuthAngle;
    this.maxAzimuthAngle = maxAzimuthAngle;
    this.rotateSpeed = rotateSpeed;
    this.enablePan = enablePan;
    this.panSpeed = panSpeed;
  };
  /**
   * Add the event listeners.
   * @private
   */
  addEvents_fn = function() {
    __privateGet$4(this, _element).addEventListener("contextmenu", __privateGet$4(this, __onContextMenu), false);
    __privateGet$4(this, _element).addEventListener("mousedown", __privateGet$4(this, __onMouseDown), false);
    __privateGet$4(this, _element).addEventListener("mousemove", __privateGet$4(this, __onMouseMove), false);
    __privateGet$4(this, _element).addEventListener("mouseup", __privateGet$4(this, __onMouseUp), false);
    __privateGet$4(this, _element).addEventListener("touchstart", __privateGet$4(this, __onTouchStart), { passive: false });
    __privateGet$4(this, _element).addEventListener("touchmove", __privateGet$4(this, __onTouchMove), { passive: false });
    __privateGet$4(this, _element).addEventListener("touchend", __privateGet$4(this, __onTouchEnd), false);
    __privateGet$4(this, _element).addEventListener("wheel", __privateGet$4(this, __onMouseWheel), { passive: false });
  };
  /**
   * Remove the event listeners.
   * @private
   */
  removeEvents_fn = function() {
    __privateGet$4(this, _element).removeEventListener("contextmenu", __privateGet$4(this, __onContextMenu), false);
    __privateGet$4(this, _element).removeEventListener("mousedown", __privateGet$4(this, __onMouseDown), false);
    __privateGet$4(this, _element).removeEventListener("mousemove", __privateGet$4(this, __onMouseMove), false);
    __privateGet$4(this, _element).removeEventListener("mouseup", __privateGet$4(this, __onMouseUp), false);
    __privateGet$4(this, _element).removeEventListener("touchstart", __privateGet$4(this, __onTouchStart), { passive: false });
    __privateGet$4(this, _element).removeEventListener("touchmove", __privateGet$4(this, __onTouchMove), { passive: false });
    __privateGet$4(this, _element).removeEventListener("touchend", __privateGet$4(this, __onTouchEnd), false);
    __privateGet$4(this, _element).removeEventListener("wheel", __privateGet$4(this, __onMouseWheel), { passive: false });
  };
  /**
   * Callback executed on mouse down event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  onMouseDown_fn = function(e) {
    if (e.button === 0 && this.enableRotate) {
      __privateSet$4(this, _isOrbiting, true);
      __privateGet$4(this, _rotateStart).set(e.clientX, e.clientY);
    } else if (e.button === 2 && this.enablePan) {
      __privateSet$4(this, _isPaning, true);
      __privateGet$4(this, _panStart).set(e.clientX, e.clientY);
    }
    e.stopPropagation();
    e.preventDefault();
  };
  /**
   * Callback executed on touch start event.
   * @param e - {@link TouchEvent}.
   * @private
   */
  onTouchStart_fn = function(e) {
    if (e.touches.length === 1 && this.enableRotate) {
      __privateSet$4(this, _isOrbiting, true);
      __privateGet$4(this, _rotateStart).set(e.touches[0].pageX, e.touches[0].pageY);
    }
  };
  /**
   * Callback executed on mouse move event.
   * @param e - {@link MouseEvent}.
   */
  onMouseMove_fn = function(e) {
    if (__privateGet$4(this, _isOrbiting) && this.enableRotate) {
      __privateMethod$5(this, _OrbitControls_instances, rotate_fn).call(this, e.clientX, e.clientY);
    } else if (__privateGet$4(this, _isPaning) && this.enablePan) {
      __privateMethod$5(this, _OrbitControls_instances, pan_fn).call(this, e.clientX, e.clientY);
    }
  };
  /**
   * Callback executed on touch move event.
   * @param e - {@link TouchEvent}.
   * @private
   */
  onTouchMove_fn = function(e) {
    if (__privateGet$4(this, _isOrbiting) && this.enableRotate) {
      __privateMethod$5(this, _OrbitControls_instances, rotate_fn).call(this, e.touches[0].pageX, e.touches[0].pageY);
    }
  };
  /**
   * Callback executed on mouse up event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  onMouseUp_fn = function(e) {
    __privateSet$4(this, _isOrbiting, false);
    __privateSet$4(this, _isPaning, false);
  };
  /**
   * Callback executed on touch end event.
   * @param e - {@link MouseEvent}.
   * @private
   */
  onTouchEnd_fn = function(e) {
    __privateSet$4(this, _isOrbiting, false);
    __privateSet$4(this, _isPaning, false);
  };
  /**
   * Callback executed on wheel event.
   * @param e - {@link WheelEvent}.
   * @private
   */
  onMouseWheel_fn = function(e) {
    if (this.enableZoom) {
      __privateMethod$5(this, _OrbitControls_instances, zoom_fn).call(this, e.deltaY);
      e.preventDefault();
    }
  };
  /**
   * Prevent context menu apparition on right click
   * @param e - {@link MouseEvent}.
   * @private
   */
  onContextMenu_fn = function(e) {
    e.preventDefault();
  };
  /**
   * Update the {@link camera} position based on the {@link target} and internal values.
   * @private
   */
  update_fn = function() {
    const sinPhiRadius = __privateGet$4(this, _spherical).radius * Math.sin(Math.max(1e-6, __privateGet$4(this, _spherical).phi));
    __privateGet$4(this, _offset).x = sinPhiRadius * Math.sin(__privateGet$4(this, _spherical).theta);
    __privateGet$4(this, _offset).y = __privateGet$4(this, _spherical).radius * Math.cos(__privateGet$4(this, _spherical).phi);
    __privateGet$4(this, _offset).z = sinPhiRadius * Math.cos(__privateGet$4(this, _spherical).theta);
    this.camera.position.copy(this.target).add(__privateGet$4(this, _offset));
    this.camera.lookAt(this.target);
  };
  /**
   * Update the {@link camera} position based on input coordinates so it rotates around the {@link target}.
   * @param x - input coordinate along the X axis.
   * @param y - input coordinate along the Y axis.
   * @private
   */
  rotate_fn = function(x, y) {
    tempVec2a.set(x, y);
    tempVec2b.copy(tempVec2a).sub(__privateGet$4(this, _rotateStart)).multiplyScalar(this.rotateSpeed);
    if (this.camera instanceof PerspectiveCamera) {
      __privateGet$4(this, _spherical).theta -= 2 * Math.PI * tempVec2b.x / this.camera.size.height;
      __privateGet$4(this, _spherical).phi -= 2 * Math.PI * tempVec2b.y / this.camera.size.height;
    } else if (this.camera instanceof OrthographicCamera) {
      const height = (this.camera.top - this.camera.bottom) * 2;
      tempVec2b.multiplyScalar(1 / height);
      __privateGet$4(this, _spherical).theta -= 2 * Math.PI * tempVec2b.x / height;
      __privateGet$4(this, _spherical).phi -= 2 * Math.PI * tempVec2b.y / height;
    }
    __privateGet$4(this, _spherical).theta = Math.min(this.maxAzimuthAngle, Math.max(this.minAzimuthAngle, __privateGet$4(this, _spherical).theta));
    __privateGet$4(this, _spherical).phi = Math.min(this.maxPolarAngle, Math.max(this.minPolarAngle, __privateGet$4(this, _spherical).phi));
    __privateGet$4(this, _rotateStart).copy(tempVec2a);
    __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
  };
  /**
   * Pan the {@link camera} position based on input coordinates by updating {@link target}.
   * @param x - input coordinate along the X axis.
   * @param y - input coordinate along the Y axis.
   * @private
   */
  pan_fn = function(x, y) {
    tempVec2a.set(x, y);
    tempVec2b.copy(tempVec2a).sub(__privateGet$4(this, _panStart)).multiplyScalar(this.panSpeed);
    __privateGet$4(this, _panDelta).set(0);
    tempVec3$1.copy(this.camera.position).sub(this.target);
    let targetDistance = tempVec3$1.length();
    tempVec3$1.set(
      this.camera.modelMatrix.elements[0],
      this.camera.modelMatrix.elements[1],
      this.camera.modelMatrix.elements[2]
    );
    if (this.camera instanceof PerspectiveCamera) {
      targetDistance *= Math.tan(this.camera.fov / 2 * Math.PI / 180);
      tempVec3$1.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / this.camera.size.height);
    } else if (this.camera instanceof OrthographicCamera) {
      targetDistance *= 1 / ((this.camera.top - this.camera.bottom) * 2);
      tempVec3$1.multiplyScalar(-(2 * tempVec2b.x * targetDistance) / ((this.camera.right - this.camera.left) * 2));
    }
    __privateGet$4(this, _panDelta).add(tempVec3$1);
    tempVec3$1.set(
      this.camera.modelMatrix.elements[4],
      this.camera.modelMatrix.elements[5],
      this.camera.modelMatrix.elements[6]
    );
    if (this.camera instanceof PerspectiveCamera) {
      tempVec3$1.multiplyScalar(2 * tempVec2b.y * targetDistance / this.camera.size.height);
    } else if (this.camera instanceof OrthographicCamera) {
      tempVec3$1.multiplyScalar(2 * tempVec2b.y * targetDistance / ((this.camera.top - this.camera.bottom) * 2));
    }
    __privateGet$4(this, _panDelta).add(tempVec3$1);
    __privateGet$4(this, _panStart).copy(tempVec2a);
    this.target.add(__privateGet$4(this, _panDelta));
    __privateGet$4(this, _offset).copy(this.camera.position).sub(this.target);
    __privateGet$4(this, _spherical).radius = __privateGet$4(this, _offset).length();
    __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
  };
  /**
   * Move the {@link camera} forward or backward.
   * @param value - new value to use for zoom.
   * @private
   */
  zoom_fn = function(value) {
    __privateGet$4(this, _spherical).radius = Math.min(
      this.maxZoom,
      Math.max(this.minZoom + 1e-6, __privateGet$4(this, _spherical).radius + value * this.zoomSpeed / 100)
    );
    __privateMethod$5(this, _OrbitControls_instances, update_fn).call(this);
  };

  var __typeError$4 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$4 = (obj, member, msg) => member.has(obj) || __typeError$4("Cannot " + msg);
  var __privateAdd$4 = (obj, member, value) => member.has(obj) ? __typeError$4("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateMethod$4 = (obj, member, method) => (__accessCheck$4(obj, member, "access private method"), method);
  var _HDRLoader_instances, decodeRGBE_fn, parseHeader_fn, parseSize_fn, readLine_fn, parseData_fn, parseNewRLE_fn, swap_fn, flipX_fn, flipY_fn;
  class HDRLoader {
    constructor() {
      __privateAdd$4(this, _HDRLoader_instances);
    }
    /**
     * Load and decode RGBE-encoded data to a flat list of floating point pixel data (RGBA).
     * @param url - The url of the .hdr file to load.
     * @returns - The {@link HDRImageData}.
     */
    async loadFromUrl(url) {
      const buffer = await (await fetch(url)).arrayBuffer();
      return __privateMethod$4(this, _HDRLoader_instances, decodeRGBE_fn).call(this, new DataView(buffer));
    }
  }
  _HDRLoader_instances = new WeakSet();
  /**
   * @ignore
   */
  decodeRGBE_fn = function(data) {
    const stream = {
      data,
      offset: 0
    };
    const header = __privateMethod$4(this, _HDRLoader_instances, parseHeader_fn).call(this, stream);
    return {
      width: header.width,
      height: header.height,
      exposure: header.exposure,
      gamma: header.gamma,
      data: __privateMethod$4(this, _HDRLoader_instances, parseData_fn).call(this, stream, header)
    };
  };
  /**
   * @ignore
   */
  parseHeader_fn = function(stream) {
    let line = __privateMethod$4(this, _HDRLoader_instances, readLine_fn).call(this, stream);
    const header = {
      colorCorr: [1, 1, 1],
      exposure: 1,
      gamma: 1,
      width: 0,
      height: 0,
      flipX: false,
      flipY: false
    };
    if (line !== "#?RADIANCE" && line !== "#?RGBE") throw new Error("Incorrect file format!");
    while (line !== "") {
      line = __privateMethod$4(this, _HDRLoader_instances, readLine_fn).call(this, stream);
      const parts2 = line.split("=");
      switch (parts2[0]) {
        case "GAMMA":
          header.gamma = parseFloat(parts2[1]);
          break;
        case "FORMAT":
          if (parts2[1] !== "32-bit_rle_rgbe" && parts2[1] !== "32-bit_rle_xyze")
            throw new Error("Incorrect encoding format!");
          break;
        case "EXPOSURE":
          header.exposure = parseFloat(parts2[1]);
          break;
        case "COLORCORR":
          header.colorCorr = parts2[1].replace(/^\s+|\s+$/g, "").split(" ").map((m) => parseFloat(m));
          break;
      }
    }
    line = __privateMethod$4(this, _HDRLoader_instances, readLine_fn).call(this, stream);
    const parts = line.split(" ");
    __privateMethod$4(this, _HDRLoader_instances, parseSize_fn).call(this, parts[0], parseInt(parts[1]), header);
    __privateMethod$4(this, _HDRLoader_instances, parseSize_fn).call(this, parts[2], parseInt(parts[3]), header);
    return header;
  };
  /**
   * @ignore
   */
  parseSize_fn = function(label, value, header) {
    switch (label) {
      case "+X":
        header.width = value;
        break;
      case "-X":
        header.width = value;
        header.flipX = true;
        console.warn("Flipping horizontal orientation not currently supported");
        break;
      case "-Y":
        header.height = value;
        header.flipY = true;
        break;
      case "+Y":
        header.height = value;
        break;
    }
  };
  /**
   * @ignore
   */
  readLine_fn = function(stream) {
    let ch, str = "";
    while ((ch = stream.data.getUint8(stream.offset++)) !== 10) str += String.fromCharCode(ch);
    return str;
  };
  /**
   * @ignore
   */
  parseData_fn = function(stream, header) {
    const hash = stream.data.getUint16(stream.offset);
    let data;
    if (hash === 514) {
      data = __privateMethod$4(this, _HDRLoader_instances, parseNewRLE_fn).call(this, stream, header);
      if (header.flipX) __privateMethod$4(this, _HDRLoader_instances, flipX_fn).call(this, data, header);
      if (header.flipY) __privateMethod$4(this, _HDRLoader_instances, flipY_fn).call(this, data, header);
    } else {
      throw new Error("Obsolete HDR file version!");
    }
    return data;
  };
  /**
   * @ignore
   */
  parseNewRLE_fn = function(stream, header) {
    const { width, height, colorCorr } = header;
    const tgt = new Float32Array(width * height * 4);
    let i = 0;
    let { offset, data } = stream;
    for (let y = 0; y < height; ++y) {
      if (data.getUint16(offset) !== 514) throw new Error("Incorrect scanline start hash");
      if (data.getUint16(offset + 2) !== width) throw new Error("Scanline doesn't match picture dimension!");
      offset += 4;
      const numComps = width * 4;
      const comps = [];
      let x = 0;
      while (x < numComps) {
        let value = data.getUint8(offset++);
        if (value > 128) {
          const len = value - 128;
          value = data.getUint8(offset++);
          for (let rle = 0; rle < len; ++rle) {
            comps[x++] = value;
          }
        } else {
          for (let n = 0; n < value; ++n) {
            comps[x++] = data.getUint8(offset++);
          }
        }
      }
      for (x = 0; x < width; ++x) {
        const r = comps[x];
        const g = comps[x + width];
        const b = comps[x + width * 2];
        let e = comps[x + width * 3];
        e = e ? Math.pow(2, e - 136) : 0;
        tgt[i++] = r * e * colorCorr[0];
        tgt[i++] = g * e * colorCorr[1];
        tgt[i++] = b * e * colorCorr[2];
        tgt[i++] = e;
      }
    }
    return tgt;
  };
  /**
   * @ignore
   */
  swap_fn = function(data, i1, i2) {
    i1 *= 4;
    i2 *= 4;
    for (let i = 0; i < 4; ++i) {
      const tmp = data[i1 + i];
      data[i1 + i] = data[i2 + i];
      data[i2 + i] = tmp;
    }
  };
  /**
   * @ignore
   */
  flipX_fn = function(data, header) {
    const { width, height } = header;
    const hw = width >> 1;
    for (let y = 0; y < height; ++y) {
      const b = y * width;
      for (let x = 0; x < hw; ++x) {
        const i1 = b + x;
        const i2 = b + width - 1 - x;
        __privateMethod$4(this, _HDRLoader_instances, swap_fn).call(this, data, i1, i2);
      }
    }
  };
  /**
   * @ignore
   */
  flipY_fn = function(data, header) {
    const { width, height } = header;
    const hh = height >> 1;
    for (let y = 0; y < hh; ++y) {
      const b1 = y * width;
      const b2 = (height - 1 - y) * width;
      for (let x = 0; x < width; ++x) {
        __privateMethod$4(this, _HDRLoader_instances, swap_fn).call(this, data, b1 + x, b2 + x);
      }
    }
  };

  const hammersley2D = (
    /* wgsl */
    `
fn radicalInverse_VdC(inputBits: u32) -> f32 {
  var bits: u32 = inputBits;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return f32(bits) * 2.3283064365386963e-10; // / 0x100000000
}

// hammersley2d describes a sequence of points in the 2d unit square [0,1)^2
// that can be used for quasi Monte Carlo integration
fn hammersley2d(i: u32, N: u32) -> vec2f {
  return vec2(f32(i) / f32(N), radicalInverse_VdC(i));
}
`
  );

  const generateTBN = (
    /* wgsl */
    `
// TBN generates a tangent bitangent normal coordinate frame from the normal
// (the normal must be normalized)
fn generateTBN(normal: vec3f) -> mat3x3f {
  var bitangent: vec3f = vec3(0.0, 1.0, 0.0);

  let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
  
  if (1.0 - abs(NdotUp) <= EPSILON) {
    // Sampling +Y or -Y, so we need a more robust bitangent.
    if (NdotUp > 0.0) {
      bitangent = vec3(0.0, 0.0, 1.0);
    }
    else {
      bitangent = vec3(0.0, 0.0, -1.0);
    }
  }

  let tangent: vec3f = normalize(cross(bitangent, normal));
  bitangent = cross(normal, tangent);

  return mat3x3f(tangent, bitangent, normal);
}
`
  );

  const computeBRDFLUT = (
    /* wgsl */
    `
${constants}
${common}
${hammersley2D}
${generateTBN}
${BRDF_GGX}

// GGX microfacet distribution
struct MicrofacetDistributionSample {
  pdf: f32,
  cosTheta: f32,
  sinTheta: f32,
  phi: f32
};

// https://www.cs.cornell.edu/~srm/publications/EGSR07-btdf.html
// This implementation is based on https://bruop.github.io/ibl/,
//  https://www.tobias-franke.eu/log/2014/03/30/notes_on_importance_sampling.html
// and https://developer.nvidia.com/gpugems/GPUGems3/gpugems3_ch20.html
fn GGX(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
  var ggx: MicrofacetDistributionSample;

  // evaluate sampling equations
  let alpha: f32 = roughness * roughness;
  ggx.cosTheta = clamp(sqrt((1.0 - xi.y) / (1.0 + (alpha * alpha - 1.0) * xi.y)), 0.0, 1.0);
  ggx.sinTheta = sqrt(1.0 - ggx.cosTheta * ggx.cosTheta);
  ggx.phi = 2.0 * PI * xi.x;

  // evaluate GGX pdf (for half vector)
  ggx.pdf = DistributionGGX(ggx.cosTheta, alpha);

  // Apply the Jacobian to obtain a pdf that is parameterized by l
  // see https://bruop.github.io/ibl/
  // Typically you'd have the following:
  // float pdf = DistributionGGX(NoH, roughness) * NoH / (4.0 * VoH);
  // but since V = N => VoH == NoH
  ggx.pdf /= 4.0;

  return ggx;
}

fn Lambertian(xi: vec2f, roughness: f32) -> MicrofacetDistributionSample {
    var lambertian: MicrofacetDistributionSample;

  // Cosine weighted hemisphere sampling
  // http://www.pbr-book.org/3ed-2018/Monte_Carlo_Integration/2D_Sampling_with_Multidimensional_Transformations.html#Cosine-WeightedHemisphereSampling
  lambertian.cosTheta = sqrt(1.0 - xi.y);
  lambertian.sinTheta = sqrt(xi.y); // equivalent to \`sqrt(1.0 - cosTheta*cosTheta)\`;
  lambertian.phi = 2.0 * PI * xi.x;

  lambertian.pdf = lambertian.cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

  return lambertian;
}

// getImportanceSample returns an importance sample direction with pdf in the .w component
fn getImportanceSample(Xi: vec2<f32>, N: vec3f, roughness: f32) -> vec4f {
  var importanceSample: MicrofacetDistributionSample;
  
  importanceSample = GGX(Xi, roughness);
  
   // transform the hemisphere sample to the normal coordinate frame
  // i.e. rotate the hemisphere to the normal direction
  let localSpaceDirection: vec3f = normalize(vec3(
    importanceSample.sinTheta * cos(importanceSample.phi), 
    importanceSample.sinTheta * sin(importanceSample.phi), 
    importanceSample.cosTheta
  ));
  
  let TBN: mat3x3f = generateTBN(N);
  let direction: vec3f = TBN * localSpaceDirection;

  return vec4(direction, importanceSample.pdf);
}

@compute @workgroup_size(16, 16, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {  
  let texelSize: vec2<u32> = textureDimensions(lutStorageTexture);

  let x: u32 = global_id.x;
  let y: u32 = global_id.y;

  // Check bounds
  if (x >= texelSize.x || y >= texelSize.y) {
     return;
  }
  
  let epsilon: f32 = 1e-6;

  // Compute roughness and N\xB7V from texture coordinates
  let NdotV: f32 = max(f32(x) / f32(texelSize.x - 1), epsilon);    // Maps x-axis to N\xB7V (0.0 to 1.0)
  let roughness: f32 = max(f32(y) / f32(texelSize.y - 1), epsilon);  // Maps y-axis to roughness (0.0 to 1.0)

  // Calculate view vector and normal vector
  let V: vec3<f32> = vec3<f32>(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);  // Normalized view vector
  let N: vec3<f32> = vec3<f32>(0.0, 0.0, 1.0);                          // Normal is along z-axis

  // Initialize integration variables
  var A: f32 = 0.0;
  var B: f32 = 0.0;
  var C: f32 = 0.0;

  // Monte Carlo integration to calculate A and B factors
  let sampleCount: u32 = params.sampleCount;
  for (var i: u32 = 0; i < sampleCount; i++) {
    let Xi: vec2<f32> = hammersley2d(i, sampleCount);  // Importance sampling (Hammersley sequence)
    
    //let H: vec3<f32> = importanceSampleGGX(Xi, N, roughness);
    let importanceSample: vec4f = getImportanceSample(Xi, N, roughness);
    let H: vec3f = importanceSample.xyz;
    // let pdf: f32 = importanceSample.w;
    
    let L: vec3<f32> = normalize(reflect(-V, H));
    
    let NdotL: f32 = clamp(L.z, 0.0, 1.0);
    let NdotH: f32 = clamp(H.z, 0.0, 1.0);
    let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);

    // Ensure valid light direction
    if (NdotL > 0.0) {     
      // LUT for GGX distribution.

      // Taken from: https://bruop.github.io/ibl
      // Shadertoy: https://www.shadertoy.com/view/3lXXDB
      // Terms besides V are from the GGX PDF we're dividing by.
      let V_pdf: f32 = GeometrySmith(NdotV, NdotL, roughness) * VdotH * NdotL / max(NdotH, epsilon);
      let Fc: f32 = pow(1.0 - VdotH, 5.0);
      A += (1.0 - Fc) * V_pdf;
      B += Fc * V_pdf;
      C += 0.0;
    }
  }

  // Average the integration result
  // The PDF is simply pdf(v, h) -> NDF * <nh>.
  // To parametrize the PDF over l, use the Jacobian transform, yielding to: pdf(v, l) -> NDF * <nh> / 4<vh>
  // Since the BRDF divide through the PDF to be normalized, the 4 can be pulled out of the integral.
  A = A * 4.0 / f32(sampleCount);
  B = B * 4.0 / f32(sampleCount);
  C = C * 4.0 * 2.0 * PI / f32(sampleCount);
    
  // Store the result in the LUT texture
  textureStore(lutStorageTexture, vec2<u32>(x, y), vec4<f32>(A, B, C, 1.0));
}
`
  );

  const computeSpecularCubemapFromHDR = (
    /* wgsl */
    `
${constants}

// Cube face lookup vectors
// positive and negative Y need to be inverted
const faceVectors = array<array<vec3<f32>, 2>, 6>(
  array<vec3<f32>, 2>(vec3<f32>(1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // +X
  array<vec3<f32>, 2>(vec3<f32>(-1.0, 0.0, 0.0), vec3<f32>(0.0, 1.0, 0.0)), // -X
  array<vec3<f32>, 2>(vec3<f32>(0.0, -1.0, 0.0), vec3<f32>(0.0, 0.0, 1.0)),  // -Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, 1.0, 0.0), vec3<f32>(0.0, 0.0, -1.0)), // +Y
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, 1.0), vec3<f32>(0.0, 1.0, 0.0)), // +Z
  array<vec3<f32>, 2>(vec3<f32>(0.0, 0.0, -1.0), vec3<f32>(0.0, 1.0, 0.0)) // -Z
);

// Utility to calculate 3D direction for a given cube face pixel
fn texelDirection(faceIndex : u32, u : f32, v : f32) -> vec3<f32> {
  let forward = faceVectors[faceIndex][0];
  let up = faceVectors[faceIndex][1];
  let right = normalize(cross(up, forward));
  return normalize(forward + (2.0 * u - 1.0) * right + (2.0 * v - 1.0) * up);
}

// Map 3D direction to equirectangular coordinates
fn dirToEquirect(dir : vec3<f32>) -> vec2<f32> {
  let phi = atan2(dir.z, dir.x);
  let theta = asin(dir.y);
  let u = 0.5 + 0.5 * phi / PI;
  let v = 0.5 - theta / PI;
  return vec2<f32>(u, v);
}

@compute @workgroup_size(8, 8, 1)
fn main(@builtin(global_invocation_id) global_id : vec3<u32>) {
  let faceSize = params.faceSize;
  let cubeFaceIndex = global_id.z;
  let x = global_id.x;
  let y = global_id.y;

  if (x >= faceSize || y >= faceSize || cubeFaceIndex >= 6u) {
    return;
  }

  let u = f32(x) / f32(faceSize);
  let v = f32(y) / f32(faceSize);

  // Get the 3D direction for this cube face texel
  let dir = texelDirection(cubeFaceIndex, u, v);

  // Map to equirectangular coordinates
  let uv = dirToEquirect(dir);        
  
  let hdrWidth = params.imageSize.x;
  let hdrHeight = params.imageSize.y;

  let texX = u32(clamp(uv.x * hdrWidth, 0.0, hdrWidth - 1.0));
  let texY = u32(clamp(uv.y * hdrHeight, 0.0, hdrHeight - 1.0));

  let hdrTexelIndex = texY * u32(hdrWidth) + texX;
  
  // Sample the equirectangular texture
  let sampledColor = params.hdrImageData[hdrTexelIndex];
  
  // Correct cube face order in texture store (fix for reversed face indices)
  textureStore(
    specularStorageCubemap,
    vec2<u32>(x, y),
    cubeFaceIndex,
    sampledColor
  );
}
`
  );

  const computeDiffuseFromSpecularCubemap = (specularTexture) => (
    /* wgsl */
    `
${constants}
${hammersley2D}
${generateTBN}

// Mipmap Filtered Samples (GPU Gems 3, 20.4)
// https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
// https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
fn computeLod(pdf: f32) -> f32 {
  // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
  return 0.5 * log2( 6.0 * f32(params.faceSize) * f32(params.faceSize) / (f32(params.sampleCount) * pdf));
}

fn transformDirection(face: u32, uv: vec2f) -> vec3f {
  // Transform the direction based on the cubemap face
  switch (face) {
    case 0u {
      // +X
      return vec3f( 1.0,  uv.y, -uv.x);
    }
    case 1u {
      // -X
      return vec3f(-1.0,  uv.y,  uv.x);
    }
    case 2u {
      // +Y
      return vec3f( uv.x,  -1.0, uv.y);
    }
    case 3u {
      // -Y
      return vec3f( uv.x, 1.0,  -uv.y);
    }
    case 4u {
      // +Z
      return vec3f( uv.x,  uv.y,  1.0);
    }
    case 5u {
      // -Z
      return vec3f(-uv.x,  uv.y, -1.0);
    }
    default {
      return vec3f(0.0, 0.0, 0.0);
    }
  }
}

@compute @workgroup_size(8, 8, 1) fn main(
  @builtin(global_invocation_id) GlobalInvocationID: vec3u,
) {
  let faceSize: u32 = params.faceSize;
  let sampleCount: u32 = params.sampleCount;
  
  let face: u32 = GlobalInvocationID.z;
  let x: u32 = GlobalInvocationID.x;
  let y: u32 = GlobalInvocationID.y;

  if (x >= faceSize || y >= faceSize) {
    return;
  }

  let texelSize: f32 = 1.0 / f32(faceSize);
  let halfTexel: f32 = texelSize * 0.5;
  
  var uv: vec2f = vec2(
    (f32(x) + halfTexel) * texelSize,
    (f32(y) + halfTexel) * texelSize
  );
  
  uv = uv * 2.0 - 1.0;

  let normal: vec3<f32> = transformDirection(face, uv);
  
  var irradiance: vec3f = vec3f(0.0, 0.0, 0.0);

  for (var i: u32 = 0; i < sampleCount; i++) {
    // generate a quasi monte carlo point in the unit square [0.1)^2
    let xi: vec2f = hammersley2d(i, sampleCount);
    
    let cosTheta: f32 = sqrt(1.0 - xi.y);
    let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
    let phi: f32 = 2.0 * PI * xi.x;
    let pdf: f32 = cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

    let sampleVec: vec3f = vec3f(
      sinTheta * cos(phi),
      sinTheta * sin(phi),
      cosTheta
    );
    
    let TBN: mat3x3f = generateTBN(normalize(normal));
    
    var direction: vec3f = TBN * sampleVec;
    
    // invert along Y axis
    direction.y *= -1.0;
    
    let lod: f32 = computeLod(pdf);
    
    let sampleLevel = min(lod, f32(params.maxMipLevel));

    // Convert sampleVec to texture coordinates of the specular env map
    irradiance += textureSampleLevel(
      ${specularTexture.options.name},
      clampSampler,
      direction,
      sampleLevel
    ).rgb;
  }

  irradiance /= f32(sampleCount);

  textureStore(diffuseEnvMap, vec2(x, y), face, vec4f(irradiance, 1.0));
}
`
  );

  var __typeError$3 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$3 = (obj, member, msg) => member.has(obj) || __typeError$3("Cannot " + msg);
  var __privateGet$3 = (obj, member, getter) => (__accessCheck$3(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$3 = (obj, member, value) => member.has(obj) ? __typeError$3("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$3 = (obj, member, value, setter) => (__accessCheck$3(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$3 = (obj, member, method) => (__accessCheck$3(obj, member, "access private method"), method);
  var _hdrData, _lutStorageTexture, _EnvironmentMap_instances, runComputePass_fn;
  class EnvironmentMap {
    /**
     * {@link EnvironmentMap} constructor.
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link EnvironmentMap}.
     * @param params - {@link EnvironmentMapParams | parameters} use to create this {@link EnvironmentMap}. Defines the various textures options.
     */
    constructor(renderer, params = {}) {
      __privateAdd$3(this, _EnvironmentMap_instances);
      /** Parsed {@link HDRImageData} from the {@link HDRLoader} if any. */
      __privateAdd$3(this, _hdrData);
      /** BRDF GGX LUT storage {@link Texture} used in the compute shader. */
      __privateAdd$3(this, _lutStorageTexture);
      // callbacks / events
      /** function assigned to the {@link onRotationAxisChanged} callback */
      this._onRotationAxisChangedCallback = () => {
      };
      this.uuid = generateUUID();
      this.setRenderer(renderer);
      params = {
        ...{
          lutTextureParams: {
            size: 256,
            computeSampleCount: 1024,
            label: "Environment LUT texture",
            name: "lutTexture",
            format: "rgba16float"
          },
          diffuseTextureParams: {
            size: 128,
            computeSampleCount: 2048,
            label: "Environment diffuse texture",
            name: "envDiffuseTexture",
            format: "rgba16float"
          },
          specularTextureParams: {
            label: "Environment specular texture",
            name: "envSpecularTexture",
            format: "rgba16float",
            generateMips: true
          },
          diffuseIntensity: 1,
          specularIntensity: 1,
          rotation: Math.PI / 2
        },
        ...params
      };
      this.options = params;
      this.sampler = new Sampler(this.renderer, {
        label: "Clamp sampler",
        name: "clampSampler",
        magFilter: "linear",
        minFilter: "linear",
        mipmapFilter: "linear",
        addressModeU: "clamp-to-edge",
        addressModeV: "clamp-to-edge"
      });
      this.rotationMatrix = new Mat3().rotateByAngleY(-Math.PI / 2);
      this.hdrLoader = new HDRLoader();
      this.createLUTTextures();
      this.createSpecularDiffuseTextures();
      this.computeBRDFLUTTexture();
    }
    /**
     * Set or reset this {@link EnvironmentMap} {@link EnvironmentMap.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.environmentMaps.delete(this.uuid);
      }
      renderer = isRenderer(renderer, "EnvironmentMap");
      this.renderer = renderer;
      this.renderer.environmentMaps.set(this.uuid, this);
    }
    /**
     * Get the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
     */
    get rotation() {
      return this.options.rotation;
    }
    /**
     * Set the current {@link EnvironmentMapOptions.rotation | rotation}, in radians.
     * @param value - New {@link EnvironmentMapOptions.rotation | rotation} to use, in radians.
     */
    set rotation(value) {
      if (value !== this.options.rotation) {
        this.options.rotation = value;
        this.rotationMatrix.rotateByAngleY(-value);
        this._onRotationAxisChangedCallback && this._onRotationAxisChangedCallback();
      }
    }
    /**
     * Callback to call whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
     * @param callback - Called whenever the {@link EnvironmentMapOptions.rotation | rotation} changed.
     */
    onRotationAxisChanged(callback) {
      if (callback) {
        this._onRotationAxisChangedCallback = callback;
      }
      return this;
    }
    /**
     * Create our {@link lutTexture} eagerly.
     */
    createLUTTextures() {
      const { size, computeSampleCount, ...lutTextureParams } = this.options.lutTextureParams;
      __privateSet$3(this, _lutStorageTexture, new Texture(this.renderer, {
        label: "LUT storage texture",
        name: "lutStorageTexture",
        format: lutTextureParams.format,
        visibility: ["compute", "fragment"],
        usage: ["copySrc", "storageBinding", "textureBinding"],
        type: "storage",
        fixedSize: {
          width: size,
          height: size
        },
        autoDestroy: false
      }));
      this.lutTexture = new Texture(this.renderer, {
        ...lutTextureParams,
        visibility: ["fragment"],
        fixedSize: {
          width: size,
          height: size
        },
        autoDestroy: false,
        fromTexture: __privateGet$3(this, _lutStorageTexture)
      });
    }
    /**
     * Create our {@link specularTexture} and {@link diffuseTexture} eagerly. They could be resized later when calling the {@link computeFromHDR} method.
     */
    createSpecularDiffuseTextures() {
      const textureDefaultOptions = {
        viewDimension: "cube",
        autoDestroy: false
        // keep alive when changing mesh
      };
      this.specularTexture = new Texture(this.renderer, {
        ...this.options.specularTextureParams,
        ...{
          visibility: ["fragment", "compute"],
          // could be resized later
          fixedSize: {
            width: 256,
            height: 256
          }
        },
        ...textureDefaultOptions
      });
      const { size, computeSampleCount, ...diffuseTextureParams } = this.options.diffuseTextureParams;
      this.diffuseTexture = new Texture(this.renderer, {
        ...diffuseTextureParams,
        ...{
          visibility: ["fragment"],
          // could be resized later
          fixedSize: {
            width: size,
            height: size
          }
        },
        ...textureDefaultOptions
      });
    }
    /**
     * Create the {@link lutTexture | BRDF GGX LUT texture} using the provided {@link LUTTextureParams | LUT texture options} and a {@link ComputePass} that runs once.
     */
    async computeBRDFLUTTexture() {
      let cachedLUT = null;
      for (const renderer of this.renderer.deviceManager.renderers) {
        for (const [uuid, envMap] of renderer.environmentMaps) {
          if (uuid !== this.uuid && envMap.lutTexture && envMap.lutTexture.size.width === this.lutTexture.size.width) {
            cachedLUT = envMap.lutTexture;
            break;
          }
        }
        if (cachedLUT) break;
      }
      if (cachedLUT) {
        this.lutTexture.copy(cachedLUT);
        return;
      }
      const { computeSampleCount } = this.options.lutTextureParams;
      let computeLUTPass = new ComputePass(this.renderer, {
        label: "Compute LUT texture",
        autoRender: false,
        // we're going to render only on demand
        dispatchSize: [
          Math.ceil(__privateGet$3(this, _lutStorageTexture).size.width / 16),
          Math.ceil(__privateGet$3(this, _lutStorageTexture).size.height / 16),
          1
        ],
        shaders: {
          compute: {
            code: computeBRDFLUT
          }
        },
        uniforms: {
          params: {
            struct: {
              sampleCount: {
                type: "u32",
                value: computeSampleCount
              }
            }
          }
        },
        textures: [__privateGet$3(this, _lutStorageTexture)]
      });
      await computeLUTPass.material.compileMaterial();
      __privateMethod$3(this, _EnvironmentMap_instances, runComputePass_fn).call(this, { computePass: computeLUTPass, label: "Compute LUT texture command encoder" });
      this.lutTexture.textureBinding.resource = this.lutTexture.texture;
      computeLUTPass.remove();
      computeLUTPass = null;
    }
    /**
     * Create the {@link specularTexture | specular cube map texture} from a loaded {@link HDRImageData} using the provided {@link SpecularTextureParams | specular texture options} and a {@link ComputePass} that runs once.
     * @param parsedHdr - parsed {@link HDRImageData} loaded by the {@link hdrLoader}.
     */
    async computeSpecularCubemapFromHDRData(parsedHdr) {
      let cubeStorageTexture = new Texture(this.renderer, {
        label: "Specular storage cubemap",
        name: "specularStorageCubemap",
        format: this.specularTexture.options.format,
        visibility: ["compute"],
        usage: ["copySrc", "storageBinding"],
        type: "storage",
        fixedSize: {
          width: this.specularTexture.size.width,
          height: this.specularTexture.size.height,
          depth: 6
        },
        viewDimension: "2d-array"
      });
      let computeCubeMapPass = new ComputePass(this.renderer, {
        label: "Compute specular cubemap from equirectangular",
        autoRender: false,
        // we're going to render only on demand
        dispatchSize: [
          Math.ceil(this.specularTexture.size.width / 8),
          Math.ceil(this.specularTexture.size.height / 8),
          6
        ],
        shaders: {
          compute: {
            code: computeSpecularCubemapFromHDR
          }
        },
        storages: {
          params: {
            struct: {
              hdrImageData: {
                type: "array<vec4f>",
                value: parsedHdr.data
              },
              imageSize: {
                type: "vec2f",
                value: new Vec2(parsedHdr.width, parsedHdr.height)
              },
              faceSize: {
                type: "u32",
                value: this.specularTexture.size.width
              }
            }
          }
        },
        textures: [cubeStorageTexture]
      });
      await computeCubeMapPass.material.compileMaterial();
      __privateMethod$3(this, _EnvironmentMap_instances, runComputePass_fn).call(this, {
        computePass: computeCubeMapPass,
        label: "Compute specular cube map command encoder",
        onAfterCompute: (commandEncoder) => {
          this.renderer.copyGPUTextureToTexture(cubeStorageTexture.texture, this.specularTexture, commandEncoder);
          this.specularTexture.textureBinding.resource = this.specularTexture.texture;
        }
      });
      computeCubeMapPass.remove();
      cubeStorageTexture.destroy();
      cubeStorageTexture = null;
      computeCubeMapPass = null;
    }
    /**
     * Compute the {@link diffuseTexture | diffuse cube map texture} from the {@link specularTexture | specular cube map texture } using the provided {@link DiffuseTextureParams | diffuse texture options} and a {@link ComputePass} that runs once.
     */
    async computeDiffuseFromSpecular() {
      if (this.specularTexture.options.viewDimension !== "cube") {
        throwWarning(
          "Could not compute the diffuse texture because the specular texture is not a cube map:" + this.specularTexture.options.viewDimension
        );
        return;
      }
      let diffuseStorageTexture = new Texture(this.renderer, {
        label: "Diffuse storage cubemap",
        name: "diffuseEnvMap",
        format: this.diffuseTexture.options.format,
        visibility: ["compute"],
        usage: ["copySrc", "storageBinding"],
        type: "storage",
        fixedSize: {
          width: this.diffuseTexture.size.width,
          height: this.diffuseTexture.size.height,
          depth: 6
        },
        viewDimension: "2d-array"
      });
      let computeDiffusePass = new ComputePass(this.renderer, {
        label: "Compute diffuse map from specular map",
        autoRender: false,
        // we're going to render only on demand
        dispatchSize: [Math.ceil(this.diffuseTexture.size.width / 8), Math.ceil(this.diffuseTexture.size.height / 8), 6],
        shaders: {
          compute: {
            code: computeDiffuseFromSpecularCubemap(this.specularTexture)
          }
        },
        uniforms: {
          params: {
            struct: {
              faceSize: {
                type: "u32",
                value: this.diffuseTexture.size.width
              },
              maxMipLevel: {
                type: "u32",
                value: this.specularTexture.texture.mipLevelCount
              },
              sampleCount: {
                type: "u32",
                value: this.options.diffuseTextureParams.computeSampleCount
              }
            }
          }
        },
        samplers: [this.sampler],
        textures: [this.specularTexture, diffuseStorageTexture]
      });
      await computeDiffusePass.material.compileMaterial();
      __privateMethod$3(this, _EnvironmentMap_instances, runComputePass_fn).call(this, {
        computePass: computeDiffusePass,
        label: "Compute diffuse cube map from specular cube map command encoder",
        onAfterCompute: (commandEncoder) => {
          this.renderer.copyGPUTextureToTexture(diffuseStorageTexture.texture, this.diffuseTexture, commandEncoder);
          this.diffuseTexture.textureBinding.resource = this.diffuseTexture.texture;
        }
      });
      computeDiffusePass.remove();
      diffuseStorageTexture.destroy();
      diffuseStorageTexture = null;
      computeDiffusePass = null;
    }
    /**
     * Load an HDR environment map and then generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
     * @param url - The url of the .hdr file to load.
     */
    async loadAndComputeFromHDR(url) {
      __privateSet$3(this, _hdrData, await this.hdrLoader.loadFromUrl(url));
      const { width, height } = __privateGet$3(this, _hdrData) ? __privateGet$3(this, _hdrData) : { width: 1024, height: 512 };
      const faceSize = Math.max(width / 4, height / 2);
      if (this.specularTexture.size.width !== faceSize || this.specularTexture.size.height !== faceSize) {
        this.specularTexture.options.fixedSize.width = faceSize;
        this.specularTexture.options.fixedSize.height = faceSize;
        this.specularTexture.size.width = faceSize;
        this.specularTexture.size.height = faceSize;
        this.specularTexture.createTexture();
      }
      const { size } = this.options.diffuseTextureParams;
      const diffuseSize = Math.min(size, faceSize);
      if (this.diffuseTexture.size.width !== diffuseSize || this.diffuseTexture.size.height !== diffuseSize) {
        this.diffuseTexture.options.fixedSize.width = diffuseSize;
        this.diffuseTexture.options.fixedSize.height = diffuseSize;
        this.diffuseTexture.size.width = diffuseSize;
        this.diffuseTexture.size.height = diffuseSize;
        this.diffuseTexture.createTexture();
      }
      this.computeFromHDR();
    }
    /**
     * Generate the {@link specularTexture} and {@link diffuseTexture} using two separate {@link ComputePass}.
     */
    computeFromHDR() {
      if (__privateGet$3(this, _hdrData)) {
        this.computeSpecularCubemapFromHDRData(__privateGet$3(this, _hdrData)).then(() => {
          this.computeDiffuseFromSpecular();
        });
      }
    }
    /**
     * Destroy the {@link EnvironmentMap} and its associated textures.
     */
    destroy() {
      this.diffuseTexture?.destroy();
      this.specularTexture?.destroy();
      this.lutTexture?.destroy();
      __privateGet$3(this, _lutStorageTexture).destroy();
    }
  }
  _hdrData = new WeakMap();
  _lutStorageTexture = new WeakMap();
  _EnvironmentMap_instances = new WeakSet();
  /**
   * Run a {@link ComputePass} once by creating a {@link GPUCommandEncoder} and execute the pass.
   * @param parameters - Parameters used to run the compute pass.
   * @param parameters.computePass - {@link ComputePass} to run.
   * @param parameters.label - Optional label for the {@link GPUCommandEncoder}.
   * @param parameters.onAfterCompute - Optional callback to run just after the pass has been executed. Useful for eventual texture copies.
   * @private
   */
  runComputePass_fn = function({
    computePass,
    label = "",
    onAfterCompute = (commandEncoder) => {
    }
  }) {
    const commandEncoder = this.renderer.device?.createCommandEncoder({
      label
    });
    !this.renderer.production && commandEncoder.pushDebugGroup(label);
    this.renderer.renderSingleComputePass(commandEncoder, computePass, false);
    onAfterCompute(commandEncoder);
    !this.renderer.production && commandEncoder.popDebugGroup();
    const commandBuffer = commandEncoder.finish();
    this.renderer.device?.queue.submit([commandBuffer]);
    this.renderer.pipelineManager.resetCurrentPipeline();
  };

  class BoxGeometry extends IndexedGeometry {
    constructor({
      instancesCount = 1,
      vertexBuffers = [],
      topology,
      mapBuffersAtCreation = true,
      widthSegments = 1,
      heightSegments = 1,
      depthSegments = 1
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
      this.type = "BoxGeometry";
      widthSegments = Math.floor(widthSegments);
      heightSegments = Math.floor(heightSegments);
      depthSegments = Math.floor(depthSegments);
      const vertices = [];
      const uvs = [];
      const normals = [];
      const indices = [];
      let numberOfVertices = 0;
      const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
        const segmentWidth = width / gridX;
        const segmentHeight = height / gridY;
        const widthHalf = width / 2;
        const heightHalf = height / 2;
        const depthHalf = depth / 2;
        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;
        let vertexCounter = 0;
        const vector = new Vec3();
        for (let iy = 0; iy < gridY1; iy++) {
          const y = iy * segmentHeight - heightHalf;
          for (let ix = 0; ix < gridX1; ix++) {
            const x = ix * segmentWidth - widthHalf;
            vector[u] = x * udir;
            vector[v] = y * vdir;
            vector[w] = depthHalf;
            vertices.push(vector.x, vector.y, vector.z);
            vector[u] = 0;
            vector[v] = 0;
            vector[w] = depth > 0 ? 1 : -1;
            normals.push(vector.x, vector.y, vector.z);
            uvs.push(ix / gridX);
            uvs.push(iy / gridY);
            vertexCounter += 1;
          }
        }
        for (let iy = 0; iy < gridY; iy++) {
          for (let ix = 0; ix < gridX; ix++) {
            const a = numberOfVertices + ix + gridX1 * iy;
            const b = numberOfVertices + ix + gridX1 * (iy + 1);
            const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
            const d = numberOfVertices + (ix + 1) + gridX1 * iy;
            indices.push(a, b, d);
            indices.push(b, c, d);
            numberOfVertices += vertexCounter;
          }
        }
      };
      buildPlane("z", "y", "x", -1, -1, 2, 2, 2, depthSegments, heightSegments);
      buildPlane("z", "y", "x", 1, -1, 2, 2, -2, depthSegments, heightSegments);
      buildPlane("x", "z", "y", 1, 1, 2, 2, 2, widthSegments, depthSegments);
      buildPlane("x", "z", "y", 1, -1, 2, 2, -2, widthSegments, depthSegments);
      buildPlane("x", "y", "z", 1, -1, 2, 2, 2, widthSegments, heightSegments);
      buildPlane("x", "y", "z", -1, -1, 2, 2, -2, widthSegments, heightSegments);
      this.setAttribute({
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(vertices)
      });
      this.setAttribute({
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        array: new Float32Array(uvs)
      });
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(normals)
      });
      this.setIndexBuffer({
        array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
        bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
      });
    }
  }

  class SphereGeometry extends IndexedGeometry {
    constructor({
      topology,
      instancesCount = 1,
      vertexBuffers = [],
      mapBuffersAtCreation = true,
      widthSegments = 32,
      heightSegments = 16,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
      this.type = "SphereGeometry";
      widthSegments = Math.max(3, Math.floor(widthSegments));
      heightSegments = Math.max(2, Math.floor(heightSegments));
      const radius = 1;
      const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
      let index = 0;
      const grid = [];
      const vertex = new Vec3();
      const normal = new Vec3();
      const indices = [];
      const vertices = [];
      const normals = [];
      const uvs = [];
      for (let iy = 0; iy <= heightSegments; iy++) {
        const verticesRow = [];
        const v = iy / heightSegments;
        let uOffset = 0;
        if (iy === 0 && thetaStart === 0) {
          uOffset = 0.5 / widthSegments;
        } else if (iy === heightSegments && thetaEnd === Math.PI) {
          uOffset = -0.5 / widthSegments;
        }
        for (let ix = 0; ix <= widthSegments; ix++) {
          const u = ix / widthSegments;
          vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
          vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vertices.push(vertex.x, vertex.y, vertex.z);
          normal.copy(vertex).normalize();
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(u + uOffset, v);
          verticesRow.push(index++);
        }
        grid.push(verticesRow);
      }
      for (let iy = 0; iy < heightSegments; iy++) {
        for (let ix = 0; ix < widthSegments; ix++) {
          const a = grid[iy][ix + 1];
          const b = grid[iy][ix];
          const c = grid[iy + 1][ix];
          const d = grid[iy + 1][ix + 1];
          if (iy !== 0 || thetaStart > 0) indices.push(a, b, d);
          if (iy !== heightSegments - 1 || thetaEnd < Math.PI) indices.push(b, c, d);
        }
      }
      this.setAttribute({
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(vertices)
      });
      this.setAttribute({
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        array: new Float32Array(uvs)
      });
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(normals)
      });
      this.setIndexBuffer({
        array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
        bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
      });
    }
  }

  class LitMesh extends Mesh {
    /**
     * LitMesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link LitMesh}.
     * @param parameters - {@link LitMeshParameters} used to create this {@link LitMesh}.
     */
    constructor(renderer, parameters = {}) {
      renderer = isCameraRenderer(renderer, "LitMesh");
      let { material, ...defaultParams } = parameters;
      if (!material) material = {};
      let { colorSpace } = material;
      if (!colorSpace) {
        colorSpace = "srgb";
      }
      const {
        shading,
        additionalVaryings,
        vertexChunks,
        fragmentChunks,
        toneMapping,
        // material uniform values
        color,
        opacity,
        alphaCutoff,
        metallic,
        roughness,
        normalScale,
        occlusionIntensity,
        emissiveIntensity,
        emissiveColor,
        specularIntensity,
        specularColor,
        shininess,
        transmission,
        ior,
        dispersion,
        thickness,
        attenuationDistance,
        attenuationColor,
        // texture descriptors
        baseColorTexture,
        normalTexture,
        emissiveTexture,
        occlusionTexture,
        metallicRoughnessTexture,
        specularTexture,
        specularFactorTexture,
        specularColorTexture,
        transmissionTexture,
        thicknessTexture,
        environmentMap
      } = material;
      const materialUniform = LitMesh.getMaterialUniform({
        shading,
        colorSpace,
        color,
        opacity,
        alphaCutoff,
        metallic,
        roughness,
        normalScale,
        occlusionIntensity,
        emissiveIntensity,
        emissiveColor,
        specularIntensity,
        specularColor,
        shininess,
        transmission,
        ior,
        dispersion,
        thickness,
        attenuationDistance,
        attenuationColor,
        environmentMap
      });
      if (defaultParams.uniforms) {
        defaultParams.uniforms = {
          ...defaultParams.uniforms,
          ...{
            material: materialUniform
          }
        };
      } else {
        defaultParams.uniforms = {
          material: materialUniform
        };
      }
      if (!defaultParams.textures) {
        defaultParams.textures = [];
      }
      if (!defaultParams.samplers) {
        defaultParams.samplers = [];
      }
      const materialTextures = LitMesh.getMaterialTexturesDescriptors({
        shading,
        baseColorTexture,
        normalTexture,
        emissiveTexture,
        occlusionTexture,
        metallicRoughnessTexture,
        specularTexture,
        specularFactorTexture,
        specularColorTexture,
        transmissionTexture,
        thicknessTexture
      });
      materialTextures.forEach((textureDescriptor) => {
        if (textureDescriptor.sampler) {
          const samplerExists = defaultParams.samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid);
          if (!samplerExists) {
            defaultParams.samplers.push(textureDescriptor.sampler);
          }
        }
        defaultParams.textures.push(textureDescriptor.texture);
      });
      const useEnvMap = environmentMap && (shading === "PBR" || !shading);
      if (useEnvMap) {
        if (!defaultParams.textures) {
          defaultParams.textures = [];
        }
        defaultParams.textures = [
          ...defaultParams.textures,
          environmentMap.lutTexture,
          environmentMap.diffuseTexture,
          environmentMap.specularTexture
        ];
        if (!defaultParams.samplers) {
          defaultParams.samplers = [];
        }
        defaultParams.samplers = [...defaultParams.samplers, environmentMap.sampler];
      }
      let transmissionBackgroundTexture = null;
      if (parameters.transmissive) {
        renderer.createTransmissionTarget();
        transmissionBackgroundTexture = {
          texture: renderer.transmissionTarget.texture,
          sampler: renderer.transmissionTarget.sampler
        };
      }
      const extensionsUsed = [];
      if (dispersion) {
        extensionsUsed.push("KHR_materials_dispersion");
      }
      const hasNormal = defaultParams.geometry && defaultParams.geometry.getAttributeByName("normal");
      if (defaultParams.geometry && !hasNormal) {
        defaultParams.geometry.computeGeometry();
      }
      const vs = LitMesh.getVertexShaderCode({
        bindings: defaultParams.bindings,
        geometry: defaultParams.geometry,
        chunks: vertexChunks,
        additionalVaryings
      });
      const fs = LitMesh.getFragmentShaderCode({
        shadingModel: shading,
        chunks: fragmentChunks,
        extensionsUsed,
        receiveShadows: defaultParams.receiveShadows,
        toneMapping,
        geometry: defaultParams.geometry,
        additionalVaryings,
        materialUniform,
        baseColorTexture,
        normalTexture,
        metallicRoughnessTexture,
        specularTexture,
        specularFactorTexture,
        specularColorTexture,
        transmissionTexture,
        thicknessTexture,
        emissiveTexture,
        occlusionTexture,
        transmissionBackgroundTexture,
        environmentMap
      });
      const shaders = {
        vertex: {
          code: vs,
          entryPoint: "main"
        },
        fragment: {
          code: fs,
          entryPoint: "main"
        }
      };
      super(renderer, { ...defaultParams, ...{ shaders } });
      if (useEnvMap) {
        environmentMap.onRotationAxisChanged(() => {
          this.uniforms.material.envRotation.value = environmentMap.rotationMatrix;
        });
      }
    }
    /**
     * Get the material {@link BufferBindingParams} to build the material uniform.
     * @param parameters - {@link GetLitMeshMaterialUniform} parameters.
     * @returns - Material uniform {@link BufferBindingParams}.
     */
    static getMaterialUniform(parameters) {
      const {
        shading,
        colorSpace,
        color,
        opacity,
        alphaCutoff,
        metallic,
        roughness,
        normalScale,
        occlusionIntensity,
        emissiveIntensity,
        emissiveColor,
        specularIntensity,
        specularColor,
        shininess,
        transmission,
        ior,
        dispersion,
        thickness,
        attenuationDistance,
        attenuationColor,
        environmentMap
      } = parameters;
      const baseUniformStruct = {
        color: {
          type: "vec3f",
          value: color !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(color.clone()) : color.clone() : new Vec3(1)
        },
        opacity: {
          type: "f32",
          value: opacity !== void 0 ? opacity : 1
        },
        alphaCutoff: {
          type: "f32",
          value: alphaCutoff !== void 0 ? alphaCutoff : 0.5
        }
      };
      const diffuseUniformStruct = {
        ...baseUniformStruct,
        normalScale: {
          type: "vec2f",
          value: normalScale !== void 0 ? normalScale : new Vec2(1)
        },
        occlusionIntensity: {
          type: "f32",
          value: occlusionIntensity !== void 0 ? occlusionIntensity : 1
        },
        emissiveIntensity: {
          type: "f32",
          value: emissiveIntensity !== void 0 ? emissiveIntensity : 1
        },
        emissiveColor: {
          type: "vec3f",
          value: emissiveColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(emissiveColor.clone()) : emissiveColor.clone() : new Vec3()
        }
      };
      const specularUniformStruct = {
        ...diffuseUniformStruct,
        specularIntensity: {
          type: "f32",
          value: specularIntensity !== void 0 ? specularIntensity : 1
        },
        specularColor: {
          type: "vec3f",
          value: specularColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(specularColor.clone()) : specularColor.clone() : new Vec3(1)
        }
      };
      const phongUniformStruct = {
        ...specularUniformStruct,
        shininess: {
          type: "f32",
          value: shininess !== void 0 ? shininess : 30
        }
      };
      const pbrUniformStruct = {
        ...specularUniformStruct,
        metallic: {
          type: "f32",
          value: metallic !== void 0 ? metallic : 1
        },
        roughness: {
          type: "f32",
          value: roughness !== void 0 ? roughness : 1
        },
        transmission: {
          type: "f32",
          value: transmission !== void 0 ? transmission : 0
        },
        ior: {
          type: "f32",
          value: ior !== void 0 ? ior : 1.5
        },
        dispersion: {
          type: "f32",
          value: dispersion !== void 0 ? dispersion : 0
        },
        thickness: {
          type: "f32",
          value: thickness !== void 0 ? thickness : 0
        },
        attenuationDistance: {
          type: "f32",
          value: attenuationDistance !== void 0 ? attenuationDistance : Infinity
        },
        attenuationColor: {
          type: "vec3f",
          value: attenuationColor !== void 0 ? colorSpace === "srgb" ? sRGBToLinear(attenuationColor.clone()) : attenuationColor.clone() : new Vec3(1)
        },
        ...environmentMap && {
          envRotation: {
            type: "mat3x3f",
            value: environmentMap.rotationMatrix
          },
          envDiffuseIntensity: {
            type: "f32",
            value: environmentMap.options.diffuseIntensity
          },
          envSpecularIntensity: {
            type: "f32",
            value: environmentMap.options.specularIntensity
          }
        }
      };
      const materialStruct = (() => {
        switch (shading) {
          case "Unlit":
            return baseUniformStruct;
          case "Lambert":
            return diffuseUniformStruct;
          case "Phong":
            return phongUniformStruct;
          case "PBR":
          default:
            return pbrUniformStruct;
        }
      })();
      return {
        visibility: ["fragment"],
        struct: materialStruct
      };
    }
    /**
     * Get all the material {@link ShaderTextureDescriptor} as an array.
     * @param parameters - {@link GetMaterialTexturesDescriptors} parameters.
     * @returns - Array of {@link ShaderTextureDescriptor} to use.
     */
    static getMaterialTexturesDescriptors(parameters) {
      const {
        shading,
        baseColorTexture,
        normalTexture,
        emissiveTexture,
        occlusionTexture,
        metallicRoughnessTexture,
        specularTexture,
        specularFactorTexture,
        specularColorTexture,
        transmissionTexture,
        thicknessTexture
      } = parameters;
      const baseTextures = [baseColorTexture];
      const diffuseTextures = [...baseTextures, normalTexture, emissiveTexture, occlusionTexture];
      const specularTextures = [
        ...diffuseTextures,
        metallicRoughnessTexture,
        specularTexture,
        specularFactorTexture,
        specularColorTexture
      ];
      const pbrTextures = [...specularTextures, transmissionTexture, thicknessTexture];
      const materialTextures = (() => {
        switch (shading) {
          case "Unlit":
            return baseTextures;
          case "Lambert":
            return diffuseTextures;
          case "Phong":
            return specularTextures;
          case "PBR":
          default:
            return pbrTextures;
        }
      })();
      return materialTextures.filter(Boolean);
    }
    /**
     * Generate the {@link LitMesh} vertex shader code.
     * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
     * @returns - The vertex shader generated based on the provided parameters.
     */
    static getVertexShaderCode(parameters) {
      return getVertexShaderCode(parameters);
    }
    /**
     * Generate the {@link LitMesh} fragment shader.
     * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
     * @returns - The fragment shader generated based on the provided parameters.
     */
    static getFragmentShaderCode(parameters) {
      return getFragmentShaderCode(parameters);
    }
  }

  class PingPongPlane extends FullscreenPlane {
    /**
     * PingPongPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}.
     * @param parameters - {@link PingPongPlaneParams | parameters} use to create this {@link PingPongPlane}.
     */
    constructor(renderer, parameters = {}) {
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
      const colorAttachments = parameters.targets && parameters.targets.length && parameters.targets.map((target) => {
        return {
          targetFormat: target.format
        };
      });
      parameters.outputTarget = new RenderTarget(renderer, {
        label: parameters.label ? parameters.label + " render target" : "Ping Pong render target",
        useDepth: false,
        ...colorAttachments && { colorAttachments }
      });
      parameters.transparent = false;
      parameters.depth = false;
      parameters.label = parameters.label ?? "PingPongPlane " + renderer.pingPongPlanes?.length;
      super(renderer, parameters);
      this.type = "PingPongPlane";
      this.renderTexture = this.createTexture({
        label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
        name: parameters.renderTextureName ?? "renderTexture",
        ...parameters.targets && parameters.targets.length && { format: parameters.targets[0].format },
        usage: ["copyDst", "textureBinding"]
      });
    }
    /**
     * Add the {@link PingPongPlane} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - Whether to add this {@link PingPongPlane} to the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}.
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.pingPongPlanes.push(this);
      }
      if (this.autoRender) {
        this.renderer.scene.addPingPongPlane(this);
      }
    }
    /**
     * Remove the {@link PingPongPlane} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - Whether to remove this {@link PingPongPlane} from the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}.
     */
    removeFromScene(removeFromRenderer = false) {
      if (this.outputTarget) {
        this.outputTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removePingPongPlane(this);
      }
      if (removeFromRenderer) {
        this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
      }
    }
  }

  var __typeError$2 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$2 = (obj, member, msg) => member.has(obj) || __typeError$2("Cannot " + msg);
  var __privateGet$2 = (obj, member, getter) => (__accessCheck$2(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$2 = (obj, member, value) => member.has(obj) ? __typeError$2("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$2 = (obj, member, value, setter) => (__accessCheck$2(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$2 = (obj, member, method) => (__accessCheck$2(obj, member, "access private method"), method);
  var _localRay, _v0, _v1, _v2, _edge1, _edge2, _uv0, _uv1, _uv2, _n0, _n1, _n2, _Raycaster_instances, intersectMesh_fn;
  class Raycaster {
    /**
     * Raycaster constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Raycaster}
     */
    constructor(renderer) {
      __privateAdd$2(this, _Raycaster_instances);
      /** @ignore */
      __privateAdd$2(this, _localRay);
      /** @ignore */
      __privateAdd$2(this, _v0);
      /** @ignore */
      __privateAdd$2(this, _v1);
      /** @ignore */
      __privateAdd$2(this, _v2);
      /** @ignore */
      __privateAdd$2(this, _edge1);
      /** @ignore */
      __privateAdd$2(this, _edge2);
      /** @ignore */
      __privateAdd$2(this, _uv0);
      /** @ignore */
      __privateAdd$2(this, _uv1);
      /** @ignore */
      __privateAdd$2(this, _uv2);
      /** @ignore */
      __privateAdd$2(this, _n0);
      /** @ignore */
      __privateAdd$2(this, _n1);
      /** @ignore */
      __privateAdd$2(this, _n2);
      this.type = "Raycaster";
      this.setRenderer(renderer);
      this.pointer = new Vec2(Infinity);
      this.ray = {
        origin: new Vec3(),
        direction: new Vec3()
      };
      __privateSet$2(this, _localRay, {
        origin: this.ray.origin.clone(),
        direction: this.ray.direction.clone()
      });
      __privateSet$2(this, _v0, new Vec3());
      __privateSet$2(this, _v1, new Vec3());
      __privateSet$2(this, _v2, new Vec3());
      __privateSet$2(this, _edge1, new Vec3());
      __privateSet$2(this, _edge2, new Vec3());
      __privateSet$2(this, _uv0, new Vec2());
      __privateSet$2(this, _uv1, new Vec2());
      __privateSet$2(this, _uv2, new Vec2());
      __privateSet$2(this, _n0, new Vec3());
      __privateSet$2(this, _n1, new Vec3());
      __privateSet$2(this, _n2, new Vec3());
    }
    /**
     * Set or reset this {@link Raycaster} {@link Raycaster.renderer | renderer}.
     * @param renderer - New {@link CameraRenderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer) {
      renderer = isCameraRenderer(renderer, this.type);
      this.renderer = renderer;
      this.camera = this.renderer.camera;
    }
    /**
     * Set the {@link pointer} normalized device coordinates values (in the [-1, 1] range) based on a mouse/pointer/touch event and the {@link CameraRenderer#boundingRect | renderer bounding rectangle}. Useful if the canvas has a fixed position for example, but you might need to directly use {@link setFromNDCCoords} if not.
     * @param e - Mouse, pointer or touch event.
     */
    setFromMouse(e) {
      const { clientX, clientY } = e.targetTouches && e.targetTouches.length ? e.targetTouches[0] : e;
      this.setFromNDCCoords(
        (clientX - this.renderer.boundingRect.left) / this.renderer.boundingRect.width * 2 - 1,
        -((clientY - this.renderer.boundingRect.top) / this.renderer.boundingRect.height) * 2 + 1
      );
    }
    /**
     * Set the {@link pointer} normalized device coordinates (in the [-1, 1] range).
     * @param x - input position along the X axis in the [-1, 1] range where `-1` represents the left edge and `1` the right edge.
     * @param y - input position along the Y axis in the [-1, 1] range where `-1` represents the bottom edge and `1` the top edge.
     */
    setFromNDCCoords(x = 0, y = 0) {
      this.pointer.set(x, y);
      this.setRay();
    }
    /**
     * Sets the {@link ray} origin and direction based on the {@link camera} and the normalized device coordinates of the {@link pointer}.
     */
    setRay() {
      this.camera.worldMatrix.getTranslation(this.ray.origin);
      this.ray.direction.set(this.pointer.x, this.pointer.y, -1).unproject(this.camera).sub(this.ray.origin).normalize();
    }
    // INTERSECTIONS
    /**
     * Ray-Triangle Intersection with Möller–Trumbore Algorithm.
     * @param intersectionPoint - {@link Vec3} to store the intersection point if any.
     * @returns - Whether an intersection point has been found or not.
     */
    rayIntersectsTriangle(intersectionPoint) {
      const EPSILON = 1e-6;
      const h = new Vec3();
      const q = new Vec3();
      h.crossVectors(__privateGet$2(this, _localRay).direction, __privateGet$2(this, _edge2));
      const a = __privateGet$2(this, _edge1).dot(h);
      if (Math.abs(a) < EPSILON) return false;
      const f = 1 / a;
      const s = __privateGet$2(this, _localRay).origin.clone().sub(__privateGet$2(this, _v0));
      const u = f * s.dot(h);
      if (u < 0 || u > 1) return false;
      q.crossVectors(s, __privateGet$2(this, _edge1));
      const v = f * __privateGet$2(this, _localRay).direction.dot(q);
      if (v < 0 || u + v > 1) return false;
      const t = f * __privateGet$2(this, _edge2).dot(q);
      if (t > EPSILON) {
        intersectionPoint.copy(__privateGet$2(this, _localRay).origin).add(__privateGet$2(this, _localRay).direction.clone().multiplyScalar(t));
        return true;
      }
      return false;
    }
    /**
     * Find the barycentric contributions of a given intersection point lying inside our current triangle.
     * @param intersectionPoint - Given {@link Vec3 | intersection point}.
     * @returns - {@link Vec3} barycentric contributions.
     */
    getBarycentricCoordinates(intersectionPoint) {
      const v0p = intersectionPoint.clone().sub(__privateGet$2(this, _v0));
      const d00 = __privateGet$2(this, _edge1).dot(__privateGet$2(this, _edge1));
      const d01 = __privateGet$2(this, _edge1).dot(__privateGet$2(this, _edge2));
      const d11 = __privateGet$2(this, _edge2).dot(__privateGet$2(this, _edge2));
      const d20 = v0p.dot(__privateGet$2(this, _edge1));
      const d21 = v0p.dot(__privateGet$2(this, _edge2));
      const denom = d00 * d11 - d01 * d01;
      const barycentric = new Vec3(0, (d11 * d20 - d01 * d21) / denom, (d00 * d21 - d01 * d20) / denom);
      barycentric.x = 1 - barycentric.y - barycentric.z;
      return barycentric;
    }
    /**
     * Get a rough estimation of the current normal of our current triangle, in local space.
     * @returns - {@link Vec3} normal.
     */
    getTriangleNormal() {
      return new Vec3().crossVectors(__privateGet$2(this, _edge1), __privateGet$2(this, _edge2)).normalize();
    }
    /**
     * Set our input vector with the desired attribute value at the given offset defined by our triangleIndex, offset and whether we're using and indexed geometry or not.
     * @param triangleIndex - Index of the triangle for which to look our attribute value.
     * @param offset - Index of the point inside our triangle (`0`, `1` or `2`).
     * @param indices - Indexed geometry array if defined or `null`.
     * @param attribute - {@link VertexBufferAttribute | Vertex buffer attribute} to get the value from.
     * @param vector - Input vector to set (can either be a {@link Vec2} or {@link Vec3}).
     */
    setAttributeVectorAtIndex(triangleIndex, offset, indices, attribute, vector) {
      const index = indices ? indices[triangleIndex * 3 + offset] : triangleIndex * 3 + offset;
      vector.x = attribute.array[index * attribute.size];
      vector.y = attribute.array[index * attribute.size + 1];
      if ("z" in vector) {
        vector.z = attribute.array[index * attribute.size + 2];
      }
    }
    /**
     * Test whether the {@link ray} is intersecting a given object, if the is object is actually a {@link ProjectedMesh | projected mesh}.
     * Then, if the recursive flag is set to `true`, test if the {@link Object3D#children | object's children} are intersecting as well.
     * @param object - {@link Object3D | object} to test against.
     * @param recursive - Whether we should also test against the {@link Object3D#children | object's children}. Default to `true`.
     * @param intersections - Already existing {@link Intersection | intersections} if any.
     * @returns - Updated {@link Intersection | intersections}.
     */
    intersectObject(object, recursive = true, intersections = []) {
      if (!(object instanceof Object3D)) {
        if (!this.renderer.production) {
          throwWarning(`${this.type}: object to test intersection again is not of type Object3D`);
        }
        return intersections;
      }
      const mesh = isProjectedMesh(object);
      if (mesh) {
        __privateMethod$2(this, _Raycaster_instances, intersectMesh_fn).call(this, mesh, intersections);
      }
      if (recursive) {
        object.children.forEach((child) => {
          this.intersectObject(child, recursive, intersections);
        });
      }
      if (intersections.length) {
        intersections.sort((a, b) => {
          return this.ray.origin.distance(a.point) - this.ray.origin.distance(b.point);
        });
      }
      return intersections;
    }
    /**
     * Test whether the {@link ray} is intersecting a given array of objects.
     * If the recursive flag is set to `true`, test if each {@link Object3D#children | object's children} are intersecting as well.
     * @param objects - Array of {@link Object3D | objects} to test against.
     * @param recursive - Whether we should also test against each {@link Object3D#children | object's children}. Default to `true`.
     * @param intersections - Already existing {@link Intersection | intersections} if any.
     * @returns - Updated {@link Intersection | intersections}.
     */
    intersectObjects(objects, recursive = true, intersections = []) {
      objects.forEach((object) => {
        this.intersectObject(object, recursive, intersections);
      });
      if (intersections.length) {
        intersections.sort((a, b) => {
          return this.ray.origin.distance(a.point) - this.ray.origin.distance(b.point);
        });
      }
      return intersections;
    }
  }
  _localRay = new WeakMap();
  _v0 = new WeakMap();
  _v1 = new WeakMap();
  _v2 = new WeakMap();
  _edge1 = new WeakMap();
  _edge2 = new WeakMap();
  _uv0 = new WeakMap();
  _uv1 = new WeakMap();
  _uv2 = new WeakMap();
  _n0 = new WeakMap();
  _n1 = new WeakMap();
  _n2 = new WeakMap();
  _Raycaster_instances = new WeakSet();
  /**
   * Test whether the {@link ray} is intersecting a given {@link ProjectedMesh | projected mesh} and if so, returns the given {@link Intersection | intersection} information.
   * Uses various early exits to optimize the process:
   * - if the mesh is frustum culled
   * - if the pointer is currently outside the mesh clip space bounding rectangle.
   * - based on the face culling.
   * @param mesh - {@link ProjectedMesh | Projected mesh} to test against.
   * @param intersections - Already existing {@link Intersection | intersections} if any.
   * @returns - Updated {@link Intersection | intersections}.
   * @private
   */
  intersectMesh_fn = function(mesh, intersections = []) {
    if (!mesh.geometry) return intersections;
    const position = mesh.geometry.getAttributeByName("position");
    if (!position) {
      if (!this.renderer.production) {
        throwWarning(`Raycaster: can't raycast on a mesh that has no position attribute: ${mesh.options.label}`);
      }
      return intersections;
    }
    if (!position.array) {
      if (!this.renderer.production) {
        throwWarning(`Raycaster: can't raycast on a mesh that has no position attribute array: ${mesh.options.label}`);
      }
      return intersections;
    }
    if (mesh.frustumCulling && mesh.domFrustum) {
      const { clipSpaceBoundingRect } = mesh.domFrustum;
      if (!mesh.domFrustum.isIntersecting) {
        return intersections;
      } else if (this.pointer.x > clipSpaceBoundingRect.left + clipSpaceBoundingRect.width || this.pointer.x < clipSpaceBoundingRect.left || this.pointer.y > clipSpaceBoundingRect.top || this.pointer.y < clipSpaceBoundingRect.top - clipSpaceBoundingRect.height) {
        return intersections;
      }
    }
    const inverseModelMatrix = mesh.worldMatrix.getInverse();
    __privateGet$2(this, _localRay).origin.copy(this.ray.origin).applyMat4(inverseModelMatrix);
    __privateGet$2(this, _localRay).direction.copy(this.ray.direction).transformDirection(inverseModelMatrix);
    const uv = mesh.geometry.getAttributeByName("uv");
    const normal = mesh.geometry.getAttributeByName("normal");
    const indices = mesh.geometry.indexBuffer?.array;
    const triangleCount = indices ? indices.length / 3 : position.array.length / 9;
    for (let i = 0; i < triangleCount; i++) {
      this.setAttributeVectorAtIndex(i, 0, indices, position, __privateGet$2(this, _v0));
      this.setAttributeVectorAtIndex(i, 1, indices, position, __privateGet$2(this, _v1));
      this.setAttributeVectorAtIndex(i, 2, indices, position, __privateGet$2(this, _v2));
      __privateGet$2(this, _edge1).copy(__privateGet$2(this, _v1)).sub(__privateGet$2(this, _v0));
      __privateGet$2(this, _edge2).copy(__privateGet$2(this, _v2)).sub(__privateGet$2(this, _v0));
      if (mesh.material.options.rendering.cullMode !== "none") {
        const computedNormal = this.getTriangleNormal();
        const faceDirection = computedNormal.dot(__privateGet$2(this, _localRay).direction);
        if (faceDirection > 0 && mesh.material.options.rendering.cullMode === "back") {
          continue;
        } else if (faceDirection < 0 && mesh.material.options.rendering.cullMode === "front") {
          continue;
        }
      }
      const intersectionPoint = new Vec3();
      const isIntersected = this.rayIntersectsTriangle(intersectionPoint);
      if (isIntersected) {
        const barycentric = this.getBarycentricCoordinates(intersectionPoint);
        const point = intersectionPoint.clone().applyMat4(mesh.worldMatrix);
        const distance = this.ray.origin.distance(point);
        const intersection = {
          object: mesh,
          distance,
          localPoint: intersectionPoint,
          point,
          triangle: [__privateGet$2(this, _v0).clone(), __privateGet$2(this, _v1).clone(), __privateGet$2(this, _v2).clone()],
          triangleIndex: i
        };
        if (uv && uv.array && uv.array.length) {
          this.setAttributeVectorAtIndex(i, 0, indices, uv, __privateGet$2(this, _uv0));
          this.setAttributeVectorAtIndex(i, 1, indices, uv, __privateGet$2(this, _uv1));
          this.setAttributeVectorAtIndex(i, 2, indices, uv, __privateGet$2(this, _uv2));
          intersection.uv = __privateGet$2(this, _uv0).clone().multiplyScalar(barycentric.x).add(__privateGet$2(this, _uv1).clone().multiplyScalar(barycentric.y)).add(__privateGet$2(this, _uv2).clone().multiplyScalar(barycentric.z));
        }
        if (normal && normal.array && normal.array.length) {
          this.setAttributeVectorAtIndex(i, 0, indices, normal, __privateGet$2(this, _n0));
          this.setAttributeVectorAtIndex(i, 1, indices, normal, __privateGet$2(this, _n1));
          this.setAttributeVectorAtIndex(i, 2, indices, normal, __privateGet$2(this, _n2));
          intersection.normal = __privateGet$2(this, _n0).clone().multiplyScalar(barycentric.x).add(__privateGet$2(this, _n1).clone().multiplyScalar(barycentric.y)).add(__privateGet$2(this, _n2).clone().multiplyScalar(barycentric.z));
        }
        intersections.push(intersection);
      }
    }
    return intersections;
  };

  const tempVec3 = new Vec3();
  const tempQuat = new Quat();
  class KeyframesAnimation {
    // used for skins
    /**
     * KeyframesAnimation constructor
     * @param parameters - {@link KeyframesAnimationParams | Parameters} used to create this {@link KeyframesAnimation}.
     */
    constructor({
      label = "",
      inputIndex = null,
      keyframes = null,
      values = null,
      path = null,
      interpolation = "LINEAR"
    } = {}) {
      this.label = label;
      this.keyframes = keyframes;
      this.values = values;
      this.path = path;
      this.interpolation = interpolation;
      this.inputIndex = inputIndex;
      this.weightsBindingInputs = [];
      this.onAfterUpdate = null;
      this.duration = this.keyframes ? this.keyframes[this.keyframes.length - 1] : 0;
    }
    /**
     * Add a weight {@link BufferBindingInput} to the {@link weightsBindingInputs} array.
     * @param input - Weight {@link BufferBindingInput}.
     */
    addWeightBindingInput(input) {
      this.weightsBindingInputs.push(input);
    }
    /**
     * Get a cubic spline interpolation value.
     * @param t - Current time value to use in the [0, 1] range.
     * @param prevComponentValue - Previous value to use for interpolation.
     * @param nextComponentValue - Next value to use for interpolation.
     * @param prevOutputTangentValue - Previous output tangent value to use for interpolation.
     * @param nextInputTangentValue - Previous output tangent value to use for interpolation.
     */
    getCubicSplineComponentValue(t, prevComponentValue, nextComponentValue, prevOutputTangentValue, nextInputTangentValue) {
      const t2 = t * t;
      const t3 = t2 * t;
      return (2 * t3 - 3 * t2 + 1) * prevComponentValue + (t3 - 2 * t2 + t) * prevOutputTangentValue + (-2 * t3 + 3 * t2) * nextComponentValue + (t3 - t2) * nextInputTangentValue;
    }
    /**
     * Get the index from which to return a value from the {@link values} array based on an index in the {@link keyframes} array and the size of the component to animate.
     * @param index - Index in the {@link keyframes} array to use.
     * @param size - Size of the component to animate in the {@link values} array.
     */
    getIndexFromInterpolation(index = 0, size = 1) {
      return this.interpolation === "CUBICSPLINE" ? index * 3 * size + size : index * size;
    }
    /**
     * Update an {@link Object3D} transformation property or eventually the {@link weightsBindingInputs} based on the current time given, the {@link path} and {@link interpolation} used and the {@link keyframes} and {@link values}.
     * @param target - {@link Object3D} to update.
     * @param currentTime - Current time in seconds.
     */
    update(target, currentTime = 0) {
      if (!this.keyframes || !this.values || !this.path) return;
      const nextTimeIndex = this.keyframes.findIndex((t) => t >= currentTime);
      if (nextTimeIndex === -1) return;
      const previousTimeIndex = nextTimeIndex - 1;
      if (previousTimeIndex === -1) return;
      const nextTime = this.keyframes[nextTimeIndex];
      const previousTime = this.keyframes[previousTimeIndex];
      const interpolatedTime = (currentTime - previousTime) / (nextTime - previousTime);
      const deltaTime = nextTime - previousTime;
      if (this.path === "rotation") {
        const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 4);
        const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 4);
        target.quaternion.setFromArray([
          this.values[prevIndex],
          this.values[prevIndex + 1],
          this.values[prevIndex + 2],
          this.values[prevIndex + 3]
        ]);
        if (this.interpolation === "LINEAR" || this.interpolation === "CUBICSPLINE") {
          tempQuat.setFromArray([
            this.values[nextIndex],
            this.values[nextIndex + 1],
            this.values[nextIndex + 2],
            this.values[nextIndex + 3]
          ]);
          if (this.interpolation === "CUBICSPLINE") {
            const previousOutputTangent = [
              this.values[prevIndex + 4],
              this.values[prevIndex + 5],
              this.values[prevIndex + 6],
              this.values[prevIndex + 7]
            ];
            const nextInputTangent = [
              this.values[nextIndex - 4],
              this.values[nextIndex - 3],
              this.values[nextIndex - 2],
              this.values[nextIndex - 1]
            ];
            const cubicValue = [
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target.quaternion.elements[0],
                tempQuat.elements[0],
                deltaTime * previousOutputTangent[0],
                deltaTime * nextInputTangent[0]
              ),
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target.quaternion.elements[1],
                tempQuat.elements[1],
                deltaTime * previousOutputTangent[1],
                deltaTime * nextInputTangent[1]
              ),
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target.quaternion.elements[2],
                tempQuat.elements[2],
                deltaTime * previousOutputTangent[2],
                deltaTime * nextInputTangent[2]
              ),
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target.quaternion.elements[3],
                tempQuat.elements[3],
                deltaTime * previousOutputTangent[3],
                deltaTime * nextInputTangent[3]
              )
            ];
            target.quaternion.setFromArray(cubicValue).normalize();
          } else {
            target.quaternion.slerp(tempQuat, interpolatedTime);
          }
        }
        target.shouldUpdateModelMatrix();
      } else if (this.path === "translation" || this.path === "scale") {
        const vectorName = this.path === "translation" ? "position" : this.path;
        const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, 3);
        const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, 3);
        target[vectorName].set(this.values[prevIndex], this.values[prevIndex + 1], this.values[prevIndex + 2]);
        if (this.interpolation === "LINEAR" || this.interpolation === "CUBICSPLINE") {
          tempVec3.set(this.values[nextIndex], this.values[nextIndex + 1], this.values[nextIndex + 2]);
          if (this.interpolation === "CUBICSPLINE") {
            const previousOutputTangent = [
              this.values[prevIndex + 3],
              this.values[prevIndex + 4],
              this.values[prevIndex + 5]
            ];
            const nextInputTangent = [this.values[nextIndex - 3], this.values[nextIndex - 2], this.values[nextIndex - 1]];
            const cubicValue = [
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target[vectorName].x,
                tempVec3.x,
                deltaTime * previousOutputTangent[0],
                deltaTime * nextInputTangent[0]
              ),
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target[vectorName].y,
                tempVec3.y,
                deltaTime * previousOutputTangent[1],
                deltaTime * nextInputTangent[1]
              ),
              this.getCubicSplineComponentValue(
                interpolatedTime,
                target[vectorName].z,
                tempVec3.z,
                deltaTime * previousOutputTangent[2],
                deltaTime * nextInputTangent[2]
              )
            ];
            target[vectorName].set(cubicValue[0], cubicValue[1], cubicValue[2]);
          } else {
            target[vectorName].lerp(tempVec3, interpolatedTime);
          }
        }
      } else if (this.path === "weights") {
        const prevIndex = this.getIndexFromInterpolation(previousTimeIndex, this.weightsBindingInputs.length);
        const nextIndex = this.getIndexFromInterpolation(nextTimeIndex, this.weightsBindingInputs.length);
        for (let i = 0; i < this.weightsBindingInputs.length; i++) {
          const value = this.values[prevIndex + i];
          this.weightsBindingInputs[i].value = value;
          if (this.interpolation === "LINEAR") {
            const nextValue = this.values[nextIndex + i];
            this.weightsBindingInputs[i].value += (nextValue - value) * interpolatedTime;
          } else if (this.interpolation === "CUBICSPLINE") {
            const nextValue = this.values[nextIndex + i];
            const previousOutputTangent = this.values[prevIndex + i + 1];
            const nextInputTangent = this.values[nextIndex + i - 1];
            this.weightsBindingInputs[i].value = this.getCubicSplineComponentValue(
              interpolatedTime,
              value,
              nextValue,
              deltaTime * previousOutputTangent[0],
              deltaTime * nextInputTangent[0]
            );
          }
        }
      }
    }
  }

  var __typeError$1 = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck$1 = (obj, member, msg) => member.has(obj) || __typeError$1("Cannot " + msg);
  var __privateGet$1 = (obj, member, getter) => (__accessCheck$1(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd$1 = (obj, member, value) => member.has(obj) ? __typeError$1("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet$1 = (obj, member, value, setter) => (__accessCheck$1(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod$1 = (obj, member, method) => (__accessCheck$1(obj, member, "access private method"), method);
  var _startTime, _currentTime, _deltaTime, _count, _maxCount, _TargetsAnimationsManager_instances, setSiblings_fn;
  class TargetsAnimationsManager {
    /**
     * TargetsAnimationsManager constructor
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link TargetsAnimationsManager}.
     * @param parameters - {@link TargetsAnimationsManagerParams | parameters} used to create this {@link TargetsAnimationsManager}.
     */
    constructor(renderer, { label = "", targets = [] } = {}) {
      __privateAdd$1(this, _TargetsAnimationsManager_instances);
      // inner time values
      /** @ignore */
      __privateAdd$1(this, _startTime);
      /** @ignore */
      __privateAdd$1(this, _currentTime);
      /** @ignore */
      __privateAdd$1(this, _deltaTime);
      /** @ignore */
      __privateAdd$1(this, _count);
      /** @ignore */
      __privateAdd$1(this, _maxCount);
      this.uuid = generateUUID();
      this.inputIndices = [];
      this.setRenderer(renderer);
      this.label = label;
      this.targets = [];
      this.duration = 0;
      this.timeScale = 1;
      __privateSet$1(this, _startTime, performance.now());
      __privateSet$1(this, _currentTime, performance.now());
      __privateSet$1(this, _deltaTime, 0);
      __privateSet$1(this, _count, 0);
      __privateSet$1(this, _count, 0);
      __privateSet$1(this, _maxCount, Infinity);
      this.isPlaying = false;
      this.siblings = /* @__PURE__ */ new Map();
      if (targets && targets.length) {
        this.targets = [...this.targets, ...targets];
      }
    }
    /**
     * Set the current {@link TargetsAnimationsManager.renderer | renderer} to use with this {@link TargetsAnimationsManager}. Can be set to `null` to detach from the current {@link TargetsAnimationsManager.renderer | renderer}.
     * @param renderer
     */
    setRenderer(renderer) {
      if (this.renderer) {
        this.renderer.animations.delete(this.uuid);
        this.renderer.animations.forEach((animation) => animation.siblings.delete(this.uuid));
      }
      if (renderer) {
        renderer = isRenderer(renderer, "TargetsAnimationsManager");
        this.renderer = renderer;
        this.renderer.animations.set(this.uuid, this);
        if (this.inputIndices.length) {
          __privateMethod$1(this, _TargetsAnimationsManager_instances, setSiblings_fn).call(this);
        }
      }
    }
    /**
     * Add a new {@link Target} to the {@link targets} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use for the {@link Target}.
     */
    addTarget(object) {
      const target = {
        object,
        animations: []
      };
      this.targets.push(target);
      return target;
    }
    /**
     * Add new {@link Target | targets} to the {@link targets} array based on an array of {@link Object3D}.
     * @param objects - array of {@link Object3D} to use for the {@link Target | targets}.
     */
    addTargets(objects) {
      objects.forEach((object) => this.addTarget(object));
    }
    /**
     * Add a {@link KeyframesAnimation} to a {@link Target#animations | target animations} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use for the {@link Target}.
     * @param animation - {@link KeyframesAnimation} to add.
     */
    addTargetAnimation(object, animation) {
      this.duration = Math.max(this.duration, animation.duration);
      let target = this.getTargetByObject3D(object);
      if (!target) {
        target = this.addTarget(object);
      }
      target.animations.push(animation);
      if (animation.inputIndex !== null && !this.inputIndices.includes(animation.inputIndex)) {
        this.inputIndices.push(animation.inputIndex);
      }
      __privateMethod$1(this, _TargetsAnimationsManager_instances, setSiblings_fn).call(this);
    }
    /**
     * Get a {@link Target} from the {@link targets} array based on an {@link Object3D}.
     * @param object - {@link Object3D} to use to find the {@link Target}.
     * @returns - {@link Target} found if any.
     */
    getTargetByObject3D(object) {
      return this.targets.find((target) => target.object.object3DIndex === object.object3DIndex);
    }
    /**
     * Get the first animation from the {@link targets} array that matches the {@link Object3D} and {@link KeyframesAnimation#path | path} given.
     * @param object - {@link Object3D} to use to find the {@link KeyframesAnimation}.
     * @param path - {@link KeyframesAnimation#path | path} to use to find the {@link KeyframesAnimation}.
     * @returns - {@link KeyframesAnimation} found if any.
     */
    getAnimationByObject3DAndPath(object, path) {
      const target = this.getTargetByObject3D(object);
      if (target) {
        return target.animations.find((animation) => animation.path === path);
      } else {
        return null;
      }
    }
    /**
     * Play or resume the {@link TargetsAnimationsManager}.
     */
    play() {
      this.isPlaying = true;
    }
    /**
     * Play the {@link TargetsAnimationsManager} once.
     */
    playOnce() {
      __privateSet$1(this, _maxCount, 1);
      this.play();
    }
    /**
     * Pause the {@link TargetsAnimationsManager}.
     */
    pause() {
      this.isPlaying = false;
      __privateSet$1(this, _startTime, -1);
    }
    /**
     * Stop the {@link TargetsAnimationsManager} and reset all the animations values to last keyframe.
     */
    stop() {
      this.isPlaying = false;
      __privateSet$1(this, _count, 0);
      if (!this.siblings.size) {
        __privateSet$1(this, _startTime, 0);
      }
      this.targets.forEach(
        (target) => target.animations.forEach(
          (animation) => animation.update(target.object, Math.min(animation.duration, this.duration))
        )
      );
      this.renderer.onAfterRenderScene.add(
        () => {
          this.targets.forEach((target) => {
            target.animations.forEach((animation) => {
              if (animation.onAfterUpdate) animation.onAfterUpdate();
            });
          });
        },
        {
          once: true
        }
      );
    }
    /**
     * {@link stop | Stop} the {@link TargetsAnimationsManager} at the end of the next animation loop.
     */
    stopAtEndOfLoop() {
      __privateSet$1(this, _maxCount, __privateGet$1(this, _count) + 1);
    }
    /**
     * Update all the {@link targets} animations.
     */
    update() {
      if (!this.isPlaying) return;
      if (__privateGet$1(this, _startTime) === -1) {
        __privateSet$1(this, _startTime, performance.now() - __privateGet$1(this, _deltaTime));
      } else if (__privateGet$1(this, _startTime) === 0) {
        __privateSet$1(this, _startTime, performance.now());
      }
      __privateSet$1(this, _currentTime, performance.now());
      __privateSet$1(this, _deltaTime, __privateGet$1(this, _currentTime) - __privateGet$1(this, _startTime));
      const time = __privateGet$1(this, _deltaTime) * this.timeScale / 1e3;
      const currentTime = time % this.duration;
      __privateSet$1(this, _count, Math.floor(time / this.duration));
      if (__privateGet$1(this, _count) >= __privateGet$1(this, _maxCount)) {
        this.stop();
        return;
      }
      this.targets.forEach(
        (target) => target.animations.forEach((animation) => animation.update(target.object, currentTime))
      );
    }
    /**
     * Call all the {@link targets} animations {@link KeyframesAnimation#onAfterUpdate | onAfterUpdate} callbacks.
     */
    onAfterUpdate() {
      if (!this.isPlaying) return;
      this.targets.forEach(
        (target) => target.animations.forEach((animation) => {
          if (animation.onAfterUpdate) animation.onAfterUpdate();
        })
      );
    }
  }
  _startTime = new WeakMap();
  _currentTime = new WeakMap();
  _deltaTime = new WeakMap();
  _count = new WeakMap();
  _maxCount = new WeakMap();
  _TargetsAnimationsManager_instances = new WeakSet();
  /**
   * Set the {@link TargetsAnimationsManager} siblings by comparing {@link inputIndices} arrays.
   * @private
   */
  setSiblings_fn = function() {
    this.siblings = /* @__PURE__ */ new Map();
    this.renderer.animations.forEach((animation) => {
      if (animation.uuid !== this.uuid && JSON.stringify(animation.inputIndices) === JSON.stringify(this.inputIndices)) {
        this.siblings.set(animation.uuid, animation);
        animation.siblings.set(this.uuid, this);
      } else {
        animation.siblings.delete(this.uuid);
      }
    });
  };

  var __typeError = (msg) => {
    throw TypeError(msg);
  };
  var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
  var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
  var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), member.set(obj, value), value);
  var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);
  var _primitiveInstances, _GLTFScenesManager_instances, getAccessorArray_fn, getSparseAccessorIndicesAndValues_fn, parsePrimitiveProperty_fn;
  const GL$1 = typeof window !== "undefined" && WebGLRenderingContext || {
    BYTE: 5120,
    UNSIGNED_BYTE: 5121,
    SHORT: 5122,
    UNSIGNED_SHORT: 5123,
    UNSIGNED_INT: 5125,
    FLOAT: 5126,
    TRIANGLES: 4,
    TRIANGLE_STRIP: 5,
    LINES: 1,
    LINE_STRIP: 3,
    POINTS: 0,
    CLAMP_TO_EDGE: 33071,
    MIRRORED_REPEAT: 33648,
    NEAREST: 9728,
    LINEAR: 9729,
    LINEAR_MIPMAP_NEAREST: 9985,
    NEAREST_MIPMAP_LINEAR: 9986,
    LINEAR_MIPMAP_LINEAR: 9987
  };
  const _GLTFScenesManager = class _GLTFScenesManager {
    /**
     * {@link GLTFScenesManager} constructor.
     * @param parameters - parameters used to create our {@link GLTFScenesManager}.
     * @param parameters.renderer - our {@link CameraRenderer} class object.
     * @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
     */
    constructor({ renderer, gltf }) {
      __privateAdd(this, _GLTFScenesManager_instances);
      /** The {@link PrimitiveInstances} Map, to group similar {@link LitMesh} by instances. */
      __privateAdd(this, _primitiveInstances);
      renderer = isCameraRenderer(renderer, "GLTFScenesManager");
      this.renderer = renderer;
      this.gltf = gltf;
      __privateSet(this, _primitiveInstances, /* @__PURE__ */ new Map());
      this.scenesManager = {
        node: new Object3D(),
        nodes: /* @__PURE__ */ new Map(),
        boundingBox: new Box3(),
        samplers: [],
        materialsTextures: [],
        materialsParams: [],
        scenes: [],
        meshes: [],
        meshesDescriptors: [],
        animations: [],
        cameras: [],
        skins: [],
        lights: []
      };
      this.createSamplers();
      this.createMaterialTextures();
      this.createMaterialsParams();
      this.createLights();
      this.createAnimations();
      this.createScenes();
    }
    /**
     * Get an attribute type, bufferFormat and size from its {@link GLTF.AccessorType | accessor type}.
     * @param type - {@link GLTF.AccessorType | accessor type} to use.
     * @returns - corresponding type, bufferFormat and size.
     */
    static getVertexAttributeParamsFromType(type) {
      switch (type) {
        case "VEC2":
          return {
            type: "vec2f",
            bufferFormat: "float32x2",
            size: 2
          };
        case "VEC3":
          return {
            type: "vec3f",
            bufferFormat: "float32x3",
            size: 3
          };
        case "VEC4":
          return {
            type: "vec4f",
            bufferFormat: "float32x4",
            size: 4
          };
        case "MAT2":
          return {
            type: "mat2x2f",
            bufferFormat: "float32x2",
            // not used
            size: 6
          };
        case "MAT3":
          return {
            type: "mat3x3f",
            bufferFormat: "float32x3",
            // not used
            size: 9
          };
        case "MAT4":
          return {
            type: "mat4x4f",
            bufferFormat: "float32x4",
            // not used
            size: 16
          };
        case "SCALAR":
        default:
          return {
            type: "f32",
            bufferFormat: "float32",
            size: 1
          };
      }
    }
    /**
     * Get the corresponding typed array constructor based on the {@link GLTF.AccessorComponentType | accessor component type}.
     * @param componentType - {@link GLTF.AccessorComponentType | accessor component type} to use.
     * @returns - corresponding typed array constructor.
     */
    static getTypedArrayConstructorFromComponentType(componentType) {
      switch (componentType) {
        case GL$1.BYTE:
          return Int8Array;
        case GL$1.UNSIGNED_BYTE:
          return Uint8Array;
        case GL$1.SHORT:
          return Int16Array;
        case GL$1.UNSIGNED_SHORT:
          return Uint16Array;
        case GL$1.UNSIGNED_INT:
          return Uint32Array;
        case GL$1.FLOAT:
        // GL.FLOAT
        default:
          return Float32Array;
      }
    }
    /**
     * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#topology | GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
     * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
     * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#topology | GPUPrimitiveTopology}.
     */
    static gpuPrimitiveTopologyForMode(mode) {
      switch (mode) {
        case GL$1.TRIANGLES:
          return "triangle-list";
        case GL$1.TRIANGLE_STRIP:
          return "triangle-strip";
        case GL$1.LINES:
          return "line-list";
        case GL$1.LINE_STRIP:
          return "line-strip";
        case GL$1.POINTS:
          return "point-list";
      }
    }
    /**
     * Get the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler#addressmodeu | GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
     * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
     * @returns - corresponding {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createSampler#addressmodeu | GPUAddressMode}.
     */
    static gpuAddressModeForWrap(wrap) {
      switch (wrap) {
        case GL$1.CLAMP_TO_EDGE:
          return "clamp-to-edge";
        case GL$1.MIRRORED_REPEAT:
          return "mirror-repeat";
        default:
          return "repeat";
      }
    }
    /**
     * Create the {@link scenesManager} {@link TargetsAnimationsManager} if any animation is present in the {@link gltf}.
     */
    createAnimations() {
      this.gltf.animations?.forEach((animation, index) => {
        this.scenesManager.animations.push(
          new TargetsAnimationsManager(this.renderer, {
            label: animation.name ?? "Animation " + index
          })
        );
      });
    }
    /**
     * Create the {@link ScenesManager.lights | lights} defined by the `KHR_lights_punctual` extension if any.
     */
    createLights() {
      if (this.gltf.extensions && this.gltf.extensions["KHR_lights_punctual"]) {
        for (const light of this.gltf.extensions["KHR_lights_punctual"].lights) {
          if (light.type === "spot") {
            const innerConeAngle = light.spot.innerConeAngle !== void 0 ? light.spot.innerConeAngle : 0;
            const outerConeAngle = light.spot.outerConeAngle !== void 0 ? light.spot.outerConeAngle : Math.PI / 4;
            this.scenesManager.lights.push(
              new SpotLight(this.renderer, {
                ...light.name !== void 0 && { label: light.name },
                color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
                intensity: light.intensity !== void 0 ? light.intensity : 1,
                range: light.range !== void 0 ? light.range : 0,
                angle: outerConeAngle,
                penumbra: 1 - innerConeAngle / outerConeAngle
              })
            );
          } else if (light.type === "directional") {
            this.scenesManager.lights.push(
              new DirectionalLight(this.renderer, {
                ...light.name !== void 0 && { label: light.name },
                color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
                intensity: light.intensity !== void 0 ? light.intensity : 1
              })
            );
          } else if (light.type === "point") {
            this.scenesManager.lights.push(
              new PointLight(this.renderer, {
                ...light.name !== void 0 && { label: light.name },
                color: light.color !== void 0 ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
                intensity: light.intensity !== void 0 ? light.intensity : 1,
                range: light.range !== void 0 ? light.range : 0
              })
            );
          }
        }
      }
    }
    /**
     * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
     */
    createSamplers() {
      if (this.gltf.samplers) {
        for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
          const descriptor = {
            label: "glTF sampler " + index,
            name: "gltfSampler" + index,
            // TODO better name?
            addressModeU: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
            addressModeV: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT)
          };
          if (!sampler.magFilter || sampler.magFilter === GL$1.LINEAR) {
            descriptor.magFilter = "linear";
          }
          switch (sampler.minFilter) {
            case GL$1.NEAREST:
              break;
            case GL$1.LINEAR:
            case GL$1.LINEAR_MIPMAP_NEAREST:
              descriptor.minFilter = "linear";
              break;
            case GL$1.NEAREST_MIPMAP_LINEAR:
              descriptor.mipmapFilter = "linear";
              break;
            case GL$1.LINEAR_MIPMAP_LINEAR:
            default:
              descriptor.minFilter = "linear";
              descriptor.mipmapFilter = "linear";
              break;
          }
          this.scenesManager.samplers.push(new Sampler(this.renderer, descriptor));
        }
      } else {
        this.scenesManager.samplers.push(
          new Sampler(this.renderer, {
            label: "Default sampler",
            name: "defaultSampler",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear"
          })
        );
      }
    }
    /**
     * Create a {@link MediaTexture} based on the options.
     * @param material - material using that texture.
     * @param image - image source of the texture.
     * @param name - name of the texture.
     * @param useTransform - Whether the {@link MediaTexture} should handle transformations.
     * @returns - newly created {@link MediaTexture}.
     */
    createTexture(material, image, name, useTransform = false) {
      const format = (() => {
        switch (name) {
          case "baseColorTexture":
          case "emissiveTexture":
          case "specularTexture":
          case "specularColorTexture":
            return "rgba8unorm-srgb";
          case "occlusionTexture":
          case "transmissionTexture":
            return "r8unorm";
          case "thicknessTexture":
            return "rg8unorm";
          default:
            return "rgba8unorm";
        }
      })();
      const texture = new MediaTexture(this.renderer, {
        label: material.name ? material.name + ": " + name : name,
        name,
        format,
        visibility: ["fragment"],
        generateMips: true,
        // generate mips by default
        fixedSize: {
          width: image.width,
          height: image.height
        },
        useTransform
      });
      texture.useImageBitmap(image);
      return texture;
    }
    /**
     * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTextureDescriptor | MaterialTextureDescriptor} and their respective {@link Texture}.
     */
    createMaterialTextures() {
      this.scenesManager.materialsTextures = [];
      const createdTextures = [];
      if (this.gltf.materials) {
        for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
          const materialTextures = {
            material: materialIndex,
            texturesDescriptors: []
          };
          const getUVAttributeName = (texture) => {
            if (!texture.texCoord) return "uv";
            return texture.texCoord !== 0 ? "uv" + texture.texCoord : "uv";
          };
          const createTexture = (gltfTextureInfo, name) => {
            const index = gltfTextureInfo.index;
            const gltfTexture = this.gltf.textures[index];
            const source = gltfTexture.extensions && gltfTexture.extensions["EXT_texture_webp"] ? gltfTexture.extensions["EXT_texture_webp"].source : gltfTexture.source;
            const samplerIndex = this.gltf.textures.find((t) => {
              const src = t.extensions && t.extensions["EXT_texture_webp"] ? t.extensions["EXT_texture_webp"].source : t.source;
              return src === index;
            })?.sampler;
            const sampler = this.scenesManager.samplers[samplerIndex ?? 0];
            const textureTransform = gltfTextureInfo.extensions && gltfTextureInfo.extensions["KHR_texture_transform"];
            const texCoordAttributeName = getUVAttributeName(
              textureTransform && textureTransform.texCoord !== void 0 ? textureTransform : gltfTextureInfo
            );
            const hasTexture = createdTextures.find((createdTexture) => createdTexture.index === index);
            if (hasTexture) {
              const reusedTexture = new MediaTexture(this.renderer, {
                label: material.name ? material.name + ": " + name : name,
                name,
                visibility: ["fragment"],
                generateMips: true,
                // generate mips by default
                fromTexture: hasTexture.texture,
                ...textureTransform && { useTransform: true }
              });
              if (textureTransform) {
                const { offset, rotation, scale } = textureTransform;
                if (offset !== void 0) reusedTexture.offset.set(offset[0], offset[1]);
                if (rotation !== void 0) reusedTexture.rotation = rotation;
                if (scale !== void 0) reusedTexture.scale.set(scale[0], scale[1]);
              }
              materialTextures.texturesDescriptors.push({
                texture: reusedTexture,
                sampler,
                texCoordAttributeName
              });
              return;
            }
            const image = this.gltf.imagesBitmaps[source];
            const texture = this.createTexture(material, image, name, !!textureTransform);
            if (textureTransform) {
              const { offset, rotation, scale } = textureTransform;
              if (offset !== void 0) texture.offset.set(offset[0], offset[1]);
              if (rotation !== void 0) texture.rotation = rotation;
              if (scale !== void 0) texture.scale.set(scale[0], scale[1]);
            }
            materialTextures.texturesDescriptors.push({
              texture,
              sampler,
              texCoordAttributeName
            });
            createdTextures.push({
              index,
              texture
            });
          };
          this.scenesManager.materialsTextures[materialIndex] = materialTextures;
          if (material.pbrMetallicRoughness) {
            if (material.pbrMetallicRoughness.baseColorTexture && material.pbrMetallicRoughness.baseColorTexture.index !== void 0) {
              createTexture(material.pbrMetallicRoughness.baseColorTexture, "baseColorTexture");
            }
            if (material.pbrMetallicRoughness.metallicRoughnessTexture && material.pbrMetallicRoughness.metallicRoughnessTexture.index !== void 0) {
              createTexture(material.pbrMetallicRoughness.metallicRoughnessTexture, "metallicRoughnessTexture");
            }
          }
          if (material.normalTexture && material.normalTexture.index !== void 0) {
            createTexture(material.normalTexture, "normalTexture");
          }
          if (material.occlusionTexture && material.occlusionTexture.index !== void 0) {
            createTexture(material.occlusionTexture, "occlusionTexture");
          }
          if (material.emissiveTexture && material.emissiveTexture.index !== void 0) {
            createTexture(material.emissiveTexture, "emissiveTexture");
          }
          const { extensions } = material;
          const transmission = extensions && extensions.KHR_materials_transmission || null;
          const specular = extensions && extensions.KHR_materials_specular || null;
          const volume = extensions && extensions.KHR_materials_volume || null;
          if (transmission && transmission.transmissionTexture && transmission.transmissionTexture.index !== void 0) {
            createTexture(transmission.transmissionTexture, "transmissionTexture");
          }
          if (specular && (specular.specularTexture || specular.specularColorTexture)) {
            const { specularTexture, specularColorTexture } = specular;
            if (specularTexture && specularColorTexture) {
              if (specularTexture.index !== void 0 && specularColorTexture.index !== void 0 && specularTexture.index === specularColorTexture.index) {
                createTexture(specular.specularTexture, "specularTexture");
              } else {
                if (specularTexture && specularTexture.index !== void 0) {
                  createTexture(specular.specularTexture, "specularFactorTexture");
                }
                if (specularColorTexture && specularColorTexture.index !== void 0) {
                  createTexture(specular.specularColorTexture, "specularColorTexture");
                }
              }
            }
          }
          if (volume && volume.thicknessTexture && volume.thicknessTexture.index !== void 0) {
            createTexture(volume.thicknessTexture, "thicknessTexture");
          }
        }
      }
    }
    /**
     * Get the {@link MeshDescriptorMaterialParams} for a given {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
     * @param materialIndex - {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
     * @param label - Optional label to use for the {@link RenderMaterial} created.
     * @returns - Created {@link MeshDescriptorMaterialParams}.
     */
    getMaterialBaseParameters(materialIndex, label = null) {
      const materialParams = {};
      const material = this.gltf.materials && this.gltf.materials[materialIndex] || {};
      if (label) {
        materialParams.label = label + (material.name ? " " + material.name : "");
      } else if (material.name) {
        materialParams.label = material.name;
      }
      const { extensions } = material;
      const dispersion = extensions && extensions.KHR_materials_dispersion || null;
      const emissiveStrength = extensions && extensions.KHR_materials_emissive_strength || null;
      const ior = extensions && extensions.KHR_materials_ior || null;
      const transmission = extensions && extensions.KHR_materials_transmission || null;
      const specular = extensions && extensions.KHR_materials_specular || null;
      const volume = extensions && extensions.KHR_materials_volume || null;
      const litMeshMaterialParams = {
        colorSpace: "linear",
        color: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? new Vec3(
          material.pbrMetallicRoughness.baseColorFactor[0],
          material.pbrMetallicRoughness.baseColorFactor[1],
          material.pbrMetallicRoughness.baseColorFactor[2]
        ) : new Vec3(1),
        opacity: material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== void 0 ? material.pbrMetallicRoughness.baseColorFactor[3] : 1,
        alphaCutoff: material.alphaCutoff !== void 0 ? material.alphaCutoff : material.alphaMode === "MASK" ? 0.5 : 0,
        metallic: material.pbrMetallicRoughness?.metallicFactor === void 0 ? 1 : material.pbrMetallicRoughness.metallicFactor,
        roughness: material.pbrMetallicRoughness?.roughnessFactor === void 0 ? 1 : material.pbrMetallicRoughness.roughnessFactor,
        normalScale: material.normalTexture?.scale === void 0 ? new Vec2(1) : new Vec2(material.normalTexture.scale),
        occlusionIntensity: material.occlusionTexture?.strength === void 0 ? 1 : material.occlusionTexture.strength,
        emissiveIntensity: emissiveStrength && emissiveStrength.emissiveStrength !== void 0 ? emissiveStrength.emissiveStrength : 1,
        emissiveColor: material.emissiveFactor !== void 0 ? new Vec3(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2]) : new Vec3(0),
        specularIntensity: specular && specular.specularFactor !== void 0 ? specular.specularFactor : 1,
        specularColor: specular && specular.specularColorFactor !== void 0 ? new Vec3(specular.specularColorFactor[0], specular.specularColorFactor[1], specular.specularColorFactor[2]) : new Vec3(1),
        transmission: transmission && transmission.transmissionFactor !== void 0 ? transmission.transmissionFactor : 0,
        ior: ior && ior.ior !== void 0 ? ior.ior : 1.5,
        dispersion: dispersion && dispersion.dispersion !== void 0 ? dispersion.dispersion : 0,
        thickness: volume && volume.thicknessFactor !== void 0 ? volume.thicknessFactor : 0,
        attenuationDistance: volume && volume.attenuationDistance !== void 0 ? volume.attenuationDistance : Infinity,
        attenuationColor: volume && volume.attenuationColor !== void 0 ? new Vec3(volume.attenuationColor[0], volume.attenuationColor[1], volume.attenuationColor[2]) : new Vec3(1)
      };
      materialParams.material = litMeshMaterialParams;
      materialParams.cullMode = material.doubleSided ? "none" : "back";
      if (material.alphaMode === "BLEND") {
        materialParams.transparent = true;
        materialParams.targets = [
          {
            blend: {
              color: {
                srcFactor: "src-alpha",
                dstFactor: "one-minus-src-alpha"
              },
              alpha: {
                // This just prevents the canvas from having alpha "holes" in it.
                srcFactor: "one",
                dstFactor: "one"
              }
            }
          }
        ];
      }
      return materialParams;
    }
    /**
     * Create all the {@link MeshDescriptorMaterialParams} from the {@link GLTF.IMaterial | glTF materials}.
     */
    createMaterialsParams() {
      this.gltf.materials?.forEach((material, index) => {
        this.scenesManager.materialsParams.push(this.getMaterialBaseParameters(index));
      });
    }
    /**
     * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | glTF Node}
     * @param parent - parent {@link ChildDescriptor} to use.
     * @param node - {@link GLTF.INode | glTF Node} to use.
     * @param index - Index of the {@link GLTF.INode | glTF Node} to use.
     */
    createNode(parent, node, index) {
      const child = {
        index,
        name: node.name,
        node: new Object3D(),
        children: []
      };
      this.scenesManager.nodes.set(index, child.node);
      parent.children.push(child);
      child.node.parent = parent.node;
      if (node.matrix) {
        child.node.modelMatrix.setFromArray(new Float32Array(node.matrix));
        child.node.matrices.model.shouldUpdate = false;
      } else {
        if (node.translation) child.node.position.set(node.translation[0], node.translation[1], node.translation[2]);
        if (node.scale) child.node.scale.set(node.scale[0], node.scale[1], node.scale[2]);
        if (node.rotation) child.node.quaternion.setFromArray(new Float32Array(node.rotation));
      }
      if (node.children) {
        node.children.forEach((childNodeIndex) => {
          const childNode = this.gltf.nodes[childNodeIndex];
          this.createNode(child, childNode, childNodeIndex);
        });
      }
      let instancesDescriptor = null;
      if (node.mesh !== void 0) {
        let instanceAttributes = null;
        if (node.extensions && node.extensions.EXT_mesh_gpu_instancing) {
          const { attributes } = node.extensions.EXT_mesh_gpu_instancing;
          instanceAttributes = {
            count: 0,
            nodesTransformations: {}
          };
          for (const attribute of Object.entries(attributes)) {
            const accessor = this.gltf.accessors[attribute[1]];
            const attributeValues = __privateMethod(this, _GLTFScenesManager_instances, getAccessorArray_fn).call(this, accessor);
            instanceAttributes.count = accessor.count;
            instanceAttributes.nodesTransformations[attribute[0].toLowerCase()] = attributeValues;
          }
        }
        const mesh = this.gltf.meshes[node.mesh];
        mesh.primitives.forEach((primitive, primitiveIndex) => {
          const meshDescriptor = {
            parent: child.node,
            texturesDescriptors: [],
            variantName: "Default",
            parameters: {
              label: mesh.name ? mesh.name + " " + primitiveIndex : "glTF mesh " + primitiveIndex
            },
            nodes: [],
            extensionsUsed: [],
            alternateDescriptors: /* @__PURE__ */ new Map(),
            alternateMaterials: /* @__PURE__ */ new Map()
          };
          instancesDescriptor = __privateGet(this, _primitiveInstances).get(primitive);
          if (!instancesDescriptor) {
            instancesDescriptor = {
              instances: [],
              // instances
              nodes: [],
              // node transform
              meshDescriptor
            };
            __privateGet(this, _primitiveInstances).set(primitive, instancesDescriptor);
          }
          instancesDescriptor.instances.push(node);
          instancesDescriptor.nodes.push(child.node);
          if (instanceAttributes && instanceAttributes.count) {
            for (let i = 0; i < instanceAttributes.count; i++) {
              const instanceNode = new Object3D();
              if (instanceAttributes.nodesTransformations) {
                const { translation, scale, rotation } = instanceAttributes.nodesTransformations;
                if (translation) {
                  instanceNode.position.set(translation[i * 3], translation[i * 3 + 1], translation[i * 3 + 2]);
                }
                if (scale) {
                  instanceNode.scale.set(scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2]);
                }
                if (rotation) {
                  instanceNode.quaternion.setFromArray(
                    Float32Array.from([rotation[i * 4], rotation[i * 4 + 1], rotation[i * 4 + 2], rotation[i * 4 + 3]])
                  );
                }
              }
              instanceNode.parent = child.node;
              instancesDescriptor.instances.push(node);
              instancesDescriptor.nodes.push(instanceNode);
            }
          }
        });
      }
      if (node.extensions && node.extensions.KHR_lights_punctual) {
        const light = this.scenesManager.lights[node.extensions.KHR_lights_punctual.light];
        light.position.set(0, 0, 0);
        if (light instanceof DirectionalLight || light instanceof SpotLight) {
          light.target.set(0, 0, -1);
        }
        light.parent = child.node;
      }
      if (node.camera !== void 0) {
        const gltfCamera = this.gltf.cameras[node.camera];
        if (gltfCamera.type === "perspective") {
          let width, height;
          if (gltfCamera.perspective.aspectRatio !== void 0) {
            const minSize = Math.min(this.renderer.boundingRect.width, this.renderer.boundingRect.height);
            width = minSize / gltfCamera.perspective.aspectRatio;
            height = minSize * gltfCamera.perspective.aspectRatio;
          } else {
            width = this.renderer.boundingRect.width;
            height = this.renderer.boundingRect.height;
          }
          const fov = gltfCamera.perspective.yfov * 180 / Math.PI;
          const camera = new PerspectiveCamera({
            fov,
            near: gltfCamera.perspective.znear,
            far: gltfCamera.perspective.zfar,
            width,
            height,
            pixelRatio: this.renderer.pixelRatio,
            ...gltfCamera.perspective.aspectRatio !== void 0 && { forceAspect: gltfCamera.perspective.aspectRatio }
          });
          camera.parent = child.node;
          this.scenesManager.cameras.push(camera);
        } else if (gltfCamera.type === "orthographic") {
          const camera = new OrthographicCamera({
            near: gltfCamera.orthographic.znear,
            far: gltfCamera.orthographic.zfar,
            left: -gltfCamera.orthographic.xmag,
            right: gltfCamera.orthographic.xmag,
            top: gltfCamera.orthographic.ymag,
            bottom: -gltfCamera.orthographic.ymag
          });
          camera.parent = child.node;
          this.scenesManager.cameras.push(camera);
        }
      }
      if (this.gltf.animations) {
        this.scenesManager.animations.forEach((targetsAnimation, i) => {
          const animation = this.gltf.animations[i];
          const channels = animation.channels.filter((channel) => channel.target.node === index);
          if (channels && channels.length) {
            targetsAnimation.addTarget(child.node);
            channels.forEach((channel) => {
              const sampler = animation.samplers[channel.sampler];
              const path = channel.target.path;
              const inputAccessor = this.gltf.accessors[sampler.input];
              const keyframes = __privateMethod(this, _GLTFScenesManager_instances, getAccessorArray_fn).call(this, inputAccessor);
              const outputAccessor = this.gltf.accessors[sampler.output];
              const values = __privateMethod(this, _GLTFScenesManager_instances, getAccessorArray_fn).call(this, outputAccessor);
              const animName = node.name ? `${node.name} animation` : `${channel.target.path} animation ${index}`;
              const keyframesAnimation = new KeyframesAnimation({
                label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
                inputIndex: sampler.input,
                keyframes,
                values,
                path,
                interpolation: sampler.interpolation
              });
              targetsAnimation.addTargetAnimation(child.node, keyframesAnimation);
            });
          }
        });
      }
    }
    /**
     * Get a clean attribute name based on a glTF attribute name.
     * @param gltfAttributeName - glTF attribute name.
     * @returns - Attribute name conform to our expectations.
     */
    static getCleanAttributeName(gltfAttributeName) {
      return gltfAttributeName === "TEXCOORD_0" ? "uv" : gltfAttributeName.replace("_", "").replace("TEXCOORD", "uv").toLowerCase();
    }
    /**
     * Sort an array of {@link VertexBufferAttributeParams} by an array of attribute names.
     * @param attributesNames - array of attribute names to use for sorting.
     * @param attributes - {@link VertexBufferAttributeParams} array to sort.
     */
    sortAttributesByNames(attributesNames, attributes) {
      attributes.sort((a, b) => {
        let aIndex = attributesNames.findIndex((attrName) => attrName === a.name);
        aIndex = aIndex === -1 ? Infinity : aIndex;
        let bIndex = attributesNames.findIndex((attrName) => attrName === b.name);
        bIndex = bIndex === -1 ? Infinity : bIndex;
        return aIndex - bIndex;
      });
    }
    /**
     * Create the mesh {@link Geometry} based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
     * @param primitive - {@link gltf} primitive to use to create the {@link Geometry}.
     * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the {@link Geometry}.
     */
    createGeometry(primitive, primitiveInstance) {
      const { instances, meshDescriptor } = primitiveInstance;
      const geometryBBox = new Box3();
      for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
        if (attribName === "POSITION") {
          const accessor = this.gltf.accessors[accessorIndex];
          if (geometryBBox) {
            geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]));
            geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]));
          }
        }
      }
      let defaultAttributes = [];
      let interleavedArray = __privateMethod(this, _GLTFScenesManager_instances, parsePrimitiveProperty_fn).call(this, primitive.attributes, defaultAttributes);
      const isIndexedGeometry = "indices" in primitive;
      let indicesArray = null;
      let indicesConstructor = null;
      if (isIndexedGeometry) {
        const accessor = this.gltf.accessors[primitive.indices];
        const bufferView = this.gltf.bufferViews[accessor.bufferView];
        indicesConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
        const bytesPerElement = indicesConstructor.name === "Uint8Array" ? Uint16Array.BYTES_PER_ELEMENT : indicesConstructor.BYTES_PER_ELEMENT;
        const arrayOffset = accessor.byteOffset + bufferView.byteOffset;
        const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer];
        const arrayLength = Math.ceil(accessor.count / bytesPerElement) * bytesPerElement;
        indicesArray = indicesConstructor.name === "Uint8Array" ? Uint16Array.from(new indicesConstructor(arrayBuffer, arrayOffset, arrayLength)) : new indicesConstructor(arrayBuffer, arrayOffset, arrayLength);
        if (accessor.sparse) {
          const { indices, values } = __privateMethod(this, _GLTFScenesManager_instances, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
          for (let i = 0; i < indices.length; i++) {
            indicesArray[indices[i]] = values[i];
          }
        }
      }
      const hasNormal = defaultAttributes.find((attribute) => attribute.name === "normal");
      if (!hasNormal) {
        defaultAttributes = defaultAttributes.filter((attr) => attr.name !== "tangent");
        interleavedArray = null;
      }
      if (!interleavedArray) {
        this.sortAttributesByNames(["position", "uv", "normal"], defaultAttributes);
      }
      const geometryAttributes = {
        instancesCount: instances.length,
        topology: _GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode),
        vertexBuffers: [
          {
            name: "attributes",
            stepMode: "vertex",
            // explicitly set the stepMode even if not mandatory
            attributes: defaultAttributes,
            ...interleavedArray && { array: interleavedArray }
            // interleaved array!
          }
        ]
      };
      const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry;
      meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes);
      if (isIndexedGeometry && indicesConstructor && indicesArray) {
        meshDescriptor.parameters.geometry.setIndexBuffer({
          bufferFormat: indicesConstructor.name === "Uint32Array" ? "uint32" : "uint16",
          array: indicesArray
        });
      }
      if (!hasNormal) {
        meshDescriptor.parameters.geometry.computeGeometry();
      }
      meshDescriptor.parameters.geometry.boundingBox = geometryBBox;
    }
    /**
     * Create the {@link SkinDefinition | skins definitions} for each {@link gltf} skins.
     */
    createSkins() {
      if (this.gltf.skins) {
        this.gltf.skins.forEach((skin, skinIndex) => {
          const skinnedMeshNode = this.gltf.nodes.find(
            (node) => node.skin !== void 0 && node.mesh !== void 0 && node.skin === skinIndex
          );
          const meshIndex = skinnedMeshNode.mesh;
          let matrices;
          if (skin.inverseBindMatrices) {
            const matricesAccessor = this.gltf.accessors[skin.inverseBindMatrices];
            matrices = __privateMethod(this, _GLTFScenesManager_instances, getAccessorArray_fn).call(this, matricesAccessor);
          } else {
            matrices = new Float32Array(16 * skin.joints.length);
            for (let i = 0; i < skin.joints.length * 16; i += 16) {
              matrices[i] = 1;
              matrices[i + 5] = 1;
              matrices[i + 10] = 1;
              matrices[i + 15] = 1;
            }
          }
          const binding = new BufferBinding({
            label: "Skin " + skinIndex,
            name: "skin" + skinIndex,
            bindingType: "storage",
            visibility: ["vertex"],
            childrenBindings: [
              {
                binding: new BufferBinding({
                  label: "Joints " + skinIndex,
                  name: "joints",
                  bindingType: "storage",
                  visibility: ["vertex"],
                  struct: {
                    jointMatrix: {
                      type: "mat4x4f",
                      value: new Float32Array(16)
                    },
                    normalMatrix: {
                      type: "mat4x4f",
                      value: new Float32Array(16)
                    }
                  }
                }),
                count: skin.joints.length,
                forceArray: true
                // needs to be always iterable
              }
            ]
          });
          for (let i = 0; i < skin.joints.length; i++) {
            for (let j = 0; j < 16; j++) {
              binding.childrenBindings[i].inputs.jointMatrix.value[j] = matrices[i * 16 + j];
              binding.childrenBindings[i].inputs.normalMatrix.value[j] = matrices[i * 16 + j];
            }
            binding.childrenBindings[i].inputs.jointMatrix.shouldUpdate = true;
            binding.childrenBindings[i].inputs.normalMatrix.shouldUpdate = true;
          }
          const joints = skin.joints.map((joint) => this.scenesManager.nodes.get(joint));
          const jointMatrix = new Mat4();
          const normalMatrix = new Mat4();
          const parentNodeIndex = this.gltf.nodes.findIndex(
            (node) => node.mesh !== void 0 && node.skin !== void 0 && node.mesh === meshIndex
          );
          if (parentNodeIndex !== -1) {
            const parentNode = this.scenesManager.nodes.get(parentNodeIndex);
            const parentInverseWorldMatrix = new Mat4();
            const _updateWorldMatrix = parentNode.updateWorldMatrix.bind(parentNode);
            parentNode.updateWorldMatrix = (updateParents, updateChildren) => {
              _updateWorldMatrix(updateParents, updateChildren);
              parentInverseWorldMatrix.copy(parentNode.worldMatrix).invert();
            };
            if (this.scenesManager.animations.length) {
              for (const animation of this.scenesManager.animations) {
                joints.forEach((object, jointIndex) => {
                  const updateJointMatrix = () => {
                    if (animation.isPlaying) {
                      jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
                    } else {
                      jointMatrix.identity();
                    }
                    normalMatrix.copy(jointMatrix).invert().transpose();
                    for (let i = 0; i < 16; i++) {
                      binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i];
                      binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i];
                    }
                    binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true;
                    binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true;
                  };
                  const node = this.gltf.nodes[jointIndex];
                  const animName = node.name ? `${node.name} skin animation` : `skin animation ${jointIndex}`;
                  const emptyAnimation = new KeyframesAnimation({
                    label: animation.label ? `${animation.label} ${animName}` : `Animation ${animName}`
                  });
                  emptyAnimation.onAfterUpdate = updateJointMatrix;
                  animation.addTargetAnimation(object, emptyAnimation);
                });
              }
            } else {
              joints.forEach((object, jointIndex) => {
                jointMatrix.setFromArray(matrices, jointIndex * 16).premultiply(object.worldMatrix).premultiply(parentInverseWorldMatrix);
                normalMatrix.copy(jointMatrix).invert().transpose();
                for (let i = 0; i < 16; i++) {
                  binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i];
                  binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i];
                }
                binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true;
                binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true;
              });
            }
            this.scenesManager.skins.push({
              parentNode,
              joints,
              inverseBindMatrices: matrices,
              jointMatrix,
              normalMatrix,
              parentInverseWorldMatrix,
              binding
            });
          }
        });
      }
    }
    /**
     * Create the mesh material parameters based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
     * @param primitive - {@link gltf} primitive to use to create the material parameters.
     * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the material parameters.
     */
    createMaterial(primitive, primitiveInstance) {
      const { instances, nodes, meshDescriptor } = primitiveInstance;
      const instancesCount = instances.length;
      const meshIndex = instances[0].mesh;
      if (primitive.targets) {
        const bindings = [];
        const weights = this.gltf.meshes[meshIndex].weights;
        let weightAnimation;
        for (const animation of this.scenesManager.animations) {
          weightAnimation = animation.getAnimationByObject3DAndPath(meshDescriptor.parent, "weights");
          if (weightAnimation) break;
        }
        primitive.targets.forEach((target, index) => {
          const targetAttributes = [];
          __privateMethod(this, _GLTFScenesManager_instances, parsePrimitiveProperty_fn).call(this, target, targetAttributes);
          const struct = targetAttributes.reduce(
            (acc, attribute) => {
              return acc = {
                ...acc,
                ...{
                  [attribute.name]: {
                    type: `array<${attribute.type}>`,
                    value: attribute.array
                  }
                }
              };
            },
            {
              weight: {
                type: "f32",
                value: weights && weights.length ? weights[index] : 0
              }
            }
          );
          const targetBinding = new BufferBinding({
            label: "Morph target " + index,
            name: "morphTarget" + index,
            bindingType: "storage",
            visibility: ["vertex"],
            struct
          });
          if (weightAnimation) {
            weightAnimation.addWeightBindingInput(targetBinding.inputs.weight);
          }
          bindings.push(targetBinding);
        });
        if (!meshDescriptor.parameters.bindings) {
          meshDescriptor.parameters.bindings = [];
        }
        meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, ...bindings];
      }
      if (this.gltf.skins) {
        this.gltf.skins.forEach((skin, skinIndex) => {
          if (!meshDescriptor.parameters.bindings) {
            meshDescriptor.parameters.bindings = [];
          }
          instances.forEach((node, instanceIndex) => {
            if (node.skin !== void 0 && node.skin === skinIndex) {
              const skinDef = this.scenesManager.skins[skinIndex];
              meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, skinDef.binding];
              if (instanceIndex > 0) {
                const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone();
                const tempMat4 = new Mat4();
                skinDef.joints.forEach((object, jointIndex) => {
                  tempMat4.setFromArray(skinDef.inverseBindMatrices, jointIndex * 16);
                  const transformedBbox = tempBbox.applyMat4(tempMat4).applyMat4(object.worldMatrix);
                  this.scenesManager.boundingBox.min.min(transformedBbox.min);
                  this.scenesManager.boundingBox.max.max(transformedBbox.max);
                });
              }
            }
          });
        });
      }
      const defaultMaterialParams = this.scenesManager.materialsParams[primitive.material];
      const materialTextures = this.scenesManager.materialsTextures[primitive.material];
      meshDescriptor.texturesDescriptors = materialTextures?.texturesDescriptors || [];
      meshDescriptor.parameters = { ...meshDescriptor.parameters, ...defaultMaterialParams };
      const material = this.gltf.materials && this.gltf.materials[primitive.material] || {};
      const { extensions } = material;
      if (extensions) {
        for (const extension of Object.keys(extensions)) {
          if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) {
            meshDescriptor.extensionsUsed.push(extension);
          } else {
            meshDescriptor.extensionsUsed.push(extension);
          }
        }
      }
      const dispersion = extensions && extensions.KHR_materials_dispersion || null;
      const transmission = extensions && extensions.KHR_materials_transmission || null;
      const volume = extensions && extensions.KHR_materials_volume || null;
      const hasTransmission = transmission || volume || dispersion;
      const useTransmission = this.gltf.extensionsUsed && (this.gltf.extensionsUsed.includes("KHR_materials_transmission") || this.gltf.extensionsUsed.includes("KHR_materials_volume") || this.gltf.extensionsUsed.includes("KHR_materials_dispersion"));
      if (useTransmission && hasTransmission) {
        meshDescriptor.parameters.transmissive = true;
      }
      if (useTransmission && hasTransmission) {
        this.renderer.createTransmissionTarget();
        meshDescriptor.texturesDescriptors.push({
          texture: this.renderer.transmissionTarget.texture,
          sampler: this.renderer.transmissionTarget.sampler
        });
      }
      meshDescriptor.parameters.material = {
        ...meshDescriptor.parameters.material,
        ...meshDescriptor.texturesDescriptors.reduce((acc, descriptor) => {
          return { ...acc, [descriptor.texture.options.name]: descriptor };
        }, {})
      };
      if (instancesCount > 1) {
        const instanceMatricesBinding = new BufferBinding({
          label: "Instance matrices",
          name: "matrices",
          visibility: ["vertex", "fragment"],
          bindingType: "storage",
          struct: {
            model: {
              type: "mat4x4f",
              value: new Mat4()
            },
            normal: {
              type: "mat3x3f",
              value: new Mat3()
            }
          }
        });
        const instancesBinding = new BufferBinding({
          label: "Instances",
          name: "instances",
          visibility: ["vertex", "fragment"],
          bindingType: "storage",
          childrenBindings: [
            {
              binding: instanceMatricesBinding,
              count: instancesCount,
              forceArray: true
            }
          ]
        });
        instancesBinding.childrenBindings.forEach((binding, index) => {
          const instanceNode = nodes[index];
          const updateInstanceMatrices = () => {
            binding.inputs.model.value.copy(instanceNode.worldMatrix);
            binding.inputs.normal.value.getNormalMatrix(instanceNode.worldMatrix);
            binding.inputs.model.shouldUpdate = true;
            binding.inputs.normal.shouldUpdate = true;
          };
          const _updateWorldMatrix = instanceNode.updateWorldMatrix.bind(instanceNode);
          instanceNode.updateWorldMatrix = () => {
            _updateWorldMatrix();
            updateInstanceMatrices();
          };
          updateInstanceMatrices();
        });
        if (!meshDescriptor.parameters.bindings) {
          meshDescriptor.parameters.bindings = [];
        }
        meshDescriptor.parameters.bindings.push(instancesBinding);
      }
      for (let i = 0; i < nodes.length; i++) {
        const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone();
        const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix);
        this.scenesManager.boundingBox.min.min(transformedBbox.min);
        this.scenesManager.boundingBox.max.max(transformedBbox.max);
      }
      this.scenesManager.boundingBox.max.max(new Vec3(1e-3));
      if (primitive.extensions) {
        if (primitive.extensions["KHR_materials_variants"] && this.gltf.extensionsUsed && this.gltf.extensionsUsed.includes("KHR_materials_variants")) {
          meshDescriptor.extensionsUsed.push("KHR_materials_variants");
          this.gltf.extensions["KHR_materials_variants"].variants.forEach((variant, index) => {
            const variantMaterial = primitive.extensions["KHR_materials_variants"].mappings.find(
              (mapping) => mapping.variants && mapping.variants.includes(index)
            );
            if (variantMaterial) {
              const gltfVariantMaterial = this.gltf.materials[variantMaterial.material];
              const variantMaterialParams = this.scenesManager.materialsParams[variantMaterial.material];
              const materialTextures2 = this.scenesManager.materialsTextures[variantMaterial.material];
              const texturesDescriptors = materialTextures2?.texturesDescriptors || [];
              if (useTransmission && hasTransmission) {
                texturesDescriptors.push({
                  texture: this.renderer.transmissionTarget.texture,
                  sampler: this.renderer.transmissionTarget.sampler
                });
              }
              const { extensions: extensions2 } = gltfVariantMaterial;
              const extensionsUsed = [];
              if (extensions2) {
                for (const extension of Object.keys(extensions2)) {
                  if (extension === "KHR_materials_unlit" && this.gltf.extensionsRequired && this.gltf.extensionsRequired.includes(extension)) {
                    extensionsUsed.push(extension);
                  } else {
                    extensionsUsed.push(extension);
                  }
                }
              }
              const variantDescriptor = {
                variantName: variant.name,
                parent: meshDescriptor.parent,
                nodes: meshDescriptor.nodes,
                extensionsUsed: [...meshDescriptor.extensionsUsed, ...extensionsUsed],
                texturesDescriptors,
                parameters: {
                  geometry: meshDescriptor.parameters.geometry,
                  label: variant.name + " " + variantMaterialParams.label,
                  transmissive: !!meshDescriptor.parameters.transmissive,
                  bindings: meshDescriptor.parameters.bindings ?? [],
                  transparent: !!variantMaterialParams.transparent,
                  cullMode: variantMaterialParams.cullMode,
                  material: {
                    ...variantMaterialParams.material,
                    ...texturesDescriptors.reduce((acc, descriptor) => {
                      return { ...acc, [descriptor.texture.options.name]: descriptor };
                    }, {})
                  },
                  ...variantMaterialParams.targets && { targets: variantMaterialParams.targets }
                }
              };
              meshDescriptor.alternateDescriptors.set(variant.name, variantDescriptor);
            }
          });
        }
      }
    }
    /**
     * Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
     */
    createScenes() {
      this.scenesManager.node.parent = this.renderer.scene;
      this.gltf.scenes.forEach((childScene) => {
        const sceneDescriptor = {
          name: childScene.name,
          children: [],
          node: new Object3D()
        };
        sceneDescriptor.node.parent = this.scenesManager.node;
        this.scenesManager.scenes.push(sceneDescriptor);
        childScene.nodes.forEach((nodeIndex) => {
          const node = this.gltf.nodes[nodeIndex];
          this.createNode(sceneDescriptor, node, nodeIndex);
        });
      });
      this.scenesManager.node.updateMatrixStack();
      this.createSkins();
      for (const [primitive, primitiveInstance] of __privateGet(this, _primitiveInstances)) {
        const { nodes, meshDescriptor } = primitiveInstance;
        meshDescriptor.nodes = nodes;
        this.scenesManager.meshesDescriptors.push(meshDescriptor);
        this.createGeometry(primitive, primitiveInstance);
        this.createMaterial(primitive, primitiveInstance);
      }
    }
    /**
     * Add all the needed {@link LitMesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
     * @param patchMeshesParameters - allow to optionally patch the {@link LitMesh} parameters before creating it (can be used to add custom shaders chunks, uniforms or storages, change rendering options, etc.)
     * @returns - Array of created {@link LitMesh}.
     */
    addMeshes(patchMeshesParameters = (meshDescriptor) => {
    }) {
      this.scenesManager.node.updateMatrixStack();
      return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
        const { geometry } = meshDescriptor.parameters;
        if (geometry) {
          patchMeshesParameters(meshDescriptor);
          if (meshDescriptor.extensionsUsed.includes("KHR_materials_unlit")) {
            meshDescriptor.parameters.material.shading = "Unlit";
          }
          const mesh = new LitMesh(this.renderer, {
            ...meshDescriptor.parameters
          });
          meshDescriptor.alternateMaterials.set("Default", mesh.material);
          meshDescriptor.alternateDescriptors.forEach((descriptor) => {
            const { material: originalMaterial } = meshDescriptor.parameters;
            const { environmentMap, shading, vertexChunks, additionalVaryings, fragmentChunks, toneMapping } = originalMaterial;
            const { label, targets, transparent, material } = descriptor.parameters;
            material.shading = shading;
            if (descriptor.extensionsUsed.includes("KHR_materials_unlit")) {
              material.shading = "Unlit";
            }
            let { uniforms, samplers, textures, bindings } = descriptor.parameters;
            if (!textures) {
              textures = [];
            }
            if (!samplers) {
              samplers = [];
            }
            const variantTexturesDescriptors = LitMesh.getMaterialTexturesDescriptors(material);
            variantTexturesDescriptors.forEach((textureDescriptor) => {
              if (textureDescriptor.sampler) {
                const samplerExists = samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid);
                if (!samplerExists) {
                  samplers.push(textureDescriptor.sampler);
                }
              }
              textures.push(textureDescriptor.texture);
            });
            if (environmentMap && (material.shading === "PBR" || !material.shading)) {
              material.environmentMap = environmentMap;
              textures = [
                ...textures,
                environmentMap.lutTexture,
                environmentMap.diffuseTexture,
                environmentMap.specularTexture
              ];
              samplers = [...samplers, environmentMap.sampler];
            }
            if (!uniforms) {
              uniforms = {};
            }
            const variantMaterialUniform = LitMesh.getMaterialUniform(material);
            uniforms = {
              ...uniforms,
              material: variantMaterialUniform
            };
            if (meshDescriptor.parameters.uniforms) {
              uniforms = { ...meshDescriptor.parameters.uniforms, ...uniforms };
            }
            if (!bindings) {
              bindings = [];
            }
            const matricesBindings = mesh.material.getBufferBindingByName("matrices");
            bindings = [matricesBindings, ...bindings];
            if (meshDescriptor.parameters.bindings) {
              meshDescriptor.parameters.bindings.forEach((binding) => {
                const hasBinding = bindings.find((b) => b.name === binding.name);
                if (!hasBinding) {
                  bindings.push(binding);
                }
              });
            }
            let transmissionBackgroundTexture = null;
            if (meshDescriptor.parameters.transmissive) {
              this.renderer.createTransmissionTarget();
              transmissionBackgroundTexture = {
                texture: this.renderer.transmissionTarget.texture,
                sampler: this.renderer.transmissionTarget.sampler
              };
              textures = [...textures, this.renderer.transmissionTarget.texture];
              samplers = [...samplers, this.renderer.transmissionTarget.sampler];
            }
            if (meshDescriptor.parameters.storages) {
              descriptor.parameters.storages = meshDescriptor.parameters.storages;
            }
            if (meshDescriptor.parameters.bindGroups) {
              descriptor.parameters.bindGroups = meshDescriptor.parameters.bindGroups;
            }
            const vs = LitMesh.getVertexShaderCode({
              bindings,
              geometry,
              chunks: vertexChunks,
              additionalVaryings
            });
            const fs = LitMesh.getFragmentShaderCode({
              shadingModel: shading,
              chunks: fragmentChunks,
              extensionsUsed: descriptor.extensionsUsed,
              receiveShadows: meshDescriptor.parameters.receiveShadows,
              toneMapping,
              geometry,
              additionalVaryings,
              materialUniform: variantMaterialUniform,
              ...variantTexturesDescriptors.reduce((acc, descriptor2) => {
                return { ...acc, [descriptor2.texture.options.name]: descriptor2 };
              }, {}),
              transmissionBackgroundTexture,
              ...environmentMap && {
                environmentMap
              }
            });
            const shaders = {
              vertex: {
                code: vs,
                entryPoint: "main"
              },
              fragment: {
                code: fs,
                entryPoint: "main"
              }
            };
            const alternateMaterial = new RenderMaterial(this.renderer, {
              ...JSON.parse(JSON.stringify(mesh.material.options.rendering)),
              // use default cloned mesh rendering options
              label,
              shaders,
              uniforms,
              bindings,
              ...samplers && { samplers },
              ...textures && { textures },
              ...targets && { targets },
              transparent: !!transparent,
              verticesOrder: geometry.verticesOrder,
              topology: geometry.topology
            });
            meshDescriptor.alternateMaterials.set(descriptor.variantName, alternateMaterial);
          });
          mesh.parent = meshDescriptor.parent;
          this.scenesManager.meshes.push(mesh);
          return mesh;
        }
      });
    }
    /**
     * Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
     */
    destroy() {
      this.scenesManager.lights.filter(Boolean).forEach((light) => light.remove());
      this.scenesManager.meshes.forEach((mesh) => mesh.remove());
      this.scenesManager.meshes = [];
      this.scenesManager.meshesDescriptors.forEach((descriptor) => {
        descriptor.alternateMaterials.forEach((material) => material.destroy());
      });
      this.scenesManager.nodes.forEach((node) => {
        node.destroy();
      });
      this.scenesManager.nodes = /* @__PURE__ */ new Map();
      this.scenesManager.scenes.forEach((scene) => {
        scene.node.destroy();
      });
      this.scenesManager.animations.forEach((animation) => animation.setRenderer(null));
      this.scenesManager.node.destroy();
      __privateSet(this, _primitiveInstances, /* @__PURE__ */ new Map());
    }
  };
  _primitiveInstances = new WeakMap();
  _GLTFScenesManager_instances = new WeakSet();
  /**
   * Get a {@link TypedArray} from an accessor patched with sparse values if needed.
   * @param accessor - {@link GLTF.IAccessor | Accessor} to get the array from.
   * @returns - {@link TypedArray} holding the referent accessor values, patched with sparse values if needed.
   * @private
   */
  getAccessorArray_fn = function(accessor) {
    const constructor = accessor.componentType ? _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) : Float32Array;
    const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
    const bufferView = this.gltf.bufferViews[accessor.bufferView];
    const array = new constructor(
      this.gltf.arrayBuffers[bufferView.buffer],
      accessor.byteOffset + bufferView.byteOffset,
      accessor.count * attrSize
    );
    if (accessor.sparse) {
      const { indices, values } = __privateMethod(this, _GLTFScenesManager_instances, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
      for (let i = 0; i < indices.length; i++) {
        for (let j = 0; j < attrSize; j++) {
          array[indices[i] * attrSize + j] = values[i * attrSize + j];
        }
      }
    }
    return array;
  };
  /**
   * Get an accessor sparse indices values to use for replacement if any.
   * @param accessor - {@link GLTF.IAccessor | Accessor} to check for sparse indices.
   * @returns parameters - indices and values found as {@link TypedArray} if any.
   * @private
   */
  getSparseAccessorIndicesAndValues_fn = function(accessor) {
    if (!accessor.sparse) return { indices: null, values: null };
    const accessorConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
    const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
    const sparseValuesBufferView = this.gltf.bufferViews[accessor.sparse.values.bufferView];
    const sparseValues = new accessorConstructor(
      this.gltf.arrayBuffers[sparseValuesBufferView.buffer],
      accessor.byteOffset + sparseValuesBufferView.byteOffset,
      accessor.sparse.count * attrSize
    );
    const sparseIndicesConstructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(
      accessor.sparse.indices.componentType
    );
    const sparseIndicesBufferView = this.gltf.bufferViews[accessor.sparse.indices.bufferView];
    const sparseIndices = new sparseIndicesConstructor(
      this.gltf.arrayBuffers[sparseIndicesBufferView.buffer],
      accessor.byteOffset + sparseIndicesBufferView.byteOffset,
      accessor.sparse.count
    );
    return {
      indices: sparseIndices,
      values: sparseValues
    };
  };
  /**
   * Parse a {@link GLTF.IMeshPrimitive | glTF primitive} and create typed arrays from the given {@link gltf} accessors, bufferViews and buffers.
   * @param primitiveProperty- Primitive property to parse, can either be `attributes` or `targets`.
   * @param attributes - An empty {@link VertexBufferAttributeParams} array to fill with parsed values.
   * @returns - Interleaved attributes {@link TypedArray} if any.
   * @private
   */
  parsePrimitiveProperty_fn = function(primitiveProperty, attributes) {
    let interleavedArray = null;
    let interleavedBufferView = null;
    let maxByteOffset = 0;
    const primitiveAttributes = Object.entries(primitiveProperty);
    primitiveAttributes.sort((a, b) => a[1] - b[1]);
    const primitiveAttributesValues = Object.values(primitiveProperty);
    primitiveAttributesValues.sort((a, b) => a - b);
    for (const [attribName, accessorIndex] of primitiveAttributes) {
      const name = _GLTFScenesManager.getCleanAttributeName(attribName);
      const accessor = this.gltf.accessors[accessorIndex];
      const constructor = accessor.componentType ? _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) : Float32Array;
      const bufferView = this.gltf.bufferViews[accessor.bufferView];
      const byteStride = bufferView.byteStride;
      const accessorByteOffset = accessor.byteOffset;
      const isInterleaved = byteStride !== void 0 && accessorByteOffset !== void 0 && accessorByteOffset < byteStride;
      if (isInterleaved) {
        maxByteOffset = Math.max(accessorByteOffset, maxByteOffset);
      } else {
        maxByteOffset = 0;
      }
      if (name === "position") {
        interleavedBufferView = bufferView;
      }
      const attributeParams = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type);
      const { size } = attributeParams;
      let array;
      if (maxByteOffset > 0) {
        const parentArray = new constructor(
          this.gltf.arrayBuffers[bufferView.buffer],
          0,
          bufferView.byteLength / constructor.BYTES_PER_ELEMENT
        );
        array = new constructor(accessor.count * size);
        const arrayStride = accessorByteOffset / constructor.BYTES_PER_ELEMENT;
        for (let i = 0; i < accessor.count; i++) {
          for (let j = 0; j < size; j++) {
            array[i * size + j] = parentArray[arrayStride + size * i + size * i + j];
          }
        }
      } else {
        if (bufferView.byteStride && bufferView.byteStride > constructor.BYTES_PER_ELEMENT * size) {
          const dataView = new DataView(
            this.gltf.arrayBuffers[bufferView.buffer],
            bufferView.byteOffset + accessor.byteOffset
          );
          array = new constructor(accessor.count * size);
          for (let i = 0; i < accessor.count; i++) {
            const baseOffset = i * bufferView.byteStride;
            for (let j = 0; j < size; j++) {
              array[i * size + j] = dataView.getUint16(baseOffset + j * constructor.BYTES_PER_ELEMENT, true);
            }
          }
        } else {
          array = new constructor(
            this.gltf.arrayBuffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * size
          );
        }
      }
      if (accessor.sparse) {
        const { indices, values } = __privateMethod(this, _GLTFScenesManager_instances, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
        for (let i = 0; i < indices.length; i++) {
          for (let j = 0; j < size; j++) {
            array[indices[i] * size + j] = values[i * size + j];
          }
        }
      }
      if (name.includes("weights")) {
        for (let i = 0; i < accessor.count * size; i += size) {
          const x = array[i];
          const y = array[i + 1];
          const z = array[i + 2];
          const w = array[i + 3];
          let len = Math.abs(x) + Math.abs(y) + Math.abs(z) + Math.abs(w);
          if (len > 0) {
            len = 1 / Math.sqrt(len);
          } else {
            len = 1;
          }
          array[i] *= len;
          array[i + 1] *= len;
          array[i + 2] *= len;
          array[i + 3] *= len;
        }
      }
      const attribute = {
        name,
        ...attributeParams,
        array
      };
      attributes.push(attribute);
    }
    if (maxByteOffset > 0) {
      const accessorsBufferViews = primitiveAttributesValues.map(
        (accessorIndex) => this.gltf.accessors[accessorIndex].bufferView
      );
      if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
        let totalStride = 0;
        const mainBufferStrides = {};
        const arrayLength = primitiveAttributesValues.reduce((acc, accessorIndex) => {
          const accessor = this.gltf.accessors[accessorIndex];
          const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
          if (!mainBufferStrides[accessor.bufferView]) {
            mainBufferStrides[accessor.bufferView] = 0;
          }
          mainBufferStrides[accessor.bufferView] = Math.max(
            mainBufferStrides[accessor.bufferView],
            accessor.byteOffset + attrSize * Float32Array.BYTES_PER_ELEMENT
          );
          totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT;
          return acc + accessor.count * attrSize;
        }, 0);
        interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4);
        primitiveAttributesValues.forEach((accessorIndex) => {
          const accessor = this.gltf.accessors[accessorIndex];
          const bufferView = this.gltf.bufferViews[accessor.bufferView];
          const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
          const { indices, values } = __privateMethod(this, _GLTFScenesManager_instances, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
          for (let i = 0; i < accessor.count; i++) {
            const startOffset = accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT + i * totalStride / Float32Array.BYTES_PER_ELEMENT;
            const subarray = new Float32Array(
              this.gltf.arrayBuffers[bufferView.buffer],
              bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
              attrSize
            );
            if (indices && values && indices.includes(i)) {
              for (let j = 0; i < attrSize; j++) {
                subarray[j] = values[i * attrSize + j];
              }
            }
            interleavedArray.subarray(startOffset, startOffset + attrSize).set(subarray);
          }
        });
        const cleanAttributeNames = Object.entries(primitiveProperty).map(
          (prop) => _GLTFScenesManager.getCleanAttributeName(prop[0])
        );
        this.sortAttributesByNames(cleanAttributeNames, attributes);
      } else {
        interleavedArray = new Float32Array(
          this.gltf.arrayBuffers[interleavedBufferView.buffer],
          interleavedBufferView.byteOffset,
          Math.ceil(interleavedBufferView.byteLength / 4) * 4 / Float32Array.BYTES_PER_ELEMENT
        );
        let stride = 0;
        primitiveAttributesValues.forEach((accessorIndex) => {
          const accessor = this.gltf.accessors[accessorIndex];
          const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
          const { indices, values } = __privateMethod(this, _GLTFScenesManager_instances, getSparseAccessorIndicesAndValues_fn).call(this, accessor);
          if (indices && values) {
            for (let i = 0; i < indices.length; i++) {
              for (let j = 0; j < attrSize; j++) {
                const arrayStride = stride + attrSize * i;
                interleavedArray[arrayStride + indices[i] * attrSize + j] = values[i * attrSize + j];
              }
            }
          }
          stride += attrSize;
        });
        const primitivePropertiesSortedByByteOffset = Object.entries(primitiveProperty).sort((a, b) => {
          const accessorAByteOffset = this.gltf.accessors[a[1]].byteOffset;
          const accessorBByteOffset = this.gltf.accessors[b[1]].byteOffset;
          return accessorAByteOffset - accessorBByteOffset;
        });
        const accessorNameOrder = primitivePropertiesSortedByByteOffset.map(
          (property) => _GLTFScenesManager.getCleanAttributeName(property[0])
        );
        this.sortAttributesByNames(accessorNameOrder, attributes);
      }
    }
    return interleavedArray;
  };
  let GLTFScenesManager = _GLTFScenesManager;

  const GL = typeof window !== "undefined" && WebGLRenderingContext || {
    REPEAT: 10497
  };
  const GLB_MAGIC = 1179937895;
  const CHUNK_TYPE = {
    JSON: 1313821514,
    BIN: 5130562
  };
  const DEFAULT_TRANSLATION = [0, 0, 0];
  const DEFAULT_ROTATION = [0, 0, 0, 1];
  const DEFAULT_SCALE = [1, 1, 1];
  const absUriRegEx = typeof window !== "undefined" && new RegExp(`^${window.location.protocol}`, "i") || RegExp(`^(http|https):`, "i");
  const dataUriRegEx = /^data:/;
  class GLTFLoader {
    /**
     * {@link GLTFLoader} constructor.
     */
    constructor() {
      this.gltf = null;
    }
    /**
     * Build the absolute uri of the resource
     * @param uri - uri of the resource
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - absolute uri of the resource
     */
    static resolveUri(uri, baseUrl) {
      if (!!uri.match(absUriRegEx) || !!uri.match(dataUriRegEx)) {
        return uri;
      }
      return baseUrl + uri;
    }
    /**
     * Load a glTF from the given url.
     * @param url - url of the glTF.
     * @returns - the {@link GPUCurtainsGLTF} created.
     */
    async loadFromUrl(url) {
      const i = url.lastIndexOf("/");
      const baseUrl = i !== 0 ? url.substring(0, i + 1) : "";
      const response = await fetch(url);
      if (url.endsWith(".gltf")) {
        return this.loadFromJson(await response.json(), baseUrl);
      } else if (url.endsWith(".glb")) {
        return this.loadFromBinary(await response.arrayBuffer(), baseUrl);
      } else {
        throw new Error("Unrecognized file extension");
      }
    }
    /**
     * Parse a {@link GLTF.IGLTF | glTF json} and create our {@link gltf} base object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - {@link gltf} base object.
     */
    async loadFromJsonBase(json, baseUrl, binaryChunk = null) {
      if (!baseUrl) {
        throw new Error("baseUrl must be specified.");
      }
      if (!json.asset) {
        throw new Error("Missing asset description.");
      }
      if (json.asset.minVersion !== "2.0" && json.asset.version !== "2.0") {
        throw new Error("Incompatible asset version.");
      }
      for (const accessor of json.accessors) {
        accessor.byteOffset = accessor.byteOffset ?? 0;
        accessor.normalized = accessor.normalized ?? false;
      }
      for (const bufferView of json.bufferViews) {
        bufferView.byteOffset = bufferView.byteOffset ?? 0;
      }
      for (const node of json.nodes) {
        if (!node.matrix) {
          node.rotation = node.rotation ?? DEFAULT_ROTATION;
          node.scale = node.scale ?? DEFAULT_SCALE;
          node.translation = node.translation ?? DEFAULT_TRANSLATION;
        }
      }
      if (json.samplers) {
        for (const sampler of json.samplers) {
          sampler.wrapS = sampler.wrapS ?? GL.REPEAT;
          sampler.wrapT = sampler.wrapT ?? GL.REPEAT;
        }
      }
      const pendingBuffers = [];
      if (binaryChunk) {
        pendingBuffers.push(Promise.resolve(binaryChunk));
      } else {
        for (const index in json.buffers) {
          const buffer = json.buffers[index];
          const uri = GLTFLoader.resolveUri(buffer.uri, baseUrl);
          pendingBuffers[index] = fetch(uri).then((response) => response.arrayBuffer());
        }
      }
      const pendingImages = [];
      for (let index = 0; index < json.images?.length || 0; ++index) {
        const image = json.images[index];
        if (image.uri) {
          if (image.uri.includes(".webp")) {
            pendingImages[index] = new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.onload = () => {
                createImageBitmap(img, { colorSpaceConversion: "none" }).then(resolve).catch(reject);
              };
              img.onerror = reject;
              img.src = GLTFLoader.resolveUri(image.uri, baseUrl);
            });
          } else {
            pendingImages[index] = fetch(GLTFLoader.resolveUri(image.uri, baseUrl)).then(async (response) => {
              return createImageBitmap(await response.blob(), {
                colorSpaceConversion: "none"
              });
            });
          }
        } else {
          const bufferView = json.bufferViews[image.bufferView];
          pendingImages[index] = pendingBuffers[bufferView.buffer].then((buffer) => {
            const blob = new Blob([new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength)], {
              type: image.mimeType
            });
            if (image.mimeType === "image/webp") {
              return new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = "anonymous";
                img.src = URL.createObjectURL(blob);
                img.onload = () => {
                  createImageBitmap(img, { colorSpaceConversion: "none" }).then((bitmap) => {
                    URL.revokeObjectURL(img.src);
                    resolve(bitmap);
                  }).catch(reject);
                };
                img.onerror = (err) => {
                  URL.revokeObjectURL(img.src);
                  reject(err);
                };
              });
            } else {
              return createImageBitmap(blob, {
                colorSpaceConversion: "none"
              });
            }
          });
        }
      }
      return {
        ...json,
        arrayBuffers: await Promise.all(pendingBuffers),
        imagesBitmaps: await Promise.all(pendingImages)
      };
    }
    /**
     * Load a glTF from a .glb file.
     * @param arrayBuffer - {@link ArrayBuffer} containing the data.
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - the {@link GPUCurtainsGLTF} created.
     */
    async loadFromBinary(arrayBuffer, baseUrl) {
      const headerView = new DataView(arrayBuffer, 0, 12);
      const magic = headerView.getUint32(0, true);
      const version = headerView.getUint32(4, true);
      const length = headerView.getUint32(8, true);
      if (magic !== GLB_MAGIC) {
        throw new Error("Invalid magic string in binary header.");
      }
      if (version !== 2) {
        throw new Error("Incompatible version in binary header.");
      }
      const chunks = {};
      let chunkOffset = 12;
      while (chunkOffset < length) {
        const chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8);
        const chunkLength = chunkHeaderView.getUint32(0, true);
        const chunkType = chunkHeaderView.getUint32(4, true);
        chunks[chunkType] = arrayBuffer.slice(chunkOffset + 8, chunkOffset + 8 + chunkLength);
        chunkOffset += chunkLength + 8;
      }
      if (!chunks[CHUNK_TYPE.JSON]) {
        throw new Error("File contained no json chunk.");
      }
      const decoder = new TextDecoder("utf-8");
      const jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON]);
      return this.loadFromJson(JSON.parse(jsonString), baseUrl, chunks[CHUNK_TYPE.BIN]);
    }
    /**
     * Load the glTF json, parse the data and create our {@link GPUCurtainsGLTF} object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - the {@link GPUCurtainsGLTF} created.
     */
    async loadFromJson(json, baseUrl, binaryChunk = null) {
      this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk);
      return this.gltf;
    }
  }

  exports.AmbientLight = AmbientLight;
  exports.BindGroup = BindGroup;
  exports.Binding = Binding;
  exports.Box3 = Box3;
  exports.BoxGeometry = BoxGeometry;
  exports.Buffer = Buffer;
  exports.BufferBinding = BufferBinding;
  exports.ComputeMaterial = ComputeMaterial;
  exports.ComputePass = ComputePass;
  exports.ComputePipelineEntry = ComputePipelineEntry;
  exports.DOMElement = DOMElement;
  exports.DOMFrustum = DOMFrustum;
  exports.DOMMesh = DOMMesh;
  exports.DOMObject3D = DOMObject3D;
  exports.DOMTexture = DOMTexture;
  exports.DirectionalLight = DirectionalLight;
  exports.EnvironmentMap = EnvironmentMap;
  exports.FullscreenPlane = FullscreenPlane;
  exports.GLTFLoader = GLTFLoader;
  exports.GLTFScenesManager = GLTFScenesManager;
  exports.GPUCameraRenderer = GPUCameraRenderer;
  exports.GPUCurtains = GPUCurtains;
  exports.GPUCurtainsRenderer = GPUCurtainsRenderer;
  exports.GPUDeviceManager = GPUDeviceManager;
  exports.GPURenderer = GPURenderer;
  exports.Geometry = Geometry;
  exports.HDRLoader = HDRLoader;
  exports.IndexedGeometry = IndexedGeometry;
  exports.IndirectBuffer = IndirectBuffer;
  exports.KeyframesAnimation = KeyframesAnimation;
  exports.LitMesh = LitMesh;
  exports.Mat3 = Mat3;
  exports.Mat4 = Mat4;
  exports.Material = Material;
  exports.MediaTexture = MediaTexture;
  exports.Mesh = Mesh;
  exports.Object3D = Object3D;
  exports.OrbitControls = OrbitControls;
  exports.OrthographicCamera = OrthographicCamera;
  exports.PerspectiveCamera = PerspectiveCamera;
  exports.PingPongPlane = PingPongPlane;
  exports.PipelineEntry = PipelineEntry;
  exports.PipelineManager = PipelineManager;
  exports.Plane = Plane;
  exports.PlaneGeometry = PlaneGeometry;
  exports.PointLight = PointLight;
  exports.ProjectedObject3D = ProjectedObject3D;
  exports.Quat = Quat;
  exports.Raycaster = Raycaster;
  exports.RenderBundle = RenderBundle;
  exports.RenderMaterial = RenderMaterial;
  exports.RenderPass = RenderPass;
  exports.RenderPipelineEntry = RenderPipelineEntry;
  exports.RenderTarget = RenderTarget;
  exports.Sampler = Sampler;
  exports.SamplerBinding = SamplerBinding;
  exports.Scene = Scene;
  exports.ShaderPass = ShaderPass;
  exports.SphereGeometry = SphereGeometry;
  exports.SpotLight = SpotLight;
  exports.TargetsAnimationsManager = TargetsAnimationsManager;
  exports.Texture = Texture;
  exports.TextureBindGroup = TextureBindGroup;
  exports.TextureBinding = TextureBinding;
  exports.Vec2 = Vec2;
  exports.Vec3 = Vec3;
  exports.WritableBufferBinding = WritableBufferBinding;
  exports.common = common;
  exports.constants = constants;
  exports.getFragmentShaderCode = getFragmentShaderCode;
  exports.getLambert = getLambert;
  exports.getLambertFragmentShaderCode = getLambertFragmentShaderCode;
  exports.getPBR = getPBR;
  exports.getPBRFragmentShaderCode = getPBRFragmentShaderCode;
  exports.getPhong = getPhong;
  exports.getPhongFragmentShaderCode = getPhongFragmentShaderCode;
  exports.getUnlitFragmentShaderCode = getUnlitFragmentShaderCode;
  exports.getVertexShaderCode = getVertexShaderCode;
  exports.lambertUtils = lambertUtils;
  exports.linearTosRGB = linearTosRGB;
  exports.linearTosRGBFloat = linearTosRGBFloat;
  exports.sRGBToLinear = sRGBToLinear;
  exports.sRGBToLinearFloat = sRGBToLinearFloat;
  exports.toneMappingUtils = toneMappingUtils;

}));
