import { Vec3 } from '../../math/Vec3';
import { Quat } from '../../math/Quat';
import { Mat4 } from '../../math/Mat4';
export type Object3DMatricesType = 'model';
export interface Object3DTransformMatrix {
    matrix: Mat4;
    shouldUpdate: boolean;
    onUpdate: () => void;
}
export type Object3DMatrices = Record<Object3DMatricesType, Object3DTransformMatrix>;
export interface Object3DTransforms {
    origin: {
        model: Vec3;
        world?: Vec3;
    };
    quaternion: Quat;
    rotation: Vec3;
    position: {
        world: Vec3;
        document?: Vec3;
    };
    scale: Vec3;
}
/**
 * Object3D class:
 * Used to create an object with transformation properties and a model matrix
 */
export declare class Object3D {
    transforms: Object3DTransforms;
    matrices: Object3DMatrices;
    /**
     * Object3D constructor
     */
    constructor();
    /** TRANSFORMS **/
    /**
     * Set our transforms properties and onChange callbacks
     */
    setTransforms(): void;
    /**
     * Get/set our rotation vector
     * @readonly
     * @type {Vec3}
     */
    get rotation(): Vec3;
    set rotation(value: Vec3);
    /**
     * Get/set our quaternion
     * @readonly
     * @type {Quat}
     */
    get quaternion(): Quat;
    set quaternion(value: Quat);
    /**
     * Get/set our position vector
     * @readonly
     * @type {Vec3}
     */
    get position(): Vec3;
    set position(value: Vec3);
    /**
     * Get/set our scale vector
     * @readonly
     * @type {Vec3}
     */
    get scale(): Vec3;
    set scale(value: Vec3);
    /**
     * Get/set our transform origin vector
     * @readonly
     * @type {Vec3}
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
    /** MATRICES **/
    /**
     * Set our model matrix
     */
    setMatrices(): void;
    /**
     * Get/set our model matrix
     * @readonly
     * @type {Mat4}
     */
    get modelMatrix(): Mat4;
    set modelMatrix(value: Mat4);
    /**
     * Set our model matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateModelMatrix(): void;
    /**
     * Update our model matrix
     */
    updateModelMatrix(): void;
    onAfterMatrixStackUpdate(): void;
    /**
     * Tell our model matrix to update
     */
    updateSizeAndPosition(): void;
    /**
     * Check at each render whether we should update our matrices, and update them if needed
     */
    updateMatrixStack(): void;
}
