import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-code'

/**
 * Set the `emissive` (`vec3f`) and `occlusion` (`f32`) values to use in our shader.
 * @param emissiveTexture - {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any.
 * @param occlusionTexture - {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any.
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
  var emissive: vec3f = emissiveFactor;
  var occlusion: f32 = 1.0;`

  if (emissiveTexture) {
    emissiveOcclusion += /* wgsl */ `
  let emissiveSample: vec3f = textureSample(${emissiveTexture.texture}, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
  emissive *= emissiveSample;`
  }

  emissiveOcclusion += /* wgsl */ `
  emissive *= emissiveStrength;`

  if (occlusionTexture) {
    emissiveOcclusion += /* wgsl */ `
  occlusion = textureSample(${occlusionTexture.texture}, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;`
  }

  emissiveOcclusion += /* wgsl */ `
  occlusion = 1.0 + occlusionStrength * (occlusion - 1.0);`

  return emissiveOcclusion
}
