import { FragmentShaderBaseInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map indirect lighting contribution.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for indirect lighting if any.
 * @returns - String with environment map indirect lighting contribution applied.
 */
export const getIBLIndirect = ({
  environmentMap = null,
}: {
  environmentMap?: FragmentShaderBaseInputParams['environmentMap']
}): string => {
  let iblIndirect = ''

  if (environmentMap) {
    iblIndirect += /* wgs */ `
  getIBLIndirect(
    normal,
    viewDirection,
    roughness,
    metallic,
    baseDiffuseColor.rgb,
    specularColor,
    specularIntensity,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
    ${environmentMap.specularTexture.options.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
    envSpecularIntensity,
    &reflectedLight
  );`
  }

  return iblIndirect
}
