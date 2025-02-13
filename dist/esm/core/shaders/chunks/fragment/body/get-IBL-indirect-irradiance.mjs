const getIBLIndirectIrradiance = ({
  environmentMap = null
}) => {
  let iblIndirectDiffuse = "";
  if (environmentMap) {
    iblIndirectDiffuse += /* wgs */
    `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    baseDiffuseColor.rgb,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`;
  }
  return iblIndirectDiffuse;
};

export { getIBLIndirectIrradiance };
