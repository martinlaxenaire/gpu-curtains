import { constants } from '../../chunks/utils/constants.mjs';
import { common } from '../../chunks/utils/common.mjs';
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular.mjs';
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct.mjs';
import { getIBLIndirect } from '../../chunks/fragment/head/get-IBL-indirect.mjs';
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission.mjs';
import { getPBRShading } from '../../chunks/fragment/body/get-pbr-shading.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { getSpecular } from '../../chunks/fragment/body/get-specular.mjs';
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';

const getPbrFragmentShaderCode = ({
  chunks = null,
  toneMapping = "Linear",
  geometry,
  materialUniform = null,
  materialUniformName = "material",
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
  chunks = patchAdditionalChunks(chunks);
  if (environmentMap && materialUniform && materialUniform.struct) {
    materialUniform.struct = {
      ...materialUniform.struct,
      envRotation: {
        type: "mat3x3f",
        value: environmentMap.rotation
      },
      envDiffuseIntensity: {
        type: "f32",
        value: environmentMap.options.diffuseIntensity
      },
      envSpecularIntensity: {
        type: "f32",
        value: environmentMap.options.specularIntensity
      }
    };
  }
  return (
    /* wgsl */
    `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${REIndirectSpecular}
${getPBRDirect}
${getIBLIndirect}
${getIBLTransmission}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "PBR", environmentMap })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getTransmissionThickness({ transmissionTexture, thicknessTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
  );
};

export { getPbrFragmentShaderCode };
