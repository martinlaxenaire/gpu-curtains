import { CameraRenderer } from '../../core/renderers/utils';
import { Camera } from '../../core/camera/Camera';
import { Object3D } from '../../core/objects3D/Object3D';
import { Vec2 } from '../../math/Vec2';
/**
 * Helper to create orbit camera controls (sometimes called arcball camera).
 *
 * @example
 * ```javascript
 * const orbitControls = new OrbitControl(renderer)
 * ```
 */
export declare class OrbitControls extends Object3D {
    #private;
    /** {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well. */
    renderer: CameraRenderer;
    /** {@link Camera} to use with this {@link OrbitControls}. */
    camera: Camera;
    /** Whether to constrain the orbit controls along X axis or not. */
    constrainXOrbit: boolean;
    /** Whether to constrain the orbit controls along Y axis or not. */
    constrainYOrbit: boolean;
    /** Minimum orbit values to apply along both axis if constrained. */
    minOrbit: Vec2;
    /** Maximum orbit values to apply along both axis if constrained. */
    maxOrbit: Vec2;
    /** Orbit step (speed) values to use. */
    orbitStep: Vec2;
    /** Whether to constrain the zoom or not. */
    constrainZoom: boolean;
    /** Minimum zoom value to apply if constrained (can be negative). */
    minZoom: number;
    /** Maximum zoom value to apply if constrained. */
    maxZoom: number;
    /** Zoom step (speed) value to use. */
    zoomStep: number;
    /**
     * OrbitControls constructor
     * @param renderer - {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well.
     * @param camera - optional {@link Camera} to use.
     */
    constructor(renderer: CameraRenderer, camera?: Camera);
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
     * Add the event listeners.
     */
    addEvents(): void;
    /**
     * Remove the event listeners.
     */
    removeEvents(): void;
    /**
     * Callback executed on pointer down event.
     * @param e - {@link PointerEvent}.
     */
    onPointerDown(e: PointerEvent): void;
    /**
     * Callback executed on pointer move event.
     * @param e - {@link PointerEvent}.
     */
    onPointerMove(e: PointerEvent): void;
    /**
     * Callback executed on pointer up event.
     * @param e - {@link PointerEvent}.
     */
    onPointerUp(e: PointerEvent): void;
    /**
     * Callback executed on wheel event.
     * @param e - {@link WheelEvent}.
     */
    onMouseWheel(e: WheelEvent): void;
    /**
     * Reset the {@link OrbitControls} {@link position} and {@link rotation} values.
     */
    reset(): void;
    /**
     * Update the {@link OrbitControls} {@link rotation} based on deltas.
     * @param xDelta - delta along the X axis.
     * @param yDelta - delta along the Y axis.
     */
    orbit(xDelta: number, yDelta: number): void;
    /**
     * Update the {@link OrbitControls} {@link position} Z component based on the new distance.
     * @param distance - new distance to use.
     */
    zoom(distance: number): void;
    /**
     * Override {@link Object3D#updateModelMatrix | updateModelMatrix} method to compose the {@link modelMatrix}.
     */
    updateModelMatrix(): void;
    /**
     * Destroy the {@link OrbitControls}.
     */
    destroy(): void;
}
