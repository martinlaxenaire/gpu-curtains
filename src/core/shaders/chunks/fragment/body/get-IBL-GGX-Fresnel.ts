import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the environment map IBL GGX Fresnel from the environment map LUT Texture, used for multi-scattering.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL GGX Fresnel any.
 * @returns - String with IBL GGX Fresnel applied to `iBLGGXFresnel` (`IBLGGXFresnel`).
 */
export const getIBLGGXFresnel = ({
  environmentMap = null,
}: {
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let iblIGGXFresnel = /* wgsl */ `
  var iBLGGXFresnel: IBLGGXFresnel;`

  // since the LUT-based IBL GGX Fresnel approach is already handling energy conservation
  // we do not need to manually compute multi scattering here
  if (environmentMap && environmentMap.lutTexture) {
    iblIGGXFresnel += /* wgsl */ `
  iBLGGXFresnel = getIBLGGXFresnel(
    normal,
    viewDirection,
    roughness,
    specularColor,
    specularIntensity,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`
  } else {
    // should not happen
    // but again, if we'd want to remove LUT texture from environment map one day
    // this would be used
    iblIGGXFresnel += /* wgsl */ `
  computeMultiscattering(
    normal,
    viewDirection,
    specularColor,
    specularIntensity,
    roughness,
    &iBLGGXFresnel
  );`
  }

  return iblIGGXFresnel
}
