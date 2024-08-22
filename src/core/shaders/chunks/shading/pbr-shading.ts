import { toneMappingUtils } from './tone-mapping-utils'
import RE_indirect_specular from '../helpers/lights/RE_indirect_specular.wgsl'
import { GetShadingParams, lambertUtils } from './lambert-shading'
import { applyDirectionalShadows, applyPointShadows, getPCFShadows } from './shadows'

export const pbrUtils = `
${lambertUtils}
${RE_indirect_specular}
`

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
  
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
  (*ptr_reflectedLight).directSpecular += ggx * irradiance;
}
`

export const getPBR = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? pbrUtils : ''}
${getPBRDirect}
${toneMapping ? toneMappingUtils : ''}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  f0: vec3f,
  metallic: f32,
  roughness: f32,
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
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, diffuseColor, &reflectedLight);
  
  // ambient lights specular
  // var radiance: vec3f = vec3(0.0);
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
