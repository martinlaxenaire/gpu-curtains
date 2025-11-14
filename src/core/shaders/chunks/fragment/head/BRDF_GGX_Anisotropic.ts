export const BRDF_GGX_Anisotropic = /* wgsl */ `
fn GeometrySmith_Anisotropic(
  alphaT: f32, 
  alphaB: f32,
  dotTV: f32,
  dotBV: f32,
  dotTL: f32,
  dotBL: f32,
  dotNV: f32,
  dotNL: f32
) -> f32 {
  let gv: f32 = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
  let gl: f32 = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
  let v: f32 = 0.5 / ( gv + gl );

  return saturate(v);
}

fn DistributionGGX_Anisotropic(
  alphaT: f32,
  alphaB: f32,
  dotNH: f32,
  dotTH: f32,
  dotBH: f32
) -> f32 {
  let a2: f32 = alphaT * alphaB;
  let v: vec3f = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
  let v2: f32 = dot( v, v );
  let w2: f32 = a2 / v2;

  return RECIPROCAL_PI * a2 * pow2 ( w2 );
}

fn BRDF_GGX_Anisotropic(
  normal: vec3f,
  viewDirection: vec3f,
  dotNL: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  alphaT: f32,
  anisotropyT: vec3f,
  anisotropyB: vec3f,
  directLight: DirectLight,
) -> vec3f {
  let H: vec3f = normalize(viewDirection + directLight.direction);
  let VdotH: f32 = saturate(dot(viewDirection, H));
  let dotNV: f32 = saturate( dot( normal, viewDirection ) );
  let dotNH: f32 = saturate(dot(normal, H));

  // cook-torrance brdf
  var F: vec3f = F_Schlick(specularColor, specularFactor, VdotH);
  F = mix( F, iridescenceFresnel, iridescence );

  let dotTL: f32 = dot( anisotropyT, directLight.direction );
  let dotTV: f32 = dot( anisotropyT, viewDirection );
  let dotTH: f32 = dot( anisotropyT, H );
  let dotBL: f32 = dot( anisotropyB, directLight.direction );
  let dotBV: f32 = dot( anisotropyB, viewDirection );
  let dotBH: f32 = dot( anisotropyB, H );

  let G: f32 = GeometrySmith_Anisotropic( alphaT, roughness, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
  let D: f32 = DistributionGGX_Anisotropic( alphaT, roughness, dotNH, dotTH, dotBH );
  
  return G * D * F;
}

fn getPBRDirect_Anisotropic(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  alphaT: f32,
  anisotropyT: vec3f,
  anisotropyB: vec3f,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let alpha: f32 = pow2(roughness); // UE4's roughness

  let ggx: vec3f = BRDF_GGX_Anisotropic(
    normal,
    viewDirection,
    NdotL,
    alpha,
    specularFactor,
    specularColor,
    iridescenceFresnel,
    iridescence,
    alphaT,
    anisotropyT,
    anisotropyB,
    directLight
  );

  let irradiance: vec3f = NdotL * directLight.color;
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
