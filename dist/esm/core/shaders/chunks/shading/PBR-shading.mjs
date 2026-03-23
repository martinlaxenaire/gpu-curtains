import { applyToneMapping } from "../fragment/body/apply-tone-mapping.mjs";
import { lambertUtils } from "./lambert-shading.mjs";
import { REIndirectSpecular } from "../fragment/head/RE-indirect-specular.mjs";
import { getIBLTransmission } from "../fragment/head/get-IBL-transmission.mjs";
import { getPBRDirect } from "../fragment/head/get-PBR-direct.mjs";
import { getPBRShading } from "../fragment/body/get-PBR-shading.mjs";
import { BRDF_GGX } from "../utils/BRDF_GGX.mjs";
//#region src/core/shaders/chunks/shading/PBR-shading.ts
/**
* Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
* @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
*
* @example
* ```wgsl
* var color: vec4f = vec4(1.0);
* let specularColor: vec3f = vec3(1.0);
* let specularIntensity: f32 = 1.0;
* let metallic: f32 = 0.5;
* let roughness: f32 = 0.5;
* let emissive: vec3f = vec3(0.0);
* let ior: f32 = 1.5;
* let transmission: f32 = 0.0;
* let dispersion: f32 = 0.0;
* let thickness: f32 = 0.0;
* let attenuationDistance: f32 = 1.0e38; // Should be infinity or close
* let attenuationColor: vec3f = vec3(1.0);
*
* color = getPBR(
*   normal,
*   worldPosition,
*   color,
*   viewDirection,
*   metallic,
*   roughness,
*   emissive,
*   specularIntensity,
*   specularColor,
*   ior,
*   transmission,
*   dispersion,
*   thickness,
*   attenuationDistance,
*   attenuationColor,
* );
* ```
*/
const getPBR = ({ addUtils = true, receiveShadows = false, toneMapping, outputColorSpace, useOcclusion = false, environmentMap = null, transmissionBackgroundTexture = null, extensionsUsed = [] } = {}) => `
${addUtils ? lambertUtils : ""}
${REIndirectSpecular}
${getIBLTransmission}
${BRDF_GGX}
${getPBRDirect}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  emissive: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  ior: f32,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  var outputColor: vec4f = color;
  
  ${getPBRShading({
	receiveShadows,
	environmentMap,
	transmissionBackgroundTexture,
	extensionsUsed
})}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  ${applyToneMapping({
	toneMapping,
	outputColorSpace
})}
    
  return outputColor;
}
`;
//#endregion
export { getPBR };
