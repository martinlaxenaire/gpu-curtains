import { MaterialBindGroups, MaterialShaders, MaterialShadersType, FullShadersType } from '../materials/Material'
import { RenderMaterialGeometryAttribute, RenderMaterialRenderingOptions } from '../materials/RenderMaterial'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'

interface PipelineEntryShader {
  head?: string
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryOptions {
  label: string
  shaders: MaterialShaders
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

  flushPipelineEntry(newBindGroups: MaterialBindGroups)
  setPipelineEntry()
}
