const getIBLIndirect = ({
  environmentMap = null
}) => {
  let iblIndirect = "";
  if (environmentMap) {
    iblIndirect += /* wgs */
    `
  getIBLIndirect(
    normal,
    viewDirection,
    roughness,
    metallic,
    baseDiffuseColor.rgb,
    specularColor,
    specularIntensity,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
    ${environmentMap.specularTexture.options.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
    envSpecularIntensity,
    &reflectedLight
  );`;
  }
  return iblIndirect;
};

export { getIBLIndirect };
