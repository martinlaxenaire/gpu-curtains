const getClearcoatIndirectSpecular = ({
  extensionsUsed = [],
  environmentMap = null
} = {}) => {
  let clearcoatIndirect = "";
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    if (environmentMap && environmentMap.lutTexture) {
      clearcoatIndirect += /* wgsl */
      `
  let clearcoatFab: vec2f = DFGFromLut(
    clearcoatNormal,
    viewDirection,
    roughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
  );`;
    } else {
      clearcoatIndirect += /* wgsl */
      `
  let clearcoatFab: vec2f = DFGApprox(clearcoatNormal, viewDirection, roughness);`;
    }
  }
  clearcoatIndirect += /* wgsl */
  `
  let clearcoatBRDF: vec3f = clearcoatF0 * clearcoatFab.x + clearcoatF90 * clearcoatFab.y;
  clearcoatSpecularIndirect += clearcoatRadiance * clearcoatBRDF;`;
  return clearcoatIndirect;
};

export { getClearcoatIndirectSpecular };
