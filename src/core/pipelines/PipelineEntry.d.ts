import { MaterialBindGroups, MaterialGeometryAttributes } from '../Material'
import { ShadersType, MeshShadersOptions, FullShadersType } from '../meshes/Mesh'
import { GPUCurtainsRenderer } from '../../curtains/renderer/GPUCurtainsRenderer'

interface PipelineEntryShader {
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryProps {
  renderer: GPUCurtainsRenderer
  label?: string | null
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
  }

  constructor({ renderer, label, geometryAttributes, bindGroups, shaders }: PipelineEntryProps)

  setPipelineEntryBindGroups(bindGroups: MaterialBindGroups)

  patchShaders()
  createShaderModule({ code: string, type: ShadersType }): GPUShaderModule
  createShaders()

  createPipelineLayout()
  createRenderPipeline()
  flushPipelineEntry(newBindGroups: MaterialBindGroups)

  setPipelineEntry()
}
