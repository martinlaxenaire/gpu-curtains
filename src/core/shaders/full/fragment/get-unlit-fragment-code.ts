import { UnlitFragmentShaderInputParams } from './get-fragment-code'
import { constants } from '../../chunks/fragment/head/constants'
import { common } from '../../chunks/fragment/head/common'
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'

/**
 * Build an unlit fragment shader using the provided options.
 * @param parameters - {@link UnlitFragmentShaderInputParams} used to build the unlit fragment shader.
 * @returns - The unlit fragment shader generated based on the provided parameters.
 */
export const getUnlitFragmentCode = ({
  chunks = {
    additionalFragmentHead: '',
    preliminaryColorContribution: '',
    additionalColorContribution: '',
  },
  toneMapping = 'Linear',
  geometry,
  baseColorTexture = null,
}: UnlitFragmentShaderInputParams): string => {
  // patch chunks
  if (!chunks) {
    chunks = {
      additionalFragmentHead: '',
      preliminaryColorContribution: '',
      additionalColorContribution: '',
    }
  } else {
    if (!chunks.additionalFragmentHead) {
      chunks.additionalFragmentHead = ''
    }

    if (!chunks.preliminaryColorContribution) {
      chunks.preliminaryColorContribution = ''
    }

    if (!chunks.additionalColorContribution) {
      chunks.additionalColorContribution = ''
    }
  }

  return /* wgsl */ `  
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
}
