import { PBRFragmentShaderInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getPCFShadows } from './get-PCF-shadows'
import { applyDirectionalShadows } from './apply-directional-shadows'
import { applyPointShadows } from './apply-point-shadows'
import { getIBLIndirectIrradiance } from './get-IBL-indirect-irradiance'
import { getIBLIndirectRadiance } from './get-IBL-indirect-radiance'
import { getIBLVolumeRefraction } from './get-IBL-volume-refraction'
import { ShaderTextureDescriptor } from '../../../../../extras/meshes/LitMesh'
import { getIBLGGXFresnel } from './get-IBL-GGX-Fresnel'

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
  
  let specularF90: f32 = mix(specularIntensity, 1.0, metallic);
  specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColor, vec3( 1.0 ) ) * specularIntensity, outputColor.rgb, metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    if(!directLight.visible) {
      continue;
    }
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, baseDiffuseColor.rgb, viewDirection, specularF90, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
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
}
