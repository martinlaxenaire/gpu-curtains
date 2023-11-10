/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { PipelineEntryOptions, PipelineEntryParams, PipelineEntryStatus } from '../../types/PipelineEntries';
import { AllowedBindGroups } from '../../types/BindGroups';
import { MaterialShadersType } from '../../types/Materials';
/**
 * PipelineEntry class:
 * Used as a base class to create a pipeline entry.
 * PipelineEntry roles are:
 * - Patch the given {@link Material} shaders code and create the corresponding {@link GPUShaderModule}.
 * - Create a [Pipeline layout]{@link GPUPipelineLayout} with the given [bind groups]{@link Material#bindGroups}
 * - Create a GPU pipeline
 */
export declare class PipelineEntry {
    /** The type of the {@link PipelineEntry} */
    type: string;
    /** The [renderer]{@link Renderer} used to create this {@link PipelineEntry} */
    renderer: Renderer;
    /** Index of this {@link PipelineEntry}, i.e. creation order */
    readonly index: number;
    /** [Pipeline layout]{@link GPUPipelineLayout} created based on the given [bind groups]{@link PipelineEntry#bindGroups} */
    layout: GPUPipelineLayout | null;
    /** The GPU pipeline */
    pipeline: GPURenderPipeline | GPUComputePipeline | null;
    /** The pipeline [compilation status]{@link PipelineEntryStatus} */
    status: PipelineEntryStatus;
    /** Options used to create this {@link PipelineEntry} */
    options: PipelineEntryOptions;
    /** [bind groups]{@link Material#bindGroups} used to patch the shaders and create the [pipeline layout]{@link PipelineEntry#layout} */
    bindGroups: AllowedBindGroups[];
    /**
     * PipelineEntry constructor
     * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link PipelineEntry}
     */
    constructor(parameters: PipelineEntryParams);
    /**
     * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready, i.e. successfully compiled
     * @readonly
     */
    get ready(): boolean;
    /**
     * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready to be compiled, i.e. we have already not already tried to compile it, and it's not currently compiling neither
     * @readonly
     */
    get canCompile(): boolean;
    /**
     * Set our [pipeline entry bind groups]{@link PipelineEntry#bindGroups}
     * @param bindGroups - [bind groups]{@link Material#bindGroups} to use with this {@link PipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups: any): void;
    /**
     * Create a {@link GPUShaderModule}
     * @param parameters - Parameters used
     * @param parameters.code - patched WGSL code string
     * @param parameters.type - [shader type]{@link MaterialShadersType}
     * @returns - compiled {@link GPUShaderModule} if successful
     */
    createShaderModule({ code, type }: {
        code: string;
        type: MaterialShadersType;
    }): GPUShaderModule;
    /**
     * Create the {@link PipelineEntry} shaders
     */
    createShaders(): void;
    /**
     * Create the [pipeline entry layout]{@link PipelineEntry#layout}
     */
    createPipelineLayout(): void;
    /**
     * Create the {@link PipelineEntry} descriptor
     */
    createPipelineDescriptor(): void;
    /**
     * Flush a {@link PipelineEntry}, i.e. reset its [bind groups]{@link PipelineEntry#bindGroups}, [layout]{@link PipelineEntry#layout} and descriptor and recompile the [pipeline]{@link PipelineEntry#pipeline}
     * Used when one of the bind group or rendering property has changed
     * @param newBindGroups - new [bind groups]{@link PipelineEntry#bindGroups} in case they have changed
     */
    flushPipelineEntry(newBindGroups?: AllowedBindGroups[]): void;
    /**
     * Set up a [pipeline]{@link PipelineEntry#pipeline} by creating the shaders, the [layout]{@link PipelineEntry#layout} and the descriptor
     */
    setPipelineEntry(): void;
}
