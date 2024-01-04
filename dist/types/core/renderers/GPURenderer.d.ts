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
import { GPUDeviceManager } from './GPUDeviceManager';
import { FullscreenPlane } from '../meshes/FullscreenPlane';
/**
 * Parameters used to create a {@link GPURenderer}
 */
export interface GPURendererParams {
    /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
    deviceManager: GPUDeviceManager;
    /** [HTML Element]{@link HTMLElement} or selector used as a container for our [canvas]{@link GPURenderer#canvas} */
    container: string | HTMLElement;
    /** Pixel ratio to use for rendering */
    pixelRatio?: number;
    /** Whether to use multisampling, and if so its value */
    sampleCount?: GPUSize32;
    /** Texture rendering [preferred format]{@link GPUTextureFormat} */
    preferredFormat?: GPUTextureFormat;
    /** Set the [context]{@link GPUCanvasContext} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
}
export type DOMProjectedMesh = DOMMesh | Plane;
export type ProjectedMesh = Mesh | DOMProjectedMesh;
export type RenderedMesh = ProjectedMesh | PingPongPlane | ShaderPass | FullscreenPlane;
export type SceneObject = RenderedMesh | ComputePass;
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
    /** The universal unique id of this {@link GPURenderer} */
    readonly uuid: string;
    /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
    deviceManager: GPUDeviceManager;
    /** [canvas]{@link HTMLCanvasElement} onto everything is drawn */
    canvas: HTMLCanvasElement;
    /** The WebGPU [context]{@link GPUCanvasContext} used */
    context: null | GPUCanvasContext;
    /** Texture rendering [preferred format]{@link GPUTextureFormat} */
    preferredFormat: null | GPUTextureFormat;
    /** Set the [context]{@link GPUCanvasContext} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
    /** The final [render pass]{@link RenderPass} to render our result to screen */
    renderPass: RenderPass;
    /** The {@link Scene} used */
    scene: Scene;
    /** An array containing all our created {@link ComputePass} */
    computePasses: ComputePass[];
    /** An array containing all our created {@link PingPongPlane} */
    pingPongPlanes: PingPongPlane[];
    /** An array containing all our created {@link ShaderPass} */
    shaderPasses: ShaderPass[];
    /** An array containing all our created {@link RenderTarget} */
    renderTargets: RenderTarget[];
    /** An array containing all our created [Meshes]{@link ProjectedMesh} */
    meshes: ProjectedMesh[];
    /** An array containing all our created {@link RenderTexture} */
    renderTextures: RenderTexture[];
    /** Whether to use multisampling, and if so its value */
    sampleCount: GPUSize32;
    /** Pixel ratio to use for rendering */
    pixelRatio: number;
    /** [DOM Element]{@link DOMElement} that will contain our canvas */
    domElement: DOMElement;
    /** Allow to add callbacks to be executed at each render before the {@link GPUCommandEncoder} is created */
    onBeforeCommandEncoderCreation: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created but before the {@link Scene} is rendered */
    onBeforeRenderScene: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created and after the {@link Scene} has been rendered */
    onAfterRenderScene: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link Scene} has been rendered and the {@link GPUCommandEncoder} has been submitted */
    onAfterCommandEncoderSubmission: TasksQueueManager;
    /** function assigned to the [onBeforeRender]{@link GPURenderer#onBeforeRender} callback */
    _onBeforeRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /** function assigned to the [onAfterRender]{@link GPURenderer#onAfterRender} callback */
    _onAfterRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /** function assigned to the [onAfterResize]{@link GPURenderer#onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * GPURenderer constructor
     * @param parameters - [parameters]{@link GPURendererParams} used to create this {@link GPURenderer}
     */
    constructor({ deviceManager, container, pixelRatio, sampleCount, preferredFormat, alphaMode, }: GPURendererParams);
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
     * Get our [device]{@link GPUDeviceManager#device}
     * @readonly
     */
    get device(): GPUDevice | undefined;
    /**
     * Get whether our {@link GPUDeviceManager} is ready (i.e. its [adapter]{@link GPUDeviceManager#adapter} and [device]{@link GPUDeviceManager#device} are set) and its size is set
     * @readonly
     */
    get ready(): boolean;
    /**
     * Get our [device manager production flag]{@link GPUDeviceManager#production}
     * @readonly
     */
    get production(): boolean;
    /**
     * Get all the created [samplers]{@link GPUDeviceManager#samplers}
     * @readonly
     */
    get samplers(): Sampler[];
    /**
     * Get all the created [buffers]{@link GPUDeviceManager#buffers}
     * @readonly
     */
    get buffers(): GPUBuffer[];
    /**
     * Get the [pipeline manager]{@link GPUDeviceManager#pipelineManager}
     * @readonly
     */
    get pipelineManager(): PipelineManager;
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the [device manager]{@link GPUDeviceManager}
     * @readonly
     */
    get deviceRenderedObjects(): SceneObject[];
    /**
     * Configure our [context]{@link context} with the given options
     */
    configureContext(): void;
    /**
     * Set our [context]{@link GPURenderer#context} if possible and set [main render pass]{@link GPURenderer#renderPass} and [scene]{@link GPURenderer#scene}
     */
    setContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} is lost.
     * Force all our scene objects to lose context.
     */
    loseContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} should be restored.
     * Reset the adapter, device and configure context again, restore our scene objects context, resize the render textures.
     * @async
     */
    restoreContext(): void;
    /**
     * Set our [main render pass]{@link GPURenderer#renderPass} that will be used to render the result of our draw commands back to the screen
     */
    setMainRenderPass(): void;
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
     * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPUDeviceManager#buffers}
     * @param buffer - [buffer]{@link GPUBuffer} to remove
     * @param [originalLabel] - original [buffer]{@link GPUBuffer} label in case it has been swapped
     */
    removeBuffer(buffer: GPUBuffer, originalLabel?: string): void;
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - [buffer offset]{@link GPUSize64}
     * @param data - [data]{@link BufferSource} to write
     */
    queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource): void;
    /**
     * Copy a source {@link GPUBuffer} into a destination {@link GPUBuffer}
     * @param parameters - parameters used to realize the copy
     * @param parameters.srcBuffer - source {@link GPUBuffer}
     * @param [parameters.dstBuffer] - destination {@link GPUBuffer}. Will create a new one if none provided.
     * @param [parameters.commandEncoder] - [command encoder]{@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
     * @returns - destination {@link GPUBuffer} after copy
     */
    copyBufferToBuffer({ srcBuffer, dstBuffer, commandEncoder, }: {
        srcBuffer: GPUBuffer;
        dstBuffer?: GPUBuffer;
        commandEncoder?: GPUCommandEncoder;
    }): GPUBuffer | null;
    /**
     * Get all created [bind groups]{@link AllowedBindGroups} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get bindGroups(): AllowedBindGroups[];
    /**
     * Add a [bind group]{@link AllowedBindGroups} to our [bind groups array]{@link GPUDeviceManager#bindGroups}
     * @param bindGroup - [bind group]{@link AllowedBindGroups} to add
     */
    addBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Remove a [bind group]{@link AllowedBindGroups} from our [bind groups array]{@link GPUDeviceManager#bindGroups}
     * @param bindGroup - [bind group]{@link AllowedBindGroups} to remove
     */
    removeBindGroup(bindGroup: AllowedBindGroups): void;
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
     * Get all created [textures]{@link Texture} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Add a [texture]{@link Texture} to our [textures array]{@link GPUDeviceManager#textures}
     * @param texture - [texture]{@link Texture} to add
     */
    addTexture(texture: Texture): void;
    /**
     * Remove a [texture]{@link Texture} from our [textures array]{@link GPUDeviceManager#textures}
     * @param texture - [texture]{@link Texture} to remove
     */
    removeTexture(texture: Texture): void;
    /**
     * Add a [render texture]{@link RenderTexture} to our [render textures array]{@link GPURenderer#renderTextures}
     * @param texture - [render texture]{@link RenderTexture} to add
     */
    addRenderTexture(texture: RenderTexture): void;
    /**
     * Remove a [render texture]{@link RenderTexture} from our [render textures array]{@link GPURenderer#renderTextures}
     * @param texture - [render texture]{@link RenderTexture} to remove
     */
    removeRenderTexture(texture: RenderTexture): void;
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
     * Use it if found, else create a new one and add it to the [device manager samplers array]{@link GPUDeviceManager#samplers}.
     * @param sampler - {@link Sampler} to create
     * @returns - the {@link GPUSampler}
     */
    createSampler(sampler: Sampler): GPUSampler;
    /**
     * Remove a [sampler]{@link Sampler} from our [samplers array]{@link GPUDeviceManager#samplers}
     * @param sampler - [sampler]{@link Sampler} to remove
     */
    removeSampler(sampler: Sampler): void;
    /**
     * Set different tasks queue managers to execute callbacks at different phases of our render call:
     * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder
     * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}
     * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}
     * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder
     */
    setTasksQueues(): void;
    /**
     * Set all objects arrays that we'll keep track of
     */
    setRendererObjects(): void;
    /**
     * Get all this [renderer]{@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
     * @readonly
     */
    get renderedObjects(): SceneObject[];
    /**
     * Get all objects ([Meshes]{@link ProjectedMesh} or [Compute passes]{@link ComputePass}) using a given [bind group]{@link AllowedBindGroups}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - [bind group]{@link AllowedBindGroups} to check
     */
    getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[];
    /**
     * Get all objects ([Meshes]{@link ProjectedMesh} or [Compute passes]{@link ComputePass}) using a given [texture]{@link Texture} or [render texture]{@link RenderTexture}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to check
     */
    getObjectsByTexture(texture: Texture | RenderTexture): undefined | SceneObject[];
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
     * Assign a callback function to _onAfterResizeCallback
     * @param callback - callback to run just after the {@link GPURenderer} has been resized
     * @returns - our {@link GPURenderer}
     */
    onAfterResize(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    /**
     * Set the current [render pass descriptor]{@link RenderPass#descriptor} texture [view]{@link GPURenderPassColorAttachment#view} or [resolveTarget]{@link GPURenderPassColorAttachment#resolveTarget} (depending on whether we're using multisampling)
     * @param renderPass - current [render pass]{@link RenderPass}
     * @param renderTexture - [render texture]{@link GPUTexture} to use, or the [context]{@link GPURenderer#context} [current texture]{@link GPUTexture} if null
     * @returns - the [current render texture]{@link GPUTexture}
     */
    setRenderPassCurrentTexture(renderPass: RenderPass, renderTexture?: GPUTexture | null): GPUTexture;
    /**
     * Render a single [Compute pass]{@link ComputePass}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param computePass - [Compute pass]{@link ComputePass}
     */
    renderSingleComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass): void;
    /**
     * Render a single [Mesh]{@link ProjectedMesh}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - [Mesh]{@link ProjectedMesh} to render
     */
    renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: RenderedMesh): void;
    /**
     * Render an array of objects (either [Meshes]{@link ProjectedMesh} or [Compute passes]{@link ComputePass}) once. This method won't call any of the renderer render hooks like [onBeforeRender]{@link GPURenderer#onBeforeRender}, [onAfterRender]{@link GPURenderer#onAfterRender}
     * @param objects - Array of [Meshes]{@link ProjectedMesh} or [Compute passes]{@link ComputePass} to render
     */
    renderOnce(objects: SceneObject[]): void;
    /**
     * Force to clear a {@link GPURenderer} content to its [clear value]{@link RenderPass#options.clearValue} by rendering and empty pass.
     * @param commandEncoder
     */
    forceClear(commandEncoder?: GPUCommandEncoder): void;
    /**
     * Called by the [GPUDeviceManager render method]{@link GPUDeviceManager#render} before the {@link GPUCommandEncoder} has been created
     */
    onBeforeCommandEncoder(): void;
    /**
     * Called by the [GPUDeviceManager render method]{@link GPUDeviceManager#render} after the {@link GPUCommandEncoder} has been created.
     * Used to handle our [textures queue]{@link GPUDeviceManager#texturesQueue}
     */
    onAfterCommandEncoder(): void;
    /**
     * Called at each draw call to render our scene and its content
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder: GPUCommandEncoder): void;
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
     */
    destroy(): void;
}
