import { CameraRenderer, isCameraRenderer } from '../../core/renderers/utils'
import { GLTF } from '../../types/gltf/GLTF'
import { GLTFLoader } from './GLTFLoader'
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
import { GeometryParams, VertexBufferAttribute } from '../../types/Geometries'
import { ChildDescriptor, MeshDescriptor, PrimitiveInstances, ScenesManager } from '../../types/gltf/GLTFScenesManager'

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
 *   - [ ] Sparse accessors
 * - [x] Buffers
 * - [x] BufferViews
 * - [x] Images
 * - [x] Meshes
 * - [x] Nodes
 * - [x] Primitives
 * - [x] Samplers
 * - [x] Textures
 * - [ ] Animations
 * - [ ] Cameras
 * - [x] Materials
 * - [ ] Skins
 *
 * @example
 * ```javascript
 * const gltfLoader = new GLTFLoader()
 * const gltf = await gltfLoader.loadFromUrl('path/to/model.gltf')
 *
 * // create a gltfScenesManager from the resulting 'gltf' object
 * // assuming 'renderer' is a valid camera or curtains renderer
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

    const traverseChildren = (child) => {
      return [
        child.node,
        ...child.children
          ?.map((c) => {
            return [...traverseChildren(c)]
          })
          .flat(),
      ].flat()
    }

    this.scenesManager = {
      node: new Object3D(),
      boundingBox: new Box3(),
      samplers: [],
      materialsTextures: [],
      scenes: [],
      meshes: [],
      meshesDescriptors: [],
      getScenesNodes: () => {
        return this.scenesManager.scenes
          .map((scene) => {
            return traverseChildren(scene)
          })
          .flat()
      },
    }

    this.createSamplers()
    this.createMaterialTextures()
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
   * Get the {@link GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
   * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
   * @returns - corresponding {@link GPUPrimitiveTopology}.
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
   * Get the {@link GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
   * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
   * @returns - corresponding {@link GPUAddressMode}.
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
   * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | GLTF Node}
   * @param parent - parent {@link ChildDescriptor} to use.
   * @param node - {@link GLTF.INode | GLTF Node} to use.
   */
  createNode(parent: ChildDescriptor, node: GLTF.INode) {
    if (node.camera !== undefined) return

    const child: ChildDescriptor = {
      name: node.name,
      node: new Object3D(),
      children: [],
    }

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

    const mesh = this.gltf.meshes[node.mesh]

    if (node.children) {
      node.children.forEach((childNodeIndex) => {
        const childNode = this.gltf.nodes[childNodeIndex]
        this.createNode(child, childNode)
      })
    }

    if (mesh) {
      // each primitive is in fact a mesh
      mesh.primitives.forEach((primitive, index) => {
        const meshDescriptor: MeshDescriptor = {
          parent: child.node,
          attributes: [],
          textures: [],
          parameters: {
            label: mesh.name ? mesh.name + ' ' + index : 'glTF mesh ' + index,
          },
          nodes: [],
        }

        let instancesDescriptor = this.#primitiveInstances.get(primitive)
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
        this.createNode(sceneDescriptor, node)
      })
    })

    // now that we created all our nodes, update all the matrices
    this.scenesManager.scenes.forEach((childScene) => {
      childScene.node.shouldUpdateModelMatrix()
      childScene.node.updateMatrixStack()
    })

    for (const [primitive, primitiveInstance] of this.#primitiveInstances) {
      const { instances, nodes, meshDescriptor } = primitiveInstance

      const instancesCount = instances.length

      meshDescriptor.nodes = nodes

      this.scenesManager.meshesDescriptors.push(meshDescriptor)

      // ------------------------------------
      // GEOMETRY
      // ------------------------------------

      const geometryBBox = new Box3()

      // TODO should we pass an already created buffer to the geometry main vertex and index buffers if possible?
      // and use bufferOffset and bufferSize parameters
      // if the accessors byteOffset is large enough,
      // it means we have an array that is not interleaved (with each vertexBuffer attributes bufferOffset = 0)
      // but we can deal with the actual offset in the geometry setVertexBuffer call!
      // see https://toji.dev/webgpu-gltf-case-study/#handling-large-attribute-offsets

      const defaultAttributes = []

      // check whether the buffer view is already interleaved
      let interleavedArray = null
      let interleavedBufferView = null
      let maxByteOffset = 0

      // prepare default attributes
      for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
        const accessor = this.gltf.accessors[accessorIndex as number]

        const constructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType)

        const bufferView = this.gltf.bufferViews[accessor.bufferView]

        // clean attributes names
        const name =
          attribName === 'TEXCOORD_0' ? 'uv' : attribName.replace('_', '').replace('TEXCOORD', 'uv').toLowerCase()

        const byteStride = bufferView.byteStride || 0
        const accessorByteOffset = accessor.byteOffset || 0
        if (byteStride && accessorByteOffset && accessorByteOffset < byteStride) {
          maxByteOffset = Math.max(accessorByteOffset, maxByteOffset)
        } else {
          maxByteOffset = 0
        }

        // custom bbox
        // glTF specs says: "vertex position attribute accessors MUST have accessor.min and accessor.max defined"
        if (name === 'position') {
          geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]))
          geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]))

          interleavedBufferView = bufferView
        }

        const attributeParams = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type)

        const attribute = {
          name,
          ...attributeParams,
          array: new constructor(
            this.gltf.arrayBuffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            accessor.count * attributeParams.size
          ),
        }

        defaultAttributes.push(attribute)
        meshDescriptor.attributes.push({
          name: attribute.name,
          type: attribute.type,
        })
      }

      if (maxByteOffset > 0) {
        // check they are all really interleaved
        const accessorsBufferViews = Object.values(primitive.attributes).map(
          (accessorIndex) => this.gltf.accessors[accessorIndex as number].bufferView
        )

        if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
          // we're not that lucky since we have interleaved values coming from different positions of our main buffer
          // we'll have to rebuild an interleaved array ourselves
          let totalStride = 0
          const mainBufferStrides = {}
          const arrayLength = Object.values(primitive.attributes).reduce(
            (acc: number, accessorIndex: number): number => {
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
            },
            0
          ) as number

          interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4)

          Object.values(primitive.attributes).forEach((accessorIndex: number) => {
            const accessor = this.gltf.accessors[accessorIndex]
            const bufferView = this.gltf.bufferViews[accessor.bufferView]

            const attrSize = GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size

            for (let i = 0; i < accessor.count; i++) {
              const startOffset =
                accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT +
                (i * totalStride) / Float32Array.BYTES_PER_ELEMENT

              interleavedArray
                .subarray(startOffset, startOffset + attrSize)
                .set(
                  new Float32Array(
                    this.gltf.arrayBuffers[bufferView.buffer],
                    bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
                    attrSize
                  )
                )
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
        }
      } else {
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

      const geometryAttributes: GeometryParams = {
        instancesCount,
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

      const isIndexedGeometry = 'indices' in primitive
      const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry

      meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes)
      //meshDescriptor.parameters.geometry.boundingBox.copy(geometryBBox)
      meshDescriptor.parameters.geometry.boundingBox = geometryBBox

      if (isIndexedGeometry) {
        const accessor = this.gltf.accessors[primitive.indices]
        const bufferView = this.gltf.bufferViews[accessor.bufferView]

        const constructor = GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType) as
          | Uint32ArrayConstructor
          | Uint16ArrayConstructor

        const arrayOffset = accessor.byteOffset + bufferView.byteOffset
        const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer]
        const arrayLength = Math.min(
          (arrayBuffer.byteLength - arrayOffset) / constructor.BYTES_PER_ELEMENT,
          Math.ceil(accessor.count / 4) * 4
        )

        // do not allow Uint8Array arrays
        const array =
          constructor.name === 'Uint8Array'
            ? Uint16Array.from(new constructor(arrayBuffer, arrayOffset, arrayLength))
            : new constructor(arrayBuffer, arrayOffset, arrayLength)

        ;(meshDescriptor.parameters.geometry as IndexedGeometry).setIndexBuffer({
          bufferFormat: constructor.name === 'Uint32Array' ? 'uint32' : 'uint16',
          array,
        })
      }

      // ------------------------------------
      // MATERIAL
      // ------------------------------------

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
        const tempBbox = geometryBBox.clone()
        const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)

        this.scenesManager.boundingBox.min.min(transformedBbox.min)
        this.scenesManager.boundingBox.max.max(transformedBbox.max)
      }
    }
  }

  /**
   * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
   * @param patchMeshesParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add custom shaders, uniforms or storages, change rendering options, etc.)
   * @returns - Array of created {@link Mesh}.
   */
  addMeshes(patchMeshesParameters = (meshDescriptor: MeshDescriptor) => {}): Mesh[] {
    return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
      if (meshDescriptor.parameters.geometry) {
        // patch the parameters
        patchMeshesParameters(meshDescriptor)

        const mesh = new Mesh(this.renderer, {
          ...meshDescriptor.parameters,
        })

        if (meshDescriptor.nodes.length > 1) {
          // if we're dealing with instances
          // we must patch the mesh updateWorldMatrix method
          // in order to update the instanceMatrix binding each time the mesh world matrix change

          const _updateWorldMatrix = mesh.updateWorldMatrix.bind(mesh)
          mesh.updateWorldMatrix = () => {
            _updateWorldMatrix()

            meshDescriptor.nodes.forEach((node, i) => {
              ;(mesh.storages.instances.modelMatrix.value as TypedArray).set(node.worldMatrix.elements, i * 16)

              _normalMatrix.copy(node.worldMatrix).invert().transpose()
              ;(mesh.storages.instances.normalMatrix.value as TypedArray).set(_normalMatrix.elements, i * 16)
            })

            mesh.storages.instances.modelMatrix.shouldUpdate = true
            mesh.storages.instances.normalMatrix.shouldUpdate = true
          }

          // be sure to have fresh model matrices
          // TODO shouldn't be needed?
          this.renderer.onAfterRenderScene.add(
            () => {
              mesh.shouldUpdateModelMatrix()
            },
            { once: true }
          )
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

    const nodes = this.scenesManager.getScenesNodes()
    nodes.forEach((node) => {
      node.destroy()
    })

    this.scenesManager.node.destroy()
  }
}
