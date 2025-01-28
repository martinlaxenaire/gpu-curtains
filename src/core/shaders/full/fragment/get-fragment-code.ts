import { TextureParams } from '../../../textures/Texture'
import { Sampler } from '../../../samplers/Sampler'
import { EnvironmentMap } from '../../../../extras/environment-map/EnvironmentMap'
import { Geometry } from '../../../geometries/Geometry'

import { constants } from '../../chunks/fragment/head/constants'
import { common } from '../../chunks/fragment/head/common'
import { getLightsInfos } from '../../chunks/fragment/head/get-lights-infos'
import { REIndirectDiffuse } from '../../chunks/fragment/head/RE-indirect-diffuse'
import { REIndirectSpecular } from '../../chunks/fragment/head/RE-indirect-specular'
import { getLambertDirect } from '../../chunks/fragment/head/get-lambert-direct'
import { getPhongDirect } from '../../chunks/fragment/head/get-phong-direct'
import { getIBLTransmission } from '../../chunks/fragment/head/get-IBL-transmission'
import { getPBRDirect } from '../../chunks/fragment/head/get-PBR-direct'
import { getIBLIndirect } from '../../chunks/fragment/head/get-IBL-indirect'
import { toneMappingUtils } from '../../chunks/fragment/head/tone-mapping-utils'

import { getFragmentInputStruct } from '../../chunks/fragment/head/get-fragment-input-struct'
import { declareMaterialVars } from '../../chunks/fragment/body/declare-material-vars'
import { getBaseColor } from '../../chunks/fragment/body/get-base-color'
import { getNormalTangentBitangent } from '../../chunks/fragment/body/get-normal-tangent-bitangent'
import { getMetallicRoughness } from '../../chunks/fragment/body/get-metallic-roughness'
import { getSpecular } from '../../chunks/fragment/body/get-specular'
import { getTransmissionThickness } from '../../chunks/fragment/body/get-transmission-thickness'
import { getEmissiveOcclusion } from '../../chunks/fragment/body/get-emissive-occlusion'
import { getLambertShading } from '../../chunks/fragment/body/get-lambert-shading'
import { getPhongShading } from '../../chunks/fragment/body/get-phong-shading'
import { getPBRShading } from '../../chunks/fragment/body/get-pbr-shading'
import { applyToneMapping } from '../../chunks/fragment/body/apply-tone-mapping'

import { GLTFExtensionsUsed } from '../../../../types/gltf/GLTFExtensions'

import { getUnlitFragmentCode } from './get-unlit-fragment-code'
import { getLambertFragmentCode } from './get-lambert-fragment-code'
import { getPhongFragmentCode } from './get-phong-fragment-code'
import { getPBRFragmentCode } from './get-pbr-fragment-code'

/** Defines all kinds of shading models available. */
export type ShadingModels = 'Unlit' | 'Lambert' | 'Phong' | 'PBR'

/** Defines all kinds of tone mappings available. */
export type ToneMappings = 'Khronos' | 'Linear' | false

/**
 * Define a {@link ShaderTextureDescriptor} used to associate the {@link core/textures/Texture.Texture | Texture} names with the corresponding {@link Sampler} and UV names.
 */
export interface ShaderTextureDescriptor {
  /** Name of the {@link core/textures/Texture.Texture | Texture} to use. */
  texture: TextureParams['name']
  /** Name of the {@link Sampler} to use. */
  sampler: Sampler['name']
  /** Texture coordinate attribute name to use to map this texture. */
  texCoordAttributeName?: string
}

