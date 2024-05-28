/// <reference types="dist" />
import { GPUCurtainsRenderer } from './renderers/GPUCurtainsRenderer';
import { ScrollManager } from '../utils/ScrollManager';
import { Vec3 } from '../math/Vec3';
import { PingPongPlane } from '../extras/meshes/PingPongPlane';
import { ShaderPass } from '../core/renderPasses/ShaderPass';
import { GPURenderer, GPURendererParams, SceneStackedMesh } from '../core/renderers/GPURenderer';
import { DOMMesh } from './meshes/DOMMesh';
import { Plane } from './meshes/Plane';
import { ComputePass } from '../core/computePasses/ComputePass';
import { Camera, CameraBasePerspectiveOptions } from '../core/camera/Camera';
import { DOMElementBoundingRect, DOMElementParams, DOMPosition } from '../core/DOM/DOMElement';
import { GPUCameraRenderer, GPUCameraRendererParams } from '../core/renderers/GPUCameraRenderer';
import { GPUDeviceManager, GPUDeviceManagerBaseParams, GPUDeviceManagerSetupParams } from '../core/renderers/GPUDeviceManager';
import { Renderer } from '../core/renderers/utils';
import { DOMObject3D } from './objects3D/DOMObject3D';
/**
 * Options used to create a {@link GPUCurtains}
 */
