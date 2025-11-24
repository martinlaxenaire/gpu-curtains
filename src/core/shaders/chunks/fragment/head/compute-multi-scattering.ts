/**
 * Helper to implement multi-scattering that compensates for the energy loss in rough surfaces due to multiple reflections.
 * The IBL LUT texture is used to compute multi-scattering, however it can fall back to manually calculation in case it's missing.
 */
export const computeMultiScattering = /* wgsl */ `
// multi scattering equations
// DFG approximation if the environment map has not created a LUT texture
fn DFGApprox(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
) -> vec2f {
  let dotNV: f32 = saturate(dot( normal, viewDirection ));

	let c0: vec4f = vec4( -1, -0.0275, -0.572, 0.022 );
	let c1: vec4f = vec4( 1, 0.0425, 1.04, -0.04 );

	let r: vec4f = roughness * c0 + c1;
	let a004: f32 = min( r.x * r.x, exp2( -9.28 * dotNV ) ) * r.x + r.y;
	
	let fab: vec2f = vec2( -1.04, 1.04 ) * a004 + r.zw;

	return fab;
}

// DFG from LUT texture
fn DFGFromLUT(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>
) -> vec2f {
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  
  let brdfSamplePoint: vec2f = saturate(vec2(NdotV, roughness));
  
  return textureSampleLevel(
    lutTexture,
    clampSampler,
    brdfSamplePoint,
    0.0
  ).rg;
}

struct DFGDirect {
  dfgV: vec2f,
  dfgL: vec2f
}

fn DFGDirectApprox(
  normal: vec3f,
  viewDirection: vec3f,
  lightDirection: vec3f,
  roughness: f32
) -> DFGDirect {
  var dfgDirect: DFGDirect;

  let NdotL: f32 = saturate(dot(normal, lightDirection));
  let NdotV: f32 = saturate(dot(normal, viewDirection));

  dfgDirect.dfgV = DFGApprox(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV),
    roughness,
  );

  dfgDirect.dfgL = DFGApprox(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotL * NdotL), 0.0, NdotL),
    roughness,
  );

  return dfgDirect;
}

fn DFGDirectFromLUT(
  normal: vec3f,
  viewDirection: vec3f,
  lightDirection: vec3f,
  roughness: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>
) -> DFGDirect {
  var dfgDirect: DFGDirect;

  let NdotL: f32 = saturate(dot(normal, lightDirection));
  let NdotV: f32 = saturate(dot(normal, viewDirection));

  dfgDirect.dfgV = DFGFromLUT(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV),
    roughness,
    clampSampler,
    lutTexture
  );

  dfgDirect.dfgL = DFGFromLUT(
    vec3(0.0, 0.0, 1.0),
    vec3(sqrt(1.0 - NdotL * NdotL), 0.0, NdotL),
    roughness,
    clampSampler,
    lutTexture
  );

  return dfgDirect;
}

struct MultiScattering {
  singleScattering: vec3f,
  multiScattering: vec3f,
}

fn computeMultiscattering(
  fab: vec2f,
  specularColor: vec3f,
  f90: f32,
  iridescence: f32,
  iridescenceF0: vec3f,
  ptr_multiScattering: ptr<function, MultiScattering>
) {
	var Fr: vec3f = specularColor;
  Fr = mix(Fr, iridescenceF0, iridescence);

	let FssEss: vec3f = Fr * fab.x + f90 * fab.y;

	let Ess: f32 = fab.x + fab.y;
	let Ems: f32 = 1.0 - Ess;

	let Favg: vec3f = Fr + ( 1.0 - Fr ) * 0.047619; // 1/21
	let Fms: vec3f = FssEss * Favg / ( 1.0 - Ems * Favg );

  (*ptr_multiScattering).singleScattering += FssEss;
	(*ptr_multiScattering).multiScattering += Fms * Ems;
}
`
