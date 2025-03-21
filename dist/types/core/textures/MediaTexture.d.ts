/// <reference types="@webgpu/types" />
import { Texture, TextureBaseParams, TextureParams } from './Texture';
import { Renderer } from '../renderers/utils';
import { MediaTextureBaseParams, TextureSize, TextureSource, TextureSourceType } from '../../types/Textures';
import { Vec2 } from '../../math/Vec2';
import { Mat3 } from '../../math/Mat3';
import { BufferBinding } from '../bindings/BufferBinding';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { DOMTexture } from '../../curtains/textures/DOMTexture';
/** Parameters used to create a {@link MediaTexture}. */
export interface MediaTextureParams extends TextureBaseParams, MediaTextureBaseParams {
}
/** Options used to create this {@link MediaTexture}. */
export interface MediaTextureOptions extends TextureParams, MediaTextureParams {
    /** {@link Texture} sources. */
    sources: Array<TextureSource | string | MediaProvider>;
    /** {@link Texture} sources type. */
    sourcesTypes: TextureSourceType[];
}
/** Define a {@link MediaTexture} source. */
export interface MediaTextureSource {
    /** Original {@link TextureSource} to use. */
    source: TextureSource;
    /** {@link VideoFrame} to use with external textures, or `null`. */
    externalSource: VideoFrame | null;
    /** Whether we should update the {@link GPUTexture} for this source. */
    shouldUpdate: boolean;
    /** Whether the source has been loaded. */
    sourceLoaded: boolean;
    /** Whether the source has been uploaded to the GPU. */
    sourceUploaded: boolean;
}
/**
 * This class extends the {@link Texture} class specifically to handle external sources such as images, videos or canvases. It can be used with {@link core/computePasses/ComputePass.ComputePass | ComputePass} and/or any kind of {@link core/meshes/Mesh.Mesh | Mesh}.
 *
 * Can also handle texture transformations using a {@link Mat3} if the {@link MediaTextureParams#useTransform | useTransform parameter} has been set to `true` upon creation.
 *
 * If you use transformations, the {@link modelMatrix} will be available in the shaders using `texturesMatrices.${texture.options.name}.matrix`.
 *
 * The library provide a convenient helpers in the shaders to help you compute the transformed UV:
 *
 * ```wgsl
 * // assuming 'uv' is a valid vec2f containing the original UV and the texture name is 'meshTexture'
 * uv = getUVCover(uv, texturesMatrices.meshTexture.matrix);
 * ```
 *
 * @example
 * ```javascript
 * // assuming 'renderer' is a valid GPURenderer
 *
 * // create a simple media texture
 * const mediaTexture = new MediaTexture(renderer, {
 *   label: 'Media texture',
 *   name: 'mediaTexture',
 * })
 *
 * mediaTexture.loadImage('path/to/image.jpg')
 *
 * // create a cube map texture
 * const cubeMapTexture = new MediaTexture(renderer, {
 *   label: 'Cube map texture',
 *   name: 'cubeMapTexture',
 *   viewDimension: 'cube',
 * })
 *
 * cubeMapTexture.loadImages([
 *   'path/to/positive-x.jpg',
 *   'path/to/negative-x.jpg',
 *   'path/to/positive-y.jpg',
 *   'path/to/negative-y.jpg',
 *   'path/to/positive-z.jpg',
 *   'path/to/negative-z.jpg',
 * ])
 * ```
 */
