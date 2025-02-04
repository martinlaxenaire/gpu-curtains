import { getPCFShadows } from './get-PCF-shadows'
import { applyDirectionalShadows } from './apply-directional-shadows'
import { applyPointShadows } from './apply-point-shadows'

/**
 * Set the `outgoingLight` (`vec3f`) using Lambert shading.
 * @param parameters - Parameters to use to apply Lambert shading.
 * @param parameters.receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @returns - A string with Lambert shading applied to `outgoingLight`.
 */
export const getLambertShading = ({ receiveShadows = false }: { receiveShadows?: boolean } = {}): string => {
  return /* wgsl */ `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    if(!directLight.visible) {
      continue;
    }
    ${receiveShadows ? applyPointShadows : ''}
    getLambertDirect(normal, outputColor.rgb, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getLambertDirect(normal, outputColor.rgb, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, outputColor.rgb, &reflectedLight);
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  totalIndirect *= occlusion;
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;`
}
