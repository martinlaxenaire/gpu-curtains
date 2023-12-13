/// <reference types="dist" />
import { Renderer } from './utils';
import { Sampler } from '../samplers/Sampler';
import { PipelineManager } from '../pipelines/PipelineManager';
export interface GPUDeviceManagerParams {
    label?: string;
    /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter} or [device]{@link GPUDevice} */
    onError?: () => void;
    /** Callback to run whenever the [device]{@link GPUDeviceManagerParams#device} is lost */
    onDeviceLost?: (info?: GPUDeviceLostInfo) => void;
}
/**
 * GPUDeviceManager class:
 * Responsible for the WebGPU [adapter]{@link GPUAdapter} and [device]{@link GPUDevice} creations.
 *
 */
export declare class GPUDeviceManager {
    /** Number of times a {@link GPUDevice} has been created */
    index: number;
    /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose */
    label: string;
    /** navigator {@link GPU} object */
    gpu: GPU | undefined;
    /** The WebGPU [adapter]{@link GPUAdapter} used */
    adapter: GPUAdapter | void;
    /** The WebGPU [adapter]{@link GPUAdapter} informations */
    adapterInfos: GPUAdapterInfo | undefined;
    /** The WebGPU [device]{@link GPUDevice} used */
    device: GPUDevice | undefined;
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
    constructor({ label, onError, onDeviceLost, }: GPUDeviceManagerParams);
    /**
     * Set our [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} if possible
     */
    setAdapterAndDevice(): Promise<void>;
    /**
     * Set our [adapter]{@link GPUDeviceManager#adapter} if possible
     * @async
     * @returns - void promise result
     */
    setAdapter(): Promise<void>;
    /**
     * Set our [device]{@link GPUDeviceManager#device}
     * @async
     * @returns - void promise result
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
     * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
     * @param buffer - [buffer]{@link GPUBuffer} to remove
     */
    removeBuffer(buffer: GPUBuffer): void;
    /**
     * Destroy the {@link GPUDeviceManager} and its [renderers]{@link GPUDeviceManager#renderers}
     */
    destroy(): void;
}
