/** Helper function chunk appended internally and used to compute IBL indirect light contributions, based on environment diffuse and specular maps. */
// we could either compute the indirect contribution directly inside getIBLIndirect()
// or compute IBL radiance (specular) and irradiance (diffuse) factors
// and use them inside RE_IndirectSpecular() later to apply scattering
// first solution seems to be more realistic for now
export const getIBLIndirect = /* wgsl */ `
struct IBLGGXFresnel {
  FssEss: vec3f,
  FmsEms: vec3f
}

fn getIBLGGXFresnel(normal: vec3f, viewDirection: vec3f, roughness: f32, f0: vec3f, specularWeight: f32, clampSampler: sampler,
  lutTexture: texture_2d<f32>) -> IBLGGXFresnel {
    var iBLGGXFresnel: IBLGGXFresnel;

    let N: vec3f = normalize(normal);
    let V: vec3f = normalize(viewDirection);
    let NdotV: f32 = saturate(dot(N, V));
    
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

fn getIBLIndirect(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  metallic: f32,
  diffuseColor: vec3f,
  specularColor: vec3f,
  specularFactor: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  envRotation: mat3x3f,
  envDiffuseIntensity: f32,
  envSpecularIntensity: f32,
  ptr_reflectedLight: ptr<function, ReflectedLight>,
) {
  let N: vec3f = normalize(normal);
  let V: vec3f = normalize(viewDirection);
  let NdotV: f32 = saturate(dot(N, V));

  let reflection: vec3f = normalize(reflect(-V, N));

  let iblDiffuseColor: vec3f = mix(diffuseColor, vec3(0.0), vec3(metallic));

  // IBL specular (radiance)
  let lod: f32 = roughness * f32(textureNumLevels(envSpecularTexture) - 1);

  let specularLight: vec4f = textureSampleLevel(
    envSpecularTexture,
    clampSampler,
    reflection * envRotation,
    lod
  );

  // IBL diffuse (irradiance)
  let diffuseLight: vec4f = textureSample(
    envDiffuseTexture,
    clampSampler,
    normal * envRotation
  );

  let iBLGGXFresnel = getIBLGGXFresnel(normal, viewDirection, roughness, specularColor, specularFactor, clampSampler, lutTexture);

  let k_D: vec3f = iblDiffuseColor * (1.0 - iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms);

  (*ptr_reflectedLight).indirectSpecular += specularLight.rgb * iBLGGXFresnel.FssEss * envSpecularIntensity;
  (*ptr_reflectedLight).indirectDiffuse += (iBLGGXFresnel.FmsEms + k_D) * diffuseLight.rgb * envDiffuseIntensity;
}
`
