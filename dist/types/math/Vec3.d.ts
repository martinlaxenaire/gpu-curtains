import { Mat4 } from './Mat4';
import { Quat } from './Quat';
import { Camera } from '../core/camera/Camera';
/**
 * Vec3 class:
 * Really basic Vector3 class used for vector calculations
 * Highly based on https://github.com/mrdoob/three.js/blob/dev/src/math/Vector3.js and http://glmatrix.net/docs/vec3.js.html
 */
export declare class Vec3 {
    /** The type of the {@link Vec3} */
    type: string;
    /** X component of our [vector]{@link Vec3} */
    private _x;
    /** Y component of our [vector]{@link Vec3} */
    private _y;
    /** Z component of our [vector]{@link Vec3} */
    private _z;
    /** function assigned to the [onChange]{@link Vec3#onChange} callback */
    _onChangeCallback?(): void;
    /**
     * Vec3 constructor
     * @param x=0 - X component of our [vector]{@link Vec3}
     * @param y=x - Y component of our [vector]{@link Vec3}
     * @param z=x - Z component of our [vector]{@link Vec3}
     */
    constructor(x?: number, y?: number, z?: number);
    /**
     * Get/set the X component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get x(): number;
    set x(value: number);
    /**
     * Get/set the Y component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get y(): number;
    set y(value: number);
    /**
     * Get/set the Z component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get z(): number;
    set z(value: number);
    /**
     * Called when at least one component of the [vector]{@link Vec3} has changed
     * @param callback - callback to run when at least one component of the [vector]{@link Vec3} has changed
     * @returns - our {@link Vec3}
     */
    onChange(callback: () => void): Vec3;
    /**
     * Set the [vector]{@link Vec3} from values
     * @param x=0 - new X component to set
     * @param y=0 - new Y component to set
     * @param z=0 - new Z component to set
     * @returns - this [vector]{@link Vec3} after being set
     */
    set(x?: number, y?: number, z?: number): Vec3;
    /**
     * Add a [vector]{@link Vec3} to this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to add
     * @returns - this [vector]{@link Vec3} after addition
     */
    add(vector?: Vec3): Vec3;
    /**
     * Add a scalar to all the components of this [vector]{@link Vec3}
     * @param value=0 - number to add
     * @returns - this [vector]{@link Vec3} after addition
     */
    addScalar(value?: number): Vec3;
    /**
     * Subtract a [vector]{@link Vec3} from this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to subtract
     * @returns - this [vector]{@link Vec3} after subtraction
     */
    sub(vector?: Vec3): Vec3;
    /**
     * Subtract a scalar to all the components of this [vector]{@link Vec3}
     * @param value=0 - number to subtract
     * @returns - this [vector]{@link Vec3} after subtraction
     */
    subScalar(value?: number): Vec3;
    /**
     * Multiply a [vector]{@link Vec3} with this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to multiply with
     * @returns - this [vector]{@link Vec3} after multiplication
     */
    multiply(vector?: Vec3): Vec3;
    /**
     * Multiply all components of this [vector]{@link Vec3} with a scalar
     * @param value=1 - number to multiply with
     * @returns - this [vector]{@link Vec3} after multiplication
     */
    multiplyScalar(value?: number): Vec3;
    /**
     * Copy a [vector]{@link Vec3} into this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to copy
     * @returns - this [vector]{@link Vec3} after copy
     */
    copy(vector?: Vec3): Vec3;
    /**
     * Clone this [vector]{@link Vec3}
     * @returns - cloned [vector]{@link Vec3}
     */
    clone(): Vec3;
    /**
     * Apply max values to this [vector]{@link Vec3} components
     * @param vector - [vector]{@link Vec3} representing max values
     * @returns - [vector]{@link Vec3} with max values applied
     */
    max(vector?: Vec3): Vec3;
    /**
     * Apply min values to this [vector]{@link Vec3} components
     * @param vector - [vector]{@link Vec3} representing min values
     * @returns - [vector]{@link Vec3} with min values applied
     */
    min(vector?: Vec3): Vec3;
    /**
     * Check if 2 [vectors]{@link Vec3} are equal
     * @param vector - [vector]{@link Vec3} to compare
     * @returns - whether the [vectors]{@link Vec3} are equals or not
     */
    equals(vector?: Vec3): boolean;
    /**
     * Normalize this [vector]{@link Vec3}
     * @returns - normalized [vector]{@link Vec3}
     */
    normalize(): Vec3;
    /**
     * Calculate the dot product of 2 [vectors]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to use for dot product
     * @returns - dot product of the 2 [vectors]{@link Vec3}
     */
    dot(vector?: Vec3): number;
    /**
     * Calculate the linear interpolation of this [vector]{@link Vec3} by given [vector]{@link Vec3} and alpha, where alpha is the percent distance along the line
     * @param vector - [vector]{@link Vec3} to interpolate towards
     * @param alpha=1 - interpolation factor in the [0, 1] interval
     * @returns - this [vector]{@link Vec3} after linear interpolation
     */
    lerp(vector?: Vec3, alpha?: number): Vec3;
    /**
     * Apply a [matrix]{@link Mat4} to a [vector]{@link Vec3}
     * Useful to convert a position [vector]{@link Vec3} from plane local world to webgl space using projection view matrix for example
     * Source code from: http://glmatrix.net/docs/vec3.js.html
     * @param matrix - [matrix]{@link Mat4} to use
     * @returns - this [vector]{@link Vec3} after [matrix]{@link Mat4} application
     */
    applyMat4(matrix?: Mat4): Vec3;
    /**
     * Apply a [quaternion]{@link Quat} (rotation in 3D space) to this [vector]{@link Vec3}
     * @param quaternion - [quaternion]{@link Quat} to use
     * @returns - this [vector]{@link Vec3} with the transformation applied
     */
    applyQuat(quaternion?: Quat): Vec3;
    /**
     * Project a 3D coordinate [vector]{@link Vec3} to a 2D coordinate [vector]{@link Vec3}
     * @param camera - [camera]{@link Camera} to use for projection
     * @returns - projected [vector]{@link Vec3}
     */
    project(camera: Camera): Vec3;
    /**
     * Unproject a 2D coordinate [vector]{@link Vec3} to 3D coordinate [vector]{@link Vec3}
     * @param camera - [camera]{@link Camera} to use for projection
     * @returns - unprojected [vector]{@link Vec3}
     */
    unproject(camera: Camera): Vec3;
}
