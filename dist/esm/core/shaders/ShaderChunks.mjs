import get_output_position from './chunks/helpers/get_output_position.wgsl.mjs';
import get_normals from './chunks/helpers/get_normals.wgsl.mjs';
import get_uv_cover from './chunks/helpers/get_uv_cover.wgsl.mjs';
import get_vertex_to_uv_coords from './chunks/helpers/get_vertex_to_uv_coords.wgsl.mjs';

const ShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Applies given texture matrix to given uv coordinates */
    get_uv_cover
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {
    /** Applies given texture matrix to given uv coordinates */
    get_uv_cover,
    /** Convert vertex position to uv coordinates */
    get_vertex_to_uv_coords
  }
};
const ProjectedShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Get output vec4f position vector by applying model view projection matrix to vec3f attribute position vector */
    get_output_position,
    /** Get vec3f normals in world or view space */
    get_normals
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {}
};

export { ProjectedShaderChunks, ShaderChunks };
