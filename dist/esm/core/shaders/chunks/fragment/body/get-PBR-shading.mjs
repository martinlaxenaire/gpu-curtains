import { getPCFShadows } from './get-PCF-shadows.mjs';
import { applyDirectionalShadows } from './apply-directional-shadows.mjs';
import { applyPointShadows } from './apply-point-shadows.mjs';
import { getIBLIndirectIrradiance } from './get-IBL-indirect-irradiance.mjs';
import { getIBLIndirectRadiance } from './get-IBL-indirect-radiance.mjs';
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction.mjs';
import { computeMultiScattering } from './get-multi-scattering.mjs';
import { applySpotShadows } from './apply-spot-shadows.mjs';
import { applySheenClearcoatContribution } from './apply-sheen-clearcoat-contribution.mjs';
import { getIBLClearcoatIndirectRadiance } from './get-IBL-clearcoat-indirect-radiance.mjs';
import { getClearcoatIndirectSpecular } from './get-clearcoat-indirect-specular.mjs';
import { getIBLSheenIndirectRadiance } from './get-IBL-sheen-indirect-radiance.mjs';
import { getPBRDirectContribution } from './get-PBR-direct-contribution.mjs';
import { getIndirectDiffuse } from './get-indirect-diffuse.mjs';

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
  
  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed, environmentMap })}
  }
  
  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed, environmentMap })}
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }

    ${receiveShadows ? applyDirectionalShadows : ""}
    ${getPBRDirectContribution({ extensionsUsed, environmentMap })}
  }
  
  var irradiance: vec3f = getAmbientLightIrradiance();
  var radiance: vec3f = vec3(0.0);
  var iblIrradiance: vec3f = vec3(0.0);
  var iblRadiance: vec3f = vec3(0.0);

  var dielectricScattering: MultiScattering;
  var metallicScattering: MultiScattering;
  
  // IBL indirect contributions
  ${computeMultiScattering({ environmentMap })}
  ${getIBLIndirectIrradiance({ extensionsUsed, environmentMap })}
  ${getIBLIndirectRadiance({ extensionsUsed, environmentMap })}

  diffuseColor = mix(diffuseColor, diffuseTransmissionColor, diffuseTransmission);
  diffuseContribution = mix(diffuseContribution, diffuseTransmissionContribution, diffuseTransmission);
  
  // indirect diffuse
  ${getIBLSheenIndirectRadiance({ extensionsUsed, environmentMap })}
  ${getIndirectDiffuse({ extensionsUsed })}

  // indirect specular (and diffuse) from IBL
  RE_IndirectSpecular(
    radiance,
    iblIrradiance,
    diffuseContribution,
    metallic,
    sheenEnergyComp,
    dielectricScattering,
    metallicScattering,
    &reflectedLight
  );

  ${getIBLClearcoatIndirectRadiance({ extensionsUsed, environmentMap })}
  ${getClearcoatIndirectSpecular({ extensionsUsed, environmentMap })}
  
  // occlusion  
  clearcoatSpecularIndirect *= occlusion;
  sheenSpecularIndirect *= occlusion;

  reflectedLight.indirectDiffuse *= occlusion;
  reflectedLight.indirectSpecular *= computeSpecularOcclusion(geometryNormal, viewDirection, occlusion, roughness);
  
  var totalDiffuse: vec3f = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse;
  let totalSpecular: vec3f = reflectedLight.indirectSpecular + reflectedLight.directSpecular;
  
  ${getIBLVolumeRefraction({ transmissionBackgroundTexture, extensionsUsed })}
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${applySheenClearcoatContribution({ extensionsUsed })}
  `
  );
};

export { getPBRShading };
