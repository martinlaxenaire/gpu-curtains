/// <reference types="dist" />
import { AllowedBindGroups, BindGroupInputs } from './BindGroups';
import { BindGroup } from '../core/bindGroups/BindGroup';
import { Texture } from '../core/textures/Texture';
import { RenderTexture } from '../core/textures/RenderTexture';
import { Sampler } from '../core/samplers/Sampler';
import { Geometry } from '../core/geometries/Geometry';
import { IndexedGeometry } from '../core/geometries/IndexedGeometry';
import { PlaneGeometry } from '../core/geometries/PlaneGeometry';
/** Shaders types that can be used by a {@link RenderMaterial} */
export type RenderMaterialShadersType = 'vertex' | 'fragment';
/** Shaders types that can be used by a {@link ComputeMaterial} */
export type ComputeMaterialShadersType = 'compute';
/** All shaders types */
export type MaterialShadersType = RenderMaterialShadersType | ComputeMaterialShadersType;
/** All shaders types, plus a 'full' type used to retrieve a complete shader code, i.e. 'vertex' + 'fragment' into one */
export type FullShadersType = 'full' | MaterialShadersType;
/**
 * Options used to create a shader
 */
export interface ShaderOptions {
    /** The shader WGSL code */
    code: string;
    /** The shader main function entry point */
    entryPoint: string;
}
/**
 * Defines all possible [shader options]{@link ShaderOptions} entries of a {@link Material}
 */
export interface MaterialShaders {
    /** Vertex [shader options]{@link ShaderOptions} */
    vertex?: ShaderOptions;
    /** Fragment [shader options]{@link ShaderOptions} */
    fragment?: ShaderOptions;
    /** Compute [shader options]{@link ShaderOptions} */
    compute?: ShaderOptions;
}
/**
 * Base parameters used to create a {@link Material}
 */
export interface MaterialBaseParams {
    /** The label of the {@link Material}, sent to various GPU objects for debugging purpose */
    label?: string;
    /** Shaders to use with this {@link Material} */
    shaders?: MaterialShaders;
    /** Whether to compile the {@link Material} [pipeline]{@link GPUPipelineBase} asynchronously or not */
    useAsyncPipeline?: boolean;
}
/** Array of all allowed bind groups */
export type MaterialBindGroups = AllowedBindGroups[];
/**
 * Inputs (i.e. data provided by the user) parameters used to create a {@link Material}
 */
export interface MaterialInputBindingsParams {
    /** [Inputs]{@link BindGroupInputs} used by this {@link Material} to create [bind groups]{@link BindGroup} internally */
    inputs?: BindGroupInputs;
    /** Array of already created [bind groups]{@link BindGroup} to be used by this {@link Material} */
    bindGroups?: BindGroup[];
    /** Array of already created [samplers]{@link Sampler} to be used by this {@link Material} */
    samplers?: Sampler[];
}
/** Parameters used to create a {@link Material} */
export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {
}
/** Options used to create this {@link Material} */
export interface MaterialOptions {
    /** The label of the {@link Material}, sent to various GPU objects for debugging purpose */
    label: string;
    /** Shaders to use with this {@link Material} */
    shaders: MaterialShaders;
    /** Whether to compile the {@link Material} [pipeline]{@link GPUPipelineBase} asynchronously or not */
    useAsyncPipeline?: boolean;
    /** [Inputs]{@link BindGroupInputs} used by this {@link Material} to create [bind groups]{@link BindGroup} internally */
    inputs?: BindGroupInputs;
    /** Array of already created [bind groups]{@link BindGroup} to be used by this {@link Material} */
    bindGroups?: BindGroup[];
    /** Array of already created [samplers]{@link Sampler} to be used by this {@link Material} */
    samplers?: Sampler[];
}
/** Parameters used to create a {@link ComputeMaterial} */
export interface ComputeMaterialParams extends MaterialParams {
    /** Main/first work group dispatch size to use with this {@link ComputeMaterial} */
    dispatchSize?: number | number[];
}
/** Options used to create this {@link ComputeMaterial} */
export interface ComputeMaterialOptions extends MaterialOptions {
    /** Main/first work group dispatch size to use with this {@link ComputeMaterial} */
    dispatchSize?: number | number[];
}
/** Parameters used to add a [work group]{@link ComputeMaterial#workGroups} */
export interface ComputeMaterialWorkGroupParams {
    /** Bind groups to use with this [work group]{@link ComputeMaterial#workGroups} */
    bindGroups: MaterialBindGroups;
    /** Optional [work group]{@link ComputeMaterial#workGroups} dispatch size  */
    dispatchSize?: number | number[];
}
/**
 * Defines a {@link ComputeMaterial} work group.
 * At each render call, each of the [compute material work groups]{@link ComputeMaterial#workGroups} bind groups will be set, then we will dispatch the work group using its dispatch size.
 * Allow for custom compute work group dispatch process.
 */
