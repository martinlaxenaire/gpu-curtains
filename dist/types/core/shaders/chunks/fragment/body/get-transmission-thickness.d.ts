import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh';
/**
 * Set the `transmission` (`f32`) and `thickness` (`f32`) values from the material variables and eventual textures.
 * @param parameters - Parameters used to set the `transmission` (`f32`) and `thickness` (`f32`) values
 * @param parameters.transmissionThicknessTexture - {@link ShaderTextureDescriptor | Transmission thickness texture descriptor} (using the `R` channel for transmission and the `G` channel for thickness) to use if any.
 * @param parameters.transmissionTexture - {@link ShaderTextureDescriptor | Transmission texture descriptor} (using the `R` channel) to use if any.
 * @param parameters.thicknessTexture - {@link ShaderTextureDescriptor | Thickness texture descriptor} (using the `G` channel) to use if any.
 * @returns - String with the `transmission` (`f32`) and `thickness` (`f32`) values set.
 */
export declare const getTransmissionThickness: ({ transmissionThicknessTexture, transmissionTexture, thicknessTexture, }?: {
    transmissionThicknessTexture?: ShaderTextureDescriptor;
    transmissionTexture?: ShaderTextureDescriptor;
    thicknessTexture?: ShaderTextureDescriptor;
}) => string;
