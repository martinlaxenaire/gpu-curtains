const getIBLIndirectIrradiance = (
  /* wgsl */
  `
fn getIBLIndirectIrradiance(
  normal: vec3f,
  diffuseColor: vec3f,
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
`
);

export { getIBLIndirectIrradiance };
