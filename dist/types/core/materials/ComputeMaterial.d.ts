/// <reference types="@webgpu/types" />
import { Material } from './Material';
import { ComputeMaterialOptions, ComputeMaterialParams, FullShadersType } from '../../types/Materials';
import { Renderer } from '../renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { ComputePipelineEntry } from '../pipelines/ComputePipelineEntry';
/**
 * Create a {@link Material} specifically built to run computations on the GPU. Internally used by {@link core/computePasses/ComputePass.ComputePass | ComputePass}.
 *
 * ## Compute pipeline
 *
 * A {@link ComputeMaterial} automatically creates a {@link ComputePipelineEntry}. Once all the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} have been created, they are sent with the compute shader code to the {@link ComputePipelineEntry}, which is in turns responsible for creating the {@link GPUComputePipeline}.
 *
 * After the {@link GPUComputePipeline} has been successfully compiled, the {@link ComputeMaterial} is considered to be ready and it can start running the compute shader computations.
 *
 */
export declare class ComputeMaterial extends Material {
    /** {@link ComputePipelineEntry | Compute pipeline entry} used by this {@link ComputeMaterial}. */
    pipelineEntry: ComputePipelineEntry;
    /** Options used to create this {@link ComputeMaterial}. */
    options: ComputeMaterialOptions;
    /** Default work group dispatch size to use with this {@link ComputeMaterial}. */
    dispatchSize?: number | number[];
    /** function assigned to the {@link useCustomRender} callback. */
    _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void;
    /**
     * ComputeMaterial constructor
     * @param renderer - {@link Renderer} class object or {@link GPUCurtains} class object used to create this {@link ComputeMaterial}.
     * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}.
     */
    constructor(renderer: Renderer | GPUCurtains, parameters: ComputeMaterialParams);
    /**
     * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link ComputePipelineEntry} from cache or if we should create a new one.
     */
    setPipelineEntry(): void;
    /**
     * Compile the {@link ComputePipelineEntry}.
     */
    compilePipelineEntry(): Promise<void>;
    /**
     * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline.
     */
    compileMaterial(): Promise<void>;
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="compute"] - Shader to get the code from.
     * @returns - The corresponding shader code.
     */
    getShaderCode(shaderType?: FullShadersType): Promise<string>;
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline. Can wait for the {@link pipelineEntry} to be compiled if that's not already the case.
     * @param [shaderType="compute"] - Shader to get the code from
     * @returns - The corresponding shader code
     */
    getAddedShaderCode(shaderType?: FullShadersType): Promise<string>;
    /**
     * If a custom render function has been defined instead of the default one, register the callback
     * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     */
    useCustomRender(callback: (pass: GPUComputePassEncoder) => void): void;
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups.
     * @param pass - Current compute pass encoder.
     */
    render(pass: GPUComputePassEncoder): void;
    /**
     * Copy all writable binding buffers that need it.
     * @param commandEncoder - Current command encoder.
     */
    copyBufferToResult(commandEncoder: GPUCommandEncoder): void;
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names.
     * @param parameters - Parameters used to get the result.
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result.
     * @param parameters.bufferElementName - Pptional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element.
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}.
     */
    getComputeResult({ bindingName, bufferElementName, }: {
        bindingName?: string;
        bufferElementName?: string;
    }): Promise<Float32Array>;
}
