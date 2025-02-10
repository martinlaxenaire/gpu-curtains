import { constants } from '../utils/constants.mjs';
import { common } from '../utils/common.mjs';
import { toneMappingUtils } from '../utils/tone-mapping-utils.mjs';
import { getLightsInfos } from '../fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../fragment/head/RE-indirect-diffuse.mjs';
import { getLambertDirect } from '../fragment/head/get-lambert-direct.mjs';
import { getLambertShading } from '../fragment/body/get-lambert-shading.mjs';
import { applyToneMapping } from '../fragment/body/apply-tone-mapping.mjs';

const lambertUtils = (
  /* wgsl */
  `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${toneMappingUtils}
`
);
const getLambert = ({ addUtils = true, receiveShadows = false, toneMapping, useOcclusion = false } = {}) => (
  /* wgsl */
  `
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
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
);

export { getLambert, lambertUtils };
