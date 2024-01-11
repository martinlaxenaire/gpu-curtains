/// <reference types="dist" />
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
    /** {@link ComputePipelineEntry | Compute pipeline entry} used by this {@link ComputeMaterial} */
    pipelineEntry: ComputePipelineEntry;
    /** Options used to create this {@link ComputeMaterial} */
    options: ComputeMaterialOptions;
    /** Default work group dispatch size to use with this {@link ComputeMaterial} */
    dispatchSize?: number | number[];
    /** function assigned to the {@link useCustomRender} callback */
    _useCustomRenderCallback: (pass: GPUComputePassEncoder) => void;
    /**
     * ComputeMaterial constructor
     * @param renderer - our {@link Renderer} class object
     * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}
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
     * If a custom render function has been defined instead of the default one, register the callback
     * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     */
    useCustomRender(callback: (pass: GPUComputePassEncoder) => void): void;
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
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
     * @param parameters - parameters used to get the result
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
     * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
     * @async
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
     */
    getComputeResult({ bindingName, bufferElementName, }: {
        bindingName?: string;
        bufferElementName?: string;
    }): Promise<Float32Array>;
}
