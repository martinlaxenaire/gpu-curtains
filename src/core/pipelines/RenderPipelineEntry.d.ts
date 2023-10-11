import { PipelineEntry, PipelineEntryShaders } from './PipelineEntry'
import { RenderMaterialAttributes, RenderMaterialRenderingOptions } from '../materials/RenderMaterial'
import { MaterialBindGroups, MaterialShaders } from '../materials/Material'

interface RenderPipelineEntryBuffersParams {
  attributes: RenderMaterialAttributes
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
  attributes: RenderMaterialAttributes
  options: RenderPipelineEntryOptions

  constructor(parameters: RenderPipelineEntryBaseParams)

  setPipelineEntryBuffers(parameters: RenderPipelineEntryBuffersParams)

  patchShaders()
  createShaders()

  createRenderPipeline()
  setPipelineEntry()
}
