/// <reference types="dist" />
import { Binding, BindingParams, BufferBindingMemoryAccessType } from './Binding';
import { Input, InputBase, InputValue } from '../../types/BindGroups';
import { BufferElement } from './bufferElements/BufferElement';
import { BufferArrayElement } from './bufferElements/BufferArrayElement';
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement';
import { Buffer } from '../buffers/Buffer';
/**
 * Defines a {@link BufferBinding} input object that can set a value and run a callback function when this happens
 */
export interface BufferBindingInput extends InputBase {
    /** Original {@link InputValue | input value} */
    _value: InputValue;
    /** Get the {@link InputValue | input value} */
    get value(): InputValue;
    /** Set the {@link InputValue | input value} */
    set value(value: InputValue);
    /** Whether the {@link InputValue | input value} has changed and we should update the {@link BufferBinding#arrayBuffer | buffer binding array} */
    shouldUpdate: boolean;
    /** {@link BufferBindingInput} name */
    name: string;
}
/**
 * Base parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingBaseParams {
    /** Whether this {@link BufferBinding} should use structured WGSL variables */
    useStruct?: boolean;
    /** {@link BufferBinding} memory access types (read only or read/write) */
    access?: BufferBindingMemoryAccessType;
    /** Object containing one or multiple {@link Input | inputs} describing the structure of the {@link BufferBinding} */
    struct?: Record<string, Input>;
}
/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {
}
/** All allowed {@link BufferElement | buffer elements} */
export type AllowedBufferElement = BufferElement | BufferArrayElement | BufferInterleavedArrayElement;
/**
 * Used to format {@link BufferBindingParams#struct | uniforms or storages struct inputs} and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.<br>
 * It will also create WGSL Structs and variables according to the BufferBindings inputs parameters.<br>
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. `array<f32>`, `array<vec3f>` etc.).
 *
 * @example
 * ```javascript
 * // create a GPU buffer binding
 * const bufferBinding = new BufferBinding({
 *   name: 'params', // name of the WGSL object
 *   bindingType: 'uniform', // should be 'storage' for large arrays
 *   struct: {
 *     opacity: {
 *       type: 'f32',
 *       value: 1,
 *     },
 *     mousePosition: {
 *       type: 'vec2f',
 *       value: new Vec2(),
 *     },
 *   },
 * })
 * ```
 */
export declare class BufferBinding extends Binding {
    /** Flag to indicate whether this {@link BufferBinding} {@link bufferElements | buffer elements} should be packed in a single structured object or if each one of them should be a separate binding. */
    useStruct: boolean;
    /** All the {@link BufferBinding} data inputs */
    inputs: Record<string, BufferBindingInput>;
    /** Flag to indicate whether one of the {@link inputs} value has changed and we need to update the GPUBuffer linked to the {@link arrayBuffer} array */
    shouldUpdate: boolean;
    /** An array describing how each corresponding {@link inputs} should be inserted into our {@link arrayView} array */
    bufferElements: AllowedBufferElement[];
    /** Total size of our {@link arrayBuffer} array in bytes */
    arrayBufferSize: number;
    /** Array buffer that will be sent to the {@link GPUBuffer} */
    arrayBuffer: ArrayBuffer;
    /** Data view of our {@link arrayBuffer | array buffer} */
    arrayView: DataView;
    /** The {@link Buffer} holding the {@link GPUBuffer}  */
    buffer: Buffer;
    /** A string to append to our shaders code describing the WGSL structure representing this {@link BufferBinding} */
    wgslStructFragment: string;
    /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link BufferBinding} */
    wgslGroupFragment: string[];
    /** Options used to create this {@link BufferBinding} */
    options: BufferBindingParams;
    /**
     * BufferBinding constructor
     * @param parameters - {@link BufferBindingParams | parameters} used to create our BufferBindings
     */
    constructor({ label, name, bindingType, visibility, useStruct, access, struct, }: BufferBindingParams);
    /**
     * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}
     * @readonly
     */
    get resourceLayout(): {
        /** {@link GPUBindGroupLayout | bind group layout} resource */
        buffer: GPUBufferBindingLayout;
    };
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey(): string;
    /**
     * Get {@link GPUBindGroupEntry#resource | bind group resource}
     * @readonly
     */
    get resource(): {
        /** {@link GPUBindGroup | bind group} resource */
        buffer: GPUBuffer | null;
    };
    /**
     * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
     * @param params - params to use for cloning
     */
    clone(params: BufferBindingParams): BufferBinding;
    /**
     * Format bindings struct and set our {@link inputs}
     * @param bindings - bindings inputs
     */
    setBindings(bindings: Record<string, Input>): void;
    /**
     * Set our buffer attributes:
     * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
     */
    setBufferAttributes(): void;
    /**
     * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
     */
    setWGSLFragment(): void;
    /**
     * Set a {@link BufferBinding#shouldUpdate | binding shouldUpdate} flag to `true` to update our {@link arrayBuffer} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName?: string): void;
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link arrayBuffer} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
     */
    update(): void;
    /**
     * Extract the data corresponding to a specific {@link BufferElement} from a {@link Float32Array} holding the {@link BufferBinding#buffer | GPU buffer} data of this {@link BufferBinding}
     * @param parameters - parameters used to extract the data
     * @param parameters.result - {@link Float32Array} holding {@link GPUBuffer} data
     * @param parameters.bufferElementName - name of the {@link BufferElement} to use to extract the data
     * @returns - extracted data from the {@link Float32Array}
     */
    extractBufferElementDataFromBufferResult({ result, bufferElementName, }: {
        result: Float32Array;
        bufferElementName: BufferElement['name'];
    }): Float32Array;
}
