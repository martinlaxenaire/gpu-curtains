import { RenderMaterialAttributes, RenderMaterialRenderingOptions } from '../materials/RenderMaterial'
import { MaterialBindGroups, MaterialShaders } from '../materials/Material'

export interface RenderPipelineEntryBuffersParams {
  attributes: RenderMaterialAttributes
  bindGroups: MaterialBindGroups
}

export interface RenderPipelineEntryBaseParams extends RenderMaterialRenderingOptions {
  label?: string
  shaders?: MaterialShaders
}
