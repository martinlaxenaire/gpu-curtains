/// <reference types="dist" />
import { Material } from './Material';
import { ComputeMaterialOptions, ComputeMaterialParams, FullShadersType } from '../../types/Materials';
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
    /** Default work group dispatch size to use with this {@link ComputeMaterial} */
    dispatchSize?: number | number[];
    /** function assigned to the [useCustomRender]{@link ComputeMaterial#useCustomRender} callback */
    _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void;
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
    compileMaterial(): Promise<void>;
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="compute"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getShaderCode(shaderType?: FullShadersType): string;
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="compute"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getAddedShaderCode(shaderType?: FullShadersType): string;
    /**
     * Check whether we're currently accessing one of the buffer and therefore can't render our material
     * @readonly
     */
    get hasMappedBuffer(): boolean;
    /**
     * If we defined a custom render function instead of the default one, register the callback
     * @param callback - callback to run instead of the default behaviour, which is to set the [bind groups]{@link ComputeMaterial#bindGroups} and dispatch the work groups based on the [default dispatch size]{@link ComputeMaterial#dispatchSize}
     */
    useCustomRender(callback: (pass: GPUComputePassEncoder) => void): void;
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
