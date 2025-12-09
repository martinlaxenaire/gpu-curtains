import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values from the material clearcoat variables and eventual clearcoat textures.
 *
 * @param parameters - Parameters used to set the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.clearcoatTexture - {@link ShaderTextureDescriptor | Clearcoat texture descriptor} (mixing both clearcoat factor in the `R` channel and roughness in the `G` channel) to use if any.
 * @param parameters.clearcoatFactorTexture - {@link ShaderTextureDescriptor | Clearcoat factor texture descriptor} (using the `R` channel) to use if any.
 * @param parameters.clearcoatRoughnessTexture - {@link ShaderTextureDescriptor | Clearcoat roughness texture descriptor} (using the `G` channel) to use if any.
 * @returns - String with the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values set.
 */
export declare const getClearcoat: ({ extensionsUsed, clearcoatTexture, clearcoatFactorTexture, clearcoatRoughnessTexture, }: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
    clearcoatTexture?: ShaderTextureDescriptor;
    clearcoatFactorTexture?: ShaderTextureDescriptor;
    clearcoatRoughnessTexture?: ShaderTextureDescriptor;
}) => string;
/**
 * Set the `clearcoatNormal` (`vec3f`) value from the material eventual clearcoat normal or normal textures.
 *
 * @param parameters - Parameters used to set the anisotropy values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @param parameters.clearcoatNormalTexture - {@link ShaderTextureDescriptor | Clearcoat normal texture descriptor} to use if any.
 * @returns - String with the `clearcoatNormal` (`vec3f`) value set.
 */
export declare const getClearcoatNormal: ({ extensionsUsed, normalTexture, clearcoatNormalTexture, }: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
    normalTexture?: ShaderTextureDescriptor;
    clearcoatNormalTexture?: ShaderTextureDescriptor;
}) => string;
