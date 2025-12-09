import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code';
/**
 * Set the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values from the material diffuse transmission variables and eventual diffuse transmission textures.
 *
 * @param parameters - Parameters used to set the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if diffuse transmission is enabled.
 * @param parameters.diffuseTransmissionTexture - {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels for color and `A` channel for intensity) to use if any.
 * @param parameters.diffuseTransmissionFactorTexture - {@link ShaderTextureDescriptor | Diffuse transmission intensity texture descriptor} (using the `A` channel) to use if any.
 * @param parameters.diffuseTransmissionColorTexture - {@link ShaderTextureDescriptor | Diffuse transmission texture descriptor} (using the `RGB` channels) to use if any.
 * @returns - String with the `diffuseTransmission` (`f32`) and `diffuseTransmissionColor` (`vec3f`) values set.
 */
export declare const getDiffuseTransmission: ({ extensionsUsed, diffuseTransmissionTexture, diffuseTransmissionFactorTexture, diffuseTransmissionColorTexture, }: {
    extensionsUsed?: PBRFragmentShaderInputParams["extensionsUsed"];
    diffuseTransmissionTexture?: ShaderTextureDescriptor;
    diffuseTransmissionFactorTexture?: ShaderTextureDescriptor;
    diffuseTransmissionColorTexture?: ShaderTextureDescriptor;
}) => string;
