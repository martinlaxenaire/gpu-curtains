const getIBLIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null
}) => {
  let iblIndirectSpecular = "";
  if (environmentMap) {
    if (extensionsUsed.includes("KHR_materials_anisotropy")) {
      iblIndirectSpecular += /* wgsl */
      `
  iblRadiance += getIBLIndirectAnisotropyRadiance(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
    anisotropyB,
    anisotropy
  );
  
  radiance += iblRadiance;`;
    } else {
      iblIndirectSpecular += /* wgsl */
      `
  iblRadiance += getIBLIndirectRadiance(
    normal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );
  
  radiance += iblRadiance;`;
    }
  }
  return iblIndirectSpecular;
};

export { getIBLIndirectRadiance };
