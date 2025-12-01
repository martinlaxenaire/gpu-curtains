import { PhongFragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { getPhongDirect } from '../../chunks/fragment/head/get-phong-direct'
import { getPhongShading } from '../../chunks/fragment/body/get-phong-shading'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { getFragmentOutputStruct } from '../../chunks/fragment/head/get-fragment-output-struct'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormal } from '../../chunks/fragment/body/get-normal'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { getSpecular } from '../../chunks/fragment/body/get-specular'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { patchAdditionalChunks } from '../../default-material-helpers'
import { generateTBN } from '../../chunks/utils/generate-TBN'
import { getTangentBitangent } from '../../chunks/fragment/body/get-tangent-bitangent'
import { getDiffuse } from '../../chunks/fragment/body/get-diffuse'

/**
 * Build a Phong fragment shader using the provided options.
 * @param parameters - {@link PhongFragmentShaderInputParams} used to build the Phong fragment shader.
 * @returns - The Phong fragment shader generated based on the provided parameters.
 */
export const getPhongFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Khronos',
  outputColorSpace = 'srgb',
  fragmentOutput = {
    struct: [
      {
        type: 'vec4f',
        name: 'color',
      },
    ],
    output: /* wgsl */ `
  var output: FSOutput;
  output.color = outputColor;
  return output;`,
  },
  geometry,
  cullMode = 'back',
  flatShading = false,
  additionalVaryings = [],
  materialUniform = null,
  materialUniformName = 'material',
  receiveShadows = false,
  baseColorTexture = null,
  normalTexture = null,
  emissiveTexture = null,
  occlusionTexture = null,
  metallicRoughnessTexture = null,
  specularTexture = null,
  specularFactorTexture = null,
  specularColorTexture = null,
}: PhongFragmentShaderInputParams): string => {
  // patch chunks
  chunks = patchAdditionalChunks(chunks)

  return /* wgsl */ `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${generateTBN}
${getLightsInfos}
${REIndirectDiffuse}
${getPhongDirect}

${getFragmentInputStruct({ geometry, additionalVaryings })}

${getFragmentOutputStruct({ struct: fragmentOutput.struct })}

@fragment fn main(fsInput: FSInput) -> FSOutput {       
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'Phong' })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}
  
  ${getTangentBitangent({ geometry, cullMode, flatShading, normalTexture })}  
  ${getNormal({ normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getDiffuse}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}

  ${fragmentOutput.output}
}`
}
