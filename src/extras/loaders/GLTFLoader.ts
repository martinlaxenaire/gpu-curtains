import { GLTF } from '../../types/gltf/GLTF'

/**
 * Defined the structure of the parsed result from the glTF json object.
 */
export interface GPUCurtainsGLTF extends GLTF.IGLTF {
  /** Array of {@link ArrayBuffer} used by the glTF. */
  arrayBuffers: ArrayBuffer[]
  /** Array of created {@link ImageBitmap}. */
  imagesBitmaps: ImageBitmap[]
}

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

const absUriRegEx =
  (typeof window !== 'undefined' && new RegExp(`^${window.location.protocol}`, 'i')) || RegExp(`^(http|https):`, 'i')
const dataUriRegEx = /^data:/

/**
 * Basic glTF loader class.
 *
 * Allow to load a glTF from an URI and create the associated {@link ArrayBuffer} and {@link ImageBitmap}.
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
export class GLTFLoader {
  /** The {@link GPUCurtainsGLTF} object result. */
  gltf: GPUCurtainsGLTF | null

  /**
   * {@link GLTFLoader} constructor.
   */
  constructor() {
    this.gltf = null
  }

  /**
   * Build the absolute uri of the resource
   * @param uri - uri of the resource
   * @param baseUrl - base url from which to get all the other assets.
   * @returns - absolute uri of the resource
   */
  static resolveUri(uri: string, baseUrl: string): string {
    if (!!uri.match(absUriRegEx) || !!uri.match(dataUriRegEx)) {
      return uri
    }
    return baseUrl + uri
  }

  /**
   * Load a glTF from the given url.
   * @param url - url of the glTF.
   * @returns - the {@link GPUCurtainsGLTF} created.
   * @async
   */
  async loadFromUrl(url: string): Promise<GPUCurtainsGLTF> {
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

  /**
   * Parse a {@link GLTF.IGLTF | glTF json} and create our {@link gltf} base object.
   * @param json - already parsed JSON content.
   * @param baseUrl - base url from which to get all the other assets.
   * @param binaryChunk - optional binary chunks.
   * @returns - {@link gltf} base object.
   * @async
   */
  async loadFromJsonBase(
    json: GLTF.IGLTF,
    baseUrl: string,
    binaryChunk: Record<string, ArrayBuffer> = null
  ): Promise<GPUCurtainsGLTF> {
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
        const uri = GLTFLoader.resolveUri(buffer.uri, baseUrl)
        pendingBuffers[index] = fetch(uri).then((response) => response.arrayBuffer())
      }
    }

    // Images
    const pendingImages = []
    for (let index = 0; index < json.images?.length || 0; ++index) {
      const image = json.images[index]
      if (image.uri) {
        pendingImages[index] = fetch(GLTFLoader.resolveUri(image.uri, baseUrl)).then(async (response) => {
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

    return {
      ...json,
      arrayBuffers: await Promise.all(pendingBuffers),
      imagesBitmaps: await Promise.all(pendingImages),
    } as GPUCurtainsGLTF
  }

  /**
   * Load a glTF from a .glb file.
   * @param arrayBuffer - {@link ArrayBuffer} containing the data.
   * @param baseUrl - base url from which to get all the other assets.
   * @returns - the {@link GPUCurtainsGLTF} created.
   * @async
   */
  async loadFromBinary(arrayBuffer: ArrayBuffer, baseUrl: string): Promise<GPUCurtainsGLTF> {
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

    const chunks = {}
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

  /**
   * Load the glTF json, parse the data and create our {@link GPUCurtainsGLTF} object.
   * @param json - already parsed JSON content.
   * @param baseUrl - base url from which to get all the other assets.
   * @param binaryChunk - optional binary chunks.
   * @returns - the {@link GPUCurtainsGLTF} created.
   * @async
   */
  async loadFromJson(
    json: GLTF.IGLTF,
    baseUrl: string,
    binaryChunk: Record<string, ArrayBuffer> = null
  ): Promise<GPUCurtainsGLTF> {
    // Load the glTF file
    this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk)
    return this.gltf
  }
}
