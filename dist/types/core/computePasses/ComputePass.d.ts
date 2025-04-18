/// <reference types="@webgpu/types" />
import { Renderer } from '../renderers/utils';
import { ComputeMaterial } from '../materials/ComputeMaterial';
import { ComputeMaterialParams, MaterialParams, MaterialShaders } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Texture, TextureParams } from '../textures/Texture';
import { SceneObjectTextureOptions } from '../../types/Textures';
import { MediaTexture, MediaTextureParams } from '../textures/MediaTexture';
/** Defines {@link ComputePass} options. */
export interface ComputePassOptions {
    /** The label of the {@link ComputePass}. */
    label: string;
    /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
    renderOrder?: number;
    /** Whether the {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically. */
    autoRender?: boolean;
    /** Flag indicating whether this {@link ComputePass} should run or not, much like the {@link core/meshes/Mesh.Mesh#visible | Mesh visible} flag. Default to `true`. */
    active?: boolean;
    /** Compute shader passed to the {@link ComputePass} following the {@link types/Materials.ShaderOptions | shader object} notation. */
    shaders: MaterialShaders;
    /** whether the {@link core/pipelines/ComputePipelineEntry.ComputePipelineEntry#pipeline | compute pipeline} should be compiled asynchronously. */
    useAsyncPipeline?: boolean;
    /** Parameters used by this {@link ComputePass} to create a {@link MediaTexture}. */
    texturesOptions?: SceneObjectTextureOptions;
    /** Default {@link ComputeMaterial} work group dispatch size to use with this {@link ComputePass}. */
    dispatchSize?: number | number[];
}
/**
 * An object defining all possible {@link ComputePass} class instancing parameters.
 */
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {
}
/**
 * Used to create a {@link ComputePass}, i.e. run computations on the GPU.<br>
 * A {@link ComputePass} is basically a wrapper around a {@link ComputeMaterial} that handles most of the process.
 *
 * The default render behaviour of a {@link ComputePass} is to set its {@link core/bindGroups/BindGroup.BindGroup | bind groups} and then dispatch the workgroups based on the provided {@link ComputeMaterial#dispatchSize | dispatchSize}.<br>
 * However, most of the time you'd want a slightly more complex behaviour. The {@link ComputePass#useCustomRender | `useCustomRender` hook} lets you define a totally custom behaviour, but you'll have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
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
 *
 * // let's assume we are going to compute the positions of 100.000 particles
 * const nbParticles = 100_000
 *
 * const computePass = new ComputePass(gpuCurtains, {
 *   label: 'My compute pass',
 *   shaders: {
 *     compute: {
 *       code: computeShaderCode, // assume it is a valid WGSL compute shader
 *     },
 *   },
 *   dispatchSize: Math.ceil(nbParticles / 64),
 *   storages: {
 *     particles: {
 *       access: 'read_write',
 *       struct: {
 *         position: {
 *           type: 'array<vec4f>',
 *           value: new Float32Array(nbParticles * 4),
 *         },
 *       },
 *     },
 *   },
 * })
 * ```
 */
