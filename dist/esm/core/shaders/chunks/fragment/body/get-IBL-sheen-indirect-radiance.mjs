const getIBLSheenIndirectRadiance = ({
  extensionsUsed = [],
  environmentMap = null
} = {}) => {
  let sheenIndirect = (
    /* wgsl */
    `
  var sheenEnergyComp: f32 = 1.0;`
  );
  if (extensionsUsed.includes("KHR_materials_sheen")) {
    if (environmentMap && environmentMap.lutTexture) {
      sheenIndirect += /* wgsl */
      `
  let sheenBRDFCharlie: f32 = getBRDFCharlie(
    normal,
    viewDirection,
    sheenRoughness,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name}
  );

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  let sheenAlbedoScale: f32 = sheenBRDFCharlie;`;
    } else {
      sheenIndirect += /* wgsl */
      `
  let sheenBRDFCharlie: f32 = getBRDFCharlieApprox(normal, viewDirection, sheenRoughness);

  sheenSpecularIndirect += iblIrradiance * sheenColor * sheenBRDFCharlie;
  // we could also use 0.157 as approximation
  let sheenAlbedoScale: f32 = getSheenAlbedoScaleApprox(normal, viewDirection, sheenRoughness);`;
    }
    sheenIndirect += /* wgsl */
    `
  sheenEnergyComp = 1.0 - max3(sheenColor) * sheenAlbedoScale;`;
  }
  return sheenIndirect;
};

export { getIBLSheenIndirectRadiance };
