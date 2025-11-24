/**
 * WGSL functions to calculate sheen specular indirect IBL contribution.
 */
export const getIBLSheen = /* wgsl */ `
fn getSheenAlbedoScaleApprox(normal: vec3f, viewDirection: vec3f, sheenRoughness: f32) -> f32 {
  let NdotV: f32 = saturate( dot( normal, viewDirection ) );
  let s = saturate(sheenRoughness);

  // amplitude (stronger compensation for sharper sheen)
  let A = 0.28 + 0.6 * (1.0 - s);   // in [0.28 .. 0.88]

  // exponent (controls how fast it falls off away from grazing)
  let B = 1.8 + 3.2 * s;            // in [1.8 .. 5.0]

  // (1 - x) is high at grazing; raising to B shapes the falloff
  return A * pow(1.0 - NdotV, B);
}

fn getBRDFCharlie(
  normal: vec3f,
  viewDirection: vec3f,
  sheenRoughness: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>
) -> f32 {
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  
  let brdfSamplePoint: vec2f = saturate(vec2(NdotV, sheenRoughness));
  
  return textureSampleLevel(
    lutTexture,
    clampSampler,
    brdfSamplePoint,
    0.0
  ).b;
}

// This is a curve-fit approxmation to the "Charlie sheen" BRDF integrated over the hemisphere from 
// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF". The analysis can be found
// in the Sheen section of https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing
fn getBRDFCharlieApprox( normal: vec3f, viewDirection: vec3f, roughness: f32 ) -> f32 {
  let NdotV: f32 = saturate( dot( normal, viewDirection ) );

  let r2: f32 = roughness * roughness;

  let a: f32 = select(-8.48 * r2 + 14.3 * roughness - 9.95, -339.2 * r2 + 161.4 * roughness - 25.9, roughness < 0.25);
  let b: f32 = select(1.97 * r2 - 3.27 * roughness + 0.72, 44.0 * r2 - 23.7 * roughness + 3.26, roughness < 0.25);
  let roughnessAdditionalContribution: f32 = select(0.1 * ( roughness - 0.25 ), 0.0, roughness < 0.25);

  let DG: f32 = exp( a * NdotV + b ) + roughnessAdditionalContribution;

  return saturate( DG );
}
`
