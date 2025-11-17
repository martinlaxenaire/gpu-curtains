import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'

/**
 * Helper to sample a texture with the corresponding UV and eventual transformation.
 *
 * @param texture - {@link ShaderTextureDescriptor | Texture descriptor} to use.
 * @param textureName - Name to use for the declared variables.
 * @returns - The sampled texture as `${textureName}Sample` (`vec4f`).
 */
export const getTextureSample = (texture: ShaderTextureDescriptor, textureName: string = 'texture'): string => {
  let sample = ''

  if (!texture) return sample

  sample += /* wgsl */ `
  var ${textureName}UV: vec2f = ${texture.texCoordAttributeName ?? 'uv'};`

  if ('useTransform' in texture.texture.options && texture.texture.options.useTransform) {
    sample += /* wgsl */ `
  ${textureName}UV = (texturesMatrices.${texture.texture.options.name}.matrix * vec3(${textureName}UV, 1.0)).xy;`
  }

  sample += /* wgsl */ `
  let ${textureName}Sample: vec4f = textureSample(${texture.texture.options.name}, ${
    texture.sampler?.name ?? 'defaultSampler'
  }, ${textureName}UV);`

  return sample
}
