import { EnvironmentMap } from '../../../../extras/environmentMap/EnvironmentMap';
import { Geometry } from '../../../geometries/Geometry';
import { GLTFExtensionsUsed } from '../../../../types/gltf/GLTFExtensions';
import { AdditionalChunks } from '../../default-material-helpers';
import { BufferBindingBaseParams } from '../../../bindings/BufferBinding';
import { VertexShaderInputParams } from '../vertex/get-vertex-shader-code';
import { LambertTexturesDescriptors, PBRTexturesDescriptors, PhongTexturesDescriptors, ShadingModels, ToneMappings, UnlitTexturesDescriptors } from '../../../../extras/meshes/LitMesh';
/** Base parameters used to build a fragment shader. */
export interface FragmentShaderInputBaseParams {
    /** Whether the shading function should apply tone mapping to the resulting color and if so, which one. Default to `'Khronos'`. */
    toneMapping?: ToneMappings;
    /** Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} to pass from the vertex shader to the fragment shader. */
    additionalVaryings?: VertexShaderInputParams['additionalVaryings'];
}
/** Parameters used to build an unlit fragment shader. */
export interface UnlitFragmentShaderInputParams extends FragmentShaderInputBaseParams, UnlitTexturesDescriptors {
    /** Additional WGSL chunks to add to the shaders. */
    chunks?: AdditionalChunks;
    /** {@link Geometry} used to create the fragment shader. Can use the {@link Geometry#vertexBuffers | vertexBuffers} properties for vertex colors or tangent/bitangent computations. */
    geometry: Geometry;
    /** The {@link BufferBindingBaseParams} holding the material uniform values. Will use default values if not provided. */
    materialUniform?: BufferBindingBaseParams;
    /** The {@link BufferBindingBaseParams} name to use for variables declarations. Default to `'material'`. */
    materialUniformName?: string;
}
/** Parameters used to build an lambert fragment shader. */
export interface LambertFragmentShaderInputParams extends UnlitFragmentShaderInputParams, LambertTexturesDescriptors {
    /** Whether the shading function should account for current shadows. Default to `false`. */
    receiveShadows?: boolean;
}
/** Parameters used to build a phong fragment shader. */
export interface PhongFragmentShaderInputParams extends LambertFragmentShaderInputParams, PhongTexturesDescriptors {
}
/** Base parameters used to build a PBR fragment shader. */
export interface PBRFragmentShaderInputParams extends PhongFragmentShaderInputParams, PBRTexturesDescriptors {
    /** The {@link GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
    extensionsUsed?: GLTFExtensionsUsed;
    /** {@link EnvironmentMap} to use for IBL shading. */
    environmentMap?: EnvironmentMap;
}
/** Parameters used to build a lit fragment shader. */
export interface FragmentShaderInputParams extends PBRFragmentShaderInputParams {
    /** Shading model to use. Default to `'PBR'`. */
    shadingModel?: ShadingModels;
}
/**
 * Build a fragment shader using the provided options, mostly used for lit meshes fragment shader code generation.
 * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
 * @returns - The fragment shader generated based on the provided parameters.
 */
export declare const getFragmentShaderCode: ({ shadingModel, chunks, toneMapping, geometry, additionalVaryings, materialUniform, materialUniformName, extensionsUsed, receiveShadows, baseColorTexture, normalTexture, emissiveTexture, occlusionTexture, metallicRoughnessTexture, specularTexture, specularFactorTexture, specularColorTexture, transmissionTexture, thicknessTexture, transmissionBackgroundTexture, environmentMap, }: FragmentShaderInputParams) => string;
