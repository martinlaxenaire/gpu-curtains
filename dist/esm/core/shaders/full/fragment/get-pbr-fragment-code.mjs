import { constants } from '../../chunks/fragment/head/constants.mjs';
import { common } from '../../chunks/fragment/head/common.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils.mjs';
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular.mjs';
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct.mjs';
import { getIBLIndirect } from '../../chunks/fragment/head/get-IBL-indirect.mjs';
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission.mjs';
import { getPBRShading } from '../../chunks/fragment/body/get-pbr-shading.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { getSpecular } from '../../chunks/fragment/body/get-specular.mjs';
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';

const getPBRFragmentCode = ({
  chunks = {
    additionalFragmentHead: "",
    preliminaryColorContribution: "",
    additionalColorContribution: ""
  },
  toneMapping = "Linear",
  geometry,
  extensionsUsed = [],
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null,
  metallicRoughnessTexture = null,
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null,
  transmissionTexture = null,
  thicknessTexture = null,
  transmissionBackgroundTexture = null,
  environmentMap = null
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
${REIndirectSpecular}
${getPBRDirect}
${getIBLIndirect}
${getIBLTransmission}
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  ${declareMaterialVars({ environmentMap })}
  ${getBaseColor({ geometry, baseColorTexture })}
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  var normal: vec3f = normalize(fsInput.normal);
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  
  // user defined preliminary color contribution
  ${chunks.preliminaryColorContribution}
  
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getTransmissionThickness({ transmissionTexture, thicknessTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional color contribution
  ${chunks.additionalColorContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getPBRFragmentCode };
