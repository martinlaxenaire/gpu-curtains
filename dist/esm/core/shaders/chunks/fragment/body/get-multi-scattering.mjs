const computeMultiScattering = ({
  environmentMap = null
}) => {
  let multiScattering = "";
  if (environmentMap && environmentMap.lutTexture) {
    multiScattering += /* wgsl */
    `
  let fab: vec2f = DFGFromLUT(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
  } else {
    multiScattering += /* wgsl */
    `
  let fab: vec2f = DFGApprox(
    normal,
    viewDirection,
    roughness,
  );`;
  }
  multiScattering += /* wgsl */
  `
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

export { computeMultiScattering };
