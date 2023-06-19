import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { GPURenderer } from '../renderers/GPURenderer'
import { Renderer } from '../../types/renderer-utils'

export class PipelineManager {
  renderer: GPURenderer
  currentPipelineID: number | null
  pipelineEntries: PipelineEntry[]

  constructor({ renderer: GPURenderer })

  isSamePipeline(parameters: PipelineEntryBaseParams): PipelineEntry | null

  createRenderPipeline(parameters: PipelineEntryBaseParams): PipelineEntry

  setCurrentPipeline(pass: GPURenderPassEncoder, pipelineEntry: PipelineEntry)
}