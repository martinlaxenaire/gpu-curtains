import { toneMappingUtils } from './tone-mapping-utils'
import { GetShadingParams, lambertUtils } from './lambert-shading'
import { applyDirectionalShadows, applyPointShadows, getPCFShadows } from './shadows'

/** Helper function chunk appended internally and used to compute Phong direct light contributions. */
export const getPhongDirect = /* wgsl */ `
fn D_BlinnPhong( shininess: f32, NdotH: f32 ) -> f32 {
  return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( NdotH, shininess );
}

fn BRDF_BlinnPhong(
  normal: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  shininess: f32,
  directLight: DirectLight
) -> vec3f {
  let L = normalize(directLight.direction);
  let NdotL = max(dot(normal, L), 0.0);
  let H: vec3f = normalize(viewDirection + L);
  
  let NdotH: f32 = clamp(dot(normal, H), 0.0, 1.0);
  let VdotH: f32 = clamp(dot(viewDirection, H), 0.0, 1.0);
  let NdotV: f32 = clamp( dot(normal, viewDirection), 0.0, 1.0 );
  
  let F: vec3f = F_Schlick(VdotH, specularColor, 1.0);
  
  let G: f32 = 0.25; // blinn phong implicit
  
  let D = D_BlinnPhong(shininess, NdotH);
  
  let specular: vec3f = F * G * D;
        
  return specular;
}

fn getPhongDirect(
  normal: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32,
  directLight: DirectLight,
  ptr_reflectedLight: ptr<function, ReflectedLight>
) {
  let L = normalize(directLight.direction);
  let NdotL = max(dot(normal, L), 0.0);
  
  let irradiance: vec3f = NdotL * directLight.color;
  (*ptr_reflectedLight).directDiffuse += irradiance * BRDF_Lambert( diffuseColor );
  (*ptr_reflectedLight).directSpecular += irradiance * BRDF_BlinnPhong( normal, viewDirection, specularColor, shininess, directLight ) * specularStrength;
}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use Phong shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Phong shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularStrength: f32 = 1.0;
 * let shininess: f32 = 32.0;
 * color = getPhong(normal, worldPosition, color, viewDirection, specularColor, specularStrength, shininess);
 * ```
 */
export const getPhong = (
  { addUtils = true, receiveShadows = false, toneMapping = 'linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? lambertUtils : ''}
${getPhongDirect}
${toneMapping ? toneMappingUtils : ''}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularStrength: f32,
  shininess: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec3f {
  var directLight: DirectLight;
  var reflectedLight: ReflectedLight;
  
  ${receiveShadows ? getPCFShadows : ''}

  // point lights
  for(var i = 0; i < pointLights.count; i++) {  
    getPointLightInfo(pointLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyPointShadows : ''}
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // directional lights
  for(var i = 0; i < directionalLights.count; i++) {
    getDirectionalLightInfo(directionalLights.elements[i], worldPosition, &directLight);
    ${receiveShadows ? applyDirectionalShadows : ''}
    getPhongDirect(normal, diffuseColor, viewDirection, specularColor, specularStrength, shininess, directLight, &reflectedLight);
  }
  
  // ambient lights
  var irradiance: vec3f = vec3(0.0);
  RE_IndirectDiffuse(irradiance, diffuseColor, &reflectedLight);
  
  let totalDirect: vec3f = reflectedLight.directDiffuse + reflectedLight.directSpecular;
  var totalIndirect: vec3f = reflectedLight.indirectDiffuse + reflectedLight.indirectSpecular;
  
  ${useOcclusion ? 'totalIndirect *= occlusion;' : ''}
  
  var outgoingLight: vec3f = totalDirect + totalIndirect;
  
  ${
    toneMapping === 'linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return outgoingLight;
}
`
