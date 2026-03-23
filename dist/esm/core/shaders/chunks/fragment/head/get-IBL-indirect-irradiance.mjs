//#region src/core/shaders/chunks/fragment/head/get-IBL-indirect-irradiance.ts
/** Helper function chunk appended internally and used to compute the indirect irradiance based on environment diffuse map. */
const getIBLIndirectIrradiance = `
fn getIBLIndirectIrradiance(
  normal: vec3f,
  clampSampler: sampler,
  envDiffuseTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envDiffuseIntensity: f32,
) -> vec3f {
  // IBL diffuse (irradiance)
  let diffuseLight: vec4f = textureSample(
    envDiffuseTexture,
    clampSampler,
    normal * envRotation
  );

  return diffuseLight.rgb * envDiffuseIntensity;
}
`;
//#endregion
export { getIBLIndirectIrradiance };
