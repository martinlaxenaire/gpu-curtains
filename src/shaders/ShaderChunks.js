import get_scaled_uv from './chunks/get_scaled_uv.wgsl'
import get_scaled_video_uv from './chunks/get_scaled_video_uv.wgsl'

export const ShaderChunks = {
  vertex: {
    get_scaled_uv,
    get_scaled_video_uv,
  },
  fragment: {
    get_scaled_uv,
    get_scaled_video_uv,
  },
}
