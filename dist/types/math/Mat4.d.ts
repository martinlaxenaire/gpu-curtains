import { Vec3 } from './Vec3';
import { Quat } from './Quat';
/**
 * Really basic 4x4 matrix class used for matrix calculations.
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js
 * @see http://glmatrix.net/docs/mat4.js.html
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
     * @returns - this {@link Mat4} after being set
     */
    set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): Mat4;
    /**
     * Sets the {@link Mat4} to an identity matrix
     * @returns - this {@link Mat4} after being set
     */
    identity(): Mat4;
    /**
     * Sets the {@link Mat4} values from an array
     * @param array - array to use
     * @returns - this {@link Mat4} after being set
     */
    setFromArray(array?: Float32Array | number[]): Mat4;
    /**
     * Copy another {@link Mat4}
     * @param matrix
     * @returns - this {@link Mat4} after being set
     */
    copy(matrix?: Mat4): Mat4;
    /**
     * Clone a {@link Mat4}
     * @returns - cloned {@link Mat4}
     */
    clone(): Mat4;
    /**
     * Multiply this {@link Mat4} with another {@link Mat4}
     * @param matrix - {@link Mat4} to multiply with
     * @returns - this {@link Mat4} after multiplication
     */
    multiply(matrix?: Mat4): Mat4;
    /**
     * Multiply another {@link Mat4} with this {@link Mat4}
     * @param matrix - {@link Mat4} to multiply with
     * @returns - this {@link Mat4} after multiplication
     */
    premultiply(matrix?: Mat4): Mat4;
    /**
     * Multiply two {@link Mat4}
     * @param a - first {@link Mat4}
     * @param b - second {@link Mat4}
     * @returns - {@link Mat4} resulting from the multiplication
     */
    multiplyMatrices(a?: Mat4, b?: Mat4): Mat4;
    /**
     * {@link premultiply} this {@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector))
     * @param vector - translation {@link Vec3 | vector} to use
     * @returns - this {@link Mat4} after the premultiply translate operation
     */
    premultiplyTranslate(vector?: Vec3): Mat4;
    /**
     * {@link premultiply} this {@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector))
     * @param vector - scale {@link Vec3 | vector} to use
     * @returns - this {@link Mat4} after the premultiply scale operation
     */
    premultiplyScale(vector?: Vec3): Mat4;
    /**
     * Get the {@link Mat4} inverse
     * @returns - the inverted {@link Mat4}
     */
    invert(): Mat4;
    /**
     * Clone and invert the {@link Mat4}
     * @returns - inverted cloned {@link Mat4}
     */
    getInverse(): Mat4;
    /**
     * Transpose this {@link Mat4}
     * @returns - the transposed {@link Mat4}
     */
    transpose(): Mat4;
    /**
     * Translate a {@link Mat4}
     * @param vector - translation {@link Vec3 | vector} to use
     * @returns - translated {@link Mat4}
     */
    translate(vector?: Vec3): Mat4;
    /**
     * Scale a {@link Mat4}
     * @param vector - scale {@link Vec3 | vector} to use
     * @returns - scaled {@link Mat4}
     */
    scale(vector?: Vec3): Mat4;
    /**
     * Rotate a {@link Mat4} from a {@link Quat | quaternion}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - rotated {@link Mat4}
     */
    rotateFromQuaternion(quaternion?: Quat): Mat4;
    /**
     * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}
     * @param eye - {@link Vec3 | position vector} of the object that should be rotated
     * @param target - {@link Vec3 | target vector} to look at
     * @param up - up {@link Vec3 | vector}
     * @returns - rotated {@link Mat4}
     */
    lookAt(eye?: Vec3, target?: Vec3, up?: Vec3): Mat4;
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
    compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4;
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
    composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4;
    /**
     * Get the translation {@link Vec3} component of a {@link Mat4}
     * @param position - {@link Vec3} to set
     * @returns - translation {@link Vec3} component of this {@link Mat4}
     */
    getTranslation(position?: Vec3): Vec3;
}
