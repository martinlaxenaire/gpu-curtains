import { Vec3 } from '../../math/Vec3';
import { Quat } from '../../math/Quat';
import { Mat4 } from '../../math/Mat4';
/** Defines all kind of possible {@link Object3D} matrix types */
export type Object3DMatricesType = 'model';
/**
 * Defines an {@link Object3D} matrix object
 */
export interface Object3DTransformMatrix {
    /** The [matrix]{@link Mat4} used */
    matrix: Mat4;
    /** Whether we should update the [matrix]{@link Mat4} */
    shouldUpdate: boolean;
    /** Function to update our [matrix]{@link Mat4} */
    onUpdate: () => void;
}
/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link Object3D} */
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>;
/**
 * Defines all necessary [vectors]{@link Vec3}/[quaternions]{@link Quat} to compute a 3D [model matrix]{@link Mat4}
 */
export interface Object3DTransforms {
    /** Transformation origin object */
    origin: {
        /** Transformation origin [vector]{@link Vec3} relative to the {@link Object3D} */
        model: Vec3;
    };
    /** Model [quaternion]{@link Quat} defining its rotation in 3D space */
    quaternion: Quat;
    /** Model rotation [vector]{@link Vec3} used to compute its [quaternion]{@link Quat} */
    rotation: Vec3;
    /** Position object */
    position: {
        /** Position [vector]{@link Vec3} relative to the 3D world */
        world: Vec3;
    };
    /** Model 3D scale [vector]{@link Vec3} */
    scale: Vec3;
}
/**
 * Object3D class:
 * Used to create an object with transformation properties and a model matrix
 */
export declare class Object3D {
    /** [Transformation object]{@link Object3DTransforms} of the {@link Object3D} */
    transforms: Object3DTransforms;
    /** [Matrices object]{@link Object3DMatrices} of the {@link Object3D} */
    matrices: Object3DMatrices;
    /**
     * Object3D constructor
     */
    constructor();
    /**
     * Set our transforms properties and [onChange]{@link Vec3#onChange} callbacks
     */
    setTransforms(): void;
    /**
     * Get/set our rotation vector
     * @readonly
     */
    get rotation(): Vec3;
    set rotation(value: Vec3);
    /**
     * Get/set our quaternion
     * @readonly
     */
    get quaternion(): Quat;
    set quaternion(value: Quat);
    /**
     * Get/set our position vector
     * @readonly
     */
    get position(): Vec3;
    set position(value: Vec3);
    /**
     * Get/set our scale vector
     * @readonly
     */
    get scale(): Vec3;
    set scale(value: Vec3);
    /**
     * Get/set our transform origin vector
     * @readonly
     */
    get transformOrigin(): Vec3;
    set transformOrigin(value: Vec3);
    /**
     * Apply our rotation and tell our model matrix to update
     */
    applyRotation(): void;
    /**
     * Tell our model matrix to update
     */
    applyPosition(): void;
    /**
     * Tell our model matrix to update
     */
    applyScale(): void;
    /**
     * Tell our model matrix to update
     */
    applyTransformOrigin(): void;
    /**
     * Set our model matrix
     */
    setMatrices(): void;
    /**
     * Get/set our model matrix
     * @readonly
     */
    get modelMatrix(): Mat4;
    set modelMatrix(value: Mat4);
    /**
     * Set our model matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateModelMatrix(): void;
    /**
     * Rotate this {@link Object3D} so it looks at the [target]{@link Vec3}
     * @param target - [target]{@link Vec3} to look at
     */
    lookAt(target?: Vec3): void;
    /**
     * Update our model matrix
     */
    updateModelMatrix(): void;
    /**
     * Callback to run if at least one matrix of the stack has been updated
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Check at each render whether we should update our matrices, and update them if needed
     */
    updateMatrixStack(): void;
}
