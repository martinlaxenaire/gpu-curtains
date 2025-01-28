import { PhongFragmentShaderInputParams } from './get-fragment-code';
/**
 * Build a Phong fragment shader using the provided options.
 * @param parameters - {@link PhongFragmentShaderInputParams} used to build the Phong fragment shader.
 * @returns - The Phong fragment shader generated based on the provided parameters.
 */
export declare const getPhongFragmentCode: ({ chunks, toneMapping, geometry, receiveShadows, baseColorTexture, normalTexture, emissiveTexture, occlusionTexture, metallicRoughnessTexture, specularTexture, specularFactorTexture, specularColorTexture, }: PhongFragmentShaderInputParams) => string;
