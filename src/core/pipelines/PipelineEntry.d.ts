import { MaterialBindGroups, MaterialGeometryAttributes, MaterialRenderingOptions } from '../materials/Material'
import { GPUCurtainsRenderer } from '../../curtains/renderers/GPUCurtainsRenderer'
import { ShadersType, FullShadersType, MeshShadersOptions } from '../meshes/MeshBaseMixin'

interface PipelineEntryShader {
  head?: string
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryBaseParams extends MaterialRenderingOptions {
  label: string
  shaders: MeshShadersOptions
}

interface PipelineEntryBuffersParams {
  geometryAttributes: MaterialGeometryAttributes
  bindGroups: MaterialBindGroups
}

interface PipelineEntryParams extends PipelineEntryBaseParams {
  renderer: GPUCurtainsRenderer
}

declare let pipelineId: number

export class PipelineEntry {
  type: string
  renderer: GPUCurtainsRenderer
  readonly index: number
  layout: GPUBindGroupLayout | null
  pipeline: GPUPipelineBase | null
  ready: boolean
  geometryAttributes: MaterialGeometryAttributes
  shaders: PipelineEntryShaders
  options: PipelineEntryBaseParams

  constructor(parameters: PipelineEntryParams)

  setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)
  setPipelineEntryBuffers(parameters: PipelineEntryBuffersParams)

  patchShaders()
  createShaderModule({ code: string, type: ShadersType }): GPUShaderModule
  createShaders()

  createPipelineLayout()
  createRenderPipeline()
  flushPipelineEntry(newBindGroups: MaterialBindGroups)

  setPipelineEntry()
}
