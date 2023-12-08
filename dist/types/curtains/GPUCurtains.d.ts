/// <reference types="dist" />
import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer';
import { ScrollManager } from '../utils/ScrollManager';
import { Vec3 } from '../math/Vec3';
import { PingPongPlane } from './meshes/PingPongPlane';
import { ShaderPass } from '../core/renderPasses/ShaderPass';
import { MeshType } from '../core/renderers/GPURenderer';
import { DOMMesh } from './meshes/DOMMesh';
import { Plane } from './meshes/Plane';
import { ComputePass } from '../core/computePasses/ComputePass';
import { Camera } from '../core/camera/Camera';
import { DOMElementBoundingRect, DOMPosition } from '../core/DOM/DOMElement';
import { GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer';
/**
 * Options used to create a {@link GPUCurtains}
 */
interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'onError'> {
    /** Whether {@link GPUCurtains} should create its own requestAnimationFrame loop to render or not */
    autoRender?: boolean;
    /** Whether {@link GPUCurtains} should handle all resizing by itself or not */
    autoResize?: boolean;
    /** Whether {@link GPUCurtains} should listen to scroll event or not */
    watchScroll?: boolean;
}
/**
 * Parameters used to create a {@link GPUCurtains}
 */
interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
    /** {@link HTMLElement} or string representing an {@link HTMLElement} selector that will hold the WebGPU [canvas]{@link HTMLCanvasElement}. Could be set later if not specified. */
    container?: string | HTMLElement | null;
}
/**
 * GPUCurtains class:
 * Used as a global class to create a [Curtains renderer]{@link GPUCurtainsRenderer}, create all objects that need a reference to a renderer, listen to various events such as scroll and resize and render.
 */
