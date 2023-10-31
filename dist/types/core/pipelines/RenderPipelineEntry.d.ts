/// <reference types="dist" />
import { PipelineEntry } from './PipelineEntry';
import { PipelineEntryParams, PipelineEntryShaders } from '../../types/core/pipelines/PipelineEntry';
import { RenderPipelineEntryBuffersParams } from '../../types/core/pipelines/RenderPipelineEntry';
import { RenderMaterialAttributes } from '../../types/Materials';
export declare class RenderPipelineEntry extends PipelineEntry {
    shaders: PipelineEntryShaders;
    attributes: RenderMaterialAttributes;
    descriptor: GPURenderPipelineDescriptor | null;
    constructor(parameters: PipelineEntryParams);
    setPipelineEntryBuffers(parameters: RenderPipelineEntryBuffersParams): void;
    /** SHADERS **/
    patchShaders(): void;
    /** SETUP **/
    createShaders(): void;
    createPipelineDescriptor(): void;
    createRenderPipeline(): void;
    createRenderPipelineAsync(): Promise<void>;
    setPipelineEntry(): void;
}
