import { Vec3 } from './Vec3';
type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';
/**
 * Quat class:
 * Really basic Quaternion class used for 3D rotation calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Quaternion.js
 */
export declare class Quat {
    /** The type of the {@link Quat} */
    type: string;
    /** Our quaternion array */
    elements: Float32Array;
    /** Rotation axis order */
    axisOrder: AxisOrder;
    /**
     * Quat constructor
     * @param elements - initial array to use
     * @param axisOrder='XYZ' - axis order to use
     */
    constructor(elements?: Float32Array, axisOrder?: AxisOrder);
    /**
     * Sets the [quaternion]{@link Quat} values from an array
     * @param array - an array of at least 4 elements
     * @returns - this [quaternion]{@link Quat} after being set
     */
    setFromArray(array?: Float32Array | number[]): Quat;
    /**
     * Sets the [quaternion]{@link Quat} axis order
     * @param axisOrder - axis order to use
     * @returns - this [quaternion]{@link Quat} after axis order has been set
     */
    setAxisOrder(axisOrder?: AxisOrder | string): Quat;
    /**
     * Copy a [quaternion]{@link Quat} into this [quaternion]{@link Quat}
     * @param quaternion - [quaternion]{@link Quat} to copy
     * @returns - this [quaternion]{@link Quat} after copy
     */
    copy(quaternion?: Quat): Quat;
    /**
     * Clone a [quaternion]{@link Quat}
     * @returns - cloned [quaternion]{@link Quat}
     */
    clone(): Quat;
    /**
     * Check if 2 [quaternions]{@link Quat} are equal
     * @param quaternion - [quaternion]{@link Quat} to check against
     * @returns - whether the [quaternions]{@link Quat} are equal or not
     */
    equals(quaternion?: Quat): boolean;
    /**
     * Sets a rotation [quaternion]{@link Quat} using Euler angles [vector]{@link Vec3} and its axis order
     * @param vector - rotation [vector]{@link Vec3} to set our [quaternion]{@link Quat} from
     * @returns - [quaternion]{@link Quat} after having applied the rotation
     */
    setFromVec3(vector?: Vec3): Quat;
}
export {};
