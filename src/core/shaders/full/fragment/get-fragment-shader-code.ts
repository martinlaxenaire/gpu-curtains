import { EnvironmentMap } from '../../../../extras/environmentMap/EnvironmentMap'
import { Geometry } from '../../../geometries/Geometry'
import { GLTFExtensionsUsed } from '../../../../types/gltf/GLTFExtensions'
import { getUnlitFragmentShaderCode } from './get-unlit-fragment-shader-code'
import { getLambertFragmentShaderCode } from './get-lambert-fragment-shader-code'
import { getPhongFragmentShaderCode } from './get-phong-fragment-shader-code'
import { getPBRFragmentShaderCode } from './get-PBR-fragment-shader-code'
import { AdditionalChunks } from '../../default-material-helpers'
import { BufferBindingBaseParams } from '../../../bindings/BufferBinding'
import { VertexShaderInputParams } from '../vertex/get-vertex-shader-code'
import {
  LambertTexturesDescriptors,
  PBRTexturesDescriptors,
  PhongTexturesDescriptors,
  ShadingModels,
  UnlitTexturesDescriptors,
} from '../../../../extras/meshes/LitMesh'
import { FragmentOutput } from '../../../../types/shading'
import { ToneMappings, ColorSpace } from '../../../../types/shading'

/** Base parameters used to build a fragment shader. */
export interface FragmentShaderInputBaseParams {
  /** Whether the shading function should apply tone mapping to the resulting color and if so, which one. Default to `'Khronos'`. */
  toneMapping?: ToneMappings
  /** In which {@link ColorSpace} the output should be done. `srgb` should be used most of the time, except for some post processing effects that need input colors in `linear` space (such as bloom). Default to `srgb`. */
  outputColorSpace?: ColorSpace

  /** Optional additional {@link VertexShaderInputParams.additionalVaryings | varyings} to pass from the vertex shader to the fragment shader. */
  additionalVaryings?: VertexShaderInputParams['additionalVaryings']
  /** Custom fragment shader output structure members and returned values to use if needed. Useful when rendering to a Multiple Render Target for example. */
  fragmentOutput?: FragmentOutput
}

/** Parameters used to build an unlit fragment shader. */
export interface UnlitFragmentShaderInputParams extends FragmentShaderInputBaseParams, UnlitTexturesDescriptors {
  /** Additional WGSL chunks to add to the shaders. */
  chunks?: AdditionalChunks
  /** {@link Geometry} used to create the fragment shader. Can use the {@link Geometry#vertexBuffers | vertexBuffers} properties for vertex colors or tangent/bitangent computations. */
  geometry: Geometry
  /** The {@link BufferBindingBaseParams} holding the material uniform values. Will use default values if not provided. */
  materialUniform?: BufferBindingBaseParams
  /** The {@link BufferBindingBaseParams} name to use for variables declarations. Default to `'material'`. */
  materialUniformName?: string
}

/** Parameters used to build an lambert fragment shader. */
export interface LambertFragmentShaderInputParams extends UnlitFragmentShaderInputParams, LambertTexturesDescriptors {
  /** Whether the shading function should account for current shadows. Default to `false`. */
  receiveShadows?: boolean
  /** Culling mode to use for normal and tangent calculations. Default to `back`. */
  cullMode?: GPUCullMode
  /** Whether the material should be rendered using flat shading. Default to `false`. */
  flatShading?: boolean
}

/** Parameters used to build a phong fragment shader. */
export interface PhongFragmentShaderInputParams extends LambertFragmentShaderInputParams, PhongTexturesDescriptors {}

/** Base parameters used to build a PBR fragment shader. */
export interface PBRFragmentShaderInputParams extends PhongFragmentShaderInputParams, PBRTexturesDescriptors {
  /** The {@link GLTFExtensionsUsed | glTF extensions} used to generate this fragment shader. */
  extensionsUsed?: GLTFExtensionsUsed
  /** {@link EnvironmentMap} to use for IBL shading. */
  environmentMap?: EnvironmentMap

  /** Whether the opaque objects sampled by the transmission texture have been drawn in `linear` or `srgb` color space. Default to `srgb`. */
  transmissiveInputColorSpace?: ColorSpace
  /** The tone mapping applied to the opaque objects sampled by the transmission texture, if any. Default to `Khronos`. */
  transmissiveInputToneMapping?: ToneMappings
}

/** Parameters used to build a lit fragment shader. */
export interface FragmentShaderInputParams extends PBRFragmentShaderInputParams {
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
  outputColorSpace = 'srgb',
  fragmentOutput = {
    struct: [
      {
        type: 'vec4f',
        name: 'color',
      },
    ],
    output: /* wgsl */ `
  var output: FSOutput;
  output.color = outputColor;
  return output;`,
  },
  chunks = null,
  toneMapping = 'Khronos',
  transmissiveInputColorSpace = 'srgb',
  transmissiveInputToneMapping = 'Khronos',
  geometry,
  cullMode = 'back',
  flatShading = false,
  additionalVaryings = [],
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
  transmissionThicknessTexture = null,
  transmissionTexture = null,
  thicknessTexture = null,
  sheenTexture = null,
  sheenColorTexture = null,
  sheenRoughnessTexture = null,
  anisotropyTexture = null,
  clearcoatTexture = null,
  clearcoatFactorTexture = null,
  clearcoatRoughnessTexture = null,
  clearcoatNormalTexture = null,
  iridescenceTexture = null,
  iridescenceFactorTexture = null,
  iridescenceThicknessTexture = null,
  diffuseTransmissionTexture = null,
  diffuseTransmissionFactorTexture = null,
  diffuseTransmissionColorTexture = null,
  transmissionBackgroundTexture = null,
  environmentMap = null,
}: FragmentShaderInputParams): string => {
  switch (shadingModel) {
    case 'Unlit':
      return getUnlitFragmentShaderCode({
        chunks,
        toneMapping,
        outputColorSpace,
        fragmentOutput,
        geometry,
        additionalVaryings,
        materialUniform,
        materialUniformName,
        baseColorTexture,
        emissiveTexture,
        occlusionTexture,
      })
    case 'Lambert':
      return getLambertFragmentShaderCode({
        chunks,
        toneMapping,
        outputColorSpace,
        fragmentOutput,
        geometry,
        cullMode,
        flatShading,
        additionalVaryings,
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
        outputColorSpace,
        fragmentOutput,
        geometry,
        cullMode,
        flatShading,
        additionalVaryings,
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
      return getPBRFragmentShaderCode({
        chunks,
        toneMapping,
        outputColorSpace,
        transmissiveInputColorSpace,
        transmissiveInputToneMapping,
        fragmentOutput,
        geometry,
        cullMode,
        flatShading,
        additionalVaryings,
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
        transmissionThicknessTexture,
        transmissionTexture,
        thicknessTexture,
        sheenTexture,
        sheenColorTexture,
        sheenRoughnessTexture,
        anisotropyTexture,
        clearcoatTexture,
        clearcoatFactorTexture,
        clearcoatRoughnessTexture,
        clearcoatNormalTexture,
        iridescenceTexture,
        iridescenceFactorTexture,
        iridescenceThicknessTexture,
        diffuseTransmissionTexture,
        diffuseTransmissionFactorTexture,
        diffuseTransmissionColorTexture,
        transmissionBackgroundTexture,
        environmentMap,
      })
  }
}