export interface ComputeMaterialWorkGroup extends ComputeMaterialWorkGroupParams {
    /** [Work group]{@link ComputeMaterial#workGroups} dispatch size  */
    dispatchSize: number[];
}
/**
 * Defines the geometry attributes that a {@link RenderMaterial} should send to the [render pipeline]{@link RenderPipelineEntry#pipeline}
 */
export interface RenderMaterialAttributes {
    /** WGSL structure code fragment containing the attributes to use as vertex shader inputs */
    wgslStructFragment?: Geometry['wgslStructFragment'];
    /** Array of [vertex buffers]{@link VertexBuffer} to send to the [render pipeline]{@link RenderPipelineEntry#pipeline} */
    vertexBuffers?: Geometry['vertexBuffers'];
}
/** Defines all basic allowed geometries */
export type AllowedGeometries = Geometry | IndexedGeometry | PlaneGeometry;
/**
 * Base rendering options to send to the [render pipeline]{@link RenderPipelineEntry#pipeline}
 */
export interface RenderMaterialBaseRenderingOptions {
    /** Whether this {@link RenderMaterial} should implicitly use the [renderer camera bind group]{@link CameraRenderer#cameraBindGroup} */
    useProjection: boolean;
    /** Whether this {@link RenderMaterial} should be treated as transparent. Impacts the [render pipeline]{@link RenderPipelineEntry#pipeline} blend properties */
    transparent: boolean;
    /** Whether this {@link RenderMaterial} should enable depth write */
    depthWriteEnabled: boolean;
    /** Depth function to use with this {@link RenderMaterial} */
    depthCompare: GPUCompareFunction;
    /** Cull mode to use with this {@link RenderMaterial} */
    cullMode: GPUCullMode;
}
/** Rendering options to send to the [render pipeline]{@link RenderPipelineEntry#pipeline} */
export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
    /** Vertices order to be used by the [render pipeline]{@link RenderPipelineEntry#pipeline} */
    verticesOrder: Geometry['verticesOrder'];
    /** Topology to use with this {@link RenderMaterial}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
    topology: Geometry['topology'];
}
/** Base parameters used to create a {@link RenderMaterial} */
export interface RenderMaterialBaseParams extends RenderMaterialRenderingOptions, MaterialInputBindingsParams {
}
/** Parameters used to create a {@link RenderMaterial} */
export interface RenderMaterialParams extends Partial<RenderMaterialBaseParams> {
    /** The label of the {@link RenderMaterial}, sent to various GPU objects for debugging purpose */
    label?: string;
    /** Shaders to use with this {@link RenderMaterial} */
    shaders?: MaterialShaders;
    /** Whether to compile the {@link RenderMaterial} [render pipeline]{@link RenderPipelineEntry#pipeline} asynchronously or not */
    useAsyncPipeline?: boolean;
}
/** Options used to create this {@link RenderMaterial} */
export interface RenderMaterialOptions extends MaterialOptions {
    /** [Rendering options]{@link RenderMaterialRenderingOptions} to send to the [pipeline]{@link GPUPipelineBase} */
    rendering?: RenderMaterialRenderingOptions;
}
/** Defines all kind of textures a {@link Material} can use */
export type MaterialTexture = Texture | RenderTexture;
