import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the IBL GGX Fresnel from the environment map LUT Texture or DFG approximation, used for multi-scattering.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL GGX Fresnel any.
 * @returns - String with IBL GGX Fresnel applied to `iBLGGXFresnel` (`IBLGGXFresnel`).
 */
export const computeMultiScattering = ({
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
  let fab: vec2f = LUT_DFGA(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`
  } else {
    // if the environment map hasn't created a LUT texture
    iblIGGXFresnel += /* wgsl */ `
  let fab: vec2f = DFGApprox(
    normal,
    viewDirection,
    roughness,
  );`
  }

  iblIGGXFresnel += /* wgsl */ `
  computeMultiscattering(
    fab,
    specularColor,
    specularIntensity,
    iridescenceF0,
    iridescence,
    &iBLGGXFresnel
  );`

  return iblIGGXFresnel
}
