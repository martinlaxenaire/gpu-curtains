import { constants } from "../utils/constants.mjs";
import { common } from "../utils/common.mjs";
import { toneMappingUtils } from "../utils/tone-mapping-utils.mjs";
import { getLightsInfos } from "../fragment/head/get-lights-infos.mjs";
import { REIndirectDiffuse } from "../fragment/head/RE-indirect-diffuse.mjs";
import { getLambertDirect } from "../fragment/head/get-lambert-direct.mjs";
import { getLambertShading } from "../fragment/body/get-lambert-shading.mjs";
import { applyToneMapping } from "../fragment/body/apply-tone-mapping.mjs";
//#region src/core/shaders/chunks/shading/lambert-shading.ts
/** Basic minimum utils needed to compute Lambert shading. */
const lambertUtils = `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${toneMappingUtils}
`;
/**
* Shader chunk to add to the head of a fragment shader to be able to use Lambert shading.
* @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Lambert shading.
*
* @example
* ```wgsl
* var color: vec3f = vec4(1.0);
* color = getLambert(normal, worldPosition, color);
* ```
*/
const getLambert = ({ addUtils = true, receiveShadows = false, toneMapping, outputColorSpace, useOcclusion = false } = {}) => `
${addUtils ? lambertUtils : ""}
${getLambertDirect}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  var outputColor: vec4f = color;

  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({
	toneMapping,
	outputColorSpace
})}
    
  return outputColor;
}
`;
//#endregion
export { getLambert, lambertUtils };
