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
struct IBLContribution {
  directDiffuse: vec3f,
  directSpecular: vec3f,
  indirectDiffuse: vec3f,
  indirectSpecular: vec3f
}

struct IBLGGXFresnel {
  FssEss: vec3f,
  FmsEms: vec3f
}

fn getIBLGGXFresnel(normal: vec3f, viewDirection: vec3f, roughness: f32, f0: vec3f, specularWeight: f32, clampSampler: sampler,
  lutTexture: texture_2d<f32>) -> IBLGGXFresnel {
    var iBLGGXFresnel: IBLGGXFresnel;
  
    let N: vec3f = normalize(normal);
    let V: vec3f = normalize(viewDirection);
    let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
    
    let brdfSamplePoint: vec2f = clamp(vec2(NdotV, roughness), vec2(0.0), vec2(1.0));
    
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
  ptr_reflectedLight: ptr<function, ReflectedLight>,
  // ptr_iblIndirect: ptr<function, IBLIndirect>
) {
  let N: vec3f = normalize(normal);
  let V: vec3f = normalize(viewDirection);
  let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  
  let reflection: vec3f = normalize(reflect(-V, N));
  
  let iblDiffuseColor: vec3f = mix(diffuseColor, vec3(0.0), vec3(metallic));

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
  
  let iBLGGXFresnel = getIBLGGXFresnel(normal, viewDirection, roughness, specularColor, specularFactor, clampSampler, lutTexture);
  
  let k_D: vec3f = iblDiffuseColor * (1.0 - iBLGGXFresnel.FssEss + iBLGGXFresnel.FmsEms);
  
  (*ptr_reflectedLight).indirectSpecular += specularLight.rgb * iBLGGXFresnel.FssEss * ibl.specularStrength;
  (*ptr_reflectedLight).indirectDiffuse += (iBLGGXFresnel.FmsEms + k_D) * diffuseLight.rgb * ibl.diffuseStrength;
  
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
 * var color: vec4f = vec4(1.0);
 * color = getIBL(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularFactor,
 *   specularColor,
 *   ior,
 *   clampSampler,
 *   lutTexture,
 *   envSpecularTexture,
 *   envDiffuseTexture,
 * );
 * ```
 */
export const getIBL = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? pbrUtils : ''}
${getPBRDirect}
${getIBLIndirect}
${toneMapping ? toneMappingUtils : ''}

fn getIBLContribution(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  occlusion: f32,
) -> ReflectedLight {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  var irradiance: vec3f = vec3(0.0);
  var radiance: vec3f = vec3(0.0);
    
  // IBL
  getIBLIndirect(
    normal,
    viewDirection,
    roughness,
    metallic,
    diffuseColor.rgb,
    specularColor,
    specularFactor,
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
  RE_IndirectDiffuse(irradiance, diffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  RE_IndirectSpecular(radiance, irradiance, normal, diffuseColor.rgb, specularFactor, specularColor, viewDirection, metallic, roughness, &reflectedLight);  
  
  var iblContribution: ReflectedLight;
  
  iblContribution.directDiffuse = reflectedLight.directDiffuse;
  iblContribution.indirectDiffuse = reflectedLight.indirectDiffuse;
  iblContribution.directSpecular = reflectedLight.directSpecular;
  iblContribution.indirectSpecular = reflectedLight.indirectSpecular;
  
  return iblContribution;
}

fn getIBL(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColorFactor: vec3f,
  ior: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  let metallicDiffuseColor: vec4f = diffuseColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, diffuseColor.rgb, metallic );

  var iblContribution = getIBLContribution(
    normal,
    worldPosition,
    metallicDiffuseColor,
    viewDirection,
    metallic,
    roughness,
    specularFactor,
    specularColor,
    clampSampler,
    lutTexture,
    envSpecularTexture,
    envDiffuseTexture,
    ${useOcclusion ? 'occlusion' : '0.0'}
  );
  
  // TODO computeSpecularOcclusion!
  ${useOcclusion ? 'iblContribution.indirectDiffuse *= occlusion;' : ''}
  
  var totalDiffuse: vec3f = iblContribution.indirectDiffuse + iblContribution.directDiffuse;
  let totalSpecular: vec3f = iblContribution.indirectSpecular + iblContribution.directSpecular;
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${
    toneMapping === 'linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return vec4(outgoingLight, diffuseColor.a);
}

fn getIBLTransmission(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColorFactor: vec3f,
  ior: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  let metallicDiffuseColor: vec4f = diffuseColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, diffuseColor.rgb, metallic );

  var iblContribution = getIBLContribution(
    normal,
    worldPosition,
    metallicDiffuseColor, // TODO check?
    viewDirection,
    metallic,
    roughness,
    specularFactor,
    specularColor,
    clampSampler,
    lutTexture,
    envSpecularTexture,
    envDiffuseTexture,
     ${useOcclusion ? 'occlusion' : '0.0'}
  );
  
  // TODO computeSpecularOcclusion!
  ${useOcclusion ? 'iblContribution.indirectDiffuse *= occlusion;' : ''}
  
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = getIBLVolumeRefraction(
    normal,
    normalize(viewDirection),
    roughness, 
    metallicDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    matrices.model,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    transmissionBackgroundTexture,
    defaultSampler,
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );

  var totalDiffuse: vec3f = iblContribution.indirectDiffuse + iblContribution.directDiffuse;
  let totalSpecular: vec3f = iblContribution.indirectSpecular + iblContribution.directSpecular;
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${
    toneMapping === 'linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return vec4(outgoingLight, diffuseColor.a * transmissionAlpha);
}
`
