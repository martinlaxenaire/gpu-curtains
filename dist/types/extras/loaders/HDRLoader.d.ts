/**
 * HDRImageData contains all decompressed image data.
 */
export interface HDRImageData {
    /** Width of the HDR image */
    width: number;
    /** Height of the HDR image */
    height: number;
    /** Exposure of the HDR image */
    exposure: number;
    /** Gamma of the HDR image */
    gamma: number;
    /** {@link Float32Array} holding the HDR image data */
    data: Float32Array;
}
/**
 * Basic glTF loader class.
 *
 * Allow to load an HDR file from an URI and returns a {@link HDRImageData} object containing the {@link Float32Array} data alongside width, height and other useful information.
 *
 * @example
 * ```javascript
 * const hdrLoader = new HDRLoader()
 * const hdr = await hdrLoader.loadFromUrl('path/to/environment.hdr')
 *
 * // assuming `renderer` is a valid Renderer
 * const envTexture = new Texture(renderer, {
 *   label: 'Environment texture',
 *   name: 'envTexture',
 *   visibility: ['fragment'],
 *   format: 'rgba16float',
 *   generateMips: true,
 *   fixedSize: {
 *     width: hdr.width,
 *     height: hdr.height,
 *   },
 * })
 *
 * envTexture.uploadData({
 *   data: hdr.data,
 * })
 * ```
 */
export declare class HDRLoader {
    #private;
    /**
     * Load and decode RGBE-encoded data to a flat list of floating point pixel data (RGBA).
     * @param url - The url of the .hdr file to load.
     * @returns - The {@link HDRImageData}.
     */
    loadFromUrl(url: string): Promise<HDRImageData>;
}
