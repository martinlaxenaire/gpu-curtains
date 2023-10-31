import { AllowedBindGroups, BindGroupInputs } from '../../BindGroups';
import { BindGroup } from '../../../core/bindGroups/BindGroup';
import { Texture } from '../../../core/textures/Texture';
import { RenderTexture } from '../../../core/textures/RenderTexture';
import { RenderMaterialRenderingOptions } from './RenderMaterial';
import { Sampler } from '../../../core/samplers/Sampler';
export type RenderMaterialShadersType = 'vertex' | 'fragment';
export type ComputeMaterialShadersType = 'compute';
export type MaterialShadersType = RenderMaterialShadersType | ComputeMaterialShadersType;
export type FullShadersType = 'full' | MaterialShadersType;
export interface ShaderOptions {
    code: string;
    entryPoint: string;
}
export interface MaterialShaders {
    vertex?: ShaderOptions;
    fragment?: ShaderOptions;
    compute?: ShaderOptions;
}
export interface MaterialBaseParams {
    label?: string;
    shaders?: MaterialShaders;
    useAsyncPipeline?: boolean;
}
export type MaterialBindGroups = AllowedBindGroups[];
export interface MaterialInputBindingsParams {
    inputs?: BindGroupInputs;
    bindGroups?: BindGroup[];
    samplers?: Sampler[];
}
export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {
}
export interface MaterialOptions {
    label: string;
    shaders: MaterialShaders;
    useAsyncPipeline?: boolean;
    inputs?: BindGroupInputs;
    bindGroups?: BindGroup[];
    samplers?: Sampler[];
    rendering?: RenderMaterialRenderingOptions;
}
export type MaterialTexture = Texture | RenderTexture;