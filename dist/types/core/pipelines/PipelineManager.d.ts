/// <reference types="dist" />
import { RenderPipelineEntry } from './RenderPipelineEntry';
import { ComputePipelineEntry } from './ComputePipelineEntry';
import { Renderer } from '../../utils/renderer-utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RenderPipelineEntryBaseParams } from '../../types/core/pipelines/RenderPipelineEntry';
import { PipelineEntryBaseParams } from '../../types/core/pipelines/PipelineEntry';
export type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry;
export declare class PipelineManager {
    type: string;
    renderer: Renderer;
    currentPipelineIndex: number | null;
    pipelineEntries: AllowedPipelineEntries[];
    constructor({ renderer }: {
        renderer: Renderer | GPUCurtains;
    });
    isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null;
    createRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry;
    createComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry;
    setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries): void;
    resetCurrentPipeline(): void;
}
