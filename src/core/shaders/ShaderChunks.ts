import { RenderMaterialShadersType } from '../../types/core/materials/Material'
import get_output_position from './chunks/get_output_position.wgsl'
import get_scaled_uv from './chunks/get_uv_cover.wgsl'
import get_vertex_to_uv_coords from './chunks/get_vertex_to_uv_coords.wgsl'

export type ShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>
export type ProjectedShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>

export const ShaderChunks = {
  vertex: {
    get_scaled_uv,
  },
  fragment: {
    get_scaled_uv,
    get_vertex_to_uv_coords,
  },
} as ShaderChunks

export const ProjectedShaderChunks = {
  vertex: {
    get_output_position,
  },
  fragment: {},
} as ProjectedShaderChunks
