import { Sampler, Texture, Object3D, Box3, Vec3, Geometry, IndexedGeometry } from '../../src/index.ts'

// largely based on
// https://toji.dev/webgpu-gltf-case-study/
// https://github.com/toji/webgpu-gltf-case-study/blob/main/samples/js/tiny-gltf.js

// also see glTF specs
// https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html

// https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Constants
// To make it easier to reference the WebGL enums that glTF uses.
const GL = WebGLRenderingContext

const GLB_MAGIC = 0x46546c67
const CHUNK_TYPE = {
  JSON: 0x4e4f534a,
  BIN: 0x004e4942,
}

const DEFAULT_TRANSLATION = [0, 0, 0]
const DEFAULT_ROTATION = [0, 0, 0, 1]
const DEFAULT_SCALE = [1, 1, 1]

const absUriRegEx = new RegExp(`^${window.location.protocol}`, 'i')
const dataUriRegEx = /^data:/
function resolveUri(uri, baseUrl) {
  if (!!uri.match(absUriRegEx) || !!uri.match(dataUriRegEx)) {
    return uri
  }
  return baseUrl + uri
}

export class GLTFLoader {
  constructor({ renderer }) {
    this.renderer = renderer
    this.gltf = null
  }

  static getVertexAttributeParamsFromType(type) {
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

  static getTypedArrayConstructorFromComponentType(componentType) {
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

  static gpuPrimitiveTopologyForMode(mode) {
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

  static gpuAddressModeForWrap(wrap) {
    switch (wrap) {
      case GL.CLAMP_TO_EDGE:
        return 'clamp-to-edge'
      case GL.MIRRORED_REPEAT:
        return 'mirror-repeat'
      default:
        return 'repeat'
    }
  }

  async loadFromUrl(url) {
    const i = url.lastIndexOf('/')
    const baseUrl = i !== 0 ? url.substring(0, i + 1) : ''
    const response = await fetch(url)

    if (url.endsWith('.gltf')) {
      return this.loadFromJson(await response.json(), baseUrl)
    } else if (url.endsWith('.glb')) {
      return this.loadFromBinary(await response.arrayBuffer(), baseUrl)
    } else {
      throw new Error('Unrecognized file extension')
    }
  }

  async loadFromBinary(arrayBuffer, baseUrl) {
    const headerView = new DataView(arrayBuffer, 0, 12)
    const magic = headerView.getUint32(0, true)
    const version = headerView.getUint32(4, true)
    const length = headerView.getUint32(8, true)

    if (magic !== GLB_MAGIC) {
      throw new Error('Invalid magic string in binary header.')
    }

    if (version !== 2) {
      throw new Error('Incompatible version in binary header.')
    }

    let chunks = {}
    let chunkOffset = 12
    while (chunkOffset < length) {
      const chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8)
      const chunkLength = chunkHeaderView.getUint32(0, true)
      const chunkType = chunkHeaderView.getUint32(4, true)
      chunks[chunkType] = arrayBuffer.slice(chunkOffset + 8, chunkOffset + 8 + chunkLength)
      chunkOffset += chunkLength + 8
    }

    if (!chunks[CHUNK_TYPE.JSON]) {
      throw new Error('File contained no json chunk.')
    }

    const decoder = new TextDecoder('utf-8')
    const jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON])
    return this.loadFromJson(JSON.parse(jsonString), baseUrl, chunks[CHUNK_TYPE.BIN])
  }

