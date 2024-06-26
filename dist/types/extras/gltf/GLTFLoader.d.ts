import { GLTF } from '../../types/gltf/GLTF';
/**
 * Defined the structure of the parsed result from the glTF json object.
 */
export interface GPUCurtainsGLTF extends GLTF.IGLTF {
    /** Array of {@link ArrayBuffer} used by the glTF. */
    arrayBuffers: ArrayBuffer[];
    /** Array of created {@link ImageBitmap}. */
    imagesBitmaps: ImageBitmap[];
}
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
export declare class GLTFLoader {
    /** The {@link GPUCurtainsGLTF} object result. */
    gltf: GPUCurtainsGLTF | null;
    /**
     * {@link GLTFLoader} constructor.
     */
    constructor();
    /**
     * Build the absolute uri of the resource
     * @param uri - uri of the resource
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - absolute uri of the resource
     */
    static resolveUri(uri: string, baseUrl: string): string;
    /**
     * Load a glTF from the given url.
     * @param url - url of the glTF.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    loadFromUrl(url: string): Promise<GPUCurtainsGLTF>;
    /**
     * Parse a {@link GLTF.IGLTF | glTF json} and create our {@link gltf} base object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - {@link gltf} base object.
     * @async
     */
    loadFromJsonBase(json: GLTF.IGLTF, baseUrl: string, binaryChunk?: Record<string, ArrayBuffer>): Promise<GPUCurtainsGLTF>;
    /**
     * Load a glTF from a .glb file.
     * @param arrayBuffer - {@link ArrayBuffer} containing the data.
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    loadFromBinary(arrayBuffer: ArrayBuffer, baseUrl: string): Promise<GPUCurtainsGLTF>;
    /**
     * Load the glTF json, parse the data and create our {@link GPUCurtainsGLTF} object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    loadFromJson(json: GLTF.IGLTF, baseUrl: string, binaryChunk?: Record<string, ArrayBuffer>): Promise<GPUCurtainsGLTF>;
}
