import { PBRFragmentShaderInputParams } from './get-fragment-shader-code';
/**
 * Build a PBR fragment shader using the provided options.
 * @param parameters - {@link PBRFragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export declare const getPBRFragmentShaderCode: ({ chunks, toneMapping, outputColorSpace, fragmentOutput, geometry, additionalVaryings, materialUniform, materialUniformName, extensionsUsed, receiveShadows, baseColorTexture, normalTexture, emissiveTexture, occlusionTexture, metallicRoughnessTexture, specularTexture, specularFactorTexture, specularColorTexture, transmissionTexture, thicknessTexture, sheenTexture, sheenColorTexture, sheenRoughnessTexture, anisotropyTexture, clearcoatTexture, clearcoatRoughnessTexture, clearcoatNormalTexture, iridescenceTexture, iridescenceFactorTexture, iridescenceThicknessTexture, diffuseTransmissionTexture, diffuseTransmissionFactorTexture, diffuseTransmissionColorTexture, transmissionBackgroundTexture, environmentMap, }: PBRFragmentShaderInputParams) => string;
