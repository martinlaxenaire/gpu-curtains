/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { TextureBinding } from '../bindings/TextureBinding';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding';
import { Texture } from './Texture';
import { TextureSize } from '../../types/Textures';
/**
 * Define the possible binding types of a {@link RenderTexture}
 */
export type RenderTextureBindingType = Exclude<TextureBindingType, 'externalTexture'>;
/**
 * Base parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureBaseParams {
    /** The label of the {@link RenderTexture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link RenderTexture} to use in the {@link TextureBinding | texture binding} */
    name?: string;
    /** Optional size of the {@link RenderTexture#texture | texture} */
    size?: TextureSize;
    /** Whether to use this {@link RenderTexture} as a regular or storage texture */
    usage?: RenderTextureBindingType;
    /** Optional format of the {@link RenderTexture#texture | texture}, mainly used for storage textures */
    format?: GPUTextureFormat;
    /** Optional texture binding memory access type, mainly used for storage textures */
    access?: BindingMemoryAccessType;
    /** Optional {@link RenderTexture#texture | texture} view dimension to use */
    viewDimension?: GPUTextureViewDimension;
}
/**
 * Parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureParams extends RenderTextureBaseParams {
    /** Optional texture to use as a copy source input. Could be a {@link RenderTexture} or {@link Texture} */
    fromTexture?: RenderTexture | Texture | null;
}
/**
 * Used to create {@link GPUTexture | texture} that can be used as copy source/destination for {@link core/renderPasses/RenderPass.RenderPass | RenderPass} and {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget}.<br >
 * Basically useful for copying anything outputted to the screen at one point or another.
 *
 * Will create a {@link GPUTexture} and its associated {@link TextureBinding}.
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
 * const renderTexture = new RenderTexture(gpuCurtains, {
 *   label: 'My render texture',
 *   name: 'renderTexture',
 * })
 * ```
 */
export declare class RenderTexture {
    /** {@link Renderer | renderer} used by this {@link RenderTexture} */
    renderer: Renderer;
    /** The type of the {@link RenderTexture} */
    type: string;
    /** The universal unique id of this {@link RenderTexture} */
    readonly uuid: string;
    /** The {@link GPUTexture} used */
    texture: GPUTexture;
    /** Size of the {@link RenderTexture#texture | texture} source, usually our {@link Renderer#pixelRatioBoundingRect | renderer pixel ratio bounding rect} */
    size: TextureSize;
    /** Options used to create this {@link RenderTexture} */
    options: RenderTextureParams;
    /** Array of {@link core/bindings/Binding.Binding | bindings} that will actually only hold one {@link TextureBinding | texture binding} */
    bindings: BindGroupBindingElement[];
    /**
     * RenderTexture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTexture}
     * @param parameters - {@link RenderTextureParams | parameters} used to create this {@link RenderTexture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: RenderTextureParams);
    /**
     * Copy another {@link RenderTexture} into this {@link RenderTexture}
     * @param texture - {@link RenderTexture} to copy
     */
    copy(texture: RenderTexture | Texture): void;
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
     */
    createTexture(): void;
    /**
     * Set our {@link RenderTexture#bindings | bindings}
     */
    setBindings(): void;
    /**
     * Get our {@link TextureBinding | texture binding}
     * @readonly
     */
    get textureBinding(): TextureBinding;
    /**
     * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update
     * @param size - the optional new {@link RectSize | size} to set
     */
    resize(size?: TextureSize | null): void;
    /**
     * Destroy our {@link RenderTexture}
     */
    destroy(): void;
}
