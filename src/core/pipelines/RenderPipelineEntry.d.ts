import { PipelineEntry, PipelineEntryShaders } from './PipelineEntry'
import { RenderMaterialGeometryAttribute, RenderMaterialRenderingOptions } from '../materials/RenderMaterial'
import { MaterialBindGroups, MaterialShaders } from '../materials/Material'

interface RenderPipelineEntryBuffersParams {
  geometryAttributes: RenderMaterialGeometryAttribute
  bindGroups: MaterialBindGroups
}

interface RenderPipelineEntryBaseParams extends RenderMaterialRenderingOptions {
  label?: string
  shaders?: MaterialShaders
}

interface RenderPipelineEntryOptions extends RenderMaterialRenderingOptions {
  label: string
  shaders: MaterialShaders
}

export class RenderPipelineEntry extends PipelineEntry {
  geometryAttributes: RenderMaterialGeometryAttribute
  options: RenderPipelineEntryOptions

  constructor(parameters: RenderPipelineEntryBaseParams)

  setPipelineEntryBuffers(parameters: RenderPipelineEntryBuffersParams)

  patchShaders()
  createShaders()

  createRenderPipeline()
  setPipelineEntry()
}
