import { GetShadingParams, lambertUtils } from './lambert-shading'
import { REIndirectSpecular } from '../fragment/head/RE-indirect-specular'
import { getIBLTransmission } from '../fragment/head/get-IBL-transmission'
import { getPBRDirect } from '../fragment/head/get-PBR-direct'
import { getPBRShading } from '../fragment/body/get-PBR-shading'
import { PBRFragmentShaderInputParams } from '../../full/fragment/get-fragment-shader-code'
import { applyToneMapping } from '../fragment/body/apply-tone-mapping'
import { ShaderTextureDescriptor } from '../../../../extras/meshes/LitMesh'

/** Defines the basic parameters available for the PBR shading getter function. */
export interface GetPBRShadingParams extends GetShadingParams {
  /** {@link extras/environmentMap/EnvironmentMap.EnvironmentMap | EnvironmentMap} to use for IBL shading. */
  environmentMap?: PBRFragmentShaderInputParams['environmentMap']
  /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
  transmissionBackgroundTexture?: PBRFragmentShaderInputParams['transmissionBackgroundTexture']
  /** The {@link types/gltf/GLTFExtensions.GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
  extensionsUsed?: PBRFragmentShaderInputParams['extensionsUsed']
}

/**
 * Shader chunk to add to the head of a fragment shader to be able to use PBR shading.
 * @param parameters - {@link GetShadingParams | parameters} used to append the right chunks and calculate the PBR shading.
 *
 * @example
 * ```wgsl
 * var color: vec4f = vec4(1.0);
 * let specularColor: vec3f = vec3(1.0);
 * let specularIntensity: f32 = 1.0;
 * let metallic: f32 = 0.5;
 * let roughness: f32 = 0.5;
 * let ior: f32 = 1.5;
 * let transmission: f32 = 0.0;
 * let dispersion: f32 = 0.0;
 * let thickness: f32 = 0.0;
 * let attenuationDistance: f32 = 1.0e38; // Should be infinity or close
 * let attenuationColor: vec3f = vec3(1.0);
 *
 * color = getPBR(
 *   normal,
 *   worldPosition,
 *   color,
 *   viewDirection,
 *   metallic,
 *   roughness,
 *   specularIntensity,
 *   specularColor,
 *   ior,
 *   transmission,
 *   dispersion,
 *   thickness,
 *   attenuationDistance,
 *   attenuationColor,
 * );
 * ```
 */
export const getPBR = (
  {
    addUtils = true,
    receiveShadows = false,
    toneMapping,
    outputColorSpace,
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

fn getPBR(
  normal: vec3f,
  worldPosition: vec3f,
  color: vec4f,
  viewDirection: vec3f,
  metallic: f32,
  roughness: f32,
  specularIntensity: f32,
  specularColor: vec3f,
  ior: f32,
  transmission: f32,
  dispersion: f32,
  thickness: f32,
  attenuationDistance: f32,
  attenuationColor: vec3f,
  ${useOcclusion ? 'occlusion: f32,' : ''}
) -> vec4f {
  ${!useOcclusion ? 'let occlusion: f32 = 1.0;' : ''}
  
  var outputColor: vec4f = color;
  
  ${getPBRShading({ receiveShadows, environmentMap, transmissionBackgroundTexture, extensionsUsed })}
  
  outputColor = vec4(outgoingLight, outputColor.a);
  
  ${applyToneMapping({ toneMapping, outputColorSpace })}
    
  return outputColor;
}
`
