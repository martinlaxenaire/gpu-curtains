/// <reference types="dist" />
import { Bindings, BindingsParams } from './Bindings';
import { BufferBindingsElement } from '../../utils/buffers-utils';
import { Input, InputBase, InputValue } from '../../types/BindGroups';
export interface BufferBindingsUniform extends InputBase {
    _value: InputValue;
    get value(): InputValue;
    set value(value: InputValue);
    shouldUpdate: boolean;
}
/**
 * An object defining all possible {@link BufferBindings} class instancing parameters
 */
export interface BufferBindingsParams extends BindingsParams {
    /** Whether this {@link BufferBindings} should use structured WGSL variables */
    useStruct?: boolean;
    /** Object containing one or multiple [input bindings]{@link Input} */
    bindings?: Record<string, Input>;
}
/**
 * BufferBindings class:
 * Used to format inputs bindings and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.
 * @extends Bindings
 */
export declare class BufferBindings extends Bindings {
    /** Flag to indicate whether these {@link BufferBindings} should use structured data */
    useStruct: boolean;
    /** All the {@link BufferBindings} data inputs */
    bindings: Record<string, BufferBindingsUniform>;
    /** Number of rows (each row has a byteLength of 16) used to build our padded {@link value} array */
    alignmentRows: number;
    /** Total size of our {@link value} array in bytes, so {@link alignmentRows} * 16 */
    size: number;
    /** Flag to indicate whether one of the {@link bindings} value has changed and we need to update the GPUBuffer linked to the {@link value} array */
    shouldUpdate: boolean;
    /** An array describing how each corresponding {@link bindings} should be inserted into our {@link value} array
     * @type {BufferBindingsElement[]} */
    bindingElements: BufferBindingsElement[];
    /** The padded value array that will be sent to the GPUBuffer */
    value: Float32Array;
    /** The GPUBuffer */
    buffer: GPUBuffer | null;
    /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBindings} */
    wgslStructFragment: string;
    /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBindings} */
    wgslGroupFragment: string[];
    /**
     * BufferBindings constructor
     * @param {BufferBindingsParams} parameters - parameters used to create our BufferBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
     * @param {Object.<string, Input>} parameters.bindings - bindings inputs
     */
    constructor({ label, name, bindingType, bindIndex, visibility, useStruct, bindings, }: BufferBindingsParams);
    /**
     * Format input bindings and set our {@link bindings}
     * @param {Object.<string, Input>} bindings - bindings inputs
     */
    setBindings(bindings: Record<string, Input>): void;
    /**
     * Set our buffer attributes:
     * Takes all the {@link bindings} and adds them to the {@link bindingElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
     */
    setBufferAttributes(): void;
    /**
     * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
     */
    setWGSLFragment(): void;
    /**
     * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
     * @param {string} bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName?: string): void;
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link bindings} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the GPUBuffer.
     */
    onBeforeRender(): void;
}