  async loadFromJsonBase(json, baseUrl, binaryChunk = null) {
    if (!baseUrl) {
      throw new Error('baseUrl must be specified.')
    }

    if (!json.asset) {
      throw new Error('Missing asset description.')
    }

    if (json.asset.minVersion !== '2.0' && json.asset.version !== '2.0') {
      throw new Error('Incompatible asset version.')
    }

    // Resolve defaults for as many properties as we can.
    for (const accessor of json.accessors) {
      accessor.byteOffset = accessor.byteOffset ?? 0
      accessor.normalized = accessor.normalized ?? false
    }

    for (const bufferView of json.bufferViews) {
      bufferView.byteOffset = bufferView.byteOffset ?? 0
    }

    for (const node of json.nodes) {
      if (!node.matrix) {
        node.rotation = node.rotation ?? DEFAULT_ROTATION
        node.scale = node.scale ?? DEFAULT_SCALE
        node.translation = node.translation ?? DEFAULT_TRANSLATION
      }
    }

    if (json.samplers) {
      for (const sampler of json.samplers) {
        sampler.wrapS = sampler.wrapS ?? GL.REPEAT
        sampler.wrapT = sampler.wrapT ?? GL.REPEAT
      }
    }

    // Resolve buffers and images first, since these are the only external resources that the file
    // might reference.
    // Buffers will be exposed as ArrayBuffers.
    // Images will be exposed as ImageBitmaps.

    // Buffers
    const pendingBuffers = []
    if (binaryChunk) {
      pendingBuffers.push(Promise.resolve(binaryChunk))
    } else {
      for (const index in json.buffers) {
        const buffer = json.buffers[index]
        const uri = resolveUri(buffer.uri, baseUrl)
        pendingBuffers[index] = fetch(uri).then((response) => response.arrayBuffer())
      }
    }

    // Images
    // TODO
    const pendingImages = []
    for (let index = 0; index < json.images?.length || 0; ++index) {
      const image = json.images[index]
      if (image.uri) {
        pendingImages[index] = fetch(resolveUri(image.uri, baseUrl)).then(async (response) => {
          return createImageBitmap(await response.blob())
        })
      } else {
        const bufferView = json.bufferViews[image.bufferView]
        pendingImages[index] = pendingBuffers[bufferView.buffer].then((buffer) => {
          const blob = new Blob([new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength)], {
            type: image.mimeType,
          })
          return createImageBitmap(blob)
        })
      }
    }

    // Replace the resolved resources in the JSON structure.
    json.buffers = await Promise.all(pendingBuffers)
    json.images = await Promise.all(pendingImages)

