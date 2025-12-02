import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Apply transmission volume refraction to `totalDiffuse` light component if applicable.
 * @param parameters - Parameters to use to apply transmission volume refraction.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.transmissiveInputColorSpace - Whether the opaque objects sampled by the transmission texture have been drawn in `linear` or `srgb` color space. Default to `srgb`.
 * @param parameters.transmissiveInputToneMapping - The tone mapping applied to the opaque objects sampled by the transmission texture, if any. Default to `Khronos`.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with transmission volume refraction applied to `totalDiffuse` light component.
 */
export declare const getIBLVolumeRefraction: ({ transmissionBackgroundTexture, transmissiveInputColorSpace, transmissiveInputToneMapping, extensionsUsed, }: {
    transmissionBackgroundTexture?: ShaderTextureDescriptor;
    transmissiveInputColorSpace?: PBRFragmentShaderInputParams["transmissiveInputColorSpace"];
    transmissiveInputToneMapping?: PBRFragmentShaderInputParams["transmissiveInputToneMapping"];
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
}) => string;
