import { Vec3 } from './Vec3';
import { Mat4 } from './Mat4';
/**
 * Used to handle bounding boxes in 3D space.
 * Basically made of two min and max {@link Vec3 | vectors} that represents the edges of the 3D bounding box.
 */
export declare class Box3 {
    /** Min {@link Vec3 | vector} of the {@link Box3} */
    min: Vec3;
    /** Max {@link Vec3 | vector} of the {@link Box3} */
    max: Vec3;
    /**
     * Box3 constructor
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    constructor(min?: Vec3, max?: Vec3);
    /**
     * Set a {@link Box3} from two min and max {@link Vec3 | vectors}
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    set(min?: Vec3, max?: Vec3): Box3;
    /**
     * Check whether the {@link Box3} min and max values have actually been set
     */
    isEmpty(): boolean;
    /**
     * Copy a {@link Box3} into this {@link Box3}.
     * @param box - {@link Box3} to copy
     */
    copy(box: Box3): Box3;
    /**
     * Clone this {@link Box3}
     * @returns - cloned {@link Box3}
     */
    clone(): Box3;
    /**
     * Get the {@link Box3} center
     * @readonly
     * @returns - {@link Vec3 | center vector} of the {@link Box3}
     */
    get center(): Vec3;
    /**
     * Get the {@link Box3} size
     * @readonly
     * @returns - {@link Vec3 | size vector} of the {@link Box3}
     */
    get size(): Vec3;
    /**
     * Get the {@link Box3} radius
     * @readonly
     * @returns - radius of the {@link Box3}
     */
    get radius(): number;
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Box3}
     * Useful to apply a transformation {@link Mat4 | matrix} to a {@link Box3}
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Box3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix?: Mat4): Box3;
}
