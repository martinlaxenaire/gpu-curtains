/// <reference types="dist" />
import { Material } from './Material';
import { ComputeMaterialOptions, ComputeMaterialParams, ComputeMaterialWorkGroup, ComputeMaterialWorkGroupParams } from '../../types/Materials';
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry';
import { WritableBufferBinding } from '../bindings/WritableBufferBinding';
/**
 * ComputeMaterial class:
 * Create a Material specifically built to run computations on the GPU with a {@link ComputePass}
 * @extends Material
 */
export declare class ComputeMaterial extends Material {
    /** [Compute pipeline entry]{@link ComputePipelineEntry} used by this {@link ComputeMaterial} */
    pipelineEntry: ComputePipelineEntry;
    /** Options used to create this {@link ComputeMaterial} */
    options: ComputeMaterialOptions;
    /** Array of [work groups]{@link ComputeMaterialWorkGroup} to render each time the [render]{@link ComputeMaterial#render} method is called */
    workGroups: ComputeMaterialWorkGroup[];
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
    constructor(renderer: Renderer | GPUCurtains, parameters: ComputeMaterialParams);
    /**
     * When all bind groups are created, add them to the {@link ComputePipelineEntry}
     */
    setPipelineEntryProperties(): void;
    /**
     * Compile the {@link ComputePipelineEntry}
     * @async
     */
    compilePipelineEntry(): Promise<void>;
    /**
     * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline
     * @async
     */
    setMaterial(): Promise<void>;
    /**
     * Check whether we're currently accessing one of the buffer and therefore can't render our material
     * @readonly
     */
    get hasMappedBuffer(): boolean;
    /**
     * Add a new [work group]{@link ComputeMaterial#workGroups} to render each frame.
     * A [work group]{@link ComputeMaterial#workGroups} is composed of an array of [bind groups][@link BindGroup] to set and a dispatch size to dispatch the [work group]{@link ComputeMaterial#workGroups}
     * @param bindGroups
     * @param dispatchSize
     */
    addWorkGroup({ bindGroups, dispatchSize }: ComputeMaterialWorkGroupParams): void;
    /**
     * Render a [work group]{@link ComputeMaterial#workGroups}: set its bind groups and then dispatch using its dispatch size
     * @param pass - current compute pass encoder
     * @param workGroup - [Work group]{@link ComputeMaterial#workGroups} to render
     */
    renderWorkGroup(pass: GPUComputePassEncoder, workGroup: ComputeMaterialWorkGroup): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline, and render all the [work groups]{@link ComputeMaterial#workGroups}
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
    setBufferResult(binding: WritableBufferBinding): void;
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
