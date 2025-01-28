import { constants } from '../fragment/head/constants'
import { common } from '../fragment/head/common'
import { getLightsInfos } from '../fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../fragment/head/RE-indirect-diffuse'
import { getPhongDirect } from '../fragment/head/get-phong-direct'
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils'
import { GetShadingParams } from './lambert-shading'
import { getPhongShading } from '../fragment/body/get-phong-shading'

const lambertUtils = /* wgsl */ `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use Phong shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Phong shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec3(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularStrength: f32 = 1.0;
 * let shininess: f32 = 32.0;
 * color = getPhong(normal, worldPosition, color, viewDirection, specularColor, specularStrength, shininess);
 * ```
 */
export const getPhong = (
  { addUtils = true, receiveShadows = false, toneMapping = 'Linear', useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? lambertUtils : ''}
${getPhongDirect}
${toneMapping ? toneMappingUtils : ''}

fn getPhong(
  normal: vec3f,
  worldPosition: vec3f,
  outputColor: vec3f,
  viewDirection: vec3f,
  specularColor: vec3f,
  specularFactor: f32,
  shininess: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec3f {
  ${!useOcclusion ? 'let occlusion: f32 = 1.0;' : ''}

  ${getPhongShading({ receiveShadows })}
  
  var color: vec3f = outgoingLight;
  
  ${
    toneMapping === 'Linear'
      ? 'outgoingLight = linearToOutput3(color);'
      : toneMapping === 'Khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(color));'
      : ''
  }
  
  return color;
}
`
