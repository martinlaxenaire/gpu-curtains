import { GetShadingParams } from './lambert-shading';
import { PBRFragmentShaderInputParams } from '../../full/fragment/get-fragment-shader-code';
/** Defines the basic parameters available for the PBR shading getter function. */
export interface GetPBRShadingParams extends GetShadingParams {
    /** {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading. */
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
    /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
    transmissionBackgroundTexture?: PBRFragmentShaderInputParams['transmissionBackgroundTexture'];
    /** The {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}
/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec4(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularIntensity: f32 = 1.0;
 * let metallic: f32 = 0.5;
 * let roughness: f32 = 0.5;
 * let ior: f32 = 1.5;
 * let transmission: f32 = 0.0;
 * let dispersion: f32 = 0.0;
 * let thickness: f32 = 0.0;
 * let attenuationDistance: f32 = 1.0e38; // Should be infinity or close
 * let attenuationColor: vec3f = vec3(1.0);
 *
 * color = getPBR(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularIntensity,
 *   specularColor,
 *   ior,
 *   transmission,
 *   dispersion,
 *   thickness,
 *   attenuationDistance,
 *   attenuationColor,
 * );
 * ```
 */
export declare const getPBR: ({ addUtils, receiveShadows, toneMapping, outputColorSpace, useOcclusion, environmentMap, transmissionBackgroundTexture, extensionsUsed, }?: GetPBRShadingParams) => string;
