import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getPCFShadows } from './get-PCF-shadows'
import { applyDirectionalShadows } from './apply-directional-shadows'
import { applyPointShadows } from './apply-point-shadows'
import { getIBLIndirectIrradiance } from './get-IBL-indirect-irradiance'
import { getIBLIndirectRadiance } from './get-IBL-indirect-radiance'
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { computeMultiScattering } from './get-multi-scattering'
import { applySpotShadows } from './apply-spot-shadows'
import { applySheenClearcoatContribution } from './apply-sheen-clearcoat-contribution'
import { getIBLClearcoatIndirectRadiance } from './get-IBL-clearcoat-indirect-radiance'
import { getClearcoatIndirectSpecular } from './get-clearcoat-indirect-specular'
import { getSheenIndirectSpecular } from './get-sheen-indirect-specular'
import { getPBRDirectContribution } from './get-PBR-direct-contribution'

/**
 * Set the `outgoingLight` (`vec3f`) using PBR shading.
 * @param parameters - Parameters to use to apply PBR shading.
 * @param parameters.receiveShadows - Whether the shading function should account for current shadows. Default to `false`.
 * @param parameters.environmentMap - {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading if any.
 * @param parameters.transmissionBackgroundTexture - {@link ShaderTextureDescriptor | Transmission background texture descriptor} to use for transmission if any.
 * @param parameters.extensionsUsed - {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions used} by the material for specifing shading if any.
 * @returns - A string with PBR shading applied to `outgoingLight`.
 */
export const getPBRShading = ({
  receiveShadows = false,
  environmentMap = null,
  transmissionBackgroundTexture = null,
  extensionsUsed = [],
}: {
  receiveShadows?: boolean
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
  transmissionBackgroundTexture?: ShaderTextureDescriptor
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
} = {}): string => {
  return /* wgsl */ `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}
  
  let baseDiffuseColor: vec4f = outputColor * ( 1.0 - metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyPointShadows : ''}
    ${getPBRDirectContribution({ extensionsUsed })}
  }
  
  // spot lights
  for(var i = 0; i < spotLights.count; i++) {
    getSpotLightInfo(spotLights.elements[i], worldPosition, &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applySpotShadows : ''}
    ${getPBRDirectContribution({ extensionsUsed })}
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    
    if(!directLight.visible) {
      continue;
    }
    
    ${receiveShadows ? applyDirectionalShadows : ''}
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

  ${getIBLClearcoatIndirectRadiance({ extensionsUsed, environmentMap })}
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
}
