/// <reference types="@webgpu/types" />
import { AllowedBindGroups, BindGroupInputs } from './BindGroups';
import { BindGroup } from '../core/bindGroups/BindGroup';
import { Texture } from '../core/textures/Texture';
import { Sampler } from '../core/samplers/Sampler';
import { Geometry } from '../core/geometries/Geometry';
import { IndexedGeometry } from '../core/geometries/IndexedGeometry';
import { MediaTexture } from '../core/textures/MediaTexture';
/** Shaders types that can be used by a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export type RenderMaterialShadersType = 'vertex' | 'fragment';
/** Shaders types that can be used by a {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}. */
export type ComputeMaterialShadersType = 'compute';
/** All shaders types. */
export type MaterialShadersType = RenderMaterialShadersType | ComputeMaterialShadersType;
/** All shaders types, plus a 'full' type used to retrieve a complete shader code, i.e. 'vertex' + 'fragment' into one. */
export type FullShadersType = 'full' | MaterialShadersType;
/**
 * Options used to create a shader.
 */
export interface ShaderOptions {
    /** The shader WGSL code. */
    code: string;
    /** The shader main function entry point. */
    entryPoint?: string;
    /** Specifies the values of pipeline-overridable constants in the shader module if any. Note that if a constant is defined here, it *must* be used in the shader code. */
    constants?: Record<string, number | boolean>;
}
/**
 * Defines all possible {@link ShaderOptions | shader options} entries of a {@link core/materials/Material.Material | Material}.
 */
export interface MaterialShaders {
    /** Vertex {@link ShaderOptions | shader options}. */
    vertex?: ShaderOptions;
    /** Fragment {@link ShaderOptions | shader options}. Could be set to `false` to only render to a depth texture. */
    fragment?: ShaderOptions | false;
    /** Compute {@link ShaderOptions | shader options}. */
    compute?: ShaderOptions;
}
/** Defines all kind of textures a {@link core/materials/Material.Material | Material} can use. */
export type MaterialTexture = MediaTexture | Texture;
/**
 * Base options of a {@link core/materials/Material.Material | Material}.
 */
export interface MaterialBaseOptions {
    /** The label of the {@link core/materials/Material.Material | Material}, sent to various GPU objects for debugging purpose. */
    label: string;
    /** Shaders to use with this {@link core/materials/Material.Material | Material}. */
    shaders: MaterialShaders;
    /** Whether to compile the {@link core/materials/Material.Material | Material} {@link GPURenderPipeline} or {@link GPUComputePipeline} asynchronously or not. */
    useAsyncPipeline?: boolean;
}
/**
 * Base parameters used to create a {@link core/materials/Material.Material | Material}.
 */
export interface MaterialBaseParams extends Partial<MaterialBaseOptions> {
}
/** Array of all allowed bind groups. */
export type MaterialBindGroups = AllowedBindGroups[];
/**
 * Inputs (i.e. data provided by the user) parameters used to create a {@link core/materials/Material.Material | Material}.
 */
export interface MaterialInputBindingsParams extends BindGroupInputs {
    /** Array of already created {@link core/bindGroups/BindGroup.BindGroup | bind groups} to be used by this {@link core/materials/Material.Material | Material}. */
    bindGroups?: BindGroup[];
    /** Array of already created {@link core/samplers/Sampler.Sampler | samplers} to be used by this {@link core/materials/Material.Material | Material}. */
    samplers?: Sampler[];
    /** Array of already created {@link Texture} or {@link MediaTexture} to be used by this {@link core/materials/Material.Material | Material}. */
    textures?: MaterialTexture[];
}
/** Parameters used to create a {@link core/materials/Material.Material | Material}. */
export interface MaterialParams extends MaterialBaseParams, MaterialInputBindingsParams {
}
/** Options used to create this {@link core/materials/Material.Material | Material}. */
export interface MaterialOptions extends MaterialBaseOptions, MaterialInputBindingsParams {
}
/** Parameters used to create a {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}. */
export interface ComputeMaterialParams extends MaterialParams {
    /** Main/first work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}. */
    dispatchSize?: number | number[];
}
/** Options used to create this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}. */
export interface ComputeMaterialOptions extends MaterialOptions {
    /** Default work group dispatch size to use with this {@link core/materials/ComputeMaterial.ComputeMaterial | ComputeMaterial}. */
    dispatchSize?: number | number[];
}
/**
 * Defines the geometry attributes that a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}.
 */
