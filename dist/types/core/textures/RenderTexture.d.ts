/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { TextureBinding } from '../bindings/TextureBinding';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RectSize } from '../DOM/DOMElement';
import { BindingMemoryAccessType, TextureBindingType } from '../bindings/Binding';
import { Texture } from './Texture';
import { TextureSize } from '../../types/Textures';
export type RenderTextureBindingType = Exclude<TextureBindingType, 'externalTexture'>;
/**
 * Base parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureBaseParams {
    /** The label of the {@link RenderTexture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link RenderTexture} to use in the [binding]{@link TextureBinding} */
    name?: string;
    /** Optional size of the [texture]{@link RenderTexture#texture} */
    size?: TextureSize;
    /** Whether to use this [texture]{@link RenderTexture} as a regular or storage texture */
    usage?: RenderTextureBindingType;
    /** Optional format of the [texture]{@link RenderTexture#texture}, mainly used for storage textures */
    format?: GPUTextureFormat;
    /** Optional texture binding memory access type, mainly used for storage textures */
    access?: BindingMemoryAccessType;
    /** Optional [texture]{@link RenderTexture#texture} view dimension to use */
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
 * RenderTexture class:
 * Used to create [textures]{@link GPUTexture} that can be used as copy source/destination for [render passes]{@link RenderPass} and [render targets]{@link RenderTarget}.
 * Basically useful for copying anything outputed to the screen at one point or another.
 */
export declare class RenderTexture {
    /** [renderer]{@link Renderer} used by this {@link RenderTexture} */
    renderer: Renderer;
    /** The type of the {@link RenderTexture} */
    type: string;
    /** The universal unique id of this {@link RenderTexture} */
    readonly uuid: string;
    /** The {@link GPUTexture} used */
    texture: GPUTexture;
    /** Size of the [texture]{@link RenderTexture#texture} source, usually our [renderer pixel ratio bounding rect]{@link Renderer#pixelRatioBoundingRect} */
    size: TextureSize;
    /** Options used to create this {@link RenderTexture} */
    options: RenderTextureParams;
    /** Array of [struct]{@link Binding} that will actually only hold one [texture binding]{@link TextureBinding} */
    bindings: BindGroupBindingElement[];
    /** Whether to update the [bind group]{@link BindGroup} to which the [texture binding]{@link TextureBinding} belongs */
    shouldUpdateBindGroup: boolean;
    /**
     * RenderTexture constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - [parameters]{@link RenderTextureParams} used to create this {@link RenderTexture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: RenderTextureParams);
    /**
     * Set the [size]{@link RenderTexture#size}
     * @param size - [size]{@link TextureSize} to set, the [renderer bounding rectangle]{@link Renderer#pixelRatioBoundingRect} width and height and 1 for depth if null
     */
    setSize(size?: TextureSize | null): void;
    /**
     * Copy another {@link RenderTexture} into this {@link RenderTexture}
     * @param texture - {@link RenderTexture} to copy
     */
    copy(texture: RenderTexture | Texture): void;
    /**
     * Create the [texture]{@link GPUTexture} (or copy it from source) and update the [binding resource]{@link TextureBinding#resource}
     */
    createTexture(): void;
    /**
     * Set our [struct]{@link RenderTexture#bindings}
     */
    setBindings(): void;
    /**
     * Get our [texture binding]{@link TextureBinding}
     * @readonly
     */
    get textureBinding(): TextureBinding;
    /**
     * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the [bind group]{@link BindGroup} to update
     * @param size - the optional new [size]{@link RectSize} to set
     */
    resize(size?: RectSize | null): void;
    /**
     * Destroy our {@link RenderTexture}
     */
    destroy(): void;
}
