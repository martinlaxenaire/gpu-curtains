/// <reference types="dist" />
import { PipelineManager } from '../pipelines/PipelineManager';
import { DOMElement, DOMElementBoundingRect } from '../DOM/DOMElement';
import { Scene } from '../scenes/Scene';
import { RenderPass } from '../renderPasses/RenderPass';
import { ComputePass } from '../computePasses/ComputePass';
import { PingPongPlane } from '../../curtains/meshes/PingPongPlane';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { Texture } from '../textures/Texture';
import { Sampler } from '../samplers/Sampler';
import { DOMMesh } from '../../curtains/meshes/DOMMesh';
import { Plane } from '../../curtains/meshes/Plane';
import { Mesh } from '../meshes/Mesh';
import { TasksQueueManager } from '../../utils/TasksQueueManager';
import { AllowedBindGroups } from '../../types/BindGroups';
import { RenderTexture } from '../textures/RenderTexture';
/**
 * Parameters used to create a {@link GPURenderer}
 */
export interface GPURendererParams {
    /** [HTML Element]{@link HTMLElement} or selector used as a container for our [canvas]{@link GPURenderer#canvas} */
    container: string | HTMLElement;
    /** Pixel ratio to use for rendering */
    pixelRatio?: number;
    /** Whether to use multisampling, and if so its value */
    sampleCount?: GPUSize32;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production?: boolean;
    /** Texture rendering [preferred format]{@link GPUTextureFormat} */
    preferredFormat?: GPUTextureFormat;
    /** Set the [context]{@link GPUCanvasContext} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
    /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
    onError?: () => void;
    /** Callback to run whenever the [renderer device]{@link GPURenderer#device} context is lost */
    onContextLost?: (info?: GPUDeviceLostInfo) => void;
}
export type DOMMeshType = DOMMesh | Plane;
export type MeshType = Mesh | DOMMeshType;
/**
 * GPURenderer class:
 * Base renderer class, that could possibly used to render compute passes and draw meshes, even tho it is strongly advised to use the {@link GPUCurtainsRenderer} class instead.
 * A renderer is responsible for:
 * - Everything related to the WebGPU [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} and [context]{@link GPUCanvasContext}
 * - Handling the [canvas]{@link HTMLCanvasElement} onto everything is drawn
 * - Keeping track of every specific class objects created relative to computing and rendering
 * - Creating a {@link Scene} class that will take care of the rendering process of all previously mentioned objects
 * - Handling the {@link PipelineManager}
 */
