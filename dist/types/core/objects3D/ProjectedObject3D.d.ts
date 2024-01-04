import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from './Object3D';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { CameraRenderer } from '../renderers/utils';
import { Mat4 } from '../../math/Mat4';
import { Camera } from '../camera/Camera';
/** Defines all kind of possible {@link ProjectedObject3D} matrix types */
export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection';
/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link ProjectedObject3D} */
export type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>;
/**
 * ProjectedObject3D class:
 * Used to create 3D objects with transform and projection matrices based on a {@link Camera}
 * @extends Object3D
 */
export declare class ProjectedObject3D extends Object3D {
    /** [Camera]{@link Camera} object used to compute [modelView]{@link ProjectedObject3D#modelViewMatrix} and [modelViewProjection]{@link ProjectedObject3D#modelViewProjectionMatrix} matrices */
    camera: Camera;
    /** [Matrices object]{@link ProjectedObject3DMatrices} of the {@link ProjectedObject3D} */
    matrices: ProjectedObject3DMatrices;
    /**
     * ProjectedObject3D constructor
     * @param renderer - our renderer class object
     */
    constructor(renderer: CameraRenderer | GPUCurtains);
    /**
     * Tell our projection matrix stack to update
     */
    applyPosition(): void;
    /**
     * Tell our projection matrix stack to update
     */
    applyRotation(): void;
    /**
     * Tell our projection matrix stack to update
     */
    applyScale(): void;
    /**
     * Tell our projection matrix stack to update
     */
    applyTransformOrigin(): void;
    /**
     * Set our transform and projection matrices
     */
    setMatrices(): void;
    /**
     * Get/set our model view matrix
     * @readonly
     */
    get modelViewMatrix(): Mat4;
    set modelViewMatrix(value: Mat4);
    /**
     * Get our camera view matrix
     * @readonly
     */
    get viewMatrix(): Mat4;
    /**
     * Get our camera projection matrix
     * @readonly
     */
    get projectionMatrix(): Mat4;
    /**
     * Get/set our model view projection matrix
     * @readonly
     */
    get modelViewProjectionMatrix(): Mat4;
    set modelViewProjectionMatrix(value: Mat4);
    /**
     * Set our projection matrices shouldUpdate flags to true (tell them to update)
     */
    shouldUpdateProjectionMatrixStack(): void;
    /**
     * Tell all our matrices to update
     */
    shouldUpdateMatrixStack(): void;
}
