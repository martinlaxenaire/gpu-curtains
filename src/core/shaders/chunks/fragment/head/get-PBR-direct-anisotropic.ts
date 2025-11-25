/**
 * Helper WGSL functions to get the PBR direct anisotropic contribution.
 */
export const getPBRDirectAnisotropic = /* wgsl */ `
fn GeometrySmith_Anisotropic(
  alphaT: f32, 
  alphaB: f32,
  TdotV: f32,
  BdotV: f32,
  TdotL: f32,
  BdotL: f32,
  NdotV: f32,
  NdotL: f32
) -> f32 {
  let gv: f32 = NdotL * length( vec3( alphaT * TdotV, alphaB * BdotV, NdotV ) );
  let gl: f32 = NdotV * length( vec3( alphaT * TdotL, alphaB * BdotL, NdotL ) );
  let v: f32 = 0.5 / ( gv + gl );

  return saturate(v);
}

fn DistributionGGX_Anisotropic(
  alphaT: f32,
  alphaB: f32,
  NdotH: f32,
  TdotH: f32,
  BdotH: f32
) -> f32 {
  let a2: f32 = alphaT * alphaB;
  let v: vec3f = vec3( alphaB * TdotH, alphaT * BdotH, a2 * NdotH );
  let v2: f32 = dot( v, v );
  let w2: f32 = a2 / v2;

  return RECIPROCAL_PI * a2 * pow2 ( w2 );
}

fn BRDF_GGX_Anisotropic(
  normal: vec3f,
  viewDirection: vec3f,
  NdotL: f32,
  NdotV: f32,
  roughness: f32,
  specularF90: f32,
  specularColorBlended: vec3f,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  alphaT: f32,
  anisotropyT: vec3f,
  anisotropyB: vec3f,
  directLight: DirectLight,
) -> vec3f {
  let alpha: f32 = pow2(roughness); // UE4's roughness

  let H: vec3f = normalize(viewDirection + directLight.direction);
  let VdotH: f32 = saturate(dot(viewDirection, H));
  let NdotH: f32 = saturate(dot(normal, H));

  // cook-torrance brdf
  var F: vec3f = F_Schlick(specularColorBlended, specularF90, VdotH);
  F = mix( F, iridescenceFresnel, iridescence );

  let TdotL: f32 = dot( anisotropyT, directLight.direction );
  let TdotV: f32 = dot( anisotropyT, viewDirection );
  let TdotH: f32 = dot( anisotropyT, H );
  let BdotL: f32 = dot( anisotropyB, directLight.direction );
  let BdotV: f32 = dot( anisotropyB, viewDirection );
  let BdotH: f32 = dot( anisotropyB, H );

  let G: f32 = GeometrySmith_Anisotropic( alphaT, alpha, TdotV, BdotV, TdotL, BdotL, NdotV, NdotL );
  let D: f32 = DistributionGGX_Anisotropic( alphaT, alpha, NdotH, TdotH, BdotH );
  
  return G * D * F;
}

fn getPBRDirectAnisotropic(
  normal: vec3f,
  viewDirection: vec3f,
  NdotL: f32,
  irradiance: vec3f,
  dfgDirect: DFGDirect,
  diffuseContribution: vec3f,
  specularF90: f32,
  specularColorBlended: vec3f,
  roughness: f32,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  alphaT: f32,
  anisotropyT: vec3f,
  anisotropyB: vec3f,
  directLight: DirectLight
) -> LightContribution {
  var lightContribution: LightContribution;

  let NdotV: f32 = saturate(dot(normal, viewDirection));

  let ggxSingleScatter: vec3f = BRDF_GGX_Anisotropic(
    normal,
    viewDirection,
    NdotL,
    NdotV,
    roughness,
    specularF90,
    specularColorBlended,
    iridescenceFresnel,
    iridescence,
    alphaT,
    anisotropyT,
    anisotropyB,
    directLight
  );

  let ggxMultiScatter: vec3f = BRDF_GGX_Multiscatter(
    dfgDirect,
    specularF90,
    specularColorBlended
  );

  let ggx: vec3f = ggxSingleScatter + ggxMultiScatter;

  lightContribution.diffuse += irradiance * BRDF_Lambert(diffuseContribution);
  lightContribution.specular += irradiance * ggx;

  return lightContribution;
}
`
