import {
  MaterialBindGroups,
  MaterialShaders,
  RenderMaterialAttributes,
  RenderMaterialRenderingOptions,
} from './Materials'
import { Renderer } from '../core/renderers/utils'
import { GPUCurtains } from '../curtains/GPUCurtains'

/** Defines a {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} shader object. */
export interface PipelineEntryShader {
  /** Additional piece of WGSL code added at the beginning of the shader, with bits coming from the {@link core/bindings/Binding.Binding | Binding} and {@link core/geometries/Geometry.Geometry | Geometry}. */
  head?: string
  /** Complete WGSL shader code, i.e. {@link PipelineEntryShader#head | head code} plus code that has been passed by the {@link core/materials/Material.Material | Material}. */
  code: string
  /** {@link GPUShaderModule} created based on the given {@link code}. */
  module: GPUShaderModule | null
}

/** Defines all possible {@link PipelineEntryShader} objects. */
export interface PipelineEntryShaders {
  /** Vertex {@link PipelineEntryShader} object. */
  vertex?: PipelineEntryShader
  /** Fragment {@link PipelineEntryShader} object. */
  fragment?: PipelineEntryShader
  /** Compute {@link PipelineEntryShader} object. */
  compute?: PipelineEntryShader
  /** Full {@link PipelineEntryShader} object (i.e. vertex + fragment). */
  full?: PipelineEntryShader
}

/** Options used to create this {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}. */
export interface PipelineEntryOptions {
  /** The label of the {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}, sent to various GPU objects for debugging purpose. */
  label: string
  /** Whether to compile the {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline} asynchronously or not. */
  useAsync: boolean
  /** Shaders to use with this {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}. */
  shaders: MaterialShaders
  /** Array of {@link core/bindGroups/BindGroup.BindGroup | BindGroup} to use with this {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline}. */
  bindGroups: MaterialBindGroups
  /** Cache key defining the and bind groups buffer layouts, used to eventually get a {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry} from cache. */
  cacheKey: string
}

/** Base parameters used to create this {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}. */
export type PipelineEntryBaseParams = Partial<PipelineEntryOptions>

/** Parameters used to create this {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}. */
export interface PipelineEntryParams extends PipelineEntryBaseParams {
  /** {@link Renderer} used to create this {@link core/pipelines/PipelineEntry.PipelineEntry | PipelineEntry}, or our {@link curtains/GPUCurtains | GPUCurtains} class object. */
  renderer: Renderer | GPUCurtains
}

/** Defines our current {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline} compilation status. */
export interface PipelineEntryStatus {
  /** Whether the {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline} is currently compiling. */
  compiling: boolean
  /** Whether the {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline} has been successfully compiled. */
  compiled: boolean
  /** Whether there has been an error while compiling the {@link core/pipelines/PipelineEntry.PipelineEntry#pipeline | pipeline}, and the corresponding error. */
  error: null | string
}

/* RENDER PIPELINES */

/** Additional {@link RenderMaterialAttributes | attributes} and {@link RenderMaterialRenderingOptions | rendering} parameters used by {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry}. */
export interface RenderPipelineRenderingOptions {
  /** Geometry attributes to use with this {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
  attributes: RenderMaterialAttributes
  /** {@link RenderMaterialRenderingOptions | render material rendering options} used to create the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry}. */
  rendering: RenderMaterialRenderingOptions
}

/** Options used to create a {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry}. */
export interface RenderPipelineEntryOptions extends PipelineEntryOptions, RenderPipelineRenderingOptions {}

/** Parameters used to create a {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | RenderPipelineEntry}. */
export interface RenderPipelineEntryParams extends PipelineEntryParams, RenderPipelineRenderingOptions {}
