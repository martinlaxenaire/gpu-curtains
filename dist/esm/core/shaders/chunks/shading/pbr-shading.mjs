import { toneMappingUtils } from './tone-mapping-utils.mjs';
import RE_indirect_specular from '../helpers/lights/RE_indirect_specular.wgsl.mjs';
import { lambertUtils } from './lambert-shading.mjs';
import transmissionUtils from '../helpers/lights/transmission_utils.wgsl.mjs';
import { getPCFShadows, applyPointShadows, applyDirectionalShadows } from './shadows.mjs';

const pbrUtils = `
${lambertUtils}
${RE_indirect_specular}
${transmissionUtils}
`;
const getPBRDirect = (
  /* wgsl */
  `
fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );

  let denom: f32 = (pow2( NdotH ) * (a2 - 1.0) + 1.0);

  return RECIPROCAL_PI * a2 / ( pow2( denom ) );
}

fn GeometrySmith(NdotL: f32, NdotV: f32, roughness: f32) -> f32 {
  let a: f32 = pow2( roughness );
  let a2: f32 = pow2( a );
  
  let gv: f32 = NdotL * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotV ) );
  let gl: f32 = NdotV * sqrt( a2 + ( 1.0 - a2 ) * pow2( NdotL ) );

  return 0.5 / max( gv + gl, EPSILON );
}

fn BRDF_GGX(
  NdotV: f32,
  NdotL: f32,
  NdotH: f32,
  VdotH: f32,
  roughness: f32,
  specularFactor: f32,
  specularColor: vec3f
) -> vec3f {
  // cook-torrance brdf
  let G: f32 = GeometrySmith(NdotL, NdotV, roughness);
  let D: f32 = DistributionGGX(NdotH, roughness);
  let F: vec3f = F_Schlick(VdotH, specularColor, specularFactor);
  
  return G * D * F;
}

fn getPBRDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let N: vec3f = normalize(normal);
  let L: vec3f = normalize(directLight.direction);
  let V: vec3f = normalize(viewDirection);
  let H: vec3f = normalize(V + L);
  let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  let NdotL: f32 = clamp(dot(N, L), 0.0, 1.0);
  let NdotH: f32 = clamp(dot(N, H), 0.0, 1.0);
  let VdotH: f32 = clamp(dot(V, H), 0.0, 1.0);

  let irradiance: vec3f = NdotL * directLight.color;
  let ggx: vec3f = BRDF_GGX(NdotV, NdotL, NdotH, VdotH, roughness, specularFactor, specularColor);
  
  let diffuseContribution: vec3f = BRDF_Lambert(diffuseColor);
  
  (*ptr_reflectedLight).directDiffuse += irradiance * diffuseContribution;
  (*ptr_reflectedLight).directSpecular += irradiance * ggx;
}
`
);
const getPBR = ({ addUtils = true, receiveShadows = false, toneMapping = "linear", useOcclusion = false } = {}) => (
  /* wgsl */
  `
${addUtils ? pbrUtils : ""}
${getPBRDirect}
${toneMapping ? toneMappingUtils : ""}

fn getPBRContribution(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  specularFactor: f32,
  specularColor: vec3f,
  metallic: f32,
  roughness: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> ReflectedLight {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ""}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ""}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ""}
    getPBRDirect(normal, diffuseColor.rgb, viewDirection, specularFactor, specularColor, metallic, roughness, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, diffuseColor.rgb, &reflectedLight);
  
  // ambient lights specular
  var radiance: vec3f = vec3(0.0);
  RE_IndirectSpecular(radiance, irradiance, normal, diffuseColor.rgb, specularFactor, specularColor, viewDirection, metallic, roughness, &reflectedLight);
  
  var pbrContribution: ReflectedLight;
  
  pbrContribution.directDiffuse = reflectedLight.directDiffuse;
  pbrContribution.indirectDiffuse = reflectedLight.indirectDiffuse;
  pbrContribution.directSpecular = reflectedLight.directSpecular;
  pbrContribution.indirectSpecular = reflectedLight.indirectSpecular;
  
  return pbrContribution;
}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColorFactor: vec3f,
  ior: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  let metallicDiffuseColor: vec4f = diffuseColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, diffuseColor.rgb, metallic );

  var pbrContribution = getPBRContribution(
    normal,
    worldPosition,
    metallicDiffuseColor,
    viewDirection,
    specularFactor,
    specularColor,
    metallic,
    roughness,
    ${useOcclusion ? "occlusion" : "0.0"}
  );
  
  ${useOcclusion ? "pbrContribution.indirectDiffuse *= occlusion;" : ""}

  let totalDiffuse = pbrContribution.indirectDiffuse + pbrContribution.directDiffuse;
  let totalSpecular = pbrContribution.indirectSpecular + pbrContribution.directSpecular;
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${toneMapping === "linear" ? "outgoingLight = linearToOutput3(outgoingLight);" : toneMapping === "khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));" : ""}
  
  return vec4(outgoingLight, diffuseColor.a);
}

fn getPBRTransmission(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColorFactor: vec3f,
  ior: f32,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  transmissionBackgroundTexture: texture_2d<f32>,
  defaultSampler: sampler,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  let metallicDiffuseColor: vec4f = diffuseColor * ( 1.0 - metallic );
  
  let specularF90: f32 = mix(specularFactor, 1.0, metallic);
  let specularColor = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, diffuseColor.rgb, metallic );

  var pbrContribution = getPBRContribution(
    normal,
    worldPosition,
    metallicDiffuseColor,
    viewDirection,
    specularFactor,
    specularColor,
    metallic,
    roughness,
    ${useOcclusion ? "occlusion" : "0.0"}
  );
  
  ${useOcclusion ? "pbrContribution.indirectDiffuse *= occlusion;" : ""}
  
  var transmissionAlpha: f32 = 1.0;
  
  var transmitted: vec4f = getIBLVolumeRefraction(
    normal,
    normalize(viewDirection),
    roughness, 
    metallicDiffuseColor,
    specularColor,
    specularF90,
    worldPosition,
    matrices.model,
    camera.view,
    camera.projection,
    dispersion,
    ior,
    thickness,
    attenuationColor,
    attenuationDistance,
    transmissionBackgroundTexture,
    defaultSampler,
  );
  
  transmissionAlpha = mix( transmissionAlpha, transmitted.a, transmission );
  
  var totalDiffuse: vec3f = pbrContribution.indirectDiffuse + pbrContribution.directDiffuse;
  let totalSpecular: vec3f = pbrContribution.indirectSpecular + pbrContribution.directSpecular;
  
  totalDiffuse = mix(totalDiffuse, transmitted.rgb, transmission);
  
  var outgoingLight: vec3f = totalDiffuse + totalSpecular;
  
  ${toneMapping === "linear" ? "outgoingLight = linearToOutput3(outgoingLight);" : toneMapping === "khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));" : ""}
  
  return vec4(outgoingLight, diffuseColor.a * transmissionAlpha);
}
`
);

export { getPBR, getPBRDirect, pbrUtils };
