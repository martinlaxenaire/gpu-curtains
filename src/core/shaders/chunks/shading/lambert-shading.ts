import { constants } from '../utils/constants'
import { common } from '../utils/common'
import { toneMappingUtils } from '../utils/tone-mapping-utils'
import { getLightsInfos } from '../fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../fragment/head/RE-indirect-diffuse'
import { getLambertDirect } from '../fragment/head/get-lambert-direct'
import { ToneMappings } from '../../full/fragment/get-fragment-shader-code'
import { getLambertShading } from '../fragment/body/get-lambert-shading'
import { applyToneMapping } from '../fragment/body/apply-tone-mapping'

// TODO add emissive?
/** Defines the basic parameters available for the various shading getter functions. */
export interface GetShadingParams {
  /** Whether to add the utils functions such as constants or helper functions. Default to `true`. */
  addUtils?: boolean
  /** Whether the shading function should account for current shadows. Default to `false`. */
  receiveShadows?: boolean
  /** Whether the shading function should apply tone mapping to the resulting color and if so, which one. Default to `'Khronos'`. */
  toneMapping?: ToneMappings
  /** Whether ambient occlusion should be accounted when calculating the shading. Default to `false`. If set to `true`, a float `f32` ambient occlusion value should be passed as the last shading function parameter. */
  useOcclusion?: boolean
}

/** Basic minimum utils needed to compute Lambert shading. */
export const lambertUtils = /* wgsl */ `
${constants}
${common}
${getLightsInfos}
${REIndirectDiffuse}
${toneMappingUtils}
`

/**
 * Shader chunk to add to the head of a fragment shader to be able to use Lambert shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the Lambert shading.
 *
 * @example
 * ```wgsl
 * var color: vec3f = vec4(1.0);
 * color = getLambert(normal, worldPosition, color);
 * ```
 */
export const getLambert = (
  { addUtils = true, receiveShadows = false, toneMapping, useOcclusion = false } = {} as GetShadingParams
) => /* wgsl */ `
${addUtils ? lambertUtils : ''}
${getLambertDirect}

fn getLambert(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  ${!useOcclusion ? 'let occlusion: f32 = 1.0;' : ''}
  
  var outputColor: vec4f = color;

  ${getLambertShading({ receiveShadows })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping })}
    
  return outputColor;
}
`
