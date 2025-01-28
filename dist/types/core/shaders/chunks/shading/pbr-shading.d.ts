import { GetShadingParams } from './lambert-shading';
import { FragmentShaderBaseInputParams } from '../../full/fragment/get-fragment-code';
/** Basic minimum utils needed to compute PBR shading. Extends {@link lambertUtils | utils needed for lambert shading}. */
export declare const pbrUtils: string;
export interface GetPBRShadingParams extends GetShadingParams {
    environmentMap?: FragmentShaderBaseInputParams['environmentMap'];
    transmissionBackgroundTexture?: FragmentShaderBaseInputParams['transmissionBackgroundTexture'];
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
