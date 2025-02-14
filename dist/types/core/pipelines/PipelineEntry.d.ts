/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { PipelineEntryOptions, PipelineEntryParams, PipelineEntryStatus } from '../../types/PipelineEntries';
import { AllowedBindGroups } from '../../types/BindGroups';
import { MaterialShadersType } from '../../types/Materials';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Used as a base class to create a pipeline entry.<br>
 * {@link PipelineEntry} roles are:
 * - Patch the given {@link core/materials/Material.Material | Material} shaders code and create the corresponding {@link GPUShaderModule}.
 * - Create a {@link GPUPipelineLayout | pipeline layout} with the given {@link core/materials/Material.Material#bindGroups | bind groups}
 * - Create a GPU pipeline
 */
export declare class PipelineEntry {
    /** The type of the {@link PipelineEntry} */
    type: string;
    /** The universal unique id of the {@link PipelineEntry}. */
    readonly uuid: string;
    /** The {@link Renderer} used to create this {@link PipelineEntry} */
    renderer: Renderer;
    /** Index of this {@link PipelineEntry}, i.e. creation order */
    readonly index: number;
    /** {@link GPUPipelineLayout | Pipeline layout} created based on the given {@link bindGroups | bind groups} */
    layout: GPUPipelineLayout | null;
    /** The GPU pipeline */
    pipeline: GPURenderPipeline | GPUComputePipeline | null;
    /** The pipeline {@link PipelineEntryStatus | compilation status} */
    status: PipelineEntryStatus;
    /** Options used to create this {@link PipelineEntry} */
    options: PipelineEntryOptions;
    /** {@link core/materials/Material.Material#bindGroups | bind groups} used to patch the shaders and create the {@link PipelineEntry#layout | pipeline layout} */
    bindGroups: AllowedBindGroups[];
    /**
     * PipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link PipelineEntry}
     */
    constructor(parameters: PipelineEntryParams);
    /**
     * Set or reset this {@link PipelineEntry} {@link PipelineEntry.renderer | renderer}.
     * @param renderer - New {@link Renderer} or {@link GPUCurtains} instance to use.
     */
    setRenderer(renderer: Renderer | GPUCurtains): void;
    /**
     * Get whether the {@link pipeline} is ready, i.e. successfully compiled
     * @readonly
     */
    get ready(): boolean;
    /**
     * Get whether the {@link pipeline} is ready to be compiled, i.e. we have not already tried to compile it, and it's not currently compiling neither
     * @readonly
     */
    get canCompile(): boolean;
    /**
     * Create a {@link GPUShaderModule}
     * @param parameters - Parameters used
     * @param parameters.code - patched WGSL code string
     * @param parameters.type - {@link MaterialShadersType | shader type}
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
     * Create the pipeline entry {@link layout}
     */
    createPipelineLayout(): void;
    /**
     * Create the {@link PipelineEntry} descriptor
     */
    createPipelineDescriptor(): void;
    /**
     * Flush a {@link PipelineEntry}, i.e. reset its {@link bindGroups | bind groups}, {@link layout} and descriptor and recompile the {@link pipeline}
     * Used when one of the bind group or rendering property has changed
     * @param newBindGroups - new {@link bindGroups | bind groups} in case they have changed
     */
    flushPipelineEntry(newBindGroups?: AllowedBindGroups[]): void;
    /**
     * Set up a {@link pipeline} by creating the shaders, the {@link layout} and the descriptor
     */
    compilePipelineEntry(): void;
}
