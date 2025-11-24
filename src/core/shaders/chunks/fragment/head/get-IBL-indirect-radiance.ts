/**
 * Helper function chunk appended internally and used to compute IBL indirect radiance, based on environment specular map.
 */
export const getIBLIndirectRadiance = /* wgsl */ `
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

  var reflection: vec3f = normalize(reflect(-V, N));

  // Mixing the reflection with the normal is more accurate and keeps rough objects from gathering light from behind their tangent plane.
  // reflection = normalize( mix( reflection, normal, pow4(roughness)) );
  // reflection = normalize( mix( reflection, normal, pow2(roughness)) );

  let maxLevel: f32 = f32(textureNumLevels(envSpecularTexture) - 1);

  let lod: f32 = roughness * maxLevel;

  let specularLight: vec4f = textureSampleLevel(
    envSpecularTexture,
    clampSampler,
    reflection * envRotation,
    lod
  );

  return specularLight.rgb * envSpecularIntensity;
}
`
