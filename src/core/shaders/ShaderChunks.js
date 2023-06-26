import get_output_position from './chunks/get_output_position.wgsl'
import get_scaled_uv from './chunks/get_scaled_uv.wgsl'

export const ShaderChunks = {}

export const ProjectedShaderChunks = {
  vertex: {
    get_output_position,
    get_scaled_uv,
  },
  fragment: {
    get_scaled_uv,
  },
}
