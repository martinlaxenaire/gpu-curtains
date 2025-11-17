const getPBRSheenClearcoatDirect = ({
  extensionsUsed = []
} = {}) => {
  let sheenClearcoatDirect = "";
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    sheenClearcoatDirect += /* wgsl */
    `
  clearcoatSpecularDirect += getPBRClearcoatDirect(clearcoatNormal, viewDirection, clearcoatF0, clearcoatF90, clearcoatRoughness, directLight, &reflectedLight);`;
  }
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    sheenClearcoatDirect += /* wgsl */
    `
  sheenSpecularDirect += getPBRSheenDirect(normal, viewDirection, sheenColor, sheenRoughness, directLight, &reflectedLight);`;
  }
  return sheenClearcoatDirect;
};

export { getPBRSheenClearcoatDirect };
