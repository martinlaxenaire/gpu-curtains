import { constants } from '../../chunks/fragment/head/constants.mjs';
import { common } from '../../chunks/fragment/head/common.mjs';
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';

const getUnlitFragmentCode = ({
  chunks = {
    additionalFragmentHead: "",
    preliminaryColorContribution: "",
    additionalColorContribution: ""
  },
  toneMapping = "Linear",
  geometry,
  baseColorTexture = null
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
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  ${declareMaterialVars()}
  ${getBaseColor({ geometry, baseColorTexture })}
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  var normal: vec3f = normalize(fsInput.normal);
  ${getNormalTangentBitangent()}
  ${getMetallicRoughness()}
  ${getEmissiveOcclusion()}
  
  // user defined preliminary color contribution
  ${chunks.preliminaryColorContribution}
  
  // user defined additional color contribution
  ${chunks.additionalColorContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getUnlitFragmentCode };
