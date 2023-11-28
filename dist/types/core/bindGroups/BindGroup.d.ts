/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { AllowedBindGroups, BindGroupBindingElement, BindGroupBufferBindingElement, BindGroupEntries, BindGroupParams, InputBindings } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { TextureBindGroupParams } from './TextureBindGroup';
import { BindingType } from '../bindings/Binding';
/**
 * @module core/bindGroups/BindGroup
 * @alias BindGroup
 * @export
 */
/**
 * BindGroup class:
 * Used to handle all inputs data sent to the GPU. Data (buffers, textures or samplers) are organised by Bindings.
 * It creates GPUBuffer, GPUBindGroup and GPUBindGroupLayout that are used by the GPU Pipelines.
 */
export declare class BindGroup {
    /** The type of the {@link BindGroup} */
    type: string;
    /** The universal unique id of the {@link BindGroup} */
    uuid: string;
    /** The {@link Renderer} used */
    renderer: Renderer;
    /** Options used to create this {@link BindGroup} */
    options: TextureBindGroupParams;
    /** Index of this {@link BindGroup}, used to link bindings in the shaders */
    index: number;
    /** List of [bindings]{@link BindGroupBindingElement} (buffers, texture, etc.) handled by this {@link BindGroup} */
    bindings: BindGroupBindingElement[];
    /** Our {@link BindGroup} [entries]{@link BindGroupEntries} objects */
    entries: BindGroupEntries;
    /** Our {@link BindGroup} GPUBindGroupLayout */
    bindGroupLayout: null | GPUBindGroupLayout;
    /** Our {@link BindGroup} GPUBindGroup */
    bindGroup: null | GPUBindGroup;
    /** Flag indicating whether we need to totally reset this {@link BindGroup} */
    needsReset: boolean;
    /** Flag indicating whether we need to flush and recreate the pipeline using this {@link BindGroup} s*/
    needsPipelineFlush: boolean;
    /**
     * BindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {BindGroupParams=} parameters - [parameters]{@link BindGroupParams} used to create our {@link BindGroup}
     */
    constructor(renderer: Renderer | GPUCurtains, { label, index, bindings, inputs }?: BindGroupParams);
    /**
     * Sets our [BindGroup index]{@link BindGroup#index}
     * @param index - [BindGroup index]{@link BindGroup#index}
     */
    setIndex(index: number): void;
    /**
     * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param bindings - {@link bindings} to add
     */
    addBindings(bindings?: BindGroupBindingElement[]): void;
    /**
     * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param binding - binding to add
     */
    addBinding(binding: BindGroupBindingElement): void;
    /**
     * Creates Bindings based on a list of inputs
     * @param bindingType - [binding type]{@link Binding#bindingType}
     * @param inputs - [inputs]{@link InputBindings} that will be used to create the binding
     * @returns - a {@link bindings} array
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
     * Reset the [bind group entries]{@link BindGroup#entries}, recreates it then recreate the [bind group layout]{@link BindGroup#bindGroupLayout} and [bind group]{@link BindGroup#bindGroup}
     */
    resetBindGroup(): void;
    /**
     * Get all [bind group bindings]{@link BindGroup#bindings} that handle a {@link GPUBuffer}
     */
    get bufferBindings(): BindGroupBufferBindingElement[];
    /**
     * Creates binding GPUBuffer with correct params
     * @param binding - the binding element
     */
    createBindingBuffer(binding: BindGroupBufferBindingElement): void;
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer bindings, create a GPUBuffer first if needed
     */
    fillEntries(): void;
    /**
     * Get a bind group binding by name/key
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName?: string): BindGroupBindingElement | null;
    /**
     * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
     */
    setBindGroupLayout(): void;
    /**
     * Create a GPUBindGroup and set our {@link bindGroup}
     */
    setBindGroup(): void;
    /**
     * Check whether we should update (write) our {@link GPUBuffer} or not.
     */
    updateBufferBindings(): void;
    /**
     * Update the {@link BindGroup}, which means update its [buffer bindings]{@link BindGroup#bufferBindings} and [reset it]{@link BindGroup#resetBindGroup} if needed.
     * Called at each render from the parent {@link Material}
     * (TODO - add a Material 'setBindGroup' method and call it from here? - would allow to automatically update bind groups that are eventually not part of the Material bindGroups when set)
     */
    update(): void;
    /**
     * Clones a {@link BindGroup} from a list of {@link bindings}
     * Useful to create a new bind group with already created buffers, but swapped
     * @param parameters - parameters to use for cloning
     * @param parameters.bindings - our input {@link bindings}
     * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not
     * @returns - the cloned {@link BindGroup}
     */
    clone({ bindings, keepLayout, }?: {
        bindings?: BindGroupBindingElement[];
        keepLayout?: boolean;
    }): AllowedBindGroups;
    /**
     * Clones a bind group with all its {@link bindings}
     * @returns - the cloned BindGroup
     */
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy(): void;
}
