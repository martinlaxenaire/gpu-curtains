const getSheenIndirectSpecular = ({
  extensionsUsed = []
} = {}) => {
  let sheenIndirect = "";
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    sheenIndirect += /* wgsl */
    `
  sheenSpecularIndirect += getIBLSheenSpecularIndirect(normal, viewDirection, iblIrradiance, sheenColor, sheenRoughness);`;
  }
  return sheenIndirect;
};

export { getSheenIndirectSpecular };
