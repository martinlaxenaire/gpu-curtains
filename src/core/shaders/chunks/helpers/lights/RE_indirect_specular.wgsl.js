export default /* wgsl */ `
fn DFGApprox(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
) -> vec2f {
  let dotNV: f32 = clamp( dot( normal, viewDirection ), 0.0, 1.0 );

	let c0: vec4f = vec4( - 1, - 0.0275, - 0.572, 0.022 );
	let c1: vec4f = vec4( 1, 0.0425, 1.04, - 0.04 );

	let r: vec4f = roughness * c0 + c1;
	let a004: f32 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y;
	
	let fab: vec2f = vec2( - 1.04, 1.04 ) * a004 + r.zw;

	return fab;
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
  ptr_totalScattering: ptr<function, TotalScattering>
) {
  let fab: vec2f = DFGApprox( normal, viewDirection, roughness );

	let Fr: vec3f = specularColor;

	let FssEss: vec3f = Fr * fab.x + f90 * fab.y;

	let Ess: f32 = fab.x + fab.y;
	let Ems: f32 = 1.0 - Ess;

	let Favg: vec3f = Fr + ( 1.0 - Fr ) * 0.047619; // 1/21
	let Fms: vec3f = FssEss * Favg / ( 1.0 - Ems * Favg );

	(*ptr_totalScattering).single += FssEss;
	(*ptr_totalScattering).multi += Fms * Ems;
}

// Indirect Specular RenderEquations
fn RE_IndirectSpecular(
  radiance: vec3f,
  irradiance: vec3f,
  normal: vec3f,
  diffuseColor: vec3f,
  specularFactor: f32,
  specularColorFactor: vec3f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  var totalScattering: TotalScattering;
  let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;
    
  computeMultiscattering( normal, viewDirection, specularColorFactor, specularFactor, roughness, &totalScattering );
  
  let totalScatter: vec3f = totalScattering.single + totalScattering.multi;
  let diffuse: vec3f = diffuseColor * ( 1.0 - max( max( totalScatter.r, totalScatter.g ), totalScatter.b ) );

  (*ptr_reflectedLight).indirectSpecular += radiance * totalScattering.single;
  (*ptr_reflectedLight).indirectSpecular += totalScattering.multi * cosineWeightedIrradiance;

  (*ptr_reflectedLight).indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
`
