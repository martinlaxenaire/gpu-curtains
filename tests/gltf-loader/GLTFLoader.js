import { Sampler, Texture, Object3D, Box3, Vec3, Geometry, IndexedGeometry } from '../../dist/esm/index.mjs'
import { GLTFScenesManager } from './GLTFScenesManager.js'

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

  async loadFromJson(json, baseUrl, binaryChunk) {
    // Load the glTF file
    this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk)

    this.gltf.materialsTextures = []
    if (this.gltf.materials) {
      for (let i = 0; i < this.gltf.materials.length; i++) {
        this.gltf.materialsTextures[i] = {
          material: i,
          textures: [],
        }
      }
    }

    this.gltf.gpuSamplers = []
    if (this.gltf.samplers) {
      for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
        const descriptor = {
          name: 'gltfSampler' + index, // TODO better name?
          addressModeU: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
          addressModeV: GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT),
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

    if (this.gltf.materials) {
      for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
        const materialTextures = this.gltf.materialsTextures[materialIndex]

        if (material.pbrMetallicRoughness) {
          if (
            material.pbrMetallicRoughness.baseColorTexture &&
            material.pbrMetallicRoughness.baseColorTexture.index !== undefined
          ) {
            const index = parseInt(material.pbrMetallicRoughness.baseColorTexture.index)
            const image = this.gltf.images[this.gltf.textures[index].source]

            const texture = this.createTexture(material, image, 'baseColorTexture')
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
            const image = this.gltf.images[this.gltf.textures[index].source]

            const texture = this.createTexture(material, image, 'metallicRoughnessTexture')
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

            materialTextures.textures.push({
              texture,
              sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
            })
          }
        }

        if (material.normalTexture && material.normalTexture.index !== undefined) {
          const index = parseInt(material.normalTexture.index)
          const image = this.gltf.images[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'normalTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.textures.push({
            texture,
            sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
          })
        }

        if (material.occlusionTexture && material.occlusionTexture.index !== undefined) {
          const index = parseInt(material.occlusionTexture.index)
          const image = this.gltf.images[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'occlusionTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.textures.push({
            texture,
            sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
          })
        }

        if (material.emissiveTexture && material.emissiveTexture.index !== undefined) {
          const index = parseInt(material.emissiveTexture.index)
          const image = this.gltf.images[this.gltf.textures[index].source]

          const texture = this.createTexture(material, image, 'emissiveTexture')
          const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler

          materialTextures.textures.push({
            texture,
            sampler: this.gltf.gpuSamplers[samplerIndex ?? 0],
          })
        }
      }
    }

    return new GLTFScenesManager(this.renderer, this.gltf)
  }

  createTexture(material, image, name) {
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
}
