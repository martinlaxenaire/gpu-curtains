import { MaterialBaseProps, MaterialBindGroups, MaterialGeometryAttributes } from '../Material'
import { ShadersType, MeshShadersOptions, FullShadersType } from '../meshes/Mesh'
import { GPUCurtainsRenderer } from '../../curtains/renderer/GPUCurtainsRenderer'

interface PipelineEntryShader {
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryProps extends MaterialBaseProps {
  renderer: GPUCurtainsRenderer
  geometryAttributes: MaterialGeometryAttributes
  bindGroups: MaterialBindGroups
  shaders: MeshShadersOptions
}

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

  constructor({ renderer, label, geometryAttributes, bindGroups, shaders, cullMode }: PipelineEntryProps)

  setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)

  patchShaders()
  createShaderModule({ code: string, type: ShadersType }): GPUShaderModule
  createShaders()

  createPipelineLayout()
  createRenderPipeline()
  flushPipelineEntry(newBindGroups: MaterialBindGroups)

  setPipelineEntry()
}