export declare class MediaTexture extends Texture {
    #private;
    /** The {@link GPUExternalTexture} used if any. */
    externalTexture: null | GPUExternalTexture;
    /** The {@link MediaTexture} sources to use if any. */
    sources: MediaTextureSource[];
    /** Size of the {@link MediaTexture#texture | texture} source, usually our {@link sources} first element size (since for cube maps, all sources must have the same size). */
    size: TextureSize;
    /** Options used to create this {@link MediaTexture}. */
    options: MediaTextureOptions;
    /** Array of {@link HTMLVideoElement.requestVideoFrameCallback | requestVideoFrameCallback} returned ids if used. */
    videoFrameCallbackIds: Map<number, null | number>;
    /** {@link Vec2} offset to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
    offset: Vec2;
    /** {@link Vec2} scale to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
    scale: Vec2;
    /** {@link Vec2} transformation origin to use when applying the transformations to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. A value of (0.5, 0.5) corresponds to the center of the texture. Default is (0, 0), the upper left. */
    transformOrigin: Vec2;
    /** {@link Mat3} transformation matrix to apply to the {@link Texture} if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
    modelMatrix: Mat3;
    /** {@link BufferBinding} to send the transformation matrix to the shaders if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`. */
    transformBinding?: BufferBinding | null;
    /** function assigned to the {@link onSourceLoaded} callback */
    _onSourceLoadedCallback: (source: TextureSource) => void;
    /** function assigned to the {@link onAllSourcesLoaded} callback */
    _onAllSourcesLoadedCallback: () => void;
    /** function assigned to the {@link onSourceUploaded} callback */
    _onSourceUploadedCallback: (source: TextureSource) => void;
    /** function assigned to the {@link onAllSourcesUploaded} callback */
    _onAllSourcesUploadedCallback: () => void;
    /**
     * Texture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}.
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}.
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: MediaTextureParams);
    /**
     * Get whether all our {@link sources} have been loaded.
     */
    get sourcesLoaded(): boolean;
    /**
     * Set whether all our {@link sources} have been loaded.
     * @param value - boolean flag indicating if all the {@link sources} have been loaded.
     */
    set sourcesLoaded(value: boolean);
    /**
     * Get whether all our {@link sources} have been uploaded.
     */
    get sourcesUploaded(): boolean;
    /**
     * Set whether all our {@link sources} have been uploaded.
     * @param value - boolean flag indicating if all the {@link sources} have been uploaded
     */
    set sourcesUploaded(value: boolean);
    /**
     * Get the actual {@link rotation} value.
     * @returns - the actual {@link rotation} value.
     */
    get rotation(): number;
    /**
     * Set the actual {@link rotation} value and update the {@link modelMatrix}.
     * @param value - new {@link rotation} value to use.
     */
    set rotation(value: number);
    /**
     * Update the {@link modelMatrix} using the {@link offset}, {@link rotation}, {@link scale} and {@link transformOrigin} and tell the {@link transformBinding} to update, only if {@link MediaTextureParams#useTransform | useTransform} parameter has been set to `true`.
     */
    updateModelMatrix(): void;
    /**
     * Set our {@link Texture#bindings | bindings}.
     */
    setBindings(): void;
    /**
     * Copy another {@link Texture} into this {@link Texture}.
     * @param texture - {@link Texture} to copy.
     */
    copy(texture: Texture | MediaTexture | DOMTexture): void;
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}.
     */
    createTexture(): void;
    /**
     * Resize our {@link MediaTexture}.
     */
    resize(): void;
    /**
     * Set the {@link size} based on the first available loaded {@link sources}.
     */
    setSourceSize(): void;
    /**
     * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link MediaTextureSource.source | source}.
     * @param url - URL of the image to load.
     * @returns - the newly created {@link ImageBitmap}.
     */
    loadImageBitmap(url: string): Promise<ImageBitmap>;
    /**
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link MediaTextureSource.source | source} and create the {@link GPUTexture}.
     * @param source - the image URL or {@link HTMLImageElement} to load.
     */
    loadImage(source: string | HTMLImageElement): Promise<void>;
    /**
     * Use an already loaded {@link ImageBitmap} as a {@link sources}.
     * @param imageBitmap - {@link ImageBitmap} to use.
     * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
     */
    useImageBitmap(imageBitmap: ImageBitmap, sourceIndex?: number): void;
    /**
     * Load and create images using {@link loadImage} from an array of images sources as strings or {@link HTMLImageElement}. Useful for cube maps.
     * @param sources - Array of images sources as strings or {@link HTMLImageElement} to load.
     */
    loadImages(sources: Array<string | HTMLImageElement>): Promise<void>;
    /**
     * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
     */
    uploadVideoTexture(): void;
    /**
     * Close an external source {@link VideoFrame} if any.
     */
    closeVideoFrame(): void;
    /**
     * Set our {@link MediaTextureSource.shouldUpdate | source shouldUpdate} flag to true at each new video frame.
     */
    onVideoFrameCallback(sourceIndex?: number): void;
    /**
     * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the {@link HTMLVideoElement} as a {@link MediaTextureSource.source} and create the {@link GPUTexture} or {@link GPUExternalTexture}.
     * @param video - the newly loaded {@link HTMLVideoElement}.
     * @param sourceIndex - Index of the {@link HTMLVideoElement} in the {@link sources} array.
     */
    onVideoLoaded(video: HTMLVideoElement, sourceIndex?: number): void;
    /**
     * Get whether the provided source is a video.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the source is a video or not.
     */
    isVideoSource(source: TextureSource): source is HTMLVideoElement;
    /**
     * Get whether the provided video source is ready to be played.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the video source is ready to be played.
     */
    isVideoSourceReady(source: TextureSource): boolean;
    /**
     * Get whether the provided video source is ready to be uploaded.
     * @param source - {@link TextureSource} to check.
     * @returns - Whether the video source is ready to be uploaded.
     */
    shouldUpdateVideoSource(source: TextureSource): boolean;
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback.
     * @param source - the video URL or {@link HTMLVideoElement} to load.
     */
    loadVideo(source: string | HTMLVideoElement): void;
    /**
     * Use a {@link HTMLVideoElement} as a {@link sources}.
     * @param video - {@link HTMLVideoElement} to use.
     * @param sourceIndex - Index at which to insert the source in the {@link sources} array in case of cube map.
     */
    useVideo(video: HTMLVideoElement, sourceIndex?: number): void;
    /**
     * Load and create videos using {@link loadVideo} from an array of videos sources as strings or {@link HTMLVideoElement}. Useful for cube maps.
     * @param sources - Array of images sources as strings or {@link HTMLVideoElement} to load.
     */
    loadVideos(sources: Array<string | HTMLVideoElement>): void;
    /**
     * Load a {@link HTMLCanvasElement} and use it as one of our {@link sources}.
     * @param source - the {@link HTMLCanvasElement} to use.
     */
    loadCanvas(source: HTMLCanvasElement): void;
    /**
     * Load an array of {@link HTMLCanvasElement} using {@link loadCanvas} . Useful for cube maps.
     * @param sources - Array of {@link HTMLCanvasElement} to load.
     */
    loadCanvases(sources: HTMLCanvasElement[]): void;
    /**
     * Set the {@link MediaTextureSource.sourceUploaded | sourceUploaded} flag to true for the {@link MediaTextureSource.source | source} at a given index in our {@link sources} array. If all {@link sources} have been uploaded, set our {@link sourcesUploaded} flag to true.
     * @param sourceIndex - Index of the {@link MediaTextureSource.source | source} in the {@link sources} array.
     */
    setSourceUploaded(sourceIndex?: number): void;
    /**
     * Callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
     * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been loaded.
     * @returns - our {@link MediaTexture}
     */
    onSourceLoaded(callback: (source: TextureSource) => void): this;
    /**
     * Callback to run when all of the {@link MediaTextureSource.source | source} have been loaded.
     * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} have been loaded.
     * @returns - our {@link MediaTexture}
     */
    onAllSourcesLoaded(callback: () => void): this;
    /**
     * Callback to run when one of the {@link MediaTextureSource.source} has been uploaded to the GPU.
     * @param callback - callback to run when one of the {@link MediaTextureSource.source | source} has been uploaded to the GPU.
     * @returns - our {@link MediaTexture}.
     */
    onSourceUploaded(callback: (source: TextureSource) => void): this;
    /**
     * Callback to run when all of the {@link MediaTextureSource.source | source} have been uploaded to the GPU.
     * @param callback - callback to run when all of the {@link MediaTextureSource.source | sources} been uploaded to the GPU.
     * @returns - our {@link MediaTexture}.
     */
    onAllSourcesUploaded(callback: () => void): this;
    /**
     * Update a {@link MediaTexture} by uploading the {@link texture} if needed.
     * */
    update(): void;
    /**
     * Destroy the {@link MediaTexture}.
     */
    destroy(): void;
}
