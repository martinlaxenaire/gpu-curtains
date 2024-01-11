import { BufferArrayElement, BufferArrayElementParams } from './BufferArrayElement';
/**
 * Used to compute alignment when dealing with arrays of Struct
 */
export declare class BufferInterleavedArrayElement extends BufferArrayElement {
    /** Corresponding {@link DataView} set function based on {@link view} type */
    viewSetFunction: DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32'];
    /**
     * BufferInterleavedArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferInterleavedArrayElement}
     */
    constructor({ name, key, type, arrayLength }: BufferArrayElementParams);
    /**
     * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
     * @readonly
     */
    get byteCount(): number;
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
     * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
     */
    setAlignment(startOffset?: number, stride?: number): void;
    /**
     * Set the {@link view} and {@link viewSetFunction}
     * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the {@link view} based on the new value, and then update the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view} using sub arrays
     * @param value - new value to use
     */
    update(value: any): void;
    /**
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data
     */
    extractDataFromBufferResult(result: Float32Array): Float32Array;
}
