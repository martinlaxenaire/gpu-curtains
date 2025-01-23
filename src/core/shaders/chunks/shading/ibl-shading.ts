import { getPBRDirect, pbrUtils } from './pbr-shading'
import { toneMappingUtils } from './tone-mapping-utils'
import { transmissionUtils } from './transmission'
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
  
  let iBLGGXFresnel = getIBLGGXFresnel(normal, viewDirection, roughness, f0, specularWeight, clampSampler, lutTexture);
  
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
${transmissionUtils}
${toneMapping ? toneMappingUtils : ''}

fn getIBLContribution(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  transmission: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  occlusion: f32,
) -> IBLContribution {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, f0, metallic, roughness, transmission, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, f0, metallic, roughness, transmission, directLight, &reflectedLight);
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
    diffuseColor.rgb,
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
  RE_IndirectDiffuse(irradiance, diffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  RE_IndirectSpecular(radiance, irradiance, normal, diffuseColor.rgb, viewDirection, metallic, roughness, &reflectedLight);  
  
  // let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  // var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  var iblContribution: IBLContribution;
  
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
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  transmission: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  var iblContribution = getIBLContribution(
    normal,
    worldPosition,
    diffuseColor,
    viewDirection,
    f0,
    metallic,
    roughness,
    transmission,
    clampSampler,
    lutTexture,
    envSpecularTexture,
    envDiffuseTexture,
    ${useOcclusion ? 'occlusion' : '0.0'}
  );
  
  var totalIndirect = iblContribution.indirectDiffuse + iblContribution.indirectSpecular;
  let totalDirect = iblContribution.directDiffuse + iblContribution.directSpecular;
  
  ${useOcclusion ? 'totalIndirect *= occlusion;' : ''}
  
  var outgoingLight: vec3f = totalIndirect + totalDirect;
  
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
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  transmission: f32,
  clampSampler: sampler,
  lutTexture: texture_2d<f32>,
  envSpecularTexture: texture_cube<f32>,
  envDiffuseTexture: texture_cube<f32>,
  ior: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  var iblContribution = getIBLContribution(
    normal,
    worldPosition,
    diffuseColor,
    viewDirection,
    f0,
    metallic,
    roughness,
    transmission,
    clampSampler,
    lutTexture,
    envSpecularTexture,
    envDiffuseTexture,
     ${useOcclusion ? 'occlusion' : '0.0'}
  );
  
  // TODO threejs is using totalDiffuse and totalSpecular instead?
  let useThree: bool = true;
  
  var transmissionAlpha: f32 = 1.0;
  var totalDiffuse: vec3f;
  var totalSpecular: vec3f;
  var outgoingLight: vec3f;
  
  if(useThree) {    
    var specularColor: vec3f = vec3(1.0); // TODO ?
    var specularIntensity: f32 = 1.0; // TODO
    var specularF90: f32 = mix(specularIntensity, 1.0, metallic); // TODO?!
    
    specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity, diffuseColor.rgb, metallic );
    
    let dxy: vec3f = max( abs( dpdx( normal ) ), abs( dpdy( normal ) ) );
    let geometryRoughness: f32 = max( max( dxy.x, dxy.y ), dxy.z );
    var newRoughness = max( roughness, 0.0525 );
    newRoughness += geometryRoughness;
    newRoughness = min( roughness, 1.0 );
    
    var transmitted: vec4f = getIBLVolumeRefraction(
      normal,
      normalize(viewDirection),
      newRoughness, 
      diffuseColor * ( 1.0 - metallic ),
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
      
    ${
      useOcclusion
        ? 'iblContribution.indirectDiffuse *= occlusion;\niblContribution.indirectSpecular *= occlusion;'
        : ''
    }
    
    totalDiffuse = iblContribution.indirectDiffuse + iblContribution.directDiffuse;
    totalSpecular = iblContribution.indirectSpecular + iblContribution.directSpecular;
    
    totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
    
    outgoingLight = totalDiffuse + totalSpecular;
  } else {
    var f0_dielectric: vec3f = vec3(0.04);
    var f90: vec3f = vec3(1.0);
  
    var transmitted: vec3f = getIBLVolumeRefraction_2(
      normal,
      normalize(viewDirection),
      roughness, 
      diffuseColor,
      f0_dielectric,
      f90,
      worldPosition,
      matrices.model,
      camera.view,
      camera.projection,
      ior,
      thickness,
      attenuationColor,
      attenuationDistance,
      ior,
      transmissionBackgroundTexture,
      defaultSampler,
      lutTexture,
      clampSampler,
    );
    
    ${
      useOcclusion
        ? 'iblContribution.indirectDiffuse *= occlusion;\niblContribution.indirectSpecular *= occlusion;'
        : ''
    }
    
    var totalDiffuse = iblContribution.indirectDiffuse + iblContribution.directDiffuse;
    let totalSpecular = iblContribution.indirectSpecular + iblContribution.directSpecular;
    
    totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
    
    /*
    
    // transmission diffuse
    f_diffuse = mix(f_diffuse, f_specular_transmission, materialInfo.transmissionFactor);
    // indirect specular
      f_specular_metal = getIBLRadianceGGX(n, v, materialInfo.perceptualRoughness);
      f_specular_dielectric = f_specular_metal;
      
      // IBL BRDF from LUT
      vec3 f_metal_fresnel_ibl = getIBLGGXFresnel(n, v, materialInfo.perceptualRoughness, baseColor.rgb, 1.0);
      f_metal_brdf_ibl = f_metal_fresnel_ibl*f_specular_metal;
      
      
      vec3 f_dielectric_fresnel_ibl = getIBLGGXFresnel(n, v, materialInfo.perceptualRoughness, materialInfo.f0_dielectric, materialInfo.specularWeight);
      f_dielectric_brdf_ibl = mix(f_diffuse, f_specular_dielectric, f_dielectric_fresnel_ibl);
      color = mix(f_dielectric_brdf_ibl, f_metal_brdf_ibl, materialInfo.metallic);
    
    */
    
    let specularWeight: f32 = 1.0;
    let metalIBLGGX = getIBLGGXFresnel(normal, viewDirection, roughness, diffuseColor.rgb, specularWeight, clampSampler, lutTexture);
    let dielectricBRDFIBL = mix(iblContribution.indirectDiffuse, iblContribution.indirectSpecular, metalIBLGGX.FssEss + metalIBLGGX.FmsEms);
    
    outgoingLight = mix(
      totalDiffuse + totalSpecular,
      iblContribution.directDiffuse + dielectricBRDFIBL + totalSpecular,
      metallic
    );
  }
  
  
  
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
