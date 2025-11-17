import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the environment map clearcoat indirect radiance (specular) contribution as `clearcoatRadiance` (`vec3f`).
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect irradiance if any.
 * @returns - String with the `clearcoatRadiance` (`vec3f`) value set.
 */
export declare const getIBLClearCoatIndirectRadiance: ({ extensionsUsed, environmentMap, }: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
    environmentMap: PBRFragmentShaderInputParams['environmentMap'];
}) => string;
