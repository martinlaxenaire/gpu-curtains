/// <reference types="dist" />
import { Renderer } from './utils';
import { Sampler } from '../samplers/Sampler';
import { PipelineManager } from '../pipelines/PipelineManager';
import { SceneObject } from './GPURenderer';
import { DOMTexture } from '../textures/DOMTexture';
import { AllowedBindGroups } from '../../types/BindGroups';
import { Buffer } from '../buffers/Buffer';
import { BufferBinding } from '../bindings/BufferBinding';
/**
 * Base parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerBaseParams {
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production?: boolean;
    /** Additional options to use when requesting an {@link GPUAdapter | adapter} */
    adapterOptions?: GPURequestAdapterOptions;
}
/**
 * Parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerParams extends GPUDeviceManagerBaseParams {
    /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
    label?: string;
    /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device} */
    onError?: () => void;
    /** Callback to run whenever the {@link GPUDeviceManager#device | device} is lost */
    onDeviceLost?: (info?: GPUDeviceLostInfo) => void;
}
/** Optional parameters used to set up/init a {@link GPUAdapter} and {@link GPUDevice} */
export interface GPUDeviceManagerSetupParams {
    /** {@link GPUAdapter} to use if set */
    adapter?: GPUAdapter | null;
    /** {@link GPUDevice} to use if set */
    device?: GPUDevice | null;
}
/**
 * Responsible for the WebGPU {@link GPUAdapter | adapter} and {@link GPUDevice | device} creations, losing and restoration.
 *
 * It will create all the GPU objects that need a {@link GPUDevice | device} to do so, as well as a {@link PipelineManager}. It will also keep a track of all the {@link Renderer}, {@link AllowedBindGroups | bind groups}, {@link Sampler}, {@link DOMTexture} and {@link GPUBuffer | GPU buffers} created.
 *
 * The {@link GPUDeviceManager} is also responsible for creating the {@link GPUCommandBuffer}, rendering all the {@link Renderer} and then submitting the {@link GPUCommandBuffer} at each {@link GPUDeviceManager#render | render} calls.
 */
export declare class GPUDeviceManager {
    /** Number of times a {@link GPUDevice} has been created */
    index: number;
    /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
    label: string;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production: boolean;
    /** The navigator {@link GPU} object */
    gpu: GPU | undefined;
    /** The WebGPU {@link GPUAdapter | adapter} used */
    adapter: GPUAdapter | void;
    /** Additional options to use when requesting an {@link GPUAdapter | adapter} */
    adapterOptions: GPURequestAdapterOptions;
    /** The WebGPU {@link GPUDevice | device} used */
    device: GPUDevice | undefined;
    /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its {@link adapter} and {@link device} have been successfully created */
    ready: boolean;
    /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
    pipelineManager: PipelineManager;
    /** Array of {@link Renderer | renderers} using that {@link GPUDeviceManager} */
    renderers: Renderer[];
    /** A Map containing all our created {@link AllowedBindGroups} */
    bindGroups: Map<string, AllowedBindGroups>;
    /** An array containing all our created {@link GPUBuffer} */
    buffers: Map<string, Buffer>;
    /** A Map containing all our created {@link GPUBindGroupLayout} indexed by cache keys */
    bindGroupLayouts: Map<string, GPUBindGroupLayout>;
    /** A Map containing all our created {@link BufferBinding} indexed by cache keys */
    bufferBindings: Map<string, BufferBinding>;
    /** An array containing all our created {@link Sampler} */
    samplers: Sampler[];
    /** An array containing all our created {@link DOMTexture} */
    domTextures: DOMTexture[];
    /** An array to keep track of the newly uploaded {@link DOMTexture} and set their {@link DOMTexture#sourceUploaded | sourceUploaded} property */
    texturesQueue: DOMTexture[];
    /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device} */
    onError: () => void;
    /** Callback to run whenever the {@link device} is lost */
    onDeviceLost: (info?: GPUDeviceLostInfo) => void;
    /**
     * GPUDeviceManager constructor
     * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}
     */
    constructor({ label, production, adapterOptions, onError, onDeviceLost, }?: GPUDeviceManagerParams);
    /**
     * Set our {@link adapter} and {@link device} if possible.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    setAdapterAndDevice({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    init({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set our {@link adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @async
     * @param adapter - {@link GPUAdapter} to use if set.
     */
    setAdapter(adapter?: GPUAdapter | null): Promise<void>;
    /**
     * Set our {@link device}.
     * @async
     * @param device - {@link GPUDevice} to use if set.
     */
    setDevice(device?: GPUDevice | null): Promise<void>;
    /**
     * Set our {@link pipelineManager | pipeline manager}
     */
    setPipelineManager(): void;
    /**
     * Called when the {@link device} is lost.
     * Reset all our renderers
     */
    loseDevice(): void;
    /**
     * Called when the {@link device} should be restored.
     * Restore all our renderers.
     * @async
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    restoreDevice({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set all objects arrays that we'll keep track of
     */
    setDeviceObjects(): void;
    /**
     * Add a {@link Renderer} to our {@link renderers} array
     * @param renderer - {@link Renderer} to add
     */
    addRenderer(renderer: Renderer): void;
    /**
     * Remove a {@link Renderer} from our {@link renderers} array
     * @param renderer - {@link Renderer} to remove
     */
    removeRenderer(renderer: Renderer): void;
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}
     * @readonly
     */
    get deviceRenderedObjects(): SceneObject[];
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add
     */
    addBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
     */
    removeBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Add a {@link GPUBuffer} to our our {@link buffers} array
     * @param buffer - {@link Buffer} to add
     */
    addBuffer(buffer: Buffer): void;
    /**
     * Remove a {@link Buffer} from our {@link buffers} Map
     * @param buffer - {@link Buffer} to remove
     */
    removeBuffer(buffer: Buffer): void;
    /**
     * Add a {@link Sampler} to our {@link samplers} array
     * @param sampler - {@link Sampler} to add
     */
    addSampler(sampler: Sampler): void;
    /**
     * Remove a {@link Sampler} from our {@link samplers} array
     * @param sampler - {@link Sampler} to remove
     */
    removeSampler(sampler: Sampler): void;
    /**
     * Add a {@link DOMTexture} to our {@link domTextures} array
     * @param texture - {@link DOMTexture} to add
     */
    addDOMTexture(texture: DOMTexture): void;
    /**
     * Upload a {@link DOMTexture#texture | texture} to the GPU
     * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
     */
    uploadTexture(texture: DOMTexture): void;
    /**
     * Remove a {@link DOMTexture} from our {@link domTextures} array
     * @param texture - {@link DOMTexture} to remove
     */
    removeDOMTexture(texture: DOMTexture): void;
    /**
     * Render everything:
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
     * - create a {@link GPUCommandEncoder}
     * - render all our {@link renderers}
     * - submit our {@link GPUCommandBuffer}
     * - upload {@link DOMTexture#texture | DOMTexture textures} that do not have a parentMesh
     * - empty our {@link texturesQueue} array
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
     */
    render(): void;
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}
     */
    destroy(): void;
}
