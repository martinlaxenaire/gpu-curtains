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
