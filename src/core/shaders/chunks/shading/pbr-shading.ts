import { toneMappingUtils } from './tone-mapping-utils'
import RE_indirect_specular from '../helpers/lights/RE_indirect_specular.wgsl'
import { GetShadingParams, lambertUtils } from './lambert-shading'
import { transmissionUtils } from './transmission'
import { applyDirectionalShadows, applyPointShadows, getPCFShadows } from './shadows'

/** Basic minimum utils needed to compute PBR shading. Extends {@link lambertUtils | utils needed for lambert shading}. */
export const pbrUtils = `
${lambertUtils}
${RE_indirect_specular}
${transmissionUtils}
`

/** Helper function chunk appended internally and used to compute PBR direct light contributions. */
export const getPBRDirect = /* wgsl */ `
fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );

  let denom: f32 = (pow2( NdotH ) * (a2 - 1.0) + 1.0);

  return RECIPROCAL_PI * a2 / ( pow2( denom ) );
}

fn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );
  
  let gv: f32 = NdotL * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotV ) );
  let gl: f32 = NdotV * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotL ) );

  return 0.5 / max( gv + gl, EPSILON );
}

fn BRDF_GGX(
  NdotV: f32,
  NdotL: f32,
  NdotH: f32,
  VdotH: f32,
  roughness: f32,
  f0: vec3f
) -> vec3f {
  // cook-torrance brdf
  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
  let D: f32 = DistributionGGX(NdotH, roughness);
  let F: vec3f = F_Schlick(VdotH, f0);
  
  return G * D * F;
}

fn getPBRDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let N: vec3f = normalize(normal);
  let L: vec3f = normalize(directLight.direction);
  let V: vec3f = normalize(viewDirection);
  let H: vec3f = normalize(V + L);
  let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  let NdotL: f32 = clamp(dot(N, L), 0.0, 1.0);
  let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);
  let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);

  let irradiance: vec3f = NdotL * directLight.color;
  let ggx: vec3f = BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, f0);
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * color = getPBR(normal, worldPosition, color, viewDirection, f0, metallic, roughness);
 * ```
 */
export const getPBR = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? pbrUtils : ''}
${getPBRDirect}
${toneMapping ? toneMappingUtils : ''}

fn getPBRContribution(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> ReflectedLight {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, f0, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, f0, metallic, roughness, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, diffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  // var radiance: vec3f = vec3(0.0);
  // RE_IndirectSpecular(radiance, irradiance, normal, diffuseColor.rgb, viewDirection, metallic, roughness, &reflectedLight);
  
  var pbrContribution: ReflectedLight;
  
  pbrContribution.directDiffuse = reflectedLight.directDiffuse;
  pbrContribution.indirectDiffuse = reflectedLight.indirectDiffuse;
  pbrContribution.directSpecular = reflectedLight.directSpecular;
  pbrContribution.indirectSpecular = reflectedLight.indirectSpecular;
  
  return pbrContribution;
}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  transmission: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  var pbrContribution = getPBRContribution(
    normal,
    worldPosition,
    diffuseColor,
    viewDirection,
    f0,
    metallic,
    roughness,
    ${useOcclusion ? 'occlusion' : '0.0'}
  );

  var totalIndirect = pbrContribution.indirectDiffuse + pbrContribution.indirectSpecular;
  let totalDirect = pbrContribution.directDiffuse + pbrContribution.directSpecular;
  
  ${useOcclusion ? 'totalIndirect *= occlusion;' : ''}
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;
  
  ${
    toneMapping === 'linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return vec4(outgoingLight, diffuseColor.a);
}

fn getPBRTransmission(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
  transmission: f32,
  ior: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  var pbrContribution = getPBRContribution(
    normal,
    worldPosition,
    diffuseColor,
    viewDirection,
    f0,
    metallic,
    roughness,
    transmission,
     ${useOcclusion ? 'occlusion' : '0.0'}
  );
  
  var transmissionAlpha: f32 = 1.0;
  
  var specularColor: vec3f = vec3(1.0); // TODO ?
  var specularIntensity: f32 = 1.0; // TODO
  var specularF90: f32 = mix(specularIntensity, 1.0, metallic); // TODO?!
  
  specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity, diffuseColor.rgb, metallic );
  
  let metallicDiffuseColor: vec4f = diffuseColor * ( 1.0 - metallic );
  
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
    
  ${useOcclusion ? 'pbrContribution.indirectDiffuse *= occlusion;\npbrContribution.indirectSpecular *= occlusion;' : ''}
  
  var totalDiffuse: vec3f = pbrContribution.indirectDiffuse + pbrContribution.directDiffuse;
  let totalSpecular: vec3f = pbrContribution.indirectSpecular + pbrContribution.directSpecular;
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  
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
`
