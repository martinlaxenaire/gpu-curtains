import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the environment map IBL GGX Fresnel from the environment map LUT Texture, used for multi-scattering.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL GGX Fresnel any.
 * @returns - String with IBL GGX Fresnel applied to `iBLGGXFresnel` (`IBLGGXFresnel`).
 */
export declare const getIBLGGXFresnel: ({ environmentMap, }: {
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
}) => string;
