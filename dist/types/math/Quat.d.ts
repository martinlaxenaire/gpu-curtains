import { Vec3 } from './Vec3';
import { Mat4 } from './Mat4';
/** Defines all possible rotations axis orders */
export type AxisOrder = 'XYZ' | 'XZY' | 'YXZ' | 'YZX' | 'ZXY' | 'ZYX';
/**
 * Really basic quaternion class used for 3D rotation calculations
 * @see https://github.com/mrdoosb/three.js/blob/dev/src/math/Quaternion.js
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
     * @param [elements] - initial array to use
     * @param [axisOrder='XYZ'] - axis order to use
     */
    constructor(elements?: Float32Array, axisOrder?: AxisOrder);
    /**
     * Sets the {@link Quat} values from an array
     * @param array - an array of at least 4 elements
     * @returns - this {@link Quat} after being set
     */
    setFromArray(array?: Float32Array | number[]): Quat;
    /**
     * Sets the {@link Quat} axis order
     * @param axisOrder - axis order to use
     * @returns - this {@link Quat} after axis order has been set
     */
    setAxisOrder(axisOrder?: AxisOrder | string): Quat;
    /**
     * Copy a {@link Quat} into this {@link Quat}
     * @param quaternion - {@link Quat} to copy
     * @returns - this {@link Quat} after copy
     */
    copy(quaternion?: Quat): Quat;
    /**
     * Clone a {@link Quat}
     * @returns - cloned {@link Quat}
     */
    clone(): Quat;
    /**
     * Check if 2 {@link Quat} are equal
     * @param quaternion - {@link Quat} to check against
     * @returns - whether the {@link Quat} are equal or not
     */
    equals(quaternion?: Quat): boolean;
    /**
     * Sets a rotation {@link Quat} using Euler angles {@link Vec3 | vector} and its axis order
     * @param vector - rotation {@link Vec3 | vector} to set our {@link Quat} from
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromVec3(vector: Vec3): Quat;
    /**
     * Set a {@link Quat} from a rotation axis {@link Vec3 | vector} and an angle
     * @param axis - normalized {@link Vec3 | vector} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromAxisAngle(axis: Vec3, angle?: number): Quat;
    /**
     * Set a {@link Quat} from a rotation {@link Mat4 | matrix}
     * @param matrix - rotation {@link Mat4 | matrix} to use
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromRotationMatrix(matrix: Mat4): Quat;
}
