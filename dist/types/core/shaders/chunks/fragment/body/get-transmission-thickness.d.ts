import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `transmission` (`f32`) and `thickness` (`f32`) values from the material variables and eventual textures.
 * @param parameters - Parameters used to set the `transmission` (`f32`) and `thickness` (`f32`) values
 * @param parameters.transmissionTexture - {@link ShaderTextureDescriptor | Transmission texture descriptor} to use if any.
 * @param parameters.thicknessTexture - {@link ShaderTextureDescriptor | Thickness texture descriptor} to use if any.
 * @returns - String with the `transmission` (`f32`) and `thickness` (`f32`) values set.
 */
export declare const getTransmissionThickness: ({ transmissionTexture, thicknessTexture, }?: {
    transmissionTexture?: ShaderTextureDescriptor;
    thicknessTexture?: ShaderTextureDescriptor;
}) => string;
