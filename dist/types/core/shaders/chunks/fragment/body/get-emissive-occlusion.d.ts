import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `emissive` (`vec3f`) and `occlusion` (`f32`) values to use in our shader.
 * @param parameters - Parameters to use to set the emissive and occlusion values.
 * @param parameters.emissiveTexture - {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any.
 * @param parameters.occlusionTexture - {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any.
 * @returns - A string with `emissive` (`vec3f`) and `occlusion` (`f32`) values set.
 */
export declare const getEmissiveOcclusion: ({ emissiveTexture, occlusionTexture, }?: {
    emissiveTexture?: ShaderTextureDescriptor;
    occlusionTexture?: ShaderTextureDescriptor;
}) => string;
