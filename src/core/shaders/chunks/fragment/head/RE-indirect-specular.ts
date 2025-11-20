/** WGSL functions to calculate the indirect specular and diffuse contributions of lights using multi-scattering. */
export const REIndirectSpecular = /* wgsl */ `
// Indirect Specular RenderEquations
fn RE_IndirectSpecular(
  radiance: vec3f,
  irradiance: vec3f,
  diffuseContribution: vec3f,
  metallic: f32,
  //iBLGGXFresnel: IBLGGXFresnel,
  dielectricScattering: MultiScattering,
  metallicScattering: MultiScattering,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  // Mix based on metalness
	let singleScattering: vec3f = mix(dielectricScattering.singleScattering, metallicScattering.singleScattering, metallic);
	let multiScattering: vec3f = mix(dielectricScattering.multiScattering, metallicScattering.multiScattering, metallic);

	// Diffuse energy conservation uses dielectric path
	let totalScatteringDielectric: vec3f = dielectricScattering.singleScattering + dielectricScattering.multiScattering;

	let diffuse: vec3f = diffuseContribution * (1.0 - max3(totalScatteringDielectric));

  // we just add radiance and irradiance to the indirect contributions using iBLGGXFresnel

  // we remove RECIPROCAL_PI multiplication since the LUT already ensures energy conservation
  // let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;
  let cosineWeightedIrradiance: vec3f = irradiance;  

  (*ptr_reflectedLight).indirectSpecular += singleScattering * radiance;
  (*ptr_reflectedLight).indirectSpecular += multiScattering * cosineWeightedIrradiance;
  
  (*ptr_reflectedLight).indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
`
