/// <reference types="dist" />
import { Material } from './Material';
import { MaterialParams } from '../../types/Materials';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry';
import { WorkBufferBindings } from '../bindings/WorkBufferBindings';
/**
 * ComputeMaterial class:
 * Create a Material specifically built to run computations on the GPU with a {@see ComputePass}
 * @extends Material
 */
export declare class ComputeMaterial extends Material {
    pipelineEntry: ComputePipelineEntry;
    /**
     * ComputeMaterial constructor
     * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
     * @param {MaterialParams} parameters - parameters used to create our Material
     * @param {string} parameters.label - ComputeMaterial label
     * @param {boolean} parameters.useAsyncPipeline - whether the {@see ComputePipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our ComputeMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our ComputeMaterial {@see BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams);
    /**
     * When all bind groups are created, add them to the {@see ComputePipelineEntry} and compile it
     */
    setPipelineEntryBuffers(): void;
    /**
     * Check if all bind groups are ready, create them if needed and set {@see ComputePipelineEntry} bind group buffers
     */
    setMaterial(): void;
    /** BIND GROUPS **/
    /**
     * Check whether we're currently accessing one of the buffer and therefore can't render our material
     * @readonly
     * @type {boolean}
     */
    get hasMappedBuffer(): boolean;
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups
     * @param {GPUComputePassEncoder} pass
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Copy all writable binding buffers that need it
     * @param {GPUCommandEncoder} commandEncoder
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Loop through all bind groups writable buffers and check if they need to be copied
     */
    setWorkGroupsResult(): void;
    /**
     * Copy the result buffer into our result array
     * @param {WorkBufferBindings} binding
     */
    setBufferResult(binding: WorkBufferBindings): void;
    /**
     * Get the result of work group by work group and binding names
     * @param {string=} workGroupName
     * @param {string=} bindingName
     * @returns {?Float32Array} - the result of our GPU compute pass
     */
    getWorkGroupResult({ workGroupName, bindingName, }: {
        workGroupName?: string;
        bindingName?: string;
    }): Float32Array;
}
