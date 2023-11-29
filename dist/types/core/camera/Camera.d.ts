import { Mat4 } from '../../math/Mat4';
import { Object3D } from '../objects3D/Object3D';
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
    /** callback to execute when the {@link Camera} perspective changed */
    onPerspectiveChanged?: () => void;
    /** callback to execute when the {@link Camera} [position]{@link Camera#position} changed */
    onPositionChanged?: () => void;
}
/**
 * Camera class:
 * Used to create a perspective camera and its matricess (projection, model, view).
 */
export declare class Camera extends Object3D {
    /** The {@link Camera} position */
    /** The {@link Camera} projection matrix */
    projectionMatrix: Mat4;
    /** The {@link Camera} model matrix */
    /** The {@link Camera} view matrix */
    viewMatrix: Mat4;
    /** The {@link Camera} field of view */
    fov: number;
    /** The {@link Camera} near plane */
    near: number;
    /** The {@link Camera} far plane */
    far: number;
    /** The {@link Camera} frustum width */
    width: number;
    /** The {@link Camera} frustum height */
    height: number;
    /** The {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs */
    pixelRatio: number;
    /** Callback to run when the {@link Camera} perspective changed */
    onPerspectiveChanged: () => void;
    /** Callback to run when the {@link Camera} {@link position} changed */
    onPositionChanged: () => void;
    /** A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera} */
    CSSPerspective: number;
    /** An object containing the visible width / height at a given z-depth from our camera parameters */
    screenRatio: {
        width: number;
        height: number;
    };
    /** Flag indicating whether we should update the {@link Camera} {@link projectionMatrix} */
    shouldUpdate: boolean;
    /**
     * Camera constructor
     * @param parameters - [parameters]{@link CameraParams} used to create our {@link Camera}
     */
    constructor({ fov, near, far, width, height, pixelRatio, onPerspectiveChanged, onPositionChanged, }?: CameraParams);
    /**
     * Sets the {@link Camera} {@link fov}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param fov - new {@link fov}
     */
    setFov(fov?: number): void;
    /**
     * Sets the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param near - {@link near} plane value to use
     */
    setNear(near?: number): void;
    /**
     * Sets the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param far - {@link far} plane value to use
     */
    setFar(far?: number): void;
    /**
     * Sets the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
     * @param pixelRatio - {@link pixelRatio} value to use
     */
    setPixelRatio(pixelRatio?: number): void;
    /**
     * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param width - {@link width} value to use
     * @param height - {@link height} value to use
     */
    setSize(width: number, height: number): void;
    /**
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if our {@link shouldUpdate} flag is true
     * @param fov - field of view to use
     * @param near - near plane value to use
     * @param far - far plane value to use
     * @param width - width value to use
     * @param height - height value to use
     * @param pixelRatio - pixel ratio value to use
     */
    setPerspective(fov?: number, near?: number, far?: number, width?: number, height?: number, pixelRatio?: number): void;
    /**
     * Callback to run when the [camera model matrix]{@link Camera#modelMatrix} has been updated
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
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
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix(): void;
    updateMatrixStack(): void;
}