    return json
  }

  createTexture(image, name) {
    const texture = new Texture(this.renderer, {
      name,
      generateMips: true,
      fixedSize: {
        width: image.width,
        height: image.height,
      },
    })

    texture.uploadSource({
      source: image,
      origin: [0, 0, 0], // not mandatory
    })

    return texture
  }

  async loadFromJson(json, baseUrl, binaryChunk) {
    // Load the glTF file
    this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk)

    // Identify all the vertex and index buffers by iterating through all the primitives accessors
    // and marking the buffer views as vertex or index usage.
    // (There's technically a target attribute on the buffer view that's supposed to tell us what
    // it's used for, but that appears to be rarely populated.)
    // const bufferViewUsages = []
    // const markAccessorUsage = (accessorIndex, usage) => {
    //   const accessor = this.gltf.accessors[accessorIndex]
    //   bufferViewUsages[accessor.bufferView] |= usage
    // }
    //
    // for (const mesh of this.gltf.meshes) {
    //   for (const primitive of mesh.primitives) {
    //     if ('indices' in primitive) {
    //       markAccessorUsage(primitive.indices, GPUBufferUsage.INDEX)
    //       //console.log('>>> INDEX', primitive)
    //     }
    //     for (const attribute of Object.values(primitive.attributes)) {
    //       markAccessorUsage(attribute, GPUBufferUsage.VERTEX)
    //       //console.log('>>> ATTRIBUTE', attribute)
    //     }
    //   }
    // }
    //
    // //console.log('BUFFER VIEW USAGES', bufferViewUsages)
    //
    // // Create WebGPU objects for all necessary buffers, images, and samplers
    // this.gltf.gpuBuffers = []
    // for (const [index, bufferView] of Object.entries(this.gltf.bufferViews)) {
    //   // gltf.gpuBuffers[index] = createGpuBufferFromBufferView(device, bufferView, gltf.buffers[bufferView.buffer], bufferViewUsages[index]);
    //   //console.log('>>> BUFFER', index, bufferView, this.gltf.buffers[bufferView.buffer])
    // }

    this.gltf.materialsTextures = []
    for (let i = 0; i < this.gltf.materials.length; i++) {
      this.gltf.materialsTextures[i] = {
        material: i,
        textures: [],
      }
    }

    this.gltf.gpuSamplers = []
    if (this.gltf.samplers) {
      for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
        const descriptor = {
          name: 'gltfSampler' + index, // TODO better name?
          addressModeU: GLTFLoader.gpuAddressModeForWrap(sampler.wrapS),
          addressModeV: GLTFLoader.gpuAddressModeForWrap(sampler.wrapT),
        }

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

        this.gltf.gpuSamplers.push(new Sampler(this.renderer, descriptor))
      }
    } else {
      // create a default sampler anyway?
      this.gltf.gpuSamplers.push(new Sampler(this.renderer, { name: 'gtlfSampler0' }))
    }

    this.gltf.gpuTextures = []

    // if (this.gltf.images?.length) {
    //   if (this.gltf.images) {
    //     for (const [index, image] of Object.entries(this.gltf.images)) {
    //       if (!image) {
    //         continue
    //       }
    //
    //       const id = parseInt(index)
    //
    //       for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
    //         const materialTextures = this.gltf.materialsTextures[materialIndex]
    //
    //         if (material.pbrMetallicRoughness) {
    //           if (
    //             material.pbrMetallicRoughness.baseColorTexture &&
    //             material.pbrMetallicRoughness.baseColorTexture.index === id
    //           ) {
    //             const texture = this.createTexture(image, 'baseColorTexture')
    //             const samplerIndex = this.gltf.textures.find((t) => t.source === id)?.sampler
    //
    //             materialTextures.textures.push({
    //               texture,
    //               sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
    //             })
    //
    //             break
    //           }
    //
    //           if (
    //             material.pbrMetallicRoughness.metallicRoughnessTexture &&
    //             material.pbrMetallicRoughness.metallicRoughnessTexture.index === id
    //           ) {
    //             const texture = this.createTexture(image, 'metallicRoughnessTexture')
    //             const samplerIndex = this.gltf.textures.find((t) => t.source === id)?.sampler
    //
    //             materialTextures.textures.push({
    //               texture,
    //               sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
    //             })
    //
    //             break
    //           }
    //         }
    //
    //         if (material.normalTexture && material.normalTexture.index === id) {
    //           const texture = this.createTexture(image, 'normalTexture')
    //           const samplerIndex = this.gltf.textures.find((t) => t.source === id)?.sampler
    //
    //           materialTextures.textures.push({
    //             texture,
    //             sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
    //           })
    //
    //           break
    //         }
    //
    //         if (material.occlusionTexture && material.occlusionTexture.index === id) {
    //           const texture = this.createTexture(image, 'occlusionTexture')
    //           const samplerIndex = this.gltf.textures.find((t) => t.source === id)?.sampler
    //
    //           materialTextures.textures.push({
    //             texture,
    //             sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
    //           })
    //
    //           break
    //         }
    //
    //         if (material.emissiveTexture && material.emissiveTexture.index === id) {
    //           const texture = this.createTexture(image, 'emissiveTexture')
    //           const samplerIndex = this.gltf.textures.find((t) => t.source === id)?.sampler
    //
    //           materialTextures.textures.push({
    //             texture,
    //             sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
    //           })
    //
    //           break
    //         }
    //       }
    //     }
    //   }
    // }

    for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
      const materialTextures = this.gltf.materialsTextures[materialIndex]

      if (material.pbrMetallicRoughness) {
        if (
          material.pbrMetallicRoughness.baseColorTexture &&
          material.pbrMetallicRoughness.baseColorTexture.index !== undefined
        ) {
          const index = parseInt(material.pbrMetallicRoughness.baseColorTexture.index)
          const image = this.gltf.images[index]

          const texture = this.createTexture(image, 'baseColorTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.textures.push({
            texture,
            sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
          })
        }

        if (
          material.pbrMetallicRoughness.metallicRoughnessTexture &&
          material.pbrMetallicRoughness.metallicRoughnessTexture.index !== undefined
        ) {
          const index = parseInt(material.pbrMetallicRoughness.metallicRoughnessTexture.index)
          const image = this.gltf.images[index]

          const texture = this.createTexture(image, 'metallicRoughnessTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.textures.push({
            texture,
            sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
          })
        }
      }

      if (material.normalTexture && material.normalTexture.index !== undefined) {
        const index = parseInt(material.normalTexture.index)
        const image = this.gltf.images[index]

        const texture = this.createTexture(image, 'normalTexture')
        const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

        materialTextures.textures.push({
          texture,
          sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
        })
      }

      if (material.occlusionTexture && material.occlusionTexture.index !== undefined) {
        const index = parseInt(material.occlusionTexture.index)
        const image = this.gltf.images[index]

        const texture = this.createTexture(image, 'occlusionTexture')
        const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

        materialTextures.textures.push({
          texture,
          sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
        })
      }

      if (material.emissiveTexture && material.emissiveTexture.index !== undefined) {
        const index = parseInt(material.emissiveTexture.index)
        const image = this.gltf.images[index]

        const texture = this.createTexture(image, 'emissiveTexture')
        const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

        materialTextures.textures.push({
          texture,
          sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
        })
      }
    }

    const { scenes, boundingBox } = this.createScenes()

    return { gltf: this.gltf, scenes, boundingBox }
  }

  createNode(parent, node, primitiveInstances) {
    const child = {
      name: node.name,
      node: new Object3D(),
      meshes: [],
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
        this.createNode(child, childNode, primitiveInstances)
      })
    }

    if (mesh) {
      // each primitive is in fact a mesh
      mesh.primitives.forEach((primitive, index) => {
        const meshDescriptor = {
          attributes: [],
          textures: [],
          parameters: {
            label: mesh.name + index,
          },
        }

        child.meshes.push(meshDescriptor)

        let instancesDescriptor = primitiveInstances.get(primitive)
        if (!instancesDescriptor) {
          instancesDescriptor = {
            instances: [], // instances
            nodes: [], // node transform
            meshDescriptor,
          }
          primitiveInstances.set(primitive, instancesDescriptor)
        }

        instancesDescriptor.instances.push(node)
        instancesDescriptor.nodes.push(child.node)
      })
    }
  }

  createScenes() {
    const scenes = []
    const boundingBox = new Box3()

    const primitiveInstances = new Map()

    this.gltf.scenes.forEach((scene) => {
      const sceneDescriptor = {
        name: scene.name,
        children: [],
        node: new Object3D(),
        boundingBox: new Box3(), // TODO
      }

      sceneDescriptor.node.parent = this.renderer.scene

      scenes.push(sceneDescriptor)

      scene.nodes.forEach((nodeIndex) => {
        const node = this.gltf.nodes[nodeIndex]
        this.createNode(sceneDescriptor, node, primitiveInstances)
      })
    })

    // now that we created all our nodes, update all the matrices
    scenes.forEach((scene) => {
      scene.node.shouldUpdateModelMatrix()
      scene.node.updateMatrixStack()
    })

    for (const [primitive, primitiveInstance] of primitiveInstances) {
      const { instances, nodes, meshDescriptor } = primitiveInstance

      const instancesCount = instances.length

      meshDescriptor.nodes = nodes

      // ------------------------------------
      // GEOMETRY
      // ------------------------------------

      const geometryBBox = new Box3()

      // TODO we should pass an already created buffer to the geometry main vertex and index buffers if possible
      // and use bufferOffset and bufferSize parameters
      // for example if the accessors byteOffset is < than the bufferViews byteStride, the array is already interleaved!
      // see https://toji.dev/webgpu-gltf-case-study/#reduced-binding-for-interleaved-buffers
      // or if the accessors byteOffset is large enough,
      // it means we have an array that is not interleaved (with each vertexBuffer attributes bufferOffset = 0)
      // but we can deal with the actual offset in the geometry setVertexBuffer call!
      // see https://toji.dev/webgpu-gltf-case-study/#handling-large-attribute-offsets

      const defaultAttributes = []
      // let defaultAttributesArrayLength = 0
      // let defaultAttributesArrayStride = 0
      // const strides = []
      // const bbox = new Box3()

      // check whether the buffer view is already interleaved
      // let isInterleaved = false
      // let minByteOffset = Infinity

      // prepare default attributes
      for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
        const accessor = this.gltf.accessors[accessorIndex]

        const constructor = GLTFLoader.getTypedArrayConstructorFromComponentType(accessor.componentType)

        const bufferView = this.gltf.bufferViews[accessor.bufferView]
        const name = attribName === 'TEXCOORD_0' ? 'uv' : attribName.toLowerCase()

        // console.log(bufferView.byteStride || 0, accessor.byteOffset)
        // minByteOffset = Math.min(accessor.byteOffset, minByteOffset)

        // custom bbox
        // glTF specs says: "vertex position attribute accessors MUST have accessor.min and accessor.max defined"
        if (name === 'position') {
          geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]))
          geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]))
        }

        const attributeParams = GLTFLoader.getVertexAttributeParamsFromType(accessor.type)
        // strides.push(defaultAttributesArrayStride)
        // defaultAttributesArrayStride += attributeParams.size
        //
        // const arrayLength = accessor.count * attributeParams.size
        // defaultAttributesArrayLength += arrayLength

        const attribute = {
          name,
          ...attributeParams,
          array: new constructor(
            this.gltf.buffers[bufferView.buffer],
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

      // const array = new Float32Array(Math.ceil(defaultAttributesArrayLength / 4) * 4)
      //
      // // now compute the default geometry attributes interleaved array
      // defaultAttributes.forEach((attribute, index) => {
      //   for (let i = 0, j = 0; i < attribute.array.length; i += attribute.size, j++) {
      //     array.set(attribute.array.subarray(i, i + attribute.size), defaultAttributesArrayStride * j + strides[index])
      //   }
      // })

      const attribOrder = ['position', 'uv', 'normal']

      defaultAttributes.sort((a, b) => {
        let aIndex = attribOrder.findIndex((attrName) => attrName === a.name)
        aIndex = aIndex === -1 ? Infinity : aIndex

        let bIndex = attribOrder.findIndex((attrName) => attrName === b.name)
        bIndex = bIndex === -1 ? Infinity : bIndex

        return aIndex - bIndex
      })

      const geometryAttributes = {
        instancesCount,
        topology: GLTFLoader.gpuPrimitiveTopologyForMode(primitive.mode),
        vertexBuffers: [
          {
            name: 'attributes',
            stepMode: 'vertex', // explicitly set the stepMode even if not mandatory
            attributes: defaultAttributes,
            //array,
          },
        ],
      }

      const isIndexedGeometry = 'indices' in primitive
      const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry

      meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes)
      //meshDescriptor.parameters.geometry.boundingBox = bbox

      if (isIndexedGeometry) {
        const accessor = this.gltf.accessors[primitive.indices]
        const bufferView = this.gltf.bufferViews[accessor.bufferView]

        const constructor = GLTFLoader.getTypedArrayConstructorFromComponentType(accessor.componentType)

        meshDescriptor.parameters.geometry.setIndexBuffer({
          bufferFormat: constructor.name === 'Uint32Array' ? 'uint32' : 'uint16',
          array: new constructor(
            this.gltf.buffers[bufferView.buffer],
            accessor.byteOffset + bufferView.byteOffset,
            Math.ceil(accessor.count / 4) * 4
          ),
        })
      }

      // ------------------------------------
      // MATERIAL
      // ------------------------------------

      const materialTextures = this.gltf.materialsTextures[primitive.material]

      meshDescriptor.parameters.samplers = []
      meshDescriptor.parameters.textures = []

      materialTextures.textures.forEach((t) => {
        meshDescriptor.textures.push({
          texture: t.texture.options.name,
          sampler: t.sampler.name,
        })

        const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === t.sampler.uuid)

        if (!samplerExists) {
          meshDescriptor.parameters.samplers.push(t.sampler)
        }

        meshDescriptor.parameters.textures.push(t.texture)
      })

      const material = this.gltf.materials[primitive.material]
      //console.log(material)

      meshDescriptor.parameters.cullMode = material.doubleSided ? 'none' : 'back'

      if (material.alphaMode === 'BLEND') {
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
        ...(material.pbrMetallicRoughness &&
          material.pbrMetallicRoughness.metallicFactor && {
            metallicFactor: {
              type: 'f32',
              value: material.pbrMetallicRoughness.metallicFactor,
            },
          }),
        ...(material.pbrMetallicRoughness &&
          material.pbrMetallicRoughness.roughnessFactor && {
            roughnessFactor: {
              type: 'f32',
              value: material.pbrMetallicRoughness.roughnessFactor,
            },
          }),
        ...(material.occlusionTexture &&
          material.occlusionTexture.strength && {
            occlusionStrength: {
              type: 'f32',
              value: material.occlusionTexture.strength,
            },
          }),
        ...(!!meshDescriptor.textures.find((t) => t.texture === 'emissiveTexture' || material.emissiveFactor) && {
          emissiveFactor: {
            type: 'vec3f',
            value: material.emissiveFactor !== undefined ? material.emissiveFactor : [1, 1, 1],
          },
        }),
      }

      if (Object.keys(materialUniformStruct).length) {
        meshDescriptor.parameters.uniforms = {
          material: {
            struct: materialUniformStruct,
          },
        }
      }

      // instances matrices storage
      if (instancesCount > 1) {
        const matrices = new Float32Array(instancesCount * 16)

        for (let i = 0; i < instancesCount; ++i) {
          matrices.set(nodes[i].worldMatrix.elements, i * 16)
        }

        meshDescriptor.parameters.storages = {
          instances: {
            struct: {
              instanceMatrix: {
                type: 'array<mat4x4f>',
                value: matrices,
              },
            },
          },
        }
      }

      // computed transformed bbox
      for (let i = 0; i < nodes.length; i++) {
        const tempBbox = geometryBBox.clone()
        const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix)

        boundingBox.min.min(transformedBbox.min)
        boundingBox.max.max(transformedBbox.max)
      }
    }

    return { scenes, boundingBox }
  }
}
