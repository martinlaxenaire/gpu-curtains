import { MaterialShadersType } from '../core/materials/Material'

export type ShaderChunks = Record<MaterialShadersType, Record<string, string>>
export type ProjectedShaderChunks = Record<MaterialShadersType, Record<string, string>>
