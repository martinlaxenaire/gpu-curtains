import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getTextureSample } from './get-texture-sample'

/**
 * Set the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values from the material clearcoat variables and eventual clearcoat textures.
 *
 * @param parameters - Parameters used to set the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.clearcoatTexture - {@link ShaderTextureDescriptor | Clearcoat texture descriptor} (mixing both clearcoat factor in the `R` channel and roughness in the `G` channel) to use if any.
 * @param parameters.clearcoatFactorTexture - {@link ShaderTextureDescriptor | Clearcoat factor texture descriptor} (using the `R` channel) to use if any.
 * @param parameters.clearcoatRoughnessTexture - {@link ShaderTextureDescriptor | Clearcoat roughness texture descriptor} (using the `G` channel) to use if any.
 * @returns - String with the `clearcoat` (`f32`) and `clearcoatRoughness` (`f32`) values set.
 */
export const getClearcoat = ({
  extensionsUsed = [],
  clearcoatTexture = null,
  clearcoatFactorTexture = null,
  clearcoatRoughnessTexture = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  clearcoatTexture?: ShaderTextureDescriptor
  clearcoatFactorTexture?: ShaderTextureDescriptor
  clearcoatRoughnessTexture?: ShaderTextureDescriptor
}): string => {
  let clearcoat = /* wgsl */ `
  var clearcoatF0: vec3f = vec3(pow((ior - 1.0) / (ior + 1.0), 2.0));
  var clearcoatF90: f32 = 1.0;
  
  var clearcoatSpecularDirect: vec3f = vec3( 0.0 );
  var clearcoatSpecularIndirect: vec3f = vec3( 0.0 );`

  if (!extensionsUsed.includes('KHR_materials_clearcoat')) {
    return clearcoat
  }

  if (clearcoatTexture) {
    clearcoat += getTextureSample(clearcoatTexture, 'clearcoat')
    clearcoat += /* wgsl */ `
  clearcoat = clearcoat * clearcoatSample.r;
  clearcoatRoughness = clearcoatRoughness * clearcoatSample.g;
    `
  } else {
    if (clearcoatFactorTexture) {
      clearcoat += getTextureSample(clearcoatFactorTexture, 'clearcoatFactor')
      clearcoat += /* wgsl */ `
  clearcoat = clearcoat * clearcoatFactorSample.r;
    `
    }

    if (clearcoatRoughnessTexture) {
      clearcoat += getTextureSample(clearcoatRoughnessTexture, 'clearcoatRoughness')
      clearcoat += /* wgsl */ `
  clearcoatRoughness = clearcoatRoughness * clearcoatRoughnessSample.g;
    `
    }
  }

  clearcoat += /* wgsl */ `
  clearcoatRoughness = max( clearcoatRoughness, 0.0525 );
  clearcoatRoughness += geometryRoughness;
  clearcoatRoughness = min( clearcoatRoughness, 1.0 );
  `

  return clearcoat
}

/**
 * Set the `clearcoatNormal` (`vec3f`) value from the material eventual clearcoat normal or normal textures.
 *
 * @param parameters - Parameters used to set the anisotropy values.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if clearcoat is enabled.
 * @param parameters.normalTexture - {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any.
 * @param parameters.clearcoatNormalTexture - {@link ShaderTextureDescriptor | Clearcoat normal texture descriptor} to use if any.
 * @returns - String with the `clearcoatNormal` (`vec3f`) value set.
 */
export const getClearcoatNormal = ({
  extensionsUsed = [],
  normalTexture = null,
  clearcoatNormalTexture = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  normalTexture?: ShaderTextureDescriptor
  clearcoatNormalTexture?: ShaderTextureDescriptor
}): string => {
  let clearcoatNormal = /* wgsl */ `
  var clearcoatNormal: vec3f = geometryNormal;`

  if (!extensionsUsed.includes('KHR_materials_clearcoat')) {
    return clearcoatNormal
  }

  if (clearcoatNormalTexture) {
    if (normalTexture) {
      clearcoatNormal += /* wgsl */ `
    let clearcoatNormalSample = textureSample(${clearcoatNormalTexture.texture.options.name}, ${
        clearcoatNormalTexture.sampler?.name ?? 'defaultSampler'
      }, normalUV);`
    } else {
      clearcoatNormal += getTextureSample(clearcoatNormalTexture, 'clearcoatNormal')
    }

    clearcoatNormal += /* wgsl */ `
  var clearcoatMapN: vec3f = clearcoatNormalSample.rgb * 2.0 - 1.0;
  clearcoatMapN = vec3(clearcoatMapN.x * clearcoatNormalScale.x, clearcoatMapN.y * clearcoatNormalScale.y, clearcoatMapN.z);
  clearcoatNormal = normalize(tbn * clearcoatMapN);
  `
  }

  return clearcoatNormal
}
