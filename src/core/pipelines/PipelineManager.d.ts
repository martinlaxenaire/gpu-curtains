import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { RenderPipelineEntry, RenderPipelineEntryBaseParams } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import { GPURenderer } from '../renderers/GPURenderer'

type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

export class PipelineManager {
  renderer: GPURenderer
  currentPipelineIndex: number | null
  pipelineEntries: PipelineEntry[]

  constructor({ renderer: GPURenderer })

  isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null
  createRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry

  createComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry

  setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries)
  resetCurrentPipeline()
}
