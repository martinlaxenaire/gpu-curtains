/// <reference types="dist" />
import { BufferBinding, BufferBindingParams } from './BufferBinding';
/**
 * Parameters used to create a {@link WritableBufferBinding}
 */
export interface WritableBufferBindingParams extends BufferBindingParams {
    /** Whether whe should automatically copy the {@link WritableBufferBinding#buffer | GPU buffer} content into our {@link WritableBufferBinding#resultBuffer | result GPU buffer} */
    shouldCopyResult?: boolean;
}
/**
 * WritableBufferBinding class:
 * Used to create a BufferBindings object that can hold read/write storage struct.
 */
export declare class WritableBufferBinding extends BufferBinding {
    /** Flag indicating whether whe should automatically copy the {@link buffer | GPU buffer} content into our {@link resultBuffer | result GPU buffer} */
    shouldCopyResult: boolean;
    /** The result GPUBuffer */
    resultBuffer: GPUBuffer | null;
    /** Options used to create this {@link WritableBufferBinding} */
    options: WritableBufferBindingParams;
    /**
     * WritableBufferBinding constructor
     * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
     */
    constructor({ label, name, bindingType, useStruct, struct, visibility, access, shouldCopyResult, }: WritableBufferBindingParams);
}
