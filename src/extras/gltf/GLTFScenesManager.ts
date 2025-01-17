import { CameraRenderer, isCameraRenderer } from '../../core/renderers/utils'
import { GLTF } from '../../types/gltf/GLTF'
import { GLTFLoader } from '../loaders/GLTFLoader'
import { Sampler, SamplerParams } from '../../core/samplers/Sampler'
import { Texture } from '../../core/textures/Texture'
import { Object3D } from '../../core/objects3D/Object3D'
import { Box3 } from '../../math/Box3'
import { Vec3 } from '../../math/Vec3'
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
  PrimitiveInstanceDescriptor,
  PrimitiveInstances,
  ScenesManager,
  SkinDefinition,
} from '../../types/gltf/GLTFScenesManager'
import { throwWarning } from '../../utils/utils'
import { BufferBinding } from '../../core/bindings/BufferBinding'
import { KeyframesAnimation } from '../animations/KeyframesAnimation'
import { TargetsAnimationsManager } from '../animations/TargetsAnimationsManager'

// TODO limitations, example...
// use a list like: https://github.com/warrenm/GLTFKit2?tab=readme-ov-file#status-and-conformance

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// To make it easier to reference the WebGL enums that glTF uses.
const GL = WebGLRenderingContext

// one normal matrix to handle them all
const _normalMatrix = new Mat4()

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
      scenes: [],
      meshes: [],
      meshesDescriptors: [],
      animations: [],
      cameras: [],
      skins: [],
    }

    this.createSamplers()
    this.createMaterialTextures()
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
    const format = (() => {
      switch (name) {
        case 'baseColorTexture':
        case 'emissiveTexture':
          return 'bgra8unorm-srgb'
        case 'occlusionTexture':
          return 'r8unorm'
        default:
          return 'bgra8unorm'
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

        this.scenesManager.materialsTextures[materialIndex] = materialTextures

        if (material.pbrMetallicRoughness) {
          if (
            material.pbrMetallicRoughness.baseColorTexture &&
            material.pbrMetallicRoughness.baseColorTexture.index !== undefined
          ) {
            const index = material.pbrMetallicRoughness.baseColorTexture.index
            const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

            const texture = this.createTexture(material, image, 'baseColorTexture')
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

            materialTextures.texturesDescriptors.push({
              texture,
              sampler: this.scenesManager.samplers[samplerIndex ?? 0],
              texCoordAttributeName: getUVAttributeName(material.pbrMetallicRoughness.baseColorTexture),
            })
          }

          if (
            material.pbrMetallicRoughness.metallicRoughnessTexture &&
            material.pbrMetallicRoughness.metallicRoughnessTexture.index !== undefined
          ) {
            const index = material.pbrMetallicRoughness.metallicRoughnessTexture.index
            const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

            const texture = this.createTexture(material, image, 'metallicRoughnessTexture')
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

            materialTextures.texturesDescriptors.push({
              texture,
              sampler: this.scenesManager.samplers[samplerIndex ?? 0],
              texCoordAttributeName: getUVAttributeName(material.pbrMetallicRoughness.metallicRoughnessTexture),
            })
          }
        }

        if (material.normalTexture && material.normalTexture.index !== undefined) {
          const index = material.normalTexture.index
          const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'normalTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.texturesDescriptors.push({
            texture,
            sampler: this.scenesManager.samplers[samplerIndex ?? 0],
            texCoordAttributeName: getUVAttributeName(material.normalTexture),
          })
        }

        if (material.occlusionTexture && material.occlusionTexture.index !== undefined) {
          const index = material.occlusionTexture.index
          const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'occlusionTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.texturesDescriptors.push({
            texture,
            sampler: this.scenesManager.samplers[samplerIndex ?? 0],
            texCoordAttributeName: getUVAttributeName(material.occlusionTexture),
          })
        }

        if (material.emissiveTexture && material.emissiveTexture.index !== undefined) {
          const index = material.emissiveTexture.index
          const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'emissiveTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.texturesDescriptors.push({
            texture,
            sampler: this.scenesManager.samplers[samplerIndex ?? 0],
            texCoordAttributeName: getUVAttributeName(material.emissiveTexture),
          })
        }
      }
    }
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
      const mesh = this.gltf.meshes[node.mesh]

      // each primitive is in fact a mesh
      mesh.primitives.forEach((primitive, i) => {
        const meshDescriptor: MeshDescriptor = {
          parent: child.node,
          attributes: [],
          textures: [],
          parameters: {
            label: mesh.name ? mesh.name + ' ' + i : 'glTF mesh ' + i,
          },
          nodes: [],
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
      })
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
      const name =
        attribName === 'TEXCOORD_0' ? 'uv' : attribName.replace('_', '').replace('TEXCOORD', 'uv').toLowerCase()

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

      const arrayOffset = accessor.byteOffset + bufferView.byteOffset
      const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer]
      const arrayLength =
        Math.ceil(accessor.count / indicesConstructor.BYTES_PER_ELEMENT) * indicesConstructor.BYTES_PER_ELEMENT

      // do not allow Uint8Array arrays
      indicesArray =
        indicesConstructor.name === 'Uint8Array'
          ? Uint16Array.from(new indicesConstructor(arrayBuffer, arrayOffset, arrayLength))
          : new indicesConstructor(arrayBuffer, arrayOffset, arrayLength)
    }

    const hasNormal = defaultAttributes.find((attribute) => attribute.name === 'normal')

    if (!hasNormal) {
      // specs say "When normals are not specified, client implementations MUST calculate flat normals and the provided tangents (if present) MUST be ignored."
      // compute flat normal
      // from https://gist.github.com/donmccurdy/34a60951796cf703c8f6a9e1cd4bbe58
      const positionAttribute = defaultAttributes.find((attribute) => attribute.name === 'position')
      const vertex1 = new Vec3()
      const vertex2 = new Vec3()
      const vertex3 = new Vec3()
      const edge1 = new Vec3()
      const edge2 = new Vec3()
      const normal = new Vec3()

      const computeNormal = () => {
        edge1.copy(vertex2).sub(vertex1)
        edge2.copy(vertex3).sub(vertex1)

        normal.crossVectors(edge1, edge2).normalize()
      }

      const posLength = positionAttribute.array.length
      const normalArray = new Float32Array(posLength)

      if (!indicesArray) {
        for (let i = 0; i < posLength; i += positionAttribute.size * 3) {
          vertex1.set(positionAttribute.array[i], positionAttribute.array[i + 1], positionAttribute.array[i + 2])
          vertex2.set(positionAttribute.array[i + 3], positionAttribute.array[i + 4], positionAttribute.array[i + 5])
          vertex3.set(positionAttribute.array[i + 6], positionAttribute.array[i + 7], positionAttribute.array[i + 8])

          computeNormal()

          for (let j = 0; j < 3; j++) {
            normalArray[i + j * 3] = normal.x
            normalArray[i + 1 + j * 3] = normal.y
            normalArray[i + 2 + j * 3] = normal.z
          }
        }
      } else {
        const nbIndices = indicesArray.length
        for (let i = 0; i < nbIndices; i += positionAttribute.size * 3) {
          const i0 = indicesArray[i] * 3
          const i1 = indicesArray[i + 1] * 3
          const i2 = indicesArray[i + 2] * 3

          vertex1.set(positionAttribute.array[i0], positionAttribute.array[i0 + 1], positionAttribute.array[i0 + 2])
          vertex2.set(positionAttribute.array[i1], positionAttribute.array[i1 + 1], positionAttribute.array[i1 + 2])
          vertex3.set(positionAttribute.array[i2], positionAttribute.array[i2 + 1], positionAttribute.array[i2 + 2])

          computeNormal()

          for (let j = 0; j < 3; j++) {
            normalArray[indicesArray[i + j] * 3] = normal.x
            normalArray[indicesArray[i + j] * 3 + 1] = normal.y
            normalArray[indicesArray[i + j] * 3 + 2] = normal.z
          }
        }
      }

      const normalAttribute = {
        name: 'normal',
        type: 'vec3f',
        bufferFormat: 'float32x3',
        size: 3,
        array: normalArray,
      }

      // add to the attributes
      defaultAttributes.push(normalAttribute)

      // remove existing tangent if any
      defaultAttributes = defaultAttributes.filter((attr) => attr.name !== 'tangent')

      // if we had an interleavedArray then we'd have to rebuilt it with normals
      // the Geometry is going to do that for us
      interleavedArray = null
    }

    if (!interleavedArray) {
      // not interleaved?
      // let's try to reorder the attributes so we might benefit from pipeline cache
      const attribOrder = ['position', 'uv', 'normal']

      defaultAttributes.sort((a, b) => {
        let aIndex = attribOrder.findIndex((attrName) => attrName === a.name)
        aIndex = aIndex === -1 ? Infinity : aIndex

        let bIndex = attribOrder.findIndex((attrName) => attrName === b.name)
        bIndex = bIndex === -1 ? Infinity : bIndex

        return aIndex - bIndex
      })
    }

    defaultAttributes.forEach((attribute) => {
      meshDescriptor.attributes.push({
        name: attribute.name,
        type: attribute.type,
      })
    })

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
    meshDescriptor.parameters.geometry.boundingBox = geometryBBox

    if (isIndexedGeometry && indicesConstructor && indicesArray) {
      ;(meshDescriptor.parameters.geometry as IndexedGeometry).setIndexBuffer({
        bufferFormat: indicesConstructor.name === 'Uint32Array' ? 'uint32' : 'uint16',
        array: indicesArray,
      })
    }
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
          label: 'Skin ' + meshIndex,
          name: 'skin' + meshIndex,
          bindingType: 'storage',
          visibility: ['vertex'],
          childrenBindings: [
            {
              binding: new BufferBinding({
                label: 'Joints',
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

          const _updateMatrixStack = parentNode.updateMatrixStack.bind(parentNode)

          parentNode.updateMatrixStack = () => {
            _updateMatrixStack()

            parentInverseWorldMatrix.copy(parentNode.worldMatrix).invert()
          }

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

              const animationTarget = animation.getTargetByObject3D(object)

              if (animationTarget) {
                animationTarget.animations.forEach((animation) => {
                  animation.onAfterUpdate = updateJointMatrix
                })
              } else {
                // this joint does not have an animation
                // but this does not mean we don't have to update its matrices!

                // add an empty animation with just an onAfterCallback
                const node = this.gltf.nodes[jointIndex]
                const animName = node.name ? `${node.name} empty animation` : `empty animation ${jointIndex}`

                const emptyAnimation = new KeyframesAnimation({
                  label: animation.label ? `${animation.label} ${animName}` : `Animation ${animName}`,
                })

                emptyAnimation.onAfterUpdate = updateJointMatrix

                animation.addTargetAnimation(object, emptyAnimation)
              }
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
        const node = instances[0]
        if (node.skin !== undefined && node.skin === skinIndex) {
          const skinDef = this.scenesManager.skins[skinIndex]

          if (!meshDescriptor.parameters.bindings) {
            meshDescriptor.parameters.bindings = []
          }

          meshDescriptor.parameters.bindings = [...meshDescriptor.parameters.bindings, skinDef.binding]
        }
      })
    }

    // textures and samplers
    const materialTextures = this.scenesManager.materialsTextures[primitive.material]

    meshDescriptor.parameters.samplers = []
    meshDescriptor.parameters.textures = []

    materialTextures?.texturesDescriptors.forEach((t) => {
      meshDescriptor.textures.push({
        texture: t.texture.options.name,
        sampler: t.sampler.name,
        texCoordAttributeName: t.texCoordAttributeName,
      })

      const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === t.sampler.uuid)

      if (!samplerExists) {
        meshDescriptor.parameters.samplers.push(t.sampler)
      }

      meshDescriptor.parameters.textures.push(t.texture)
    })

    const material = (this.gltf.materials && this.gltf.materials[primitive.material]) || {}

    meshDescriptor.parameters.cullMode = material.doubleSided ? 'none' : 'back'

    // transparency
    if (material.alphaMode === 'BLEND' || (material.extensions && material.extensions.KHR_materials_transmission)) {
      meshDescriptor.parameters.transparent = true
      meshDescriptor.parameters.targets = [
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

    // uniforms
    const materialUniformStruct = {
      baseColorFactor: {
        type: 'vec4f',
        value: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1],
      },
      alphaCutoff: {
        type: 'f32',
        value: material.alphaCutoff !== undefined ? material.alphaCutoff : material.alphaMode === 'MASK' ? 0.5 : 0,
      },
      metallicFactor: {
        type: 'f32',
        value:
          material.pbrMetallicRoughness?.metallicFactor === undefined
            ? 1
            : material.pbrMetallicRoughness.metallicFactor,
      },
      roughnessFactor: {
        type: 'f32',
        value:
          material.pbrMetallicRoughness?.roughnessFactor === undefined
            ? 1
            : material.pbrMetallicRoughness.roughnessFactor,
      },
      normalMapScale: {
        type: 'f32',
        value: material.normalTexture?.scale === undefined ? 1 : material.normalTexture.scale,
      },
      occlusionStrength: {
        type: 'f32',
        value: material.occlusionTexture?.strength === undefined ? 1 : material.occlusionTexture.strength,
      },
      emissiveFactor: {
        type: 'vec3f',
        value: material.emissiveFactor !== undefined ? material.emissiveFactor : [1, 1, 1],
      },
    }

    if (Object.keys(materialUniformStruct).length) {
      meshDescriptor.parameters.uniforms = {
        material: {
          visibility: ['vertex', 'fragment'],
          struct: materialUniformStruct,
        },
      }
    }

    // instances matrices storage
    if (instancesCount > 1) {
      const worldMatrices = new Float32Array(instancesCount * 16)
      const normalMatrices = new Float32Array(instancesCount * 16)

      for (let i = 0; i < instancesCount; ++i) {
        worldMatrices.set(nodes[i].worldMatrix.elements, i * 16)

        _normalMatrix.copy(nodes[i].worldMatrix).invert().transpose()
        normalMatrices.set(_normalMatrix.elements, i * 16)
      }

      meshDescriptor.parameters.storages = {
        instances: {
          visibility: ['vertex', 'fragment'],
          struct: {
            modelMatrix: {
              type: 'array<mat4x4f>',
              value: worldMatrices,
            },
            normalMatrix: {
              type: 'array<mat4x4f>',
              value: normalMatrices,
            },
          },
        },
      }
    }

    // computed transformed bbox
    for (let i = 0; i < nodes.length; i++) {
      const tempBbox = meshDescriptor.parameters.geometry.boundingBox.clone()
      const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)

      this.scenesManager.boundingBox.min.min(transformedBbox.min)
      this.scenesManager.boundingBox.max.max(transformedBbox.max)
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

        const hasInstancedShadows =
          meshDescriptor.parameters.geometry.instancesCount > 1 && meshDescriptor.parameters.castShadows

        if (hasInstancedShadows) {
          meshDescriptor.parameters.castShadows = false
        }

        const mesh = new Mesh(this.renderer, {
          ...meshDescriptor.parameters,
        })

        if (meshDescriptor.nodes.length > 1) {
          // if we're dealing with instances
          // we must patch the mesh updateMatrixStack method
          // in order to update the instanceMatrix binding
          const _updateMatrixStack = mesh.updateMatrixStack.bind(mesh)
          mesh.updateMatrixStack = () => {
            _updateMatrixStack()

            // should we update instances?
            let updateInstances = mesh.matricesNeedUpdate

            meshDescriptor.nodes.forEach((node, i) => {
              if (node.matricesNeedUpdate) {
                updateInstances = true
              }

              if (updateInstances) {
                ;(mesh.storages.instances.modelMatrix.value as TypedArray).set(node.worldMatrix.elements, i * 16)

                _normalMatrix.copy(node.worldMatrix).invert().transpose()
                ;(mesh.storages.instances.normalMatrix.value as TypedArray).set(_normalMatrix.elements, i * 16)
              }
            })

            if (updateInstances) {
              mesh.storages.instances.modelMatrix.shouldUpdate = true
              mesh.storages.instances.normalMatrix.shouldUpdate = true
            }
          }
        }

        // instanced shadows
        if (hasInstancedShadows) {
          const instancesBinding = mesh.material.inputsBindings.get('instances')

          this.renderer.shadowCastingLights.forEach((light) => {
            if (light.shadow.isActive) {
              light.shadow.addShadowCastingMesh(mesh, {
                bindings: [instancesBinding],
              })
            }
          })
        }

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
    this.scenesManager.meshes.forEach((mesh) => mesh.remove())
    this.scenesManager.meshes = []

    // destroy all Object3D created
    this.scenesManager.nodes.forEach((node) => {
      node.destroy()
    })

    this.scenesManager.scenes.forEach((scene) => {
      scene.node.destroy()
    })

    // remove animation from renderer
    this.scenesManager.animations.forEach((animation) => animation.setRenderer(null))

    this.scenesManager.node.destroy()
  }
}
