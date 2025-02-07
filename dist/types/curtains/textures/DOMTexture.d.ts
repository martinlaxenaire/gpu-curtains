import { GPUCurtainsRenderer } from '../renderers/GPUCurtainsRenderer';
import { TextureSource } from '../../types/Textures';
import { GPUCurtains } from '../GPUCurtains';
import { DOMProjectedMesh } from '../../core/renderers/GPURenderer';
import { MediaTexture, MediaTextureParams } from '../../core/textures/MediaTexture';
import { Texture } from '../../core/textures/Texture';
/** Parameters used to create a {@link DOMTexture}. */
export interface DOMTextureParams extends Omit<MediaTextureParams, 'useTransform' | 'viewDimension'> {
}
/**
 * Used to create {@link GPUTexture} or {@link GPUExternalTexture}, specially made to handle different kinds of DOM elements {@link TextureSource | sources}, like {@link HTMLImageElement}, {@link HTMLVideoElement} or {@link HTMLCanvasElement}.
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
 * // create a DOM texture
 * const imageTexture = new DOMTexture(gpuCurtains, {
 *   label: 'My image texture',
 *   name: 'imageTexture',
 * })
 *
 * // load an image
 * await imageTexture.loadImage(document.querySelector('img'))
 * ```
 */
export declare class DOMTexture extends MediaTexture {
    #private;
    /** {@link GPUCurtainsRenderer} used by this {@link DOMTexture}. */
    renderer: GPUCurtainsRenderer;
    /** {@link DOMProjectedMesh} mesh if any. */
    private _mesh;
    /**
     * DOMTexture constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
     * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
     */
    constructor(renderer: GPUCurtainsRenderer | GPUCurtains, parameters?: DOMTextureParams);
    /**
     * Get our texture parent {@link mesh} if any.
     */
    get mesh(): DOMProjectedMesh | null;
    /**
     * Set our texture parent {@link mesh}.
     * @param value - texture parent {@link mesh} to set.
     */
    set mesh(value: DOMProjectedMesh | null);
    /**
     * Update the {@link modelMatrix}.
     */
    updateModelMatrix(): void;
    /**
     * Set our source size and update the {@link modelMatrix}.
     */
    setSourceSize(): void;
    /**
     * Resize our {@link DOMTexture}.
     */
    resize(): void;
    /**
     * Get our unique source, since {@link DOMTexture} have a fixed '2d' view dimension.
     * @returns - Our unique source, i.e. first element of {@link sources} array if it exists.
     * @readonly
     */
    get source(): TextureSource;
    /**
     * Copy a {@link DOMTexture}.
     * @param texture - {@link DOMTexture} to copy.
     */
    copy(texture: Texture | MediaTexture | DOMTexture): void;
    /**
     * Destroy the {@link DOMTexture}.
     */
    destroy(): void;
}
