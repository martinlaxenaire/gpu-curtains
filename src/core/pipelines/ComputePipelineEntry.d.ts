import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { MaterialBindGroups } from '../materials/Material'

interface PipelineEntryBuffersParams {
  bindGroups: MaterialBindGroups[]
}

export class ComputePipelineEntry extends PipelineEntry {
  descriptor: GPUComputePipelineDescriptor | null

  constructor(parameters: PipelineEntryBaseParams)

  setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams)

  patchShaders()
  createShaders()

  createPipelineDescriptor()

  createComputePipeline()
  createComputePipelineAsync(): Promise<void>

  setPipelineEntry()
}
