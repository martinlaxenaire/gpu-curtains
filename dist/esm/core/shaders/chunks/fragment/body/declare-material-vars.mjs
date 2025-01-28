const declareMaterialVars = ({ environmentMap = null } = {}) => {
  let materialVars = (
    /* wgsl */
    `
  let baseColorFactor: vec4f = material.baseColorFactor;
  let alphaCutoff: f32 = material.alphaCutoff;
  let metallicFactor: f32 = material.metallicFactor;
  let roughnessFactor: f32 = material.roughnessFactor;
  let normalMapScale: f32 = material.normalMapScale;
  let occlusionStrength: f32 = material.occlusionStrength;
  let emissiveFactor: vec3f = material.emissiveFactor;
  let emissiveStrength: f32 = material.emissiveStrength;
  var specularFactor: f32 = material.specularFactor;
  var specularColorFactor: vec3f = material.specularColorFactor;
  let transmissionFactor: f32 = material.transmissionFactor;
  let ior: f32 = material.ior;
  let dispersion: f32 = material.dispersion;
  let thicknessFactor: f32 = material.thicknessFactor;
  let attenuationDistance: f32 = material.attenuationDistance;
  let attenuationColor: vec3f = material.attenuationColor;
`
  );
  if (!!environmentMap) {
    materialVars += /* wgsl */
    `
  let envRotation: mat3x3f = material.envRotation;
  let envDiffuseIntensity: f32 = material.envDiffuseIntensity;
  let envSpecularIntensity: f32 = material.envSpecularIntensity;`;
  }
  return materialVars;
};

export { declareMaterialVars };
