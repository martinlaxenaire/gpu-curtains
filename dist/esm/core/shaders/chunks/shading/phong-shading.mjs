import { applyToneMapping } from "../fragment/body/apply-tone-mapping.mjs";
import { lambertUtils } from "./lambert-shading.mjs";
import { getPhongDirect } from "../fragment/head/get-phong-direct.mjs";
import { getPhongShading } from "../fragment/body/get-phong-shading.mjs";
//#region src/core/shaders/chunks/shading/phong-shading.ts
/**
* Shader chunk to add to the head of a fragment shader to be able to use Phong shading.
* @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Phong shading.
*
* @example
* ```wgsl
* var color: vec4f = vec3(1.0);
* let specularColor: vec3f = vec3(1.0);
* let specularIntensity: f32 = 1.0;
* let shininess: f32 = 30.0;
*
* color = getPhong(normal, worldPosition, color, viewDirection, specularIntensity, specularColor, shininess);
* ```
*/
const getPhong = ({ addUtils = true, receiveShadows = false, toneMapping, outputColorSpace, useOcclusion = false } = {}) => `
${addUtils ? lambertUtils : ""}
${getPhongDirect}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  shininess: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  var outputColor: vec4f = color;

  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({
	toneMapping,
	outputColorSpace
})}
    
  return outputColor;
}
`;
//#endregion
export { getPhong };
