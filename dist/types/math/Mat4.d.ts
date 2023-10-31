/***
 Here we create a Mat4 class object
 This is a really basic Matrix4 class used for matrix calculations
 Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js and http://glmatrix.net/docs/mat4.js.html

 params :
 @elements (Float32Array of length 16): our matrix array. Default to identity matrix.

 @returns {Mat4}: our Mat4 class object
 ***/
import { Vec3 } from './Vec3';
import { Quat } from './Quat';
export declare class Mat4 {
    type: string;
    elements: Float32Array;
    constructor(elements?: Float32Array);
    /***
     * Sets the matrix from 16 numbers
     *
     * @param n11 number
     * @param n12 number
     * @param n13 number
     * @param n14 number
     * @param n21 number
     * @param n22 number
     * @param n23 number
     * @param n24 number
     * @param n31 number
     * @param n32 number
     * @param n33 number
     * @param n34 number
     * @param n41 number
     * @param n42 number
     * @param n43 number
     * @param n44 number
     *
     * @returns {Mat4}: this matrix after being set
     */
    set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): Mat4;
    /***
     Sets the matrix to an identity matrix
  
     @returns {Mat4}: this matrix after being set
     ***/
    identity(): Mat4;
    /***
     Sets the matrix values from an array
  
     @param {Float32Array} array of at least 16 elements
  
     @returns {Mat4}: this matrix after being set
     ***/
    setFromArray(array?: Float32Array | number[]): Mat4;
    /***
     * Copy another Mat4
     *
     * @param matrix {Mat4}: matrix to copy
     * @returns {Mat4}: this matrix after copy
     */
    copy(matrix?: Mat4): Mat4;
    /***
     * Clone a matrix
     *
     * @returns {Mat4}: cloned matrix
     */
    clone(): Mat4;
    /***
     Simple matrix multiplication helper
  
     params:
     @matrix (Mat4 class object): Mat4 to multiply with
  
     @returns {Mat4}: Mat4 after multiplication
     ***/
    multiply(matrix?: Mat4): Mat4;
    premultiply(matrix?: Mat4): Mat4;
    multiplyMatrices(a?: Mat4, b?: Mat4): Mat4;
    premultiplyTranslate(vector?: Vec3): Mat4;
    premultiplyScale(vector?: Vec3): Mat4;
    /***
     Get matrix inverse
  
     @returns {Mat4}: inverted Mat4
     ***/
    getInverse(): Mat4;
    translate(vector?: Vec3): Mat4;
    /***
     Simple Mat4 scaling helper
  
     params :
     @vector (Vec3 class object): Vec3 representing scale along X, Y and Z axis
  
     @returns {Mat4}: Mat4 after scaling
     ***/
    scale(vector?: Vec3): Mat4;
    rotateFromQuaternion(quaternion?: Quat): Mat4;
    /***
     Creates a matrix from a quaternion rotation, vector translation and vector scale
     Equivalent for applying translation, rotation and scale matrices but much faster
     Source code from: http://glmatrix.net/docs/mat4.js.html
  
     params :
     @translation (Vec3 class object): translation vector
     @quaternion (Quat class object): rotation quaternion
     @scale (Vec3 class object): scale vector
  
     @returns {Mat4}: matrix after transformations
     ***/
    compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4;
    /***
     Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
     Equivalent for applying translation, rotation and scale matrices but much faster
     Source code from: http://glmatrix.net/docs/mat4.js.html
  
     params :
     @translation (Vec3 class object): translation vector
     @quaternion (Quat class object): rotation quaternion
     @scale (Vec3 class object): scale vector
     @origin (Vec3 class object): origin vector around which to scale and rotate
  
     @returns {Mat4}: matrix after transformations
     ***/
    composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4;
}
