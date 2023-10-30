import {
  MaterialBindGroups,
  MaterialShaders,
  RenderMaterialAttributes,
  RenderMaterialRenderingOptions,
} from '../../Materials'

export interface RenderPipelineEntryBuffersParams {
  attributes: RenderMaterialAttributes
  bindGroups: MaterialBindGroups
}

export interface RenderPipelineEntryBaseParams extends RenderMaterialRenderingOptions {
  label?: string
  shaders?: MaterialShaders
}
