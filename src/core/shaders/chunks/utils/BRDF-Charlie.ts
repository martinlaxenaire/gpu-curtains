/**
 * BRDF "Charlie" sheen Distribution and Visibility helper functions.
 */
export const BRDFCharlie = /* wgsl */ `
// https://github.com/google/filament/blob/main/shaders/src/surface_brdf.fs#L94
fn D_Charlie( roughness: f32, NdotH: f32 ) -> f32 {
  let alpha: f32 = pow2( roughness );

  // Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
  let invAlpha: f32 = 1.0 / max(alpha, EPSILON);
  let cos2h: f32 = NdotH * NdotH;
  let sin2h: f32 = max( 1.0 - cos2h, 0.0078125 ); // 2^(-14/2), so sin2h^2 > 0 in fp16

  return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}

// https://github.com/google/filament/blob/main/shaders/src/surface_brdf.fs#L139
fn V_Neubelt( NdotL: f32, NdotV: f32 ) -> f32 {
  // Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
  return saturate( 1.0 / ( 4.0 * max( NdotL + NdotV - NdotL * NdotV, EPSILON ) ) );
}
`
