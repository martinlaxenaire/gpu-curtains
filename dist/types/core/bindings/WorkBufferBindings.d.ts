/// <reference types="dist" />
import { BufferBindings, BufferBindingsParams } from './BufferBindings';
export interface WorkBufferBindingsParams extends BufferBindingsParams {
    /** Work group dispatch size to use */
    dispatchSize?: number | number[];
    /** Whether whe should automatically copy the [resultBuffer]{@link bindings#resultBuffer} GPUBuffer content into our [result]{@link WorkBufferBindings#result} array */
    shouldCopyResult?: boolean;
}
/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBindings
 */
export declare class WorkBufferBindings extends BufferBindings {
    /** An array of number describing how we must dispatch the work group */
    dispatchSize: number[];
    /** Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our {@link result} array */
    shouldCopyResult: boolean;
    /** Array specifically designed to handle the result of our [resultBuffer]{@link bindings#resultBuffer} GPUBuffer if needed */
    result: Float32Array;
    /** The result GPUBuffer */
    resultBuffer: GPUBuffer | null;
    /**
     * WorkBufferBindings constructor
     * @param {WorkBufferBindingsParams} parameters - [parameters]{@link WorkBufferBindingsParams} used to create our {@link WorkBufferBindings}
     */
    constructor({ label, name, bindingType, bindIndex, useStruct, bindings, visibility, dispatchSize, shouldCopyResult, }: WorkBufferBindingsParams);
}
