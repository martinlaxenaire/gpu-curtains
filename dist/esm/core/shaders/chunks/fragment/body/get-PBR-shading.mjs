import { getPCFShadows } from './get-PCF-shadows.mjs';
import { applyDirectionalShadows } from './apply-directional-shadows.mjs';
import { applyPointShadows } from './apply-point-shadows.mjs';
import { getIBLIndirectIrradiance } from './get-IBL-indirect-irradiance.mjs';
import { getIBLIndirectRadiance } from './get-IBL-indirect-radiance.mjs';
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction.mjs';
import { computeMultiScattering } from './get-multi-scattering.mjs';
import { applySpotShadows } from './apply-spot-shadows.mjs';
import { applySheenClearcoatContribution } from './apply-sheen-clearcoat-contribution.mjs';
import { getIBLClearCoatIndirectRadiance } from './get-IBL-clearcoat-indirect-radiance.mjs';
import { getClearcoatIndirectSpecular } from './get-clearcoat-indirect-specular.mjs';
import { getSheenIndirectSpecular } from './get-sheen-indirect-specular.mjs';
import { getPBRDirectContribution } from './get-PBR-direct-contribution.mjs';

const getPBRShading = ({
  receiveShadows = false,
  environmentMap = null,
  transmissionBackgroundTexture = null,
  extensionsUsed = []
} = {}) => {
  return (
    /* wgsl */
    `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}
  
  let baseDiffuseColor: vec4f = outputColor * ( 1.0 - metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed })}
  }
  
  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed })}
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyDirectionalShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed })}
  }
  
  var irradiance: vec3f = vec3(0.0);
  var radiance: vec3f = vec3(0.0);
  var iblIrradiance: vec3f = vec3(0.0);
  var iblRadiance: vec3f = vec3(0.0);
  
  // IBL indirect contributions
  ${computeMultiScattering({ environmentMap })}
  ${getIBLIndirectIrradiance({ environmentMap })}
  ${getIBLIndirectRadiance({ extensionsUsed, environmentMap })}
  
  // ambient lights
  RE_IndirectDiffuse(irradiance, baseDiffuseColor.rgb, &reflectedLight);
  
  // indirect specular (and diffuse) from IBL
  RE_IndirectSpecular(
    radiance,
    iblIrradiance,
    baseDiffuseColor.rgb,
    iBLGGXFresnel,
    &reflectedLight
  );

  ${getIBLClearCoatIndirectRadiance({ extensionsUsed, environmentMap })}
  ${getClearcoatIndirectSpecular({ extensionsUsed })}
  ${getSheenIndirectSpecular({ extensionsUsed })}
  
  reflectedLight.indirectDiffuse *= occlusion;

  clearcoatSpecularIndirect *= occlusion;
  sheenSpecularIndirect *= occlusion;
  
  let NdotV: f32 = saturate(dot(geometryNormal, viewDirection));
  reflectedLight.indirectSpecular *= computeSpecularOcclusion(NdotV, occlusion, roughness);
  
  var totalDiffuse: vec3f = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse;
  let totalSpecular: vec3f = reflectedLight.indirectSpecular + reflectedLight.directSpecular;
  
  ${getIBLVolumeRefraction({ transmissionBackgroundTexture, extensionsUsed })}
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${applySheenClearcoatContribution({ extensionsUsed })}
  `
  );
};

export { getPBRShading };
