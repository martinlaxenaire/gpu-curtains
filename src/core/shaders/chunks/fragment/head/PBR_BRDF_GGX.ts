export const PBR_BRDF_GGX = /* wgsl */ `
fn F_Schlick_Iridescence(f0: vec3f, f90: f32, VdotH: f32, iridescenceFresnel: vec3f, iridescence: f32) -> vec3f {
  let F: vec3f = F_Schlick(specularColor, specularFactor, VdotH);
  return mix( F, iridescenceFresnel, iridescence );
}

// https://google.github.io/filament/Filament.md.html#materialsystem/anisotropicmodel/anisotropicspecularbrdf
fn DistributionGGX_Anisotropic( alphaT: f32, alphaB: f32, dotNH: f32, dotTH: f32, dotBH: f32 ) -> f32 {
  let a2: f32 = alphaT * alphaB;
  let v: vec3f = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
  let v2: f32 = dot( v, v );
  let w2: f32 = a2 / v2;

  return RECIPROCAL_PI * a2 * pow2 ( w2 );
}

fn GeometrySmith_Anisotropic( alphaT: f32, alphaB: f32, dotTV: f32, dotBV: f32, dotTL: f32, dotBL: f32, dotNV: f32, dotNL: f32 ) -> f32 {
  let gv: f32 = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
  let gl: f32 = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
  let v: f32 = 0.5 / ( gv + gl );

  return saturate(v);
}

fn PBR_BRDF_GGX(
  NdotV: f32,
  NdotL: f32,
  NdotH: f32,
  VdotH: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f,
  iridescenceFresnel: vec3f,
  iridescence: f32
) -> vec3f {
  // cook-torrance brdf
  // TODO iridescence + anisotropy?
  let F: vec3f = F_Schlick_Iridescence(specularColor, specularFactor, VdotH, iridescenceFresnel, iridescence);

  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
  let D: f32 = DistributionGGX(NdotH, roughness);
  
  return G * D * F;
}
`
