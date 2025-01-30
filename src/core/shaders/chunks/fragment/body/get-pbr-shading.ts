import { ShaderTextureDescriptor, FragmentShaderBaseInputParams } from '../../../full/fragment/get-fragment-shader-code'
import { getPCFShadows } from './get-PCF-shadows'
import { applyDirectionalShadows } from './apply-directional-shadows'
import { applyPointShadows } from './apply-point-shadows'

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
  environmentMap?: FragmentShaderBaseInputParams['environmentMap']
  transmissionBackgroundTexture?: ShaderTextureDescriptor
  extensionsUsed?: FragmentShaderBaseInputParams['extensionsUsed']
} = {}): string => {
  const iblIndirect = !!environmentMap
    ? /* wgsl */ `
  getIBLIndirect(
    normal,
    viewDirection,
    roughness,
    metallic,
    metallicDiffuseColor.rgb,
    specularColor,
    specularFactor,
    ${environmentMap.sampler.name},
    ${environmentMap.lutTexture.options.name},
    ${environmentMap.specularTexture.options.name},
    ${environmentMap.diffuseTexture.options.name},
    envRotation,
    envDiffuseIntensity,
    envSpecularIntensity,
    &reflectedLight
  );
  `
    : ''

  const hasDispersion = extensionsUsed.includes('KHR_materials_dispersion')
  const iblVolumeRefractionFunction = hasDispersion ? 'getIBLVolumeRefractionWithDispersion' : 'getIBLVolumeRefraction'

  const pbrTransmission = transmissionBackgroundTexture
    ? /* wgsl */ `
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    normalize(viewDirection),
    roughness, 
    metallicDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    modelScale,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    ${transmissionBackgroundTexture.texture},
    ${transmissionBackgroundTexture.sampler},
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  outputColor.a *= transmissionAlpha;`
    : ''

  return /* wgsl */ `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}
  
  let metallicDiffuseColor: vec4f = outputColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor: vec3f = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, outputColor.rgb, metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPBRDirect(normal, metallicDiffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPBRDirect(normal, metallicDiffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  ${iblIndirect}
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, metallicDiffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  var radiance: vec3f = vec3(0.0);
  RE_IndirectSpecular(radiance, irradiance, normal, metallicDiffuseColor.rgb, specularFactor, specularColor, viewDirection, metallic, roughness, &reflectedLight);
  
  reflectedLight.indirectDiffuse *= occlusion;
  
  let NdotV: f32 = saturate(dot(geometryNormal, normalize(viewDirection)));
  reflectedLight.indirectSpecular *= computeSpecularOcclusion(NdotV, occlusion, roughness);
  
  var totalDiffuse: vec3f = reflectedLight.indirectDiffuse + reflectedLight.directDiffuse;
  let totalSpecular: vec3f = reflectedLight.indirectSpecular + reflectedLight.directSpecular;
  
  ${pbrTransmission}
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;`
}
