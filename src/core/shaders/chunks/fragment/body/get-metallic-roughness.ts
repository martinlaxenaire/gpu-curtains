import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the `metallic` (`f32`) and `roughness` (`f32`) values using the `material` binding `metallicFactor`, `roughnessFactor` values and the metallic roughness texture if any.
 * @param parameters - Parameters used to create the chunk.
 * @param parameters.metallicRoughnessTexture - {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any.
 * @returns - A string with the `metallic` (`f32`) and `roughness` (`f32`) values set.
 */
export const getMetallicRoughness = ({
  metallicRoughnessTexture = null,
}: {
  metallicRoughnessTexture?: ShaderTextureDescriptor
} = {}): string => {
  let metallicRoughness = ''

  if (metallicRoughnessTexture) {
    metallicRoughness += /* wgsl */ `
  let metallicRoughness = textureSample(${metallicRoughnessTexture.texture}, ${metallicRoughnessTexture.sampler}, ${metallicRoughnessTexture.texCoordAttributeName});
  
  metallic = metallic * metallicRoughness.b;
  roughness = roughness * metallicRoughness.g;
  `
  }

  metallicRoughness += /* wgsl */ `
  metallic = saturate(metallic);
  roughness = saturate(roughness);
  `

  return metallicRoughness
}
