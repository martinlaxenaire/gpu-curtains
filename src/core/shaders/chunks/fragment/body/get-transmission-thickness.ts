import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the `transmission` (`f32`) and `thickness` (`f32`) values from the material variables and eventual textures.
 * @param parameters - Parameters used to set the `transmission` (`f32`) and `thickness` (`f32`) values
 * @param parameters.transmissionTexture - {@link ShaderTextureDescriptor | Transmission texture descriptor} to use if any.
 * @param parameters.thicknessTexture - {@link ShaderTextureDescriptor | Thickness texture descriptor} to use if any.
 * @returns - String with the `transmission` (`f32`) and `thickness` (`f32`) values set.
 */
export const getTransmissionThickness = ({
  transmissionTexture = null,
  thicknessTexture = null,
}: {
  transmissionTexture?: ShaderTextureDescriptor
  thicknessTexture?: ShaderTextureDescriptor
} = {}): string => {
  let transmissionThickness = ''

  if (transmissionTexture) {
    transmissionThickness += /* wgsl */ `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture}, ${transmissionTexture.sampler}, ${transmissionTexture.texCoordAttributeName});
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`
  }

  if (thicknessTexture) {
    transmissionThickness += /* wgsl */ `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture}, ${thicknessTexture.sampler}, ${thicknessTexture.texCoordAttributeName});
  
  thickness *= thicknessSample.g;`
  }

  return transmissionThickness
}