export declare class GPUCurtains {
    /** The type of this {@link GPUCurtains} */
    type: string;
    /** Options used to create this {@link GPUCurtains} */
    options: GPUCurtainsOptions;
    /** {@link HTMLElement} that will hold the WebGPU [canvas]{@link HTMLCanvasElement} */
    container: HTMLElement;
    /** [Curtains renderer]{@link GPUCurtainsRenderer} used to handle everything related to WebGPU */
    renderer: GPUCurtainsRenderer;
    /** Tiny scroll event listener wrapper */
    scrollManager: ScrollManager;
    /** [Request animation frame callback]{@link requestVideoFrameCallback} returned id if used */
    animationFrameID: null | number;
    /** function assigned to the [onRender]{@link GPUCurtains#onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the [onScroll]{@link GPUCurtains#onScroll} callback */
    _onScrollCallback: () => void;
    /** function assigned to the [onAfterResize]{@link GPUCurtains#onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /** function assigned to the [onError]{@link GPUCurtains#onError} callback */
    _onErrorCallback: () => void;
    /** function assigned to the [onContextLost]{@link GPUCurtains#onContextLost} callback */
    _onContextLostCallback: (info?: GPUDeviceLostInfo) => void;
    /**
     * GPUCurtains constructor
     * @param parameters - [parameters]{@link GPUCurtainsParams} used to create this {@link GPUCurtains}
     */
    constructor({ container, pixelRatio, sampleCount, preferredFormat, alphaMode, production, camera, autoRender, autoResize, watchScroll, }: GPUCurtainsParams);
    /**
     * Set the [container]{@link GPUCurtains#container}
     * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setContainer(container: string | HTMLElement): void;
    /**
     * Set the [curtains renderer]{@link GPUCurtainsRenderer}
     */
    setRenderer(): void;
    restoreContext(): void;
    /**
     * Set the [curtains renderer context]{@link GPUCurtainsRenderer#setContext}
     * @async
     */
    setRendererContext(): Promise<void>;
    /**
     * Set the various event listeners, set the [curtains renderer]{@link GPUCurtainsRenderer}, append the [canvas]{@link HTMLCanvasElement} to our [container]{@link GPUCurtains#container} and start rendering if needed
     */
    setCurtains(): void;
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [ping pong planes]{@link PingPongPlane}
     */
    get pingPongPlanes(): PingPongPlane[];
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [shader passes]{@link ShaderPass}
     */
    get shaderPasses(): ShaderPass[];
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [meshes]{@link MeshBase}
     */
    get meshes(): MeshType[];
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [DOM Meshes]{@link DOMMesh}
     */
    get domMeshes(): DOMMesh[];
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [planes]{@link Plane}
     */
    get planes(): Plane[];
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [compute passes]{@link ComputePass}
     */
    get computePasses(): ComputePass[];
    /**
     * Get the [curtains renderer camera]{@link GPUCurtainsRenderer#camera}
     */
    get camera(): Camera;
    /**
     * Set the [curtains renderer camera perspective]{@link GPUCurtainsRenderer#setPerspective}
     */
    setPerspective(fov?: number, near?: number, far?: number): void;
    /**
     * Set the [curtains renderer camera position]{@link GPUCurtainsRenderer#setCameraPosition}
     */
    setCameraPosition(position?: Vec3): void;
    /**
     * Manually resize our [curtains renderer]{@link GPUCurtainsRenderer}
     */
    resize(): void;
    /**
     * Get our [curtains renderer bounding rectangle]{@link GPUCurtainsRenderer#boundingRect}
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Set the [scroll manager]{@link GPUCurtains#scrollManager}
     */
    initScroll(): void;
    /**
     * Update all [DOMMeshes scroll position]{@link DOMMesh#updateScrollPosition}
     * @param delta - last [scroll delta values]{@link ScrollManager#delta}
     */
    updateScroll(delta?: DOMPosition): void;
    /**
     * Update our [scrollManager scroll values]{@link ScrollManager#scroll}. Called each time the scroll has changed if [watchScroll]{@link GPUCurtainsOptions#watchScroll} is set to true. Could be called externally as well.
     * @param scroll
     */
    updateScrollValues(scroll?: DOMPosition): void;
    /**
     * Get our [scrollManager scroll deltas]{@link ScrollManager#delta}
     * @readonly
     */
    get scrollDelta(): DOMPosition;
    /**
     * Get our [scrollManager scroll values]{@link ScrollManager#scroll}
     * @readonly
     */
    get scrollValues(): DOMPosition;
    /**
     * Set the resize and scroll event listeners
     */
    initEvents(): void;
    /**
     * Called at each render frame
     * @param callback - callback to run at each render
     * @returns - our {@link GPUCurtains}
     */
    onRender(callback: () => void): GPUCurtains;
    /**
     * Called each time the [scroll values]{@link ScrollManager#scroll} changed
     * @param callback - callback to run each time the [scroll values]{@link ScrollManager#scroll} changed
     * @returns - our {@link GPUCurtains}
     */
    onScroll(callback: () => void): GPUCurtains;
    /**
     * Called each time the [resize]{@link GPUCurtains#resize} method has been called
     * @param callback - callback to run each time the [resize]{@link GPUCurtains#resize} method has been called
     * @returns - our {@link GPUCurtains}
     */
    onAfterResize(callback: () => void): GPUCurtains;
    /**
     * Called if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
     * @param callback - callback to run if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
     * @returns - our {@link GPUCurtains}
     */
    onError(callback: () => void): GPUCurtains;
    /**
     * Called whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
     * @param callback - callback to run whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
     * @returns - our {@link GPUCurtains}
     */
    onContextLost(callback: (info?: GPUDeviceLostInfo) => void): GPUCurtains;
    /**
     * Create a requestAnimationFrame loop and run it
     */
    animate(): void;
    /**
     * Renderer our [curtains renderer]{@link GPUCurtainsRenderer}
     */
    render(): void;
    /**
     * Destroy our {@link GPUCurtains} and [curtains renderer]{@link GPUCurtainsRenderer}
     */
    destroy(): void;
}
export {};
