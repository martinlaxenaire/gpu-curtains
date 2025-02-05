const GL = WebGLRenderingContext;
const GLB_MAGIC = 1179937895;
const CHUNK_TYPE = {
  JSON: 1313821514,
  BIN: 5130562
};
const DEFAULT_TRANSLATION = [0, 0, 0];
const DEFAULT_ROTATION = [0, 0, 0, 1];
const DEFAULT_SCALE = [1, 1, 1];
const absUriRegEx = typeof window !== "undefined" && new RegExp(`^${window.location.protocol}`, "i") || RegExp(`^(http|https):`, "i");
const dataUriRegEx = /^data:/;
class GLTFLoader {
  /**
   * {@link GLTFLoader} constructor.
   */
  constructor() {
    this.gltf = null;
  }
  /**
   * Build the absolute uri of the resource
   * @param uri - uri of the resource
   * @param baseUrl - base url from which to get all the other assets.
   * @returns - absolute uri of the resource
   */
  static resolveUri(uri, baseUrl) {
    if (!!uri.match(absUriRegEx) || !!uri.match(dataUriRegEx)) {
      return uri;
    }
    return baseUrl + uri;
  }
  /**
   * Load a glTF from the given url.
   * @param url - url of the glTF.
   * @returns - the {@link GPUCurtainsGLTF} created.
   */
  async loadFromUrl(url) {
    const i = url.lastIndexOf("/");
    const baseUrl = i !== 0 ? url.substring(0, i + 1) : "";
    const response = await fetch(url);
    if (url.endsWith(".gltf")) {
      return this.loadFromJson(await response.json(), baseUrl);
    } else if (url.endsWith(".glb")) {
      return this.loadFromBinary(await response.arrayBuffer(), baseUrl);
    } else {
      throw new Error("Unrecognized file extension");
    }
  }
  /**
   * Parse a {@link GLTF.IGLTF | glTF json} and create our {@link gltf} base object.
   * @param json - already parsed JSON content.
   * @param baseUrl - base url from which to get all the other assets.
   * @param binaryChunk - optional binary chunks.
   * @returns - {@link gltf} base object.
   */
  async loadFromJsonBase(json, baseUrl, binaryChunk = null) {
    if (!baseUrl) {
      throw new Error("baseUrl must be specified.");
    }
    if (!json.asset) {
      throw new Error("Missing asset description.");
    }
    if (json.asset.minVersion !== "2.0" && json.asset.version !== "2.0") {
      throw new Error("Incompatible asset version.");
    }
    for (const accessor of json.accessors) {
      accessor.byteOffset = accessor.byteOffset ?? 0;
      accessor.normalized = accessor.normalized ?? false;
    }
    for (const bufferView of json.bufferViews) {
      bufferView.byteOffset = bufferView.byteOffset ?? 0;
    }
    for (const node of json.nodes) {
      if (!node.matrix) {
        node.rotation = node.rotation ?? DEFAULT_ROTATION;
        node.scale = node.scale ?? DEFAULT_SCALE;
        node.translation = node.translation ?? DEFAULT_TRANSLATION;
      }
    }
    if (json.samplers) {
      for (const sampler of json.samplers) {
        sampler.wrapS = sampler.wrapS ?? GL.REPEAT;
        sampler.wrapT = sampler.wrapT ?? GL.REPEAT;
      }
    }
    const pendingBuffers = [];
    if (binaryChunk) {
      pendingBuffers.push(Promise.resolve(binaryChunk));
    } else {
      for (const index in json.buffers) {
        const buffer = json.buffers[index];
        const uri = GLTFLoader.resolveUri(buffer.uri, baseUrl);
        pendingBuffers[index] = fetch(uri).then((response) => response.arrayBuffer());
      }
    }
    const pendingImages = [];
    for (let index = 0; index < json.images?.length || 0; ++index) {
      const image = json.images[index];
      if (image.uri) {
        if (image.uri.includes(".webp")) {
          pendingImages[index] = new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => {
              createImageBitmap(img, { colorSpaceConversion: "none" }).then(resolve).catch(reject);
            };
            img.onerror = reject;
            img.src = GLTFLoader.resolveUri(image.uri, baseUrl);
          });
        } else {
          pendingImages[index] = fetch(GLTFLoader.resolveUri(image.uri, baseUrl)).then(async (response) => {
            return createImageBitmap(await response.blob(), {
              colorSpaceConversion: "none"
            });
          });
        }
      } else {
        const bufferView = json.bufferViews[image.bufferView];
        pendingImages[index] = pendingBuffers[bufferView.buffer].then((buffer) => {
          const blob = new Blob([new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength)], {
            type: image.mimeType
          });
          if (image.mimeType === "image/webp") {
            return new Promise((resolve, reject) => {
              const img = new Image();
              img.crossOrigin = "anonymous";
              img.src = URL.createObjectURL(blob);
              img.onload = () => {
                createImageBitmap(img, { colorSpaceConversion: "none" }).then((bitmap) => {
                  URL.revokeObjectURL(img.src);
                  resolve(bitmap);
                }).catch(reject);
              };
              img.onerror = (err) => {
                URL.revokeObjectURL(img.src);
                reject(err);
              };
            });
          } else {
            return createImageBitmap(blob, {
              colorSpaceConversion: "none"
            });
          }
        });
      }
    }
    return {
      ...json,
      arrayBuffers: await Promise.all(pendingBuffers),
      imagesBitmaps: await Promise.all(pendingImages)
    };
  }
  /**
   * Load a glTF from a .glb file.
   * @param arrayBuffer - {@link ArrayBuffer} containing the data.
   * @param baseUrl - base url from which to get all the other assets.
   * @returns - the {@link GPUCurtainsGLTF} created.
   */
  async loadFromBinary(arrayBuffer, baseUrl) {
    const headerView = new DataView(arrayBuffer, 0, 12);
    const magic = headerView.getUint32(0, true);
    const version = headerView.getUint32(4, true);
    const length = headerView.getUint32(8, true);
    if (magic !== GLB_MAGIC) {
      throw new Error("Invalid magic string in binary header.");
    }
    if (version !== 2) {
      throw new Error("Incompatible version in binary header.");
    }
    const chunks = {};
    let chunkOffset = 12;
    while (chunkOffset < length) {
      const chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8);
      const chunkLength = chunkHeaderView.getUint32(0, true);
      const chunkType = chunkHeaderView.getUint32(4, true);
      chunks[chunkType] = arrayBuffer.slice(chunkOffset + 8, chunkOffset + 8 + chunkLength);
      chunkOffset += chunkLength + 8;
    }
    if (!chunks[CHUNK_TYPE.JSON]) {
      throw new Error("File contained no json chunk.");
    }
    const decoder = new TextDecoder("utf-8");
    const jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON]);
    return this.loadFromJson(JSON.parse(jsonString), baseUrl, chunks[CHUNK_TYPE.BIN]);
  }
  /**
   * Load the glTF json, parse the data and create our {@link GPUCurtainsGLTF} object.
   * @param json - already parsed JSON content.
   * @param baseUrl - base url from which to get all the other assets.
   * @param binaryChunk - optional binary chunks.
   * @returns - the {@link GPUCurtainsGLTF} created.
   */
  async loadFromJson(json, baseUrl, binaryChunk = null) {
    this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk);
    return this.gltf;
  }
}

export { GLTFLoader };
