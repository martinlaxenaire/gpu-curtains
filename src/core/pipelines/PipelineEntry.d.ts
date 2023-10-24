import { MaterialBindGroups, MaterialShaders, MaterialShadersType, FullShadersType } from '../materials/Material'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'

interface PipelineEntryShader {
  head?: string
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryOptions {
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

interface PipelineEntryParams extends PipelineEntryBaseParams {
  renderer: GPUCurtainsRenderer
}

declare let pipelineId: number

export class PipelineEntry {
  type: string
  renderer: GPUCurtainsRenderer
  readonly index: number
  layout: GPUBindGroupLayout | null
  pipeline: GPURenderPipeline | GPUComputePipeline | null
  ready: boolean

  shaders: PipelineEntryShaders
  options: PipelineEntryBaseParams

  constructor(parameters: PipelineEntryParams)

  setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)

  createShaderModule({ code: string, type: MaterialShadersType }): GPUShaderModule
  createShaders()

  createPipelineLayout()
  createPipelineDescriptor()

  flushPipelineEntry(newBindGroups: MaterialBindGroups)
  setPipelineEntry()
}
