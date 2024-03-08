/// <reference types="dist" />
import { Texture } from '../core/textures/Texture';
import { RenderedMesh } from '../core/renderers/GPURenderer';
import { RectSize } from '../core/DOM/DOMElement';
import { BindingParams } from '../core/bindings/Binding';
/**
 * Parameters used to copy an external image to texture, i.e. that will be uploaded to the GPU using {@link GPUQueue#copyExternalImageToTexture | copyExternalImageToTexture}
 */
export interface ExternalTextureParams {
    /** Whether to generate mips. Default to `false`. */
    generateMips?: boolean;
    /** Whether to flip the source along the Y axis. Default to `false`. */
    flipY?: boolean;
    /** The {@link GPUTextureFormat | texture format} to use. Default to `'rgba8unorm'`. */
    format?: GPUTextureFormat;
    /** Whether this texture should be premultiplied or not. Default to `true`. */
    premultipliedAlpha?: boolean;
    /** Solid color used by temporary texture to display while loading the source. Default to `[0, 0, 0, 255]` (solid black). */
    placeholderColor?: [number, number, number, number];
    /** Whether video textures should use {@link GPUExternalTexture} or not. Default to `true`. */
    useExternalTextures?: boolean;
    /** The {@link GPUTextureViewDimension | texture view dimension} to use. Default to `'2d'`. */
    viewDimension?: GPUTextureViewDimension;
    /** The texture shaders visibility sent to the {@link core/bindings/TextureBinding.TextureBinding | texture binding}. Default to `'fragment'`. */
    visibility?: BindingParams['visibility'];
    /** Whether to keep the {@link Texture#texture | texture} in the {@link core/renderers/GPURenderer.GPURenderer | renderer} cache when a {@link core/materials/Material.Material | Material} tries to destroy it. Default to `true`. */
    cache?: boolean;
}
/**
 * Base parameters used to create a {@link Texture}
 */
export interface TextureBaseParams extends ExternalTextureParams {
    /** The label of the {@link Texture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link Texture} to use in the {@link core/bindings/Binding.Binding | binding} */
    name?: string;
}
/**
 * Parameters used to create a {@link Texture}
 */
export interface TextureParams extends TextureBaseParams {
    /** Optional {@link Texture} to use as a copy source input */
    fromTexture?: Texture | null;
}
/** Allowed {@link Texture} source to use */
export type TextureSource = GPUImageCopyExternalImageSource | HTMLImageElement | null;
/** Allowed {@link Texture} source type to use */
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null;
/**
 * Options used to create this {@link Texture}
 */
export interface TextureOptions extends TextureParams {
    /** {@link Texture} source */
    source: TextureSource | string;
    /** {@link Texture} source type */
    sourceType: TextureSourceType;
}
/**
 * Defines the {@link GPUTexture} size. Depth default to 1 and could also be used for array layers.
 */
export interface TextureSize extends RectSize {
    /** Depth or array layers of the {@link GPUTexture} */
    depth?: number;
}
/**
 * Allowed {@link Texture} parentMesh (can be any type of Mesh)
 */
export type TextureParent = null | RenderedMesh;
