/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { PipelineEntryOptions, PipelineEntryParams, PipelineEntryStatus } from '../../types/core/pipelines/PipelineEntry';
import { AllowedBindGroups } from '../../types/BindGroups';
import { MaterialShadersType } from '../../types/Materials';
export declare class PipelineEntry {
    type: string;
    renderer: Renderer;
    readonly index: number;
    layout: GPUPipelineLayout | null;
    pipeline: GPURenderPipeline | GPUComputePipeline | null;
    status: PipelineEntryStatus;
    options: PipelineEntryOptions;
    bindGroups: AllowedBindGroups[];
    constructor(parameters: PipelineEntryParams);
    get ready(): boolean;
    get canCompile(): boolean;
    setPipelineEntryBindGroups(bindGroups: any): void;
    /** SHADERS **/
    createShaderModule({ code, type }: {
        code: string;
        type: MaterialShadersType;
    }): GPUShaderModule;
    /** SETUP **/
    createShaders(): void;
    createPipelineLayout(): void;
    createPipelineDescriptor(): void;
    flushPipelineEntry(newBindGroups?: AllowedBindGroups[]): void;
    setPipelineEntry(): void;
}
