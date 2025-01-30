import { constants } from '../../chunks/utils/constants.mjs';
import { common } from '../../chunks/utils/common.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct.mjs';
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils.mjs';
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';

const getLambertFragmentShaderCode = ({
  chunks = null,
  toneMapping = "Linear",
  geometry,
  materialUniform = null,
  materialUniformName = "material",
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null
}) => {
  chunks = patchAdditionalChunks(chunks);
  return (
    /* wgsl */
    `  
${chunks.additionalHead}

${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${getLambertDirect}
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Lambert" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}  
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getLambertFragmentShaderCode };