/** Parameters used to build an unlit fragment shader. */
export interface UnlitFragmentShaderInputParams {
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: {
    /** Additional WGSL chunk to add to the fragment shader head. */
    additionalFragmentHead?: string
    /** Preliminary modification to apply to the fragment shader `color` `vec4f` variable before applying any lightning calculations. */
    preliminaryColorContribution?: string
    /** Additional modification to apply to the fragment shader `color` `vec4f` variable before returning it. */
    additionalColorContribution?: string
  }
  /** {@link Geometry} used to create the fragment shader. Can use the {@link Geometry#vertexBuffers | vertexBuffers} properties for vertex colors or tangent/bitangent computations. */
  geometry: Geometry
  /** Whether the shading function should apply tone mapping to the resulting color and if so, which one. Default to `'Linear'`. */
  toneMapping?: ToneMappings
  /** {@link ShaderTextureDescriptor | Base color texture descriptor} to use if any. */
  baseColorTexture?: ShaderTextureDescriptor
}

/** Parameters used to build an unlit fragment shader. */
export interface LambertFragmentShaderInputParams extends UnlitFragmentShaderInputParams {
  /** Whether the shading function should account for current shadows. Default to `false`. */
  receiveShadows?: boolean
  /** {@link ShaderTextureDescriptor | Normal texture descriptor} to use if any. */
  normalTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Emissive texture descriptor} to use if any. */
  emissiveTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Occlusion texture descriptor} to use if any. */
  occlusionTexture?: ShaderTextureDescriptor
}

export interface PhongFragmentShaderInputParams extends LambertFragmentShaderInputParams {
  /** {@link ShaderTextureDescriptor | Metallic roughness texture descriptor} to use if any. */
  metallicRoughnessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular texture descriptor} (mixing both specular color in the `RGB` channels and specular intensity in the `A` channel) to use if any. */
  specularTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular intensity texture descriptor} (using the `A` channel) to use if any. */
  specularFactorTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Specular color texture descriptor} (using the `RGB` channels) to use if any. */
  specularColorTexture?: ShaderTextureDescriptor
}

/** Base parameters used to build a lit fragment shader. */
export interface FragmentShaderBaseInputParams extends PhongFragmentShaderInputParams {
  /** The {@link GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
  extensionsUsed?: GLTFExtensionsUsed
  /** {@link ShaderTextureDescriptor | Transmission texture descriptor} to use if any. */
  transmissionTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Thickness texture descriptor} to use if any. */
  thicknessTexture?: ShaderTextureDescriptor
  /** {@link ShaderTextureDescriptor | Transmission scene background texture descriptor} to use if any. */
  transmissionBackgroundTexture?: ShaderTextureDescriptor
  /** {@link EnvironmentMap} to use for IBL shading. */
  environmentMap?: EnvironmentMap
}

/** Parameters used to build a lit fragment shader. */
export interface FragmentShaderInputParams extends FragmentShaderBaseInputParams {
  /** Shading model to use. Default to `'PBR'`. */
  shadingModel?: ShadingModels
}

/**
 * Build a fragment shader using the provided options, mostly used for PBR shading.
 * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
 * @returns - The fragment shader generated based on the provided parameters.
 */
export const getFragmentCode = ({
  shadingModel = 'PBR',
  chunks = {
    additionalFragmentHead: '',
    preliminaryColorContribution: '',
    additionalColorContribution: '',
  },
  toneMapping = 'Linear',
  geometry,
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
  transmissionBackgroundTexture = null,
  environmentMap = null,
}: FragmentShaderInputParams): string => {
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

  return (() => {
    switch (shadingModel) {
      case 'Unlit':
        return getUnlitFragmentCode({ chunks, toneMapping, geometry, baseColorTexture })
      case 'Lambert':
        return getLambertFragmentCode({
          chunks,
          toneMapping,
          geometry,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
        })
      case 'Phong':
        return getPhongFragmentCode({
          chunks,
          toneMapping,
          geometry,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
          metallicRoughnessTexture,
          specularTexture,
          specularFactorTexture,
          specularColorTexture,
        })
      case 'PBR':
      default:
        return getPBRFragmentCode({
          chunks,
          toneMapping,
          geometry,
          extensionsUsed,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
          metallicRoughnessTexture,
          specularTexture,
          specularFactorTexture,
          specularColorTexture,
          transmissionTexture,
          thicknessTexture,
          transmissionBackgroundTexture,
          environmentMap,
        })
    }
  })()
}
