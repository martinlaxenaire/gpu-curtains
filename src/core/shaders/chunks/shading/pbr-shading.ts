import { GetShadingParams, lambertUtils } from './lambert-shading'
import { REIndirectSpecular } from '../fragment/head/RE-indirect-specular'
import { getIBLTransmission } from '../fragment/head/get-IBL-transmission'
import { getPBRDirect } from '../fragment/head/get-PBR-direct'
import { toneMappingUtils } from '../fragment/head/tone-mapping-utils'
import { getPBRShading } from '../fragment/body/get-pbr-shading'
import { FragmentShaderBaseInputParams, ShaderTextureDescriptor } from '../../full/fragment/get-fragment-shader-code'

/** Defines the basic parameters available for the PBR shading getter function. */
export interface GetPBRShadingParams extends GetShadingParams {
  /** {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading. */
  environmentMap?: FragmentShaderBaseInputParams['environmentMap']
  /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
  transmissionBackgroundTexture?: FragmentShaderBaseInputParams['transmissionBackgroundTexture']
  /** The {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
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
${addUtils ? lambertUtils : ''}
${REIndirectSpecular}
${getIBLTransmission}
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
