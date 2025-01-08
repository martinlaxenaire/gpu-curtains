/// <reference types="dist" />
import { DOMTexture } from '../core/textures/DOMTexture';
import { RenderedMesh } from '../core/renderers/GPURenderer';
import { RectSize } from '../core/DOM/DOMElement';
import { BindingParams } from '../core/bindings/Binding';
/**
 * Defines the {@link GPUTexture} size. Depth default to 1 and could also be used for array layers.
 */
export interface TextureSize extends RectSize {
    /** Depth or array layers of the {@link GPUTexture} */
    depth?: number;
}
/**
 * Base parameters used to copy an external image to a texture, i.e. that will be uploaded to the GPU using {@link GPUQueue#copyExternalImageToTexture | copyExternalImageToTexture}
 */
export interface ExternalTextureParamsBase {
    /** Whether to generate mips. Default to `false`. */
    generateMips?: boolean;
    /** Whether to flip the source along the Y axis. Default to `false`. */
    flipY?: boolean;
    /** Whether this texture should be premultiplied or not. Default to `false`. */
    premultipliedAlpha?: boolean;
}
/**
 * Parameters used to copy an external image to a texture, i.e. that will be uploaded to the GPU using {@link GPUQueue#copyExternalImageToTexture | copyExternalImageToTexture}
 */
export interface ExternalTextureParams extends ExternalTextureParamsBase {
    /** The {@link GPUTexture.format | GPUTexture format} to use. Default to `'rgba8unorm'`. */
    format?: GPUTextureFormat;
    /** Solid color used by temporary texture to display while loading the source. Default to `[0, 0, 0, 255]` (solid black). */
    placeholderColor?: [number, number, number, number];
    /** Whether video textures should use {@link GPUExternalTexture} or not. Default to `true`. */
    useExternalTextures?: boolean;
    /** The {@link GPUTexture.createView().dimension | GPUTexture view dimension} to use. Default to `'2d'`. */
    viewDimension?: GPUTextureViewDimension;
    /** The texture shaders visibility sent to the {@link core/bindings/TextureBinding.TextureBinding | texture binding}. Default to `'fragment'`. */
    visibility?: BindingParams['visibility'];
    /** Whether to keep the {@link DOMTexture#texture | texture} in the {@link core/renderers/GPURenderer.GPURenderer | renderer} cache when a {@link core/materials/Material.Material | Material} tries to destroy it. Default to `true`. */
    cache?: boolean;
}
/**
 * Base parameters used to create a {@link DOMTexture}
 */
export interface DOMTextureBaseParams extends ExternalTextureParams {
    /** The label of the {@link DOMTexture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link DOMTexture} to use in the {@link core/bindings/Binding.Binding | binding} */
    name?: string;
}
/**
 * Parameters used to create a {@link DOMTexture}
 */
export interface DOMTextureParams extends DOMTextureBaseParams {
    /** Optional {@link DOMTexture} to use as a copy source input */
    fromTexture?: DOMTexture | null;
}
/** Allowed {@link DOMTexture} source to use */
export type TextureSource = GPUImageCopyExternalImageSource | null;
/** Allowed {@link DOMTexture} source type to use */
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null;
/**
 * Options used to create this {@link DOMTexture}
 */
export interface DOMTextureOptions extends DOMTextureParams {
    /** {@link DOMTexture} source */
    source: TextureSource | string;
    /** {@link DOMTexture} source type */
    sourceType: TextureSourceType;
}
/**
 * Allowed {@link DOMTexture} parentMesh (can be any type of Mesh)
 */
export type DOMTextureParent = null | RenderedMesh;
