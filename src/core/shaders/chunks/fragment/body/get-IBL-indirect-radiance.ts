import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map indirect radiance (specular).
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if anisotropy is enabled.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect radiance if any.
 * @returns - String with environment map indirect radiance applied to `radiance` (`vec3f`).
 */
export const getIBLIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblIndirectSpecular = ''

  if (environmentMap) {
    if (extensionsUsed.includes('KHR_materials_anisotropy')) {
      iblIndirectSpecular += /* wgsl */ `
  iblRadiance += getIBLIndirectAnisotropyRadiance(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
    anisotropyB,
    anisotropy
  );
  
  radiance += iblRadiance;`
    } else {
      iblIndirectSpecular += /* wgsl */ `
  iblRadiance += getIBLIndirectRadiance(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );
  
  radiance += iblRadiance;`
    }
  }

  return iblIndirectSpecular
}
