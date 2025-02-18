import { Camera } from '../../core/camera/Camera';
import { Vec3 } from '../../math/Vec3';
/** Defines the base parameters used to set / reset an {@link OrbitControls}. */
export interface OrbitControlsBaseParams {
    /** The {@link Vec3 | focus point} or the {@link OrbitControls}. */
    target?: Vec3;
    /** Whether to allow zooming or not. */
    enableZoom?: boolean;
    /** Minimum zoom value to use. */
    minZoom?: number;
    /** Maximum zoom value to use. */
    maxZoom?: number;
    /** Zoom speed value to use. */
    zoomSpeed?: number;
    /** Whether to allow rotating or not. */
    enableRotate?: boolean;
    /** Minimum angle to use for vertical rotation. */
    minPolarAngle?: number;
    /** Maximum angle to use for vertical rotation. */
    maxPolarAngle?: number;
    /** Minimum angle to use for horizontal rotation. */
    minAzimuthAngle?: number;
    /** Maximum angle to use for horizontal rotation. */
    maxAzimuthAngle?: number;
    /** Rotate speed value to use. */
    rotateSpeed?: number;
    /** Whether to allow paning or not. */
    enablePan?: boolean;
    /** Pan speed value to use. */
    panSpeed?: number;
}
/** Defines base parameters used to create an {@link OrbitControls}. */
export interface OrbitControlsParams extends OrbitControlsBaseParams {
    /** Optional {@link Camera} to use. */
    camera?: Camera;
    /** Optional {@link HTMLElement} (or {@link Window} element) to use for event listeners. */
    element?: HTMLElement | Window;
}
/**
 * Helper to create orbit camera controls (sometimes called arc ball camera).
 *
 * @example
 * ```javascript
 * // assuming renderer is a valid CameraRenderer
 * const { camera } = renderer
 * const orbitControls = new OrbitControls({ camera })
 * ```
 */
export declare class OrbitControls {
    #private;
    /** {@link Camera} to use with this {@link OrbitControls}. */
    camera: Camera;
    /** The {@link Vec3 | focus point} or the {@link OrbitControls}. Default to `Vec3(0)`. */
    target: Vec3;
    /** Whether to allow zooming or not. Default to `true`. */
    enableZoom: boolean;
    /** Minimum zoom value to use. Default to `0`. */
    minZoom: number;
    /** Maximum zoom value to use. Default to `Infinity`. */
    maxZoom: number;
    /** Zoom speed value to use. Default to `1`. */
    zoomSpeed: number;
    /** Whether to allow rotating or not. Default to `true`. */
    enableRotate: boolean;
    /** Minimum angle to use for vertical rotation. Default to `0`. */
    minPolarAngle: number;
    /** Maximum angle to use for vertical rotation. Default to `Math.PI`. */
    maxPolarAngle: number;
    /** Minimum angle to use for horizontal rotation. Default to `-Infinity`. */
    minAzimuthAngle: number;
    /** Maximum angle to use for horizontal rotation. Default to `Infinity`. */
    maxAzimuthAngle: number;
    /** Rotate speed value to use. Default to `1`. */
    rotateSpeed: number;
    /** Whether to allow paning or not. Default to `true`. */
    enablePan: boolean;
    /** Pan speed value to use. Default to `1`. */
    panSpeed: number;
    /**
     * OrbitControls constructor
     * @param parameters - parameters to use.
     */
    constructor({ camera, element, target, enableZoom, minZoom, maxZoom, zoomSpeed, enableRotate, minPolarAngle, maxPolarAngle, minAzimuthAngle, maxAzimuthAngle, rotateSpeed, enablePan, panSpeed, }: OrbitControlsParams);
    /**
     * Allow to set or reset this {@link OrbitControls.camera | OrbitControls camera}.
     * @param camera - New {@link OrbitControls.camera | camera} to use.
     */
    useCamera(camera: Camera): void;
    /**
     * Reset the {@link OrbitControls} values.
     * @param parameters - Parameters used to reset the values. Those are the same as {@link OrbitControlsBaseParams} with an additional position parameter to allow to override the {@link OrbitControls} position.
     */
    reset({ position, target, enableZoom, minZoom, maxZoom, zoomSpeed, enableRotate, minPolarAngle, maxPolarAngle, minAzimuthAngle, maxAzimuthAngle, rotateSpeed, enablePan, panSpeed, }?: {
        position?: Vec3;
    } & OrbitControlsBaseParams): void;
    /**
     * Allow to override the {@link camera} position.
     * @param position - new {@link camera} position to set.
     */
    updatePosition(position?: Vec3): void;
    /**
     * Set the element to use for event listeners. Can remove previous event listeners first if needed.
     * @param value - {@link HTMLElement} (or {@link Window} element) to use.
     */
    set element(value: HTMLElement | Window | null);
    /**
     * Get our element to use for event listeners.
     * @returns - {@link HTMLElement} (or {@link Window} element) used.
     */
    get element(): HTMLElement | Window | null;
    /**
     * Destroy the {@link OrbitControls}.
     */
    destroy(): void;
}
