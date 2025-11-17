const computeMultiScattering = ({
  environmentMap = null
}) => {
  let iblIGGXFresnel = (
    /* wgsl */
    `
  var iBLGGXFresnel: IBLGGXFresnel;`
  );
  if (environmentMap && environmentMap.lutTexture) {
    iblIGGXFresnel += /* wgsl */
    `
  let fab: vec2f = LUT_DFGA(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
  } else {
    iblIGGXFresnel += /* wgsl */
    `
  let fab: vec2f = DFGApprox(
    normal,
    viewDirection,
    roughness,
  );`;
  }
  iblIGGXFresnel += /* wgsl */
  `
  computeMultiscattering(
    fab,
    specularColor,
    specularIntensity,
    iridescenceF0,
    iridescence,
    &iBLGGXFresnel
  );`;
  return iblIGGXFresnel;
};

export { computeMultiScattering };
