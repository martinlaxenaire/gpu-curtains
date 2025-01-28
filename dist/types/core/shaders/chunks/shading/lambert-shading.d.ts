import { ToneMappings } from '../../full/fragment/get-fragment-code';
/** Defines the basic parameters available for the various shading getter functions. */
export interface GetShadingParams {
    /** Whether to add the utils functions such as constants or helper functions. Default to `true`. */
    addUtils?: boolean;
    /** Whether the shading function should account for current shadows. Default to `false`. */
    receiveShadows?: boolean;
    /** Whether the shading function should apply tone mapping to the resulting color and if so, which one. Default to `'Linear'`. */
    toneMapping?: ToneMappings | boolean;
    /** Whether ambient occlusion should be accounted when calculating the shading. Default to `false`. If set to `true`, a float `f32` ambient occlusion value should be passed as the last shading function parameter. */
    useOcclusion?: boolean;
}
/**
 * Shader chunk to add to the head of a fragment shader to be able to use Lambert shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Lambert shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * color = getLambert(normal, worldPosition, color);
 * ```
 */
export declare const getLambert: ({ addUtils, receiveShadows, toneMapping, useOcclusion }?: GetShadingParams) => string;
