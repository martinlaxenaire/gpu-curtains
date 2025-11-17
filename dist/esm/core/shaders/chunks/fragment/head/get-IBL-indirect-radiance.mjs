const getIBLIndirectRadiance = (
  /* wgsl */
  `
fn getIBLIndirectRadiance(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  clampSampler: sampler,
  envSpecularTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envSpecularIntensity: f32,
)-> vec3f {
  let N: vec3f = normal;
  let V: vec3f = viewDirection;

  let reflection: vec3f = normalize(reflect(-V, N));

  let maxLevel: f32 = f32(textureNumLevels(envSpecularTexture) - 1);
  // compensate/approximation for non PMREM generation
  let perceptualRoughness: f32 = sqrt(roughness);

  let lod: f32 = perceptualRoughness * maxLevel;

  let specularLight: vec4f = textureSampleLevel(
    envSpecularTexture,
    clampSampler,
    reflection * envRotation,
    lod
  );

  return specularLight.rgb * envSpecularIntensity;
}
`
);

export { getIBLIndirectRadiance };
