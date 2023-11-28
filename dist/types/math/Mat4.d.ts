import { Vec3 } from './Vec3';
import { Quat } from './Quat';
/**
 * Mat4 class:
 * This is a really basic Matrix4 class used for matrix calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js and http://glmatrix.net/docs/mat4.js.html
 */
export declare class Mat4 {
    /** The type of the {@link Mat4} */
    type: string;
    /** Our matrix array */
    elements: Float32Array;
    /**
     * Mat4 constructor
     * @param elements - initial array to use, default to identity matrix
     */
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
     * @returns - this [matrix]{@link Mat4} after being set
     */
    set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): Mat4;
    /**
     * Sets the [matrix]{@link Mat4} to an identity matrix
     * @returns - this [matrix]{@link Mat4} after being set
     */
    identity(): Mat4;
    /**
     * Sets the [matrix]{@link Mat4} values from an array
     * @param array - array to use
     * @returns - this [matrix]{@link Mat4} after being set
     */
    setFromArray(array?: Float32Array | number[]): Mat4;
    /**
     * Copy another [matrix]{@link Mat4}
     * @param matrix
     * @returns - this [matrix]{@link Mat4} after being set
     */
    copy(matrix?: Mat4): Mat4;
    /**
     * Clone a [matrix]{@link Mat4}
     * @returns - cloned [matrix]{@link Mat4}
     */
    clone(): Mat4;
    /**
     * Multiply this [matrix]{@link Mat4} with another [matrix]{@link Mat4}
     * @param matrix - [matrix]{@link Mat4} to multiply with
     * @returns - this [matrix]{@link Mat4} after multiplication
     */
    multiply(matrix?: Mat4): Mat4;
    /**
     * Multiply another [matrix]{@link Mat4} with this [matrix]{@link Mat4}
     * @param matrix - [matrix]{@link Mat4} to multiply with
     * @returns - this [matrix]{@link Mat4} after multiplication
     */
    premultiply(matrix?: Mat4): Mat4;
    /**
     * Multiply two [matrices]{@link Mat4}
     * @param a - first [matrix]{@link Mat4}
     * @param b - second [matrix]{@link Mat4}
     * @returns - [matrix]{@link Mat4} resulting from the multiplication
     */
    multiplyMatrices(a?: Mat4, b?: Mat4): Mat4;
    /**
     * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector))
     * @param vector - translation [vector]{@link Vec3} to use
     * @returns - this [matrix]{@link Mat4} after the premultiply translate operation
     */
    premultiplyTranslate(vector?: Vec3): Mat4;
    /**
     * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector))
     * @param vector - scale [vector]{@link Vec3} to use
     * @returns - this [matrix]{@link Mat4} after the premultiply scale operation
     */
    premultiplyScale(vector?: Vec3): Mat4;
    /**
     * Get the [matrix]{@link Mat4} inverse
     * @returns - inverted [matrix]{@link Mat4}
     */
    getInverse(): Mat4;
    /**
     * Translate a [matrix]{@link Mat4}
     * @param vector - translation [vector]{@link Vec3} to use
     * @returns - translated [matrix]{@link Mat4}
     */
    translate(vector?: Vec3): Mat4;
    /**
     * Scale a [matrix]{@link Mat4}
     * @param vector - scale [vector]{@link Vec3} to use
     * @returns - scaled [matrix]{@link Mat4}
     */
    scale(vector?: Vec3): Mat4;
    /**
     * Rotate a [matrix]{@link Mat4} from a [quaternion]{@link Quat}
     * @param quaternion - [quaternion]{@link Vec3} to use
     * @returns - rotated [matrix]{@link Mat4}
     */
    rotateFromQuaternion(quaternion?: Quat): Mat4;
    /**
     * Set this [matrix]{@link Mat4} as a rotation matrix based on an eye, target and up [vectors]{@link Vec3}
     * @param eye - [position]{@link Vec3} of the object that should be rotated
     * @param target - [target]{@link Vec3} to look at
     * @param up - up [vector]{@link Vec3}
     * @returns - rotated [matrix]{@link Mat4}
     */
    lookAt(eye?: Vec3, target?: Vec3, up?: Vec3): Mat4;
    /**
     * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation [vector]{@link Vec3} to use
     * @param quaternion - [quaternion]{@link Quat} to use
     * @param scale - translation [vector]{@link Vec3} to use
     * @returns - transformed [matrix]{@link Mat4}
     */
    compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4;
    /**
     * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale, rotating and scaling around the given [origin]{@link Vec3}
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation [vector]{@link Vec3} to use
     * @param quaternion - [quaternion]{@link Quat} to use
     * @param scale - translation [vector]{@link Vec3} to use
     * @param origin - origin [vector]{@link Vec3} around which to scale and rotate
     * @returns - transformed [matrix]{@link Mat4}
     */
    composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4;
}
