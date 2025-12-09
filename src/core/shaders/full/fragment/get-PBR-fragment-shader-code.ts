import { PBRFragmentShaderInputParams } from './get-fragment-shader-code'
import { constants } from '../../chunks/utils/constants'
import { common } from '../../chunks/utils/common'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct'
import { computeMultiScattering } from '../../chunks/fragment/head/compute-multi-scattering'
import { getIBLIndirectIrradiance } from '../../chunks/fragment/head/get-IBL-indirect-irradiance'
import { getIBLIndirectRadiance } from '../../chunks/fragment/head/get-IBL-indirect-radiance'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission'
import { getIBLSheen } from '../../chunks/fragment/head/get-IBL-sheen'
import { getPBRShading } from '../../chunks/fragment/body/get-PBR-shading'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { getFragmentOutputStruct } from '../../chunks/fragment/head/get-fragment-output-struct'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormal } from '../../chunks/fragment/body/get-normal'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { getSpecular } from '../../chunks/fragment/body/get-specular'
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { patchAdditionalChunks } from '../../default-material-helpers'
import { getPBRDirectSheen } from '../../chunks/fragment/head/get-PBR-direct-sheen'
import { getSheen } from '../../chunks/fragment/body/get-sheen'
import { getClearcoat, getClearcoatNormal } from '../../chunks/fragment/body/get-clearcoat'
import { getPBRDirectClearcoat } from '../../chunks/fragment/head/get-PBR-direct-clearcoat'
import { generateTBN } from '../../chunks/utils/generate-TBN'
import { getIridescence } from '../../chunks/fragment/body/get-iridescence'
import { getPBRIridescence } from '../../chunks/fragment/head/get-PBR-iridescence'
import { getPBRDirectAnisotropic } from '../../chunks/fragment/head/get-PBR-direct-anisotropic'
import { getAnisotropy } from '../../chunks/fragment/body/get-anisotropy'
import { getTangentBitangent } from '../../chunks/fragment/body/get-tangent-bitangent'
import { getIBLIndirectAnisotropyRadiance } from '../../chunks/fragment/head/get-IBL-indirect-anisotropy-radiance'
import { getDiffuse } from '../../chunks/fragment/body/get-diffuse'
import { BRDFCharlie } from '../../chunks/utils/BRDF-Charlie'
import { BRDF_GGX } from '../../chunks/utils/BRDF_GGX'
import { getDiffuseTransmission } from '../../chunks/fragment/body/get-diffuse-transmission'
import { getVolumeMultiToSingleScatter } from '../../chunks/fragment/head/get-volume-multi-to-single-scatter'
import { getVolumeMultiScatter } from '../../chunks/fragment/body/get-volume-multi-scatter'

/**
 * Build a PBR fragment shader using the provided options.
 * @param parameters - {@link PBRFragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export const getPBRFragmentShaderCode = ({
  chunks = null,
  toneMapping = 'Khronos',
  outputColorSpace = 'srgb',
  transmissiveInputColorSpace = 'srgb',
  transmissiveInputToneMapping = 'Khronos',
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
  transmissionThicknessTexture = null,
  transmissionTexture = null,
  thicknessTexture = null,
  sheenTexture = null,
  sheenColorTexture = null,
  sheenRoughnessTexture = null,
  anisotropyTexture = null,
  clearcoatTexture = null,
  clearcoatFactorTexture = null,
  clearcoatRoughnessTexture = null,
  clearcoatNormalTexture = null,
  iridescenceTexture = null,
  iridescenceFactorTexture = null,
  iridescenceThicknessTexture = null,
  diffuseTransmissionTexture = null,
  diffuseTransmissionFactorTexture = null,
  diffuseTransmissionColorTexture = null,
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
${generateTBN}
${getLightsInfos}
${BRDF_GGX}
${getPBRDirect}
${extensionsUsed.includes('KHR_materials_sheen') ? BRDFCharlie : ''}
${extensionsUsed.includes('KHR_materials_sheen') ? getPBRDirectSheen : ''}
${extensionsUsed.includes('KHR_materials_clearcoat') ? getPBRDirectClearcoat : ''}
${extensionsUsed.includes('KHR_materials_iridescence') ? getPBRIridescence : ''}
${extensionsUsed.includes('KHR_materials_anisotropy') ? getPBRDirectAnisotropic : ''}
${REIndirectDiffuse}
${REIndirectSpecular}
${computeMultiScattering}
${getIBLIndirectIrradiance}
${getIBLIndirectRadiance}
${getIBLTransmission}
${extensionsUsed.includes('KHR_materials_sheen') ? getIBLSheen : ''}
${extensionsUsed.includes('KHR_materials_anisotropy') ? getIBLIndirectAnisotropyRadiance : ''}
${extensionsUsed.includes('KHR_materials_volume_scatter') ? getVolumeMultiToSingleScatter : ''}

${getFragmentInputStruct({ geometry, additionalVaryings })}

${getFragmentOutputStruct({ struct: fragmentOutput.struct })}

@fragment fn main(fsInput: FSInput) -> FSOutput {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: 'PBR', environmentMap })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}

  // material infos
  ${getTangentBitangent({ extensionsUsed, geometry, cullMode, flatShading, normalTexture, clearcoatNormalTexture })}  
  ${getNormal({ normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getDiffuse}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getTransmissionThickness({ transmissionThicknessTexture, transmissionTexture, thicknessTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  ${getSheen({ extensionsUsed, sheenTexture, sheenColorTexture, sheenRoughnessTexture })}
  ${getClearcoat({ extensionsUsed, clearcoatTexture, clearcoatFactorTexture, clearcoatRoughnessTexture })}
  ${getClearcoatNormal({ extensionsUsed, normalTexture, clearcoatNormalTexture })}
  ${getIridescence({ extensionsUsed, iridescenceTexture, iridescenceFactorTexture, iridescenceThicknessTexture })}
  ${getAnisotropy({ extensionsUsed, anisotropyTexture })}
  ${getDiffuseTransmission({
    extensionsUsed,
    diffuseTransmissionTexture,
    diffuseTransmissionFactorTexture,
    diffuseTransmissionColorTexture,
  })}
  ${getVolumeMultiScatter({ extensionsUsed })}
  
  // shading
  ${getPBRShading({
    receiveShadows,
    environmentMap,
    transmissionBackgroundTexture,
    transmissiveInputColorSpace,
    transmissiveInputToneMapping,
    extensionsUsed,
  })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}

  ${fragmentOutput.output}
}`
}
