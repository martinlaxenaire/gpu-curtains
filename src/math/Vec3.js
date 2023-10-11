/***
 Here we create a Vec3 class object
 This is a really basic Vector3 class used for vector calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector3.js and http://glmatrix.net/docs/vec3.js.html

 params :
 @x (float): X component of our vector
 @y (float): Y component of our vector
 @z (float): Z component of our vector

 @returns {Vec3}: our Vec3 class object
 ***/
import { Mat4 } from './Mat4'
import { Quat } from './Quat'

// TODO lot of (unused at the time) methods are missing

export class Vec3 {
  constructor(x = 0, y = x, z = x) {
    this.type = 'Vec3'

    this._x = x
    this._y = y
    this._z = z
  }

  /***
   Getters and setters (with onChange callback)
   ***/
  get x() {
    return this._x
  }

  set x(value) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  get y() {
    return this._y
  }

  set y(value) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  get z() {
    return this._z
  }

  set z(value) {
    const changed = value !== this._z
    this._z = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  onChange(callback) {
    if (callback) {
      this._onChangeCallback = callback
    }

    return this
  }

  /***
   Sets the vector from values

   params:
   @x (float): X component of our vector
   @y (float): Y component of our vector
   @z (float): Z component of our vector

   @returns {Vec3}: this vector after being set
   ***/
  set(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  /***
   Adds a vector to this vector

   params:
   @vector (Vec3): vector to add

   @returns {Vec3}: this vector after addition
   ***/
  add(vector = new Vec3()) {
    this.x += vector.x
    this.y += vector.y
    this.z += vector.z

    return this
  }

  /***
   Adds a scalar to this vector

   params:
   @value (float): number to add

   @returns {Vec3}: this vector after addition
   ***/
  addScalar(value = 0) {
    this.x += value
    this.y += value
    this.z += value

    return this
  }

  /***
   Subtracts a vector from this vector

   params:
   @vector (Vec3): vector to use for subtraction

   @returns {Vec3}: this vector after subtraction
   ***/
  sub(vector = new Vec3()) {
    this.x -= vector.x
    this.y -= vector.y
    this.z -= vector.z

    return this
  }

  /***
   Subtracts a scalar to this vector

   params:
   @value (float): number to use for subtraction

   @returns {Vec3}: this vector after subtraction
   ***/
  subScalar(value = 0) {
    this.x -= value
    this.y -= value
    this.z -= value

    return this
  }

  /***
   Multiplies a vector with this vector

   params:
   @vector (Vec3): vector to use for multiplication

   @returns {Vec3}: this vector after multiplication
   ***/
  multiply(vector = new Vec3(1)) {
    this.x *= vector.x
    this.y *= vector.y
    this.z *= vector.z

    return this
  }

  /***
   Multiplies a scalar with this vector

   params:
   @value (float): number to use for multiplication

   @returns {Vec3}: this vector after multiplication
   ***/
  multiplyScalar(value = 1) {
    this.x *= value
    this.y *= value
    this.z *= value

    return this
  }

  /***
   Copy a vector into this vector

   params:
   @vector (Vec3): vector to copy

   @returns {Vec3}: this vector after copy
   ***/
  copy(vector = new Vec3()) {
    this.x = vector.x
    this.y = vector.y
    this.z = vector.z

    return this
  }

  /***
   Clone this vector

   @returns {Vec3}: cloned vector
   ***/
  clone() {
    return new Vec3(this.x, this.y, this.z)
  }

  /***
   Apply max values to this vector

   params:
   @vector (Vec3): vector representing max values

   @returns {Vec3}: vector with max values applied
   ***/
  max(vector = new Vec3()) {
    this.x = Math.max(this.x, vector.x)
    this.y = Math.max(this.y, vector.y)
    this.z = Math.max(this.z, vector.z)

    return this
  }

  /***
   Apply min values to this vector

   params:
   @vector (Vec3): vector representing min values

   @returns {Vec3}: vector with min values applied
   ***/
  min(vector = new Vec3()) {
    this.x = Math.min(this.x, vector.x)
    this.y = Math.min(this.y, vector.y)
    this.z = Math.min(this.z, vector.z)

    return this
  }

  /***
   Checks if 2 vectors are equal

   @returns {boolean}: whether the vectors are equals or not
   ***/
  equals(vector = new Vec3()) {
    return this.x === vector.x && this.y === vector.y && this.z === vector.z
  }

  /***
   Normalize this vector

   @returns {Vec3}: normalized vector
   ***/
  normalize() {
    // normalize
    let len = this.x * this.x + this.y * this.y + this.z * this.z
    if (len > 0) {
      len = 1 / Math.sqrt(len)
    }
    this.x *= len
    this.y *= len
    this.z *= len

    return this
  }

  /***
   Calculates the dot product of 2 vectors

   @returns {number}: dot product of the 2 vectors
   ***/
  dot(vector = new Vec3()) {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z
  }

  lerp(vector = new Vec3(), alpha = 1) {
    this.x += (vector.x - this.x) * alpha
    this.y += (vector.y - this.y) * alpha
    this.z += (vector.z - this.z) * alpha

    return this
  }

  /***
   Apply a matrix 4 to a point (vec3)
   Useful to convert a point position from plane local world to webgl space using projection view matrix for example
   Source code from: http://glmatrix.net/docs/vec3.js.html

   params :
   @matrix (array): 4x4 matrix used

   @returns {Vec3}: this vector after matrix application
   ***/
  applyMat4(matrix = new Mat4()) {
    const x = this._x,
      y = this._y,
      z = this._z
    const mArray = matrix.elements

    let w = mArray[3] * x + mArray[7] * y + mArray[11] * z + mArray[15]
    w = w || 1

    this.x = (mArray[0] * x + mArray[4] * y + mArray[8] * z + mArray[12]) / w
    this.y = (mArray[1] * x + mArray[5] * y + mArray[9] * z + mArray[13]) / w
    this.z = (mArray[2] * x + mArray[6] * y + mArray[10] * z + mArray[14]) / w

    return this
  }

  /***
   Apply a quaternion (rotation in 3D space) to this vector

   params :
   @quaternion (Quat): quaternion to use

   @returns {Vec3}: this vector after applying the transformation
   ***/
  applyQuat(quaternion = new Quat()) {
    const x = this.x,
      y = this.y,
      z = this.z
    const qx = quaternion.elements[0],
      qy = quaternion.elements[1],
      qz = quaternion.elements[2],
      qw = quaternion.elements[3]

    // calculate quat * vector

    const ix = qw * x + qy * z - qz * y
    const iy = qw * y + qz * x - qx * z
    const iz = qw * z + qx * y - qy * x
    const iw = -qx * x - qy * y - qz * z

    // calculate result * inverse quat

    this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy
    this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz
    this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx

    return this
  }

  /***
   Project 3D coordinate to 2D point

   params:
   @camera (Camera): camera to use for projection

   @returns {Vec3}
   ***/
  project(camera) {
    this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix)
    return this
  }

  /***
   Unproject 2D point to 3D coordinate

   params:
   @camera (Camera): camera to use for projection

   @returns {Vec3}
   ***/
  unproject(camera) {
    this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix)
    return this
  }
}
