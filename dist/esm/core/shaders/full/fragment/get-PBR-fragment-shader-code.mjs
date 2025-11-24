import { constants } from '../../chunks/utils/constants.mjs';
import { common } from '../../chunks/utils/common.mjs';
import { toneMappingUtils } from '../../chunks/utils/tone-mapping-utils.mjs';
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos.mjs';
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse.mjs';
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular.mjs';
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct.mjs';
import { computeMultiScattering } from '../../chunks/fragment/head/compute-multi-scattering.mjs';
import { getIBLIndirectIrradiance } from '../../chunks/fragment/head/get-IBL-indirect-irradiance.mjs';
import { getIBLIndirectRadiance } from '../../chunks/fragment/head/get-IBL-indirect-radiance.mjs';
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission.mjs';
import { getIBLSheen } from '../../chunks/fragment/head/get-IBL-sheen.mjs';
import { getPBRShading } from '../../chunks/fragment/body/get-PBR-shading.mjs';
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct.mjs';
import { getFragmentOutputStruct } from '../../chunks/fragment/head/get-fragment-output-struct.mjs';
import { declareAttributesVars } from '../../chunks/fragment/body/declare-attributes-vars.mjs';
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars.mjs';
import { getBaseColor } from '../../chunks/fragment/body/get-base-color.mjs';
import { getNormal } from '../../chunks/fragment/body/get-normal.mjs';
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness.mjs';
import { getSpecular } from '../../chunks/fragment/body/get-specular.mjs';
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness.mjs';
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion.mjs';
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping.mjs';
import { patchAdditionalChunks } from '../../default-material-helpers.mjs';
import { getPBRDirectSheen } from '../../chunks/fragment/head/get-PBR-direct-sheen.mjs';
import { getSheen } from '../../chunks/fragment/body/get-sheen.mjs';
import { getClearcoat, getClearcoatNormal } from '../../chunks/fragment/body/get-clearcoat.mjs';
import { getPBRDirectClearcoat } from '../../chunks/fragment/head/get-PBR-direct-clearcoat.mjs';
import { generateTBN } from '../../chunks/utils/generate-TBN.mjs';
import { getIridescence } from '../../chunks/fragment/body/get-iridescence.mjs';
import { getPBRIridescence } from '../../chunks/fragment/head/get-PBR-iridescence.mjs';
import { getPBRDirectAnisotropic } from '../../chunks/fragment/head/get-PBR-direct-anisotropic.mjs';
import { getAnisotropy } from '../../chunks/fragment/body/get-anisotropy.mjs';
import { getTangentBitangent } from '../../chunks/fragment/body/get-tangent-bitangent.mjs';
import { getIBLIndirectAnisotropyRadiance } from '../../chunks/fragment/head/get-IBL-indirect-anisotropy-radiance.mjs';
import { getDiffuse } from '../../chunks/fragment/body/get-diffuse.mjs';
import { BRDFCharlie } from '../../chunks/utils/BRDF-Charlie.mjs';
import { BRDF_GGX } from '../../chunks/utils/BRDF_GGX.mjs';

const getPBRFragmentShaderCode = ({
  chunks = null,
  toneMapping = "Khronos",
  outputColorSpace = "srgb",
  fragmentOutput = {
    struct: [
      {
        type: "vec4f",
        name: "color"
      }
    ],
    output: (
      /* wgsl */
      `
  var output: FSOutput;
  output.color = outputColor;
  return output;`
    )
  },
  geometry,
  additionalVaryings = [],
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
  sheenTexture = null,
  sheenColorTexture = null,
  sheenRoughnessTexture = null,
  anisotropyTexture = null,
  clearcoatTexture = null,
  clearcoatRoughnessTexture = null,
  clearcoatNormalTexture = null,
  iridescenceTexture = null,
  iridescenceFactorTexture = null,
  iridescenceThicknessTexture = null,
  transmissionBackgroundTexture = null,
  environmentMap = null
}) => {
  chunks = patchAdditionalChunks(chunks);
  return (
    /* wgsl */
    `  
${chunks.additionalHead}

${constants}
${common}
${toneMappingUtils}
${generateTBN}
${getLightsInfos}
${BRDF_GGX}
${getPBRDirect}
${extensionsUsed.includes("KHR_materials_sheen") ? BRDFCharlie : ""}
${extensionsUsed.includes("KHR_materials_sheen") ? getPBRDirectSheen : ""}
${extensionsUsed.includes("KHR_materials_clearcoat") ? getPBRDirectClearcoat : ""}
${extensionsUsed.includes("KHR_materials_iridescence") ? getPBRIridescence : ""}
${extensionsUsed.includes("KHR_materials_anisotropy") ? getPBRDirectAnisotropic : ""}
${REIndirectDiffuse}
${REIndirectSpecular}
${computeMultiScattering}
${getIBLIndirectIrradiance}
${getIBLIndirectRadiance}
${getIBLTransmission}
${extensionsUsed.includes("KHR_materials_sheen") ? getIBLSheen : ""}
${extensionsUsed.includes("KHR_materials_anisotropy") ? getIBLIndirectAnisotropyRadiance : ""}

${getFragmentInputStruct({ geometry, additionalVaryings })}

${getFragmentOutputStruct({ struct: fragmentOutput.struct })}

@fragment fn main(fsInput: FSInput) -> FSOutput {
  var outputColor: vec4f = vec4();
  
  ${declareAttributesVars({ geometry, additionalVaryings })}
  ${declareMaterialVars({ materialUniform, materialUniformName, shadingModel: "PBR", environmentMap })}
  ${getBaseColor({ geometry, baseColorTexture })}
  
  // user defined preliminary contribution
  ${chunks.preliminaryContribution}

  // material infos
  ${getTangentBitangent({ extensionsUsed, geometry, normalTexture, clearcoatNormalTexture })}  
  ${getNormal({ normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  ${getDiffuse}
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getTransmissionThickness({ transmissionTexture, thicknessTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  ${getSheen({ extensionsUsed, sheenTexture, sheenColorTexture, sheenRoughnessTexture })}
  ${getClearcoat({ extensionsUsed, clearcoatTexture, clearcoatRoughnessTexture })}
  ${getClearcoatNormal({ extensionsUsed, normalTexture, clearcoatNormalTexture })}
  ${getIridescence({ extensionsUsed, iridescenceTexture, iridescenceFactorTexture, iridescenceThicknessTexture })}
  ${getAnisotropy({ extensionsUsed, anisotropyTexture })}
  
  // shading
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional contribution
  ${chunks.additionalContribution}
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}

  ${fragmentOutput.output}
}`
  );
};

export { getPBRFragmentShaderCode };
