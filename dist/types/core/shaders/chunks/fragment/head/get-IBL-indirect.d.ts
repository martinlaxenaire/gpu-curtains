/** Helper function chunk appended internally and used to compute IBL indirect light contributions, based on environment diffuse and specular maps. Image Based Lightning also use {@link getPBRDirect | PBR direct light contributions}. */
export declare const getIBLIndirect = "\nstruct IBLGGXFresnel {\n  FssEss: vec3f,\n  FmsEms: vec3f\n}\n\nfn getIBLGGXFresnel(normal: vec3f, viewDirection: vec3f, roughness: f32, f0: vec3f, specularWeight: f32, clampSampler: sampler,\n  lutTexture: texture_2d<f32>) -> IBLGGXFresnel {\n    var iBLGGXFresnel: IBLGGXFresnel;\n\n    let N: vec3f = normalize(normal);\n    let V: vec3f = normalize(viewDirection);\n    let NdotV: f32 = saturate(dot(N, V));\n    \n    let brdfSamplePoint: vec2f = saturate(vec2(NdotV, roughness));\n\n    let brdf: vec3f = textureSample(\n      lutTexture,\n      clampSampler,\n      brdfSamplePoint\n    ).rgb;\n\n    let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;\n    let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);\n    iBLGGXFresnel.FssEss = specularWeight * (k_S * brdf.x + brdf.y);\n    let Ems: f32 = (1.0 - (brdf.x + brdf.y));\n    let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);\n    iBLGGXFresnel.FmsEms = Ems * iBLGGXFresnel.FssEss * F_avg / (1.0 - F_avg * Ems);\n\n    return iBLGGXFresnel;\n}\n\nfn getIBLIndirect(\n  normal: vec3f,\n  viewDirection: vec3f,\n  roughness: f32,\n  metallic: f32,\n  diffuseColor: vec3f,\n  specularColor: vec3f,\n  specularFactor: f32,\n  clampSampler: sampler,\n  lutTexture: texture_2d<f32>,\n  envSpecularTexture: texture_cube<f32>,\n  envDiffuseTexture: texture_cube<f32>,\n  envRotation: mat3x3f,\n  envDiffuseIntensity: f32,\n  envSpecularIntensity: f32,\n  ptr_reflectedLight: ptr<function, ReflectedLight>,\n  // ptr_iblIndirect: ptr<function, IBLIndirect>\n) {\n  let N: vec3f = normalize(normal);\n  let V: vec3f = normalize(viewDirection);\n  let NdotV: f32 = saturate(dot(N, V));\n\n  let reflection: vec3f = normalize(reflect(-V, N));\n\n  let iblDiffuseColor: vec3f = mix(diffuseColor, vec3(0.0), vec3(metallic));\n\n  // IBL specular (radiance)\n  let lod: f32 = roughness * f32(textureNumLevels(envSpecularTexture) - 1);\n\n  let specularLight: vec4f = textureSampleLevel(\n    envSpecularTexture,\n    clampSampler,\n    reflection * envRotation,\n    lod\n  );\n\n  // IBL diffuse (irradiance)\n  let diffuseLight: vec4f = textureSample(\n    envDiffuseTexture,\n    clampSampler,\n    normal * envRotation\n  );\n\n  let iBLGGXFresnel = getIBLGGXFresnel(normal, viewDirection, roughness, specularColor, specularFactor, clampSampler, lutTexture);\n\n  let k_D: vec3f = iblDiffuseColor * (1.0 - iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms);\n\n  (*ptr_reflectedLight).indirectSpecular += specularLight.rgb * iBLGGXFresnel.FssEss * envSpecularIntensity;\n  (*ptr_reflectedLight).indirectDiffuse += (iBLGGXFresnel.FmsEms + k_D) * diffuseLight.rgb * envDiffuseIntensity;\n\n  // (*ptr_iblIndirect).diffuse = PI * diffuseLight.rgb * envDiffuseIntensity;\n  // (*ptr_iblIndirect).specular = specularLight.rgb * envSpecularIntensity;\n}\n";
