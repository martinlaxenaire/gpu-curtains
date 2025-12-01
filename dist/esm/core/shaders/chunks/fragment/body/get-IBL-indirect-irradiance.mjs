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
  var diffuseTransmissionIblIrradiance: vec3f = getIBLIndirectIrradiance(
    -1.0 * normal,
    ${environmentMap.sampler.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
  );`;
      if (extensionsUsed.includes("KHR_materials_volume")) {
        iblIndirectDiffuse += /* wgsl */
        `
  diffuseTransmissionIblIrradiance *= volumeAttenuation(diffuseTransmissionThickness, attenuationColor, attenuationDistance);
    `;
      }
      if (extensionsUsed.includes("KHR_materials_volume_scatter")) {
        iblIndirectDiffuse += /* wgsl */
        `
  // diffuseTransmissionIblIrradiance *= 1.0 - singleVolumeScatter;
  diffuseTransmissionIblIrradiance *= singleVolumeScatter;
    `;
      }
      iblIndirectDiffuse += /* wgsl */
      `    
  iblIrradiance = mix(iblIrradiance, diffuseTransmissionIblIrradiance, diffuseTransmission);`;
    }
  }
  return iblIndirectDiffuse;
};

export { getIBLIndirectIrradiance };
