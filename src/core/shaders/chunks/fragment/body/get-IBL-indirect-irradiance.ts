import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map indirect irradiance (diffuse).
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect irradiance if any.
 * @returns - String with environment map indirect irradiance applied to `iblIrradiance` (`vec3f`).
 */
export const getIBLIndirectIrradiance = ({
  environmentMap = null,
}: {
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblIndirectDiffuse = ''

  if (environmentMap) {
    iblIndirectDiffuse += /* wgs */ `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    baseDiffuseColor.rgb,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`
  }

  return iblIndirectDiffuse
}
