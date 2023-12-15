/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { ComputeMaterial } from '../materials/ComputeMaterial';
import { ComputeMaterialParams, MaterialParams, MaterialShaders } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderTexture, RenderTextureParams } from '../textures/RenderTexture';
import { Texture } from '../textures/Texture';
import { ExternalTextureParams, TextureParams } from '../../types/Textures';
/** Defines {@link ComputePass} options */
export interface ComputePassOptions {
    /** The label of the {@link ComputePass} */
    label: string;
    /** Controls the order in which this {@link ComputePass} should be rendered by our {@link Scene} */
    renderOrder?: number;
    /** Whether the {@link ComputePass} should be added to our {@link Scene} to let it handle the rendering process automatically */
    autoRender?: boolean;
    /** Compute shader passed to the {@link ComputePass} following the [shader object]{@link ShaderOptions} notation */
    shaders: MaterialShaders;
    /** whether the [compute pipeline]{@link ComputePipelineEntry#pipeline} should be compiled asynchronously */
    useAsyncPipeline?: boolean;
    /** Parameters used by this {@link ComputePass} to create a [texture]{@link Texture} */
    texturesOptions?: ExternalTextureParams;
    /** Main/first {@link ComputeMaterial} work group dispatch size to use with this {@link ComputePass} */
    dispatchSize?: number | number[];
}
/**
 * An object defining all possible {@link ComputePass} class instancing parameters
 */
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {
}
/**
 * ComputePass class:
 * Used to create a compute pass, i.e. run computations on the GPU.
 * A compute pass is basically made of a {@link ComputeMaterial} that handles most of the process.
 */
export declare class ComputePass {
    #private;
    /** The type of the {@link ComputePass} */
    type: string;
    /** The universal unique id of the {@link ComputePass} */
    uuid: string;
    /** The index of the {@link ComputePass}, incremented each time a new one is instanced */
    index: number;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Controls the order in which this {@link ComputePass} should be rendered by our {@link Scene} */
    renderOrder: number;
    /** Options used to create this {@link ComputePass} */
    options: ComputePassOptions;
    /** {@link ComputeMaterial} used by this {@link ComputePass} */
    material: ComputeMaterial;
    /** Flag indicating whether this {@link ComputePass} is ready to be rendered */
    _ready: boolean;
    /** Empty object to store any additional data or custom properties into your {@link ComputePass} */
    userData: Record<string, unknown>;
    /** function assigned to the [onReady]{@link ComputePass#onReady} callback */
    _onReadyCallback: () => void;
    /** function assigned to the [onBeforeRender]{@link ComputePass#onBeforeRender} callback */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the [onRender]{@link ComputePass#onRender} callback */
    _onRenderCallback: () => void;
    /** function assigned to the [onAfterRender]{@link ComputePass#onAfterRender} callback */
    _onAfterRenderCallback: () => void;
    /** function assigned to the [onAfterResize]{@link ComputePass#onAfterResize} callback */
    _onAfterResizeCallback: () => void;
    /**
     * ComputePass constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - [parameters]{@link ComputePassParams} used to create our {@link ComputePass}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: ComputePassParams);
    /**
     * Get or set whether the compute pass is ready to render (the material has been successfully compiled)
     * @readonly
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Add our compute pass to the scene and the renderer
     */
    addToScene(): void;
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene(): void;
    /**
     * Create the compute pass material
     * @param computeParameters - {@link ComputeMaterial} parameters
     */
    setComputeMaterial(computeParameters: ComputeMaterialParams): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
     */
    loseContext(): void;
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been restored
     */
    restoreContext(): void;
    /**
     * Get our [compute material textures array]{@link ComputeMaterial#textures}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Get our [compute material render textures array]{@link ComputeMaterial#renderTextures}
     * @readonly
     */
    get renderTextures(): RenderTexture[];
    /**
     * Create a new {@link Texture}
     * @param options - [Texture options]{@link TextureParams}
     * @returns - newly created {@link Texture}
     */
    createTexture(options: TextureParams): Texture;
    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture: Texture): void;
    /**
     * Create a new {@link RenderTexture}
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options: RenderTextureParams): RenderTexture;
    /**
     * Add a {@link RenderTexture}
     * @param renderTexture - {@link RenderTexture} to add
     */
    addRenderTexture(renderTexture: RenderTexture): void;
    /**
     * Get our [compute material uniforms]{@link ComputeMaterial#uniforms}
     * @readonly
     */
    get uniforms(): ComputeMaterial['uniforms'];
    /**
     * Get our [compute material storages]{@link ComputeMaterial#storages}
     * @readonly
     */
    get storages(): ComputeMaterial['storages'];
    /**
     * Called from the renderer, useful to trigger an after resize callback.
     */
    resize(): void;
    /** EVENTS **/
    /**
     * Callback to run when the {@link ComputePass} is ready
     * @param callback - callback to run when {@link ComputePass} is ready
     */
    onReady(callback: () => void): ComputePass;
    /**
     * Callback to run before the {@link ComputePass} is rendered
     * @param callback - callback to run just before {@link ComputePass} will be rendered
     */
    onBeforeRender(callback: () => void): ComputePass;
    /**
     * Callback to run when the {@link ComputePass} is rendered
     * @param callback - callback to run when {@link ComputePass} is rendered
     */
    onRender(callback: () => void): ComputePass;
    /**
     * Callback to run after the {@link ComputePass} has been rendered
     * @param callback - callback to run just after {@link ComputePass} has been rendered
     */
    onAfterRender(callback: () => void): ComputePass;
    /**
     * Callback used to run a custom render function instead of the default one.
     * @param callback - callback to run instead of the default [work groups render]{@link ComputeMaterial#renderWorkGroup} function
     */
    useCustomRender(callback: (pass: GPUComputePassEncoder) => void): ComputePass;
    /**
     * Callback to run after the {@link Renderer} has been resized
     * @param callback - callback to run just after {@link GPURenderer} has been resized
     */
    onAfterResize(callback: () => void): ComputePass;
    /**
     * Called before rendering the ComputePass
     * Checks if the material is ready and eventually update its struct
     */
    onBeforeRenderPass(): void;
    /**
     * Render our {@link ComputeMaterial}
     * @param pass - current compute pass encoder
     */
    onRenderPass(pass: GPUComputePassEncoder): void;
    /**
     * Called after having rendered the ComputePass
     */
    onAfterRenderPass(): void;
    /**
     * Render our compute pass
     * Basically just check if our {@link GPURenderer} is ready, and then render our {@link ComputeMaterial}
     * @param pass
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Check whether we're currently accessing one of the {@link ComputeMaterial} buffer and therefore can't render our compute pass
     * @readonly
     */
    get canRender(): boolean;
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array
     * @param commandEncoder - current GPU command encoder
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Get the [result buffer]{@link WritableBufferBinding#resultBuffer} content by [binding]{@link WritableBufferBinding} and [buffer element]{@link BufferElement} names
     * @param bindingName - [binding name]{@link WritableBufferBinding#name} from which to get the result
     * @param bufferElementName - optional [buffer element]{@link BufferElement} (i.e. struct member) name if the result needs to be restrained to only one element
     * @async
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
     */
    getComputeResult({ bindingName, bufferElementName, }: {
        bindingName?: string;
        bufferElementName?: string;
    }): Promise<Float32Array>;
    /**
     * Remove the ComputePass from the scene and destroy it
     */
    remove(): void;
    /**
     * Destroy the ComputePass
     */
    destroy(): void;
}
