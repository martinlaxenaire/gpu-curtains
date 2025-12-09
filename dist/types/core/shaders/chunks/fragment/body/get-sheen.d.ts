import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values from the material sheen variables and eventual sheen textures.
 * @param parameters - Parameters used to set the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if sheen is enabled.
 * @param parameters.sheenTexture - {@link ShaderTextureDescriptor | Sheen texture descriptor} (mixing both sheen color in the `RGB` channels and sheen roughness in the `A` channel) to use if any.
 * @param parameters.sheenColorTexture - {@link ShaderTextureDescriptor | Sheen color texture descriptor} (using the `RGB` channels) to use if any.
 * @param parameters.sheenRoughnessTexture - {@link ShaderTextureDescriptor | Sheen roughness texture descriptor} (using the `A` channel) to use if any.
 * @returns - String with the `sheenRoughness` (`f32`) and `sheenColor` (`vec3f`) values set.
 */
export declare const getSheen: ({ extensionsUsed, sheenTexture, sheenColorTexture, sheenRoughnessTexture, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
    sheenTexture?: ShaderTextureDescriptor;
    sheenColorTexture?: ShaderTextureDescriptor;
    sheenRoughnessTexture?: ShaderTextureDescriptor;
}) => string;
