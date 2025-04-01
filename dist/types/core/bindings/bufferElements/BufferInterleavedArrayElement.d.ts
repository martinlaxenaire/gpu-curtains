import { BufferArrayElement, BufferArrayElementParams } from './BufferArrayElement';
import { InputValue } from '../../../types/BindGroups';
import { DataViewSetFunction } from '../BufferBinding';
/**
 * Used to compute alignment when dealing with arrays of Struct
 */
export declare class BufferInterleavedArrayElement extends BufferArrayElement {
    /** Corresponding {@link DataView} set function based on {@link view} type */
    viewSetFunction: DataViewSetFunction;
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
     * Set the {@link viewSetFunction} and {@link view} into a parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayBuffer - The {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayView - The {@link core/bindings/BufferBinding.BufferBinding#arrayView | BufferBinding arrayView}.
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the {@link view} based on the new value, and then update the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer} using sub arrays.
     * @param value - New value to use.
     */
    update(value: InputValue): void;
    /**
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data.
     */
    extractDataFromBufferResult(result: Float32Array): Float32Array;
}
