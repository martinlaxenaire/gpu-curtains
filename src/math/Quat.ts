import { Vec3 } from './Vec3'
import { Mat4 } from './Mat4'

type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

/**
 * Quat class:
 * Really basic Quaternion class used for 3D rotation calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js
 */
export class Quat {
  /** The type of the {@link Quat} */
  type: string
  /** Our quaternion array */
  elements: Float32Array
  /** Rotation axis order */
  axisOrder: AxisOrder

  /**
   * Quat constructor
   * @param elements - initial array to use
   * @param axisOrder='XYZ' - axis order to use
   */
  constructor(elements: Float32Array = new Float32Array([0, 0, 0, 1]), axisOrder: AxisOrder = 'XYZ') {
    this.type = 'Quat'
    this.elements = elements
    // rotation axis order
    this.axisOrder = axisOrder
  }

  /**
   * Sets the [quaternion]{@link Quat} values from an array
   * @param array - an array of at least 4 elements
   * @returns - this [quaternion]{@link Quat} after being set
   */
  setFromArray(array: Float32Array | number[] = new Float32Array([0, 0, 0, 1])): Quat {
    this.elements[0] = array[0]
    this.elements[1] = array[1]
    this.elements[2] = array[2]
    this.elements[3] = array[3]

    return this
  }

  /**
   * Sets the [quaternion]{@link Quat} axis order
   * @param axisOrder - axis order to use
   * @returns - this [quaternion]{@link Quat} after axis order has been set
   */
  setAxisOrder(axisOrder: AxisOrder | string = 'XYZ'): Quat {
    // force uppercase for strict equality tests
    axisOrder = axisOrder.toUpperCase()

    switch (axisOrder) {
      case 'XYZ':
      case 'YXZ':
      case 'ZXY':
      case 'ZYX':
      case 'YZX':
      case 'XZY':
        this.axisOrder = axisOrder
        break
      default:
        // apply a default axis order
        this.axisOrder = 'XYZ'
    }

    return this
  }

  /**
   * Copy a [quaternion]{@link Quat} into this [quaternion]{@link Quat}
   * @param quaternion - [quaternion]{@link Quat} to copy
   * @returns - this [quaternion]{@link Quat} after copy
   */
  copy(quaternion: Quat = new Quat()): Quat {
    this.elements = quaternion.elements
    this.axisOrder = quaternion.axisOrder

    return this
  }

  /**
   * Clone a [quaternion]{@link Quat}
   * @returns - cloned [quaternion]{@link Quat}
   */
  clone(): Quat {
    return new Quat().copy(this)
  }

  /**
   * Check if 2 [quaternions]{@link Quat} are equal
   * @param quaternion - [quaternion]{@link Quat} to check against
   * @returns - whether the [quaternions]{@link Quat} are equal or not
   */
  equals(quaternion: Quat = new Quat()): boolean {
    return (
      this.elements[0] === quaternion.elements[0] &&
      this.elements[1] === quaternion.elements[1] &&
      this.elements[2] === quaternion.elements[2] &&
      this.elements[3] === quaternion.elements[3] &&
      this.axisOrder === quaternion.axisOrder
    )
  }

  /**
   * Sets a rotation [quaternion]{@link Quat} using Euler angles [vector]{@link Vec3} and its axis order
   * @param vector - rotation [vector]{@link Vec3} to set our [quaternion]{@link Quat} from
   * @returns - [quaternion]{@link Quat} after having applied the rotation
   */
  setFromVec3(vector: Vec3 = new Vec3()): Quat {
    const ax = vector.x * 0.5
    const ay = vector.y * 0.5
    const az = vector.z * 0.5

    const cosx = Math.cos(ax)
    const cosy = Math.cos(ay)
    const cosz = Math.cos(az)
    const sinx = Math.sin(ax)
    const siny = Math.sin(ay)
    const sinz = Math.sin(az)

    // XYZ order
    if (this.axisOrder === 'XYZ') {
      this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz
    } else if (this.axisOrder === 'YXZ') {
      this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz
    } else if (this.axisOrder === 'ZXY') {
      this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz
    } else if (this.axisOrder === 'ZYX') {
      this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz
    } else if (this.axisOrder === 'YZX') {
      this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz
    } else if (this.axisOrder === 'XZY') {
      this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz
      this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz
      this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz
      this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz
    }

    return this
  }

  /**
   * Set a [quaternion]{@link Quat} from a rotation axis [vector]{@link Vec3} and an angle
   * @param axis - normalized [vector]{@link Vec3} around which to rotate
   * @param angle - angle (in radians) to rotate
   * @returns - [quaternion]{@link Quat} after having applied the rotation
   */
  setFromAxisAngle(axis: Vec3 = new Vec3(), angle = 0): Quat {
    // https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js#L275
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/angleToQuaternion/index.htm

    // assumes axis is normalized

    const halfAngle = angle / 2,
      s = Math.sin(halfAngle)

    this.elements[0] = axis.x * s
    this.elements[1] = axis.y * s
    this.elements[2] = axis.z * s
    this.elements[3] = Math.cos(halfAngle)

    return this
  }

  /**
   * Set a [quaternion]{@link Quat} from a rotation [matrix]{@link Mat4}
   * @param matrix - rotation [matrix]{@link Mat4} to use
   * @returns - [quaternion]{@link Quat} after having applied the rotation
   */
  setFromRotationMatrix(matrix: Mat4): Quat {
    // http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
    // assumes the upper 3x3 of m is a pure rotation matrix (i.e, unscaled)
    const te = matrix.elements,
      m11 = te[0],
      m12 = te[4],
      m13 = te[8],
      m21 = te[1],
      m22 = te[5],
      m23 = te[9],
      m31 = te[2],
      m32 = te[6],
      m33 = te[10],
      trace = m11 + m22 + m33

    if (trace > 0) {
      const s = 0.5 / Math.sqrt(trace + 1.0)

      this.elements[3] = 0.25 / s
      this.elements[0] = (m32 - m23) * s
      this.elements[1] = (m13 - m31) * s
      this.elements[2] = (m21 - m12) * s
    } else if (m11 > m22 && m11 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m11 - m22 - m33)

      this.elements[3] = (m32 - m23) / s
      this.elements[0] = 0.25 * s
      this.elements[1] = (m12 + m21) / s
      this.elements[2] = (m13 + m31) / s
    } else if (m22 > m33) {
      const s = 2.0 * Math.sqrt(1.0 + m22 - m11 - m33)

      this.elements[3] = (m13 - m31) / s
      this.elements[0] = (m12 + m21) / s
      this.elements[1] = 0.25 * s
      this.elements[2] = (m23 + m32) / s
    } else {
      const s = 2.0 * Math.sqrt(1.0 + m33 - m11 - m22)

      this.elements[3] = (m21 - m12) / s
      this.elements[0] = (m13 + m31) / s
      this.elements[1] = (m23 + m32) / s
      this.elements[2] = 0.25 * s
    }

    return this
  }
}
