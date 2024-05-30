/// <reference types="dist" />
import { PipelineManager } from '../pipelines/PipelineManager';
import { DOMElement, DOMElementBoundingRect, RectBBox, RectSize } from '../DOM/DOMElement';
import { Scene } from '../scenes/Scene';
import { RenderPass, RenderPassParams } from '../renderPasses/RenderPass';
import { ComputePass } from '../computePasses/ComputePass';
import { PingPongPlane } from '../../extras/meshes/PingPongPlane';
import { ShaderPass } from '../renderPasses/ShaderPass';
import { RenderTarget } from '../renderPasses/RenderTarget';
import { DOMTexture } from '../textures/DOMTexture';
import { Sampler } from '../samplers/Sampler';
import { DOMMesh } from '../../curtains/meshes/DOMMesh';
import { Plane } from '../../curtains/meshes/Plane';
import { Mesh } from '../meshes/Mesh';
import { TasksQueueManager } from '../../utils/TasksQueueManager';
import { AllowedBindGroups } from '../../types/BindGroups';
import { Texture } from '../textures/Texture';
import { GPUDeviceManager } from './GPUDeviceManager';
import { FullscreenPlane } from '../meshes/FullscreenPlane';
import { Buffer } from '../buffers/Buffer';
/**
 * Parameters used to create a {@link GPURenderer}
 */
export interface GPURendererParams {
    /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
    deviceManager: GPUDeviceManager;
    /** Optional label of this {@link GPURenderer} */
    label?: string;
    /** {@link HTMLElement} or selector used as a container for our {@link GPURenderer#canvas | canvas}. Could also be directly a {@link HTMLCanvasElement | canvas element}. */
    container: string | HTMLElement;
    /** Pixel ratio to use for rendering */
    pixelRatio?: number;
    /** Whether to auto resize the renderer each time its {@link GPURenderer#domElement} size changes or not. It is advised to set this parameter to `false` if the provided {@link container} is a {@link HTMLCanvasElement | canvas element}, and handle {@link GPURenderer#resize | resizing} by yourself. */
    autoResize?: boolean;
    /** Texture rendering {@link GPUTextureFormat | preferred format} */
    preferredFormat?: GPUTextureFormat;
    /** Set the {@link GPUCanvasContext | context} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
    /** The {@link GPURenderer#renderPass | renderer RenderPass} parameters */
    renderPass?: {
        /** Whether the {@link GPURenderer#renderPass | renderer RenderPass} should handle depth. Default to `true` */
        useDepth: RenderPassParams['useDepth'];
        /** The {@link GPURenderer#renderPass | renderer RenderPass} sample count (i.e. whether it should use multisampled antialiasing). Default to `4` */
        sampleCount: RenderPassParams['sampleCount'];
        /** The {@link GPUColor | color values} to clear to before drawing the {@link GPURenderer#renderPass | renderer RenderPass}. Default to `[0, 0, 0, 0]` */
        clearValue: GPUColor;
    };
}
/** Any Mesh that is bound to a DOM Element */
export type DOMProjectedMesh = DOMMesh | Plane;
/** Any Mesh that is projected (i.e use a {@link core/camera/Camera.Camera | Camera} to compute a model view projection matrix) */
export type ProjectedMesh = Mesh | DOMProjectedMesh;
/** Any Mesh that can be drawn (including fullscreen quad meshes) and that will be put in the {@link Scene} meshes stacks */
export type SceneStackedMesh = ProjectedMesh | FullscreenPlane;
/** Any Mesh that can be drawn, including fullscreen quad meshes used for post processing and {@link PingPongPlane} */
export type RenderedMesh = SceneStackedMesh | PingPongPlane | ShaderPass;
/** Any Mesh or Compute pass */
export type SceneObject = RenderedMesh | ComputePass;
/**
 * Base renderer class, that could technically be used to render compute passes and draw fullscreen quads, even tho it is strongly advised to use at least the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer | GPUCameraRenderer} class instead.
 * A renderer is responsible for:
 * - Setting a {@link GPUCanvasContext | context}
 * - Handling the {@link HTMLCanvasElement | canvas} onto everything is drawn
 * - Creating a {@link RenderPass} that will handle our render and depth textures and the render pass descriptor
 * - Keeping track of every specific class objects created relative to computing and rendering
 * - Creating a {@link Scene} class that will take care of the rendering process of all previously mentioned objects
 */
