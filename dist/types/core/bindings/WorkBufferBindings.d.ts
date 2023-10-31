import { BufferBindings, BufferBindingsParams } from './BufferBindings';
export interface WorkBufferBindingsParams extends BufferBindingsParams {
    dispatchSize?: number | number[];
    shouldCopyResult?: boolean;
}
/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBindings
 */
export declare class WorkBufferBindings extends BufferBindings {
    /**
     * An array of number describing how we must dispatch the work group
     * @type {number[]}
     */
    dispatchSize: number[];
    /**
     * Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our {@link result} array
     * @type {boolean}
     */
    shouldCopyResult: boolean;
    /**
     * Array specifically designed to handle the result of our resultBuffer GPUBuffer if needed
     * @type {Float32Array}
     */
    result: Float32Array;
    /**
     * WorkBufferBindings constructor
     * @param {WorkBufferBindingsParams} parameters - parameters used to create our WorkBufferBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType=} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
     * @param {Object.<string, Input>} parameters.bindings - bindings inputs
     * @param {(number|number[])=} parameters.dispatchSize - work group dispatch size
     * @param {boolean=} parameters.shouldCopyResult - whether we should copy the buffer result at each render call
     */
    constructor({ label, name, bindingType, bindIndex, useStruct, bindings, visibility, dispatchSize, shouldCopyResult, }: WorkBufferBindingsParams);
}
