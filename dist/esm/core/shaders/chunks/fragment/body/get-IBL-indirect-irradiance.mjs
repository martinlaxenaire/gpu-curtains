const getIBLIndirectIrradiance = ({
  extensionsUsed = [],
  environmentMap = null
}) => {
  let iblIndirectDiffuse = "";
  if (environmentMap) {
    iblIndirectDiffuse += /* wgsl */
    `    
  iblIrradiance += getIBLIndirectIrradiance(
    normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  ) ;`;
    if (extensionsUsed.includes("KHR_materials_diffuse_transmission")) {
      iblIndirectDiffuse += /* wgsl */
      `    
  let diffuseTransmissionIblIrradiance: vec3f = getIBLIndirectIrradiance(
    -1.0 * normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );
  
  iblIrradiance = mix(iblIrradiance, diffuseTransmissionIblIrradiance, diffuseTransmission);`;
    }
  }
  return iblIndirectDiffuse;
};

export { getIBLIndirectIrradiance };
