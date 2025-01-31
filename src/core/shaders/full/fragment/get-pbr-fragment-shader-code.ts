import { FragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct'
import { getIBLIndirect } from '../../chunks/fragment/head/get-IBL-indirect'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission'
import { getPBRShading } from '../../chunks/fragment/body/get-pbr-shading'
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
 * @param parameters - {@link FragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export const getPbrFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Linear',
  geometry,
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
}: FragmentShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  // patch environment map material uniforms
  if (environmentMap && materialUniform && materialUniform.struct) {
    materialUniform.struct = {
      ...materialUniform.struct,
      envRotation: {
        type: 'mat3x3f',
        value: environmentMap.rotation,
      },
      envDiffuseIntensity: {
        type: 'f32',
        value: environmentMap.options.diffuseIntensity,
      },
      envSpecularIntensity: {
        type: 'f32',
        value: environmentMap.options.specularIntensity,
      },
    }
  }

  return /* wgsl */ `  
${chunks.additionalHead}

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
  
  ${declareAttributesVars({ geometry })}
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
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
}
