/// <reference types="dist" />
import { Binding, BindingParams, BufferBindingMemoryAccessType, BufferBindingType } from './Binding';
import { Input, InputBase, InputValue } from '../../types/BindGroups';
import { BufferElement } from './bufferElements/BufferElement';
import { BufferArrayElement } from './bufferElements/BufferArrayElement';
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement';
import { Buffer, BufferParams } from '../buffers/Buffer';
import { WritableBufferBinding, WritableBufferBindingParams } from './WritableBufferBinding';
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
    /** Allowed usages for the {@link BufferBinding#buffer} as an array of {@link core/buffers/utils.BufferUsageKeys | buffer usages names} */
    usage?: BufferParams['usage'];
}
/** Define a {@link BufferBinding} children binding entry parameters. Used to build complex WGSL `Struct` containing `Struct` children. */
export interface BufferBindingChildrenBinding {
    /** The {@link BufferBinding} to use. */
    binding: BufferBinding;
    /** The number of times to use this {@link binding}. If it is greater than `1`, the {@link binding} will be cloned with new arrays to use for values. */
    count?: number;
    /** Whether to force this `Struct` element to be defined as an array, even if {@link count} is lower or equal to `1`. Useful when a `Struct` element absolutely needs to be iterable. */
    forceArray?: boolean;
}
/**
 * Parameters used to create a {@link BufferBinding}
 */
