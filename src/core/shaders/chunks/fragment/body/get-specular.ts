import { ShaderTextureDescriptor } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Set the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values from the material specular variables and eventual specular textures.
 * @param parameters - Parameters used to set the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values.
 * @param parameters.specularTexture - {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any.
 * @param parameters.specularFactorTexture - {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any.
 * @param parameters.specularColorTexture - {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any.
 * @returns - String with the `specularFactor` (`f32`) and `specularColorFactor` (`vec3f`) values set.
 */
export const getSpecular = ({
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null,
}: {
  specularTexture?: ShaderTextureDescriptor
  specularFactorTexture?: ShaderTextureDescriptor
  specularColorTexture?: ShaderTextureDescriptor
} = {}): string => {
  let specular = ''

  if (specularTexture) {
    specular += /* wgsl */ `
  var specularUV: vec2f = ${specularTexture.texCoordAttributeName ?? 'uv'};`

    if (specularTexture.texture.options.useTransform) {
      specular += /* wgsl */ `
  specularUV = (${specularTexture.texture.options.name}Matrix * vec3(specularUV, 1.0)).xy;`
    }

    specular += /* wgsl */ `
  let specularSample: vec4f = textureSample(${specularTexture.texture.options.name}, ${
      specularTexture.sampler?.name ?? 'defaultSampler'
    }, specularUV);
  
  specularIntensity = specularIntensity * specularSample.a;
  specularColor = specularColor * specularSample.rgb;`
  } else {
    if (specularFactorTexture) {
      specular += /* wgsl */ `
  var specularFactorUV: vec2f = ${specularFactorTexture.texCoordAttributeName ?? 'uv'};`

      if (specularFactorTexture.texture.options.useTransform) {
        specular += /* wgsl */ `
  specularFactorUV = (${specularFactorTexture.texture.options.name}Matrix * vec3(specularFactorUV, 1.0)).xy;`
      }

      specular += /* wgsl */ `
  let specularFactorSample: vec4f = textureSample(${specularFactorTexture.texture.options.name}, ${
        specularFactorTexture.sampler?.name ?? 'defaultSampler'
      }, specularFactorUV);
  
  specularIntensity = specularIntensity * specularSample.a;`
    }

    if (specularColorTexture) {
      specular += /* wgsl */ `
  var specularColorUV: vec2f = ${specularColorTexture.texCoordAttributeName ?? 'uv'};`

      if (specularColorTexture.texture.options.useTransform) {
        specular += /* wgsl */ `
  specularColorUV = (${specularColorTexture.texture.options.name}Matrix * vec3(specularColorUV, 1.0)).xy;`
      }

      specular += /* wgsl */ `
  let specularColorSample: vec4f = textureSample(${specularColorTexture.texture.options.name}, ${
        specularColorTexture.sampler?.name ?? 'defaultSampler'
      }, specularColorUV);
  
  specularColor = specularColor * specularSample.rgb;`
    }
  }

  return specular
}
