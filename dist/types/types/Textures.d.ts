/// <reference types="dist" />
import { RectSize } from '../core/DOM/DOMElement';
import { BindingParams } from '../core/bindings/Binding';
/** Define the {@link GPUTexture} size. Depth default to `1` and could also be used for array layers. */
export interface TextureSize extends RectSize {
    /** Depth or array layers of the {@link GPUTexture} */
    depth?: number;
}
/** Allowed {@link DOMTexture} source to use. */
export type TextureSource = GPUCopyExternalImageSource | null;
/** Allowed {@link DOMTexture} source type to use. */
export type TextureSourceType = 'image' | 'canvas' | 'video' | 'externalVideo' | null;
/**
 * Base parameters used to copy an external image to a texture, i.e. that will be uploaded to the GPU using {@link GPUQueue#copyExternalImageToTexture | copyExternalImageToTexture}.
 */
export interface ExternalTextureParamsBase {
    /** The {@link GPUTexture.format | GPUTexture format} to use. Default to `'rgba8unorm'`. */
    format?: GPUTextureFormat;
    /** Whether to generate mips. Default to `false`. */
    generateMips?: boolean;
    /** Whether to flip the source along the Y axis. Default to `false`. */
    flipY?: boolean;
    /** Whether this texture should be premultiplied or not. Default to `false`. */
    premultipliedAlpha?: boolean;
    /** The {@link GPUTexture.createView().dimension | GPUTexture view dimension} to use. Default to `'2d'`. */
    viewDimension?: GPUTextureViewDimension;
    /** Define which {@link GPUQueue.copyExternalImageToTexture().destination.aspect | aspect} of the texture to write the image to. Default to `all`. */
    aspect?: GPUTextureAspect;
    /** Define the {@link GPUQueue.copyExternalImageToTexture().destination.colorSpace | colorSpace} and encoding used to encode data into the destination texture. Default to `srgb`. */
    colorSpace?: PredefinedColorSpace;
}
/** Define the texture shaders visibility. */
export interface TextureVisibility {
    /** The texture shaders visibility sent to the {@link core/bindings/TextureBinding.TextureBinding | texture binding}. Default to `'fragment'`. */
    visibility?: BindingParams['visibility'];
}
/** Define the base parameters used to create a {@link core/textures/MediaTexture.MediaTexture | MediaTexture}. */
export interface MediaTextureBaseParams {
    /** Solid color used by temporary texture to display while loading the source. Default to `[0, 0, 0, 255]` (solid black). */
    placeholderColor?: [number, number, number, number];
    /** Whether video textures should use {@link GPUExternalTexture} or not. Default to `true`. */
    useExternalTextures?: boolean;
    /** Whether to keep the {@link DOMTexture#texture | texture} in the {@link core/renderers/GPURenderer.GPURenderer | renderer} cache when a {@link core/materials/Material.Material | Material} tries to destroy it. Default to `true`. */
    cache?: boolean;
    /** Whether to use a transformation {@link math/Mat3.Mat3 | Mat3} to use in the shaders for UV transformations. If set to `true`, will create a {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} accessible in the shaders with the name `${texture.options.name}Matrix`. */
    useTransform?: boolean;
}
/** Parameters used by the various scene objects (meshes and compute passes) for their textures options. */
export interface SceneObjectTextureOptions extends ExternalTextureParamsBase, MediaTextureBaseParams, TextureVisibility {
}
