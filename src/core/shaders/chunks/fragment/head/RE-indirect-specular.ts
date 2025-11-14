/** WGSL functions to calculate the indirect specular and diffuse contributions of lights using multi-scattering. */
export const REIndirectSpecular = /* wgsl */ `
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
  iBLGGXFresnel: IBLGGXFresnel,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let totalScattering: vec3f = iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms;
	let diffuse: vec3f = diffuseColor * ( 1.0 - max( max( totalScattering.r, totalScattering.g ), totalScattering.b ) );

  // we just add radiance and irradiance to the indirect contributions using iBLGGXFresnel
  // we might need to adjust when implementing clearcoat, sheen or iridescence

  // we remove RECIPROCAL_PI multiplication since the LUT already ensures energy conservation
  // let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;
  let cosineWeightedIrradiance: vec3f = irradiance;  

  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FssEss * radiance;
  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FmsEms * cosineWeightedIrradiance;
  
  (*ptr_reflectedLight).indirectDiffuse += diffuse * cosineWeightedIrradiance;
}
`
