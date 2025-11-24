/** Helper function chunk appended internally and used to compute PBR direct light contributions. */
export const getPBRDirect = /* wgsl */ `
fn BRDF_GGX(
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
  var F: vec3f = F_Schlick(specularColor, specularFactor, VdotH);
  F = mix(F, iridescenceFresnel, iridescence);

  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
  let D: f32 = DistributionGGX(NdotH, roughness);
  
  return G * D * F;
}

fn computeSpecularOcclusion(geometryNormal: vec3f, viewDirection: vec3f, occlusion: f32, roughness: f32) -> f32 {
  let NdotV: f32 = saturate(dot(geometryNormal, viewDirection));
	return saturate(pow(NdotV + occlusion, exp2(- 16.0 * roughness - 1.0)) - 1.0 + occlusion);
}

fn BRDF_GGX_Singlescatter(
  normal: vec3f,
  viewDirection: vec3f,
  NdotL: f32,
  NdotV: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  directLight: DirectLight,
) -> vec3f {
  let alpha: f32 = pow2(roughness); // UE4's roughness

  let H: vec3f = normalize(viewDirection + directLight.direction);
  let NdotH: f32 = saturate(dot(normal, H));
  let VdotH: f32 = saturate(dot(viewDirection, H));

  return BRDF_GGX(NdotV, NdotL, NdotH, VdotH, alpha, specularFactor, specularColor, iridescenceFresnel, iridescence);
}

// GGX BRDF with multi-scattering energy compensation for direct lighting
// Based on "Practical Multiple Scattering Compensation for Microfacet Models"
// https://blog.selfshadow.com/publications/turquin/ms_comp_final.pdf
fn BRDF_GGX_Multiscatter(
  normal: vec3f,
  viewDirection: vec3f,
  NdotL: f32,
  NdotV: f32,
  dfgDirect: DFGDirect,
  specularF90: f32,
  specularColorBlended: vec3f,
  roughness: f32,
) -> vec3f {
  // Multi-scattering compensation
  let dfgV: vec2f = dfgDirect.dfgV;
  let dfgL: vec2f = dfgDirect.dfgL;

	// Single-scattering energy for view and light
	let FssEss_V: vec3f = specularColorBlended * dfgV.x + specularF90 * dfgV.y;
	let FssEss_L: vec3f = specularColorBlended * dfgL.x + specularF90 * dfgL.y;

	let Ess_V: f32 = dfgV.x + dfgV.y;
	let Ess_L: f32 = dfgL.x + dfgL.y;

	// Energy lost to multiple scattering
	let Ems_V: f32 = 1.0 - Ess_V;
	let Ems_L: f32 = 1.0 - Ess_L;

	// Average Fresnel reflectance
	let Favg: vec3f = specularColorBlended + ( 1.0 - specularColorBlended ) * 0.047619; // 1/21

	// Multiple scattering contribution
	let Fms: vec3f = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg * Favg + EPSILON );

	// Energy compensation factor
	let compensationFactor: f32 = Ems_V * Ems_L;

	return Fms * compensationFactor;
}

fn getPBRDirect(
  normal: vec3f,
  viewDirection: vec3f,
  dfgDirect: DFGDirect,
  diffuseContribution: vec3f,
  specularF90: f32,
  specularColorBlended: vec3f,
  roughness: f32,
  iridescenceFresnel: vec3f,
  iridescence: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let NdotL: f32 = saturate(dot(normal, directLight.direction));
  let NdotV: f32 = saturate(dot(normal, viewDirection));

  let ggxSingleScatter: vec3f = BRDF_GGX_Singlescatter(
    normal,
    viewDirection,
    NdotL,
    NdotV,
    roughness,
    specularF90,
    specularColorBlended,
    iridescenceFresnel,
    iridescence,
    directLight
  );

  let ggxMultiScatter: vec3f = BRDF_GGX_Multiscatter(
    normal,
    viewDirection,
    NdotL,
    NdotV,
    dfgDirect,
    specularF90,
    specularColorBlended,
    roughness,
  );

  let ggx: vec3f = ggxSingleScatter + ggxMultiScatter;

  let irradiance: vec3f = NdotL * directLight.color;
    
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert(diffuseContribution);
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
