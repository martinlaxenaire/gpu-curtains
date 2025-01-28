import { LambertFragmentShaderInputParams } from './get-fragment-code';
/**
 * Build a Lambert fragment shader using the provided options.
 * @param parameters - {@link LambertFragmentShaderInputParams} used to build the Lambert fragment shader.
 * @returns - The Lambert fragment shader generated based on the provided parameters.
 */
export declare const getLambertFragmentCode: ({ chunks, toneMapping, geometry, receiveShadows, baseColorTexture, normalTexture, emissiveTexture, occlusionTexture, }: LambertFragmentShaderInputParams) => string;
