import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map indirect irradiance (diffuse).
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.extensionsUsed - {@link PBRFragmentShaderInputParams.extensionsUsed | extensionsUsed} to check if diffuse transmission is enabled.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect irradiance if any.
 * @returns - String with environment map indirect irradiance applied to `iblIrradiance` (`vec3f`).
 */
export const getIBLIndirectIrradiance = ({
  extensionsUsed = [],
  environmentMap = null,
}: {
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblIndirectDiffuse = ''

  if (environmentMap) {
    iblIndirectDiffuse += /* wgsl */ `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  ) ;`

    if (extensionsUsed.includes('KHR_materials_diffuse_transmission')) {
      iblIndirectDiffuse += /* wgsl */ `    
  let diffuseTransmissionIblIrradiance: vec3f = getIBLIndirectIrradiance(
    -1.0 * normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );
  
  iblIrradiance = mix(iblIrradiance, diffuseTransmissionIblIrradiance, diffuseTransmission);`
    }
  }

  return iblIndirectDiffuse
}
