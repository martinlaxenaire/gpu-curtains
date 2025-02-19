import { RectSize } from '../DOM/DOMElement';
import { Camera, CameraBaseOptions, CameraOptions, CameraParams } from './Camera';
/**
 * Defines {@link PerspectiveCamera} basic perspective options.
 */
export interface PerspectiveCameraBaseOptions extends CameraBaseOptions {
    /** {@link PerspectiveCamera} field of view, in degress. Should be greater than 0 and lower than 180. */
    fov?: number;
}
/**
 * Defines all {@link PerspectiveCamera} options.
 */
export interface PerspectiveCameraOptions extends CameraOptions, PerspectiveCameraBaseOptions {
    /** {@link PerspectiveCamera} frustum width. */
    width?: number;
    /** {@link PerspectiveCamera} frustum height. */
    height?: number;
}
/**
 * An object defining all possible {@link PerspectiveCamera} class instancing parameters.
 */
export interface PerspectiveCameraParams extends CameraParams, PerspectiveCameraOptions {
}
/**
 * Used to create a {@link PerspectiveCamera} and its projection, model and view matrices.
 *
 * {@link curtains/renderers/GPUCurtainsRenderer.GPUCurtainsRenderer | GPUCurtainsRenderer} and {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} automatically create their own {@link PerspectiveCamera} under the hood, so it is unlikely you'd have to create one by yourself.
 *
 * {@link PerspectiveCamera} default perspective settings are:
 * - {@link PerspectiveCamera#fov | field of view}: 50
 * - {@link PerspectiveCamera#near | near plane}: 0.01
 * - {@link PerspectiveCamera#far | far plane}: 150
 *
 * Also note that the {@link PerspectiveCamera} default {@link PerspectiveCamera#position | position} is set at `(0, 0, 10)` so the object created with a default size do not appear too big nor too small.
 */
export declare class PerspectiveCamera extends Camera {
    #private;
    /** The {@link PerspectiveCamera} frustum width and height. */
    size: RectSize;
    /**
     * PerspectiveCamera constructor
     * @param parameters - {@link PerspectiveCameraParams} used to create our {@link PerspectiveCamera}.
     */
    constructor({ fov, near, far, width, height, pixelRatio, onMatricesChanged, }?: PerspectiveCameraParams);
    /**
     * Get the {@link PerspectiveCamera.fov | field of view}.
     */
    get fov(): number;
    /**
     * Set the {@link PerspectiveCamera.fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed.
     * @param fov - New field of view.
     */
    set fov(fov: number);
    /**
     * Set the {@link PerspectiveCamera} {@link RectSize.width | width} and {@link RectSize.height | height}. Update the {@link projectionMatrix} only if the width or height actually changed.
     * @param size - New width and height values to use.
     */
    setSize({ width, height }: RectSize): void;
    /**
     * Sets the {@link PerspectiveCamera} perspective projection settings. Update the {@link projectionMatrix} if needed.
     * @param parameters - {@link PerspectiveCameraOptions} to use for the perspective projection.
     */
    setPerspective({ fov, near, far, width, height, pixelRatio, }?: PerspectiveCameraOptions): void;
    /**
     * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.
     *
     * Used to translate planes along the Z axis using pixel units as CSS would do.
     *
     * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
     */
    setCSSPerspective(): void;
    /**
     * Get visible width / height at a given z-depth from our {@link PerspectiveCamera} parameters.
     *
     * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}.
     * @param depth - Depth to use for calculations.
     * @returns - Visible width and height at given depth.
     */
    getVisibleSizeAtDepth(depth?: number): RectSize;
    /**
     * Updates the {@link PerspectiveCamera} {@link projectionMatrix}.
     */
    updateProjectionMatrix(): void;
    /**
     * Get the current {@link PerspectiveCamera} frustum planes in the [left, right, top, bottom, near, far] order, based on its {@link projectionMatrix} and {@link viewMatrix}.
     * @returns - Frustum planes as an array of 6 faces in the [left, right, top, bottom, near, far] order, made of {@link Float32Array} of length 4.
     * @readonly
     */
    get frustumPlanes(): Array<Float32Array>;
}
