/// <reference types="dist" />
import { Binding, BindingParams, BufferBindingMemoryAccessType } from './Binding';
import { Input, InputBase, InputValue } from '../../types/BindGroups';
import { BufferElement } from './bufferElements/BufferElement';
import { BufferArrayElement } from './bufferElements/BufferArrayElement';
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement';
/**
 * Defines a {@link BufferBinding} input object that can set a value and run a callback function when this happens
 */
export interface BufferBindingInput extends InputBase {
    /** Original [input value]{@link InputValue} */
    _value: InputValue;
    /**
     * Get/set the [input value]{@link InputValue}
     * @readonly
     */
    get value(): InputValue;
    set value(value: InputValue);
    /** Whether the [input value]{@link InputValue} has changed and we should update the [buffer binding array]{@link BufferBinding#value} */
    shouldUpdate: boolean;
}
/**
 * Base parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingBaseParams {
    /** Whether this {@link BufferBinding} should use structured WGSL variables */
    useStruct?: boolean;
    /** {@link BufferBinding} memory access types (read only or read/write) */
    access?: BufferBindingMemoryAccessType;
    /** Object containing one or multiple [input bindings]{@link Input} */
    bindings?: Record<string, Input>;
}
/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {
}
/**
 * BufferBinding class:
 * Used to format inputs bindings and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. "array<f32>", "array<vec3f>" etc.)
 * @extends Binding
 */
export declare class BufferBinding extends Binding {
    /** Flag to indicate whether these {@link BufferBinding} should use structured data */
    useStruct: boolean;
    /** All the {@link BufferBinding} data inputs */
    bindings: Record<string, BufferBindingInput>;
    /** Flag to indicate whether one of the {@link bindings} value has changed and we need to update the GPUBuffer linked to the {@link value} array */
    shouldUpdate: boolean;
    /** An array describing how each corresponding {@link bindings} should be inserted into our {@link arrayView} array */
    bufferElements: Array<BufferElement | BufferArrayElement | BufferInterleavedArrayElement>;
    /** Total size of our {@link arrayBuffer} array in bytes */
    arrayBufferSize: number;
    /** Array buffer that will be sent to the {@link GPUBuffer} */
    arrayBuffer: ArrayBuffer;
    /** Data view of our [array buffer]{@link arrayBuffer} */
    arrayView: DataView;
    /** The GPUBuffer */
    buffer: GPUBuffer | null;
    /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBinding} */
    wgslStructFragment: string;
    /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBinding} */
    wgslGroupFragment: string[];
    /** Options used to create this {@link BufferBinding} */
    options: BufferBindingParams;
    /**
     * BufferBinding constructor
     * @param parameters - parameters used to create our BufferBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
     * @param {Object.<string, Input>} parameters.bindings - bindings inputs
     */
    constructor({ label, name, bindingType, bindIndex, visibility, useStruct, access, bindings, }: BufferBindingParams);
    /**
     * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#buffer}
     */
    get resourceLayout(): {
        buffer: GPUBufferBindingLayout;
    };
    /**
     * Get [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource(): {
        buffer: GPUBuffer | null;
    };
    /**
     * Format input bindings and set our {@link bindings}
     * @param bindings - bindings inputs
     */
    setBindings(bindings: Record<string, Input>): void;
    /**
     * Set our buffer attributes:
     * Takes all the {@link bindings} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
     */
    setBufferAttributes(): void;
    /**
     * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
     */
    setWGSLFragment(): void;
    /**
     * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName?: string): void;
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link bindings} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the {@link GPUBuffer}.
     */
    update(): void;
}
