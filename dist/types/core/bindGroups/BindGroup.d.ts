/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { TypedArray } from '../../utils/buffers-utils';
import { AllowedBindGroups, BindGroupBindingBuffer, BindGroupBindingElement, BindGroupBufferBindingElement, BindGroupEntries, BindGroupParams, InputBindings } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { TextureBindGroupParams } from './TextureBindGroup';
import { BindingType } from '../bindings/Bindings';
/**
 * BindGroup class:
 * Used to handle all inputs data sent to the GPU. Data (buffers, textures or samplers) are organised by Bindings.
 * It creates GPUBuffer, GPUBindGroup and GPUBindGroupLayout that are used by the GPU Pipelines.
 */
export declare class BindGroup {
    /**
     * The type of the {@link BindGroup}
     * @type {string}
     */
    type: string;
    /**
     * The universal unique id of the {@link BindGroup}
     * @type {string}
     */
    uuid: string;
    /**
     * The {@link Renderer} used
     * @type {Renderer}
     */
    renderer: Renderer;
    /**
     * Options used to create this {@link BindGroup}
     * @type {TextureBindGroupParams}
     */
    options: TextureBindGroupParams;
    /**
     * Index of this {@link BindGroup}, used to link bindings in the shaders
     * @type {number}
     */
    index: number;
    /**
     * List of [bindings]{@link BindGroupBindingElement} (buffers, texture, etc.) handled by this {@link BindGroup}
     * @type {BindGroupBindingElement[]}
     */
    bindings: BindGroupBindingElement[];
    /**
     * List of [bindingsBuffers]{@link BindGroupBindingBuffer} handled by this {@link BindGroup}.
     * @type {BindGroupBindingBuffer[]}
     */
    bindingsBuffers: BindGroupBindingBuffer[];
    /**
     * Our {@link BindGroup} [entries]{@link BindGroupEntries} objects
     * @type {BindGroupEntries}
     */
    entries: BindGroupEntries;
    /**
     * Our {@link BindGroup} GPUBindGroupLayout
     * @type {?GPUBindGroupLayout}
     */
    bindGroupLayout: null | GPUBindGroupLayout;
    /**
     * Our {@link BindGroup} GPUBindGroup
     * @type {?GPUBindGroup}
     */
    bindGroup: null | GPUBindGroup;
    /**
     * Flag indicating whether we need to totally reset this {@link BindGroup}
     * @type {boolean}
     */
    needsReset: boolean;
    /**
     * Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup}
     * @type {boolean}
     */
    needsPipelineFlush: boolean;
    /**
     * BindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {BindGroupParams=} parameters - [parameters]{@link BindGroupParams} used to create our {@link BindGroup}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, inputs }?: BindGroupParams);
    /**
     * Sets our {@link BindGroup} {@link index}
     * @param {number} index
     */
    setIndex(index: number): void;
    /**
     * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param {BindGroupBindingElement[]} bindings - bindings to add
     */
    addBindings(bindings?: BindGroupBindingElement[]): void;
    /**
     * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param {BindGroupBindingElement} binding - binding to add
     */
    addBinding(binding: BindGroupBindingElement): void;
    /**
     * Creates Bindings based on a list of inputs
     * @param {BindingType} bindingType - binding type
     * @param {InputBindings} inputs - inputs that will be used to create the binding
     * @returns {BindGroupBindingElement[]} - bindings array
     */
    createInputBindings(bindingType?: BindingType, inputs?: InputBindings): BindGroupBindingElement[];
    /**
     * Create and adds {@link bindings} based on inputs provided upon creation
     */
    setInputBindings(): void;
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link bindings} and has not been created yet
     * @readonly
     * @type {boolean}
     */
    get shouldCreateBindGroup(): boolean;
    /**
     * Reset our {@link BindGroup} {@link entries}
     */
    resetEntries(): void;
    /**
     * Create buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
     */
    createBindGroup(): void;
    /**
     * Reset {@link BindGroup} {@link entries} and recreates it
     */
    resetBindGroup(): void;
    /**
     * Creates a GPUBuffer from a bind group binding and add bindGroup and bindGroupLayout {@link entries}
     * @param {BindGroupBufferBindingElement} binding - the binding element
     * @param {number} bindIndex - the bind index
     * @param {TypedArray} array - the binding value array
     */
    createBindingBufferElement(binding: BindGroupBufferBindingElement, bindIndex: number, array: TypedArray): void;
    /**
     * Creates binding buffer with correct params
     * @param {BindGroupBufferBindingElement} binding - the binding element
     */
    createBindingBuffer(binding: BindGroupBufferBindingElement): void;
    /**
     * Loop through all {@link bindings}, and create bindings buffers if they need one
     */
    createBindingsBuffers(): void;
    /**
     * Get a bind group binding by name/key
     * @param {string} bindingName - the binding name or key
     * @returns {BindGroupBindingElement | null} - the found binding, or null if not found
     */
    getBindingsByName(bindingName?: string): BindGroupBindingElement | null;
    /**
     * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
     */
    setBindGroupLayout(): void;
    /**
     * Create a GPUBindGroup and set our {@link bindGroup}
     */
    setBindGroup(): void;
    /**
     * Check whether we should update (write the buffer) our GPUBuffer or not
     * Called at each render from Material
     */
    updateBindings(): void;
    /**
     * Clones a {@link BindGroup} from a list of {@link bindingsBuffers}
     * Useful to create a new bind group with already created buffers, but swapped
     * @param {BindGroupBindingBuffer[]} bindingsBuffers - our input {@link bindingsBuffers}
     * @param {boolean} keepLayout - whether we should keep original {@link bindGroupLayout} or not
     * @returns {AllowedBindGroups} - the cloned {@link BindGroup}
     */
    cloneFromBindingsBuffers({ bindingsBuffers, keepLayout, }?: {
        bindingsBuffers?: BindGroupBindingBuffer[];
        keepLayout?: boolean;
    }): AllowedBindGroups;
    /**
     * Clones a bind group with all its {@link bindings} and original {@link bindingsBuffers}
     * @returns {AllowedBindGroups} - the cloned BindGroup
     */
    clone(): AllowedBindGroups;
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy(): void;
}
