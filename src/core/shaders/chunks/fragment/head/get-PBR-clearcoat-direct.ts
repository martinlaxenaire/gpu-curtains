export const getPBRClearcoatDirect = /* wgsl */ `
// GGX Distribution, Schlick Fresnel, GGX_SmithCorrelated Visibility
fn BRDF_GGX_Clearcoat(
  lightDirection: vec3f,
  viewDirection: vec3f,
  normal: vec3f,
  clearcoatF0: vec3f,
  clearcoatF90: f32,
  clearcoatRoughness: f32
) -> vec3f {
  let alpha: f32 = pow2( clearcoatRoughness ); // UE4's roughness

  let halfDir: vec3f = normalize( lightDirection + viewDirection );

  let dotNL: f32 = saturate( dot( normal, lightDirection ) );
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );
  let dotNH: f32 = saturate( dot( normal, halfDir ) );
  let dotVH: f32 = saturate( dot( viewDirection, halfDir ) );

  let F: vec3f = F_Schlick( clearcoatF0, clearcoatF90, dotVH );

  let V: f32 = GeometrySmith( alpha, dotNL, dotNV );

  let D: f32 = DistributionGGX( alpha, dotNH );

  return F * ( V * D );

}

fn getPBRClearcoatDirect(
  clearcoatNormal: vec3f,
  viewDirection: vec3f,
  clearcoatF0: vec3f,
  clearcoatF90: f32,
  clearcoatRoughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) -> vec3f {
  let dotNLcc: f32 = saturate( dot( clearcoatNormal, directLight.direction ) );

  let ccIrradiance: vec3f = dotNLcc * directLight.color;

  return ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, viewDirection, clearcoatNormal, clearcoatF0, clearcoatF90, clearcoatRoughness );
}
`
