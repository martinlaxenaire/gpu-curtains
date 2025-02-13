const REIndirectSpecular = (
  /* wgsl */
  `
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
  let k_D: vec3f = diffuseColor * (1.0 - iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms);

  // we just add radiance and irradiance to the indirect contributions using iBLGGXFresnel
  // we might need to adjust when implementing clearcoat, sheen or iridescence

  // we remove RECIPROCAL_PI multiplication since the LUT already ensures energy conservation
  let cosineWeightedIrradiance: vec3f = irradiance;
  // let cosineWeightedIrradiance: vec3f = irradiance * RECIPROCAL_PI;  

  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FssEss * radiance;
  (*ptr_reflectedLight).indirectSpecular += iBLGGXFresnel.FmsEms * cosineWeightedIrradiance;
  
  (*ptr_reflectedLight).indirectDiffuse += k_D * cosineWeightedIrradiance;
}
`
);

export { REIndirectSpecular };
