/***
 Here we create a Quat class object
 This is a really basic Quaternion class used for rotation calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js

 params :
 @elements (Float32Array of length 4): our quaternion array. Default to identity quaternion.

 @returns {Quat}: our Quat class object
 ***/

import { Vec3 } from './Vec3'

type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX'

// TODO lot of (unused at the time) methods are missing

export class Quat {
  type: string
  elements: Float32Array
  axisOrder: AxisOrder

  constructor(elements: Float32Array = new Float32Array([0, 0, 0, 1]), axisOrder: AxisOrder = 'XYZ') {
    this.type = 'Quat'
    this.elements = elements
    // rotation axis order
    this.axisOrder = axisOrder
  }

  /***
   Sets the quaternion values from an array

   params:
   @array (array): an array of at least 4 elements

   @returns {Quat}: this quaternion after being set
   ***/
  setFromArray(array: Float32Array | number[] = new Float32Array([0, 0, 0, 1])): Quat {
    this.elements[0] = array[0]
    this.elements[1] = array[1]
    this.elements[2] = array[2]
    this.elements[3] = array[3]

    return this
  }

  /***
   Sets the quaternion axis order

   params:
   @axisOrder (string): an array of at least 4 elements

   @returns {Quat}: this quaternion after axis order has been set
   ***/
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

  /***
   Copy a quaternion into this quaternion

   params:
   @vector (Quat): quaternion to copy

   @returns {Quat}: this quaternion after copy
   ***/
  copy(quaternion: Quat = new Quat()): Quat {
    this.elements = quaternion.elements
    this.axisOrder = quaternion.axisOrder

    return this
  }

  /***
   Clone a quaternion

   @returns {Quat}: cloned quaternion
   ***/
  clone(): Quat {
    return new Quat().copy(this)
  }

  /***
   Checks if 2 quaternions are equal

   @returns {boolean}: whether the quaternions are equals or not
   ***/
  equals(quaternion: Quat = new Quat()): boolean {
    return (
      this.elements[0] === quaternion.elements[0] &&
      this.elements[1] === quaternion.elements[1] &&
      this.elements[2] === quaternion.elements[2] &&
      this.elements[3] === quaternion.elements[3] &&
      this.axisOrder === quaternion.axisOrder
    )
  }

  /***
   Sets a rotation quaternion using Euler angles and its axis order

   params:
   @vector (Vec3 class object): rotation vector to set our quaternion from

   @returns {Quat}: quaternion after having applied the rotation
   ***/
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
}
