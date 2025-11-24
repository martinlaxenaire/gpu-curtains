const getIBLIndirectIrradiance = ({
  environmentMap = null
}) => {
  let iblIndirectDiffuse = "";
  if (environmentMap) {
    iblIndirectDiffuse += /* wgsl */
    `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    diffuseContribution,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`;
  }
  return iblIndirectDiffuse;
};

export { getIBLIndirectIrradiance };
