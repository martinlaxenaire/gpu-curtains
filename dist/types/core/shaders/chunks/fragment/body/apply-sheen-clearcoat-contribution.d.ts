import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Update the `outgoingLight` (`vec3f`) value with the eventual sheen and/or clearcoat specular contributions.
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen and/or clearcoat are enabled.
 * @returns - Updated `outgoingLight` (`vec3f`) with the sheen and/or clearcoat specular contributions.
 */
export declare const applySheenClearcoatContribution: ({ extensionsUsed, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
}) => string;
