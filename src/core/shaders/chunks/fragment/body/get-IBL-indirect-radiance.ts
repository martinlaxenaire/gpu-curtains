import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map indirect radiance (specular).
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect radiance if any.
 * @returns - String with environment map indirect radiance applied to `radiance` (`vec3f`).
 */
export const getIBLIndirectRadiance = ({
  environmentMap = null,
}: {
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblIndirectSpecular = ''

  if (environmentMap) {
    iblIndirectSpecular += /* wgs */ `
  radiance += getIBLIndirectRadiance(
    normal,
    viewDirection,
    roughness,
    specularColor,
    specularIntensity,
    iBLGGXFresnel,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );`
  }

  return iblIndirectSpecular
}
