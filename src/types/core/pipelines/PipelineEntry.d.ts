// import { MaterialBindGroups, MaterialShaders, FullShadersType } from '../materials/Material'
// import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { MaterialShaders, FullShadersType } from '../materials/Material'
import { Renderer } from '../../../utils/renderer-utils'
import { GPUCurtains } from '../../../curtains/GPUCurtains'

export interface PipelineEntryShader {
  head?: string
  code: string
  module: GPUShaderModule | null
}

//export type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>
export interface PipelineEntryShaders {
  [shaderType: FullShadersType]: PipelineEntryShader
}

export interface PipelineEntryOptions {
  label: string
  useAsync?: boolean
  shaders: MaterialShaders
  cullMode?: GPUCullMode
  depthCompare?: GPUCompareFunction
  depthWriteEnabled?: boolean
  transparent?: boolean
  verticesOrder?: GPUFrontFace
  useProjection?: boolean
}

export type PipelineEntryBaseParams = Partial<PipelineEntryOptions>

export interface PipelineEntryParams extends PipelineEntryBaseParams {
  renderer: Renderer | GPUCurtains
}

export interface PipelineEntryStatus {
  compiling: boolean
  compiled: boolean
  error: null | string
}

// declare let pipelineId: number
//
// export class PipelineEntry {
//   type: string
//   renderer: GPUCurtainsRenderer
//   readonly index: number
//   layout: GPUBindGroupLayout | null
//   pipeline: GPURenderPipeline | GPUComputePipeline | null
//   status: PipelineEntryStatus
//
//   get ready(): boolean
//   get canCompile(): boolean
//
//   shaders: PipelineEntryShaders
//   options: PipelineEntryBaseParams
//
//   constructor(parameters: PipelineEntryParams)
//
//   setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)
//
//   createShaderModule({ code: string, type: MaterialShadersType }): GPUShaderModule
//   createShaders()
//
//   createPipelineLayout()
//   createPipelineDescriptor()
//
//   flushPipelineEntry(newBindGroups: MaterialBindGroups)
//   setPipelineEntry()
// }
