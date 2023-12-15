import { BufferElement, BufferElementParams } from './BufferElement';
/**
 * Parameters used to create a {@link BufferArrayElement}
 */
export interface BufferArrayElementParams extends BufferElementParams {
    /** Initial length of the input [buffer binding array]{@link BufferBinding#value} */
    arrayLength: number;
}
/**
 * BufferArrayElement class:
 * Used to handle specific array [buffer binding]{@link BufferBinding} types
 * @extends BufferElement
 */
export declare class BufferArrayElement extends BufferElement {
    /** Initial length of the input [buffer binding array]{@link BufferBinding#value} */
    arrayLength: number;
    /** Total number of elements (i.e. {@link arrayLength} divided by [buffer layout number of elements]{@link BufferLayout#numElements} */
    numElements: number;
    /** Stride in the {@link ArrayBuffer} between two elements of the array in bytes */
    stride: number;
    /**
     * BufferArrayElement constructor
     * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferArrayElement}
     */
    constructor({ name, key, type, arrayLength }: BufferArrayElementParams);
    /**
     * Get the stride between two elements of the array in indices
     * @readonly
     */
    get strideToIndex(): number;
    /**
     * Set the [alignment]{@link BufferElementAlignment}
     * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the stride between two array elements. Using the stride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignment(startOffset?: number): void;
    /**
     * Update the [view]{@link BufferElement#view} based on the new value
     * @param value - new value to use
     */
    update(value: any): void;
}
