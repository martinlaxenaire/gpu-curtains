import { CameraRenderer, isCameraRenderer } from '../../core/renderers/utils'
import { GLTF } from '../../types/gltf/GLTF'
import { GLTFLoader } from '../loaders/GLTFLoader'
import { Sampler, SamplerParams } from '../../core/samplers/Sampler'
import { Texture } from '../../core/textures/Texture'
import { Object3D } from '../../core/objects3D/Object3D'
import { Box3 } from '../../math/Box3'
import { Vec3 } from '../../math/Vec3'
import { Mat3 } from '../../math/Mat3'
import { Mat4 } from '../../math/Mat4'
import { Geometry } from '../../core/geometries/Geometry'
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Mesh } from '../../core/meshes/Mesh'
import { TypedArray, TypedArrayConstructor } from '../../core/bindings/utils'
import { GeometryParams, VertexBufferAttribute, VertexBufferAttributeParams } from '../../types/Geometries'
import { Camera } from '../../core/camera/Camera'
import {
  ChildDescriptor,
  MeshDescriptor,
  MeshDescriptorMaterialParams,
  PrimitiveInstanceDescriptor,
  PrimitiveInstances,
  ScenesManager,
  SkinDefinition,
} from '../../types/gltf/GLTFScenesManager'
import { throwWarning } from '../../utils/utils'
import { BufferBinding } from '../../core/bindings/BufferBinding'
import { KeyframesAnimation } from '../animations/KeyframesAnimation'
import { TargetsAnimationsManager } from '../animations/TargetsAnimationsManager'
import { GLTFExtensionsTypes } from '../../types/gltf/GLTFExtensions'
import { Vec2 } from '../../math/Vec2'
import { RenderMaterial } from '../../core/materials/RenderMaterial'
import { ProjectedMeshParameters } from '../../core/meshes/mixins/ProjectedMeshBaseMixin'
import { DirectionalLight } from '../../core/lights/DirectionalLight'
import { PointLight } from '../../core/lights/PointLight'

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// To make it easier to reference the WebGL enums that glTF uses.
const GL = WebGLRenderingContext

/**
 * Used to create a {@link GLTFScenesManager} from a given {@link GLTFLoader.gltf | gltf} object.
 *
 * Parse the {@link GLTFLoader.gltf | gltf} object, create all the {@link Sampler} and {@link Texture}, create all the {@link Object3D} nodes to compute the correct transformations and parent -> child relationships, create all the needed {@link MeshDescriptor} containing the {@link Geometry}, {@link Mesh} parameters and so on.
 *
 * ## Loading Features
 *
 * - [x] Accessors
 *   - [x] Sparse accessors
 * - [x] Buffers
 * - [x] BufferViews
 * - [x] Images
 * - [x] Meshes
 * - [x] Nodes
 * - [x] Primitives
 *   - [x] Compute flat normals if normal attributes is missing
 *   - [x] Compute tangent space in fragment shader if tangent attributes is missing and a normal map is used (would be better/faster with [MikkTSpace](http://www.mikktspace.com/))
 * - [x] Samplers
 * - [x] Textures
 * - [x] Animations
 *   - Paths
 *     - [x] Translation
 *     - [x] Rotation
 *     - [x] Scale
 *     - [x] Weights
 *   - Interpolation
 *     - [x] Step
 *     - [x] Linear
 *     - [x] CubicSpline
 * - [x] Cameras
 *   - [ ] OrthographicCamera
 *   - [x] PerspectiveCamera
 * - [x] Materials
 * - [x] Skins
 * - [x] Morph targets
 *
 * ## Extensions
 * - [ ] KHR_animation_pointer
 * - [ ] KHR_draco_mesh_compression
 * - [x] KHR_lights_punctual (partial support - SpotLight not yet implemented)
 * - [ ] KHR_materials_anisotropy
 * - [ ] KHR_materials_clearcoat
 * - [x] KHR_materials_dispersion
 * - [x] KHR_materials_emissive_strength
 * - [x] KHR_materials_ior
 * - [ ] KHR_materials_iridescence
 * - [ ] KHR_materials_sheen
 * - [x] KHR_materials_specular
 * - [x] KHR_materials_transmission
 * - [x] KHR_materials_unlit
 * - [x] KHR_materials_variants
 * - [x] KHR_materials_volume
 * - [ ] KHR_mesh_quantization
 * - [ ] KHR_texture_basisu
 * - [ ] KHR_texture_transform
 * - [ ] KHR_xmp_json_ld
 * - [x] EXT_mesh_gpu_instancing
 * - [ ] EXT_meshopt_compression
 * - [ ] EXT_texture_webp
 *
 * @example
 * ```javascript
 * const gltfLoader = new GLTFLoader()
 * const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
 *
 * // create a gltfScenesManager from the resulting 'gltf' object
 * // assuming 'renderer' is a valid camera renderer or curtains instance
 * const gltfScenesManager = new GLTFScenesManager({ renderer, gltf })
 * gltfScenesManager.addMeshes()
 * ```
 */
export class GLTFScenesManager {
  /** The {@link CameraRenderer} used. */
  renderer: CameraRenderer
  /** The {@link GLTFLoader.gltf | gltf} object used. */
  gltf: GLTFLoader['gltf']
  /** The {@link ScenesManager} containing all the useful data. */
  scenesManager: ScenesManager
  /** The {@link PrimitiveInstances} Map, to group similar {@link Mesh} by instances. */
  #primitiveInstances: PrimitiveInstances

  /**
   * {@link GLTFScenesManager} constructor.
   * @param parameters - parameters used to create our {@link GLTFScenesManager}.
   * @param parameters.renderer - our {@link CameraRenderer} class object.
   * @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
   */
  constructor({ renderer, gltf }) {
    renderer = isCameraRenderer(renderer, 'GLTFScenesManager')

    this.renderer = renderer
    this.gltf = gltf

    this.#primitiveInstances = new Map()

    this.scenesManager = {
      node: new Object3D(),
      nodes: new Map(),
      boundingBox: new Box3(),
      samplers: [],
      materialsTextures: [],
      materialsParams: [],
      scenes: [],
      meshes: [],
      meshesDescriptors: [],
      animations: [],
      cameras: [],
      skins: [],
      lights: [],
    }

    this.createSamplers()
    this.createMaterialTextures()
    this.createMaterialsParams()
    this.createLights()
    this.createAnimations()
    this.createScenes()
  }

  /**
   * Get an attribute type, bufferFormat and size from its {@link GLTF.AccessorType | accessor type}.
   * @param type - {@link GLTF.AccessorType | accessor type} to use.
   * @returns - corresponding type, bufferFormat and size.
   */
  static getVertexAttributeParamsFromType(type: GLTF.AccessorType): {
    /** Corresponding attribute type */
    type: VertexBufferAttribute['type']
    /** Corresponding attribute bufferFormat */
    bufferFormat: VertexBufferAttribute['bufferFormat']
    /** Corresponding attribute size */
    size: VertexBufferAttribute['size']
  } {
    switch (type) {
      case 'VEC2':
        return {
          type: 'vec2f',
          bufferFormat: 'float32x2',
          size: 2,
        }
      case 'VEC3':
        return {
          type: 'vec3f',
          bufferFormat: 'float32x3',
          size: 3,
        }
      case 'VEC4':
        return {
          type: 'vec4f',
          bufferFormat: 'float32x4',
          size: 4,
        }
      case 'MAT2':
        return {
          type: 'mat2x2f',
          bufferFormat: 'float32x2', // not used
          size: 6,
        }
      case 'MAT3':
        return {
          type: 'mat3x3f',
          bufferFormat: 'float32x3', // not used
          size: 9,
        }
      case 'MAT4':
        return {
          type: 'mat4x4f',
          bufferFormat: 'float32x4', // not used
          size: 16,
        }
      case 'SCALAR':
      default: // treat default as f32
        return {
          type: 'f32',
          bufferFormat: 'float32',
          size: 1,
        }
    }
  }

