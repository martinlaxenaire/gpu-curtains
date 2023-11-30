/// <reference types="dist" />
import { MaterialBindGroups, MaterialShaders, RenderMaterialAttributes, RenderMaterialRenderingOptions } from './Materials';
import { Renderer } from '../core/renderers/utils';
import { GPUCurtains } from '../curtains/GPUCurtains';
/**
 * Defines a [pipeline entry]{@link PipelineEntry} shader object
 */
export interface PipelineEntryShader {
    /** Additional piece of WGSL code added at the beginning of the shader, with bits coming from the {@link Binding} and {@link Geometry} */
    head?: string;
    /** Complete WGSL shader code, i.e. [head code]{@link PipelineEntryShader#head} plus code that has been passed by the {@link Material} */
    code: string;
    /** {@link GPUShaderModule} created based on the given [shader code]{@link PipelineEntryShader#code} */
    module: GPUShaderModule | null;
}
/**
 * Defines all possible [pipeline entry shaders]{@link PipelineEntryShader} objects
 */
export interface PipelineEntryShaders {
    /** Vertex [pipeline entry shader]{@link PipelineEntryShader} object */
    vertex?: PipelineEntryShader;
    /** Fragment [pipeline entry shader]{@link PipelineEntryShader} object */
    fragment?: PipelineEntryShader;
    /** Compute [pipeline entry shader]{@link PipelineEntryShader} object */
    compute?: PipelineEntryShader;
    /** Full [pipeline entry shader]{@link PipelineEntryShader} object (i.e. vertex + fragment) */
    full?: PipelineEntryShader;
}
/**
 * Options used to create this {@link PipelineEntry}
 */
export interface PipelineEntryOptions {
    /** The label of the {@link PipelineEntry}, sent to various GPU objects for debugging purpose */
    label: string;
    /** Whether to compile the [pipeline]{@link PipelineEntry#pipeline} asynchronously or not */
    useAsync?: boolean;
    /** Shaders to use with this {@link PipelineEntry} */
    shaders: MaterialShaders;
}
/** Base parameters used to create this {@link PipelineEntry} */
export type PipelineEntryBaseParams = Partial<PipelineEntryOptions>;
/**
 * Parameters used to create this {@link PipelineEntry}
 */
export interface PipelineEntryParams extends PipelineEntryBaseParams {
    /** [renderer]{@link Renderer} used to create this {@link PipelineEntry}, or our {@link GPUCurtains} class object */
    renderer: Renderer | GPUCurtains;
}
/**
 * Defines our current [pipeline]{@link PipelineEntry#pipeline} compilation status
 */
export interface PipelineEntryStatus {
    /** Whether the [pipeline]{@link PipelineEntry#pipeline} is currently compiling */
    compiling: boolean;
    /** Whether the [pipeline]{@link PipelineEntry#pipeline} has been successfully compiled */
    compiled: boolean;
    /** Whether there has been an error while compiling the [pipeline]{@link PipelineEntry#pipeline}, and the corresponding error */
    error: null | string;
}
/**
 * Parameters used to add properties to the {@link PipelineEntry}
 */
export interface PipelineEntryPropertiesParams {
    /** Array of [bind groups]{@link AllowedBindGroups} to use with this [pipeline]{@link PipelineEntry#pipeline} */
    bindGroups: MaterialBindGroups;
}
/**
 * Options used to create this {@link PipelineEntry}
 */
export interface RenderPipelineEntryOptions extends PipelineEntryOptions {
    /** Cull mode to use with this [render pipeline]{@link RenderPipelineEntry#pipeline} */
    cullMode?: GPUCullMode;
    /** Depth function to use with this [render pipeline]{@link RenderPipelineEntry#pipeline} */
    depthCompare?: GPUCompareFunction;
    /** Whether this [render pipeline]{@link RenderPipelineEntry#pipeline} should enable depth write */
    depthWriteEnabled?: boolean;
    /** Defines the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
    transparent?: boolean;
    /** Vertices order to be used by the [render pipeline]{@link RenderPipelineEntry#pipeline} */
    verticesOrder?: GPUFrontFace;
    /** Whether this {@link RenderPipelineEntry} should implicitly add the [renderer camera bind group]{@link CameraRenderer#cameraBindGroup} and append corresponding WGSL code chunks */
    useProjection?: boolean;
}
/**
 * Parameters used to add properties to the {@link RenderPipelineEntry}
 */
export interface RenderPipelineEntryPropertiesParams extends PipelineEntryPropertiesParams {
    /** Geometry attributes to use with this [render pipeline]{@link RenderPipelineEntry#pipeline} */
    attributes: RenderMaterialAttributes;
}
/**
 * Base parameters used to create a {@link RenderPipelineEntry}
 */
export interface RenderPipelineEntryBaseParams extends RenderMaterialRenderingOptions {
    /** The label of the {@link RenderPipelineEntry}, sent to various GPU objects for debugging purpose */
    label?: string;
    /** Shaders to use with this {@link RenderPipelineEntry} */
    shaders?: MaterialShaders;
}
/**
 * Parameters used to create this {@link RenderPipelineEntry}
 */
export interface RenderPipelineEntryParams extends RenderPipelineEntryBaseParams {
    /** [renderer]{@link Renderer} used to create this {@link PipelineEntry}, or our {@link GPUCurtains} class object */
    renderer: Renderer | GPUCurtains;
}
