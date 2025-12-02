import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get Render Equations for indirect diffuse contribution, accounting for sheen energy compensation if needed.
 *
 * @param parameters - Parameters used to set the indirect diffuse contribution.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @returns - Correct Render Equations function.
 */
export declare const getIndirectDiffuse: ({ extensionsUsed, }: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
}) => string;
