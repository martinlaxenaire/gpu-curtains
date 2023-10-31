/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { ComputeMaterial } from '../materials/ComputeMaterial';
import { MaterialParams, MaterialShaders } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
export interface ComputePassOptions {
    label: string;
    renderOrder?: number;
    autoAddToScene?: boolean;
    shaders: MaterialShaders;
    useAsyncPipeline?: boolean;
}
export interface ComputePassParams extends Partial<ComputePassOptions>, MaterialParams {
}
/**
 * ComputePass class:
 * Used to create a compute pass, i.e. run computations on the GPU.
 * A compute pass is basically made of a {@see ComputeMaterial} that handles most of the process.
 */
export declare class ComputePass {
    #private;
    /**
     * The type of the {@link ComputePass}
     * @type {string}
     */
    type: string;
    /**
     * The universal unique id of the {@link ComputePass}
     * @type {string}
     */
    uuid: string;
    /**
     * The index of the {@link ComputePass}, incremented each time a new one is instanced
     * @type {string}
     */
    index: number;
    /**
     * The {@link Renderer} used
     * @type {Renderer}
     */
    renderer: Renderer;
    /**
     * Controls the order in which this {@link ComputePass} should be rendered by our {@link Scene}
     * @type {number}
     */
    renderOrder: number;
    /**
     * Options used to create this {@link ComputePass}
     */
    options: ComputePassOptions;
    /**
     * {@link ComputeMaterial} used by this {@link ComputePass}
     * @type {ComputeMaterial}
     */
    material: ComputeMaterial;
    /**
     * Flag indicating whether this {@link ComputePass} is ready to be rendered
     * @type {boolean}
     */
    _ready: boolean;
    _onReadyCallback: () => void;
    _onBeforeRenderCallback: () => void;
    _onRenderCallback: () => void;
    _onAfterRenderCallback: () => void;
    _onAfterResizeCallback: () => void;
    /**
     * ComputePass constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {ComputePassParams=} parameters - parameters used to create our compute pass
     * @param {string=} parameters.label - compute pass label
     * @param {boolean=} parameters.autoAddToScene - whether we should add this compute pass to our {@link Scene} to let it handle the rendering process automatically
     * @param {number=} parameters.renderOrder - controls the order in which this compute pass should be rendered by our {@link Scene}
     * @param {boolean=} parameters.useAsyncPipeline - whether the compute pipeline should be compiled asynchronously
     * @param {MaterialShaders=} parameters.shaders - our compute shader code and entry point
     * @param {BindGroupInputs=} parameters.inputs - our {@link BindGroup} inputs
     * @param {BindGroup[]=} parameters.bindGroups - already created {@link BindGroup} to use
     * @param {Sampler[]=} parameters.samplers - array of {@link Sampler}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: ComputePassParams);
    /**
     * Get or set whether the compute pass is ready to render (the material has been successfully compiled)
     * @readonly
     * @type {boolean}
     */
    get ready(): boolean;
    set ready(value: boolean);
    /**
     * Create the compute pass material
     * @param {MaterialParams} computeParameters - {@see ComputeMaterial} parameters
     */
    setComputeMaterial(computeParameters: MaterialParams): void;
    /**
     * Add our compute pass to the scene and the renderer
     */
    addToScene(): void;
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene(): void;
    /**
     * Get our {@see ComputeMaterial} uniforms
     * @readonly
     * @type {ComputeMaterial['uniforms']}
     */
    get uniforms(): ComputeMaterial['uniforms'];
    /**
     * Get our {@see ComputeMaterial} storages
     * @readonly
     * @type {ComputeMaterial['storages']}
     */
    get storages(): ComputeMaterial['storages'];
    /**
     * Get our {@see ComputeMaterial} works
     * @readonly
     * @type {ComputeMaterial['works']}
     */
    get works(): ComputeMaterial['works'];
    /**
     * Called from the renderer, useful to trigger an after resize callback.
     */
    resize(): void;
    /** EVENTS **/
    /**
     * Assign a callback function to _onReadyCallback
     * @param {function=} callback - callback to run when {@see ComputePass} is ready
     * @returns {ComputePass}
     */
    onReady(callback: () => void): ComputePass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param {function=} callback - callback to run just before {@see ComputePass} will be rendered
     * @returns {ComputePass}
     */
    onBeforeRender(callback: () => void): ComputePass;
    /**
     * Assign a callback function to _onRenderCallback
     * @param {function=} callback - callback to run when {@see ComputePass} is rendered
     * @returns {ComputePass}
     */
    onRender(callback: () => void): ComputePass;
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param {function=} callback - callback to run just after {@see ComputePass} has been rendered
     * @returns {ComputePass}
     */
    onAfterRender(callback: () => void): ComputePass;
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param {function=} callback - callback to run just after {@see GPURenderer} has been resized
     * @returns {ComputePass}
     */
    onAfterResize(callback: () => void): ComputePass;
    /**
     * Called before rendering the ComputePass
     * Checks if the material is ready and eventually update its bindings
     */
    onBeforeRenderPass(): void;
    /**
     * Render our {@see ComputeMaterial}
     * @param {GPUComputePassEncoder} pass - current compute pass encoder
     */
    onRenderPass(pass: GPUComputePassEncoder): void;
    /**
     * Called after having rendered the ComputePass
     */
    onAfterRenderPass(): void;
    /**
     * Render our compute pass
     * Basically just check if our {@see GPURenderer} is ready, and then render our {@see ComputeMaterial}
     * @param {GPUComputePassEncoder} pass
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Check whether we're currently accessing one of the {@see ComputeMaterial} buffer and therefore can't render our compute pass
     * @readonly
     * @type {boolean}
     */
    get canRender(): boolean;
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array
     * @param {GPUCommandEncoder} commandEncoder - current GPU command encoder
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Set {@see ComputeMaterial} work groups result
     */
    setWorkGroupsResult(): void;
    /**
     * Get the result of a work group by binding name
     * @param {string=} workGroupName - name/key of the work group
     * @param {string=} bindingName - name/key of the input binding
     * @returns {Float32Array} - the corresponding binding result array
     */
    getWorkGroupResult({ workGroupName, bindingName }: {
        workGroupName?: string;
        bindingName?: string;
    }): Float32Array;
    /**
     * Remove the ComputePass from the scene and destroy it
     */
    remove(): void;
    /**
     * Destroy the ComputePass
     */
    destroy(): void;
}