export interface RenderMaterialAttributes {
    /** WGSL structure code fragment containing the attributes to use as vertex shader inputs. */
    wgslStructFragment?: Geometry['wgslStructFragment'];
    /** Array of {@link types/Geometries.VertexBuffer | vertex buffers} to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
    vertexBuffers?: Geometry['vertexBuffers'];
    /** A string representing the {@link core/geometries/Geometry.Geometry#vertexBuffers | Geometry vertex buffers} layout, used for {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipelines} caching. */
    layoutCacheKey?: Geometry['layoutCacheKey'];
}
/** Defines all basic allowed geometries. */
export type AllowedGeometries = Geometry | IndexedGeometry;
/**
 * Base rendering options to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}.
 */
export interface RenderMaterialBaseRenderingOptions {
    /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should implicitly use the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraLightsBindGroup | renderer camera and lights bind group}. */
    useProjection: boolean;
    /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should be treated as transparent. Impacts the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline} {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#blend | blend property}. */
    transparent: boolean;
    /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should write to the depth buffer. */
    depth: boolean;
    /** Whether this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial} should enable depth write. */
    depthWriteEnabled: boolean;
    /** Depth function to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
    depthCompare: GPUCompareFunction;
    /** Format of the depth texture to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMateria.l} */
    depthFormat: GPUTextureFormat;
    /** A number representing a constant depth bias that is added to each fragment. Default to `0`. */
    depthBias: number;
    /** A number representing the maximum depth bias of a fragment. Default to `0`. */
    depthBiasClamp: number;
    /** A number representing a depth bias that scales with the fragment's slope. Default to `0`. */
    depthBiasSlopeScale: number;
    /** Define the stencil operations to use if any. */
    stencil?: {
        /** Defines how stencil comparisons and operations are performed for front-facing primitives. */
        front: GPUStencilFaceState;
        /** Defines how stencil comparisons and operations are performed for back-facing primitives. If undefined, will fall back to `front` values. */
        back?: GPUStencilFaceState;
        /** Set the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPURenderPassEncoder/setStencilReference#reference | GPURenderPassEncoder stencil reference} value used during stencil tests if any. Default to `0x000000` if a stencil is used. */
        stencilReference?: GPUStencilValue;
        /** A bitmask controlling which stencil value bits are read when performing stencil comparison tests. Default to `0xFFFFFF`. */
        stencilReadMask?: GPUStencilValue;
        /** A bitmask controlling which stencil value bits are written to when performing stencil comparison tests. Default to `0xFFFFFF`. */
        stencilWriteMask?: GPUStencilValue;
    };
    /** The {@link core/renderPasses/RenderPass.RenderPassParams#sampleCount | sampleCount} of the {@link core/renderPasses/RenderPass.RenderPass | RenderPass} onto which we'll be drawing. Set internally. */
    sampleCount: GPUSize32;
    /** When `true` indicates that a fragment's alpha channel should be used to generate a sample
     * coverage mask. Default to `false`. */
    alphaToCoverageEnabled: boolean;
    /** Mask determining which samples are written to. Default to `0xFFFFFFFF`. */
    mask: GPUSampleMask;
    /**
     * Array of one or multiple {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#targets | targets} properties.
     *
     * Each target should be an object with the optional {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#format_2 | format}, {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#blend | blend} and {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#writemask | writeMask} properties.
     *
     * The format property will be internally patched to match the output {@link core/renderPasses/RenderPass.RenderPass | RenderPass} target (default to the renderer preferred format).
     *
     * If defined, the blend property can override the default transparent blending if set.
     *
     */
    targets: GPUColorTargetState[];
    /** Cull mode to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
    cullMode: GPUCullMode;
    /**
     * If `true`, indicates that depth clipping is disabled.
     * Requires the {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUSupportedFeatures#available_features | depth-clip-control} feature to be enabled. Default to `false`.
     */
    unclippedDepth?: boolean;
}
/** Rendering options to send to the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
export interface RenderMaterialRenderingOptions extends RenderMaterialBaseRenderingOptions {
    /** Vertices order to be used by the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#pipeline | render pipeline}. */
    verticesOrder: Geometry['verticesOrder'];
    /** Topology to use with this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology). */
    topology: Geometry['topology'];
    /** Define the index buffer format for strip topologies. Set internally. */
    stripIndexFormat?: GPUIndexFormat;
}
/** Base parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialBaseParams extends Omit<RenderMaterialRenderingOptions, 'targets' | 'stripIndexFormat'>, MaterialInputBindingsParams {
    /** Optional array of one or multiple {@link https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createRenderPipeline#targets | targets} properties. Format property will be patched internally. */
    targets?: Partial<GPUColorTargetState>[];
}
/** Parameters used to create a {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialParams extends MaterialBaseParams, Partial<RenderMaterialBaseParams> {
}
/** Options used to create this {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}. */
export interface RenderMaterialOptions extends MaterialOptions {
    /** {@link RenderMaterialRenderingOptions | render options} to send to the {@link GPURenderPipeline}. */
    rendering?: RenderMaterialRenderingOptions;
}
