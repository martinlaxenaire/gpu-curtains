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
  let specularSample: vec4f = textureSample(${specularTexture.texture}, ${specularTexture.sampler}, ${specularTexture.texCoordAttributeName});
  
  specularFactor = specularFactor * specularSample.a;
  specularColorFactor = specularColorFactor * specularSample.rgb;`
  } else {
    if (specularFactorTexture) {
      specular += /* wgsl */ `
  let specularFactorSample: vec4f = textureSample(${specularFactorTexture.texture}, ${specularFactorTexture.sampler}, ${specularFactorTexture.texCoordAttributeName});
  
  specularFactor = specularFactor * specularSample.a;`
    }
    if (specularColorTexture) {
      specular += /* wgsl */ `
  let specularColorSample: vec4f = textureSample(${specularColorTexture.texture}, ${specularColorTexture.sampler}, ${specularColorTexture.texCoordAttributeName});
  
  specularColorFactor = specularColorFactor * specularSample.rgb;`
    }

    specular += /* wgsl */ `
  specularFactor = mix(specularFactor, 1.0, metallic);`
  }

  return specular
}
