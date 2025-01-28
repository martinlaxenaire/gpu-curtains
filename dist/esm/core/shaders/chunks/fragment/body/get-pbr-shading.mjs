import { getPCFShadows } from './get-PCF-shadows.mjs';
import { applyDirectionalShadows } from './apply-directional-shadows.mjs';
import { applyPointShadows } from './apply-point-shadows.mjs';

const getPBRShading = ({
  receiveShadows = false,
  environmentMap = null,
  transmissionBackgroundTexture = null,
  extensionsUsed = []
} = {}) => {
  const iblIndirect = !!environmentMap ? (
    /* wgsl */
    `
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
  ) : "";
  const hasDispersion = extensionsUsed.includes("KHR_materials_dispersion");
  const iblVolumeRefractionFunction = hasDispersion ? "getIBLVolumeRefractionWithDispersion" : "getIBLVolumeRefraction";
  const pbrTransmission = transmissionBackgroundTexture ? (
    /* wgsl */
    `
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = ${iblVolumeRefractionFunction}(
    normal,
    normalize(viewDirection),
    roughness, 
    metallicDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    fsInput.modelScale,
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
  ) : "";
  return (
    /* wgsl */
    `
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}
  
  let metallicDiffuseColor: vec4f = outputColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor: vec3f = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, outputColor.rgb, metallic );

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ""}
    getPBRDirect(normal, metallicDiffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ""}
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
  );
};

export { getPBRShading };
