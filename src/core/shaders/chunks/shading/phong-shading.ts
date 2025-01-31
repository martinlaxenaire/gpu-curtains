import { GetShadingParams, lambertUtils } from './lambert-shading'
import { getPhongDirect } from '../fragment/head/get-phong-direct'
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils'
import { getPhongShading } from '../fragment/body/get-phong-shading'

/**
 * Shader chunk to add to the head of a fragment shader to be able to use Phong shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Phong shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec3(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularIntensity: f32 = 1.0;
 * let shininess: f32 = 30.0;
 *
 * color = getPhong(normal, worldPosition, color, viewDirection, specularIntensity, specularColor, shininess);
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
  outputColor: vec4f,
  viewDirection: vec3f,
  specularIntensity: f32,
  specularColor: vec3f,
  shininess: f32,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  ${!useOcclusion ? 'let occlusion: f32 = 1.0;' : ''}

  ${getPhongShading({ receiveShadows })}
  
  ${
    toneMapping === 'Linear'
      ? 'outgoingLight = linearToOutput3(outgoingLight);'
      : toneMapping === 'Khronos'
      ? 'outgoingLight = linearTosRGB(toneMapKhronosPbrNeutral(outgoingLight));'
      : ''
  }
  
  return vec4(outgoingLight, outputColor.a);;
}
`
