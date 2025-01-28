export const REIndirectDiffuse = /* wgsl */ `
fn getIndirectDiffuse(irradiance: vec3f, diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  (*ptr_reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}

// Indirect Diffuse RenderEquations
fn RE_IndirectDiffuse(irradiance: vec3f, diffuseColor: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {
  var totalAmbientIrradiance: vec3f = irradiance;
  
  for(var i: i32 = 0; i < ambientLights.count; i++) {
    totalAmbientIrradiance += ambientLights.color[i];
  }
  
  getIndirectDiffuse(totalAmbientIrradiance, diffuseColor, ptr_reflectedLight);
}
`
