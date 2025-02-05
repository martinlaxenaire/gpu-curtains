import { Mat4 } from './Mat4';
/**
 * Basic 3x3 matrix class used for matrix calculations.
 *
 * Note that like three.js, the constructor and {@link set} method take arguments in row-major order, while internally they are stored in the {@link elements} array in column-major order.
 *
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix3.js
 * @see http://glmatrix.net/docs/mat3.js.html
 */
export declare class Mat3 {
    /** The type of the {@link Mat3} */
    type: string;
    /** Our matrix array */
    elements: Float32Array;
    /**
     * Mat3 constructor
     * @param elements - initial array to use, default to identity matrix
     */
    constructor(elements?: Float32Array);
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
    set(n11: number, n12: number, n13: number, n21: number, n22: number, n23: number, n31: number, n32: number, n33: number): Mat3;
    /**
     * Sets the {@link Mat3} to an identity matrix
     * @returns - this {@link Mat3} after being set
     */
    identity(): Mat3;
    /**
     * Sets the {@link Mat3} values from an array
     * @param array - array to use
     * @param offset - optional offset in the array to use
     * @returns - this {@link Mat3} after being set
     */
    setFromArray(array?: Float32Array | number[], offset?: number): Mat3;
    /**
     * Copy another {@link Mat3}
     * @param matrix - matrix to copy
     * @returns - this {@link Mat3} after being set
     */
    copy(matrix?: Mat3): Mat3;
    /**
     * Clone a {@link Mat3}
     * @returns - cloned {@link Mat3}
     */
    clone(): Mat3;
    /**
     * Set a {@link Mat3} from a {@link Mat4}.
     * @param matrix - {@link Mat4} to use.
     * @returns - this {@link Mat3} after being set.
     */
    setFromMat4(matrix?: Mat4): this;
    /**
     * Multiply this {@link Mat3} with another {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    multiply(matrix?: Mat3): Mat3;
    /**
     * Multiply another {@link Mat3} with this {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    premultiply(matrix?: Mat3): Mat3;
    /**
     * Multiply two {@link Mat3}
     * @param a - first {@link Mat3}
     * @param b - second {@link Mat3}
     * @returns - {@link Mat3} resulting from the multiplication
     */
    multiplyMatrices(a?: Mat3, b?: Mat3): Mat3;
    /**
     * Invert this {@link Mat3}.
     * @returns - this {@link Mat3} after being inverted
     */
    invert(): Mat3;
    /**
     * Transpose this {@link Mat3}.
     * @returns - this {@link Mat3} after being transposed
     */
    transpose(): Mat3;
    /**
     * Compute a normal {@link Mat3} matrix from a {@link Mat4} transformation matrix.
     * @param matrix - {@link Mat4} transformation matrix
     * @returns - this {@link Mat3} after being inverted and transposed
     */
    getNormalMatrix(matrix?: Mat4): Mat3;
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
    setUVTransform(tx?: number, ty?: number, sx?: number, sy?: number, rotation?: number, cx?: number, cy?: number): Mat3;
}
