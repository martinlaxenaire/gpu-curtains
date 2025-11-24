import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the IBL GGX Fresnel from the environment map LUT Texture or DFG approximation, used for multi-scattering.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL GGX Fresnel any.
 * @returns - String with IBL GGX Fresnel applied to `dielectricScattering` (`MultiScattering`) and `metallicScattering` (`MultiScattering`).
 */
export declare const computeMultiScattering: ({ environmentMap, }: {
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
}) => string;
