/**
 * Really basic 2D vector class used for vector calculations
 * @see https://github.com/mrdoob/three.js/blob/dev/src/math/Vector2.js
 * @see http://glmatrix.net/docs/vec2.js.html
 */
export declare class Vec2 {
    /** The type of the {@link Vec2} */
    type: string;
    /** X component of our {@link Vec2} */
    private _x;
    /** Y component of our {@link Vec2} */
    private _y;
    /** function assigned to the {@link onChange} callback */
    _onChangeCallback?(): void;
    /**
     * Vec2 constructor
     * @param x - X component of our {@link Vec2}
     * @param y - Y component of our {@link Vec2}
     */
    constructor(x?: number, y?: number);
    /**
     * Get the X component of the {@link Vec2}
     */
    get x(): number;
    /**
     * Set the X component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value: number);
    /**
     * Get the Y component of the {@link Vec2}
     */
    get y(): number;
    /**
     * Set the Y component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value: number);
    /**
     * Called when at least one component of the {@link Vec2} has changed
     * @param callback - callback to run when at least one component of the {@link Vec2} has changed
     * @returns - our {@link Vec2}
     */
    onChange(callback: () => void): Vec2;
    /**
     * Set the {@link Vec2} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @returns - this {@link Vec2} after being set
     */
    set(x?: number, y?: number): Vec2;
    /**
     * Add a {@link Vec2} to this {@link Vec2}
     * @param vector - {@link Vec2} to add
     * @returns - this {@link Vec2} after addition
     */
    add(vector?: Vec2): Vec2;
    /**
     * Add a scalar to all the components of this {@link Vec2}
     * @param value - number to add
     * @returns - this {@link Vec2} after addition
     */
    addScalar(value?: number): Vec2;
    /**
     * Subtract a {@link Vec2} from this {@link Vec2}
     * @param vector - {@link Vec2} to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    sub(vector?: Vec2): Vec2;
    /**
     * Subtract a scalar to all the components of this {@link Vec2}
     * @param value - number to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    subScalar(value?: number): Vec2;
    /**
     * Multiply a {@link Vec2} with this {@link Vec2}
     * @param vector - {@link Vec2} to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiply(vector?: Vec2): Vec2;
    /**
     * Multiply all components of this {@link Vec2} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiplyScalar(value?: number): Vec2;
    /**
     * Copy a {@link Vec2} into this {@link Vec2}
     * @param vector - {@link Vec2} to copy
     * @returns - this {@link Vec2} after copy
     */
    copy(vector?: Vec2): Vec2;
    /**
     * Clone this {@link Vec2}
     * @returns - cloned {@link Vec2}
     */
    clone(): Vec2;
    /**
     * Apply max values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing max values
     * @returns - {@link Vec2} with max values applied
     */
    max(vector?: Vec2): Vec2;
    /**
     * Apply min values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing min values
     * @returns - {@link Vec2} with min values applied
     */
    min(vector?: Vec2): Vec2;
    /**
     * Clamp this {@link Vec2} components by min and max {@link Vec2} vectors
     * @param min - minimum {@link Vec2} components to compare with
     * @param max - maximum {@link Vec2} components to compare with
     * @returns - clamped {@link Vec2}
     */
    clamp(min?: Vec2, max?: Vec2): Vec2;
    /**
     * Check if 2 {@link Vec2} are equal
     * @param vector - {@link Vec2} to compare
     * @returns - whether the {@link Vec2} are equals or not
     */
    equals(vector?: Vec2): boolean;
    /**
     * Get the square length of this {@link Vec2}
     * @returns - square length of this {@link Vec2}
     */
    lengthSq(): number;
    /**
     * Get the length of this {@link Vec2}
     * @returns - length of this {@link Vec2}
     */
    length(): number;
    /**
     * Normalize this {@link Vec2}
     * @returns - normalized {@link Vec2}
     */
    normalize(): Vec2;
    /**
     * Calculate the dot product of 2 {@link Vec2}
     * @param vector - {@link Vec2} to use for dot product
     * @returns - dot product of the 2 {@link Vec2}
     */
    dot(vector?: Vec2): number;
    /**
     * Calculate the linear interpolation of this {@link Vec2} by given {@link Vec2} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec2} to interpolate towards
     * @param [alpha=1] - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec2} after linear interpolation
     */
    lerp(vector?: Vec2, alpha?: number): Vec2;
}
