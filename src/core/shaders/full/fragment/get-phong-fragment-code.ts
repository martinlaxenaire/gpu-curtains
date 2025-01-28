import { getUnlitFragmentCode } from './get-unlit-fragment-code'
import { getLambertFragmentCode } from './get-lambert-fragment-code'
import { constants } from '../../chunks/fragment/head/constants'
import { common } from '../../chunks/fragment/head/common'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct'
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils'
import { getPhongDirect } from '../../chunks/fragment/head/get-phong-direct'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct'
import { getIBLIndirect } from '../../chunks/fragment/head/get-IBL-indirect'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission'
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading'
import { getPhongShading } from '../../chunks/fragment/body/get-phong-shading'
import { getPBRShading } from '../../chunks/fragment/body/get-pbr-shading'
import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { getSpecular } from '../../chunks/fragment/body/get-specular'
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'
import { PhongFragmentShaderInputParams } from './get-fragment-code'

/**
 * Build a Phong fragment shader using the provided options.
 * @param parameters - {@link PhongFragmentShaderInputParams} used to build the Phong fragment shader.
 * @returns - The Phong fragment shader generated based on the provided parameters.
 */
export const getPhongFragmentCode = ({
  chunks = {
    additionalFragmentHead: '',
    preliminaryColorContribution: '',
    additionalColorContribution: '',
  },
  toneMapping = 'Linear',
  geometry,
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
${getLightsInfos}
${REIndirectDiffuse}
${getPhongDirect}
${toneMappingUtils}

${getFragmentInputStruct({ geometry })}

@fragment fn main(fsInput: FSInput) -> @location(0) vec4f {       
  var outputColor: vec4f = vec4();
  ${declareMaterialVars()}
  ${getBaseColor({ geometry, baseColorTexture })}
  let worldPosition: vec3f = fsInput.worldPosition;
  let viewDirection: vec3f = fsInput.viewDirection;
  var normal: vec3f = normalize(fsInput.normal);
  ${getNormalTangentBitangent({ geometry, normalTexture })}
  ${getMetallicRoughness({ metallicRoughnessTexture })}
  
  // user defined preliminary color contribution
  ${chunks.preliminaryColorContribution}
  
  ${getSpecular({ specularTexture, specularFactorTexture, specularColorTexture })}
  ${getEmissiveOcclusion({ emissiveTexture, occlusionTexture })}
  
  // lights
  let shininess: f32 = 1.0 / max(EPSILON, roughness * roughness);
  let specularColor: vec3f = mix( min( pow2( ( ior - 1.0 ) / ( ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularFactor, outputColor.rgb, metallic );
  ${getPhongShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  outputColor = vec4(outputColor.rgb + emissive, outputColor.a);
  
  // user defined additional color contribution
  ${chunks.additionalColorContribution}
  
  ${applyToneMapping({ toneMapping })}
  return outputColor;
}`
}
