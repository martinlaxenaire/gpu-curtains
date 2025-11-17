/**
 * Helper function chunk appended internally and used to compute IBL indirect anisotropy radiance, based on environment specular map.
 */
export const getIBLIndirectAnisotropyRadiance = /* wgsl */ `
fn getIBLIndirectAnisotropyRadiance(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  clampSampler: sampler,
  envSpecularTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envSpecularIntensity: f32,
  bitangent: vec3f,
  anisotropy: f32
) -> vec3f {
  // https://google.github.io/filament/Filament.md.html#lighting/imagebasedlights/anisotropy
  var bentNormal: vec3f = cross( bitangent, viewDirection );
  bentNormal = normalize( cross( bentNormal, bitangent ) );
  bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );

  return getIBLIndirectRadiance(
    bentNormal,
    viewDirection,
    roughness,
    clampSampler,
    envSpecularTexture,
    envRotation,
    envSpecularIntensity,
  );
}
`
