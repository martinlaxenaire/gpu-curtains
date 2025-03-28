import { constants } from '../../chunks/utils/constants.mjs';
import { common } from '../../chunks/utils/common.mjs';
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { getPhongDirect } from '../../chunks/fragment/head/get-phong-direct.mjs';
import { getPhongShading } from '../../chunks/fragment/body/get-phong-shading.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { getSpecular } from '../../chunks/fragment/body/get-specular.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';

const getPhongFragmentShaderCode = ({
  chunks = null,
  toneMapping = "Khronos",
  geometry,
  additionalVaryings = [],
  materialUniform = null,
  materialUniformName = "material",
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null,
  metallicRoughnessTexture = null,
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null
}) => {
  chunks = patchAdditionalChunks(chunks);
  return (
    /* wgsl */
    `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${getPhongDirect}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "Phong" })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getPhongFragmentShaderCode };
