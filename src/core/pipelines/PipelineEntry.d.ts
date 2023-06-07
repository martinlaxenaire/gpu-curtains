import { CurtainsRenderer } from '../../utils/renderer-utils'
import { MaterialBindGroups, MaterialGeometryAttributes } from '../Material'
import { ShadersType, MeshShadersOptions, FullShadersType } from '../meshes/Mesh'

interface PipelineEntryShader {
  code: string
  module: GPUShaderModule | null
}

type PipelineEntryShaders = Record<FullShadersType, PipelineEntryShader>

interface PipelineEntryProps {
  renderer: CurtainsRenderer // TODO
  label?: string | null
  geometryAttributes: MaterialGeometryAttributes
  bindGroups: MaterialBindGroups
  shaders: MeshShadersOptions
}

export class PipelineEntry {
  type: string
  renderer: CurtainsRenderer
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
