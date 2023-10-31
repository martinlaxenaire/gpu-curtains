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
import { Mat4 } from './Mat4';
import { Quat } from './Quat';
import { Camera } from '../core/camera/Camera';
export declare class Vec3 {
    type: string;
    private _x;
    private _y;
    private _z;
    _onChangeCallback?(): void;
    constructor(x?: number, y?: number, z?: number);
    /***
     Getters and setters (with onChange callback)
     ***/
    get x(): number;
    set x(value: number);
    get y(): number;
    set y(value: number);
    get z(): number;
    set z(value: number);
    onChange(callback: () => void): Vec3;
    /***
     Sets the vector from values
  
     params:
     @x (float): X component of our vector
     @y (float): Y component of our vector
     @z (float): Z component of our vector
  
     @returns {Vec3}: this vector after being set
     ***/
    set(x?: number, y?: number, z?: number): Vec3;
    /***
     Adds a vector to this vector
  
     params:
     @vector (Vec3): vector to add
  
     @returns {Vec3}: this vector after addition
     ***/
    add(vector?: Vec3): Vec3;
    /***
     Adds a scalar to this vector
  
     params:
     @value (float): number to add
  
     @returns {Vec3}: this vector after addition
     ***/
    addScalar(value?: number): Vec3;
    /***
     Subtracts a vector from this vector
  
     params:
     @vector (Vec3): vector to use for subtraction
  
     @returns {Vec3}: this vector after subtraction
     ***/
    sub(vector?: Vec3): Vec3;
    /***
     Subtracts a scalar to this vector
  
     params:
     @value (float): number to use for subtraction
  
     @returns {Vec3}: this vector after subtraction
     ***/
    subScalar(value?: number): Vec3;
    /***
     Multiplies a vector with this vector
  
     params:
     @vector (Vec3): vector to use for multiplication
  
     @returns {Vec3}: this vector after multiplication
     ***/
    multiply(vector?: Vec3): Vec3;
    /***
     Multiplies a scalar with this vector
  
     params:
     @value (float): number to use for multiplication
  
     @returns {Vec3}: this vector after multiplication
     ***/
    multiplyScalar(value?: number): Vec3;
    /***
     Copy a vector into this vector
  
     params:
     @vector (Vec3): vector to copy
  
     @returns {Vec3}: this vector after copy
     ***/
    copy(vector?: Vec3): Vec3;
    /***
     Clone this vector
  
     @returns {Vec3}: cloned vector
     ***/
    clone(): Vec3;
    /***
     Apply max values to this vector
  
     params:
     @vector (Vec3): vector representing max values
  
     @returns {Vec3}: vector with max values applied
     ***/
    max(vector?: Vec3): Vec3;
    /***
     Apply min values to this vector
  
     params:
     @vector (Vec3): vector representing min values
  
     @returns {Vec3}: vector with min values applied
     ***/
    min(vector?: Vec3): Vec3;
    /***
     Checks if 2 vectors are equal
  
     @returns {boolean}: whether the vectors are equals or not
     ***/
    equals(vector?: Vec3): boolean;
    /***
     Normalize this vector
  
     @returns {Vec3}: normalized vector
     ***/
    normalize(): Vec3;
    /***
     Calculates the dot product of 2 vectors
  
     @returns {number}: dot product of the 2 vectors
     ***/
    dot(vector?: Vec3): number;
    lerp(vector?: Vec3, alpha?: number): Vec3;
    /***
     Apply a matrix 4 to a point (vec3)
     Useful to convert a point position from plane local world to webgl space using projection view matrix for example
     Source code from: http://glmatrix.net/docs/vec3.js.html
  
     params :
     @matrix (array): 4x4 matrix used
  
     @returns {Vec3}: this vector after matrix application
     ***/
    applyMat4(matrix?: Mat4): Vec3;
    /***
     Apply a quaternion (rotation in 3D space) to this vector
  
     params :
     @quaternion (Quat): quaternion to use
  
     @returns {Vec3}: this vector after applying the transformation
     ***/
    applyQuat(quaternion?: Quat): Vec3;
    /***
     Project 3D coordinate to 2D point
  
     params:
     @camera (Camera): camera to use for projection
  
     @returns {Vec3}
     ***/
    project(camera: Camera): Vec3;
    /***
     Unproject 2D point to 3D coordinate
  
     params:
     @camera (Camera): camera to use for projection
  
     @returns {Vec3}
     ***/
    unproject(camera: Camera): Vec3;
}
