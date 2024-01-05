import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from './Object3D';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { CameraRenderer } from '../renderers/utils';
import { Mat4 } from '../../math/Mat4';
import { Camera } from '../camera/Camera';
/** Defines all kind of possible {@link ProjectedObject3D} matrix types */
export type ProjectedObject3DMatricesType = Object3DMatricesType | 'modelView' | 'modelViewProjection';
/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link ProjectedObject3D} */
export type ProjectedObject3DMatrices = Record<ProjectedObject3DMatricesType, Object3DTransformMatrix>;
/**
 * ProjectedObject3D class:
 * Used to create 3D objects with transform and projection matrices based on a {@link Camera}
 * @extends Object3D
 */
export declare class ProjectedObject3D extends Object3D {
    /** {@link Camera | Camera} object used to compute {@link ProjectedObject3D#modelViewMatrix | model view} and {@link ProjectedObject3D#modelViewProjectionMatrix | model view projection} matrices */
    camera: Camera;
    /** {@link ProjectedObject3DMatrices | Matrices object} of the {@link ProjectedObject3D} */
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
     * Get our {@link modelViewMatrix | model view matrix}
     */
    get modelViewMatrix(): Mat4;
    /**
     * Set our {@link modelViewMatrix | model view matrix}
     * @param value - new {@link modelViewMatrix | model view matrix}
     */
    set modelViewMatrix(value: Mat4);
    /**
     * Get our {@link Camera#viewMatrix | camera view matrix}
     * @readonly
     */
    get viewMatrix(): Mat4;
    /**
     * Get our {@link Camera#projectionMatrix | camera projection matrix}
     * @readonly
     */
    get projectionMatrix(): Mat4;
    /**
     * Get our {@link modelViewProjectionMatrix | model view projection matrix}
     */
    get modelViewProjectionMatrix(): Mat4;
    /**
     * Set our {@link modelViewProjectionMatrix | model view projection matrix}
     * @param value - new {@link modelViewProjectionMatrix | model view projection matrix}s
     */
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
