import { UnlitFragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { patchAdditionalChunks } from '../../default-material-helpers'

/**
 * Build an unlit fragment shader using the provided options.
 * @param parameters - {@link UnlitFragmentShaderInputParams} used to build the unlit fragment shader.
 * @returns - The unlit fragment shader generated based on the provided parameters.
 */
export const getUnlitFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Khronos',
  geometry,
  additionalVaryings = [],
  materialUniform = null,
  materialUniformName = 'material',
  baseColorTexture = null,
}: UnlitFragmentShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  return /* wgsl */ `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}

${getFragmentInputStruct({ geometry, additionalVaryings })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'Unlit' })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
}
