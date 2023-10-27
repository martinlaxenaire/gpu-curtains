import { AllowedBindGroups, BindGroupInputs } from '../bindGroups/BindGroup'
import { BindGroup } from '../../../core/bindGroups/BindGroup'
import { Texture } from '../../../core/textures/Texture'
import { RenderTexture } from '../../../core/textures/RenderTexture'
import { RenderMaterialRenderingOptions } from './RenderMaterial'
import { Sampler } from '../../../core/samplers/Sampler'

// shaders
export type RenderMaterialShadersType = 'vertex' | 'fragment'
export type ComputeMaterialShadersType = 'compute'
export type MaterialShadersType = RenderMaterialShadersType | ComputeMaterialShadersType
export type FullShadersType = 'full' | MaterialShadersType

export interface ShaderOptions {
  code: string
  entryPoint: string
}

export interface MaterialShaders {
  vertex?: ShaderOptions
  fragment?: ShaderOptions
  compute?: ShaderOptions
  //[shaderType: MaterialShadersType]: ShaderOptions
}

export interface MaterialBaseParams {
  label?: string
  shaders?: MaterialShaders
  useAsyncPipeline?: boolean
}

type MaterialBindGroups = AllowedBindGroups[]

export interface MaterialInputBindingsParams {
  inputs?: BindGroupInputs
  inputBindGroups?: BindGroup[]
  samplers?: Sampler[]
}

export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

export interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  useAsyncPipeline?: boolean
  inputs?: BindGroupInputs
  inputBindGroups?: BindGroup[]
  samplers?: Sampler[]
  rendering?: RenderMaterialRenderingOptions
}

export type MaterialTexture = Texture | RenderTexture
