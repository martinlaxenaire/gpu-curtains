import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Get the clearcoat indirect radiance (specular) contribution as `clearcoatSpecularIndirect` (`vec3f`).
 *
 * @param parameters - Parameters used to create the shader chunk.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @returns - String with the `clearcoatSpecularIndirect` (`vec3f`) value set.
 */
export declare const getClearcoatIndirectSpecular: ({ extensionsUsed, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}) => string;
