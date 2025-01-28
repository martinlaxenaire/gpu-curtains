import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-code';
/**
 * Set the `emissive` (`vec3f`) and `occlusion` (`f32`) values to use in our shader.
 * @param emissiveTexture - {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any.
 * @param occlusionTexture - {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any.
 * @returns - A string with `emissive` (`vec3f`) and `occlusion` (`f32`) values set.
 */
export declare const getEmissiveOcclusion: ({ emissiveTexture, occlusionTexture, }?: {
    emissiveTexture?: ShaderTextureDescriptor;
    occlusionTexture?: ShaderTextureDescriptor;
}) => string;
