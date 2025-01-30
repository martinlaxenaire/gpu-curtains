import { UnlitFragmentShaderInputParams } from './get-fragment-shader-code';
/**
 * Build an unlit fragment shader using the provided options.
 * @param parameters - {@link UnlitFragmentShaderInputParams} used to build the unlit fragment shader.
 * @returns - The unlit fragment shader generated based on the provided parameters.
 */
export declare const getUnlitFragmentShaderCode: ({ chunks, toneMapping, geometry, materialUniform, materialUniformName, baseColorTexture, }: UnlitFragmentShaderInputParams) => string;
