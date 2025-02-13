const getIBLGGXFresnel = ({
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
  iBLGGXFresnel = getIBLGGXFresnel(
    normal,
    viewDirection,
    roughness,
    specularColor,
    specularIntensity,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
  } else {
    iblIGGXFresnel += /* wgsl */
    `
  computeMultiscattering(
    normal,
    viewDirection,
    specularColor,
    specularIntensity,
    roughness,
    &iBLGGXFresnel
  );`;
  }
  return iblIGGXFresnel;
};

export { getIBLGGXFresnel };