export interface GPUCurtainsOptions extends Omit<GPUCameraRendererParams, 'deviceManager'>, GPUDeviceManagerBaseParams {
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
export interface GPUCurtainsParams extends Partial<Omit<GPUCurtainsOptions, 'container'>> {
    /** {@link HTMLElement} or string representing an {@link HTMLElement} selector that will hold the WebGPU {@link HTMLCanvasElement}. Could be set later if not specified. */
    container?: string | HTMLElement | null;
}
/**
 * Used as a global class to create a {@link GPUCurtainsRenderer}, create all objects that need a reference to a renderer, listen to various events such as scroll and resize and render.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 * ```
 */
export declare class GPUCurtains {
    /** The type of this {@link GPUCurtains} */
    type: string;
    /** Options used to create this {@link GPUCurtains} */
    options: GPUCurtainsOptions;
    /** {@link HTMLElement} that will hold the WebGPU {@link HTMLCanvasElement} */
    container: HTMLElement;
    /** {@link GPUDeviceManager} used to handle the {@link GPUAdapter} and {@link GPUDevice} */
    deviceManager: GPUDeviceManager;
    /** Tiny scroll event listener wrapper */
    scrollManager: ScrollManager;
    /** Request animation frame callback returned id if used */
    animationFrameID: null | number;
    /** function assigned to the {@link onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the {@link onScroll} callback */
    _onScrollCallback: () => void;
    /** function assigned to the {@link onError} callback */
    _onErrorCallback: () => void;
    /** function assigned to the {@link onContextLost} callback */
    _onContextLostCallback: (info?: GPUDeviceLostInfo) => void;
    /**
     * GPUCurtains constructor
     * @param parameters - {@link GPUCurtainsParams | parameters} used to create this {@link GPUCurtains}
     */
    constructor({ container, label, pixelRatio, preferredFormat, alphaMode, production, adapterOptions, renderPass, camera, autoRender, autoResize, watchScroll, }?: GPUCurtainsParams);
    /**
     * Set the {@link container}
     * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setContainer(container: DOMElementParams['element']): void;
    /**
     * Set the default {@link GPUCurtainsRenderer | renderer}
     */
    setMainRenderer(): void;
    /**
     * Patch the options with default values before creating a {@link Renderer}
     * @param parameters - parameters to patch
     */
    patchRendererOptions<T extends GPURendererParams | GPUCameraRendererParams>(parameters: T): T;
    /**
     * Create a new {@link GPURenderer} instance
     * @param parameters - {@link GPURendererParams | parameters} to use
     */
    createRenderer(parameters: GPURendererParams): GPURenderer;
    /**
     * Create a new {@link GPUCameraRenderer} instance
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use
     */
    createCameraRenderer(parameters: GPUCameraRendererParams): GPUCameraRenderer;
    /**
     * Create a new {@link GPUCurtainsRenderer} instance
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use
     */
    createCurtainsRenderer(parameters: GPUCameraRendererParams): GPUCurtainsRenderer;
    /**
     * Set our {@link GPUDeviceManager}
     */
    setDeviceManager(): void;
    /**
     * Get all created {@link Renderer}
     * @readonly
     */
    get renderers(): Renderer[];
    /**
     * Get the default {@link GPUCurtainsRenderer} created
     * @readonly
     */
    get renderer(): GPUCurtainsRenderer;
    /**
     * Set the {@link GPUDeviceManager} {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} if possible, then set all created {@link Renderer} contexts.
     * @async
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    setDevice({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Restore the {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device}
     * @async
     */
    restoreContext(): Promise<void>;
    /**
     * Set the various event listeners, set the {@link GPUCurtainsRenderer} and start rendering if needed
     */
    setCurtains(): void;
    /**
     * Get all the created {@link PingPongPlane}
     * @readonly
     */
    get pingPongPlanes(): PingPongPlane[];
    /**
     * Get all the created {@link ShaderPass}
     * @readonly
     */
    get shaderPasses(): ShaderPass[];
    /**
     * Get all the created {@link SceneStackedMesh | meshes}
     * @readonly
     */
    get meshes(): SceneStackedMesh[];
    /**
     * Get all the created {@link DOMMesh | DOM Meshes} (including {@link Plane | planes})
     * @readonly
     */
    get domMeshes(): DOMMesh[];
    /**
     * Get all created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll.
     * @readonly
     */
    get domObjects(): DOMObject3D[];
    /**
     * Get all the created {@link Plane | planes}
     * @readonly
     */
    get planes(): Plane[];
    /**
     * Get all the created {@link ComputePass | compute passes}
     * @readonly
     */
    get computePasses(): ComputePass[];
    /**
     * Get the {@link GPUCurtainsRenderer#camera | default GPUCurtainsRenderer camera}
     * @readonly
     */
    get camera(): Camera;
    /**
     * Set the {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer camera} perspective
     * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({ fov, near, far }?: CameraBasePerspectiveOptions): void;
    /**
     * Set the default {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer camera} {@link Camera#position | position}
     * @param position - new {@link Camera#position | position}
     */
    setCameraPosition(position?: Vec3): void;
    /**
     * Get our {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer bounding rectangle}
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Set the {@link scrollManager}
     */
    initScroll(): void;
    /**
     * Update all {@link DOMMesh#updateScrollPosition | DOMMesh scroll positions}
     * @param delta - last {@link ScrollManager#delta | scroll delta values}
     */
    updateScroll(delta?: DOMPosition): void;
    /**
     * Update our {@link ScrollManager#scroll | scrollManager scroll values}. Called each time the scroll has changed if {@link GPUCurtains#options.watchScroll | watchScroll option} is set to true. Could be called externally as well.
     * @param scroll - new {@link DOMPosition | scroll values}
     */
    updateScrollValues(scroll?: DOMPosition): void;
    /**
     * Get our {@link ScrollManager#delta | scrollManager delta values}
     * @readonly
     */
    get scrollDelta(): DOMPosition;
    /**
     * Get our {@link ScrollManager#scroll | scrollManager scroll values}
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
     * Called each time the {@link ScrollManager#scroll | scrollManager scroll values} changed
     * @param callback - callback to run each time the {@link ScrollManager#scroll | scrollManager scroll values} changed
     * @returns - our {@link GPUCurtains}
     */
    onScroll(callback: () => void): GPUCurtains;
    /**
     * Called if there's been an error while trying to create the {@link GPUDeviceManager#device | device}
     * @param callback - callback to run if there's been an error while trying to create the {@link GPUDeviceManager#device | device}
     * @returns - our {@link GPUCurtains}
     */
    onError(callback: () => void): GPUCurtains;
    /**
     * Called whenever the {@link GPUDeviceManager#device | device} is lost
     * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} is lost
     * @returns - our {@link GPUCurtains}
     */
    onContextLost(callback: (info?: GPUDeviceLostInfo) => void): GPUCurtains;
    /**
     * Create a requestAnimationFrame loop and run it
     */
    animate(): void;
    /**
     * Render our {@link GPUDeviceManager}
     */
    render(): void;
    /**
     * Destroy our {@link GPUCurtains} and {@link GPUDeviceManager}
     */
    destroy(): void;
}
