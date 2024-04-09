import { BufferElement, BufferElementParams } from './BufferElement';
/**
 * Parameters used to create a {@link BufferArrayElement}
 */
export interface BufferArrayElementParams extends BufferElementParams {
    /** Initial length of the input {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} */
    arrayLength: number;
}
/**
 * Used to handle specific array {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} types
 */
export declare class BufferArrayElement extends BufferElement {
    /** Initial length of the input {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} */
    arrayLength: number;
    /** Total number of elements (i.e. {@link arrayLength} divided by {@link core/bindings/utils.BufferLayout | buffer layout} number of elements */
    numElements: number;
    /** Number of bytes in the {@link ArrayBuffer} between two elements {@link startOffset} */
    arrayStride: number;
    /**
     * BufferArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}
     */
    constructor({ name, key, type, arrayLength }: BufferArrayElementParams);
    /**
     * Get the array stride between two elements of the array, in indices
     * @readonly
     */
    get arrayStrideToIndex(): number;
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
     * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the arrayStride between two array elements. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array buffer}
     */
    setAlignment(startOffset?: number): void;
    /**
     * Set the strided {@link view} value from an array
     * @param value - array to use
     */
    setValueFromArray(value: number[]): void;
}
