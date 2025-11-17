const getIBLClearCoatIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null
}) => {
  let iblClearcoatIndirectSpecular = "";
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    iblClearcoatIndirectSpecular += /* wgsl */
    `
  var clearcoatRadiance = vec3(0.0);
  `;
    if (environmentMap) {
      iblClearcoatIndirectSpecular += /* wgsl */
      `
  clearcoatRadiance += getIBLIndirectRadiance(
    clearcoatNormal,
    viewDirection,
    clearcoatRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.specularTexture.options.name},
    envRotation,
    envSpecularIntensity,
  );`;
    }
  }
  return iblClearcoatIndirectSpecular;
};

export { getIBLClearCoatIndirectRadiance };
