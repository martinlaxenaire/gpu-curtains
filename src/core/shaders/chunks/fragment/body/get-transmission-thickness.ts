import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getTextureSample } from './get-texture-sample'

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
    transmissionThickness += getTextureSample(transmissionTexture, 'transmission')
    transmissionThickness += /* wgsl */ `
    transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`
  }

  if (thicknessTexture) {
    transmissionThickness += getTextureSample(thicknessTexture, 'thickness')
    transmissionThickness += /* wgsl */ `
  thickness *= thicknessSample.g;`
  }

  return transmissionThickness
}
