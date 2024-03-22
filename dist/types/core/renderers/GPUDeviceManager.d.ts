/// <reference types="dist" />
import { Renderer } from './utils';
import { Sampler } from '../samplers/Sampler';
import { PipelineManager } from '../pipelines/PipelineManager';
import { SceneObject } from './GPURenderer';
import { Texture } from '../textures/Texture';
import { AllowedBindGroups } from '../../types/BindGroups';
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
/**
 * Responsible for the WebGPU {@link GPUAdapter | adapter} and {@link GPUDevice | device} creations, losing and restoration.
 *
 * It will create all the GPU objects that need a {@link GPUDevice | device} to do so, as well as a {@link PipelineManager}. It will also keep a track of all the {@link Renderer}, {@link AllowedBindGroups | bind groups}, {@link Sampler}, {@link Texture} and {@link GPUBuffer | GPU buffers} created.
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
    /** The WebGPU {@link GPUAdapter | adapter} informations */
    adapterInfos: GPUAdapterInfo | undefined;
    /** The WebGPU {@link GPUDevice | device} used */
    device: GPUDevice | undefined;
    /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its {@link adapter} and {@link device} have been successfully created */
    ready: boolean;
    /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
    pipelineManager: PipelineManager;
    /** Array of {@link Renderer | renderers} using that {@link GPUDeviceManager} */
    renderers: Renderer[];
    /** An array containing all our created {@link AllowedBindGroups} */
    bindGroups: AllowedBindGroups[];
    /** An array containing all our created {@link GPUBuffer} */
    buffers: GPUBuffer[];
    /** An array containing all our created {@link Sampler} */
    samplers: Sampler[];
    /** An array containing all our created {@link Texture} */
    textures: Texture[];
    /** An array to keep track of the newly uploaded {@link Texture | textures} and set their {@link Texture#sourceUploaded | sourceUploaded} property */
    texturesQueue: Texture[];
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
     * Set our {@link adapter} and {@link device} if possible
     */
    setAdapterAndDevice(): Promise<void>;
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
     */
    init(): Promise<void>;
    /**
     * Set our {@link adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @async
     */
    setAdapter(): Promise<void>;
    /**
     * Set our {@link device}
     * @async
     */
    setDevice(): Promise<void>;
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
     * Restore all our renderers
     */
    restoreDevice(): Promise<void>;
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
     * @param buffer - {@link GPUBuffer} to add
     */
    addBuffer(buffer: GPUBuffer): void;
    /**
     * Remove a {@link GPUBuffer} from our {@link buffers} array
     * @param buffer - {@link GPUBuffer} to remove
     * @param [originalLabel] - original {@link GPUBuffer} label in case the buffer has been swapped and its label has changed
     */
    removeBuffer(buffer: GPUBuffer, originalLabel?: string): void;
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
     * Add a {@link Texture} to our {@link textures} array
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture): void;
    /**
     * Upload a {@link Texture#texture | texture} to the GPU
     * @param texture - {@link Texture} class object with the {@link Texture#texture | texture} to upload
     */
    uploadTexture(texture: Texture): void;
    /**
     * Remove a {@link Texture} from our {@link textures} array
     * @param texture - {@link Texture} to remove
     */
    removeTexture(texture: Texture): void;
    /**
     * Render everything:
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
     * - create a {@link GPUCommandEncoder}
     * - render all our {@link renderers}
     * - submit our {@link GPUCommandBuffer}
     * - upload {@link Texture#texture | textures} that do not have a parentMesh
     * - empty our {@link texturesQueue} array
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
     */
    render(): void;
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}
     */
    destroy(): void;
}
