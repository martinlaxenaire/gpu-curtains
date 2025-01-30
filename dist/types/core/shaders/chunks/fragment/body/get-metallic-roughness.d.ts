import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `metallic` (`f32`) and `roughness` (`f32`) values using the `material` binding `metallicFactor`, `roughnessFactor` values and the metallic roughness texture if any.
 * @param parameters - Parameters used to create the chunk.
 * @param parameters.metallicRoughnessTexture - {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any.
 * @returns - A string with the `metallic` (`f32`) and `roughness` (`f32`) values set.
 */
export declare const getMetallicRoughness: ({ metallicRoughnessTexture, }?: {
    metallicRoughnessTexture?: ShaderTextureDescriptor;
}) => string;
