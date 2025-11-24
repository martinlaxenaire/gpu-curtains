import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the sheen specular indirect contribution as `sheenSpecularIndirect` (`vec3f`).
 * @param parameters - Parameters used to set the `sheenSpecularIndirect` (`vec3f`) value.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @returns - String with the `sheenSpecularIndirect` (`vec3f`) value set.
 */
export declare const getIBLSheenIndirectRadiance: ({ extensionsUsed, environmentMap, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
}) => string;