  /**
   * Get the corresponding typed array constructor based on the {@link GLTF.AccessorComponentType | accessor component type}.
   * @param componentType - {@link GLTF.AccessorComponentType | accessor component type} to use.
   * @returns - corresponding typed array constructor.
   */
  static getTypedArrayConstructorFromComponentType(componentType: GLTF.AccessorComponentType): TypedArrayConstructor {
    switch (componentType) {
      case GL.BYTE: // GL.BYTE
        return Int8Array
      case GL.UNSIGNED_BYTE: // GL.UNSIGNED_BYTE
        return Uint8Array
      case GL.SHORT: // GL.SHORT
        return Int16Array
      case GL.UNSIGNED_SHORT: // GL.UNSIGNED_SHORT
        return Uint16Array
      case GL.UNSIGNED_INT: // GL.UNSIGNED_INT
        return Uint32Array
      case GL.FLOAT: // GL.FLOAT
      default:
        return Float32Array
    }
  }

  /**
   * Get the {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
   * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
   * @returns - corresponding {@link GPUDevice.createRenderPipeline().topology | GPUPrimitiveTopology}.
   */
  static gpuPrimitiveTopologyForMode(mode: GLTF.MeshPrimitiveMode): GPUPrimitiveTopology {
    switch (mode) {
      case GL.TRIANGLES: // GL.TRIANGLES
        return 'triangle-list'
      case GL.TRIANGLE_STRIP: // GL.TRIANGLE_STRIP
        return 'triangle-strip'
      case GL.LINES: // GL.LINES
        return 'line-list'
      case GL.LINE_STRIP: // GL.LINE_STRIP
        return 'line-strip'
      case GL.POINTS: // GL.POINTS
        return 'point-list'
    }
  }

  /**
   * Get the {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
   * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
   * @returns - corresponding {@link GPUDevice.createSampler().descriptor.addressModeU | GPUAddressMode}.
   */
  static gpuAddressModeForWrap(wrap: GLTF.TextureWrapMode): GPUAddressMode {
    switch (wrap) {
      case GL.CLAMP_TO_EDGE:
        return 'clamp-to-edge'
      case GL.MIRRORED_REPEAT:
        return 'mirror-repeat'
      default:
        return 'repeat'
    }
  }

  /**
   * Create the {@link scenesManager} {@link TargetsAnimationsManager} if any animation is present in the {@link gltf}.
   */
  createAnimations() {
    this.gltf.animations?.forEach((animation, index) => {
      this.scenesManager.animations.push(
        new TargetsAnimationsManager(this.renderer, {
          label: animation.name ?? 'Animation ' + index,
        })
      )
    })
  }

  /**
   * Create the {@link ScenesManager.lights | lights} defined by the `KHR_lights_punctual` extension if any.
   */
  createLights() {
    if (this.gltf.extensions && this.gltf.extensions['KHR_lights_punctual']) {
      let lightIndex = 0
      for (const light of this.gltf.extensions['KHR_lights_punctual'].lights) {
        lightIndex++

        if (light.type === 'spot') {
          throwWarning('GLTFScenesManager: Spot lights are not supported yet.')
          continue
        } else if (light.type === 'directional') {
          this.scenesManager.lights[lightIndex - 1] = new DirectionalLight(this.renderer, {
            color: light.color !== undefined ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
            intensity: light.intensity !== undefined ? light.intensity : 1,
          })
        } else if (light.type === 'point') {
          this.scenesManager.lights[lightIndex - 1] = new PointLight(this.renderer, {
            color: light.color !== undefined ? new Vec3(light.color[0], light.color[1], light.color[2]) : new Vec3(1),
            intensity: light.intensity !== undefined ? light.intensity : 1,
            range: light.range !== undefined ? light.range : 0,
          })
        }
      }
    }
  }

