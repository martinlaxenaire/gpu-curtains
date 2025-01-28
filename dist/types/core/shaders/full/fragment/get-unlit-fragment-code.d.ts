import { UnlitFragmentShaderInputParams } from './get-fragment-code';
/**
 * Build an unlit fragment shader using the provided options.
 * @param parameters - {@link UnlitFragmentShaderInputParams} used to build the unlit fragment shader.
 * @returns - The unlit fragment shader generated based on the provided parameters.
 */
export declare const getUnlitFragmentCode: ({ chunks, toneMapping, geometry, baseColorTexture, }: UnlitFragmentShaderInputParams) => string;
