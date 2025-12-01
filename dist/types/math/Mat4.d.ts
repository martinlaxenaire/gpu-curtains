import { Vec3 } from './Vec3';
import { Quat } from './Quat';
import { OrthographicCameraBaseOptions } from '../core/cameras/OrthographicCamera';
import { PerspectiveCameraBaseOptions } from '../core/cameras/PerspectiveCamera';
/** Defines the base parameters to create a perspective projection {@link Mat4}. */
export interface PerspectiveProjectionParams extends PerspectiveCameraBaseOptions {
    /** Perspective aspect ratio (width / height). Default to `1`. */
    aspect?: number;
}
/**
 * Basic 4x4 matrix class used for matrix calculations.
 *
 * Note that like three.js, the constructor and {@link set} method take arguments in row-major order, while internally they are stored in the {@link elements} array in column-major order.
 *
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Matrix4.js
 * @see http://glmatrix.net/docs/mat4.js.html
 */
export declare class Mat4 {
    /** The type of the {@link Mat4}. */
    type: string;
    /** Our matrix array. */
    elements: Float32Array;
    /**
     * Mat4 constructor
     * @param elements - Initial array to use, default to identity matrix.
     */
    constructor(elements?: Float32Array);
    /***
     * Sets the matrix from 16 numbers.
     *
     * @param n11 - number
     * @param n12 - number
     * @param n13 - number
     * @param n14 - number
     * @param n21 - number
     * @param n22 - number
     * @param n23 - number
     * @param n24 - number
     * @param n31 - number
     * @param n32 - number
     * @param n33 - number
     * @param n34 - number
     * @param n41 - number
     * @param n42 - number
     * @param n43 - number
     * @param n44 - number
     *
     * @returns - This {@link Mat4} after being set.
     */
    set(n11: number, n12: number, n13: number, n14: number, n21: number, n22: number, n23: number, n24: number, n31: number, n32: number, n33: number, n34: number, n41: number, n42: number, n43: number, n44: number): Mat4;
    /**
     * Sets the {@link Mat4} to an identity matrix.
     * @returns - This {@link Mat4} after being set.
     */
    identity(): Mat4;
    /**
     * Sets the {@link Mat4} values from an array.
     * @param array - Array to use.
     * @param offset - Optional offset in the array to use.
     * @returns - This {@link Mat4} after being set.
     */
    setFromArray(array?: Float32Array | number[], offset?: number): Mat4;
    /**
     * Copy another {@link Mat4}.
     * @param matrix - Matrix to copy.
     * @returns - This {@link Mat4} after being set.
     */
    copy(matrix?: Mat4): Mat4;
    /**
     * Clone a {@link Mat4}.
     * @returns - Cloned {@link Mat4}.
     */
    clone(): Mat4;
    /**
     * Multiply this {@link Mat4} with another {@link Mat4}.
     * @param matrix - {@link Mat4} to multiply with.
     * @returns - This {@link Mat4} after multiplication.
     */
    multiply(matrix?: Mat4): Mat4;
    /**
     * Multiply another {@link Mat4} with this {@link Mat4}.
     * @param matrix - {@link Mat4} to multiply with.
     * @returns - This {@link Mat4} after multiplication.
     */
    premultiply(matrix?: Mat4): Mat4;
    /**
     * Multiply two {@link Mat4}.
     * @param a - First {@link Mat4}.
     * @param b - Second {@link Mat4}.
     * @returns - {@link Mat4} resulting from the multiplication.
     */
    multiplyMatrices(a?: Mat4, b?: Mat4): Mat4;
    /**
     * {@link premultiply} this {@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector)).
     * @param vector - Translation {@link Vec3} to use.
     * @returns - This {@link Mat4} after the premultiply translate operation.
     */
    premultiplyTranslate(vector?: Vec3): Mat4;
    /**
     * {@link premultiply} this {@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector)).
     * @param vector - Scale {@link Vec3 | vector} to use.
     * @returns - This {@link Mat4} after the premultiply scale operation.
     */
    premultiplyScale(vector?: Vec3): Mat4;
    /**
     * Computes and returns the determinant of this {@link Mat4}.
     * Based on the method outlined [here](http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.html).
     * @return - The determinant.
     */
    determinant(): number;
    /**
     * Get the {@link Mat4} inverse.
     * @returns - the inverted {@link Mat4}.
     */
    invert(): Mat4;
    /**
     * Clone and invert the {@link Mat4}.
     * @returns - Inverted cloned {@link Mat4}.
     */
    getInverse(): Mat4;
    /**
     * Transpose this {@link Mat4}.
     * @returns - The transposed {@link Mat4}.
     */
    transpose(): Mat4;
    /**
     * Translate a {@link Mat4}.
     * @param vector - Translation {@link Vec3} to use.
     * @returns - Translated {@link Mat4}.
     */
    translate(vector?: Vec3): Mat4;
    /**
     * Get the translation {@link Vec3} component of a {@link Mat4}.
     * @param position - {@link Vec3} to set.
     * @returns - Translation {@link Vec3} component of this {@link Mat4}.
     */
    getTranslation(position?: Vec3): Vec3;
    /**
     * Scale a {@link Mat4}.
     * @param vector - Scale {@link Vec3 | vector} to use.
     * @returns - Scaled {@link Mat4}.
     */
    scale(vector?: Vec3): Mat4;
    /**
     * Rotate a {@link Mat4} from a {@link Quat | quaternion}.
     * @param quaternion - {@link Quat | quaternion} to use.
     * @returns - Rotated {@link Mat4}.
     */
    rotateFromQuaternion(quaternion?: Quat): Mat4;
    /**
     * Get the maximum scale of the {@link Mat4} on all axes.
     * @returns - Maximum scale of the {@link Mat4}.
     */
    getMaxScaleOnAxis(): number;
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale.
     * Equivalent for applying translation, rotation and scale matrices but much faster.
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - Translation {@link Vec3 | vector} to use.
     * @param quaternion - {@link Quat | quaternion} to use.
     * @param scale - Translation {@link Vec3 | vector} to use.
     * @returns - Transformed {@link Mat4}.
     */
    compose(translation?: Vec3, quaternion?: Quat, scale?: Vec3): Mat4;
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale, rotating and scaling around the given {@link Vec3 | origin vector}.
     * Equivalent for applying translation, rotation and scale matrices but much faster.
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - Translation {@link Vec3 | vector} to use.
     * @param quaternion - {@link Quat | quaternion} to use.
     * @param scale - Translation {@link Vec3 | vector} to use.
     * @param origin - Origin {@link Vec3 | vector} around which to scale and rotate.
     * @returns - Transformed {@link Mat4}.
     */
    composeFromOrigin(translation?: Vec3, quaternion?: Quat, scale?: Vec3, origin?: Vec3): Mat4;
    /**
     * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}.
     * @param eye - {@link Vec3 | position vector} of the object that should be rotated.
     * @param target - {@link Vec3 | target vector} to look at.
     * @param up - Up {@link Vec3 | vector}.
     * @returns - Rotated {@link Mat4}.
     */
    lookAt(eye?: Vec3, target?: Vec3, up?: Vec3): Mat4;
    /**
     * Compute a view {@link Mat4} matrix.
     *
     * This is a view matrix which transforms all other objects
     * to be in the space of the view defined by the parameters.
     *
     * Equivalent to `matrix.lookAt(eye, target, up).invert()` but faster.
     *
     * @param eye - The position of the object.
     * @param target - The position meant to be aimed at.
     * @param up - A vector pointing up.
     * @returns - The view {@link Mat4} matrix.
     */
    makeView(eye?: Vec3, target?: Vec3, up?: Vec3): Mat4;
    /**
     * Create an orthographic {@link Mat4} matrix based on the parameters. Transforms from
     *  * the given the left, right, bottom, and top dimensions to -1 +1 in x, and y
     *  * and 0 to +1 in z.
     *
     * @param parameters - {@link OrthographicCameraBaseOptions | parameters} used to create the camera orthographic matrix.
     * @returns - The camera orthographic {@link Mat4} matrix.
     */
    makeOrthographic({ left, right, bottom, top, near, far, }: OrthographicCameraBaseOptions): Mat4;
    /**
     * Create a perspective {@link Mat4} matrix based on the parameters.
     *
     * Note, The matrix generated sends the viewing frustum to the unit box.
     * We assume a unit box extending from -1 to 1 in the x and y dimensions and
     * from -1 to 1 in the z dimension, as three.js and more generally WebGL handles it.
     *
     * @param parameters - {@link PerspectiveProjectionParams | parameters} used to create the camera perspective matrix.
     * @returns - The camera perspective {@link Mat4} matrix.
     */
    makePerspective({ fov, aspect, near, far }: PerspectiveProjectionParams): Mat4;
}
