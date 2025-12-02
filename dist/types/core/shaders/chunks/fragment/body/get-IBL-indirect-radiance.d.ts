import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the environment map indirect radiance (specular).
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect radiance if any.
 * @returns - String with environment map indirect radiance applied to `radiance` (`vec3f`).
 */
export declare const getIBLIndirectRadiance: ({ extensionsUsed, environmentMap, }: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
    environmentMap?: PBRFragmentShaderInputParams["environmentMap"];
}) => string;
