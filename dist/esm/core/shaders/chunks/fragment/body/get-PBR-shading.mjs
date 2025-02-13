import { getPCFShadows } from './get-PCF-shadows.mjs';
import { applyDirectionalShadows } from './apply-directional-shadows.mjs';
import { applyPointShadows } from './apply-point-shadows.mjs';
import { getIBLIndirectIrradiance } from './get-IBL-indirect-irradiance.mjs';
import { getIBLIndirectRadiance } from './get-IBL-indirect-radiance.mjs';
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction.mjs';
import { getIBLGGXFresnel } from './get-IBL-GGX-Fresnel.mjs';

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
  
  var irradiance: vec3f = vec3(0.0);
  var iblIrradiance: vec3f = vec3(0.0);
  var radiance: vec3f = vec3(0.0);
  
  // IBL indirect contributions
  ${getIBLGGXFresnel({ environmentMap })}
  ${getIBLIndirectIrradiance({ environmentMap })}
  ${getIBLIndirectRadiance({ environmentMap })}
  
  // ambient lights
  RE_IndirectDiffuse(irradiance, baseDiffuseColor.rgb, &reflectedLight);
  
  // indirect specular (and diffuse) from IBL
  RE_IndirectSpecular(
    radiance,
    iblIrradiance,
    normal,
    baseDiffuseColor.rgb,
    specularF90,
    specularColor,
    viewDirection,
    metallic,
    roughness,
    iBLGGXFresnel,
    &reflectedLight
  );
  
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
