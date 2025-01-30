import { GetShadingParams } from './lambert-shading';
import { FragmentShaderBaseInputParams } from '../../full/fragment/get-fragment-shader-code';
/** Defines the basic parameters available for the PBR shading getter function. */
export interface GetPBRShadingParams extends GetShadingParams {
    /** {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading. */
    environmentMap?: FragmentShaderBaseInputParams['environmentMap'];
    /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
    transmissionBackgroundTexture?: FragmentShaderBaseInputParams['transmissionBackgroundTexture'];
    /** The {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
    extensionsUsed?: FragmentShaderBaseInputParams['extensionsUsed'];
}
/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec4(1.0);
 * color = getPBR(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularFactor,
 *   specularColor,
 *   ior,
 * );
 * ```
 */
export declare const getPBR: ({ addUtils, receiveShadows, toneMapping, useOcclusion, environmentMap, transmissionBackgroundTexture, extensionsUsed, }?: GetPBRShadingParams) => string;
