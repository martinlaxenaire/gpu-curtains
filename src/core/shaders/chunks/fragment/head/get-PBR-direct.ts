import { BRDF_GGX } from './BRDF_GGX'

/** Helper function chunk appended internally and used to compute PBR direct light contributions. */
export const getPBRDirect = /* wgsl */ `
${BRDF_GGX}

fn EnvironmentBRDF(
  normal: vec3<f32>, 
  viewDir: vec3<f32>, 
  specularColor: vec3<f32>, 
  specularF90: f32, 
  roughness: f32
) -> vec3<f32> {
  let fab = DFGApprox(normal, viewDir, roughness);
  return specularColor * fab.x + specularF90 * fab.y;
}

fn computeSpecularOcclusion( NdotV: f32, occlusion: f32, roughness: f32 ) -> f32 {
	return saturate(pow(NdotV + occlusion, exp2(- 16.0 * roughness - 1.0)) - 1.0 + occlusion);
}

fn getGGX(
  normal: vec3f,
  viewDirection: vec3f,
  NdotL: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  directLight: DirectLight,
) -> vec3f {
  let H: vec3f = normalize(viewDirection + directLight.direction);
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  let NdotH: f32 = saturate(dot(normal, H));
  let VdotH: f32 = saturate(dot(viewDirection, H));

  return BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, specularFactor, specularColor, iridescenceFresnel, iridescence);
}

fn getPBRDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let alpha: f32 = pow2(roughness); // UE4's roughness

  let ggx: vec3f = getGGX(normal, viewDirection, NdotL, alpha, specularFactor, specularColor, iridescenceFresnel, iridescence, directLight);

  let irradiance: vec3f = NdotL * directLight.color;
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
