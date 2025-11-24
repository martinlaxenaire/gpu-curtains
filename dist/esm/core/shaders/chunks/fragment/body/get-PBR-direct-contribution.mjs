const getPBRDirectContribution = ({
  extensionsUsed = [],
  environmentMap = null
} = {}) => {
  let pbrDirect = (
    /* wgsl */
    `
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let NdotV: f32 = saturate(dot(normal, viewDirection));`
  );
  if (environmentMap && environmentMap.lutTexture) {
    pbrDirect += /* wgsl */
    `
  // Precomputed DFG values for view and light directions from LUT
  let dfgV: vec2f = DFGFromLUT(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV),
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );
  let dfgL: vec2f = DFGFromLUT(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotL * NdotL), 0.0, NdotL),
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
  } else {
    pbrDirect += /* wgsl */
    `
  // Precomputed DFG values for view and light directions from approximation
  let dfgV: vec2f = DFGApprox(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV),
    roughness,
  );
  let dfgL: vec2f = DFGApprox(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotL * NdotL), 0.0, NdotL),
    roughness,
  );`;
  }
  if (extensionsUsed.includes("KHR_materials_anisotropy")) {
    pbrDirect += /* wgsl */
    `
    getPBRDirectAnisotropic(
      normal,
      viewDirection,
      NdotL,
      NdotV,
      dfgV,
      dfgL,
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
      NdotL,
      NdotV,
      dfgV,
      dfgL,
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
