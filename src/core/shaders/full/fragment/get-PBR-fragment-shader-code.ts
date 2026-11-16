import { PBRFragmentShaderInputParams } from './get-fragment-shader-code.js'
import { constants } from '../../chunks/utils/constants.js'
import { common } from '../../chunks/utils/common.js'
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.js'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.js'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.js'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular.js'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct.js'
import { computeMultiScattering } from '../../chunks/fragment/head/compute-multi-scattering.js'
import { getIBLIndirectIrradiance } from '../../chunks/fragment/head/get-IBL-indirect-irradiance.js'
import { getIBLIndirectRadiance } from '../../chunks/fragment/head/get-IBL-indirect-radiance.js'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission.js'
import { getIBLSheen } from '../../chunks/fragment/head/get-IBL-sheen.js'
import { getPBRShading } from '../../chunks/fragment/body/get-PBR-shading.js'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.js'
import { getFragmentOutputStruct } from '../../chunks/fragment/head/get-fragment-output-struct.js'
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.js'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.js'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.js'
import { getNormal } from '../../chunks/fragment/body/get-normal.js'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.js'
import { getSpecular } from '../../chunks/fragment/body/get-specular.js'
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness.js'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.js'
import { patchAdditionalChunks } from '../../default-material-helpers.js'
import { getPBRDirectSheen } from '../../chunks/fragment/head/get-PBR-direct-sheen.js'
import { getSheen } from '../../chunks/fragment/body/get-sheen.js'
import { getClearcoat, getClearcoatNormal } from '../../chunks/fragment/body/get-clearcoat.js'
import { getPBRDirectClearcoat } from '../../chunks/fragment/head/get-PBR-direct-clearcoat.js'
import { generateTBN } from '../../chunks/utils/generate-TBN.js'
import { getIridescence } from '../../chunks/fragment/body/get-iridescence.js'
import { getPBRIridescence } from '../../chunks/fragment/head/get-PBR-iridescence.js'
import { getPBRDirectAnisotropic } from '../../chunks/fragment/head/get-PBR-direct-anisotropic.js'
import { getAnisotropy } from '../../chunks/fragment/body/get-anisotropy.js'
import { getTangentBitangent } from '../../chunks/fragment/body/get-tangent-bitangent.js'
import { getIBLIndirectAnisotropyRadiance } from '../../chunks/fragment/head/get-IBL-indirect-anisotropy-radiance.js'
import { getDiffuse } from '../../chunks/fragment/body/get-diffuse.js'
import { BRDFCharlie } from '../../chunks/utils/BRDF-Charlie.js'
import { BRDF_GGX } from '../../chunks/utils/BRDF_GGX.js'
import { getDiffuseTransmission } from '../../chunks/fragment/body/get-diffuse-transmission.js'
import { getVolumeMultiToSingleScatter } from '../../chunks/fragment/head/get-volume-multi-to-single-scatter.js'
import { getVolumeMultiScatter } from '../../chunks/fragment/body/get-volume-multi-scatter.js'

/**
 * Build a PBR fragment shader using the provided options.
 * @param parameters - {@link PBRFragmentShaderInputParams} used to build the PBR fragment shader.
 * @returns - The PBR fragment shader generated based on the provided parameters.
 */
export const getPBRFragmentShaderCode = ({
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
    extensionsUsed,
  })}

  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);

  // user defined additional contribution
  ${chunks.additionalContribution}

  ${fragmentOutput.output}
}`
}
