const applySheenClearcoatContribution = ({
  extensionsUsed = []
} = {}) => {
  let sheenClearcoatContribution = "";
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    sheenClearcoatContribution += /* wgsl */
    `
  // Sheen energy compensation approximation calculation can be found at the end of
  // https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing
  let sheenEnergyComp: f32 = 1.0 - 0.157 * max3( sheenColor );

  outgoingLight = outgoingLight * sheenEnergyComp + sheenSpecularDirect + sheenSpecularIndirect;
    `;
  }
  if (extensionsUsed.includes("KHR_materials_clearcoat")) {
    sheenClearcoatContribution += /* wgsl */
    `
  let dotNVcc: f32 = clamp( dot( clearcoatNormal, viewDirection ), 0.0, 1.0 );
  let Fcc: vec3f = F_Schlick( clearcoatF0, clearcoatF90, dotNVcc );
  let clearcoatEnergyComp: vec3f = ( 1.0 - clearcoat * Fcc );
  let clearcoatContribution: vec3f = ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * clearcoat;

  outgoingLight = outgoingLight * clearcoatEnergyComp + clearcoatContribution;
    `;
  }
  return sheenClearcoatContribution;
};

export { applySheenClearcoatContribution };
