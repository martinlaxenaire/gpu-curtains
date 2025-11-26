/**
 * WGSL functions to calculate the indirect diffuse contribution of lights.
 */
export const REIndirectDiffuse = /* wgsl */ `
fn getAmbientLightIrradiance() -> vec3f {
  var totalAmbientIrradiance: vec3f = vec3(0.0);
  
  for(var i: i32 = 0; i < ambientLights.count; i++) {
    totalAmbientIrradiance += ambientLights.color[i];
  }

  return totalAmbientIrradiance;
}

// Indirect Diffuse RenderEquations
fn RE_IndirectDiffuse(irradiance: vec3f, diffuseContribution: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  (*ptr_reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( diffuseContribution );
}
`
