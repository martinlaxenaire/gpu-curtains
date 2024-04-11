/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { TextureBinding } from '../bindings/TextureBinding';
import { BufferBinding } from '../bindings/BufferBinding';
import { Object3D } from '../objects3D/Object3D';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { TextureOptions, TextureParams, TextureParent, TextureSize, TextureSource } from '../../types/Textures';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Used to create {@link GPUTexture} or {@link GPUExternalTexture} from different kinds of {@link TextureSource | sources}, like {@link HTMLImageElement}, {@link HTMLVideoElement} or {@link HTMLCanvasElement}.
 *
 * Handles the various sources loading and uploading, GPU textures creation,{@link BufferBinding | texture model matrix binding} and {@link TextureBinding | GPU texture binding}.
 *
 * @example
 * ```javascript
 * // set our main GPUCurtains instance
 * const gpuCurtains = new GPUCurtains({
 *   container: '#canvas' // selector of our WebGPU canvas container
 * })
 *
 * // set the GPU device
 * // note this is asynchronous
 * await gpuCurtains.setDevice()
 *
 * // create a render texture
 * const imageTexture = new Texture(gpuCurtains, {
 *   label: 'My image texture',
 *   name: 'imageTexture',
 * })
 *
 * // load an image
 * await imageTexture.loadImage(document.querySelector('img'))
 * ```
 */
export declare class Texture extends Object3D {
    #private;
    /** The type of the {@link Texture} */
    type: string;
    /** The universal unique id of this {@link Texture} */
    readonly uuid: string;
    /** {@link Renderer} used by this {@link Texture} */
    renderer: Renderer;
    /** The {@link GPUTexture} used if any */
    texture: null | GPUTexture;
    /** The {@link GPUExternalTexture} used if any */
    externalTexture: null | GPUExternalTexture;
    /** The {@link Texture} {@link TextureSource | source} to use */
    source: TextureSource;
    /** The {@link GPUTexture}, matching the {@link TextureSource | source} {@link core/DOM/DOMElement.RectSize | size} (with 1 for depth) */
    size: TextureSize;
    /** Options used to create this {@link Texture} */
    options: TextureOptions;
    /** A {@link BufferBinding | buffer binding} that will hold the texture model matrix */
    textureMatrix: BufferBinding;
    /** The bindings used by this {@link Texture}, i.e. its {@link textureMatrix} and its {@link TextureBinding | GPU texture binding} */
    bindings: BindGroupBindingElement[];
    /** {@link Texture} parentMesh if any */
    private _parentMesh;
    /** Whether the source has been loaded */
    private _sourceLoaded;
    /** Whether the source has been uploaded to the GPU, handled by the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#texturesQueue | GPUDeviceManager texturesQueue array} */
    private _sourceUploaded;
    /** Whether the texture should be uploaded to the GPU */
    shouldUpdate: boolean;
    /** {@link HTMLVideoElement.requestVideoFrameCallback | requestVideoFrameCallback} returned id if used */
    videoFrameCallbackId: null | number;
    /** function assigned to the {@link onSourceLoaded} callback */
    _onSourceLoadedCallback: () => void;
    /** function assigned to the {@link onSourceUploaded} callback */
    _onSourceUploadedCallback: () => void;
    /**
     * Texture constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: TextureParams);
    /**
     * Set our {@link bindings}
     */
    setBindings(): void;
    /**
     * Get our {@link TextureBinding | GPU texture binding}
     * @readonly
     */
    get textureBinding(): TextureBinding;
    /**
     * Get our texture {@link parentMesh}
     */
    get parentMesh(): TextureParent;
    /**
     * Set our texture {@link parentMesh}
     * @param value - texture {@link parentMesh} to set (i.e. any kind of {@link core/renderers/GPURenderer.RenderedMesh | Mesh}
     */
    set parentMesh(value: TextureParent);
    /**
     * Get whether our {@link source} has been loaded
     */
    get sourceLoaded(): boolean;
    /**
     * Set whether our {@link source} has been loaded
     * @param value - boolean flag indicating if the {@link source} has been loaded
     */
    set sourceLoaded(value: boolean);
    /**
     * Get whether our {@link source} has been uploaded
     */
    get sourceUploaded(): boolean;
    /**
     * Set whether our {@link source} has been uploaded
     * @param value - boolean flag indicating if the {@link source} has been uploaded
     */
    set sourceUploaded(value: boolean);
    /**
     * Set our texture {@link transforms} object
     */
    setTransforms(): void;
    /**
     * Update the {@link modelMatrix}
     */
    updateModelMatrix(): void;
    /**
     * If our {@link modelMatrix} has been updated, tell the {@link textureMatrix | texture matrix binding} to update as well
     */
    updateMatrixStack(): void;
    /**
     * Resize our {@link Texture}
     */
    resize(): void;
    /**
     * Get the number of mip levels create based on {@link size}
     * @param sizes - Array containing our texture width, height and depth
     * @returns - number of mip levels
     */
    getNumMipLevels(...sizes: number[]): number;
    /**
     * Tell the {@link Renderer} to upload or texture
     */
    uploadTexture(): void;
    /**
     * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the  {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
     */
    uploadVideoTexture(): void;
    /**
     * Copy a {@link Texture}
     * @param texture - {@link Texture} to copy
     */
    copy(texture: Texture): void;
    /**
     * Set the {@link texture | GPU texture}
     */
    createTexture(): void;
    /**
     * Set the {@link size} based on the {@link source}
     */
    setSourceSize(): void;
    /**
     * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}
     * @async
     * @param url - URL of the image to load
     * @returns - the newly created {@link ImageBitmap}
     */
    loadImageBitmap(url: string): Promise<ImageBitmap>;
    /**
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link source} and create the {@link GPUTexture}
     * @async
     * @param source - the image URL or {@link HTMLImageElement} to load
     * @returns - the newly created {@link ImageBitmap}
     */
    loadImage(source: string | HTMLImageElement): Promise<void>;
    /**
     * Set our {@link shouldUpdate} flag to true at each new video frame
     */
    onVideoFrameCallback(): void;
    /**
     * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
     * @param video - the newly loaded {@link HTMLVideoElement}
     */
    onVideoLoaded(video: HTMLVideoElement): void;
    /**
     * Get whether the {@link source} is a video
     * @readonly
     */
    get isVideoSource(): boolean;
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback
     * @param source - the video URL or {@link HTMLVideoElement} to load
     */
    loadVideo(source: string | HTMLVideoElement): void;
    /**
     * Load a {@link HTMLCanvasElement}, use it as a {@link source} and create the {@link GPUTexture}
     * @param source - the {@link HTMLCanvasElement} to use
     */
    loadCanvas(source: HTMLCanvasElement): void;
    /**
     * Callback to run when the {@link source} has been loaded
     * @param callback - callback to run when the {@link source} has been loaded
     * @returns - our {@link Texture}
     */
    onSourceLoaded(callback: () => void): Texture;
    /**
     * Callback to run when the {@link source} has been uploaded
     * @param callback - callback to run when the {@link source} been uploaded
     * @returns - our {@link Texture}
     */
    onSourceUploaded(callback: () => void): Texture;
    /**
     * Render a {@link Texture}:
     * - Update its {@link modelMatrix} and {@link bindings} if needed
     * - Upload the texture if it needs to be done
     */
    render(): void;
    /**
     * Destroy the {@link Texture}
     */
    destroy(): void;
}
