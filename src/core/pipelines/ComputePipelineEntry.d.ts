import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
import { BindGroup } from '../bindGroups/BindGroup'
import { TextureBindGroup } from '../bindGroups/TextureBindGroup'
import { WorkBindGroup } from '../bindGroups/WorkBindGroup'

interface PipelineEntryBuffersParams {
  bindGroups: Array<BindGroup | TextureBindGroup | WorkBindGroup>
}

export class ComputePipelineEntry extends PipelineEntry {
  constructor(parameters: PipelineEntryBaseParams)

  setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams)

  patchShaders()
  createShaders()

  createComputePipeline()
  setPipelineEntry()
}
