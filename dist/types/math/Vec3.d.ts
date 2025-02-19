import { Mat4 } from './Mat4';
import { Quat } from './Quat';
import { Camera } from '../core/cameras/Camera';
/**
 * Really basic 3D vector class used for vector calculations
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Vector3.js
 * @see http://glmatrix.net/docs/vec3.js.html
 */
export declare class Vec3 {
    /** The type of the {@link Vec3} */
    type: string;
    /** X component of our {@link Vec3} */
    private _x;
    /** Y component of our {@link Vec3} */
    private _y;
    /** Z component of our {@link Vec3} */
    private _z;
    /** function assigned to the {@link onChange} callback */
    _onChangeCallback?(): void;
    /**
     * Vec3 constructor
     * @param x - X component of our {@link Vec3}
     * @param y - Y component of our {@link Vec3}
     * @param z - Z component of our {@link Vec3}
     */
    constructor(x?: number, y?: number, z?: number);
    /**
     * Get the X component of the {@link Vec3}
     */
    get x(): number;
    /**
     * Set the X component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value: number);
    /**
     * Get the Y component of the {@link Vec3}
     */
    get y(): number;
    /**
     * Set the Y component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value: number);
    /**
     * Get the Z component of the {@link Vec3}
     */
    get z(): number;
    /**
     * Set the Z component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Z component to set
     */
    set z(value: number);
    /**
     * Called when at least one component of the {@link Vec3} has changed
     * @param callback - callback to run when at least one component of the {@link Vec3} has changed
     * @returns - our {@link Vec3}
     */
    onChange(callback: () => void): Vec3;
    /**
     * Set the {@link Vec3} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @param z - new Z component to set
     * @returns - this {@link Vec3} after being set
     */
    set(x?: number, y?: number, z?: number): Vec3;
    /**
     * Add a {@link Vec3} to this {@link Vec3}
     * @param vector - {@link Vec3} to add
     * @returns - this {@link Vec3} after addition
     */
    add(vector?: Vec3): Vec3;
    /**
     * Add a scalar to all the components of this {@link Vec3}
     * @param value - number to add
     * @returns - this {@link Vec3} after addition
     */
    addScalar(value?: number): Vec3;
    /**
     * Subtract a {@link Vec3} from this {@link Vec3}
     * @param vector - {@link Vec3} to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    sub(vector?: Vec3): Vec3;
    /**
     * Subtract a scalar to all the components of this {@link Vec3}
     * @param value - number to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    subScalar(value?: number): Vec3;
    /**
     * Multiply a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiply(vector?: Vec3): Vec3;
    /**
     * Multiply all components of this {@link Vec3} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiplyScalar(value?: number): Vec3;
    /**
     * Divide a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to divide with
     * @returns - this {@link Vec3} after division
     */
    divide(vector?: Vec3): Vec3;
    /**
     * Divide all components of this {@link Vec3} with a scalar
     * @param value - number to divide with
     * @returns - this {@link Vec3} after division
     */
    divideScalar(value?: number): Vec3;
    /**
     * Copy a {@link Vec3} into this {@link Vec3}
     * @param vector - {@link Vec3} to copy
     * @returns - this {@link Vec3} after copy
     */
    copy(vector?: Vec3): Vec3;
    /**
     * Clone this {@link Vec3}
     * @returns - cloned {@link Vec3}
     */
    clone(): Vec3;
    /**
     * Apply max values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing max values
     * @returns - {@link Vec3} with max values applied
     */
    max(vector?: Vec3): Vec3;
    /**
     * Apply min values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing min values
     * @returns - {@link Vec3} with min values applied
     */
    min(vector?: Vec3): Vec3;
    /**
     * Clamp this {@link Vec3} components by min and max {@link Vec3} vectors
     * @param min - minimum {@link Vec3} components to compare with
     * @param max - maximum {@link Vec3} components to compare with
     * @returns - clamped {@link Vec3}
     */
    clamp(min?: Vec3, max?: Vec3): Vec3;
    /**
     * Check if 2 {@link Vec3} are equal
     * @param vector - {@link Vec3} to compare
     * @returns - whether the {@link Vec3} are equals or not
     */
    equals(vector?: Vec3): boolean;
    /**
     * Get the square length of this {@link Vec3}
     * @returns - square length of this {@link Vec3}
     */
    lengthSq(): number;
    /**
     * Get the length of this {@link Vec3}
     * @returns - length of this {@link Vec3}
     */
    length(): number;
    /**
     * Get the euclidian distance between this {@link Vec3} and another {@link Vec3}
     * @param vector - {@link Vec3} to use for distance calculation
     * @returns - euclidian distance
     */
    distance(vector?: Vec3): number;
    /**
     * Normalize this {@link Vec3}
     * @returns - normalized {@link Vec3}
     */
    normalize(): Vec3;
    /**
     * Calculate the dot product of 2 {@link Vec3}
     * @param vector - {@link Vec3} to use for dot product
     * @returns - dot product of the 2 {@link Vec3}
     */
    dot(vector?: Vec3): number;
    /**
     * Get the cross product of this {@link Vec3} with another {@link Vec3}
     * @param vector - {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    cross(vector?: Vec3): Vec3;
    /**
     * Set this {@link Vec3} as the result of the cross product of two {@link Vec3}
     * @param a - first {@link Vec3} to use for cross product
     * @param b - second {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    crossVectors(a?: Vec3, b?: Vec3): Vec3;
    /**
     * Calculate the linear interpolation of this {@link Vec3} by given {@link Vec3} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec3} to interpolate towards
     * @param alpha - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec3} after linear interpolation
     */
    lerp(vector?: Vec3, alpha?: number): Vec3;
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Vec3}
     * Useful to convert a position {@link Vec3} from plane local world to webgl space using projection view matrix for example
     * Source code from: http://glmatrix.net/docs/vec3.js.html
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix: Mat4): Vec3;
    /**
     * Set this {@link Vec3} to the translation component of a {@link Mat4 | matrix}.
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application.
     */
    setFromMatrixPosition(matrix: Mat4): this;
    /**
     * Apply a {@link Quat | quaternion} (rotation in 3D space) to this {@link Vec3}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - this {@link Vec3} with the transformation applied
     */
    applyQuat(quaternion?: Quat): Vec3;
    /**
     * Rotate a {@link Vec3} around and axis by a given angle
     * @param axis - normalized {@link Vec3} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @param quaternion - optional {@link Quat | quaternion} to use for rotation computations
     * @returns - this {@link Vec3} with the rotation applied
     */
    applyAxisAngle(axis?: Vec3, angle?: number, quaternion?: Quat): Vec3;
    /**
     * Transforms the direction of this vector by a {@link Mat4} (the upper left 3 x 3 subset) and then normalizes the result.
     * @param matrix - {@link Mat4} to use for transformation.
     * @returns - this {@link Vec3} with the transformation applied.
     */
    transformDirection(matrix: Mat4): Vec3;
    /**
     * Project a 3D coordinate {@link Vec3} to a 2D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - projected {@link Vec3}
     */
    project(camera: Camera): Vec3;
    /**
     * Unproject a 2D coordinate {@link Vec3} to 3D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - unprojected {@link Vec3}
     */
    unproject(camera: Camera): Vec3;
}
