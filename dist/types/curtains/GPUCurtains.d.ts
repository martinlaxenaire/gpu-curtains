/// <reference types="dist" />
import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer';
import { ScrollManager } from '../utils/ScrollManager';
import { Vec3 } from '../math/Vec3';
import { PingPongPlane } from './meshes/PingPongPlane';
import { ShaderPass } from '../core/renderPasses/ShaderPass';
import { GPURenderer, GPURendererParams, ProjectedMesh } from '../core/renderers/GPURenderer';
import { DOMMesh } from './meshes/DOMMesh';
import { Plane } from './meshes/Plane';
import { ComputePass } from '../core/computePasses/ComputePass';
import { Camera, CameraBasePerspectiveOptions } from '../core/camera/Camera';
import { DOMElementBoundingRect, DOMElementParams, DOMPosition } from '../core/DOM/DOMElement';
import { GPUCameraRenderer, GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer';
import { GPUDeviceManager } from '../core/renderers/GPUDeviceManager';
import { Renderer } from '../core/renderers/utils';
/**
 * Options used to create a {@link GPUCurtains}
 */
interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'deviceManager'> {
    /** Whether {@link GPUCurtains} should create its own requestAnimationFrame loop to render or not */
    autoRender?: boolean;
    /** Whether {@link GPUCurtains} should handle all resizing by itself or not */
    autoResize?: boolean;
    /** Whether {@link GPUCurtains} should listen to scroll event or not */
    watchScroll?: boolean;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production: GPUDeviceManager['production'];
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
    /** {@link GPUDeviceManager} used to handle the {@link GPUAdapter} and {@link GPUDevice} */
    deviceManager: GPUDeviceManager;
    /** [Curtains renderer]{@link GPUCurtainsRenderer} used to handle everything related to WebGPU */
    /** Tiny scroll event listener wrapper */
    scrollManager: ScrollManager;
    /** [Request animation frame callback]{@link requestVideoFrameCallback} returned id if used */
    animationFrameID: null | number;
    /** function assigned to the [onRender]{@link GPUCurtains#onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the [onScroll]{@link GPUCurtains#onScroll} callback */
    _onScrollCallback: () => void;
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
    setContainer(container: DOMElementParams['element']): void;
    /**
     * Set the default [curtains renderer]{@link GPUCurtainsRenderer}
     */
    setMainRenderer(): void;
    /**
     * Patch the options with default values before creating a [renderer]{@link Renderer}
     * @param options - options to patch
     */
    patchRendererOptions<T extends GPURendererParams | GPUCameraRendererParams>(options: T): T;
    /**
     * Create a new {@link GPURenderer} instance
     * @param options - [options]{@link GPURendererParams} to use
     */
    createRenderer(options: GPURendererParams): GPURenderer;
    /**
     * Create a new {@link GPUCameraRenderer} instance
     * @param options - [options]{@link GPUCameraRendererParams} to use
     */
    createCameraRenderer(options: GPUCameraRendererParams): GPUCameraRenderer;
    /**
     * Create a new {@link GPUCurtainsRenderer} instance
     * @param options - [options]{@link GPUCameraRendererParams} to use
     */
    createCurtainsRenderer(options: GPUCameraRendererParams): GPUCurtainsRenderer;
    /**
     * Set our [device manager]{@link GPUDeviceManager}
     */
    setDeviceManager(): void;
    /**
     * Get all created [renderers]{@link Renderer}
     * @readonly
     */
    get renderers(): Renderer[];
    /**
     * Get the default {@link GPUCurtainsRenderer} created
     * @readonly
     */
    get renderer(): GPUCurtainsRenderer;
    /**
     * Set the [device manager]{@link GPUDeviceManager} [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} if possible, then set all created [renderers]{@link Renderer} contexts
     */
    setDevice(): Promise<void>;
    /**
     * Restore the [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device}
     * @async
     */
    restoreContext(): Promise<void>;
    /**
     * Set the various event listeners, set the [curtains renderer]{@link GPUCurtainsRenderer}, append the [canvas]{@link HTMLCanvasElement} to our [container]{@link GPUCurtains#container} and start rendering if needed
     */
    setCurtains(): void;
    /**
     * Get all the created [ping pong planes]{@link PingPongPlane}
     * @readonly
     */
    get pingPongPlanes(): PingPongPlane[];
    /**
     * Get all the created [shader passes]{@link ShaderPass}
     * @readonly
     */
    get shaderPasses(): ShaderPass[];
    /**
     * Get all the created [meshes]{@link MeshBase}
     * @readonly
     */
    get meshes(): ProjectedMesh[];
    /**
     * Get all the created [DOM Meshes]{@link DOMMesh} (including [planes]{@link Plane})
     * @readonly
     */
    get domMeshes(): DOMMesh[];
    /**
     * Get all the created [planes]{@link Plane}
     * @readonly
     */
    get planes(): Plane[];
    /**
     * Get all the created [compute passes]{@link ComputePass}
     * @readonly
     */
    get computePasses(): ComputePass[];
    /**
     * Get the [default curtains renderer camera]{@link GPUCurtainsRenderer#camera}
     * @readonly
     */
    get camera(): Camera;
    /**
     * Set the [default curtains renderer camera perspective]{@link GPUCurtainsRenderer#setPerspective}
     * @param parameters - [parameters]{@link CameraBasePerspectiveOptions} to use for the perspective
     */
    setPerspective({ fov, near, far }?: CameraBasePerspectiveOptions): void;
    /**
     * Set the default [curtains renderer camera position]{@link GPUCurtainsRenderer#setCameraPosition}
     * @param position - new [position]{@link Camera#position}
     */
    setCameraPosition(position?: Vec3): void;
    /**
     * Get our [default curtains renderer bounding rectangle]{@link GPUCurtainsRenderer#boundingRect}
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
     * Called if there's been an error while trying to create the [device]{@link GPUDeviceManager#device}
     * @param callback - callback to run if there's been an error while trying to create the [device]{@link GPUDeviceManager#device}
     * @returns - our {@link GPUCurtains}
     */
    onError(callback: () => void): GPUCurtains;
    /**
     * Called whenever the [device]{@link GPUDeviceManager#device} is lost
     * @param callback - callback to run whenever the [device]{@link GPUDeviceManager#device} is lost
     * @returns - our {@link GPUCurtains}
     */
    onContextLost(callback: (info?: GPUDeviceLostInfo) => void): GPUCurtains;
    /**
     * Create a requestAnimationFrame loop and run it
     */
    animate(): void;
    /**
     * Renderer our [renderers]{@link GPUCurtains#renderers}
     */
    render(): void;
    /**
     * Destroy our {@link GPUCurtains} and [device manager]{@link GPUDeviceManager}
     */
    destroy(): void;
}
export {};
