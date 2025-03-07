/// <reference types="@webgpu/types" />
import { Renderer } from './utils';
import { Sampler } from '../samplers/Sampler';
import { PipelineManager } from '../pipelines/PipelineManager';
import { SceneObject } from './GPURenderer';
import { AllowedBindGroups } from '../../types/BindGroups';
import { Buffer } from '../buffers/Buffer';
import { BufferBinding } from '../bindings/BufferBinding';
import { IndirectBuffer } from '../../extras/buffers/IndirectBuffer';
import { Texture } from '../textures/Texture';
import { MediaTexture } from '../textures/MediaTexture';
/**
 * Base parameters used to create a {@link GPUDeviceManager}.
 */
export interface GPUDeviceManagerBaseParams {
    /** The label of the {@link GPUDeviceManager}, used to create the {@link GPUDevice} for debugging purpose. */
    label?: string;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console. */
    production?: boolean;
    /** Additional options to use when requesting an {@link GPUAdapter | adapter}. */
    adapterOptions?: GPURequestAdapterOptions;
    /** Whether the {@link GPUDeviceManager} should create its own requestAnimationFrame loop to render or not. */
    autoRender?: boolean;
    /** Optional {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures#available_features | required features} representing additional functionalities to use when requesting a device. */
    requiredFeatures?: GPUFeatureName[];
    /** Optional {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedLimits#instance_properties | limits keys} to use to force the device to use the maximum supported adapter limits. */
    requestAdapterLimits?: Array<keyof GPUSupportedLimits>;
}
/**
 * Parameters used to create a {@link GPUDeviceManager}.
 */
export interface GPUDeviceManagerParams extends GPUDeviceManagerBaseParams {
    /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device}. */
    onError?: () => void;
    /** Callback to run whenever the {@link GPUDeviceManager#device | device} is lost. */
    onDeviceLost?: (info?: GPUDeviceLostInfo) => void;
    /** Callback to run whenever the {@link GPUDeviceManager#device | device} has been intentionally destroyed. */
    onDeviceDestroyed?: (info?: GPUDeviceLostInfo) => void;
}
/** Optional parameters used to set up/init a {@link GPUAdapter} and {@link GPUDevice}. */
export interface GPUDeviceManagerSetupParams {
    /** {@link GPUAdapter} to use if set. */
    adapter?: GPUAdapter | null;
    /** {@link GPUDevice} to use if set. */
    device?: GPUDevice | null;
}
/**
 * Responsible for the WebGPU {@link GPUAdapter | adapter} and {@link GPUDevice | device} creations, losing and restoration.
 *
 * It will create all the GPU objects that need a {@link GPUDevice | device} to do so, as well as a {@link PipelineManager}. It will also keep a track of all the {@link Renderer}, {@link AllowedBindGroups | bind groups}, {@link Sampler}, {@link MediaTexture} and {@link GPUBuffer | GPU buffers} created.
 *
 * The {@link GPUDeviceManager} is also responsible for creating the {@link GPUCommandBuffer}, rendering all the {@link Renderer} and then submitting the {@link GPUCommandBuffer} at each {@link GPUDeviceManager#render | render} calls.
 */
