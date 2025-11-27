const getIndirectDiffuse = ({
  extensionsUsed = []
}) => {
  let indirectDiffuse = "";
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    indirectDiffuse += /* wgsl */
    `
  RE_IndirectDiffuseSheen(irradiance, diffuseContribution, sheenEnergyComp, &reflectedLight);`;
  } else {
    indirectDiffuse += /* wgsl */
    `
  RE_IndirectDiffuse(irradiance, diffuseContribution, &reflectedLight);`;
  }
  return indirectDiffuse;
};

export { getIndirectDiffuse };
