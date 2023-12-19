/// <reference types="dist" />
import { Renderer } from './utils';
import { Sampler } from '../samplers/Sampler';
import { PipelineManager } from '../pipelines/PipelineManager';
import { SceneObject } from './GPURenderer';
/**
 * Parameters used to create a {@link GPUDeviceManager}
 */
export interface GPUDeviceManagerParams {
    /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
    label?: string;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production?: boolean;
    /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter} or [device]{@link GPUDevice} */
    onError?: () => void;
    /** Callback to run whenever the [device]{@link GPUDeviceManagerParams#device} is lost */
    onDeviceLost?: (info?: GPUDeviceLostInfo) => void;
}
/**
 * GPUDeviceManager class:
 * Responsible for the WebGPU [adapter]{@link GPUAdapter} and [device]{@link GPUDevice} creations, losing and restoration.
 * Will also keep a track of all the [renderers]{@link Renderer}, [samplers]{@link Sampler} and [buffers]{@link GPUBuffer} created.
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
    /** The WebGPU [adapter]{@link GPUAdapter} used */
    adapter: GPUAdapter | void;
    /** The WebGPU [adapter]{@link GPUAdapter} informations */
    adapterInfos: GPUAdapterInfo | undefined;
    /** The WebGPU [device]{@link GPUDevice} used */
    device: GPUDevice | undefined;
    /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} have been successfully created */
    ready: boolean;
    /** Array of [renderers]{@link Renderer} using that {@link GPUDeviceManager} */
    renderers: Renderer[];
    /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate */
    pipelineManager: PipelineManager;
    /** An array containing all our created {@link GPUBuffer} */
    buffers: GPUBuffer[];
    /** An array containing all our created {@link Sampler} */
    samplers: Sampler[];
    /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
    onError: () => void;
    /** Callback to run whenever the [renderer device]{@link GPUDeviceManager#device} is lost */
    onDeviceLost: (info?: GPUDeviceLostInfo) => void;
    /**
     * GPUDeviceManager constructor
     * @param parameters - [parameters]{@link GPUDeviceManagerParams} used to create this {@link GPUDeviceManager}
     */
    constructor({ label, production, onError, onDeviceLost, }: GPUDeviceManagerParams);
    /**
     * Set our [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} if possible
     */
    setAdapterAndDevice(): Promise<void>;
    /**
     * Set up our [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} and all the already created [renderers]{@link GPUDeviceManager#renderers} contexts
     */
    init(): Promise<void>;
    /**
     * Set our [adapter]{@link GPUDeviceManager#adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @async
     */
    setAdapter(): Promise<void>;
    /**
     * Set our [device]{@link GPUDeviceManager#device}
     * @async
     */
    setDevice(): Promise<void>;
    /**
     * Set our [pipeline manager]{@link GPUDeviceManager#pipelineManager}
     */
    setPipelineManager(): void;
    /**
     * Called when the [device]{@link GPUDeviceManager#device} is lost.
     * Reset all our renderers
     */
    loseDevice(): void;
    /**
     * Called when the [device]{@link GPUDeviceManager#device} should be restored.
     * Restore all our renderers
     */
    restoreDevice(): Promise<void>;
    /**
     * Add a [renderer]{@link Renderer} to our [renderers array]{@link GPUDeviceManager#renderers}
     * @param renderer - [renderer]{@link Renderer} to add
     */
    addRenderer(renderer: Renderer): void;
    /**
     * Remove a [renderer]{@link Renderer} from our [renderers array]{@link GPUDeviceManager#renderers}
     * @param renderer - [renderer]{@link Renderer} to remove
     */
    removeRenderer(renderer: Renderer): void;
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this [device manager]{@link GPUDeviceManager}
     * @readonly
     */
    get deviceObjects(): SceneObject[];
    /**
     * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
     * @param buffer - [buffer]{@link GPUBuffer} to remove
     * @param [originalLabel] - original [buffer]{@link GPUBuffer} label in case it has been swapped
     */
    removeBuffer(buffer: GPUBuffer, originalLabel?: string): void;
    /**
     * Remove a [sampler]{@link Sampler} from our [samplers array]{@link GPUDeviceManager#samplers}
     * @param sampler - [sampler]{@link Sampler} to remove
     */
    removeSampler(sampler: Sampler): void;
    render(): void;
    /**
     * Destroy the {@link GPUDeviceManager} and its [renderers]{@link GPUDeviceManager#renderers}
     */
    destroy(): void;
}
