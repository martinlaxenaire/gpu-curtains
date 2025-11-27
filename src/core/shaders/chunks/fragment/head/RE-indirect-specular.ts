/**
 * WGSL functions to calculate the indirect specular and diffuse contributions of lights using multi-scattering.
 */
export const REIndirectSpecular = /* wgsl */ `
// Indirect Specular RenderEquations
fn RE_IndirectSpecular(
  radiance: vec3f,
  irradiance: vec3f,
  diffuseContribution: vec3f,
  metallic: f32,
  sheenEnergyComp: f32,
  dielectricScattering: MultiScattering,
  metallicScattering: MultiScattering,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  // Mix based on metalness
	let singleScattering: vec3f = mix(dielectricScattering.singleScattering, metallicScattering.singleScattering, metallic);
	let multiScattering: vec3f = mix(dielectricScattering.multiScattering, metallicScattering.multiScattering, metallic);

	// Diffuse energy conservation uses dielectric path
	let totalScatteringDielectric: vec3f = dielectricScattering.singleScattering + dielectricScattering.multiScattering;

	let diffuse: vec3f = diffuseContribution * (1.0 - totalScatteringDielectric);

  // we remove RECIPROCAL_PI multiplication since the LUT already ensures energy conservation
  // let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;

  var indirectSpecular: vec3f = radiance * singleScattering;
	indirectSpecular += multiScattering * irradiance;

	var indirectDiffuse: vec3f = diffuse * irradiance;

  indirectSpecular *= sheenEnergyComp;
  indirectDiffuse *= sheenEnergyComp;

  (*ptr_reflectedLight).indirectSpecular += indirectSpecular;  
  (*ptr_reflectedLight).indirectDiffuse += indirectDiffuse;
}
`
