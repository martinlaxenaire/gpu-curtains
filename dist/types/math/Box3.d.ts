import { Vec3 } from './Vec3';
import { Mat4 } from './Mat4';
/**
 * Box3 class:
 * Used to handle bounding boxes in 3D space.
 * Basically made of two min and max [vectors]{@link Vec3} that represents both extremities of the 3D bounding box.
 */
export declare class Box3 {
    /** Min [vector]{@link Vec3} of the {@link Box3} */
    min: Vec3;
    /** Max [vector]{@link Vec3} of the {@link Box3} */
    max: Vec3;
    /**
     * Box3 constructor
     * @param min - min [vector]{@link Vec3} of the {@link Box3}
     * @param max - max [vector]{@link Vec3} of the {@link Box3}
     */
    constructor(min?: Vec3, max?: Vec3);
    /**
     * Set a {@link Box3} from two min and max [vectors]{@link Vec3}
     * @param min - min [vector]{@link Vec3} of the {@link Box3}
     * @param max - max [vector]{@link Vec3} of the {@link Box3}
     */
    set(min?: Vec3, max?: Vec3): Box3;
    /**
     * Clone this {@link Box3}
     * @returns - cloned {@link Box3}
     */
    clone(): Box3;
    /**
     * Get the {@link Box3} center
     * @returns - [Center vector]{@link Vec3} of the {@link Box3}
     */
    getCenter(): Vec3;
    /**
     * Get the {@link Box3} size
     * @returns - [Size vector]{@link Vec3} of the {@link Box3}
     */
    getSize(): Vec3;
    /**
     * Apply a [matrix]{@link Mat4} to a {@link Box3}
     * Useful to apply a transformation [matrix]{@link Mat4} to a {@link Box3}
     * @param matrix - [matrix]{@link Mat4} to use
     * @returns - this {@link Box3} after [matrix]{@link Mat4} application
     */
    applyMat4(matrix?: Mat4): Box3;
}
