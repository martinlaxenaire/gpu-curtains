/***
 Here we create a Quat class object
 This is a really basic Quaternion class used for rotation calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js

 params :
 @elements (Float32Array of length 4): our quaternion array. Default to identity quaternion.

 @returns {Quat}: our Quat class object
 ***/
import { Vec3 } from './Vec3';
type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';
export declare class Quat {
    type: string;
    elements: Float32Array;
    axisOrder: AxisOrder;
    constructor(elements?: Float32Array, axisOrder?: AxisOrder);
    /***
     Sets the quaternion values from an array
  
     params:
     @array (array): an array of at least 4 elements
  
     @returns {Quat}: this quaternion after being set
     ***/
    setFromArray(array?: Float32Array | number[]): Quat;
    /***
     Sets the quaternion axis order
  
     params:
     @axisOrder (string): an array of at least 4 elements
  
     @returns {Quat}: this quaternion after axis order has been set
     ***/
    setAxisOrder(axisOrder?: AxisOrder | string): Quat;
    /***
     Copy a quaternion into this quaternion
  
     params:
     @vector (Quat): quaternion to copy
  
     @returns {Quat}: this quaternion after copy
     ***/
    copy(quaternion?: Quat): Quat;
    /***
     Clone a quaternion
  
     @returns {Quat}: cloned quaternion
     ***/
    clone(): Quat;
    /***
     Checks if 2 quaternions are equal
  
     @returns {boolean}: whether the quaternions are equals or not
     ***/
    equals(quaternion?: Quat): boolean;
    /***
     Sets a rotation quaternion using Euler angles and its axis order
  
     params:
     @vector (Vec3 class object): rotation vector to set our quaternion from
  
     @returns {Quat}: quaternion after having applied the rotation
     ***/
    setFromVec3(vector?: Vec3): Quat;
}
export {};
