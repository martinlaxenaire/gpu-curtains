import { AllowedBindGroups, BindGroupInputs } from './BindGroups'
import { BindGroup } from '../core/bindGroups/BindGroup'
import { DOMTexture } from '../core/textures/DOMTexture'
import { Texture } from '../core/textures/Texture'
import { Sampler } from '../core/samplers/Sampler'
import { Geometry } from '../core/geometries/Geometry'
import { IndexedGeometry } from '../core/geometries/IndexedGeometry'

/* MATERIAL */

// SHADERS

/** Shaders types that can be used by a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} */
export type RenderMaterialShadersType = 'vertex' | 'fragment'
/** Shaders types that can be used by a {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} */
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
  entryPoint?: string
}

/**
 * Defines all possible {@link ShaderOptions | shader options} entries of a {@link core/materials/Material.Material | Material}
 */
export interface MaterialShaders {
  /** Vertex {@link ShaderOptions | shader options} */
  vertex?: ShaderOptions
  /** Fragment {@link ShaderOptions | shader options}. Could be set to `false` to only render to a depth texture. */
  fragment?: ShaderOptions | false
  /** Compute {@link ShaderOptions | shader options} */
  compute?: ShaderOptions
}

/**
 * Base options of a {@link core/materials/Material.Material | Material}.
 */
export interface MaterialBaseOptions {
  /** The label of the {@link core/materials/Material.Material | Material}, sent to various GPU objects for debugging purpose. */
  label: string
  /** Shaders to use with this {@link core/materials/Material.Material | Material}. */
  shaders: MaterialShaders
  /** Whether to compile the {@link core/materials/Material.Material | Material} {@link GPURenderPipeline} or {@link GPUComputePipeline} asynchronously or not. */
  useAsyncPipeline?: boolean
}

/**
 * Base parameters used to create a {@link core/materials/Material.Material | Material}
 */
export interface MaterialBaseParams extends Partial<MaterialBaseOptions> {}

/** Array of all allowed bind groups */
export type MaterialBindGroups = AllowedBindGroups[]

/**
 * Inputs (i.e. data provided by the user) parameters used to create a {@link core/materials/Material.Material | Material}
 */
export interface MaterialInputBindingsParams extends BindGroupInputs {
  /** Array of already created {@link core/bindGroups/BindGroup.BindGroup | bind groups} to be used by this {@link core/materials/Material.Material | Material} */
  bindGroups?: BindGroup[]
  /** Array of already created {@link core/samplers/Sampler.Sampler | samplers} to be used by this {@link core/materials/Material.Material | Material} */
  samplers?: Sampler[]
  /** Array of already created {@link Texture} to be used by this {@link core/materials/Material.Material | Material} */
  textures?: Texture[]
  /** Array of already created {@link DOMTexture} to be used by this {@link core/materials/Material.Material | Material} */
  domTextures?: DOMTexture[]
}

/** Parameters used to create a {@link core/materials/Material.Material | Material} */
export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {}

/** Options used to create this {@link core/materials/Material.Material | Material} */
export interface MaterialOptions extends MaterialBaseOptions, MaterialInputBindingsParams {}

/* COMPUTE MATERIAL */

/** Parameters used to create a {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} */
export interface ComputeMaterialParams extends MaterialParams {
  /** Main/first work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} */
  dispatchSize?: number | number[]
}

/** Options used to create this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} */
export interface ComputeMaterialOptions extends MaterialOptions {
  /** Default work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial} */
  dispatchSize?: number | number[]
}

/* RENDER MATERIAL */

// GEOMETRY

/**
 * Defines the geometry attributes that a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}
 */
export interface RenderMaterialAttributes {
  /** WGSL structure code fragment containing the attributes to use as vertex shader inputs */
  wgslStructFragment?: Geometry['wgslStructFragment']
  /** Array of {@link types/Geometries.VertexBuffer | vertex buffers} to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} */
  vertexBuffers?: Geometry['vertexBuffers']
  /** A string representing the {@link core/geometries/Geometry.Geometry#vertexBuffers | Geometry vertex buffers} layout, used for {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipelines} caching */
  layoutCacheKey?: Geometry['layoutCacheKey']
}

/** Defines all basic allowed geometries */
export type AllowedGeometries = Geometry | IndexedGeometry

/**
 * Base rendering options to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}
 */
export interface RenderMaterialBaseRenderingOptions {
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should implicitly use the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | renderer camera bind group} */
  useProjection: boolean
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} {@link GPUDevice.createRenderPipeline().blend | blend property} */
  transparent: boolean
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should write to the depth buffer */
  depth: boolean
  /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should enable depth write */
  depthWriteEnabled: boolean
  /** Depth function to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} */
  depthCompare: GPUCompareFunction
  /** Format of the depth texture to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} */
  depthFormat: GPUTextureFormat
  /** Cull mode to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} */
  cullMode: GPUCullMode
  /** The {@link core/renderPasses/RenderPass.RenderPassParams#sampleCount | sampleCount} of the {@link core/renderPasses/RenderPass.RenderPass | RenderPass} onto which we'll be drawing. Set internally. */
  sampleCount: GPUSize32

  /**
   * Array of one or multiple {@link GPUDevice.createRenderPipeline().targets | targets} properties.
   *
   * Each target should be an object with the optional {@link GPUDevice.createRenderPipeline().format | format}, {@link GPUDevice.createRenderPipeline().blend | blend} and {@link GPUDevice.createRenderPipeline().writemask | writeMask} properties.
   *
   * The format property will be internally patched to match the output {@link core/renderPasses/RenderPass.RenderPass | RenderPass} target (default to the renderer preferred format).
   *
   * If defined, the blend property can override the default transparent blending if set.
   *
   */
  targets: GPUColorTargetState[]
}

/** Rendering options to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
  /** Vertices order to be used by the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
  verticesOrder: Geometry['verticesOrder']
  /** Topology to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology). */
  topology: Geometry['topology']
}

/** Base parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {}

/** Parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialParams extends MaterialBaseParams, Partial<RenderMaterialBaseParams> {}

/** Options used to create this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialOptions extends MaterialOptions {
  /** {@link RenderMaterialRenderingOptions | render options} to send to the {@link GPURenderPipeline}. */
  rendering?: RenderMaterialRenderingOptions
}

/** Defines all kind of textures a {@link core/materials/Material.Material | Material} can use. */
export type MaterialTexture = DOMTexture | Texture
