const getIBLIndirectRadiance = ({
  environmentMap = null
}) => {
  let iblIndirectSpecular = "";
  if (environmentMap) {
    iblIndirectSpecular += /* wgs */
    `
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
  );`;
  }
  return iblIndirectSpecular;
};

export { getIBLIndirectRadiance };
