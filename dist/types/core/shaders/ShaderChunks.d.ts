import { RenderMaterialShadersType } from '../../types/Materials';
export type ShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>;
export type ProjectedShaderChunks = Record<RenderMaterialShadersType, Record<string, string>>;
export declare const ShaderChunks: ShaderChunks;
export declare const ProjectedShaderChunks: ProjectedShaderChunks;
