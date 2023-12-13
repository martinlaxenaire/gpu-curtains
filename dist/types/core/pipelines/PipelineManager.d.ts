/// <reference types="dist" />
import { RenderPipelineEntry } from './RenderPipelineEntry';
import { ComputePipelineEntry } from './ComputePipelineEntry';
import { PipelineEntryBaseParams, PipelineEntryParams, RenderPipelineEntryBaseParams, RenderPipelineEntryParams } from '../../types/PipelineEntries';
/** Defines all types of allowed {@link PipelineEntry} class objects */
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry;
/**
 * PipelineManager class:
 * Used to create and keep track of both {@link ComputePipelineEntry} and {@link RenderPipelineEntry}.
 * Perform checks to eventually use a cached pipeline entry instead of creating a new one.
 * Also responsible for setting the current pass encoder pipeline in order to avoid redundant setPipeline calls
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
     * Checks if the provided [parameters]{@link RenderPipelineEntryBaseParams} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
     * @returns - the found {@link RenderPipelineEntry}, or null if not found
     */
    isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null;
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given [parameters]{@link RenderPipelineEntryBaseParams}.
     * Use it if found, else create a new one and add it to the [pipelineEntries]{@link PipelineManager#pipelineEntries} array.
     * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created
     */
    createRenderPipeline(parameters: RenderPipelineEntryParams): RenderPipelineEntry;
    /**
     * Checks if the provided [parameters]{@link PipelineEntryBaseParams} belongs to an already created {@link ComputePipelineEntry}.
     * @param parameters - [ComputePipelineEntry parameters]{@link PipelineEntryBaseParams}
     * @returns - the found {@link ComputePipelineEntry}, or null if not found
     */
    isSameComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry;
    /**
     * Create a new {@link ComputePipelineEntry}
     * @param parameters - [PipelineEntry parameters]{@link PipelineEntryBaseParams}
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(parameters: PipelineEntryParams): ComputePipelineEntry;
    /**
     * Check if the given [pipeline entry]{@link AllowedPipelineEntries} is already set, if not set it
     * @param pass - current pass encoder
     * @param pipelineEntry - the [pipeline entry]{@link AllowedPipelineEntries} to set
     */
    setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries): void;
    /**
     * Reset the [current pipeline index]{@link PipelineManager#currentPipelineIndex} so the next [pipeline entry]{@link AllowedPipelineEntries} will be set for sure
     */
    resetCurrentPipeline(): void;
}
