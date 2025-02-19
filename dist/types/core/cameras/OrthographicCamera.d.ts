import { Camera, CameraBaseOptions, CameraOptions, CameraParams } from './Camera';
import { RectSize } from '../DOM/DOMElement';
/**
 * Defines {@link OrthographicCamera} basic perspective options.
 */
export interface OrthographicCameraBaseOptions extends CameraBaseOptions {
    /** Left side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `-1`. */
    left?: number;
    /** Right side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `1`. */
    right?: number;
    /** Bottom side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `-1`. */
    bottom?: number;
    /** Top side of the {@link OrthographicCamera} projection near clipping plane viewport. Default to `1`. */
    top?: number;
}
/**
 * Defines all {@link OrthographicCamera} options.
 */
export interface OrthographicCameraOptions extends CameraOptions, OrthographicCameraBaseOptions {
}
/**
 * An object defining all possible {@link OrthographicCamera} class instancing parameters.
 */
export interface OrthographicCameraParams extends CameraParams, OrthographicCameraOptions {
}
export declare class OrthographicCamera extends Camera {
    #private;
    /**
     * OrthographicCamera constructor
     * @param parameters - {@link OrthographicCameraParams} used to create our {@link OrthographicCamera}.
     */
    constructor({ near, far, left, right, top, bottom, pixelRatio, onMatricesChanged, }?: OrthographicCameraParams);
    /**
     * Get the {@link OrthographicCamera.left | left} frustum plane value.
     */
    get left(): number;
    /**
     * Set the {@link OrthographicCamera.left | left} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param left - New left frustum plane value.
     */
    set left(left: number);
    /**
     * Get the {@link OrthographicCamera.right | right} frustum plane value.
     */
    get right(): number;
    /**
     * Set the {@link OrthographicCamera.right | right} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param right - New right frustum plane value.
     */
    set right(right: number);
    /**
     * Get the {@link OrthographicCamera.top | top} frustum plane value.
     */
    get top(): number;
    /**
     * Set the {@link OrthographicCamera.top | top} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param top - New top frustum plane value.
     */
    set top(top: number);
    /**
     * Get the {@link OrthographicCamera.bottom | bottom} frustum plane value.
     */
    get bottom(): number;
    /**
     * Set the {@link OrthographicCamera.bottom | bottom} frustum plane value. Update the {@link projectionMatrix} only if the value actually changed.
     * @param bottom - New bottom frustum plane value.
     */
    set bottom(bottom: number);
    /**
     * Sets the {@link OrthographicCamera} orthographic projection settings. Update the {@link projectionMatrix} if needed.
     * @param parameters - {@link OrthographicCameraOptions} to use for the orthographic projection.
     */
    setOrthographic({ near, far, left, right, top, bottom, pixelRatio, }: OrthographicCameraOptions): void;
    /**
     * Get visible width / height at a given z-depth from our {@link OrthographicCamera} parameters.
     * @param depth - Depth to use for calculations - unused since width and height does not change according to depth in orthographic projection.
     * @returns - Visible width and height.
     */
    getVisibleSizeAtDepth(depth?: number): RectSize;
    /**
     * Sets visible width / height at a depth of 0.
     */
    setVisibleSize(): void;
    /**
     * Updates the {@link OrthographicCamera} {@link projectionMatrix}.
     */
    updateProjectionMatrix(): void;
    /**
     * Get the current {@link OrthographicCamera} frustum planes in the [left, right, top, bottom, near, far] order.
     * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
     * @readonly
     */
    get frustumPlanes(): Array<Float32Array>;
}
