import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { RenderPipelineEntry, RenderPipelineEntryBaseParams } from './RenderPipelineEntry'
import { ComputePipelineEntry } from './ComputePipelineEntry'
import { Renderer } from '../../types/renderer-utils'

type AllowedPipelineEntries = RenderPipelineEntry | ComputePipelineEntry

export class PipelineManager {
  renderer: Renderer
  currentPipelineIndex: number | null
  pipelineEntries: PipelineEntry[]

  constructor({ renderer: Renderer })

  isSameRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry | null
  createRenderPipeline(parameters: RenderPipelineEntryBaseParams): RenderPipelineEntry

  createComputePipeline(parameters: PipelineEntryBaseParams): ComputePipelineEntry

  setCurrentPipeline(pass: GPURenderPassEncoder | GPUComputePassEncoder, pipelineEntry: AllowedPipelineEntries)
  resetCurrentPipeline()
}
