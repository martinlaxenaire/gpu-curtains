const getIBLGGXFresnel = (
  /*  */
  `
// multi scattering equations
// if the environment map has not created a LUT texture
fn DFGApprox(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
) -> vec2f {
  let dotNV: f32 = saturate(dot( normal, viewDirection ));

	let c0: vec4f = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	let c1: vec4f = vec4( 1, 0.0425, 1.04, - 0.04 );

	let r: vec4f = roughness * c0 + c1;
	let a004: f32 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	
	let fab: vec2f = vec2( - 1.04, 1.04 ) * a004 + r.zw;

	return fab;
}

struct IBLGGXFresnel {
  FssEss: vec3f,
  FmsEms: vec3f
}

struct TotalScattering {
  single: vec3f,
  multi: vec3f,
}

fn computeMultiscattering(
  normal: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  f90: f32,
  roughness: f32,
  ptr_totalScattering: ptr<function, IBLGGXFresnel>
) {
  let fab: vec2f = DFGApprox( normal, viewDirection, roughness );

	let Fr: vec3f = specularColor;

	let FssEss: vec3f = Fr * fab.x + f90 * fab.y;

	let Ess: f32 = fab.x + fab.y;
	let Ems: f32 = 1.0 - Ess;

	let Favg: vec3f = Fr + ( 1.0 - Fr ) * 0.047619; // 1/21
	let Fms: vec3f = FssEss * Favg / ( 1.0 - Ems * Favg );

	(*ptr_totalScattering).FssEss += FssEss;
	(*ptr_totalScattering).FmsEms += Fms * Ems;
}

fn getIBLGGXFresnel(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  f0: vec3f,
  specularWeight: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>
) -> IBLGGXFresnel {
  var iBLGGXFresnel: IBLGGXFresnel;
  
  let NdotV: f32 = saturate(dot(normal, viewDirection));
  
  let brdfSamplePoint: vec2f = saturate(vec2(NdotV, roughness));
  
  let brdf: vec3f = textureSample(
    lutTexture,
    clampSampler,
    brdfSamplePoint
  ).rgb;
  
  let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;
  let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);
  iBLGGXFresnel.FssEss = specularWeight * (k_S * brdf.x + brdf.y);
  let Ems: f32 = (1.0 - (brdf.x + brdf.y));
  let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);
  iBLGGXFresnel.FmsEms = Ems * iBLGGXFresnel.FssEss * F_avg / (1.0 - F_avg * Ems);
  
  return iBLGGXFresnel;
}
`
);

export { getIBLGGXFresnel };
