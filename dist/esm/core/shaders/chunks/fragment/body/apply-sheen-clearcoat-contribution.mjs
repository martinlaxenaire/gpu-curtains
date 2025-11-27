const applySheenClearcoatContribution = ({
  extensionsUsed = []
} = {}) => {
  let sheenClearcoatContribution = "";
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    sheenClearcoatContribution += /* wgsl */
    `
  outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
    `;
  }
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    sheenClearcoatContribution += /* wgsl */
    `
  let dotNVcc: f32 = saturate( dot( clearcoatNormal, viewDirection ));
  let Fcc: vec3f = F_Schlick( clearcoatF0, clearcoatF90, dotNVcc );
  let clearcoatEnergyComp: vec3f = ( 1.0 - clearcoat * Fcc );
  let clearcoatContribution: vec3f = ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * clearcoat;

  outgoingLight = outgoingLight * clearcoatEnergyComp + clearcoatContribution;
    `;
  }
  return sheenClearcoatContribution;
};

export { applySheenClearcoatContribution };
