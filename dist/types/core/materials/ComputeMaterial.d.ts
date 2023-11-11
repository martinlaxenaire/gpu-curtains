/// <reference types="dist" />
import { Material } from './Material';
import { MaterialParams } from '../../types/Materials';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry';
import { WorkBufferBindings } from '../bindings/WorkBufferBindings';
/**
 * ComputeMaterial class:
 * Create a Material specifically built to run computations on the GPU with a {@link ComputePass}
 * @extends Material
 */
export declare class ComputeMaterial extends Material {
    /** [Compute pipeline entry]{@link ComputePipelineEntry} used by this {@link ComputeMaterial} */
    pipelineEntry: ComputePipelineEntry;
    /**
     * ComputeMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - parameters used to create our Material
     * @param {string} parameters.label - ComputeMaterial label
     * @param {boolean} parameters.useAsyncPipeline - whether the {@link ComputePipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our ComputeMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our ComputeMaterial {@link BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@link BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@link Sampler}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: MaterialParams);
    /**
     * When all bind groups are created, add them to the {@link ComputePipelineEntry} and compile it
     */
    setPipelineEntryProperties(): void;
    /**
     * Check if all bind groups are ready, create them if needed and set {@link ComputePipelineEntry} bind group buffers
     */
    setMaterial(): void;
    /**
     * Check whether we're currently accessing one of the buffer and therefore can't render our material
     * @readonly
     */
    get hasMappedBuffer(): boolean;
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups
     * @param pass - current compute pass encoder
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Copy all writable binding buffers that need it
     * @param commandEncoder - current command encoder
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Loop through all bind groups writable buffers and check if they need to be copied
     */
    setWorkGroupsResult(): void;
    /**
     * Copy the result buffer into our result array
     * @param binding - buffer binding to set the result from
     */
    setBufferResult(binding: WorkBufferBindings): void;
    /**
     * Get the result of work group by work group and binding names
     * @param workGroupName - work group name/key
     * @param bindingName - binding name/key
     * @returns - the result of our GPU compute pass
     */
    getWorkGroupResult({ workGroupName, bindingName, }: {
        workGroupName?: string;
        bindingName?: string;
    }): Float32Array;
}
