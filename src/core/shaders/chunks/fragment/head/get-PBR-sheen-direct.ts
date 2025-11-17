/**
 * WGSL functions to calculate sheen BRDF specular direct contribution.
 */
export const getPBRSheenDirect = /* wgsl */ `
// https://github.com/google/filament/blob/master/shaders/src/brdf.fs
fn D_Charlie( roughness: f32, dotNH: f32 ) -> f32 {
  let alpha: f32 = pow2( roughness );

  // Estevez and Kulla 2017, "Production Friendly Microfacet Sheen BRDF"
  let invAlpha: f32 = 1.0 / alpha;
  let cos2h: f32 = dotNH * dotNH;
  let sin2h: f32 = max( 1.0 - cos2h, 0.0078125 ); // 2^(-14/2), so sin2h^2 > 0 in fp16

  return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}

// https://github.com/google/filament/blob/master/shaders/src/brdf.fs
fn V_Neubelt( dotNV: f32, dotNL: f32 ) -> f32 {
  // Neubelt and Pettineo 2013, "Crafting a Next-gen Material Pipeline for The Order: 1886"
  return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}

fn BRDF_Sheen(
  lightDirection: vec3f,
  viewDirection: vec3f,
  normal: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32
) -> vec3f {
  let halfDir: vec3f = normalize( lightDirection + viewDirection );

  let dotNL: f32 = saturate( dot( normal, lightDirection ) );
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );
  let dotNH: f32 = saturate( dot( normal, halfDir ) );

  let D: f32 = D_Charlie( sheenRoughness, dotNH );
  let V: f32 = V_Neubelt( dotNV, dotNL );

  return sheenColor * ( D * V );
}

fn getPBRSheenDirect(
  normal: vec3f,
  viewDirection: vec3f,
  sheenColor: vec3f,
  sheenRoughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) -> vec3f {
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let irradiance: vec3f = NdotL * directLight.color;
  return irradiance * BRDF_Sheen( directLight.direction, viewDirection, normal, sheenColor, sheenRoughness );
}
`
