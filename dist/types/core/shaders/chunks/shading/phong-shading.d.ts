import { GetShadingParams } from './lambert-shading';
/**
 * Shader chunk to add to the head of a fragment shader to be able to use Phong shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Phong shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularStrength: f32 = 1.0;
 * let shininess: f32 = 32.0;
 * color = getPhong(normal, worldPosition, color, viewDirection, specularColor, specularStrength, shininess);
 * ```
 */
export declare const getPhong: ({ addUtils, receiveShadows, toneMapping, useOcclusion }?: GetShadingParams) => string;
