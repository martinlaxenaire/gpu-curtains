const getPBRDirectContribution = ({
  extensionsUsed = [],
  environmentMap = null
} = {}) => {
  let pbrDirect = "";
  if (environmentMap && environmentMap.lutTexture) {
    pbrDirect += /* wgsl */
    `
    // Precomputed DFG values for view and light directions from LUT
    let dfgDirect: DFGDirect = DFGDirectFromLUT(
      normal,
      viewDirection,
      directLight.direction,
      roughness,
      ${environmentMap.sampler.name},
      ${environmentMap.lutTexture.options.name},
    );
    `;
  } else {
    pbrDirect += /* wgsl */
    `
    // Precomputed DFG values for view and light directions from approximation
    let dfgDirect: DFGDirect = DFGDirectApprox(
      normal,
      viewDirection,
      directLight.direction,
      roughness,
    );
    `;
  }
  if (extensionsUsed.includes("KHR_materials_anisotropy")) {
    pbrDirect += /* wgsl */
    `
    getPBRDirectAnisotropic(
      normal,
      viewDirection,
      dfgDirect,
      diffuseContribution,
      specularF90,
      specularColorBlended,
      roughness,
      iridescenceFresnel,
      iridescence,
      alphaT,
      anisotropyT,
      anisotropyB,
      directLight,
      &reflectedLight
    );`;
  } else {
    pbrDirect += /* wgsl */
    `
    getPBRDirect(
      normal,
      viewDirection,
      dfgDirect,
      diffuseContribution,
      specularF90,
      specularColorBlended,
      roughness,
      iridescenceFresnel,
      iridescence,
      directLight,
      &reflectedLight
    );`;
  }
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    pbrDirect += /* wgsl */
    `
    clearcoatSpecularDirect += getPBRDirectClearcoat(clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness, directLight, &reflectedLight);`;
  }
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    pbrDirect += /* wgsl */
    `
    sheenSpecularDirect += getPBRDirectSheen(normal, viewDirection, sheenColor, sheenRoughness, directLight, &reflectedLight);`;
  }
  return pbrDirect;
};

export { getPBRDirectContribution };
