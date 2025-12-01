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
  let rInv: f32 = 1.0 / ( roughness + 0.1 );

  let a: f32 = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
  let b: f32 = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;

  let DG: f32 = exp( a * NdotV + b );

  return saturate( DG );
}

// Indirect Diffuse RenderEquations with sheen albedo scaling
fn RE_IndirectDiffuseSheen(
  irradiance: vec3f,
  diffuseContribution: vec3f,
  sheenEnergyComp: f32,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  var diffuse: vec3f = irradiance * BRDF_Lambert( diffuseContribution );
	diffuse *= sheenEnergyComp;
  (*ptr_reflectedLight).indirectDiffuse += diffuse;
}
`
