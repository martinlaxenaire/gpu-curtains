import { BRDF_GGX } from '../../utils/BRDF_GGX'

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

fn getPBRDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let N: vec3f = normalize(normal);
  let L: vec3f = normalize(directLight.direction);
  let V: vec3f = normalize(viewDirection);
  let H: vec3f = normalize(V + L);
  let NdotV: f32 = saturate(dot(N, V));
  let NdotL: f32 = saturate(dot(N, L));
  let NdotH: f32 = saturate(dot(N, H));
  let VdotH: f32 = saturate(dot(V, H));

  let irradiance: vec3f = NdotL * directLight.color;
  let ggx: vec3f = BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, specularFactor, specularColor);
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
