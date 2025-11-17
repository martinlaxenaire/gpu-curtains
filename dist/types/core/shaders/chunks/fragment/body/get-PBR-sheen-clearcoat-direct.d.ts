import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the PBR direct light sheen and/or clearcoat contribution.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen and/or clearcoat are enabled.
 * @returns - The PBR direct light sheen and/or clearcoat contributions.
 */
export declare const getPBRSheenClearcoatDirect: ({ extensionsUsed, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}) => string;
