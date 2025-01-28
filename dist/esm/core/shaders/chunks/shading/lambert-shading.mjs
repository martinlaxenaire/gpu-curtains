import { constants } from '../fragment/head/constants.mjs';
import { common } from '../fragment/head/common.mjs';
import { getLightsInfos } from '../fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../fragment/head/RE-indirect-diffuse.mjs';
import { getLambertDirect } from '../fragment/head/get-lambert-direct.mjs';
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils.mjs';
import { getLambertShading } from '../fragment/body/get-lambert-shading.mjs';

const lambertUtils = (
  /* wgsl */
  `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
`
);
const getLambert = ({ addUtils = true, receiveShadows = false, toneMapping = "Linear", useOcclusion = false } = {}) => (
  /* wgsl */
  `
${addUtils ? lambertUtils : ""}
${getLambertDirect}
${toneMapping ? toneMappingUtils : ""}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  outputColor: vec3f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec3f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  ${getLambertShading({ receiveShadows })}
  
  var color: vec3f = outgoingLight;
  
  ${toneMapping === "Linear" ? "outgoingLight = linearToOutput3(color);" : toneMapping === "Khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(color));" : ""}
  
  return color;
}
`
);

export { getLambert };
