import light_utils from '../helpers/lights/light_utils.wgsl'
import { toneMappingUtils } from './tone-mapping-utils'
import RE_indirect_diffuse from '../helpers/lights/RE_indirect_diffuse.wgsl'
import { applyDirectionalShadows, applyPointShadows, getPCFShadows } from './shadows'
import constants from '../helpers/constants.wgsl'

export type ToneMappingTypes = 'linear' | 'khronos'

export interface GetShadingParams {
  addUtils?: boolean
  receiveShadows?: boolean
  toneMapping?: ToneMappingTypes | boolean
  useOcclusion?: boolean
}

export const lambertUtils = /* wgsl */ `
${constants}
${light_utils}
${RE_indirect_diffuse}
`

export const getLambertDirect = /* wgsl */ `
fn getLambertDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let L = normalize(directLight.direction);
  let NdotL = max(dot(normal, L), 0.0);
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use lambert shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * color = getLambert(normal, worldPosition, color);
 * ```
 */
export const getLambert = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? lambertUtils : ''}
${getLambertDirect}
${toneMapping ? toneMappingUtils : ''}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getLambertDirect(normal, diffuseColor, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, diffuseColor, &reflectedLight);
  
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
