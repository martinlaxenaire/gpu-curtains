import { FragmentShaderBaseInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the environment map indirect lighting contribution.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect lighting if any.
 * @returns - String with environment map indirect lighting contribution applied.
 */
export declare const getIBLIndirect: ({ environmentMap, }: {
    environmentMap?: FragmentShaderBaseInputParams['environmentMap'];
}) => string;
