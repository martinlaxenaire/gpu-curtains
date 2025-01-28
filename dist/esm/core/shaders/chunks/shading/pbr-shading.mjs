import { constants } from '../fragment/head/constants.mjs';
import { common } from '../fragment/head/common.mjs';
import { getLightsInfos } from '../fragment/head/get-lights-infos.mjs';
import { REIndirectSpecular } from '../fragment/head/RE-indirect-specular.mjs';
import { getIBLTransmission } from '../fragment/head/get-IBL-transmission.mjs';
import { getPBRDirect } from '../fragment/head/get-PBR-direct.mjs';
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils.mjs';
import { getPBRShading } from '../fragment/body/get-pbr-shading.mjs';

const pbrUtils = `
${constants}
${common}
${getLightsInfos}
${REIndirectSpecular}
${getIBLTransmission}
`;
const getPBR = ({
  addUtils = true,
  receiveShadows = false,
  toneMapping = "Linear",
  useOcclusion = false,
  environmentMap = null,
  transmissionBackgroundTexture = null,
  extensionsUsed = []
} = {}) => (
  /* wgsl */
  `
${addUtils ? pbrUtils : ""}
${getPBRDirect}
${toneMapping ? toneMappingUtils : ""}

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
  ${!useOcclusion ? "let occlusion: f32 = 1.0;" : ""}
  
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  var outputColor: vec3f = outgoingLight;
  
  ${toneMapping === "Linear" ? "outgoingLight = linearToOutput3(outputColor);" : toneMapping === "Khronos" ? "outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outputColor));" : ""}
  
  return vec4(outputColor, diffuseColor.a);
}
`
);

export { getPBR, pbrUtils };
