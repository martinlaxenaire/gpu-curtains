import { Mat4 } from './Mat4'
import { Quat } from './Quat'
import { Camera } from '../core/camera/Camera'

/**
 * Vec3 class:
 * Really basic Vector3 class used for vector calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector3.js and http://glmatrix.net/docs/vec3.js.html
 */
export class Vec3 {
  /** The type of the {@link Vec3} */
  type: string
  /** X component of our [vector]{@link Vec3} */
  private _x: number
  /** Y component of our [vector]{@link Vec3} */
  private _y: number
  /** Z component of our [vector]{@link Vec3} */
  private _z: number

  /** function assigned to the [onChange]{@link Vec3#onChange} callback */
  _onChangeCallback?(): void

  /**
   * Vec3 constructor
   * @param x=0 - X component of our [vector]{@link Vec3}
   * @param y=x - Y component of our [vector]{@link Vec3}
   * @param z=x - Z component of our [vector]{@link Vec3}
   */
  constructor(x = 0, y = x, z = x) {
    this.type = 'Vec3'

    this._x = x
    this._y = y
    this._z = z
  }

  /**
   * Get/set the X component of the [vector]{@link Vec3}
   * When set, can trigger [onChange]{@link Vec3#onChange} callback
   * @readonly
   */
  get x(): number {
    return this._x
  }

