import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `anisotropy` (`f32`), `anisotropyVector` (`vec2f`), as well as `alphaT` (`f32`), `anisotropyT` (`vec3f`) and `anisotropyB` (`vec3f`) values from the material anisotropy variables, `TBN` matrix and eventual anisotropy texture.
 * @param parameters - Parameters used to set the anisotropy values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @param parameters.anisotropyTexture - {@link ShaderTextureDescriptor | Anisotropy texture descriptor} (using the `RGB` channel) to use if any. `R` and `G` channels represent the anisotropy direction in `[-1, 1]` tangent, bitangent space to be rotated by the anisotropy rotation. The `B` channel contains strength as `[0, 1]` to be multiplied by the `anisotropy`.
 * @returns - String with the `anisotropy` (`f32`), `anisotropyVector` (`vec2f`), as well as `alphaT` (`f32`), `anisotropyT` (`vec3f`) and `anisotropyB` (`vec3f`) values set.
 */
export declare const getAnisotropy: ({ extensionsUsed, anisotropyTexture, }?: {
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
    anisotropyTexture?: ShaderTextureDescriptor;
}) => string;
