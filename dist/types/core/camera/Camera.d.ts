import { Vec3 } from '../../math/Vec3';
import { Mat4 } from '../../math/Mat4';
export interface CameraBasePerspectiveOptions {
    fov?: number;
    near?: number;
    far?: number;
}
export interface CameraPerspectiveOptions extends CameraBasePerspectiveOptions {
    width?: number;
    height?: number;
    pixelRatio?: number;
}
export interface CameraParams extends CameraPerspectiveOptions {
    onPerspectiveChanged?: () => void;
    onPositionChanged?: () => void;
}
/**
 * Camera class:
 * Used to create a perspective camera and its matricess (projection, model, view).
 */
export declare class Camera {
    /**
     * The {@link Camera} position
     * @type {Vec3}
     */
    position: Vec3;
    /**
     * The {@link Camera} projection matrix
     * @type {Mat4}
     */
    projectionMatrix: Mat4;
    /**
     * The {@link Camera} model matrix
     * @type {Mat4}
     */
    modelMatrix: Mat4;
    /**
     * The {@link Camera} view matrix
     * @type {Mat4}
     */
    viewMatrix: Mat4;
    /**
     * The {@link Camera} field of view
     * @type {number}
     */
    fov: number;
    /**
     * The {@link Camera} near plane
     * @type {number}
     */
    near: number;
    /**
     * The {@link Camera} far plane
     * @type {number}
     */
    far: number;
    /**
     * The {@link Camera} frustum width
     * @type {number}
     */
    width: number;
    /**
     * The {@link Camera} frustum height
     * @type {number}
     */
    height: number;
    /**
     * The {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs
     * @type {number}
     */
    pixelRatio: number;
    /**
     * Callback to run when the {@link Camera} perspective changed
     * @type {function}
     */
    onPerspectiveChanged: () => void;
    /**
     * Callback to run when the {@link Camera} {@link position} changed
     * @type {function}
     */
    onPositionChanged: () => void;
    /**
     * A number representing what CSS perspective value (in pixel) should be used to obtain the same perspective effect as this {@link Camera}
     * @type {number}
     */
    CSSPerspective: number;
    /**
     * An object containing the visible width / height at a given z-depth from our camera parameters
     * @type {{width: number, height: number}}
     */
    screenRatio: {
        width: number;
        height: number;
    };
    /**
     * Flag indicating whether we should update the {@link Camera} {@link projectionMatrix}
     * @type {boolean}
     */
    shouldUpdate: boolean;
    /**
     * Camera constructor
     * @param {CameraParams=} parameters - parameters used to create our {@link Camera}
     * @param {number} [parameters.fov=50] - the perspective [field of view]{@link fov}. Should be greater than 0 and lower than 180.
     * @param {number} [parameters.near=0.01] - {@link near} plane, the closest point where a mesh vertex is drawn.
     * @param {number} [parameters.far=150] - {@link far} plane, farthest point where a mesh vertex is drawn.
     * @param {number} [parameters.width=1] - {@link width} used to calculate the {@link Camera} aspect ratio.
     * @param {number} [parameters.height=1] - {@link height} used to calculate the {@link Camera} aspect ratio.
     * @param {number} [parameters.pixelRatio=1] - [pixel ratio]{@link pixelRatio} used to calculate the {@link Camera} aspect ratio.
     * @param {function=} parameters.onPerspectiveChanged - callback to execute when the {@link Camera} perspective changed.
     * @param {function=} parameters.onPositionChanged - callback to execute when the {@link Camera} {@link position} changed.
     */
    constructor({ fov, near, far, width, height, pixelRatio, onPerspectiveChanged, onPositionChanged, }?: CameraParams);
    /**
     * Sets the {@link Camera} {@link fov}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param {number=} fov - new {@link fov}
     */
    setFov(fov?: number): void;
    /**
     * Sets the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param {number=} near - {@link near} plane value to use
     */
    setNear(near?: number): void;
    /**
     * Sets the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param {number=} far - {@link far} plane value to use
     */
    setFar(far?: number): void;
    /**
     * Sets the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
     * @param {number=} pixelRatio - {@link pixelRatio} value to use
     */
    setPixelRatio(pixelRatio?: number): void;
    /**
     * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param {number=} width - {@link width} value to use
     * @param {number=} height - {@link height} value to use
     */
    setSize(width: number, height: number): void;
    /**
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if our {@link shouldUpdate} flag is true
     * @param {number=} fov - field of view to use
     * @param {number=} near - near plane value to use
     * @param {number=} far - far plane value to use
     * @param {number=} width - width value to use
     * @param {number=} height - height value to use
     * @param {number=} pixelRatio - pixel ratio value to use
     */
    setPerspective(fov?: number, near?: number, far?: number, width?: number, height?: number, pixelRatio?: number): void;
    /**
     * Sets the {@link Camera} {@link position} and update the {@link modelMatrix} and {@link viewMatrix}.
     * @param {Vec3=} position - new {@link Camera}  {@link position}
     */
    setPosition(position?: Vec3): void;
    /**
     * Update the {@link modelMatrix} and {@link viewMatrix}.
     */
    applyPosition(): void;
    /**
     * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
     * Used to translate planes along the Z axis using pixel units as CSS would do
     * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
     */
    setCSSPerspective(): void;
    /**
     * Sets visible width / height at a given z-depth from our {@link Camera} parameters
     * Taken from {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269}
     * @param {number=} depth
     */
    setScreenRatios(depth?: number): void;
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix(): void;
}
