import {
  MaterialBindGroups,
  MaterialShaders,
  RenderMaterialAttributes,
  RenderMaterialRenderingOptions,
} from './Materials'
import { Renderer } from '../core/renderers/utils'
import { GPUCurtains } from '../curtains/GPUCurtains'
import { AllowedBindGroups } from './BindGroups'

/**
 * Defines a [pipeline entry]{@link core/pipelines/PipelineEntry.PipelineEntry} shader object
 */
export interface PipelineEntryShader {
  /** Additional piece of WGSL code added at the beginning of the shader, with bits coming from the {@link core/bindings/Binding.Binding} and {@link core/geometries/Geometry.Geometry} */
  head?: string
  /** Complete WGSL shader code, i.e. [head code]{@link PipelineEntryShader#head} plus code that has been passed by the {@link core/materials/Material.Material} */
  code: string
  /** {@link GPUShaderModule} created based on the given [shader code]{@link PipelineEntryShader#code} */
  module: GPUShaderModule | null
}

/**
 * Defines all possible [pipeline entry shaders]{@link PipelineEntryShader} objects
 */
export interface PipelineEntryShaders {
  /** Vertex [pipeline entry shader]{@link PipelineEntryShader} object */
  vertex?: PipelineEntryShader
  /** Fragment [pipeline entry shader]{@link PipelineEntryShader} object */
  fragment?: PipelineEntryShader
  /** Compute [pipeline entry shader]{@link PipelineEntryShader} object */
  compute?: PipelineEntryShader
  /** Full [pipeline entry shader]{@link PipelineEntryShader} object (i.e. vertex + fragment) */
  full?: PipelineEntryShader
}

/**
 * Options used to create this {@link core/pipelines/PipelineEntry.PipelineEntry}
 */
export interface PipelineEntryOptions {
  /** The label of the {@link core/pipelines/PipelineEntry.PipelineEntry}, sent to various GPU objects for debugging purpose */
  label: string
  /** Whether to compile the [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} asynchronously or not */
  useAsync?: boolean
  /** Shaders to use with this {@link core/pipelines/PipelineEntry.PipelineEntry} */
  shaders: MaterialShaders
}

/** Base parameters used to create this {@link core/pipelines/PipelineEntry.PipelineEntry} */
export type PipelineEntryBaseParams = Partial<PipelineEntryOptions>

/**
 * Parameters used to create this {@link core/pipelines/PipelineEntry.PipelineEntry}
 */
export interface PipelineEntryParams extends PipelineEntryBaseParams {
  /** [renderer]{@link Renderer} used to create this {@link core/pipelines/PipelineEntry.PipelineEntry}, or our {@link curtains/GPUCurtains} class object */
  renderer: Renderer | GPUCurtains
}

/**
 * Defines our current [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} compilation status
 */
export interface PipelineEntryStatus {
  /** Whether the [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} is currently compiling */
  compiling: boolean
  /** Whether the [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} has been successfully compiled */
  compiled: boolean
  /** Whether there has been an error while compiling the [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline}, and the corresponding error */
  error: null | string
}

/**
 * Parameters used to add properties to the {@link core/pipelines/PipelineEntry.PipelineEntry}
 */
export interface PipelineEntryPropertiesParams {
  /** Array of [bind groups]{@link AllowedBindGroups} to use with this [pipeline]{@link core/pipelines/PipelineEntry.PipelineEntry#pipeline} */
  bindGroups: MaterialBindGroups
}

/* RENDER PIPELINES */

/**
 * Options used to create this {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry}
 */
export interface RenderPipelineEntryOptions extends PipelineEntryOptions, Partial<RenderMaterialRenderingOptions> {}

/**
 * Parameters used to add properties to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry}
 */
export interface RenderPipelineEntryPropertiesParams extends PipelineEntryPropertiesParams {
  /** Geometry attributes to use with this [render pipeline]{@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline} */
  attributes: RenderMaterialAttributes
}

/**
 * Base parameters used to create a {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry}
 */
export interface RenderPipelineEntryBaseParams extends RenderMaterialRenderingOptions {
  /** The label of the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry}, sent to various GPU objects for debugging purpose */
  label?: string
  /** Shaders to use with this {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry} */
  shaders?: MaterialShaders
}

/**
 * Parameters used to create this {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry}
 */
export interface RenderPipelineEntryParams extends RenderPipelineEntryBaseParams {
  /** [renderer]{@link Renderer} used to create this {@link core/pipelines/PipelineEntry.PipelineEntry}, or our {@link curtains/GPUCurtains} class object */
  renderer: Renderer | GPUCurtains
}
