import { AllowedBindGroups, BindGroupInputs } from './BindGroups'
import { BindGroup } from '../core/bindGroups/BindGroup'
import { Texture } from '../core/textures/Texture'
import { RenderTexture } from '../core/textures/RenderTexture'
import { Sampler } from '../core/samplers/Sampler'
import { Geometry } from '../core/geometries/Geometry'
import { IndexedGeometry } from '../core/geometries/IndexedGeometry'
import { PlaneGeometry } from '../core/geometries/PlaneGeometry'

/* MATERIAL */

// SHADERS

/** Shaders types that can be used by a {@link core/materials/RenderMaterial.RenderMaterial} */
export type RenderMaterialShadersType = 'vertex' | 'fragment'
/** Shaders types that can be used by a {@link core/materials/ComputeMaterial.ComputeMaterial} */
export type ComputeMaterialShadersType = 'compute'
/** All shaders types */
export type MaterialShadersType = RenderMaterialShadersType | ComputeMaterialShadersType
/** All shaders types, plus a 'full' type used to retrieve a complete shader code, i.e. 'vertex' + 'fragment' into one */
export type FullShadersType = 'full' | MaterialShadersType

/**
 * Options used to create a shader
 */
export interface ShaderOptions {
  /** The shader WGSL code */
  code: string
  /** The shader main function entry point */
  entryPoint: string
}

/**
 * Defines all possible [shader options]{@link ShaderOptions} entries of a {@link core/materials/Material.Material}
 */
export interface MaterialShaders {
  /** Vertex [shader options]{@link ShaderOptions} */
  vertex?: ShaderOptions
  /** Fragment [shader options]{@link ShaderOptions} */
  fragment?: ShaderOptions
  /** Compute [shader options]{@link ShaderOptions} */
  compute?: ShaderOptions
  //[shaderType: MaterialShadersType]: ShaderOptions
}

/**
 * Base parameters used to create a {@link core/materials/Material.Material}
 */
export interface MaterialBaseParams {
  /** The label of the {@link core/materials/Material.Material}, sent to various GPU objects for debugging purpose */
  label?: string
  /** Shaders to use with this {@link core/materials/Material.Material} */
  shaders?: MaterialShaders
  /** Whether to compile the {@link core/materials/Material.Material} [pipeline]{@link GPUPipelineBase} asynchronously or not */
  useAsyncPipeline?: boolean
}

/** Array of all allowed bind groups */
export type MaterialBindGroups = AllowedBindGroups[]

/**
 * Inputs (i.e. data provided by the user) parameters used to create a {@link core/materials/Material.Material}
 */
export interface MaterialInputBindingsParams extends BindGroupInputs {
  /** Array of already created [bind groups]{@link core/bindGroups/BindGroup.BindGroup} to be used by this {@link core/materials/Material.Material} */
  bindGroups?: BindGroup[]
  /** Array of already created [samplers]{@link core/samplers/Sampler.Sampler} to be used by this {@link core/materials/Material.Material} */
  samplers?: Sampler[]
  /** Array of already created [textures]{@link core/textures/Texture.Texture} to be used by this {@link core/materials/Material.Material} */
  textures?: Texture[]
  /** Array of already created [render textures]{@link core/textures/RenderTexture.RenderTexture} to be used by this {@link core/materials/Material.Material} */
  renderTextures?: RenderTexture[]
}

/** Parameters used to create a {@link core/materials/Material.Material} */
export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

/** Options used to create this {@link core/materials/Material.Material} */
export interface MaterialOptions extends MaterialInputBindingsParams {
  /** The label of the {@link core/materials/Material.Material}, sent to various GPU objects for debugging purpose */
  label: string
  /** Shaders to use with this {@link core/materials/Material.Material} */
  shaders: MaterialShaders
  /** Whether to compile the {@link core/materials/Material.Material} [pipeline]{@link GPUPipelineBase} asynchronously or not */
  useAsyncPipeline?: boolean
}

/* COMPUTE MATERIAL */

/** Parameters used to create a {@link core/materials/ComputeMaterial.ComputeMaterial} */
export interface ComputeMaterialParams extends MaterialParams {
  /** Main/first work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial} */
  dispatchSize?: number | number[]
}

/** Options used to create this {@link core/materials/ComputeMaterial.ComputeMaterial} */
export interface ComputeMaterialOptions extends MaterialOptions {
  /** Default work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial} */
  dispatchSize?: number | number[]
}

/* RENDER MATERIAL */

// GEOMETRY

/**
 * Defines the geometry attributes that a {@link core/materials/RenderMaterial.RenderMaterial} should send to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline}
 */
export interface RenderMaterialAttributes {
  /** WGSL structure code fragment containing the attributes to use as vertex shader inputs */
  wgslStructFragment?: Geometry['wgslStructFragment']
  /** Array of [vertex buffers]{@link types/Geometries.VertexBuffer} to send to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} */
  vertexBuffers?: Geometry['vertexBuffers']
}

/** Defines all basic allowed geometries */
// TODO this should instead check if it has Geometry as deep parent
export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry

/**
 * Base rendering options to send to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline}
 */
export interface RenderMaterialBaseRenderingOptions {
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial} should implicitly use the [renderer camera bind group]{@link CameraRenderer#cameraBindGroup} */
  useProjection: boolean
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial} should be treated as transparent. Impacts the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} [blend property]{@link GPURenderPipeline#blend} */
  transparent: boolean
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial} should enable depth write */
  depthWriteEnabled: boolean
  /** Depth function to use with this {@link core/materials/RenderMaterial.RenderMaterial} */
  depthCompare: GPUCompareFunction
  /** Cull mode to use with this {@link core/materials/RenderMaterial.RenderMaterial} */
  cullMode: GPUCullMode
  /** Custom blending to use with this {@link core/materials/RenderMaterial.RenderMaterial}. Can override default transparent blending if set */
  blend?: GPUBlendState
  /** Optional texture format of the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry} color target. Default to the renderer preferred format. */
  targetFormat: GPUTextureFormat
}

/** Rendering options to send to the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} */
export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
  /** Vertices order to be used by the [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} */
  verticesOrder: Geometry['verticesOrder']
  /** Topology to use with this {@link core/materials/RenderMaterial.RenderMaterial}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
  topology: Geometry['topology']
}

/** Base parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial} */
export interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {}

/** Parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial} */
export interface RenderMaterialParams extends Partial<RenderMaterialBaseParams> {
  /** The label of the {@link core/materials/RenderMaterial.RenderMaterial}, sent to various GPU objects for debugging purpose */
  label?: string
  /** Shaders to use with this {@link core/materials/RenderMaterial.RenderMaterial} */
  shaders?: MaterialShaders
  /** Whether to compile the {@link core/materials/RenderMaterial.RenderMaterial} [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} asynchronously or not */
  useAsyncPipeline?: boolean
}

/** Options used to create this {@link core/materials/RenderMaterial.RenderMaterial} */
export interface RenderMaterialOptions extends MaterialOptions {
  /** [Rendering options]{@link RenderMaterialRenderingOptions} to send to the [pipeline]{@link GPUPipelineBase} */
  rendering?: RenderMaterialRenderingOptions
}

/** Defines all kind of textures a {@link core/materials/Material.Material} can use */
export type MaterialTexture = Texture | RenderTexture
