const getIBLIndirectRadiance = (
  /* wgsl */
  `
fn getIBLIndirectRadiance(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  specularColor: vec3f,
  specularFactor: f32,
  iBLGGXFresnel: IBLGGXFresnel,
  clampSampler: sampler,
  envSpecularTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envSpecularIntensity: f32,
)-> vec3f {
  let N: vec3f = normalize(normal);
  let V: vec3f = normalize(viewDirection);
  let NdotV: f32 = saturate(dot(N, V));

  let reflection: vec3f = normalize(reflect(-V, N));

  let lod: f32 = roughness * f32(textureNumLevels(envSpecularTexture) - 1);

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
