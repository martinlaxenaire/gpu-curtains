/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { TextureBindings } from '../bindings/TextureBindings';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { RectSize } from '../DOM/DOMElement';
/**
 * Base parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureBaseParams {
    /** The label of the {@link RenderTexture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link RenderTexture} to use in the [binding]{@link TextureBindings} */
    name?: string;
}
/**
 * Parameters used to create a {@link RenderTexture}
 */
export interface RenderTextureParams extends RenderTextureBaseParams {
    /** Optional {@link RenderTexture} to use as a copy source input */
    fromTexture?: RenderTexture | null;
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
    /** The {@link GPUTexture} used */
    texture: GPUTexture;
    /** Size of the [texture]{@link RenderTexture#texture} source, usually our [renderer pixel ratio bounding rect]{@link Renderer#pixelRatioBoundingRect} */
    size: RectSize;
    /** Options used to create this {@link RenderTexture} */
    options: RenderTextureParams;
    /** Array of [bindings]{@link Bindings} that will actually only hold one [texture binding]{@link TextureBindings} */
    bindings: BindGroupBindingElement[];
    /** Whether to update the [bind group]{@link BindGroup} to which the [texture binding]{@link TextureBindings} belongs */
    shouldUpdateBindGroup: boolean;
    /**
     * RenderTexture constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - [parameters]{@link RenderTextureParams} used to create this {@link RenderTexture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: RenderTextureParams);
    /**
     * Set the [size]{@link RenderTexture#size}
     */
    setSourceSize(): void;
    /**
     * Create the [texture]{@link GPUTexture} (or copy it from source) and update the [binding resource]{@link TextureBindings#resource}
     */
    createTexture(): void;
    /**
     * Set our [bindings]{@link RenderTexture#bindings}
     */
    setBindings(): void;
    /**
     * Get our [texture binding]{@link TextureBindings}
     * @readonly
     */
    get textureBinding(): TextureBindings;
    /**
     * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the [bind group]{@link BindGroup} to update
     */
    resize(): void;
    /**
     * Destroy our {@link RenderTexture}
     */
    destroy(): void;
}
