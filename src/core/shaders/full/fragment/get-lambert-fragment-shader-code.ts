import { LambertFragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct'
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { patchAdditionalChunks } from '../../default-material-helpers'

/**
 * Build a Lambert fragment shader using the provided options.
 * @param parameters - {@link LambertFragmentShaderInputParams} used to build the Lambert fragment shader.
 * @returns - The Lambert fragment shader generated based on the provided parameters.
 */
export const getLambertFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Linear',
  geometry,
  materialUniform = null,
  materialUniformName = 'material',
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null,
}: LambertFragmentShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  return /* wgsl */ `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${getLightsInfos}
${REIndirectDiffuse}
${getLambertDirect}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'Lambert' })}
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
}