  set x(value: number) {
    const changed = value !== this._x
    this._x = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Get/set the Y component of the [vector]{@link Vec3}
   * When set, can trigger [onChange]{@link Vec3#onChange} callback
   * @readonly
   */
  get y(): number {
    return this._y
  }

  set y(value: number) {
    const changed = value !== this._y
    this._y = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Get/set the Z component of the [vector]{@link Vec3}
   * When set, can trigger [onChange]{@link Vec3#onChange} callback
   * @readonly
   */
  get z(): number {
    return this._z
  }

  set z(value: number) {
    const changed = value !== this._z
    this._z = value
    changed && this._onChangeCallback && this._onChangeCallback()
  }

  /**
   * Called when at least one component of the [vector]{@link Vec3} has changed
   * @param callback - callback to run when at least one component of the [vector]{@link Vec3} has changed
   * @returns - our {@link Vec3}
   */
  onChange(callback: () => void): Vec3 {
    if (callback) {
      this._onChangeCallback = callback
    }

    return this
  }

  /**
   * Set the [vector]{@link Vec3} from values
   * @param x=0 - new X component to set
   * @param y=0 - new Y component to set
   * @param z=0 - new Z component to set
   * @returns - this [vector]{@link Vec3} after being set
   */
  set(x = 0, y = 0, z = 0): Vec3 {
    this.x = x
    this.y = y
    this.z = z

    return this
  }

  /**
   * Add a [vector]{@link Vec3} to this [vector]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to add
   * @returns - this [vector]{@link Vec3} after addition
   */
  add(vector: Vec3 = new Vec3()): Vec3 {
    this.x += vector.x
    this.y += vector.y
    this.z += vector.z

    return this
  }

  /**
   * Add a scalar to all the components of this [vector]{@link Vec3}
   * @param value=0 - number to add
   * @returns - this [vector]{@link Vec3} after addition
   */
  addScalar(value = 0): Vec3 {
    this.x += value
    this.y += value
    this.z += value

    return this
  }

  /**
   * Subtract a [vector]{@link Vec3} from this [vector]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to subtract
   * @returns - this [vector]{@link Vec3} after subtraction
   */
  sub(vector: Vec3 = new Vec3()): Vec3 {
    this.x -= vector.x
    this.y -= vector.y
    this.z -= vector.z

    return this
  }

  /**
   * Subtract a scalar to all the components of this [vector]{@link Vec3}
   * @param value=0 - number to subtract
   * @returns - this [vector]{@link Vec3} after subtraction
   */
  subScalar(value = 0): Vec3 {
    this.x -= value
    this.y -= value
    this.z -= value

    return this
  }

  /**
   * Multiply a [vector]{@link Vec3} with this [vector]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to multiply with
   * @returns - this [vector]{@link Vec3} after multiplication
   */
  multiply(vector: Vec3 = new Vec3(1)): Vec3 {
    this.x *= vector.x
    this.y *= vector.y
    this.z *= vector.z

    return this
  }

  /**
   * Multiply all components of this [vector]{@link Vec3} with a scalar
   * @param value=1 - number to multiply with
   * @returns - this [vector]{@link Vec3} after multiplication
   */
  multiplyScalar(value = 1): Vec3 {
    this.x *= value
    this.y *= value
    this.z *= value

    return this
  }

  /**
   * Copy a [vector]{@link Vec3} into this [vector]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to copy
   * @returns - this [vector]{@link Vec3} after copy
   */
  copy(vector: Vec3 = new Vec3()): Vec3 {
    this.x = vector.x
    this.y = vector.y
    this.z = vector.z

    return this
  }

  /**
   * Clone this [vector]{@link Vec3}
   * @returns - cloned [vector]{@link Vec3}
   */
  clone(): Vec3 {
    return new Vec3(this.x, this.y, this.z)
  }

  /**
   * Apply max values to this [vector]{@link Vec3} components
   * @param vector - [vector]{@link Vec3} representing max values
   * @returns - [vector]{@link Vec3} with max values applied
   */
  max(vector: Vec3 = new Vec3()): Vec3 {
    this.x = Math.max(this.x, vector.x)
    this.y = Math.max(this.y, vector.y)
    this.z = Math.max(this.z, vector.z)

    return this
  }

  /**
   * Apply min values to this [vector]{@link Vec3} components
   * @param vector - [vector]{@link Vec3} representing min values
   * @returns - [vector]{@link Vec3} with min values applied
   */
  min(vector: Vec3 = new Vec3()): Vec3 {
    this.x = Math.min(this.x, vector.x)
    this.y = Math.min(this.y, vector.y)
    this.z = Math.min(this.z, vector.z)

    return this
  }

  /**
   * Check if 2 [vectors]{@link Vec3} are equal
   * @param vector - [vector]{@link Vec3} to compare
   * @returns - whether the [vectors]{@link Vec3} are equals or not
   */
  equals(vector: Vec3 = new Vec3()): boolean {
    return this.x === vector.x && this.y === vector.y && this.z === vector.z
  }

  /**
   * Get the square length of this [vector]{@link Vec3}
   * @returns - square length of this [vector]{@link Vec3}
   */
  lengthSq(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z
  }

  /**
   * Get the length of this [vector]{@link Vec3}
   * @returns - length of this [vector]{@link Vec3}
   */
  length(): number {
    return Math.sqrt(this.lengthSq())
  }

  /**
   * Normalize this [vector]{@link Vec3}
   * @returns - normalized [vector]{@link Vec3}
   */
  normalize(): Vec3 {
    // normalize
    let len = this.lengthSq()
    if (len > 0) {
      len = 1 / Math.sqrt(len)
    }
    this.x *= len
    this.y *= len
    this.z *= len

    return this
  }

  /**
   * Calculate the dot product of 2 [vectors]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to use for dot product
   * @returns - dot product of the 2 [vectors]{@link Vec3}
   */
  dot(vector: Vec3 = new Vec3()): number {
    return this.x * vector.x + this.y * vector.y + this.z * vector.z
  }

  /**
   * Get the cross product of this [vector]{@link Vec3} with another [vector]{@link Vec3}
   * @param vector - [vector]{@link Vec3} to use for cross product
   * @returns - this [vector]{@link Vec3} after cross product
   */
  cross(vector: Vec3 = new Vec3()): Vec3 {
    return this.crossVectors(this, vector)
  }

  /**
   * Set this [vector]{@link Vec3} as the result of the cross product of two [vectors]{@link Vec3}
   * @param a - first [vector]{@link Vec3} to use for cross product
   * @param b - second [vector]{@link Vec3} to use for cross product
   * @returns - this [vector]{@link Vec3} after cross product
   */
  crossVectors(a: Vec3 = new Vec3(), b: Vec3 = new Vec3()): Vec3 {
    const ax = a.x,
      ay = a.y,
      az = a.z
    const bx = b.x,
      by = b.y,
      bz = b.z

    this.x = ay * bz - az * by
    this.y = az * bx - ax * bz
    this.z = ax * by - ay * bx

    return this
  }

  /**
   * Calculate the linear interpolation of this [vector]{@link Vec3} by given [vector]{@link Vec3} and alpha, where alpha is the percent distance along the line
   * @param vector - [vector]{@link Vec3} to interpolate towards
   * @param alpha=1 - interpolation factor in the [0, 1] interval
   * @returns - this [vector]{@link Vec3} after linear interpolation
   */
  lerp(vector: Vec3 = new Vec3(), alpha = 1): Vec3 {
    this.x += (vector.x - this.x) * alpha
    this.y += (vector.y - this.y) * alpha
    this.z += (vector.z - this.z) * alpha

    return this
  }

  /**
   * Apply a [matrix]{@link Mat4} to a [vector]{@link Vec3}
   * Useful to convert a position [vector]{@link Vec3} from plane local world to webgl space using projection view matrix for example
   * Source code from: http://glmatrix.net/docs/vec3.js.html
   * @param matrix - [matrix]{@link Mat4} to use
   * @returns - this [vector]{@link Vec3} after [matrix]{@link Mat4} application
   */
  applyMat4(matrix: Mat4 = new Mat4()): Vec3 {
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

  /**
   * Apply a [quaternion]{@link Quat} (rotation in 3D space) to this [vector]{@link Vec3}
   * @param quaternion - [quaternion]{@link Quat} to use
   * @returns - this [vector]{@link Vec3} with the transformation applied
   */
  applyQuat(quaternion: Quat = new Quat()): Vec3 {
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

  /**
   * Rotate a [vector]{@link Vec3} around and axis by a given angle
   * @param axis - normalized [vector]{@link Vec3} around which to rotate
   * @param angle - angle (in radians) to rotate
   * @param quaternion - optional [quaternion]{@link Quat} to use for rotation computations
   * @returns - this [vector]{@link Vec3} with the rotation applied
   */
  applyAxisAngle(axis = new Vec3(), angle = 0, quaternion = new Quat()) {
    // https://github.com/mrdoob/three.js/blob/master/src/math/Vector3.js#L212
    return this.applyQuat(quaternion.setFromAxisAngle(axis, angle))
  }

  /**
   * Project a 3D coordinate [vector]{@link Vec3} to a 2D coordinate [vector]{@link Vec3}
   * @param camera - [camera]{@link Camera} to use for projection
   * @returns - projected [vector]{@link Vec3}
   */
  project(camera: Camera): Vec3 {
    this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix)
    return this
  }

  /**
   * Unproject a 2D coordinate [vector]{@link Vec3} to 3D coordinate [vector]{@link Vec3}
   * @param camera - [camera]{@link Camera} to use for projection
   * @returns - unprojected [vector]{@link Vec3}
   */
  unproject(camera: Camera): Vec3 {
    this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix)
    return this
  }
}
