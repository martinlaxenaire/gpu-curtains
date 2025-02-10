import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values from the material specular variables and eventual specular textures.
 * @param parameters - Parameters used to set the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values.
 * @param parameters.specularTexture - {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any.
 * @param parameters.specularFactorTexture - {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any.
 * @param parameters.specularColorTexture - {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any.
 * @returns - String with the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values set.
 */
export declare const getSpecular: ({ specularTexture, specularFactorTexture, specularColorTexture, }?: {
    specularTexture?: ShaderTextureDescriptor;
    specularFactorTexture?: ShaderTextureDescriptor;
    specularColorTexture?: ShaderTextureDescriptor;
}) => string;
