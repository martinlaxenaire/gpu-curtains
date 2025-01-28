import { RenderMaterialShadersType } from '../../types/Materials'
import { getPositionHelpers } from './chunks/vertex/head/get-position-helpers'
import { getNormalHelpers } from './chunks/vertex/head/get-normal-helpers'
import { getUVCover } from './chunks/fragment/head/get-uv-cover-helper'
import { getVertexToUVCoords } from './chunks/fragment/head/get-vertex-to-UV-coords-helpers'

/** Defines {@link ShaderChunks} object structure */
export type ShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>
/** Defines {@link ProjectedShaderChunks} object structure */
export type ProjectedShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>

/**
 * Useful WGSL code chunks added to the vertex and/or fragment shaders
 */
export const ShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
    getUVCover,
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {
    /** Applies given texture matrix (`mat4x4f`) to given uv coordinates (`vec2f`). */
    getUVCover,
    /** Convert vertex position as `vec2f` or `vec3f` to uv coordinates `vec2f`. */
    getVertexToUVCoords,
  },
} as ShaderChunks

/**
 * Useful WGSL code chunks added to the projected Meshes vertex and/or fragment shaders
 */
export const ProjectedShaderChunks = {
  /** WGSL code chunks added to the vertex shader */
  vertex: {
    /** Get output `position` (`vec4f`) vector by applying model view projection matrix to the attribute `position` (`vec3f`) vector. */
    getPositionHelpers,
    /** Get `normal` (`vec3f`) in world or view space. */
    getNormalHelpers,
  },
  /** WGSL code chunks added to the fragment shader */
  fragment: {},
} as ProjectedShaderChunks
