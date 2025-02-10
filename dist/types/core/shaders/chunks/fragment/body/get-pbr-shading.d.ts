import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `outgoingLight` (`vec3f`) using PBR shading.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading if any.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with PBR shading applied to `outgoingLight`.
 */
export declare const getPBRShading: ({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed, }?: {
    receiveShadows?: boolean;
    environmentMap?: PBRFragmentShaderInputParams['environmentMap'];
    transmissionBackgroundTexture?: ShaderTextureDescriptor;
    extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed'];
}) => string;
