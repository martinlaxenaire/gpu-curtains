/**
 * Helper WGSL functions to get the PBR direct clearcoat contribution.
 */
export const getPBRDirectClearcoat = /* wgsl */ `
// GGX Distribution, Schlick Fresnel, GGX_SmithCorrelated Visibility
fn BRDF_GGX_Clearcoat(
  lightDirection: vec3f,
  viewDirection: vec3f,
  normal: vec3f,
  clearcoatF0: vec3f,
  clearcoatF90: f32,
  clearcoatRoughness: f32
) -> vec3f {
  let halfDir: vec3f = normalize( lightDirection + viewDirection );

  let dotNL: f32 = saturate( dot( normal, lightDirection ) );
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );
  let dotNH: f32 = saturate( dot( normal, halfDir ) );
  let dotVH: f32 = saturate( dot( viewDirection, halfDir ) );

  let F: vec3f = F_Schlick( clearcoatF0, clearcoatF90, dotVH );

  let V: f32 = GeometrySmith( clearcoatRoughness, dotNL, dotNV );
  let D: f32 = DistributionGGX( clearcoatRoughness, dotNH );

  return F * ( V * D );

}

fn getPBRDirectClearcoat(
  clearcoatNormal: vec3f,
  viewDirection: vec3f,
  clearcoatF0: vec3f,
  clearcoatF90: f32,
  clearcoatRoughness: f32,
  directLight: DirectLight
) -> vec3f {
  let NdotLcc: f32 = saturate( dot( clearcoatNormal, directLight.direction ) );

  let ccIrradiance: vec3f = NdotLcc * directLight.color;

  return ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, viewDirection, clearcoatNormal, clearcoatF0, clearcoatF90, clearcoatRoughness );
}
`
