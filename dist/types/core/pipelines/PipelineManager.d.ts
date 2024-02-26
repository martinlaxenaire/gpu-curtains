/// <reference types="dist" />
import { RenderPipelineEntry } from './RenderPipelineEntry';
import { ComputePipelineEntry } from './ComputePipelineEntry';
import { PipelineEntryParams, RenderPipelineEntryParams } from '../../types/PipelineEntries';
import { ShaderOptions } from '../../types/Materials';
/** Defines all types of allowed {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} class objects */
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry;
/**
 * Used to create and keep track of both {@link ComputePipelineEntry} and {@link RenderPipelineEntry}.<br>
 * Perform checks to eventually use a cached pipeline entry instead of creating a new one.<br>
 * The end goal is to cache pipelines and reuse them (as well as bind groups).<br>
 * Also responsible for setting the current pass encoder pipeline in order to avoid redundant setPipeline calls.<br>
 * Created internally by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager | GPUDeviceManager}.<br>
 * @see {@link https://toji.dev/webgpu-best-practices/bind-groups#grouping-resources-based-on-frequency-of-change | WebGPU Bind Group best practices}
 */
export declare class PipelineManager {
    /** The type of the {@link PipelineManager} */
    type: string;
    /** Keep track of the current bound pipeline in order to avoid redundant setPipeline calls */
    currentPipelineIndex: number | null;
    /** Array of already created {@link ComputePipelineEntry} and {@link RenderPipelineEntry} */
    pipelineEntries: AllowedPipelineEntries[];
    constructor();
    /**
     * Compare two {@link ShaderOptions | shader objects}
     * @param shaderA - first {@link ShaderOptions | shader object} to compare
     * @param shaderB - second {@link ShaderOptions | shader object} to compare
     * @returns - whether the two {@link ShaderOptions | shader objects} code and entryPoint match
     */
    compareShaders(shaderA: ShaderOptions, shaderB: ShaderOptions): boolean;
    /**
     * Checks if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
     * @returns - the found {@link RenderPipelineEntry}, or null if not found
     */
    isSameRenderPipeline(parameters: RenderPipelineEntryParams): RenderPipelineEntry | null;
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created
     */
    createRenderPipeline(parameters: RenderPipelineEntryParams): RenderPipelineEntry;
    /**
     * Checks if the provided {@link PipelineEntryParams | parameters} belongs to an already created {@link ComputePipelineEntry}.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
     * @returns - the found {@link ComputePipelineEntry}, or null if not found
     */
    isSameComputePipeline(parameters: PipelineEntryParams): ComputePipelineEntry;
    /**
     * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(parameters: PipelineEntryParams): ComputePipelineEntry;
    /**
     * Check if the given {@link AllowedPipelineEntries | PipelineEntry} is already set, if not set it
     * @param pass - current pass encoder
     * @param pipelineEntry - the {@link AllowedPipelineEntries | PipelineEntry} to set
     */
    setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries): void;
    /**
     * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
     */
    resetCurrentPipeline(): void;
}
