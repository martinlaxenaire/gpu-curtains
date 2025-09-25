import { PBRFragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct'
import { getIBLGGXFresnel } from '../../chunks/fragment/head/get-IBL-GGX-Fresnel'
import { getIBLIndirectIrradiance } from '../../chunks/fragment/head/get-IBL-indirect-irradiance'
import { getIBLIndirectRadiance } from '../../chunks/fragment/head/get-IBL-indirect-radiance'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission'
import { getPBRShading } from '../../chunks/fragment/body/get-PBR-shading'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { getSpecular } from '../../chunks/fragment/body/get-specular'
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { patchAdditionalChunks } from '../../default-material-helpers'

/**
 * Build a PBR fragment shader using the provided options.
 * @param parameters - {@link PBRFragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export const getPBRFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Khronos',
  outputColorSpace = 'srgb',
  geometry,
  additionalVaryings = [],
  materialUniform = null,
  materialUniformName = 'material',
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
  environmentMap = null,
}: PBRFragmentShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  return /* wgsl */ `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${REIndirectSpecular}
${getPBRDirect}
${getIBLGGXFresnel}
${getIBLIndirectIrradiance}
${getIBLIndirectRadiance}
${getIBLTransmission}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'PBR', environmentMap })}
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
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}
  return outputColor;
}`
}
