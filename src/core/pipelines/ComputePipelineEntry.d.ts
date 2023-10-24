import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'

interface PipelineEntryBuffersParams {
  bindGroups: Array<BindGroup | TextureBindGroup>
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
