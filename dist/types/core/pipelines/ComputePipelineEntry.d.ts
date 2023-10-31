/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryBuffersParams } from '../../types/core/pipelines/ComputePipelineEntry';
import { PipelineEntryShaders, PipelineEntryParams } from '../../types/core/pipelines/PipelineEntry';
export declare class ComputePipelineEntry extends PipelineEntry {
    shaders: PipelineEntryShaders;
    descriptor: GPUComputePipelineDescriptor | null;
    constructor(parameters: PipelineEntryParams);
    setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams): void;
    /** SHADERS **/
    patchShaders(): void;
    /** SETUP **/
    createShaders(): void;
    createPipelineDescriptor(): void;
    createComputePipeline(): void;
    createComputePipelineAsync(): Promise<void>;
    setPipelineEntry(): void;
}
