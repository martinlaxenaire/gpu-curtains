//#region src/core/shaders/chunks/fragment/body/get-multi-scattering.ts
/**
* Get the IBL GGX Fresnel from the environment map LUT Texture or DFG approximation, used for multi-scattering.
* @param parameters - Parameters to use to apply PBR shading.
* @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for GGX Fresnel if any.
* @returns - String with GGX Fresnel applied to `dielectricScattering` (`MultiScattering`) and `metallicScattering` (`MultiScattering`).
*/
const computeMultiScattering = ({ environmentMap = null }) => {
	let multiScattering = "";
	if (environmentMap && environmentMap.lutTexture) multiScattering += `
  let fab: vec2f = DFGFromLUT(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );
  `;
	else multiScattering += `
  let fab: vec2f = DFGApprox(
    normal,
    viewDirection,
    roughness,
  );
  `;
	multiScattering += `
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
  );`;
	return multiScattering;
};
//#endregion
export { computeMultiScattering };
