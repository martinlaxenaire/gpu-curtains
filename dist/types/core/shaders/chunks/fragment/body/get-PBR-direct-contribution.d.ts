import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the PBR direct light contribution.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @returns - The PBR direct light contribution, accounting for anisotropy, sheen and clearcoat contributions.
 */
export declare const getPBRDirectContribution: ({ extensionsUsed, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}) => string;
