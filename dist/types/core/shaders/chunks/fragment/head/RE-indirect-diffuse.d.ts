/**
 * WGSL functions to calculate the indirect diffuse contribution of lights.
 */
export declare const REIndirectDiffuse = "\nfn getAmbientLightIrradiance() -> vec3f {\n  var totalAmbientIrradiance: vec3f = vec3(0.0);\n  \n  for(var i: i32 = 0; i < ambientLights.count; i++) {\n    totalAmbientIrradiance += ambientLights.color[i];\n  }\n\n  return totalAmbientIrradiance;\n}\n\n// Indirect Diffuse RenderEquations\nfn RE_IndirectDiffuse(irradiance: vec3f, diffuseContribution: vec3f, ptr_reflectedLight: ptr<function, ReflectedLight>) {\n  (*ptr_reflectedLight).indirectDiffuse += irradiance * BRDF_Lambert( diffuseContribution );\n}\n";
