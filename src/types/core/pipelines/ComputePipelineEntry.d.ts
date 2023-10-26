//import { PipelineEntry, PipelineEntryBaseParams } from './PipelineEntry'
// import { MaterialBindGroups } from '../materials/Material'
import { AllowedBindGroups } from '../bindGroups/BindGroup'

export interface PipelineEntryBuffersParams {
  bindGroups: AllowedBindGroups[]
}

// export class ComputePipelineEntry extends PipelineEntry {
//   descriptor: GPUComputePipelineDescriptor | null
//
//   constructor(parameters: PipelineEntryBaseParams)
//
//   setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams)
//
//   patchShaders()
//   createShaders()
//
//   createPipelineDescriptor()
//
//   createComputePipeline()
//   createComputePipelineAsync(): Promise<void>
//
//   setPipelineEntry()
// }
