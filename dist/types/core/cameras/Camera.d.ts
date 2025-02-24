import { Mat4 } from '../../math/Mat4';
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D';
import { RectSize } from '../DOM/DOMElement';
import { Vec3 } from '../../math/Vec3';
/**
 * Defines Camera basic perspective options.
 */
export interface CameraBaseOptions {
    /** {@link Camera} near plane, the closest point where a mesh vertex is drawn. */
    near?: number;
    /** {@link Camera} far plane, the farthest point where a mesh vertex is drawn. */
    far?: number;
}
/**
 * Defines all Camera perspective options.
 */
export interface CameraOptions extends CameraBaseOptions {
    /** {@link Camera} pixel ratio. */
    pixelRatio?: number;
}
/**
 * An object defining all possible {@link Camera} class instancing parameters.
 */
export interface CameraParams extends CameraOptions {
    /** callback to execute when one of the {@link Camera#matrices | camera matrices} changed. */
    onMatricesChanged?: () => void;
}
/** Defines all kind of possible {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D} matrix types. */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view' | 'viewProjection';
/** Defines all possible {@link Object3DTransformMatrix | matrix object} used by our {@link core/objects3D/ProjectedObject3D.ProjectedObject3D | ProjectedObject3D}. */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>;
/**
 * Used as a base class to create a {@link Camera}.
 *
 * This class is not made to be used directly, you should use the {@link core/cameras/PerspectiveCamera.PerspectiveCamera | PerspectiveCamera} or {@link core/cameras/OrthographicCamera.OrthographicCamera | OrthographicCamera} classes instead.
 */
export declare class Camera extends Object3D {
    #private;
    /** The universal unique id of the {@link Camera}. */
    uuid: string;
    /** {@link CameraObject3DMatrices | Matrices object} of the {@link Camera}. */
    matrices: CameraObject3DMatrices;
    /** Callback to execute when one of the camera {@link matrices} changed. */
    onMatricesChanged?: () => void;
    /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera}. Useful only with {@link core/cameras/PerspectiveCamera.PerspectiveCamera | PerspectiveCamera}. */
    CSSPerspective: number;
    /** An object containing the visible width / height at a given z-depth from our camera parameters. */
    visibleSize: RectSize;
    /**
     * Camera constructor
     * @param parameters - {@link CameraParams} used to create our {@link Camera}.
     */
    constructor({ near, far, pixelRatio, onMatricesChanged, }?: CameraParams);
    /**
     * Set our transform and projection matrices.
     */
    setMatrices(): void;
    /**
     * Get our view matrix.
     * @readonly
     */
    get viewMatrix(): Mat4;
    set viewMatrix(value: Mat4);
    /**
     * Get our projection matrix.
     * @readonly
     */
    get projectionMatrix(): Mat4;
    set projectionMatrix(value: Mat4);
    /**
     * Get our view projection matrix.
     * @readonly
     */
    get viewProjectionMatrix(): Mat4;
    /**
     * Set our view dependent matrices shouldUpdate flag to `true` (tell it to update).
     */
    shouldUpdateViewMatrices(): void;
    /**
     * Set our projection dependent matrices shouldUpdate flag to `true` (tell it to update).
     */
    shouldUpdateProjectionMatrices(): void;
    /**
     * Update our model matrix and tell our view matrix to update as well.
     */
    updateModelMatrix(): void;
    /**
     * Update our view matrix whenever we need to update the world matrix.
     */
    shouldUpdateWorldMatrix(): void;
    /**
     * Callback to run when the camera {@link modelMatrix | model matrix} has been updated.
     */
    updateMatrixStack(): void;
    /**
     * Get the {@link Camera.near | near} plane value.
     */
    get near(): number;
    /**
     * Set the {@link Camera.near | near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed.
     * @param near - New near plane value.
     */
    set near(near: number);
    /**
     * Get the {@link Camera.far | far} plane value.
     */
    get far(): number;
    /**
     * Set the {@link Camera.far | far} plane value. Update {@link projectionMatrix} only if the far plane actually changed.
     * @param far - New far plane value.
     */
    set far(far: number);
    /**
     * Get the {@link Camera.pixelRatio | pixelRatio} value.
     */
    get pixelRatio(): number;
    /**
     * Set the {@link Camera.pixelRatio | pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed.
     * @param pixelRatio - New pixel ratio value.
     */
    set pixelRatio(pixelRatio: number);
    /** @ignore */
    setCSSPerspective(): void;
    /**
     * Get visible width / height at a given z-depth from our {@link Camera} parameters. Useless for this base class, but will be overriden by children classes.
     * @param depth - Depth to use for calculations.
     * @returns - Visible width and height at given depth.
     */
    getVisibleSizeAtDepth(depth?: number): RectSize;
    /**
     * Sets visible width / height at a depth of 0.
     */
    setVisibleSize(): void;
    /**
     * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}.
     * @param target - {@link Vec3} to look at. Default to `new Vec3()`.
     */
    lookAt(target?: Vec3): void;
    /**
     * Updates the {@link Camera} {@link projectionMatrix}.
     */
    updateProjectionMatrix(): void;
}
