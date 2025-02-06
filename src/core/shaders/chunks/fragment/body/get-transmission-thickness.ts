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
  var transmissionUV: vec2f = ${transmissionTexture.texCoordAttributeName ?? 'uv'};`

    if ('useTransform' in transmissionTexture.texture.options && transmissionTexture.texture.options.useTransform) {
      transmissionThickness += /* wgsl */ `
  transmissionUV = (${transmissionTexture.texture.options.name}Matrix * vec3(transmissionUV, 1.0)).xy;`
    }

    transmissionThickness += /* wgsl */ `
  let transmissionSample: vec4f = textureSample(${transmissionTexture.texture.options.name}, ${
      transmissionTexture.sampler?.name ?? 'defaultSampler'
    }, transmissionUV);
  
  transmission = clamp(transmission * transmissionSample.r, 0.0, 1.0);`
  }

  if (thicknessTexture) {
    transmissionThickness += /* wgsl */ `
  var thicknessUV: vec2f = ${thicknessTexture.texCoordAttributeName ?? 'uv'};`

    if ('useTransform' in thicknessTexture.texture.options && thicknessTexture.texture.options.useTransform) {
      transmissionThickness += /* wgsl */ `
  thicknessUV = (${thicknessTexture.texture.options.name}Matrix * vec3(thicknessUV, 1.0)).xy;`
    }

    transmissionThickness += /* wgsl */ `
  let thicknessSample: vec4f = textureSample(${thicknessTexture.texture.options.name}, ${
      thicknessTexture.sampler?.name ?? 'defaultSampler'
    }, thicknessUV);
  
  thickness *= thicknessSample.g;`
  }

  return transmissionThickness
}
