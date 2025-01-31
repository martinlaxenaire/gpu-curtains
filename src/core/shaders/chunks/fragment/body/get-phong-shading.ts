import { getPCFShadows } from './get-PCF-shadows'
import { applyDirectionalShadows } from './apply-directional-shadows'
import { applyPointShadows } from './apply-point-shadows'

/**
 * Set the `outgoingLight` (`vec3f`) using Phong shading.
 * @param parameters - Parameters to use to apply Phong shading.
 * @param parameters.receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @returns - A string with Phong shading applied to `outgoingLight`.
 */
export const getPhongShading = ({ receiveShadows = false }: { receiveShadows?: boolean } = {}): string => {
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
    getPhongDirect(normal, outputColor.rgb, viewDirection, specularColor, specularIntensity, shininess, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPhongDirect(normal, outputColor.rgb, viewDirection, specularColor, specularIntensity, shininess, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, outputColor.rgb, &reflectedLight);
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  totalIndirect *= occlusion;
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;`
}
