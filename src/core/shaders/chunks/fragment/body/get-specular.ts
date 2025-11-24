import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `specularIntensity` (`f32`) and `specularColor` (`vec3f`) values from the material specular variables and eventual specular textures.
 * @param parameters - Parameters used to set the `specularIntensity` (`f32`) and `specularColor` (`vec3f`) values.
 * @param parameters.specularTexture - {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any.
 * @param parameters.specularFactorTexture - {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any.
 * @param parameters.specularColorTexture - {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any.
 * @returns - String with the `specularIntensity` (`f32`) and `specularColor` (`vec3f`) values set.
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
  let specular = /* wgsl */ `
  var specularF90: f32 = 1.0;`

  if (specularTexture) {
    specular += getTextureSample(specularTexture, 'specular')
    specular += /* wgsl */ `
  specularIntensity = specularIntensity * specularSample.a;
  specularColor = specularColor * specularSample.rgb;`
  } else {
    if (specularFactorTexture) {
      specular += getTextureSample(specularFactorTexture, 'specularFactor')
      specular += /* wgsl */ `
  specularIntensity = specularIntensity * specularFactorSample.a;`
    }

    if (specularColorTexture) {
      specular += getTextureSample(specularColorTexture, 'specularColor')
      specular += /* wgsl */ `
  specularColor = specularColor * specularColorSample.rgb;`
    }
  }

  specular += /* wgsl */ `
  specularF90 = mix(specularIntensity, 1.0, metallic);
  specularColor = min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity;
  let specularColorBlended: vec3f = mix(specularColor, diffuseColor, metallic);
  `

  return specular
}
