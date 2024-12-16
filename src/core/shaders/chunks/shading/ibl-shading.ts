import { getPBRDirect, pbrUtils } from './pbr-shading'
import { toneMappingUtils } from './tone-mapping-utils'
import { applyDirectionalShadows, applyPointShadows, getPCFShadows } from './shadows'
import { GetShadingParams } from './lambert-shading'

/** Helper function chunk appended internally and used to compute IBL indirect light contributions, based on environment diffuse and specular maps. Image Based Lightning also use {@link getPBRDirect | PBR direct light contributions}. */
// we could either compute the indirect contribution directly inside getIBLIndirect()
// or compute IBL radiance (specular) and irradiance (diffuse) factors
// and use them inside RE_IndirectSpecular() later to apply scattering
// first solution seems to be more realistic for now
export const getIBLIndirect = /* wgsl */ `
// struct IBLIndirect {
//   diffuse: vec3f,
//   specular: vec3f
// }

fn getIBLIndirect(
  normal: vec3f,
  viewDirection: vec3f,
  roughness: f32,
  metallic: f32,
  diffuseColor: vec3f,
  f0: vec3f,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  ptr_reflectedLight: ptr<function, ReflectedLight>,
  // ptr_iblIndirect: ptr<function, IBLIndirect>
) {
  let N: vec3f = normalize(normal);
  let V: vec3f = normalize(viewDirection);
  let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  
  let reflection: vec3f = normalize(reflect(-V, N));
  
  let iblDiffuseColor: vec3f = mix(diffuseColor, vec3(0.0), vec3(metallic));

  let brdfSamplePoint: vec2f = clamp(vec2(NdotV, roughness), vec2(0.0), vec2(1.0));
  
  let brdf: vec3f = textureSample(
    lutTexture,
    clampSampler,
    brdfSamplePoint
  ).rgb;

  let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;
  let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);
  var FssEss: vec3f = k_S * brdf.x + brdf.y;
  
  // IBL specular (radiance)
  let lod: f32 = roughness * f32(textureNumLevels(envSpecularTexture) - 1);
  
  let specularLight: vec4f = textureSampleLevel(
    envSpecularTexture,
    clampSampler,
    reflection * ibl.envRotation,
    lod
  );
  
  // IBL diffuse (irradiance)
  let diffuseLight: vec4f = textureSample(
    envDiffuseTexture,
    clampSampler,
    normal * ibl.envRotation
  );
  
  // product of specularFactor and specularTexture.a
  let specularWeight: f32 = 1.0;
        
  FssEss = specularWeight * k_S * brdf.x + brdf.y;
  
  let Ems: f32 = (1.0 - (brdf.x + brdf.y));
  let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);
  let FmsEms: vec3f = Ems * FssEss * F_avg / (1.0 - F_avg * Ems);
  let k_D: vec3f = iblDiffuseColor * (1.0 - FssEss + FmsEms);
  
  (*ptr_reflectedLight).indirectSpecular += specularLight.rgb * FssEss * ibl.specularStrength;
  (*ptr_reflectedLight).indirectDiffuse += (FmsEms + k_D) * diffuseLight.rgb * ibl.diffuseStrength;
  
  // (*ptr_iblIndirect).diffuse = PI * diffuseLight.rgb * ibl.diffuseStrength;
  // (*ptr_iblIndirect).specular = specularLight.rgb * ibl.specularStrength;
}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use IBL shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the IBL shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * color = getIBL(normal, worldPosition, color, viewDirection, f0, metallic, roughness, clampSampler, lutTexture, envSpecularTexture, envDiffuseTexture);
 * ```
 */
export const getIBL = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? pbrUtils : ''}
${getPBRDirect}
${getIBLIndirect}
${toneMapping ? toneMappingUtils : ''}

fn getIBL(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, diffuseColor, viewDirection, f0, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPBRDirect(normal, diffuseColor, viewDirection, f0, metallic, roughness, directLight, &reflectedLight);
  }
  
  var irradiance: vec3f = vec3(0.0);
  var radiance: vec3f = vec3(0.0);
  
  // var iblIndirect: IBLIndirect;
  
  // IBL
  getIBLIndirect(
    normal,
    viewDirection,
    roughness,
    metallic,
    diffuseColor,
    f0,
    clampSampler,
    lutTexture,
    envSpecularTexture,
    envDiffuseTexture,
    &reflectedLight,
    // &iblIndirect
  );
  
  // irradiance += iblIndirect.diffuse;
  // radiance += iblIndirect.specular;
  
  // ambient lights
  RE_IndirectDiffuse(irradiance, diffuseColor, &reflectedLight);
  
  // ambient lights specular
  // RE_IndirectSpecular(radiance, irradiance, normal, diffuseColor, viewDirection, metallic, roughness, &reflectedLight);  
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  ${useOcclusion ? 'totalIndirect *= occlusion;' : ''}
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;
  
  ${
    toneMapping === 'linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return outgoingLight;
}
`
