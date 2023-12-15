/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { TextureBinding } from '../bindings/TextureBinding';
import { BufferBinding } from '../bindings/BufferBinding';
import { Object3D } from '../objects3D/Object3D';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { TextureOptions, TextureParams, TextureParent, TextureSize, TextureSource } from '../../types/Textures';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Texture class:
 * Used to create [textures]{@link GPUTexture} or [external textures]{@link GPUExternalTexture} from different kinds of [sources]{@link TextureSource}.
 * Handles the various sources loading and uploading, GPU textures creation, [texture matrix binding]{@link BufferBinding} and [texture binding]{@link TextureBinding}
 * @extends Object3D
 */
export declare class Texture extends Object3D {
    #private;
    /** The type of the {@link Texture} */
    type: string;
    /** The universal unique id of this {@link Texture} */
    readonly uuid: string;
    /** [renderer]{@link Renderer} used by this {@link Texture} */
    renderer: Renderer;
    /** The {@link GPUTexture} used if any */
    texture: null | GPUTexture;
    /** The {@link GPUExternalTexture} used if any */
    externalTexture: null | GPUExternalTexture;
    /** The {@link Texture} [source]{@link TextureSource} to use */
    source: TextureSource;
    /** The [texture]{@link GPUTexture}, matching the [texture source]{@link TextureSource} [size]{@link RectSize} with 1 for depth */
    size: TextureSize;
    /** Options used to create this {@link Texture} */
    options: TextureOptions;
    /** A [buffer binding]{@link BufferBinding} that will hold the texture matrix */
    textureMatrix: BufferBinding;
    /** The struct used by this {@link Texture}, i.e. its [texture matrix buffer binding]{@link Texture#textureMatrix} and its [texture binding]{@link TextureBinding} */
    bindings: BindGroupBindingElement[];
    /** {@link Texture} parent if any */
    private _parent;
    /** Whether the source has been loaded */
    private _sourceLoaded;
    /** Whether the source has been uploaded to the GPU, handled by the [renderer textures queue array]{@link Renderer#texturesQueue} */
    private _sourceUploaded;
    /** Whether the texture should be uploaded to the GPU */
    shouldUpdate: boolean;
    /** [Video frame callback]{@link requestVideoFrameCallback} returned id if used */
    videoFrameCallbackId: null | number;
    /** function assigned to the [onSourceLoaded]{@link Texture#onSourceLoaded} callback */
    _onSourceLoadedCallback: () => void;
    /** function assigned to the [onSourceUploaded]{@link Texture#onSourceUploaded} callback */
    _onSourceUploadedCallback: () => void;
    /**
     * Texture constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - [parameters]{@link TextureParams} used to create this {@link Texture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: TextureParams);
    /**
     * Set our [struct]{@link Texture#bindings}
     */
    setBindings(): void;
    /**
     * Get our [texture binding]{@link TextureBinding}
     * @readonly
     */
    get textureBinding(): TextureBinding;
    /**
     * Get/set our [texture parent]{@link Texture#_parent}
     * @readonly
     */
    get parent(): TextureParent;
    set parent(value: TextureParent);
    /**
     * Get/set whether our [texture source]{@link Texture#source} has loaded
     * @readonly
     */
    get sourceLoaded(): boolean;
    set sourceLoaded(value: boolean);
    /**
     * Get/set whether our [texture source]{@link Texture#source} has been uploaded
     * @readonly
     */
    get sourceUploaded(): boolean;
    set sourceUploaded(value: boolean);
    /**
     * Set our [texture transforms object]{@link Texture#transforms}
     */
    setTransforms(): void;
    /**
     * Update the [texture model matrix]{@link Texture#modelMatrix}
     */
    updateModelMatrix(): void;
    /**
     * Our [model matrix]{@link Texture#modelMatrix} has been updated, tell the [texture matrix binding]{@link Texture#textureMatrix} to update as well
     */
    onAfterMatrixStackUpdate(): void;
    /**
     * Resize our {@link Texture}
     */
    resize(): void;
    /**
     * Get the number of mip levels create based on [texture source size]{@link Texture#size}
     * @param sizes
     * @returns - number of mip levels
     */
    getNumMipLevels(...sizes: number[]): number;
    /**
     * Tell the {@link Renderer} to upload or texture
     */
    uploadTexture(): void;
    /**
     * Import an [external texture]{@link GPUExternalTexture} from the {@link Renderer}, update the [texture binding]{@link Texture#textureBinding} and its [bind group]{@link BindGroup}
     */
    uploadVideoTexture(): void;
    /**
     * Copy a [texture]{@link Texture}
     * @param texture - [texture]{@link Texture} to copy
     */
    copy(texture: Texture): void;
    /**
     * Set the [texture]{@link Texture#texture}
     */
    createTexture(): void;
    /**
     * Set the [size]{@link Texture#size} based on [texture source]{@link Texture#source}
     */
    setSourceSize(): void;
    /**
     * Load an [image]{@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a [texture source]{@link Texture#source}
     * @async
     * @param url - URL of the image to load
     * @returns - the newly created {@link ImageBitmap}
     */
    loadImageBitmap(url: string): Promise<ImageBitmap>;
    /**
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
     * @async
     * @param source - the image URL or {@link HTMLImageElement} to load
     * @returns - the newly created {@link ImageBitmap}
     */
    loadImage(source: string | HTMLImageElement): Promise<void>;
    /**
     * Set our [shouldUpdate]{@link Texture#shouldUpdate} flag to true at each new video frame
     */
    onVideoFrameCallback(): void;
    /**
     * Callback to run when a [video]{@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the [video]{@link HTMLVideoElement} as a [texture source]{@link Texture#source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
     * @param video - the newly loaded [video]{@link HTMLVideoElement}
     */
    onVideoLoaded(video: HTMLVideoElement): void;
    /**
     * Get whether the [texture source]{@link Texture#source} is a video
     * @readonly
     */
    get isVideoSource(): boolean;
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register [onVideoLoaded]{@link Texture#onVideoLoaded} callback
     * @param source - the video URL or {@link HTMLVideoElement} to load
     */
    loadVideo(source: string | HTMLVideoElement): void;
    /**
     * Load a [canvas]{@link HTMLCanvasElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
     * @param source
     */
    loadCanvas(source: HTMLCanvasElement): void;
    /**
     * Callback to run when the [texture source]{@link Texture#source} has loaded
     * @param callback - callback to run when the [texture source]{@link Texture#source} has loaded
     * @returns - our {@link Texture}
     */
    onSourceLoaded(callback: () => void): Texture;
    /**
     * Callback to run when the [texture source]{@link Texture#source} has been uploaded
     * @param callback - callback to run when the [texture source]{@link Texture#source} been uploaded
     * @returns - our {@link Texture}
     */
    onSourceUploaded(callback: () => void): Texture;
    /**
     * Render a {@link Texture}:
     * - Update its [model matrix]{@link Texture#modelMatrix} and [struct]{@link Texture#bindings} if needed
     * - Upload the texture if it needs to be done
     */
    render(): void;
    /**
     * Destroy the {@link Texture}
     */
    destroy(): void;
}