  /**
   * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
   */
  createSamplers() {
    if (this.gltf.samplers) {
      for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
        const descriptor = {
          label: 'glTF sampler ' + index,
          name: 'gltfSampler' + index, // TODO better name?
          addressModeU: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
          addressModeV: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT),
        } as SamplerParams

        // WebGPU's default min/mag/mipmap filtering is nearest, se we only have to override it if we
        // want linear filtering for some aspect.
        if (!sampler.magFilter || sampler.magFilter === GL.LINEAR) {
          descriptor.magFilter = 'linear'
        }

        switch (sampler.minFilter) {
          case GL.NEAREST:
            break
          case GL.LINEAR:
          case GL.LINEAR_MIPMAP_NEAREST:
            descriptor.minFilter = 'linear'
            break
          case GL.NEAREST_MIPMAP_LINEAR:
            descriptor.mipmapFilter = 'linear'
            break
          case GL.LINEAR_MIPMAP_LINEAR:
          default:
            descriptor.minFilter = 'linear'
            descriptor.mipmapFilter = 'linear'
            break
        }

        this.scenesManager.samplers.push(new Sampler(this.renderer, descriptor))
      }
    } else {
      // create a default sampler
      this.scenesManager.samplers.push(
        new Sampler(this.renderer, {
          label: 'Default sampler',
          name: 'defaultSampler',
          magFilter: 'linear',
          minFilter: 'linear',
          mipmapFilter: 'linear',
        })
      )
    }
  }

  /**
   * Create a {@link Texture} based on the options.
   * @param material - material using that texture.
   * @param image - image source of the texture.
   * @param name - name of the texture.
   * @returns - newly created {@link Texture}.
   */
  createTexture(material: GLTF.IMaterial, image: ImageBitmap, name: string): Texture {
    // TODO check for all textures!
    const format = (() => {
      switch (name) {
        case 'baseColorTexture':
        case 'emissiveTexture':
        case 'specularTexture':
        case 'specularColorTexture':
          return 'rgba8unorm-srgb'
        case 'occlusionTexture':
        case 'transmissionTexture':
          return 'r8unorm'
        case 'thicknessTexture':
          return 'rg8unorm'
        default:
          return 'rgba8unorm'
      }
    })()

    const texture = new Texture(this.renderer, {
      label: material.name ? material.name + ': ' + name : name,
      name,
      format,
      visibility: ['fragment'],
      generateMips: true, // generate mips by default
      fixedSize: {
        width: image.width,
        height: image.height,
      },
    })

    texture.uploadSource({
      source: image,
    })

    return texture
  }

  /**
   * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTexture | MaterialTexture} and their respective {@link Texture}.
   */
  createMaterialTextures() {
    this.scenesManager.materialsTextures = []

    if (this.gltf.materials) {
      for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
        // TODO handle custom/additional UV attributes
        const materialTextures = {
          material: materialIndex,
          texturesDescriptors: [],
        }

        const getUVAttributeName = (texture) => {
          if (!texture.texCoord) return 'uv'

          return texture.texCoord !== 0 ? 'uv' + texture.texCoord : 'uv'
        }

        const createTexture = (gltfTexture: GLTF.ITextureInfo, name) => {
          const index = gltfTexture.index
          const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, name)
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.texturesDescriptors.push({
            texture,
            sampler: this.scenesManager.samplers[samplerIndex ?? 0],
            texCoordAttributeName: getUVAttributeName(gltfTexture),
          })
        }

        this.scenesManager.materialsTextures[materialIndex] = materialTextures

        if (material.pbrMetallicRoughness) {
          if (
            material.pbrMetallicRoughness.baseColorTexture &&
            material.pbrMetallicRoughness.baseColorTexture.index !== undefined
          ) {
            createTexture(material.pbrMetallicRoughness.baseColorTexture, 'baseColorTexture')
          }

          if (
            material.pbrMetallicRoughness.metallicRoughnessTexture &&
            material.pbrMetallicRoughness.metallicRoughnessTexture.index !== undefined
          ) {
            createTexture(material.pbrMetallicRoughness.metallicRoughnessTexture, 'metallicRoughnessTexture')
          }
        }

        if (material.normalTexture && material.normalTexture.index !== undefined) {
          // TODO normal map scale
          createTexture(material.normalTexture, 'normalTexture')
        }

        if (material.occlusionTexture && material.occlusionTexture.index !== undefined) {
          // TODO occlusion map strength
          createTexture(material.occlusionTexture, 'occlusionTexture')
        }

        if (material.emissiveTexture && material.emissiveTexture.index !== undefined) {
          createTexture(material.emissiveTexture, 'emissiveTexture')
        }

        // extensions textures
        const { extensions } = material
        const transmission = (extensions && extensions.KHR_materials_transmission) || null
        const specular = (extensions && extensions.KHR_materials_specular) || null
        const volume = (extensions && extensions.KHR_materials_volume) || null

        if (transmission && transmission.transmissionTexture && transmission.transmissionTexture.index !== undefined) {
          createTexture(transmission.transmissionTexture, 'transmissionTexture')
        }

        if (specular && (specular.specularTexture || specular.specularColorTexture)) {
          const { specularTexture, specularColorTexture } = specular
          if (specularTexture && specularColorTexture) {
            if (
              specularTexture.index !== undefined &&
              specularColorTexture.index !== undefined &&
              specularTexture.index === specularColorTexture.index
            ) {
              createTexture(specular.specularTexture, 'specularTexture')
            } else {
              if (specularTexture && specularTexture.index !== undefined) {
                createTexture(specular.specularTexture, 'specularFactorTexture')
              }

              if (specularColorTexture && specularColorTexture.index !== undefined) {
                createTexture(specular.specularColorTexture, 'specularColorTexture')
              }
            }
          }
        }

        if (volume && volume.thicknessTexture && volume.thicknessTexture.index !== undefined) {
          createTexture(volume.thicknessTexture, 'thicknessTexture')
        }
      }
    }
  }

  /**
   * Get the {@link MeshDescriptorMaterialParams} for a given {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
   * @param materialIndex - {@link GLTF.IMeshPrimitive.material | glTF primitive material index}.
   * @param label - Optional label to use for the {@link RenderMaterial} created.
   * @returns - Created {@link MeshDescriptorMaterialParams}.
   */
  getMaterialBaseParameters(
    materialIndex: GLTF.IMeshPrimitive['material'],
    label: string = null
  ): MeshDescriptorMaterialParams {
    const materialParams: MeshDescriptorMaterialParams = {
      uniforms: {},
    }

    const material = (this.gltf.materials && this.gltf.materials[materialIndex]) || {}

    if (label) {
      materialParams.label = label + (material.name ? ' ' + material.name : '')
    } else if (material.name) {
      materialParams.label = material.name
    }

    // extensions
    const { extensions } = material

    const dispersion = (extensions && extensions.KHR_materials_dispersion) || null
    const emissiveStrength = (extensions && extensions.KHR_materials_emissive_strength) || null
    const ior = (extensions && extensions.KHR_materials_ior) || null
    const transmission = (extensions && extensions.KHR_materials_transmission) || null
    const specular = (extensions && extensions.KHR_materials_specular) || null
    const volume = (extensions && extensions.KHR_materials_volume) || null

    // uniforms
    const materialUniformStruct = {
      color: {
        type: 'vec3f',
        value:
          material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== undefined
            ? new Vec3(
                material.pbrMetallicRoughness.baseColorFactor[0],
                material.pbrMetallicRoughness.baseColorFactor[1],
                material.pbrMetallicRoughness.baseColorFactor[2]
              )
            : new Vec3(1),
      },
      opacity: {
        type: 'f32',
        value:
          material.pbrMetallicRoughness && material.pbrMetallicRoughness.baseColorFactor !== undefined
            ? material.pbrMetallicRoughness.baseColorFactor[3]
            : 1,
      },
      alphaCutoff: {
        type: 'f32',
        value: material.alphaCutoff !== undefined ? material.alphaCutoff : material.alphaMode === 'MASK' ? 0.5 : 0,
      },
      metallic: {
        type: 'f32',
        value:
          material.pbrMetallicRoughness?.metallicFactor === undefined
            ? 1
            : material.pbrMetallicRoughness.metallicFactor,
      },
      roughness: {
        type: 'f32',
        value:
          material.pbrMetallicRoughness?.roughnessFactor === undefined
            ? 1
            : material.pbrMetallicRoughness.roughnessFactor,
      },
      normalScale: {
        type: 'vec2f',
        value: material.normalTexture?.scale === undefined ? new Vec2(1) : new Vec2(material.normalTexture.scale),
      },
      occlusionIntensity: {
        type: 'f32',
        value: material.occlusionTexture?.strength === undefined ? 1 : material.occlusionTexture.strength,
      },
      emissiveIntensity: {
        type: 'f32',
        value:
          emissiveStrength && emissiveStrength.emissiveStrength !== undefined ? emissiveStrength.emissiveStrength : 1,
      },
      emissiveColor: {
        type: 'vec3f',
        value:
          material.emissiveFactor !== undefined
            ? new Vec3(material.emissiveFactor[0], material.emissiveFactor[1], material.emissiveFactor[2])
            : new Vec3(0),
      },
      specularIntensity: {
        type: 'f32',
        value: specular && specular.specularFactor !== undefined ? specular.specularFactor : 1,
      },
      specularColor: {
        type: 'vec3f',
        value:
          specular && specular.specularColorFactor !== undefined
            ? new Vec3(
                specular.specularColorFactor[0],
                specular.specularColorFactor[1],
                specular.specularColorFactor[2]
              )
            : new Vec3(1),
      },
      transmission: {
        type: 'f32',
        value: transmission && transmission.transmissionFactor !== undefined ? transmission.transmissionFactor : 0,
      },
      ior: {
        type: 'f32',
        value: ior && ior.ior !== undefined ? ior.ior : 1.5,
      },
      dispersion: {
        type: 'f32',
        value: dispersion && dispersion.dispersion !== undefined ? dispersion.dispersion : 0,
      },
      thickness: {
        type: 'f32',
        value: volume && volume.thicknessFactor !== undefined ? volume.thicknessFactor : 0,
      },
      attenuationDistance: {
        type: 'f32',
        value: volume && volume.attenuationDistance !== undefined ? volume.attenuationDistance : Infinity,
      },
      attenuationColor: {
        type: 'vec3f',
        value:
          volume && volume.attenuationColor !== undefined
            ? new Vec3(volume.attenuationColor[0], volume.attenuationColor[1], volume.attenuationColor[2])
            : new Vec3(1),
      },
    }

    materialParams.uniforms.material = {
      visibility: ['fragment'],
      struct: materialUniformStruct,
    }

    materialParams.cullMode = material.doubleSided ? 'none' : 'back'

    // transparency
    if (material.alphaMode === 'BLEND') {
      materialParams.transparent = true
      materialParams.targets = [
        {
          blend: {
            color: {
              srcFactor: 'src-alpha',
              dstFactor: 'one-minus-src-alpha',
            },
            alpha: {
              // This just prevents the canvas from having alpha "holes" in it.
              srcFactor: 'one',
              dstFactor: 'one',
            },
          },
        },
      ]
    }

    return materialParams
  }

  /**
   * Create all the {@link MeshDescriptorMaterialParams} from the {@link GLTF.IMaterial | glTF materials}.
   */
  createMaterialsParams() {
    this.gltf.materials?.forEach((material, index) => {
      this.scenesManager.materialsParams.push(this.getMaterialBaseParameters(index))
    })
  }

  /**
   * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | glTF Node}
   * @param parent - parent {@link ChildDescriptor} to use.
   * @param node - {@link GLTF.INode | glTF Node} to use.
   * @param index - Index of the {@link GLTF.INode | glTF Node} to use.
   */
  createNode(parent: ChildDescriptor, node: GLTF.INode, index: number) {
    const child: ChildDescriptor = {
      index,
      name: node.name,
      node: new Object3D(),
      children: [],
    }

    this.scenesManager.nodes.set(index, child.node)

    parent.children.push(child)

    child.node.parent = parent.node

    if (node.matrix) {
      child.node.modelMatrix.setFromArray(new Float32Array(node.matrix))
      // avoid overriding the matrix with empty position/scale/rotation
      child.node.matrices.model.shouldUpdate = false
    } else {
      if (node.translation) child.node.position.set(node.translation[0], node.translation[1], node.translation[2])
      if (node.scale) child.node.scale.set(node.scale[0], node.scale[1], node.scale[2])
      if (node.rotation) child.node.quaternion.setFromArray(new Float32Array(node.rotation))
    }

    if (node.children) {
      node.children.forEach((childNodeIndex) => {
        const childNode = this.gltf.nodes[childNodeIndex]
        this.createNode(child, childNode, childNodeIndex)
      })
    }

    let instancesDescriptor = null

    if (node.mesh !== undefined) {
      // EXT_mesh_gpu_instancing
      let instanceAttributes = null
      if (node.extensions && node.extensions.EXT_mesh_gpu_instancing) {
        const { attributes } = node.extensions.EXT_mesh_gpu_instancing

        instanceAttributes = {
          count: 0,
          nodesTransformations: {},
        }

        for (const attribute of Object.entries(attributes)) {
          const accessor = this.gltf.accessors[attribute[1]]
          const bufferView = this.gltf.bufferViews[accessor.bufferView]

          const accessorConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(
            accessor.componentType
          )
          const attributeSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

          const attributeValues = new accessorConstructor(
            this.gltf.arrayBuffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * attributeSize
          )

          instanceAttributes.count = accessor.count

          instanceAttributes.nodesTransformations[attribute[0].toLowerCase()] = attributeValues
        }
      }

      const mesh = this.gltf.meshes[node.mesh]

      // each primitive is in fact a mesh
      mesh.primitives.forEach((primitive, primitiveIndex) => {
        const meshDescriptor: MeshDescriptor = {
          parent: child.node,
          texturesDescriptors: [],
          variantName: 'Default',
          parameters: {
            //uniforms: {},
            label: mesh.name ? mesh.name + ' ' + primitiveIndex : 'glTF mesh ' + primitiveIndex,
          },
          nodes: [],
          extensionsUsed: [],
          alternateDescriptors: new Map(),
          alternateMaterials: new Map(),
        }

        instancesDescriptor = this.#primitiveInstances.get(primitive)
        if (!instancesDescriptor) {
          instancesDescriptor = {
            instances: [], // instances
            nodes: [], // node transform
            meshDescriptor,
          }

          this.#primitiveInstances.set(primitive, instancesDescriptor)
        }

        instancesDescriptor.instances.push(node)
        instancesDescriptor.nodes.push(child.node)

        // add eventual instances from extension
        if (instanceAttributes && instanceAttributes.count) {
          for (let i = 0; i < instanceAttributes.count; i++) {
            const instanceNode = new Object3D()
            if (instanceAttributes.nodesTransformations) {
              const { translation, scale, rotation } = instanceAttributes.nodesTransformations
              if (translation) {
                instanceNode.position.set(translation[i * 3], translation[i * 3 + 1], translation[i * 3 + 2])
              }
              if (scale) {
                instanceNode.scale.set(scale[i * 3], scale[i * 3 + 1], scale[i * 3 + 2])
              }
              if (rotation) {
                instanceNode.quaternion.setFromArray(
                  Float32Array.from([rotation[i * 4], rotation[i * 4 + 1], rotation[i * 4 + 2], rotation[i * 4 + 3]])
                )
              }
            }

            instanceNode.parent = child.node

            instancesDescriptor.instances.push(node)
            instancesDescriptor.nodes.push(instanceNode)
          }
        }
      })
    }

    // lights
    if (node.extensions && node.extensions.KHR_lights_punctual) {
      const light = this.scenesManager.lights[node.extensions.KHR_lights_punctual.light]
      if (light.type === 'directionalLights') {
        light.position.set(0, 0, 1e9)
      }

      light.parent = child.node
    }

    if (node.camera !== undefined) {
      const gltfCamera = this.gltf.cameras[node.camera]

      if (gltfCamera.type === 'perspective') {
        const minSize = Math.min(this.renderer.boundingRect.width, this.renderer.boundingRect.height)
        const width = minSize / gltfCamera.perspective.aspectRatio
        const height = minSize * gltfCamera.perspective.aspectRatio
        const fov = (gltfCamera.perspective.yfov * 180) / Math.PI

        const camera = new Camera({
          fov,
          near: gltfCamera.perspective.znear,
          far: gltfCamera.perspective.zfar,
          width,
          height,
          pixelRatio: this.renderer.pixelRatio,
        })

        camera.parent = child.node

        this.scenesManager.cameras.push(camera)
      } else if (gltfCamera.type === 'orthographic') {
        // TODO orthographic not supported for now
        // since they're not implemented (yet?)
        throwWarning('GLTFScenesManager: Orthographic cameras are not supported yet.')
      }
    }

    if (this.gltf.animations) {
      this.scenesManager.animations.forEach((targetsAnimation, i) => {
        const animation = this.gltf.animations[i]

        const channels = animation.channels.filter((channel) => channel.target.node === index)

        if (channels && channels.length) {
          targetsAnimation.addTarget(child.node)

          channels.forEach((channel) => {
            const sampler = animation.samplers[channel.sampler]
            const path = channel.target.path

            const inputAccessor = this.gltf.accessors[sampler.input]
            const inputBufferView = this.gltf.bufferViews[inputAccessor.bufferView]

            const inputTypedArrayConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(
              inputAccessor.componentType
            )

            const outputAccessor = this.gltf.accessors[sampler.output]
            const outputBufferView = this.gltf.bufferViews[outputAccessor.bufferView]
            const outputTypedArrayConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(
              outputAccessor.componentType
            )

            const keyframes = new inputTypedArrayConstructor(
              this.gltf.arrayBuffers[inputBufferView.buffer],
              inputAccessor.byteOffset + inputBufferView.byteOffset,
              inputAccessor.count * GLTFScenesManager.getVertexAttributeParamsFromType(inputAccessor.type).size
            )

            const values = new outputTypedArrayConstructor(
              this.gltf.arrayBuffers[outputBufferView.buffer],
              outputAccessor.byteOffset + outputBufferView.byteOffset,
              outputAccessor.count * GLTFScenesManager.getVertexAttributeParamsFromType(outputAccessor.type).size
            )

            const animName = node.name ? `${node.name} animation` : `${channel.target.path} animation ${index}`

            const keyframesAnimation = new KeyframesAnimation({
              label: animation.name ? `${animation.name} ${animName}` : `Animation ${i} ${animName}`,
              inputIndex: sampler.input,
              keyframes,
              values,
              path,
              interpolation: sampler.interpolation,
            })

            targetsAnimation.addTargetAnimation(child.node, keyframesAnimation)
          })
        }
      })
    }
  }

  /**
   * Get an accessor sparse indices values to use for replacement if any.
   * @param accessor - {@link GLTF.IAccessor | Accessor} to check for sparse indices.
   * @returns parameters - indices and values found as {@link TypedArray} if any.
   * @private
   */
  #getSparseAccessorIndicesAndValues(
    accessor: GLTF.IAccessor
  ): { indices: TypedArray | null; values: TypedArray | null } | null {
    if (!accessor.sparse) return { indices: null, values: null }

    const accessorConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType)
    const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

    const sparseIndicesConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(
      accessor.sparse.indices.componentType
    )
    const sparseIndicesBufferView = this.gltf.bufferViews[accessor.sparse.indices.bufferView]
    const sparseIndices = new sparseIndicesConstructor(
      this.gltf.arrayBuffers[sparseIndicesBufferView.buffer],
      accessor.byteOffset + sparseIndicesBufferView.byteOffset,
      accessor.sparse.count
    )

    const sparseValuesBufferView = this.gltf.bufferViews[accessor.sparse.values.bufferView]
    const sparseValues = new accessorConstructor(
      this.gltf.arrayBuffers[sparseValuesBufferView.buffer],
      accessor.byteOffset + sparseValuesBufferView.byteOffset,
      accessor.sparse.count * attrSize
    )

    return {
      indices: sparseIndices,
      values: sparseValues,
    }
  }

  /**
   * Get a clean attribute name based on a glTF attribute name.
   * @param gltfAttributeName - glTF attribute name.
   * @returns - Attribute name conform to our expectations.
   */
  static getCleanAttributeName(gltfAttributeName: string): string {
    return gltfAttributeName === 'TEXCOORD_0'
      ? 'uv'
      : gltfAttributeName.replace('_', '').replace('TEXCOORD', 'uv').toLowerCase()
  }

  /**
   * Sort an array of {@link VertexBufferAttributeParams} by an array of attribute names.
   * @param attributesNames - array of attribute names to use for sorting.
   * @param attributes - {@link VertexBufferAttributeParams} array to sort.
   */
  sortAttributesByNames(attributesNames: string[], attributes: VertexBufferAttributeParams[]) {
    attributes.sort((a, b) => {
      let aIndex = attributesNames.findIndex((attrName) => attrName === a.name)
      aIndex = aIndex === -1 ? Infinity : aIndex

      let bIndex = attributesNames.findIndex((attrName) => attrName === b.name)
      bIndex = bIndex === -1 ? Infinity : bIndex

      return aIndex - bIndex
    })
  }

  /**
   * Parse a {@link GLTF.IMeshPrimitive | glTF primitive} and create typed arrays from the given {@link gltf} accessors, bufferViews and buffers.
   * @param primitiveProperty- Primitive property to parse, can either be `attributes` or `targets`.
   * @param attributes - An empty {@link VertexBufferAttributeParams} array to fill with parsed values.
   * @returns - Interleaved attributes {@link TypedArray} if any.
   * @private
   */
  #parsePrimitiveProperty(
    primitiveProperty: GLTF.IMeshPrimitive['attributes'] | GLTF.IMeshPrimitive['targets'],
    attributes: VertexBufferAttributeParams[]
  ): TypedArray | null {
    // check whether the buffer view is already interleaved
    let interleavedArray = null
    let interleavedBufferView = null
    let maxByteOffset = 0

    // prepare default attributes
    // first sort them by accessor indices
    const primitiveAttributes = Object.entries(primitiveProperty)
    primitiveAttributes.sort((a, b) => a[1] - b[1])
    const primitiveAttributesValues = Object.values(primitiveProperty)
    primitiveAttributesValues.sort((a, b) => a - b)

    for (const [attribName, accessorIndex] of primitiveAttributes) {
      // clean attributes names
      const name = GLTFScenesManager.getCleanAttributeName(attribName)

      const accessor = this.gltf.accessors[accessorIndex as number]

      const constructor = accessor.componentType
        ? GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType)
        : Float32Array

      const bufferView = this.gltf.bufferViews[accessor.bufferView]

      const byteStride = bufferView.byteStride
      const accessorByteOffset = accessor.byteOffset

      const isInterleaved =
        byteStride !== undefined && accessorByteOffset !== undefined && accessorByteOffset < byteStride

      if (isInterleaved) {
        maxByteOffset = Math.max(accessorByteOffset, maxByteOffset)
      } else {
        maxByteOffset = 0
      }

      if (name === 'position') {
        // this feels quite conservative
        // what about targets for example?
        interleavedBufferView = bufferView
      }

      const attributeParams = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type)
      const { size } = attributeParams

      // will hold our attribute data
      let array

      if (maxByteOffset > 0) {
        const parentArray = new constructor(
          this.gltf.arrayBuffers[bufferView.buffer],
          0,
          bufferView.byteLength / constructor.BYTES_PER_ELEMENT
        )

        array = new constructor(accessor.count * size)

        const arrayStride = accessorByteOffset / constructor.BYTES_PER_ELEMENT
        for (let i = 0; i < accessor.count; i++) {
          for (let j = 0; j < size; j++) {
            array[i * size + j] = parentArray[arrayStride + size * i + size * i + j]
          }
        }
      } else {
        if (bufferView.byteStride && bufferView.byteStride > constructor.BYTES_PER_ELEMENT * size) {
          // buffer view stride is bigger than the actual stride
          // we have to rebuild the array accounting for stride
          const dataView = new DataView(
            this.gltf.arrayBuffers[bufferView.buffer],
            bufferView.byteOffset + accessor.byteOffset
          )

          // Reading the data with stride handling
          array = new constructor(accessor.count * size)
          for (let i = 0; i < accessor.count; i++) {
            const baseOffset = i * bufferView.byteStride
            for (let j = 0; j < size; j++) {
              array[i * size + j] = dataView.getUint16(baseOffset + j * constructor.BYTES_PER_ELEMENT, true) // true for little-endian
            }
          }
        } else {
          array = new constructor(
            this.gltf.arrayBuffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * size
          )
        }
      }

      // sparse accessor?
      // patch the array with sparse values
      if (accessor.sparse) {
        const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor)

        for (let i = 0; i < indices.length; i++) {
          for (let j = 0; j < size; j++) {
            array[indices[i] * size + j] = values[i * size + j]
          }
        }
      }

      if (name.includes('weights')) {
        // normalize weights
        for (let i = 0; i < accessor.count * size; i += size) {
          const x = array[i]
          const y = array[i + 1]
          const z = array[i + 2]
          const w = array[i + 3]

          let len = Math.abs(x) + Math.abs(y) + Math.abs(z) + Math.abs(w)
          if (len > 0) {
            len = 1 / Math.sqrt(len)
          } else {
            len = 1
          }

          array[i] *= len
          array[i + 1] *= len
          array[i + 2] *= len
          array[i + 3] *= len
        }
      }

      const attribute = {
        name,
        ...attributeParams,
        array,
      }

      attributes.push(attribute)
    }

    if (maxByteOffset > 0) {
      // check they are all really interleaved
      const accessorsBufferViews = primitiveAttributesValues.map(
        (accessorIndex) => this.gltf.accessors[accessorIndex as number].bufferView
      )

      if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
        // we're not that lucky since we have interleaved values coming from different positions of our main buffer
        // we'll have to rebuild an interleaved array ourselves
        // see https://github.com/toji/sponza-optimized/issues/1
        let totalStride = 0
        const mainBufferStrides = {}
        const arrayLength = primitiveAttributesValues.reduce((acc: number, accessorIndex: number): number => {
          const accessor = this.gltf.accessors[accessorIndex]

          const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

          if (!mainBufferStrides[accessor.bufferView]) {
            mainBufferStrides[accessor.bufferView] = 0
          }

          mainBufferStrides[accessor.bufferView] = Math.max(
            mainBufferStrides[accessor.bufferView],
            accessor.byteOffset + attrSize * Float32Array.BYTES_PER_ELEMENT
          )

          totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT

          return acc + accessor.count * attrSize
        }, 0) as number

        interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4)

        primitiveAttributesValues.forEach((accessorIndex: number) => {
          const accessor = this.gltf.accessors[accessorIndex]
          const bufferView = this.gltf.bufferViews[accessor.bufferView]

          const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

          // get eventual sparse
          const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor)

          for (let i = 0; i < accessor.count; i++) {
            const startOffset =
              accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT + (i * totalStride) / Float32Array.BYTES_PER_ELEMENT

            const subarray = new Float32Array(
              this.gltf.arrayBuffers[bufferView.buffer],
              bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
              attrSize
            )

            // patch with sparse values if needed
            if (indices && values && indices.includes(i)) {
              for (let j = 0; i < attrSize; j++) {
                subarray[j] = values[i * attrSize + j]
              }
            }

            interleavedArray.subarray(startOffset, startOffset + attrSize).set(subarray)
          }
        })

        // we need to reorder the attributes
        const cleanAttributeNames = Object.entries(primitiveProperty).map((prop) =>
          GLTFScenesManager.getCleanAttributeName(prop[0])
        )

        this.sortAttributesByNames(cleanAttributeNames, attributes)
      } else {
        // we're lucky to have an interleaved array!
        // we won't have to compute our geometry!
        interleavedArray = new Float32Array(
          this.gltf.arrayBuffers[interleavedBufferView.buffer],
          interleavedBufferView.byteOffset,
          (Math.ceil(interleavedBufferView.byteLength / 4) * 4) / Float32Array.BYTES_PER_ELEMENT
        )

        // check for sparse!
        let stride = 0
        primitiveAttributesValues.forEach((accessorIndex: number) => {
          const accessor = this.gltf.accessors[accessorIndex]
          const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

          // get eventual sparse
          const { indices, values } = this.#getSparseAccessorIndicesAndValues(accessor)

          if (indices && values) {
            // patch interleaved array with sparse values
            for (let i = 0; i < indices.length; i++) {
              for (let j = 0; j < attrSize; j++) {
                const arrayStride = stride + attrSize * i
                interleavedArray[arrayStride + indices[i] * attrSize + j] = values[i * attrSize + j]
              }
            }
          }

          stride += attrSize
        })

        // now we're lucky enough to have an interleaved array
        // but we must ensure our attributes are passed to the geometry in the right order
        // which corresponds to the attributes accessors byte offset order
        const primitivePropertiesSortedByByteOffset = Object.entries(primitiveProperty).sort((a, b) => {
          const accessorAByteOffset = this.gltf.accessors[a[1]].byteOffset
          const accessorBByteOffset = this.gltf.accessors[b[1]].byteOffset
          return accessorAByteOffset - accessorBByteOffset
        })

        const accessorNameOrder = primitivePropertiesSortedByByteOffset.map((property) =>
          GLTFScenesManager.getCleanAttributeName(property[0])
        )

        this.sortAttributesByNames(accessorNameOrder, attributes)
      }
    }

    return interleavedArray
  }

  /**
   * Create the mesh {@link Geometry} based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
   * @param primitive - {@link gltf} primitive to use to create the {@link Geometry}.
   * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the {@link Geometry}.
   */
  createGeometry(primitive: GLTF.IMeshPrimitive, primitiveInstance: PrimitiveInstanceDescriptor) {
    const { instances, meshDescriptor } = primitiveInstance

    // set geometry bounding box
    const geometryBBox = new Box3()

    for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
      if (attribName === 'POSITION') {
        const accessor = this.gltf.accessors[accessorIndex as number]

        // custom bbox
        // glTF specs says: "vertex position attribute accessors MUST have accessor.min and accessor.max defined"
        if (geometryBBox) {
          geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]))
          geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]))
        }
      }
    }

    // TODO should we pass an already created buffer to the geometry main vertex and index buffers if possible?
    // and use bufferOffset and bufferSize parameters
    // if the accessors byteOffset is large enough,
    // it means we have an array that is not interleaved (with each vertexBuffer attributes bufferOffset = 0)
    // but we can deal with the actual offset in the geometry setVertexBuffer call!
    // see https://toji.dev/webgpu-gltf-case-study/#handling-large-attribute-offsets

    let defaultAttributes = []

    let interleavedArray = this.#parsePrimitiveProperty(primitive.attributes, defaultAttributes)

    // indices
    const isIndexedGeometry = 'indices' in primitive
    let indicesArray = null
    let indicesConstructor = null

    if (isIndexedGeometry) {
      const accessor = this.gltf.accessors[primitive.indices]
      const bufferView = this.gltf.bufferViews[accessor.bufferView]

      indicesConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) as
        | Uint32ArrayConstructor
        | Uint16ArrayConstructor

      const bytesPerElement =
        indicesConstructor.name === 'Uint8Array' ? Uint16Array.BYTES_PER_ELEMENT : indicesConstructor.BYTES_PER_ELEMENT

      const arrayOffset = accessor.byteOffset + bufferView.byteOffset
      const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer]
      const arrayLength = Math.ceil(accessor.count / bytesPerElement) * bytesPerElement

      // do not allow Uint8Array arrays
      indicesArray =
        indicesConstructor.name === 'Uint8Array'
          ? Uint16Array.from(new indicesConstructor(arrayBuffer, arrayOffset, arrayLength))
          : new indicesConstructor(arrayBuffer, arrayOffset, arrayLength)
    }

    const hasNormal = defaultAttributes.find((attribute) => attribute.name === 'normal')

    if (!hasNormal) {
      // specs say "When normals are not specified, client implementations MUST calculate flat normals and the provided tangents (if present) MUST be ignored."

      // remove existing tangent if any
      defaultAttributes = defaultAttributes.filter((attr) => attr.name !== 'tangent')

      // if we had an interleavedArray then we'd have to rebuilt it with normals
      // the Geometry is going to do that for us, while also computing flat normals
      interleavedArray = null
    }

    if (!interleavedArray) {
      // not interleaved?
      // let's try to reorder the attributes so we might benefit from pipeline cache
      this.sortAttributesByNames(['position', 'uv', 'normal'], defaultAttributes)
    }

    const geometryAttributes: GeometryParams = {
      instancesCount: instances.length,
      topology: GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode),
      vertexBuffers: [
        {
          name: 'attributes',
          stepMode: 'vertex', // explicitly set the stepMode even if not mandatory
          attributes: defaultAttributes,
          ...(interleavedArray && { array: interleavedArray }), // interleaved array!
        },
      ],
    }

    const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry

    meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes)

    if (isIndexedGeometry && indicesConstructor && indicesArray) {
      ;(meshDescriptor.parameters.geometry as IndexedGeometry).setIndexBuffer({
        bufferFormat: indicesConstructor.name === 'Uint32Array' ? 'uint32' : 'uint16',
        array: indicesArray,
      })
    }

    if (!hasNormal) {
      // compute geometry right away
      // so we have fresh attributes to send to the shaders' generation helper functions
      meshDescriptor.parameters.geometry.computeGeometry()
    }

    meshDescriptor.parameters.geometry.boundingBox = geometryBBox
  }

  /**
   * Create the {@link SkinDefinition | skins definitions} for each {@link gltf} skins.
   */
  createSkins() {
    if (this.gltf.skins) {
      this.gltf.skins.forEach((skin, skinIndex) => {
        const skinnedMeshNode = this.gltf.nodes.find(
          (node) => node.skin !== undefined && node.mesh !== undefined && node.skin === skinIndex
        )

        const meshIndex = skinnedMeshNode.mesh

        let matrices
        if (skin.inverseBindMatrices) {
          const matricesAccessor = this.gltf.accessors[skin.inverseBindMatrices]
          const matricesBufferView = this.gltf.bufferViews[matricesAccessor.bufferView]

          const matricesTypedArrayConstructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(
            matricesAccessor.componentType
          )

          matrices = new matricesTypedArrayConstructor(
            this.gltf.arrayBuffers[matricesBufferView.buffer],
            matricesAccessor.byteOffset + matricesBufferView.byteOffset,
            matricesAccessor.count * GLTFScenesManager.getVertexAttributeParamsFromType(matricesAccessor.type).size
          )
        } else {
          matrices = new Float32Array(16 * skin.joints.length)
          // fill with identity matrices
          for (let i = 0; i < skin.joints.length * 16; i += 16) {
            matrices[i] = 1
            matrices[i + 5] = 1
            matrices[i + 10] = 1
            matrices[i + 15] = 1
          }
        }

        const binding = new BufferBinding({
          label: 'Skin ' + skinIndex,
          name: 'skin' + skinIndex,
          bindingType: 'storage',
          visibility: ['vertex'],
          childrenBindings: [
            {
              binding: new BufferBinding({
                label: 'Joints ' + skinIndex,
                name: 'joints',
                bindingType: 'storage',
                visibility: ['vertex'],
                struct: {
                  jointMatrix: {
                    type: 'mat4x4f',
                    value: new Float32Array(16),
                  },
                  normalMatrix: {
                    type: 'mat4x4f',
                    value: new Float32Array(16),
                  },
                },
              }),
              count: skin.joints.length,
              forceArray: true, // needs to be always iterable
            },
          ],
        })

        // set default matrices values
        for (let i = 0; i < skin.joints.length; i++) {
          for (let j = 0; j < 16; j++) {
            binding.childrenBindings[i].inputs.jointMatrix.value[j] = matrices[i * 16 + j]
            binding.childrenBindings[i].inputs.normalMatrix.value[j] = matrices[i * 16 + j]
          }

          binding.childrenBindings[i].inputs.jointMatrix.shouldUpdate = true
          binding.childrenBindings[i].inputs.normalMatrix.shouldUpdate = true
        }

        const joints = skin.joints.map((joint) => this.scenesManager.nodes.get(joint))

        const jointMatrix = new Mat4()
        const normalMatrix = new Mat4()

        const parentNodeIndex = this.gltf.nodes.findIndex(
          (node) => node.mesh !== undefined && node.skin !== undefined && node.mesh === meshIndex
        )

        if (parentNodeIndex !== -1) {
          const parentNode = this.scenesManager.nodes.get(parentNodeIndex)

          // create parent inverse world matrix
          // and update it once before updating the joint matrices
          const parentInverseWorldMatrix = new Mat4()

          const _updateWorldMatrix = parentNode.updateWorldMatrix.bind(parentNode)

          parentNode.updateWorldMatrix = () => {
            _updateWorldMatrix()

            parentInverseWorldMatrix.copy(parentNode.worldMatrix).invert()
          }

          if (this.scenesManager.animations.length) {
            for (const animation of this.scenesManager.animations) {
              joints.forEach((object, jointIndex) => {
                // from https://github.com/KhronosGroup/glTF-Sample-Renderer/blob/63b7c128266cfd86bbd3f25caf8b3db3fe854015/source/gltf/skin.js#L88
                const updateJointMatrix = () => {
                  if (animation.isPlaying) {
                    // same as
                    // jointMatrix.multiplyMatrices(object.worldMatrix, new Mat4().setFromArray(matrices as Float32Array, jointIndex * 16))
                    // jointMatrix.multiplyMatrices(parentInverseWorldMatrix, jointMatrix)
                    jointMatrix
                      .setFromArray(matrices as Float32Array, jointIndex * 16)
                      .premultiply(object.worldMatrix)
                      .premultiply(parentInverseWorldMatrix)
                  } else {
                    // if the animation is not playing
                    // reset the joint matrices to display default model
                    jointMatrix.identity()
                  }

                  normalMatrix.copy(jointMatrix).invert().transpose()

                  for (let i = 0; i < 16; i++) {
                    binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i]
                    binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i]
                  }

                  binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true
                  binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true
                }

                // add an empty animation to our target with just an onAfterUpdate callback
                // that will update the joint matrices
                const node = this.gltf.nodes[jointIndex]
                const animName = node.name ? `${node.name} skin animation` : `skin animation ${jointIndex}`

                const emptyAnimation = new KeyframesAnimation({
                  label: animation.label ? `${animation.label} ${animName}` : `Animation ${animName}`,
                })

                emptyAnimation.onAfterUpdate = updateJointMatrix

                animation.addTargetAnimation(object, emptyAnimation)
              })
            }
          } else {
            // no animations? weird, but set the joint matrices once anyway
            joints.forEach((object, jointIndex) => {
              jointMatrix
                .setFromArray(matrices as Float32Array, jointIndex * 16)
                .premultiply(object.worldMatrix)
                .premultiply(parentInverseWorldMatrix)

              normalMatrix.copy(jointMatrix).invert().transpose()

              for (let i = 0; i < 16; i++) {
                binding.childrenBindings[jointIndex].inputs.jointMatrix.value[i] = jointMatrix.elements[i]
                binding.childrenBindings[jointIndex].inputs.normalMatrix.value[i] = normalMatrix.elements[i]
              }

              binding.childrenBindings[jointIndex].inputs.jointMatrix.shouldUpdate = true
              binding.childrenBindings[jointIndex].inputs.normalMatrix.shouldUpdate = true
            })
          }

          this.scenesManager.skins.push({
            parentNode,
            joints,
            inverseBindMatrices: matrices,
            jointMatrix,
            normalMatrix,
            parentInverseWorldMatrix,
            binding,
          } as SkinDefinition)
        }
      })
    }
  }

  /**
   * Create the mesh material parameters based on the given {@link gltf} primitive and {@link PrimitiveInstanceDescriptor}.
   * @param primitive - {@link gltf} primitive to use to create the material parameters.
   * @param primitiveInstance - {@link PrimitiveInstanceDescriptor} to use to create the material parameters.
   */
  createMaterial(primitive: GLTF.IMeshPrimitive, primitiveInstance: PrimitiveInstanceDescriptor) {
    const { instances, nodes, meshDescriptor } = primitiveInstance

    const instancesCount = instances.length

    const meshIndex = instances[0].mesh

    // morph targets
    if (primitive.targets) {
      const bindings = []

      const weights = this.gltf.meshes[meshIndex].weights

      let weightAnimation
      for (const animation of this.scenesManager.animations) {
        weightAnimation = animation.getAnimationByObject3DAndPath(meshDescriptor.parent, 'weights')

        if (weightAnimation) break
      }

      primitive.targets.forEach((target, index) => {
        const targetAttributes = []
        this.#parsePrimitiveProperty(target, targetAttributes)

        const struct = targetAttributes.reduce(
          (acc, attribute) => {
            return (acc = {
              ...acc,
              ...{
                [attribute.name]: {
                  type: `array<${attribute.type}>`,
                  value: attribute.array,
                },
              },
            })
          },
          {
            weight: {
              type: 'f32',
              value: weights && weights.length ? weights[index] : 0,
            },
          }
        )

        const targetBinding = new BufferBinding({
          label: 'Morph target ' + index,
          name: 'morphTarget' + index,
          bindingType: 'storage',
          visibility: ['vertex'],
          struct,
        })

        if (weightAnimation) {
          weightAnimation.addWeightBindingInput(targetBinding.inputs.weight)
        }

        bindings.push(targetBinding)
      })

      if (!meshDescriptor.parameters.bindings) {
        meshDescriptor.parameters.bindings = []
      }

      meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, ...bindings]
    }

    // skins
    if (this.gltf.skins) {
      this.gltf.skins.forEach((skin, skinIndex) => {
        if (!meshDescriptor.parameters.bindings) {
          meshDescriptor.parameters.bindings = []
        }

        instances.forEach((node, instanceIndex) => {
          if (node.skin !== undefined && node.skin === skinIndex) {
            const skinDef = this.scenesManager.skins[skinIndex]

            meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, skinDef.binding]

            // TODO skinned meshes bounding box?
            // real dirty way to get a better approximate bounding box
            // should use https://discourse.threejs.org/t/accurate-gltf-bounding-box/45410/4
            if (instanceIndex > 0) {
              const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone()
              const tempMat4 = new Mat4()
              skinDef.joints.forEach((object, jointIndex) => {
                tempMat4.setFromArray(skinDef.inverseBindMatrices, jointIndex * 16)

                const transformedBbox = tempBbox.applyMat4(tempMat4).applyMat4(object.worldMatrix)
                this.scenesManager.boundingBox.min.min(transformedBbox.min)
                this.scenesManager.boundingBox.max.max(transformedBbox.max)
              })
            }
          }
        })
      })
    }

    const defaultMaterialParams = this.scenesManager.materialsParams[primitive.material]

    const materialTextures = this.scenesManager.materialsTextures[primitive.material]
    meshDescriptor.texturesDescriptors = materialTextures?.texturesDescriptors || []
    meshDescriptor.parameters = { ...meshDescriptor.parameters, ...defaultMaterialParams }

    const material = (this.gltf.materials && this.gltf.materials[primitive.material]) || {}

    // extensions
    const { extensions } = material

    if (extensions) {
      for (const extension of Object.keys(extensions)) {
        if (
          extension === 'KHR_materials_unlit' &&
          this.gltf.extensionsRequired &&
          this.gltf.extensionsRequired.includes(extension)
        ) {
          meshDescriptor.extensionsUsed.push(extension as GLTFExtensionsTypes)
        } else {
          meshDescriptor.extensionsUsed.push(extension as GLTFExtensionsTypes)
        }
      }
    }

    // transmissive
    const dispersion = (extensions && extensions.KHR_materials_dispersion) || null
    const transmission = (extensions && extensions.KHR_materials_transmission) || null
    const volume = (extensions && extensions.KHR_materials_volume) || null

    // transmissive case
    const hasTransmission = transmission || volume || dispersion

    const useTransmission =
      this.gltf.extensionsUsed &&
      (this.gltf.extensionsUsed.includes('KHR_materials_transmission') ||
        this.gltf.extensionsUsed.includes('KHR_materials_volume') ||
        this.gltf.extensionsUsed.includes('KHR_materials_dispersion'))

    meshDescriptor.parameters.samplers = []
    meshDescriptor.parameters.textures = []

    if (useTransmission && hasTransmission) {
      // add transmissive property
      meshDescriptor.parameters.transmissive = true
    }

    if (useTransmission && hasTransmission) {
      this.renderer.createTransmissionTarget()

      meshDescriptor.texturesDescriptors.push({
        texture: this.renderer.transmissionTarget.texture,
        sampler: this.renderer.transmissionTarget.sampler,
      })
    }

    // instances matrices storage
    if (instancesCount > 1) {
      const instanceMatricesBinding = new BufferBinding({
        label: 'Instance matrices',
        name: 'matrices',
        visibility: ['vertex', 'fragment'],
        bindingType: 'storage',
        struct: {
          model: {
            type: 'mat4x4f',
            value: new Mat4(),
          },
          normal: {
            type: 'mat3x3f',
            value: new Mat3(),
          },
        },
      })

      const instancesBinding = new BufferBinding({
        label: 'Instances',
        name: 'instances',
        visibility: ['vertex', 'fragment'],
        bindingType: 'storage',
        childrenBindings: [
          {
            binding: instanceMatricesBinding,
            count: instancesCount,
            forceArray: true,
          },
        ],
      })

      instancesBinding.childrenBindings.forEach((binding, index) => {
        // each time the instance node world matrix is updated
        // we compute and update the corresponding matrices bindings
        const instanceNode = nodes[index]

        const updateInstanceMatrices = () => {
          ;(binding.inputs.model.value as Mat4).copy(instanceNode.worldMatrix)
          ;(binding.inputs.normal.value as Mat3).getNormalMatrix(instanceNode.worldMatrix)
          binding.inputs.model.shouldUpdate = true
          binding.inputs.normal.shouldUpdate = true
        }

        const _updateWorldMatrix = instanceNode.updateWorldMatrix.bind(instanceNode)
        instanceNode.updateWorldMatrix = () => {
          _updateWorldMatrix()
          updateInstanceMatrices()
        }

        // do right away as well
        updateInstanceMatrices()
      })

      if (!meshDescriptor.parameters.bindings) {
        meshDescriptor.parameters.bindings = []
      }

      meshDescriptor.parameters.bindings.push(instancesBinding)
    }

    // computed transformed bbox
    for (let i = 0; i < nodes.length; i++) {
      const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone()
      const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)

      this.scenesManager.boundingBox.min.min(transformedBbox.min)
      this.scenesManager.boundingBox.max.max(transformedBbox.max)
    }

    // avoid having a bounding box max component equal to 0
    this.scenesManager.boundingBox.max.max(new Vec3(0.001))

    // variants
    if (primitive.extensions) {
      if (
        primitive.extensions['KHR_materials_variants'] &&
        this.gltf.extensionsUsed &&
        this.gltf.extensionsUsed.includes('KHR_materials_variants')
      ) {
        meshDescriptor.extensionsUsed.push('KHR_materials_variants')

        this.gltf.extensions['KHR_materials_variants'].variants.forEach((variant, index) => {
          const variantMaterial = primitive.extensions['KHR_materials_variants'].mappings.find(
            (mapping) => mapping.variants && mapping.variants.includes(index)
          )

          if (variantMaterial) {
            const gltfVariantMaterial = this.gltf.materials[variantMaterial.material]
            const variantMaterialParams = this.scenesManager.materialsParams[variantMaterial.material]

            const materialTextures = this.scenesManager.materialsTextures[variantMaterial.material]
            const texturesDescriptors = materialTextures?.texturesDescriptors || []

            if (useTransmission && hasTransmission) {
              texturesDescriptors.push({
                texture: this.renderer.transmissionTarget.texture,
                sampler: this.renderer.transmissionTarget.sampler,
              })
            }

            const extensions = { gltfVariantMaterial }
            const extensionsUsed = []

            if (extensions) {
              for (const extension of Object.keys(extensions)) {
                if (
                  extension === 'KHR_materials_unlit' &&
                  this.gltf.extensionsRequired &&
                  this.gltf.extensionsRequired.includes(extension)
                ) {
                  extensionsUsed.push(extension as GLTFExtensionsTypes)
                } else {
                  extensionsUsed.push(extension as GLTFExtensionsTypes)
                }
              }
            }

            // create a new descriptor based on current meshDescriptor
            // and variant material params
            const variantDescriptor: MeshDescriptor = {
              variantName: variant.name,
              parent: meshDescriptor.parent,
              nodes: meshDescriptor.nodes,
              extensionsUsed: [...meshDescriptor.extensionsUsed, ...extensionsUsed],
              texturesDescriptors,
              parameters: {
                geometry: meshDescriptor.parameters.geometry,
                label: variant.name + ' ' + variantMaterialParams.label,
                transmissive: !!meshDescriptor.parameters.transmissive,
                bindings: meshDescriptor.parameters.bindings ?? [],
                uniforms: variantMaterialParams.uniforms,
                transparent: !!variantMaterialParams.transparent,
                cullMode: variantMaterialParams.cullMode,
                ...(variantMaterialParams.targets && { targets: variantMaterialParams.targets }),
              } as ProjectedMeshParameters,
            }

            meshDescriptor.alternateDescriptors.set(variant.name, variantDescriptor)
          }
        })
      }
    }
  }

  /**
   * Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
   */
  createScenes() {
    this.scenesManager.node.parent = this.renderer.scene

    this.gltf.scenes.forEach((childScene) => {
      const sceneDescriptor = {
        name: childScene.name,
        children: [],
        node: new Object3D(),
      }

      sceneDescriptor.node.parent = this.scenesManager.node

      this.scenesManager.scenes.push(sceneDescriptor)

      childScene.nodes.forEach((nodeIndex) => {
        const node = this.gltf.nodes[nodeIndex]
        this.createNode(sceneDescriptor, node, nodeIndex)
      })
    })

    // now that we created all our nodes, update all the matrices eagerly
    // needed to get the right bounding box
    this.scenesManager.node.updateMatrixStack()

    // create skins definitions if needed
    this.createSkins()

    for (const [primitive, primitiveInstance] of this.#primitiveInstances) {
      const { nodes, meshDescriptor } = primitiveInstance

      meshDescriptor.nodes = nodes
      this.scenesManager.meshesDescriptors.push(meshDescriptor)

      // ------------------------------------
      // GEOMETRY
      // ------------------------------------

      this.createGeometry(primitive, primitiveInstance)

      // ------------------------------------
      // MATERIAL
      // ------------------------------------

      this.createMaterial(primitive, primitiveInstance)
    }
  }

  /**
   * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
   * @param patchMeshesParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add custom shaders, uniforms or storages, change rendering options, etc.)
   * @returns - Array of created {@link Mesh}.
   */
  addMeshes(patchMeshesParameters = (meshDescriptor: MeshDescriptor) => {}): Mesh[] {
    // once again, update all the matrix stack eagerly
    // because the main node or children transformations might have changed
    this.scenesManager.node.updateMatrixStack()

    return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
      if (meshDescriptor.parameters.geometry) {
        // patch the parameters
        patchMeshesParameters(meshDescriptor)

        const mesh = new Mesh(this.renderer, {
          ...meshDescriptor.parameters,
        })

        meshDescriptor.alternateMaterials.set('Default', mesh.material)

        // variants
        meshDescriptor.alternateDescriptors.forEach((descriptor) => {
          const matricesBindings = mesh.material.getBufferBindingByName('matrices')
          descriptor.parameters.bindings = [matricesBindings, ...descriptor.parameters.bindings]

          const {
            label,
            shaders,
            uniforms,
            bindings,
            samplers,
            textures,
            targets,
            transparent,
          }: MeshDescriptorMaterialParams = descriptor.parameters

          const alternateMaterial = new RenderMaterial(this.renderer, {
            ...JSON.parse(JSON.stringify(mesh.material.options.rendering)), // use default cloned mesh rendering options
            label,
            shaders,
            uniforms,
            bindings,
            ...(samplers && { samplers }),
            ...(textures && { textures }),
            ...(targets && { targets }),
            transparent: !!transparent,
            verticesOrder: meshDescriptor.parameters.geometry.verticesOrder,
            topology: meshDescriptor.parameters.geometry.topology,
          })

          meshDescriptor.alternateMaterials.set(descriptor.variantName, alternateMaterial)
        })

        mesh.parent = meshDescriptor.parent

        this.scenesManager.meshes.push(mesh)

        return mesh
      }
    })
  }

  /**
   * Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
   */
  destroy() {
    this.scenesManager.lights.filter(Boolean).forEach((light) => light.remove())

    this.scenesManager.meshes.forEach((mesh) => mesh.remove())
    this.scenesManager.meshes = []

    // remove material variants
    this.scenesManager.meshesDescriptors.forEach((descriptor) => {
      descriptor.alternateMaterials.forEach((material) => material.destroy())
    })

    // destroy all Object3D created
    this.scenesManager.nodes.forEach((node) => {
      node.destroy()
    })

    this.scenesManager.nodes = new Map()

    this.scenesManager.scenes.forEach((scene) => {
      scene.node.destroy()
    })

    // remove animation from renderer
    this.scenesManager.animations.forEach((animation) => animation.setRenderer(null))

    this.scenesManager.node.destroy()

    this.#primitiveInstances = new Map()
  }
}