export declare class GPUDeviceManager {
    #private;
    /** Number of times a {@link GPUDevice} has been created. */
    index: number;
    /** The navigator {@link GPU} object. */
    gpu: GPU | undefined;
    /** The WebGPU {@link GPUAdapter | adapter} used. */
    adapter: GPUAdapter | void;
    /** The WebGPU {@link GPUDevice | device} used. */
    device: GPUDevice | undefined;
    /** Flag indicating whether the {@link GPUDeviceManager} is ready, i.e. its {@link adapter} and {@link device} have been successfully created. */
    ready: boolean;
    /** Options used to create this {@link GPUDeviceManager}. */
    options: GPUDeviceManagerBaseParams;
    /** The {@link PipelineManager} used to cache {@link GPURenderPipeline} and {@link GPUComputePipeline} and set them only when appropriate. */
    pipelineManager: PipelineManager;
    /** Array of {@link Renderer | renderers} using that {@link GPUDeviceManager}. */
    renderers: Renderer[];
    /** A Map containing all our created {@link AllowedBindGroups}. */
    bindGroups: Map<string, AllowedBindGroups>;
    /** An array containing all our created {@link GPUBuffer}. */
    buffers: Map<Buffer['uuid'], Buffer>;
    /** A {@link Map} containing all our created {@link IndirectBuffer}. */
    indirectBuffers: Map<IndirectBuffer['uuid'], IndirectBuffer>;
    /** A Map containing all our created {@link GPUBindGroupLayout} indexed by cache keys. */
    bindGroupLayouts: Map<string, GPUBindGroupLayout>;
    /** A Map containing all our created {@link BufferBinding} indexed by cache keys. */
    bufferBindings: Map<string, BufferBinding>;
    /** An array containing all our created {@link Sampler}. */
    samplers: Sampler[];
    /** An array to keep track of the newly uploaded {@link MediaTexture} and set their {@link core/textures/MediaTexture.MediaTextureSource.sourceUploaded | sourceUploaded} property. */
    texturesQueue: Array<{
        /** Index of the {@link core/textures/MediaTexture.MediaTextureSource | source} in the {@link MediaTexture#sources} array. */
        sourceIndex: number;
        /** {@link MediaTexture} to handle. */
        texture: MediaTexture;
    }>;
    /** Request animation frame callback returned id if used. */
    animationFrameID: null | number;
    /** function assigned to the {@link onBeforeRender} callback. */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the {@link onAfterRender} callback. */
    _onAfterRenderCallback: () => void;
    /** Callback to run if there's any error while trying to set up the {@link GPUAdapter | adapter} or {@link GPUDevice | device} */
    onError: () => void;
    /** Callback to run whenever the {@link device} is lost. */
    onDeviceLost: (info?: GPUDeviceLostInfo) => void;
    /** Callback to run whenever the {@link device} has been intentionally destroyed. */
    onDeviceDestroyed: (info?: GPUDeviceLostInfo) => void;
    /**
     * GPUDeviceManager constructor
     * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}.
     */
    constructor({ label, production, adapterOptions, requiredFeatures, requestAdapterLimits, autoRender, onError, onDeviceLost, onDeviceDestroyed, }?: GPUDeviceManagerParams);
    /**
     * Set our {@link adapter} and {@link device} if possible.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    setAdapterAndDevice({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set. Allow to use already created adapter and device.
     */
    init({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set our {@link GPUDeviceManager.adapter | adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @param adapter - {@link GPUAdapter} to use if set.
     */
    setAdapter(adapter?: GPUAdapter | null): Promise<void>;
    /**
     * Set our {@link GPUDeviceManager.device | device}.
     * @param device - {@link GPUDevice} to use if set.
     */
    setDevice(device?: GPUDevice | null): Promise<void>;
    /**
     * Set our {@link pipelineManager | pipeline manager}.
     */
    setPipelineManager(): void;
    /**
     * Called when the {@link device} is lost.
     * Reset all our renderers.
     */
    loseDevice(): void;
    /**
     * Called when the {@link device} should be restored.
     * Restore all our renderers.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    restoreDevice({ adapter, device }?: GPUDeviceManagerSetupParams): Promise<void>;
    /**
     * Set all objects arrays that we'll keep track of.
     */
    setDeviceObjects(): void;
    /**
     * Add a {@link Renderer} to our {@link renderers} array.
     * @param renderer - {@link Renderer} to add.
     */
    addRenderer(renderer: Renderer): void;
    /**
     * Remove a {@link Renderer} from our {@link renderers} array.
     * @param renderer - {@link Renderer} to remove.
     */
    removeRenderer(renderer: Renderer): void;
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}.
     * @readonly
     */
    get deviceRenderedObjects(): SceneObject[];
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add.
     */
    addBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove.
     */
    removeBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Add a {@link GPUBuffer} to our our {@link buffers} array.
     * @param buffer - {@link Buffer} to add.
     */
    addBuffer(buffer: Buffer): void;
    /**
     * Remove a {@link Buffer} from our {@link buffers} Map.
     * @param buffer - {@link Buffer} to remove.
     */
    removeBuffer(buffer: Buffer): void;
    /**
     * Add a {@link Sampler} to our {@link samplers} array.
     * @param sampler - {@link Sampler} to add.
     */
    addSampler(sampler: Sampler): void;
    /**
     * Remove a {@link Sampler} from our {@link samplers} array.
     * @param sampler - {@link Sampler} to remove.
     */
    removeSampler(sampler: Sampler): void;
    /**
     * Copy an external image to the GPU.
     * @param source - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageSourceInfo.html | GPUCopyExternalImageSourceInfo (WebGPU API reference)} to use.
     * @param destination - {@link https://gpuweb.github.io/types/interfaces/GPUCopyExternalImageDestInfo.html | GPUCopyExternalImageDestInfo (WebGPU API reference)} to use.
     * @param copySize - {@link https://gpuweb.github.io/types/types/GPUExtent3DStrict.html | GPUExtent3DStrict (WebGPU API reference)} to use.
     */
    copyExternalImageToTexture(source: GPUCopyExternalImageSourceInfo, destination: GPUCopyExternalImageDestInfo, copySize: GPUExtent3DStrict): void;
    /**
     * Upload a {@link MediaTexture#texture | texture} to the GPU.
     * @param texture - {@link MediaTexture} containing the {@link GPUTexture} to upload.
     * @param sourceIndex - Index of the source to upload (for cube maps). Default to `0`.
     */
    uploadTexture(texture: MediaTexture, sourceIndex?: number): void;
    /**
     * Mips generation helper on the GPU using our {@link device}. Caches sampler, module and pipeline (by {@link GPUTexture} formats) for faster generation.
     * Ported from https://webgpufundamentals.org/webgpu/lessons/webgpu-importing-textures.html
     * @param texture - {@link Texture} for which to generate the mips.
     * @param commandEncoder - optional {@link GPUCommandEncoder} to use if we're already in the middle of a command encoding process.
     */
    generateMips(texture: Texture, commandEncoder?: GPUCommandEncoder): void;
    /**
     * Create a requestAnimationFrame loop and run it.
     */
    animate(): void;
    /**
     * Called each frame before rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUDeviceManager}.
     */
    onBeforeRender(callback: () => void): GPUDeviceManager;
    /**
     * Called each frame after rendering.
     * @param callback - callback to run at each render.
     * @returns - our {@link GPUDeviceManager}.
     */
    onAfterRender(callback: () => void): GPUDeviceManager;
    /**
     * Render everything:
     * - call all our {@link onBeforeRender} callback.
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks.
     * - create a {@link GPUCommandEncoder}.
     * - render all our {@link renderers}.
     * - submit our {@link GPUCommandBuffer}.
     * - upload {@link MediaTexture#texture | MediaTexture textures} that need it.
     * - empty our {@link texturesQueue} array.
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks.
     * - call all our {@link onAfterRender} callback.
     */
    render(): void;
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}.
     */
    destroy(): void;
}
