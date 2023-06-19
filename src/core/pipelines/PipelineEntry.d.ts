import { MaterialBaseParams, MaterialBindGroups, MaterialGeometryAttributes } from '../Material'
import { GPUCurtainsRenderer } from '../../curtains/renderer/GPUCurtainsRenderer'
import { ShadersType, FullShadersType, MeshShadersOptions } from '../meshes/MeshMixin'

interface PipelineEntryShader {
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryBaseParams extends MaterialBaseParams {
  geometryAttributes: MaterialGeometryAttributes
  bindGroups: MaterialBindGroups
  shaders: MeshShadersOptions
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
}

interface PipelineEntryParams extends PipelineEntryBaseParams {
  renderer: GPUCurtainsRenderer
}

declare let pipelineId: number

export class PipelineEntry {
  type: string
  renderer: GPUCurtainsRenderer
  id: number
  layout: GPUBindGroupLayout | null
  pipeline: GPUPipelineBase | null
  geometryAttributes: MaterialGeometryAttributes
  shaders: PipelineEntryShaders
  options: {
    label: string
    shaders: MeshShadersOptions
    cullMode: GPUCullMode
  }

  constructor(parameters: PipelineEntryParams)

  setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)

  patchShaders()
  createShaderModule({ code: string, type: ShadersType }): GPUShaderModule
  createShaders()

  createPipelineLayout()
  createRenderPipeline()
  flushPipelineEntry(newBindGroups: MaterialBindGroups)

  setPipelineEntry()
}
