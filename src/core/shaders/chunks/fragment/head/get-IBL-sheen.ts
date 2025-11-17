/**
 * WGSL functions to calculate sheen specular indirect IBL contribution.
 */
export const getIBLSheen = /* wgsl */ `
// This is a curve-fit approxmation to the "Charlie sheen" BRDF integrated over the hemisphere from 
// Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF". The analysis can be found
// in the Sheen section of https://drive.google.com/file/d/1T0D1VSyR4AllqIJTQAraEIzjlb5h4FKH/view?usp=sharing
fn IBLSheenBRDF( normal: vec3f, viewDirection: vec3f, roughness: f32 ) -> f32 {
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );

  let r2: f32 = roughness * roughness;

  let a: f32 = select(-8.48 * r2 + 14.3 * roughness - 9.95, -339.2 * r2 + 161.4 * roughness - 25.9, roughness < 0.25);
  let b: f32 = select(1.97 * r2 - 3.27 * roughness + 0.72, 44.0 * r2 - 23.7 * roughness + 3.26, roughness < 0.25);
  let roughnessAdditionalContribution: f32 = select(0.1 * ( roughness - 0.25 ), 0.0, roughness < 0.25);

  let DG: f32 = exp( a * dotNV + b ) + roughnessAdditionalContribution;

  return saturate( DG );
}

fn getIBLSheenSpecularIndirect(
  normal: vec3f,
  viewDirection: vec3f,
  irradiance: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32
) -> vec3f {
  return irradiance * sheenColor * IBLSheenBRDF( normal, viewDirection, sheenRoughness );
}
`
