import { MeshDescriptor } from '../../types/gltf/GLTFScenesManager'
import { ShaderOptions } from '../../types/Materials'
import { BufferBinding } from '../../core/bindings/BufferBinding'
import { getVertexShaderCode } from '../../core/shaders/full/vertex/get-vertex-shader-code'
import {
  getFragmentShaderCode,
  FragmentShaderBaseInputParams,
  ShadingModels,
} from '../../core/shaders/full/fragment/get-fragment-shader-code'
import { AdditionalChunks } from '../../core/shaders/default-material-helpers'

/**
 * Parameters used to build the shaders
 */
export interface ShaderBuilderParameters {
  /** Shading model to use. */
  shadingModel?: ShadingModels
  /** {@link AdditionalChunks | Additional WGSL chunks} to add to the vertex shaders. */
  vertexChunks?: AdditionalChunks
  /** {@link AdditionalChunks | Additional WGSL chunks} to add to the fragment shaders. */
  fragmentChunks?: AdditionalChunks
  /** Additional IBL parameters to pass as uniform and textures. */
  environmentMap?: FragmentShaderBaseInputParams['environmentMap']
}

/** Shaders returned by the shaders builder function. */
export interface BuiltShaders {
  /** Vertex shader returned by the PBR shader builder. */
  vertex: ShaderOptions
  /** Fragment shader returned by the PBR shader builder. */
  fragment: ShaderOptions
}

/**
 * Build shaders made for glTF parsed objects, based on a {@link MeshDescriptor} and optional {@link ShaderBuilderParameters | shader parameters}.
 *
 * @param meshDescriptor - {@link MeshDescriptor} built by the {@link extras/gltf/GLTFScenesManager.GLTFScenesManager | GLTFScenesManager}
 * @param shaderParameters - {@link ShaderBuilderParameters | shader parameters} to use.
 * @returns - An object containing the shaders.
 */
export const buildShaders = (
  meshDescriptor: MeshDescriptor,
  shaderParameters = {} as ShaderBuilderParameters
): BuiltShaders => {
  // Shader parameters
  let { shadingModel } = shaderParameters
  if (!shadingModel) {
    shadingModel = 'PBR'
  }

  const isUnlit = meshDescriptor.extensionsUsed.includes('KHR_materials_unlit')

  if (isUnlit) {
    shadingModel = 'Unlit'
  }

  // textures check
  const baseColorTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'baseColorTexture')
  const normalTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'normalTexture')
  const emissiveTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'emissiveTexture')
  const occlusionTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'occlusionTexture')
  const metallicRoughnessTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === 'metallicRoughnessTexture'
  )

  // specular
  const specularTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'specularTexture')
  const specularFactorTexture =
    specularTexture ||
    meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'specularFactorTexture')
  const specularColorTexture =
    specularTexture || meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'specularColorTexture')

  // transmission
  const transmissionTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === 'transmissionTexture'
  )
  const thicknessTexture = meshDescriptor.texturesDescriptors.find((t) => t.texture.options.name === 'thicknessTexture')

  // transmission background texture created by the renderer if mesh is transmissive
  const transmissionBackgroundTexture = meshDescriptor.texturesDescriptors.find(
    (t) => t.texture.options.name === 'transmissionBackgroundTexture'
  )

  // add samplers and textures to parameters
  if (!meshDescriptor.parameters.textures) {
    meshDescriptor.parameters.textures = []
  }

  if (!meshDescriptor.parameters.samplers) {
    meshDescriptor.parameters.samplers = []
  }

  if (shadingModel !== 'Unlit') {
    meshDescriptor.texturesDescriptors.forEach((textureDescriptor) => {
      const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === textureDescriptor.sampler.uuid)

      if (!samplerExists) {
        meshDescriptor.parameters.samplers.push(textureDescriptor.sampler)
      }

      meshDescriptor.parameters.textures.push(textureDescriptor.texture)
    })
  } else if (baseColorTexture) {
    const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === baseColorTexture.sampler.uuid)

    if (!samplerExists) {
      meshDescriptor.parameters.samplers.push(baseColorTexture.sampler)
    }

    meshDescriptor.parameters.textures.push(baseColorTexture.texture)
  }

  let { vertexChunks, fragmentChunks } = shaderParameters || {}
  const { environmentMap } = shaderParameters || {}

  if (environmentMap) {
    // add environment map textures and sampler
    meshDescriptor.parameters.textures = [
      ...meshDescriptor.parameters.textures,
      environmentMap.lutTexture,
      environmentMap.diffuseTexture,
      environmentMap.specularTexture,
    ]

    meshDescriptor.parameters.samplers = [...meshDescriptor.parameters.samplers, environmentMap.sampler]
  }

  const vs = getVertexShaderCode({
    bindings: meshDescriptor.parameters.bindings as BufferBinding[],
    geometry: meshDescriptor.parameters.geometry,
    chunks: vertexChunks,
  })

  const fs = getFragmentShaderCode({
    shadingModel,
    chunks: fragmentChunks,
    receiveShadows: !!meshDescriptor.parameters.receiveShadows,
    toneMapping: 'Khronos',
    geometry: meshDescriptor.parameters.geometry,
    materialUniform: meshDescriptor.parameters.uniforms.material,
    materialUniformName: 'material',
    extensionsUsed: meshDescriptor.extensionsUsed,
    baseColorTexture,
    normalTexture,
    metallicRoughnessTexture,
    specularTexture,
    specularFactorTexture,
    specularColorTexture,
    transmissionTexture,
    thicknessTexture,
    emissiveTexture,
    occlusionTexture,
    transmissionBackgroundTexture,
    environmentMap,
  })

  return {
    vertex: {
      code: vs,
      entryPoint: 'main',
    },
    fragment: {
      code: fs,
      entryPoint: 'main',
    },
  }
}
