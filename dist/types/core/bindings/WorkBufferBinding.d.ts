/// <reference types="dist" />
import { BufferBinding, BufferBindingParams } from './BufferBinding';
/**
 * Parameters used to create a {@link WorkBufferBinding}
 */
export interface WorkBufferBindingParams extends BufferBindingParams {
    /** Whether whe should automatically copy the [resultBuffer]{@link bindings#resultBuffer} GPUBuffer content into our [result]{@link WorkBufferBinding#result} array */
    shouldCopyResult?: boolean;
}
/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBinding
 */
export declare class WorkBufferBinding extends BufferBinding {
    /** Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our {@link result} array */
    shouldCopyResult: boolean;
    /** Array specifically designed to handle the result of our [resultBuffer]{@link bindings#resultBuffer} GPUBuffer if needed */
    result: Float32Array;
    /** The result GPUBuffer */
    resultBuffer: GPUBuffer | null;
    /** Options used to create this {@link WorkBufferBinding} */
    options: WorkBufferBindingParams;
    /**
     * WorkBufferBindings constructor
     * @param parameters - [parameters]{@link WorkBufferBindingParams} used to create our {@link WorkBufferBinding}
     */
    constructor({ label, name, bindingType, bindIndex, useStruct, bindings, visibility, shouldCopyResult, }: WorkBufferBindingParams);
}
