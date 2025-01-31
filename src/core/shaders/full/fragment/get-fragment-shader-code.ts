import { Texture, TextureParams } from '../../../textures/Texture'
import { Sampler } from '../../../samplers/Sampler'
import { EnvironmentMap } from '../../../../extras/environmentMap/EnvironmentMap'
import { Geometry } from '../../../geometries/Geometry'

import { GLTFExtensionsUsed } from '../../../../types/gltf/GLTFExtensions'

import { getUnlitFragmentShaderCode } from './get-unlit-fragment-shader-code'
import { getLambertFragmentShaderCode } from './get-lambert-fragment-shader-code'
import { getPhongFragmentShaderCode } from './get-phong-fragment-shader-code'
import { getPbrFragmentShaderCode } from './get-pbr-fragment-shader-code'
import { AdditionalChunks } from '../../default-material-helpers'
import { BufferBindingBaseParams } from '../../../bindings/BufferBinding'

/** Defines all kinds of shading models available. */
export type ShadingModels = 'Unlit' | 'Lambert' | 'Phong' | 'PBR'

/** Defines all kinds of tone mappings available. */
export type ToneMappings = 'Khronos' | 'Linear' | false

/**
 * Define a {@link ShaderTextureDescriptor} used to associate the {@link core/textures/Texture.Texture | Texture} names with the corresponding {@link Sampler} and UV names.
 */
export interface ShaderTextureDescriptor {
  /** Name of the {@link core/textures/Texture.Texture | Texture} to use. */
  texture: Texture
  /** Name of the {@link Sampler} to use. */
  sampler?: Sampler
  /** Texture coordinate attribute name to use to map this texture. */
  texCoordAttributeName?: string
}

/** Parameters used to build an unlit fragment shader. */
export interface UnlitFragmentShaderInputParams {
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: AdditionalChunks
  /** {@link Geometry} used to create the fragment shader. Can use the {@link Geometry#vertexBuffers | vertexBuffers} properties for vertex colors or tangent/bitangent computations. */
  geometry: Geometry
  /** The {@link BufferBindingBaseParams} holding the material uniform values. Will use default values if not provided. */
  materialUniform?: BufferBindingBaseParams
  /** The {@link BufferBindingBaseParams} name to use for variables declarations. Default to `'material'`. */
  materialUniformName?: string
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
 * Build a fragment shader using the provided options, mostly used for lit meshes fragment shader code generation.
 * @param parameters - {@link FragmentShaderInputParams} used to build the fragment shader.
 * @returns - The fragment shader generated based on the provided parameters.
 */
export const getFragmentShaderCode = ({
  shadingModel = 'PBR',
  chunks = null,
  toneMapping = 'Linear',
  geometry,
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
  transmissionTexture = null,
  thicknessTexture = null,
  transmissionBackgroundTexture = null,
  environmentMap = null,
}: FragmentShaderInputParams): string => {
  return (() => {
    switch (shadingModel) {
      case 'Unlit':
        return getUnlitFragmentShaderCode({
          chunks,
          toneMapping,
          geometry,
          materialUniform,
          materialUniformName,
          baseColorTexture,
        })
      case 'Lambert':
        return getLambertFragmentShaderCode({
          chunks,
          toneMapping,
          geometry,
          materialUniform,
          materialUniformName,
          receiveShadows,
          baseColorTexture,
          normalTexture,
          emissiveTexture,
          occlusionTexture,
        })
      case 'Phong':
        return getPhongFragmentShaderCode({
          chunks,
          toneMapping,
          geometry,
          materialUniform,
          materialUniformName,
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
        return getPbrFragmentShaderCode({
          chunks,
          toneMapping,
          geometry,
          materialUniform,
          materialUniformName,
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
