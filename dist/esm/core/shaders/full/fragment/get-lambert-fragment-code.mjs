import { constants } from '../../chunks/fragment/head/constants.mjs';
import { common } from '../../chunks/fragment/head/common.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct.mjs';
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils.mjs';
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';

const getLambertFragmentCode = ({
  chunks = {
    additionalFragmentHead: "",
    preliminaryColorContribution: "",
    additionalColorContribution: ""
  },
  toneMapping = "Linear",
  geometry,
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null
}) => {
  if (!chunks) {
    chunks = {
      additionalFragmentHead: "",
      preliminaryColorContribution: "",
      additionalColorContribution: ""
    };
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = "";
    }
    if (!chunks.preliminaryColorContribution) {
      chunks.preliminaryColorContribution = "";
    }
    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = "";
    }
  }
  return (
    /* wgsl */
    `  
${chunks.additionalFragmentHead}

${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${getLambertDirect}
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  ${declareMaterialVars()}
  ${getBaseColor({ geometry, baseColorTexture })}
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  var normal: vec3f = normalize(fsInput.normal);
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness()}
  
  // user defined preliminary color contribution
  ${chunks.preliminaryColorContribution}
  
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional color contribution
  ${chunks.additionalColorContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getLambertFragmentCode };
