const getClearcoatIndirectSpecular = ({
  extensionsUsed = []
} = {}) => {
  let clearcoatIndirect = "";
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    clearcoatIndirect += /* wgsl */
    `
  clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness );`;
  }
  return clearcoatIndirect;
};

export { getClearcoatIndirectSpecular };