export declare class GPURenderer {
    /** The type of the {@link GPURenderer} */
    type: string;
    /** The universal unique id of this {@link GPURenderer} */
    readonly uuid: string;
    /** The {@link GPUDeviceManager} used to create this {@link GPURenderer} */
    deviceManager: GPUDeviceManager;
    /** {@link HTMLCanvasElement} onto everything is drawn */
    canvas: HTMLCanvasElement;
    /** The WebGPU {@link GPUCanvasContext | context} used */
    context: null | GPUCanvasContext;
    /** Set the {@link GPUCanvasContext | context} alpha mode */
    alphaMode?: GPUCanvasAlphaMode;
    /** Options used to create this {@link GPURenderer} */
    options: GPURendererParams;
    /** The {@link RenderPass | render pass} used to render our result to screen */
    renderPass: RenderPass;
    /** Additional {@link RenderPass | render pass} used by {@link ShaderPass} for compositing / post processing. Does not handle depth */
    postProcessingPass: RenderPass;
    /** The {@link Scene} used */
    scene: Scene;
    /** Whether we should render our {@link Scene} or not (useful to pause rendering if the renderer is out of view for example). */
    renderScene: boolean;
    /** An array containing all our created {@link ComputePass} */
    computePasses: ComputePass[];
    /** An array containing all our created {@link PingPongPlane} */
    pingPongPlanes: PingPongPlane[];
    /** An array containing all our created {@link ShaderPass} */
    shaderPasses: ShaderPass[];
    /** An array containing all our created {@link RenderTarget} */
    renderTargets: RenderTarget[];
    /** An array containing all our created {@link SceneStackedMesh | meshes} */
    meshes: SceneStackedMesh[];
    /** An array containing all our created {@link Texture} */
    textures: Texture[];
    /** Pixel ratio to use for rendering */
    pixelRatio: number;
    /** An object defining the width, height, top and left position of the canvas. Mainly used internally. If you need to get the renderer dimensions, use {@link boundingRect} instead. */
    rectBBox: RectBBox;
    /** {@link DOMElement} that will track our canvas container size */
    domElement: DOMElement | undefined;
    /** Allow to add callbacks to be executed at each render before the {@link GPUCommandEncoder} is created */
    onBeforeCommandEncoderCreation: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created but before the {@link Scene} is rendered */
    onBeforeRenderScene: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link GPUCommandEncoder} has been created and after the {@link Scene} has been rendered */
    onAfterRenderScene: TasksQueueManager;
    /** Allow to add callbacks to be executed at each render after the {@link Scene} has been rendered and the {@link GPUCommandEncoder} has been submitted */
    onAfterCommandEncoderSubmission: TasksQueueManager;
    /** function assigned to the {@link onBeforeRender} callback */
    _onBeforeRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /** function assigned to the {@link onAfterRender} callback */
    _onAfterRenderCallback: (commandEncoder: GPUCommandEncoder) => void;
    /** function assigned to the {@link onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * GPURenderer constructor
     * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}
     */
    constructor({ deviceManager, label, container, pixelRatio, autoResize, preferredFormat, alphaMode, renderPass, }: GPURendererParams);
    /**
     * Set the renderer {@link RectBBox} and canvas sizes
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    setSize(rectBBox?: Partial<RectBBox> | null): void;
    /**
     * Set the renderer {@link pixelRatio | pixel ratio} and {@link resize} it
     * @param pixelRatio - new pixel ratio to use
     */
    setPixelRatio(pixelRatio?: number): void;
    /**
     * Resize our {@link GPURenderer}
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    resize(rectBBox?: RectBBox | null): void;
    /**
     * Resize all tracked objects
     */
    onResize(): void;
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes(): void;
    /**
     * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}. If there's no {@link domElement | DOM Element} (like when using an offscreen canvas for example), the {@link rectBBox} values are used.
     */
    get boundingRect(): DOMElementBoundingRect;
    /**
     * Clamp to max WebGPU texture dimensions
     * @param dimension - width and height dimensions to clamp
     */
    clampToMaxDimension(dimension: RectSize | DOMElementBoundingRect): void;
    /**
     * Get our {@link GPUDeviceManager#device | device}
     * @readonly
     */
    get device(): GPUDevice | undefined;
    /**
     * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set
     * @readonly
     */
    get ready(): boolean;
    /**
     * Get our {@link GPUDeviceManager#production | GPUDeviceManager production flag}
     * @readonly
     */
    get production(): boolean;
    /**
     * Get all the created {@link GPUDeviceManager#samplers | samplers}
     * @readonly
     */
    get samplers(): Sampler[];
    /**
     * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}
     * @readonly
     */
    get buffers(): Map<string, Buffer>;
    /**
     * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}
     * @readonly
     */
    get pipelineManager(): PipelineManager;
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}
     * @readonly
     */
    get deviceRenderedObjects(): SceneObject[];
    /**
     * Configure our {@link context} with the given options
     */
    configureContext(): void;
    /**
     * Set our {@link context} if possible and set {@link renderPass | main render pass} and {@link scene}
     */
    setContext(): void;
    /**
     * Called when the {@link GPUDeviceManager#device | device} is lost.
     * Force all our scene objects to lose context.
     */
    loseContext(): void;
    /**
     * Called when the {@link GPUDeviceManager#device | device} should be restored.
     * Configure the context again, resize the {@link RenderTarget | render targets} and {@link Texture | textures}, restore our {@link renderedObjects | rendered objects} context.
     * @async
     */
    restoreContext(): void;
    /**
     * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen and our {@link postProcessingPass | postprocessing pass} that will be used for any additional postprocessing render passes.
     */
    setMainRenderPasses(): void;
    /**
     * Set our {@link scene}
     */
    setScene(): void;
    /**
     * Create a {@link GPUBuffer}
     * @param buffer - {@link Buffer} to use for buffer creation
     * @returns - newly created {@link GPUBuffer}
     */
    createBuffer(buffer: Buffer): GPUBuffer;
    /**
     * Remove a {@link Buffer} from our {@link GPUDeviceManager#buffers | buffers Map}
     * @param buffer - {@link Buffer} to remove
     */
    removeBuffer(buffer: Buffer): void;
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - {@link GPUSize64 | buffer offset}
     * @param data - {@link BufferSource | data} to write
     */
    queueWriteBuffer(buffer: GPUBuffer, bufferOffset: GPUSize64, data: BufferSource): void;
    /**
     * Copy a source {@link Buffer#GPUBuffer | Buffer GPUBuffer} into a destination {@link Buffer#GPUBuffer | Buffer GPUBuffer}
     * @param parameters - parameters used to realize the copy
     * @param parameters.srcBuffer - source {@link Buffer}
     * @param [parameters.dstBuffer] - destination {@link Buffer}. Will create a new one if none provided.
     * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
     * @returns - destination {@link Buffer} after copy
     */
    copyBufferToBuffer({ srcBuffer, dstBuffer, commandEncoder, }: {
        srcBuffer: Buffer;
        dstBuffer?: Buffer;
        commandEncoder?: GPUCommandEncoder;
    }): Buffer | null;
    /**
     * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get bindGroups(): Map<string, AllowedBindGroups>;
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add
     */
    addBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
     */
    removeBindGroup(bindGroup: AllowedBindGroups): void;
    /**
     * Create a {@link GPUBindGroupLayout}
     * @param bindGroupLayoutDescriptor - {@link GPUBindGroupLayoutDescriptor | GPU bind group layout descriptor}
     * @returns - newly created {@link GPUBindGroupLayout}
     */
    createBindGroupLayout(bindGroupLayoutDescriptor: GPUBindGroupLayoutDescriptor): GPUBindGroupLayout;
    /**
     * Create a {@link GPUBindGroup}
     * @param bindGroupDescriptor - {@link GPUBindGroupDescriptor | GPU bind group descriptor}
     * @returns - newly created {@link GPUBindGroup}
     */
    createBindGroup(bindGroupDescriptor: GPUBindGroupDescriptor): GPUBindGroup;
    /**
     * Create a {@link GPUShaderModule}
     * @param shaderModuleDescriptor - {@link shaderModuleDescriptor | shader module descriptor}
     * @returns - newly created {@link GPUShaderModule}
     */
    createShaderModule(shaderModuleDescriptor: GPUShaderModuleDescriptor): GPUShaderModule;
    /**
     * Create a {@link GPUPipelineLayout}
     * @param pipelineLayoutDescriptor - {@link GPUPipelineLayoutDescriptor | GPU pipeline layout descriptor}
     * @returns - newly created {@link GPUPipelineLayout}
     */
    createPipelineLayout(pipelineLayoutDescriptor: GPUPipelineLayoutDescriptor): GPUPipelineLayout;
    /**
     * Create a {@link GPURenderPipeline}
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipeline(pipelineDescriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
    /**
     * Asynchronously create a {@link GPURenderPipeline}
     * @async
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipelineAsync(pipelineDescriptor: GPURenderPipelineDescriptor): Promise<GPURenderPipeline>;
    /**
     * Create a {@link GPUComputePipeline}
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipeline(pipelineDescriptor: GPUComputePipelineDescriptor): GPUComputePipeline;
    /**
     * Asynchronously create a {@link GPUComputePipeline}
     * @async
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipelineAsync(pipelineDescriptor: GPUComputePipelineDescriptor): Promise<GPUComputePipeline>;
    /**
     * Get all created {@link DOMTexture} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get domTextures(): DOMTexture[];
    /**
     * Add a {@link DOMTexture} to our {@link GPUDeviceManager#domTextures | textures array}
     * @param texture - {@link DOMTexture} to add
     */
    addDOMTexture(texture: DOMTexture): void;
    /**
     * Remove a {@link DOMTexture} from our {@link GPUDeviceManager#domTextures | textures array}
     * @param texture - {@link DOMTexture} to remove
     */
    removeDOMTexture(texture: DOMTexture): void;
    /**
     * Add a {@link Texture} to our {@link textures} array
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture): void;
    /**
     * Remove a {@link Texture} from our {@link textures} array
     * @param texture - {@link Texture} to remove
     */
    removeTexture(texture: Texture): void;
    /**
     * Create a {@link GPUTexture}
     * @param textureDescriptor - {@link GPUTextureDescriptor | GPU texture descriptor}
     * @returns - newly created {@link GPUTexture}
     */
    createTexture(textureDescriptor: GPUTextureDescriptor): GPUTexture;
    /**
     * Upload a {@linkDOMTexture#texture | texture} to the GPU
     * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
     */
    uploadTexture(texture: DOMTexture): void;
    /**
     * Import a {@link GPUExternalTexture}
     * @param video - {@link HTMLVideoElement} source
     * @returns - {@link GPUExternalTexture}
     */
    importExternalTexture(video: HTMLVideoElement): GPUExternalTexture;
    /**
     * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
     * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
     * @param sampler - {@link Sampler} to create
     * @returns - the {@link GPUSampler}
     */
    createSampler(sampler: Sampler): GPUSampler;
    /**
     * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}
     * @param sampler - {@link Sampler} to remove
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
     * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
     * @readonly
     */
    get renderedObjects(): SceneObject[];
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
     * Useful (but slow) to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup: AllowedBindGroups): undefined | SceneObject[];
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link DOMTexture} or {@link Texture}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param texture - {@link DOMTexture} or {@link Texture} to check
     */
    getObjectsByTexture(texture: DOMTexture | Texture): undefined | SceneObject[];
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before the {@link render} method will be executed
     * @returns - our {@link GPURenderer}
     */
    onBeforeRender(callback: (commandEncoder?: GPUCommandEncoder) => void): this;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after the {@link render} method has been executed
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
     * Render a single {@link ComputePass}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param computePass - {@link ComputePass}
     */
    renderSingleComputePass(commandEncoder: GPUCommandEncoder, computePass: ComputePass): void;
    /**
     * Render a single {@link RenderedMesh | Mesh}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - {@link RenderedMesh | Mesh} to render
     */
    renderSingleMesh(commandEncoder: GPUCommandEncoder, mesh: RenderedMesh): void;
    /**
     * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}
     * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render
     */
    renderOnce(objects: SceneObject[]): void;
    /**
     * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
     * @param commandEncoder
     */
    forceClear(commandEncoder?: GPUCommandEncoder): void;
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created
     */
    onBeforeCommandEncoder(): void;
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
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
