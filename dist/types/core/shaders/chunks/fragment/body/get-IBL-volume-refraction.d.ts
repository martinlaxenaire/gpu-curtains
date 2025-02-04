import { FragmentShaderBaseInputParams, ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Apply transmission volume refraction to `totalDiffuse` light component if applicable.
 * @param parameters - Parameters to use to apply transmission volume refraction.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with transmission volume refraction applied to `totalDiffuse` light component.
 */
export declare const getIBLVolumeRefraction: ({ transmissionBackgroundTexture, extensionsUsed, }: {
    transmissionBackgroundTexture?: ShaderTextureDescriptor;
    extensionsUsed?: FragmentShaderBaseInputParams['extensionsUsed'];
}) => string;
