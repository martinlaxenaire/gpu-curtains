import { FragmentShaderInputParams } from './get-fragment-shader-code';
/**
 * Build a PBR fragment shader using the provided options.
 * @param parameters - {@link FragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export declare const getPbrFragmentShaderCode: ({ chunks, toneMapping, geometry, materialUniform, materialUniformName, extensionsUsed, receiveShadows, baseColorTexture, normalTexture, emissiveTexture, occlusionTexture, metallicRoughnessTexture, specularTexture, specularFactorTexture, specularColorTexture, transmissionTexture, thicknessTexture, transmissionBackgroundTexture, environmentMap, }: FragmentShaderInputParams) => string;
