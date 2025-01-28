import { constants } from '../fragment/head/constants.mjs';
import { common } from '../fragment/head/common.mjs';
import { getLightsInfos } from '../fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../fragment/head/RE-indirect-diffuse.mjs';
import { getPhongDirect } from '../fragment/head/get-phong-direct.mjs';
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils.mjs';
import { getPhongShading } from '../fragment/body/get-phong-shading.mjs';

const lambertUtils = (
  /* wgsl */
  `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
`
);
const getPhong = ({ addUtils = true, receiveShadows = false, toneMapping = "Linear", useOcclusion = false } = {}) => (
  /* wgsl */
  `
${addUtils ? lambertUtils : ""}
${getPhongDirect}
${toneMapping ? toneMappingUtils : ""}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  outputColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularFactor: f32,
  shininess: f32,
  ${useOcclusion ? "occlusion: f32," : ""}
) -> vec3f {
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}

  ${getPhongShading({ receiveShadows })}
  
  var color: vec3f = outgoingLight;
  
  ${toneMapping === "Linear" ? "outgoingLight = linearToOutput3(color);" : toneMapping === "Khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(color));" : ""}
  
  return color;
}
`
);

export { getPhong };
