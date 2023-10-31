/// <reference types="dist" />
import { MaterialShaders } from '../../Materials';
import { Renderer } from '../../../utils/renderer-utils';
import { GPUCurtains } from '../../../curtains/GPUCurtains';
export interface PipelineEntryShader {
    head?: string;
    code: string;
    module: GPUShaderModule | null;
}
export interface PipelineEntryShaders {
    vertex?: PipelineEntryShader;
    fragment?: PipelineEntryShader;
    compute?: PipelineEntryShader;
    full?: PipelineEntryShader;
}
export interface PipelineEntryOptions {
    label: string;
    useAsync?: boolean;
    shaders: MaterialShaders;
    cullMode?: GPUCullMode;
    depthCompare?: GPUCompareFunction;
    depthWriteEnabled?: boolean;
    transparent?: boolean;
    verticesOrder?: GPUFrontFace;
    useProjection?: boolean;
}
export type PipelineEntryBaseParams = Partial<PipelineEntryOptions>;
export interface PipelineEntryParams extends PipelineEntryBaseParams {
    renderer: Renderer | GPUCurtains;
}
export interface PipelineEntryStatus {
    compiling: boolean;
    compiled: boolean;
    error: null | string;
}