export declare class GPURenderer {
    /** The type of the {@link GPURenderer} */
    type: string;
    /** Flag indicating whether the {@link GPURenderer} is ready, i.e. its [adapter]{@link GPURenderer#adapter} and [device]{@link GPURenderer#device} have been successfully created */
    ready: boolean;
    /** navigator {@link GPU} object */
    gpu: null | GPU;
    /** [canvas]{@link HTMLCanvasElement} onto everything is drawn */
    canvas: HTMLCanvasElement;
    /** The WebGPU [context]{@link GPUCanvasContext} used */
    context: null | GPUCanvasContext;
    /** Texture rendering [preferred format]{@link GPUTextureFormat} */
    preferredFormat: null | GPUTextureFormat;
    /** Set the [context]{@link GPUCanvasContext} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
    /** The WebGPU [adapter]{@link GPUAdapter} used */
    adapter: GPUAdapter | void;
    /** The WebGPU [adapter]{@link GPUAdapter} informations */
    adapterInfos: GPUAdapterInfo | undefined;
    /** The WebGPU [device]{@link GPUDevice} used */
    device: GPUDevice | null;
    /** The number of WebGPU [devices]{@link GPUDevice} created */
    devicesCount: number;
    /** Callback to run if there's any error while trying to set up the [adapter]{@link GPUAdapter}, [device]{@link GPUDevice} or [context]{@link GPUCanvasContext} */
    onError: () => void;
    /** Callback to run whenever the [renderer device]{@link GPURenderer#device} context is lost */
    onContextLost: (info?: GPUDeviceLostInfo) => void;
    /** The final [render pass]{@link RenderPass} to render our result to screen */
    renderPass: RenderPass;
    /** The {@link PipelineManager} used */
    pipelineManager: PipelineManager;
    /** The {@link Scene} used */
    scene: Scene;
    /** An array containing all our created {@link GPUBuffer} */
    buffers: GPUBuffer[];
    /** An array containing all our created {@link ComputePass} */
    computePasses: ComputePass[];
    /** An array containing all our created {@link PingPongPlane} */
    pingPongPlanes: PingPongPlane[];
    /** An array containing all our created {@link ShaderPass} */
    shaderPasses: ShaderPass[];
    /** An array containing all our created {@link RenderTarget} */
    renderTargets: RenderTarget[];
    /** An array containing all our created [Meshes]{@link MeshType} */
    meshes: MeshType[];
    /** An array containing all our created {@link Sampler} */
    samplers: Sampler[];
    /** An array containing all our created {@link Texture} */
    textures: Texture[];
    /** An array to keep track of the newly uploaded [textures]{@link Texture} and set their [sourceUploaded]{@link Texture#sourceUploaded} property */
    texturesQueue: Texture[];
    /** Whether to use multisampling, and if so its value */
    sampleCount: GPUSize32;
    /** Pixel ratio to use for rendering */
    pixelRatio: number;
    /** Flag indicating whether we're running the production mode or not. If not, useful warnings could be logged to the console */
    production: boolean;
    /** [DOM Element]{@link DOMElement} that will contain our canvas */
    domElement: DOMElement;
    /** Document [body]{@link HTMLBodyElement} [DOM Element]{@link DOMElement} used to trigger resize when the document body size changes */
    documentBody: DOMElement;
    onBeforeCommandEncoderCreation: TasksQueueManager;
    onBeforeRenderScene: TasksQueueManager;
    onAfterRenderScene: TasksQueueManager;
    onAfterCommandEncoderSubmission: TasksQueueManager;
    /** function assigned to the [onBeforeRender]{@link GPURenderer#onBeforeRender} callback */
    _onBeforeRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /** function assigned to the [onAfterRender]{@link GPURenderer#onAfterRender} callback */
    _onAfterRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /**
     * GPURenderer constructor
     * @param parameters - [parameters]{@link GPURendererParams} used to create this {@link GPURenderer}
     */
    constructor({ container, pixelRatio, sampleCount, production, preferredFormat, alphaMode, onError, onContextLost, }: GPURendererParams);
    /**
     * Set [canvas]{@link GPURenderer#canvas} size
     * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    setSize(boundingRect: DOMElementBoundingRect): void;
    /**
     * Resize our {@link GPURenderer}
     * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    resize(boundingRect?: DOMElementBoundingRect | null): void;
    /**
     * Resize all tracked objects
     */
    onResize(): void;
    /**
     * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect} accounting for current [pixel ratio]{@link GPURenderer#pixelRatio}
     */
    get pixelRatioBoundingRect(): DOMElementBoundingRect;
    /**
     * Set our [context]{@link GPURenderer#context} if possible and set [main render pass]{@link GPURenderer#renderPass}, [pipeline manager]{@link GPURenderer#pipelineManager} and [scene]{@link GPURenderer#scene}
     * @returns - void promise result
     */
    setContext(): Promise<void>;
    /**
     * Set our [adapter]{@link GPURenderer#adapter} if possible
     * @returns - void promise result
     */
    setAdapter(): Promise<void>;
    /**
     * Set our [device]{@link GPURenderer#device} and configure [context]{@link GPURenderer#context} if possible
     * @returns - void promise result
     */
    setDevice(): Promise<void>;
    loseContext(): void;
    restoreContext(): Promise<void>;
    /**
     * Set our [main render pass]{@link GPURenderer#renderPass} that will be used to render the result of our draw commands back to the screen
     */
    setMainRenderPass(): void;
    /**
     * Set our [pipeline manager]{@link GPURenderer#pipelineManager}
     */
    setPipelineManager(): void;
    /**
     * Set our [scene]{@link GPURenderer#scene}
     */
    setScene(): void;
    /**
     * Create a {@link GPUBuffer}
     * @param bufferDescriptor - [buffer descriptor]{@link GPUBufferDescriptor}
     * @returns - newly created {@link GPUBuffer}
     */
    createBuffer(bufferDescriptor: GPUBufferDescriptor): GPUBuffer;
    /**
     * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPURenderer#buffers}
     * @param buffer - [buffer]{@link GPUBuffer} to remove
     */
    removeBuffer(buffer: GPUBuffer): void;
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - [buffer offset]{@link GPUSize64}
     * @param data - [data]{@link BufferSource} to write
     */
    queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource): void;
    /**
     * Create a {@link GPUBindGroupLayout}
     * @param bindGroupLayoutDescriptor - [bind group layout descriptor]{@link GPUBindGroupLayoutDescriptor}
     * @returns - newly created {@link GPUBindGroupLayout}
     */
    createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    /**
     * Create a {@link GPUBindGroup}
     * @param bindGroupDescriptor - [bind group descriptor]{@link GPUBindGroupDescriptor}
     * @returns - newly created {@link GPUBindGroup}
     */
    createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup;
    /**
     * Create a {@link GPUShaderModule}
     * @param shaderModuleDescriptor - [shader module descriptor]{@link shaderModuleDescriptor}
     * @returns - newly created {@link GPUShaderModule}
     */
    createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    /**
     * Create a {@link GPUPipelineLayout}
     * @param pipelineLayoutDescriptor - [pipeline layout descriptor]{@link GPUPipelineLayoutDescriptor}
     * @returns - newly created {@link GPUPipelineLayout}
     */
    createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    /**
     * Create a {@link GPURenderPipeline}
     * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    /**
     * Asynchronously create a {@link GPURenderPipeline}
     * @async
     * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipelineAsync(pipelineDescriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
    /**
     * Create a {@link GPUComputePipeline}
     * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    /**
     * Asynchronously create a {@link GPUComputePipeline}
     * @async
     * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipelineAsync(pipelineDescriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
    /**
     * Add a [texture]{@link Texture} to our [textures array]{@link GPURenderer#textures}
     * @param texture - [texture]{@link Texture} to add
     */
    addTexture(texture: Texture): void;
    /**
     * Remove a [texture]{@link Texture} from our [textures array]{@link GPURenderer#textures}
     * @param texture - [texture]{@link Texture} to remove
     */
    removeTexture(texture: Texture): void;
    /**
     * Call texture [createTexture]{@link Texture#createTexture} method
     * @param texture - [texture]{@link Texture} to create
     */
    setTexture(texture: Texture): void;
    /**
     * Create a {@link GPUTexture}
     * @param textureDescriptor - [texture descriptor]{@link GPUTextureDescriptor}
     * @returns - newly created {@link GPUTexture}
     */
    createTexture(textureDescriptor: GPUTextureDescriptor): GPUTexture;
    /**
     * Upload a [texture]{@link Texture} to the GPU
     * @param texture - [texture]{@link Texture} to upload
     */
    uploadTexture(texture: Texture): void;
    /**
     * Import an [external texture]{@link GPUExternalTexture}
     * @param video - [video]{@link HTMLVideoElement} source
     * @returns - [external texture]{@link GPUExternalTexture}
     */
    importExternalTexture(video: HTMLVideoElement): GPUExternalTexture;
    /**
     * Check if a {@link Sampler} has already been created with the same [parameters]{@link Sampler#options}.
     * Use it if found, else create a new one and add it to the [samplers array]{@link GPURenderer#samplers}.
     * @param sampler - {@link Sampler} to create
     * @returns - the {@link GPUSampler}
     */
    createSampler(sampler: Sampler): GPUSampler;
    setTasksQueues(): void;
    /**
     * Set all objects arrays that we'll keep track of
     */
    setRendererObjects(): void;
    /**
     * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [bind group]{@link AllowedBindGroups}
     * @param bindGroup - [bind group]{@link AllowedBindGroups} to check
     */
    getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | Array<MeshType | ComputePass>;
    /**
     * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [texture]{@link Texture} or [render texture]{@link RenderTexture}
     * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to check
     */
    getObjectsByTexture(texture: Texture | RenderTexture): undefined | Array<MeshType | ComputePass>;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before the [renderer render method]{@link GPURenderer#render} will be executed
     * @returns - our {@link GPURenderer}
     */
    onBeforeRender(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after the [renderer render method]{@link GPURenderer#render} has been executed
     * @returns - our {@link GPURenderer}
     */
    onAfterRender(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    /**
     * Set the current [render pass descriptor]{@link RenderPass#descriptor} texture [view]{@link GPURenderPassColorAttachment#view} or [resolveTarget]{@link GPURenderPassColorAttachment#resolveTarget} (depending on whether we're using multisampling)
     * @param renderPass - current [render pass]{@link RenderPass}
     * @param renderTexture - [render texture]{@link GPUTexture} to use, or the [context]{@link GPURenderer#context} [current texture]{@link GPUTexture} if null
     * @returns - the [current render texture]{@link GPUTexture}
     */
    setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture?: GPUTexture | null): GPUTexture;
    /**
     * Function to run just before our [command encoder]{@link GPUCommandEncoder} is created at each [render]{@link GPURenderer#render} call
     */
    onBeforeCommandEncoder(): void;
    /**
     * Function to run just after our [command encoder]{@link GPUCommandEncoder} has been submitted at each [render]{@link GPURenderer#render} call
     */
    onAfterCommandEncoder(): void;
    /**
     * Render a single [Compute pass]{@link ComputePass}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param computePass - [Compute pass]{@link ComputePass}
     */
    renderSingleComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass): void;
    /**
     * Render a single [Mesh]{@link MeshType}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - [Mesh]{@link MeshType} to render
     */
    renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: MeshType): void;
    /**
     * Render an array of objects (either [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) once. This method won't call any of the renderer render hooks like [onBeforeRender]{@link GPURenderer#onBeforeRender}, [onAfterRender]{@link GPURenderer#onAfterRender}
     * @param objects - Array of [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass} to render
     */
    renderOnce(objects: Array<MeshType | ComputePass>): void;
    /**
     * Render our [scene]{@link Scene}
     */
    renderScene(): void;
    /**
     * Called at each draw call to create a [command encoder]{@link GPUCommandEncoder}, render our scene and its content and handle our [textures queue]{@link GPURenderer#texturesQueue}
     */
    render(): void;
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
     */
    destroy(): void;
}
