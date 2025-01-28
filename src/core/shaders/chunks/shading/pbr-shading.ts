import { constants } from '../fragment/head/constants'
import { common } from '../fragment/head/common'
import { getLightsInfos } from '../fragment/head/get-lights-infos'
import { REIndirectSpecular } from '../fragment/head/RE-indirect-specular'
import { GetShadingParams } from './lambert-shading'
import { getIBLTransmission } from '../fragment/head/get-IBL-transmission'
import { getPBRDirect } from '../fragment/head/get-PBR-direct'
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils'
import { getPBRShading } from '../fragment/body/get-pbr-shading'
import { FragmentShaderBaseInputParams } from '../../full/fragment/get-fragment-code'

/** Basic minimum utils needed to compute PBR shading. Extends {@link lambertUtils | utils needed for lambert shading}. */
export const pbrUtils = `
${constants}
${common}
${getLightsInfos}
${REIndirectSpecular}
${getIBLTransmission}
`

export interface GetPBRShadingParams extends GetShadingParams {
  environmentMap?: FragmentShaderBaseInputParams['environmentMap']
  transmissionBackgroundTexture?: FragmentShaderBaseInputParams['transmissionBackgroundTexture']
  extensionsUsed?: FragmentShaderBaseInputParams['extensionsUsed']
}

/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec4(1.0);
 * color = getPBR(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularFactor,
 *   specularColor,
 *   ior,
 * );
 * ```
 */
export const getPBR = (
  {
    addUtils = true,
    receiveShadows = false,
    toneMapping = 'Linear',
    useOcclusion = false,
    environmentMap = null,
    transmissionBackgroundTexture = null,
    extensionsUsed = [],
  } = {} as GetPBRShadingParams
) => /* wgsl */ `
${addUtils ? pbrUtils : ''}
${getPBRDirect}
${toneMapping ? toneMappingUtils : ''}

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  diffuseColor: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularFactor: f32,
  specularColorFactor: vec3f,
  ior: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  ${!useOcclusion ? 'let occlusion: f32 = 1.0;' : ''}
  
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  var outputColor: vec3f = outgoingLight;
  
  ${
    toneMapping === 'Linear'
      ? 'outgoingLight = linearToOutput3(outputColor);'
      : toneMapping === 'Khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outputColor));'
      : ''
  }
  
  return vec4(outputColor, diffuseColor.a);
}
`