export interface BufferBindingParams extends BindingParams, BufferBindingBaseParams {
    /** The binding type of the {@link BufferBinding} */
    bindingType?: BufferBindingType;
    /** Optional array of {@link BufferBindingChildrenBinding} to add to this {@link BufferBinding} to create complex `Struct` objects containing `Struct` {@link BufferBinding} children. */
    childrenBindings?: BufferBindingChildrenBinding[];
    /** The minimum {@link GPUDevice} buffer offset alignment. */
    minOffset?: number;
    /** Optional offset of the {@link BufferBinding} in the {@link BufferBinding#parent | parent BufferBinding} (as an index - not in bytes). */
    offset?: number;
    /** The optional parent {@link BufferBinding} that will actually handle the {@link GPUBuffer}. */
    parent?: BufferBinding;
    /** Optional already existing {@link Buffer} to use instead of creating a new one. Allow to reuse an already created {@link Buffer} but with different read or visibility values, or with a different WGSL struct. */
    buffer?: Buffer;
}
/** All allowed {@link BufferElement | buffer elements} */
export type AllowedBufferElement = BufferElement | BufferArrayElement | BufferInterleavedArrayElement;
/** Possible data view set function to use with a {@link DataView} based on the data type. */
export type DataViewSetFunction = DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32'];
/**
 * Used to format {@link BufferBindingParams#struct | uniforms or storages struct inputs} and create a single typed array that will hold all those inputs values. The array needs to be correctly padded depending on every value type, so it can be safely used as a GPUBuffer input.
 *
 * It will also create WGSL Structs and variables according to the {@link BufferBinding} inputs parameters.
 *
 * The WGSL structs and variables declaration may vary based on the input types, especially if there's one or more arrays involved (i.e. `array<f32>`, `array<vec3f>` etc.).
 *
 * It is possible to create complex WGSL structs with children structs by using the {@link BufferBindingParams#childrenBindings | childrenBindings} parameter.
 *
 * There's a helper tool to help you understand and debug your {@link BufferBinding} WGSL declaration: [BufferBinding WGSL generation helper](https://martinlaxenaire.github.io/gpu-curtains/examples/buffer-binding-wgsl-helper/)
 *
 * A {@link BufferBinding} can also have a {@link parent | parent BufferBinding}, in which case it won't create a GPUBuffer but use its parent GPUBuffer at the right offset. Useful to create a unique {@link BufferBinding} with a single GPUBuffer to handle multiple {@link BufferBinding} and update them with a single `writeBuffer` call.
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
    #private;
    /** The binding type of the {@link BufferBinding} */
    bindingType: BufferBindingType;
    /** Flag to indicate whether this {@link BufferBinding} {@link bufferElements | buffer elements} should be packed in a single structured object or if each one of them should be a separate binding. */
    useStruct: boolean;
    /** All the {@link BufferBinding} data inputs */
    inputs: Record<string, BufferBindingInput>;
    /** Array of children {@link BufferBinding} used as struct children. */
    childrenBindings: BufferBinding[];
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
    /** {@link DataView} inside the {@link arrayBuffer | parent arrayBuffer} if set. */
    parentView: DataView | null;
    /** Array of {@link AllowedBufferElement | bufferElements} and according {@link DataViewSetFunction | view set functions} to use if the {@link parent} is set. */
    parentViewSetBufferEls: Array<{
        /** Corresponding {@link AllowedBufferElement | bufferElement}. */
        bufferElement: AllowedBufferElement;
        /** Corresponding {@link DataViewSetFunction | view set function}. */
        viewSetFunction: DataViewSetFunction;
    }> | null;
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
    constructor({ label, name, bindingType, visibility, useStruct, access, usage, struct, childrenBindings, buffer, parent, minOffset, offset, }: BufferBindingParams);
    /**
     * Clone a {@link BufferBindingParams#struct | struct object} width new default values.
     * @param struct - New cloned struct object.
     */
    static cloneStruct(struct: Record<string, Input>): Record<string, Input>;
    /**
     * Get the {@link BufferBinding} parent if any.
     * @readonly
     * @returns - The {@link BufferBinding} parent if any.
     */
    get parent(): BufferBinding;
    /**
     * Set the new {@link BufferBinding} parent.
     * @param value - New {@link BufferBinding} parent to set if any.
     */
    set parent(value: BufferBinding | null);
    /**
     * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
     * @param value - Size to round.
     */
    getMinOffsetSize(value: number): number;
    /**
     * Get this {@link BufferBinding} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
     * @readonly
     * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
     */
    get offset(): number;
    /**
     * Get {@link GPUDevice.createBindGroupLayout().descriptor.entries.resource | GPUBindGroupLayout entry resource}.
     * @readonly
     */
    get resourceLayout(): {
        /** {@link GPUBindGroupLayout | bind group layout} resource */
        buffer: GPUBufferBindingLayout;
        /** Offset in bytes in the {@link parent} buffer if set. */
        offset?: number;
        /** Size in bytes in the {@link parent} buffer if set. */
        size?: number;
    };
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey(): string;
    /**
     * Get {@link GPUDevice.createBindGroup().descriptor.entries.resource | GPUBindGroup entry resource}.
     * @readonly
     */
    get resource(): {
        /** {@link GPUBindGroup | bind group} resource */
        buffer: GPUBuffer | null;
        /** Offset in bytes in the {@link parent} buffer if set. */
        offset?: number;
        /** Size in bytes in the {@link parent} buffer if set. */
        size?: number;
    };
    /**
     * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
     * @param params - params to use for cloning
     */
    clone(params?: WritableBufferBindingParams | BufferBindingParams): BufferBinding | WritableBufferBinding;
    /**
     * Format bindings struct and set our {@link inputs}
     * @param bindings - bindings inputs
     */
    setBindings(bindings: Record<string, Input>): void;
    /**
     * Set this {@link BufferBinding} optional {@link BufferBinding.childrenBindings | childrenBindings}.
     * @param childrenBindings - Array of {@link BufferBindingChildrenBinding} to use as {@link BufferBinding.childrenBindings | childrenBindings}.
     */
    setChildrenBindings(childrenBindings: BufferBindingChildrenBinding[]): void;
    /**
     * Set the buffer alignments from {@link inputs}.
     */
    setInputsAlignment(): void;
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
     * If any of the {@link inputs} has changed, run its `onBeforeUpdate` callback then updates our {@link arrayBuffer} array.
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
