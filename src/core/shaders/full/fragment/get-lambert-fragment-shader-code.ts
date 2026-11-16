import { LambertFragmentShaderInputParams } from './get-fragment-shader-code.js'
import { constants } from '../../chunks/utils/constants.js'
import { common } from '../../chunks/utils/common.js'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.js'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.js'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.js'
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct.js'
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading.js'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.js'
import { getFragmentOutputStruct } from '../../chunks/fragment/head/get-fragment-output-struct.js'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.js'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.js'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.js'
import { getNormal } from '../../chunks/fragment/body/get-normal.js'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.js'
import { patchAdditionalChunks } from '../../default-material-helpers.js'
import { generateTBN } from '../../chunks/utils/generate-TBN.js'
import { getTangentBitangent } from '../../chunks/fragment/body/get-tangent-bitangent.js'

/**
 * Build a Lambert fragment shader using the provided options.
 * @param parameters - {@link LambertFragmentShaderInputParams} used to build the Lambert fragment shader.
 * @returns - The Lambert fragment shader generated based on the provided parameters.
 */
export const getLambertFragmentShaderCode = ({
  chunks = null,
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
}: LambertFragmentShaderInputParams): string => {
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
${getLambertDirect}

${getFragmentInputStruct({ geometry, additionalVaryings })}

${getFragmentOutputStruct({ struct: fragmentOutput.struct })}

@fragment fn main(fsInput: FSInput) -> FSOutput {
  var outputColor: vec4f = vec4();

  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'Lambert' })}
  ${getBaseColor({ geometry, baseColorTexture })}

  // user defined preliminary contribution
  ${chunks.preliminaryContribution}

  ${getTangentBitangent({ geometry, cullMode, flatShading, normalTexture })}
  ${getNormal({ normalTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}

  // lights
  ${getLambertShading({ receiveShadows })}

  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);

  // user defined additional contribution
  ${chunks.additionalContribution}

  ${fragmentOutput.output}
}`
}
