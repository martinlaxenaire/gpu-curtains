import { BufferArrayElement, BufferArrayElementParams } from './BufferArrayElement';
/**
 * BufferInterleavedArrayElement class:
 * Used to compute alignment when dealing with arrays of struct
 * @extends BufferArrayElement
 */
export declare class BufferInterleavedArrayElement extends BufferArrayElement {
    /** Corresponding {@link DataView} set function based on [view array]{@link BufferInterleavedElement#view} type */
    viewSetFunction: DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32'];
    /**
     * BufferInterleavedArrayElement constructor
     * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferInterleavedArrayElement}
     */
    constructor({ name, key, type, arrayLength }: BufferArrayElementParams);
    /**
     * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
     * @readonly
     */
    get byteCount(): number;
    /**
     * Set the [alignment]{@link BufferElementAlignment}
     * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
     */
    setAlignment(startOffset?: number, stride?: number): void;
    /**
     * Set the [view]{@link BufferInterleavedArrayElement#view} and [viewSetFunction]{@link BufferInterleavedArrayElement#viewSetFunction}
     * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the [view]{@link BufferArrayElement#view} based on the new value, and then update the [buffer binding array view]{@link BufferBinding#arrayView} using sub arrays
     * @param value - new value to use
     */
    update(value: any): void;
    /**
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link BufferBinding}
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data
     */
    extractDataFromBufferResult(result: Float32Array): Float32Array;
}
