import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'

/**
 * Get the IBL GGX Fresnel from the environment map LUT Texture or DFG approximation, used for multi-scattering.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for GGX Fresnel if any.
 * @returns - String with GGX Fresnel applied to `dielectricScattering` (`MultiScattering`) and `metallicScattering` (`MultiScattering`).
 */
export const computeMultiScattering = ({
  environmentMap = null,
}: {
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
}): string => {
  let multiScattering = ''

  if (environmentMap && environmentMap.lutTexture) {
    multiScattering += /* wgsl */ `
  let fab: vec2f = DFGFromLUT(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );
  `
  } else {
    // if the environment map hasn't created a LUT texture
    multiScattering += /* wgsl */ `
  let fab: vec2f = DFGApprox(
    normal,
    viewDirection,
    roughness,
  );
  `
  }

  multiScattering += /* wgsl */ `
  // Both indirect specular and indirect diffuse light accumulate here
	// Compute multiscattering separately for dielectric and metallic, then mix
  computeMultiscattering(
    fab,
    specularColor,
    specularF90,
    iridescence,
    iridescenceFresnelDielectric,
    &dielectricScattering
  );
  
  computeMultiscattering(
    fab,
    diffuseColor,
    specularF90,
    iridescence,
    iridescenceFresnelMetallic,
    &metallicScattering
  );`

  return multiScattering
}
