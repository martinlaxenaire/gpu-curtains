/// <reference types="dist" />
import { BufferBinding, BufferBindingParams } from './BufferBinding';
/**
 * Parameters used to create a {@link WritableBufferBinding}
 */
export interface WritableBufferBindingParams extends BufferBindingParams {
    /** Whether whe should automatically copy the [resultBuffer]{@link inputs#resultBuffer} GPUBuffer content into our [result]{@link WritableBufferBinding#result} array */
    shouldCopyResult?: boolean;
}
/**
 * WritableBufferBinding class:
 * Used to create a BufferBindings object that can hold read/write storage struct.
 * @extends BufferBinding
 */
export declare class WritableBufferBinding extends BufferBinding {
    /** Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our {@link result} array */
    shouldCopyResult: boolean;
    /** Array specifically designed to handle the result of our [resultBuffer]{@link inputs#resultBuffer} GPUBuffer if needed */
    result: Float32Array;
    /** The result GPUBuffer */
    resultBuffer: GPUBuffer | null;
    /** Options used to create this {@link WritableBufferBinding} */
    options: WritableBufferBindingParams;
    /**
     * WritableBufferBinding constructor
     * @param parameters - [parameters]{@link WritableBufferBindingParams} used to create our {@link WritableBufferBinding}
     */
    constructor({ label, name, bindingType, bindIndex, useStruct, struct, visibility, access, shouldCopyResult, }: WritableBufferBindingParams);
}
