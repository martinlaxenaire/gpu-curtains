import { getPCFShadows } from './get-PCF-shadows.mjs';
import { applyDirectionalShadows } from './apply-directional-shadows.mjs';
import { applyPointShadows } from './apply-point-shadows.mjs';
import { getIBLIndirect } from './get-IBL-indirect.mjs';
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction.mjs';

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
  
  let specularF90: f32 = mix(specularIntensity, 1.0, metallic);
  specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity, outputColor.rgb, metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    if(!directLight.visible) {
      continue;
    }
    ${receiveShadows ? applyPointShadows : ""}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    ${receiveShadows ? applyDirectionalShadows : ""}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  ${getIBLIndirect({ environmentMap })}
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, baseDiffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  var radiance: vec3f = vec3(0.0);
  RE_IndirectSpecular(radiance, irradiance, normal, baseDiffuseColor.rgb, specularF90, specularColor, viewDirection, metallic, roughness, &reflectedLight);
  
  reflectedLight.indirectDiffuse *= occlusion;
  
  let NdotV: f32 = saturate(dot(geometryNormal, normalize(viewDirection)));
  reflectedLight.indirectSpecular *= computeSpecularOcclusion(NdotV, occlusion, roughness);
  
  var totalDiffuse: vec3f = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse;
  let totalSpecular: vec3f = reflectedLight.indirectSpecular + reflectedLight.directSpecular;
  
  ${getIBLVolumeRefraction({ transmissionBackgroundTexture, extensionsUsed })}
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;`
  );
};

export { getPBRShading };