export declare class ComputePass {
    #private;
    /** The type of the {@link ComputePass}. */
    type: string;
    /** The universal unique id of the {@link ComputePass}. */
    uuid: string;
    /** The index of the {@link ComputePass}, incremented each time a new one is instanced. */
    index: number;
    /** The {@link Renderer} used. */
    renderer: Renderer;
    /** Controls the order in which this {@link ComputePass} should be rendered by our {@link core/scenes/Scene.Scene | Scene}. */
    renderOrder: number;
    /** Options used to create this {@link ComputePass}. */
    options: ComputePassOptions;
    /** {@link ComputeMaterial} used by this {@link ComputePass}. */
    material: ComputeMaterial;
    /** Flag indicating whether this {@link ComputePass} is ready to be rendered. */
    _ready: boolean;
    /** Empty object to store any additional data or custom properties into your {@link ComputePass}. */
    userData: Record<string, unknown>;
    /** function assigned to the {@link onReady} callback. */
    _onReadyCallback: () => void;
    /** function assigned to the {@link onBeforeRender} callback. */
    _onBeforeRenderCallback: () => void;
    /** function assigned to the {@link onRender} callback. */
    _onRenderCallback: () => void;
    /** function assigned to the {@link onAfterRender} callback. */
    _onAfterRenderCallback: () => void;
    /** function assigned to the {@link onAfterResize} callback. */
    _onAfterResizeCallback: () => void;
    /**
     * ComputePass constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputePass}.
     * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}.
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: ComputePassParams);
    /**
     * Get or set whether the compute pass is ready to render (the material has been successfully compiled).
     * @readonly
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Add our {@link ComputePass} to the scene and optionally to the renderer.
     * @param addToRenderer - Whether to add this {@link ComputePass} to the {@link Renderer#computePasses | Renderer computePasses array}.
     */
    addToScene(addToRenderer?: boolean): void;
    /**
     * Remove our {@link ComputePass} from the scene and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link ComputePass} from the {@link Renderer#computePasses | Renderer computePasses array}.
     */
    removeFromScene(removeFromRenderer?: boolean): void;
    /**
     * Set a new {@link Renderer} for this {@link ComputePass}.
     * @param renderer - new {@link Renderer} to set.
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Create the compute pass material.
     * @param computeParameters - {@link ComputeMaterial} parameters.
     */
    setMaterial(computeParameters: ComputeMaterialParams): void;
    /**
     * Set or update the {@link ComputePass} {@link ComputeMaterial}.
     * @param material - New {@link ComputeMaterial} to use.
     */
    useMaterial(material: ComputeMaterial): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render.
     */
    loseContext(): void;
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     */
    restoreContext(): void;
    /**
     * Get the active property value.
     */
    get active(): boolean;
    /**
     * Set the active property value.
     * @param value - New active value.
     */
    set active(value: boolean);
    /**
     * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
     * @readonly
     */
    get textures(): Texture[];
    /**
     * Create a new {@link MediaTexture}.
     * @param options - {@link MediaTextureParams | MediaTexture parameters}.
     * @returns - Newly created {@link MediaTexture}.
     */
    createMediaTexture(options: MediaTextureParams): MediaTexture;
    /**
     * Create a new {@link Texture}.
     * @param  options - {@link TextureParams | Texture parameters}.
     * @returns - newly created {@link Texture}.
     */
    createTexture(options: TextureParams): Texture;
    /**
     * Add a {@link Texture} or {@link MediaTexture}.
     * @param texture - {@link Texture} to add.
     */
    addTexture(texture: Texture | MediaTexture): void;
    /**
     * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}.
     * @readonly
     */
    get uniforms(): ComputeMaterial['uniforms'];
    /**
     * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}.
     * @readonly
     */
    get storages(): ComputeMaterial['storages'];
    /**
     * Called from the renderer, useful to trigger an after resize callback.
     */
    resize(): void;
    /** EVENTS **/
    /**
     * Callback to run when the {@link ComputePass} is ready.
     * @param callback - Callback to run when {@link ComputePass} is ready.
     * @returns - Our {@link ComputePass}.
     */
    onReady(callback: () => void): ComputePass;
    /**
     * Callback to run before the {@link ComputePass} is rendered.
     * @param callback - Callback to run just before {@link ComputePass} will be rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onBeforeRender(callback: () => void): ComputePass;
    /**
     * Callback to run when the {@link ComputePass} is rendered.
     * @param callback - Callback to run when {@link ComputePass} is rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onRender(callback: () => void): ComputePass;
    /**
     * Callback to run after the {@link ComputePass} has been rendered.
     * @param callback - Callback to run just after {@link ComputePass} has been rendered. The callback won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @returns - Our {@link ComputePass}.
     */
    onAfterRender(callback: () => void): ComputePass;
    /**
     * Callback used to run a custom render function instead of the default one. This won't be called if the {@link Renderer} is not ready or the {@link ComputePass} itself is neither {@link ready} nor {@link active}.
     * @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     * @returns - Our {@link ComputePass}.
     */
    useCustomRender(callback: (pass: GPUComputePassEncoder) => void): ComputePass;
    /**
     * Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
     * @param callback - Callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized.
     * @returns - Our {@link ComputePass}.
     */
    onAfterResize(callback: () => void): ComputePass;
    /**
     * Called before rendering the {@link ComputePass}.
     * Checks if the material is ready and eventually update its bindings.
     */
    onBeforeRenderPass(): void;
    /**
     * Render our {@link ComputeMaterial}.
     * @param pass - Current compute pass encoder.
     */
    onRenderPass(pass: GPUComputePassEncoder): void;
    /**
     * Called after having rendered the {@link ComputePass}.
     */
    onAfterRenderPass(): void;
    /**
     * Render our compute pass.
     * Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}.
     * @param pass - Current compute pass encoder.
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array.
     * @param commandEncoder - Current GPU command encoder.
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
     * @param parameters - Parameters used to get the result
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
     * @param parameters.bufferElementName - Optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
     * @returns - The mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
     */
    getComputeResult({ bindingName, bufferElementName, }: {
        bindingName?: string;
        bufferElementName?: string;
    }): Promise<Float32Array>;
    /**
     * Remove the {@link ComputePass} from the {@link core/scenes/Scene.Scene | Scene} and destroy it.
     */
    remove(): void;
    /**
     * Destroy the {@link ComputePass}.
     */
    destroy(): void;
}
