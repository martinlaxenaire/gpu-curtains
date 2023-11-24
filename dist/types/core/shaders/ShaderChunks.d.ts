import { RenderMaterialShadersType } from '../../types/Materials';
/** Defines {@link ShaderChunks} object structure */
export type ShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>;
/** Defines {@link ProjectedShaderChunks} object structure */
export type ProjectedShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>;
/**
 * Useful WGSL code chunks added to the vertex and/or fragment shaders
 */
export declare const ShaderChunks: ShaderChunks;
/**
 * Useful WGSL code chunks added to the projected Meshes vertex and/or fragment shaders
 */
export declare const ProjectedShaderChunks: ProjectedShaderChunks;
