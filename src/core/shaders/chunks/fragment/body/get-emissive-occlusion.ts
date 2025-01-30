import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the `emissive` (`vec3f`) and `occlusion` (`f32`) values to use in our shader.
 * @param parameters - Parameters to use to set the emissive and occlusion values.
 * @param parameters.emissiveTexture - {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any.
 * @param parameters.occlusionTexture - {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any.
 * @returns - A string with `emissive` (`vec3f`) and `occlusion` (`f32`) values set.
 */
export const getEmissiveOcclusion = ({
  emissiveTexture = null,
  occlusionTexture = null,
}: {
  emissiveTexture?: ShaderTextureDescriptor
  occlusionTexture?: ShaderTextureDescriptor
} = {}): string => {
  let emissiveOcclusion = /* wgsl */ `
  var occlusion: f32 = 1.0;`

  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */ `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture}, ${emissiveTexture.sampler}, ${emissiveTexture.texCoordAttributeName}).rgb;
  emissive *= emissiveSample;`
  }

  emissiveOcclusion += /* wgsl */ `
  emissive *= emissiveStrength;`

  if (occlusionTexture) {
    emissiveOcclusion += /* wgsl */ `
  occlusion = textureSample(${occlusionTexture.texture}, ${occlusionTexture.sampler}, ${occlusionTexture.texCoordAttributeName}).r;`
  }

  emissiveOcclusion += /* wgsl */ `
  occlusion = 1.0 + occlusionIntensity * (occlusion - 1.0);`

  return emissiveOcclusion
}
