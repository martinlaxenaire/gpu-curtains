import { Mat4 } from '../../math/Mat4';
import { Object3D, Object3DMatricesType, Object3DTransformMatrix } from '../objects3D/Object3D';
import { RectSize } from '../DOM/DOMElement';
import { Vec3 } from '../../math/Vec3';
/**
 * Defines Camera basic perspective options
 */
export interface CameraBasePerspectiveOptions {
    /** {@link Camera} perspective field of view. Should be greater than 0 and lower than 180 */
    fov?: number;
    /** {@link Camera} near plane, the closest point where a mesh vertex is drawn */
    near?: number;
    /** {@link Camera} far plane, the farthest point where a mesh vertex is drawn */
    far?: number;
}
/**
 * Defines all Camera perspective options
 */
export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
    /** {@link Camera} frustum width */
    width?: number;
    /** {@link Camera} frustum height */
    height?: number;
    /** {@link Camera} pixel ratio */
    pixelRatio?: number;
}
/**
 * An object defining all possible {@link Camera} class instancing parameters
 */
export interface CameraParams extends CameraPerspectiveOptions {
    /** callback to execute when one of the [camera matrices]{@link Camera#matrices} changed */
    onMatricesChanged?: () => void;
}
/** Defines all kind of possible {@link ProjectedObject3D} matrix types */
export type CameraObject3DMatricesType = Object3DMatricesType | 'projection' | 'view';
/** Defines all possible [matrix object]{@link Object3DTransformMatrix} used by our {@link ProjectedObject3D} */
export type CameraObject3DMatrices = Record<CameraObject3DMatricesType, Object3DTransformMatrix>;
/**
 * Camera class:
 * Used to create a perspective camera and its matrices (projection, model, view).
 * @extends Object3D
 */
export declare class Camera extends Object3D {
    #private;
    /** [Matrices object]{@link CameraObject3DMatrices} of the {@link Camera} */
    matrices: CameraObject3DMatrices;
    /** The {@link Camera} frustum width and height */
    size: RectSize;
    /** Callback to execute when one of the [camera matrices]{@link Camera#matrices} changed */
    onMatricesChanged?: () => void;
    /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera} */
    CSSPerspective: number;
    /** An object containing the visible width / height at a given z-depth from our camera parameters */
    screenRatio: RectSize;
    /**
     * Camera constructor
     * @param parameters - [parameters]{@link CameraParams} used to create our {@link Camera}
     */
    constructor({ fov, near, far, width, height, pixelRatio, onMatricesChanged, }?: CameraParams);
    /**
     * Set our transform and projection matrices
     */
    setMatrices(): void;
    /**
     * Get/set our view matrix
     * @readonly
     */
    get viewMatrix(): Mat4;
    set viewMatrix(value: Mat4);
    /**
     * Get/set our projection matrix
     * @readonly
     */
    get projectionMatrix(): Mat4;
    set projectionMatrix(value: Mat4);
    /**
     * Set our projection matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateProjectionMatrix(): void;
    /**
     * Update our model matrix and tell our view matrix to update as well
     */
    updateModelMatrix(): void;
    /**
     * Get / set the {@link Camera} [field of view]{@link Camera#fov}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @readonly
     */
    get fov(): number;
    set fov(fov: number);
    /**
     * Get / set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @readonly
     */
    get near(): number;
    set near(near: number);
    /**
     * Get / set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @readonly
     */
    get far(): number;
    set far(far: number);
    /**
     * Get / set the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
     * @readonly
     */
    get pixelRatio(): number;
    set pixelRatio(pixelRatio: number);
    /**
     * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param size - {@link width} and {@link height} values to use
     */
    setSize({ width, height }: RectSize): void;
    /**
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if neededs
     * @param parameters - [parameters]{@link CameraPerspectiveOptions} to use for the perspective
     */
    setPerspective({ fov, near, far, width, height, pixelRatio, }?: CameraPerspectiveOptions): void;
    /**
     * Callback to run when the [camera model matrix]{@link Camera#modelMatrix} has been updated
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Sets a {@link CSSPerspective} property based on {@link Camera#size.width}, {@link Camera#size.height}, {@link pixelRatio} and {@link fov}
     * Used to translate planes along the Z axis using pixel units as CSS would do
     * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
     */
    setCSSPerspective(): void;
    /**
     * Sets visible width / height at a given z-depth from our {@link Camera} parameters
     * Taken from {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269}
     * @param depth - depth to use for calcs
     */
    setScreenRatios(depth?: number): void;
    /**
     * Rotate this {@link Object3D} so it looks at the [target]{@link Vec3}
     * @param target - [target]{@link Vec3} to look at
     */
    lookAt(target?: Vec3): void;
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix(): void;
}
