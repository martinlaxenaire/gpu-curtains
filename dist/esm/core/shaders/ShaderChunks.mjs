import { getPositionHelpers } from './chunks/vertex/head/get-position-helpers.mjs';
import { getNormalHelpers } from './chunks/vertex/head/get-normal-helpers.mjs';
import { getUVCover } from './chunks/fragment/head/get-uv-cover-helper.mjs';
import { getVertexToUVCoords } from './chunks/fragment/head/get-vertex-to-UV-coords-helpers.mjs';

const ShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
    getUVCover
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {
    /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
    getUVCover,
    /** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
    getVertexToUVCoords
  }
};
const ProjectedShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Get output `position` (`vec4f`) vector by applying model view projection matrix to the attribute `position` (`vec3f`) vector. */
    getPositionHelpers,
    /** Get `normal` (`vec3f`) in world or view space. */
    getNormalHelpers
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {}
};

export { ProjectedShaderChunks, ShaderChunks };
