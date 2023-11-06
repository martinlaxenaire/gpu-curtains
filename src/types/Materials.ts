import { AllowedBindGroups, BindGroupInputs } from './BindGroups'
import { BindGroup } from '../core/bindGroups/BindGroup'
import { Texture } from '../core/textures/Texture'
import { RenderTexture } from '../core/textures/RenderTexture'
import { Sampler } from '../core/samplers/Sampler'
import { Geometry } from '../core/geometries/Geometry'
import { IndexedGeometry } from '../core/geometries/IndexedGeometry'
import { PlaneGeometry } from '../core/geometries/PlaneGeometry'

/**
 * Material
 */

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

export type MaterialBindGroups = AllowedBindGroups[]

export interface MaterialInputBindingsParams {
  inputs?: BindGroupInputs
  bindGroups?: BindGroup[]
  samplers?: Sampler[] // TODO render material property or not?
}

export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

/**
 * RenderMaterial
 */

// shaders
export interface RenderShaders {
  vertex: ShaderOptions
  fragment: ShaderOptions
}

export type RenderShadersOptions = Partial<RenderShaders>

// geometry
export interface RenderMaterialAttributes {
  wgslStructFragment?: Geometry['wgslStructFragment']
  verticesCount?: Geometry['verticesCount']
  instancesCount?: Geometry['instancesCount']
  verticesOrder?: Geometry['verticesOrder']
  vertexBuffers?: Geometry['vertexBuffers']
  indexBuffer?: IndexedGeometry['indexBuffer']
}

// TODO this should instead check if it has Geometry as deep parent
export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry

export interface RenderMaterialBaseRenderingOptions {
  useProjection: boolean
  transparent: boolean
  depthWriteEnabled: boolean
  depthCompare: GPUCompareFunction
  cullMode: GPUCullMode
}

export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
  verticesOrder: Geometry['verticesOrder']
}

export interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {}

export interface RenderMaterialParams extends Partial<RenderMaterialBaseParams> {
  label?: string
  shaders?: MaterialShaders
  geometry: AllowedGeometries
  useAsyncPipeline?: boolean
}

export interface MaterialOptions {
  label: string
  shaders: MaterialShaders
  useAsyncPipeline?: boolean
  inputs?: BindGroupInputs
  bindGroups?: BindGroup[]
  samplers?: Sampler[]
  rendering?: RenderMaterialRenderingOptions
}

export type MaterialTexture = Texture | RenderTexture
