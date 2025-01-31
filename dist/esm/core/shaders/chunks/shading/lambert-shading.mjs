import { constants } from '../utils/constants.mjs';
import { common } from '../utils/common.mjs';
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
  outputColor: vec4f,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec4f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  ${getLambertShading({ receiveShadows })}
  
  ${toneMapping === "Linear" ? "outgoingLight = linearToOutput3(outgoingLight);" : toneMapping === "Khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));" : ""}
    
  return vec4(outgoingLight, outputColor.a);
}
`
);

export { getLambert, lambertUtils };
