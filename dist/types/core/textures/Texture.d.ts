/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { TextureBinding } from '../bindings/TextureBinding';
import { BindGroupBindingElement } from '../../types/BindGroups';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { BindingMemoryAccessType, BindingParams, TextureBindingType } from '../bindings/Binding';
import { DOMTexture } from './DOMTexture';
import { ExternalTextureParamsBase, TextureSize } from '../../types/Textures';
import { TextureUsageKeys } from './utils';
/**
 * Base parameters used to create a {@link Texture}
 */
export interface TextureBaseParams extends ExternalTextureParamsBase {
    /** The label of the {@link Texture}, used to create various GPU objects for debugging purpose */
    label?: string;
    /** Name of the {@link Texture} to use in the {@link TextureBinding | texture binding} */
    name?: string;
    /** Optional fixed size of the {@link Texture#texture | texture}. If set, the {@link Texture} will never be resized and always keep that size. */
    fixedSize?: TextureSize;
    /** Force the texture size to be set to the given ratio of the {@link core/renderers/GPURenderer.GPURenderer#canvas | renderer canvas} size or {@link fixedSize}. Used mainly to shrink render target texture definition. */
    qualityRatio?: number;
    /** Whether to use this {@link Texture} as a regular, storage or depth texture */
    type?: TextureBindingType;
    /** Optional format of the {@link Texture#texture | texture}, mainly used for storage textures */
    format?: GPUTextureFormat;
    /** Optional texture binding memory access type, mainly used for storage textures */
    access?: BindingMemoryAccessType;
    /** Optional {@link Texture#texture | texture} view dimension to use */
    viewDimension?: GPUTextureViewDimension;
    /** Sample count of the {@link Texture#texture | texture}, used for multisampling */
    sampleCount?: GPUSize32;
    /** The {@link Texture} shaders visibility sent to the {@link Texture#textureBinding | texture binding} */
    visibility?: BindingParams['visibility'];
    /** Allowed usages for the {@link Texture#texture | GPU texture} as an array of {@link TextureUsageKeys | texture usages names} */
    usage?: TextureUsageKeys[];
    /** Whether any {@link core/materials/Material.Material | Material} using this {@link Texture} should automatically destroy it upon destruction. Default to `true`. */
    autoDestroy?: boolean;
}
/**
 * Parameters used to create a {@link Texture}
 */
export interface TextureParams extends TextureBaseParams {
    /** Optional texture to use as a copy source input. Could be a {@link Texture} or {@link DOMTexture} */
    fromTexture?: Texture | DOMTexture | null;
}
/**
 * This is the main class used to create and handle {@link GPUTexture | textures} that can be used with {@link core/computePasses/ComputePass.ComputePass | ComputePass} and/or {@link core/meshes/Mesh.Mesh | Mesh}. Also used as copy source/destination for {@link core/renderPasses/RenderPass.RenderPass | RenderPass} and {@link core/renderPasses/RenderTarget.RenderTarget | RenderTarget}.
 *
 * Basically useful for any kind of textures: for external sources (however in some cases, {@link core/textures/DOMTexture.DOMTexture | DOMTexture} might be preferred), depth, storages or to copy anything outputted to the screen at one point or another.
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
 * // create a texture
 * const texture = new Texture(gpuCurtains, {
 *   label: 'My texture',
 *   name: 'myTexture',
 * })
 * ```
 */
export declare class Texture {
    #private;
    /** {@link Renderer | renderer} used by this {@link Texture} */
    renderer: Renderer;
    /** The type of the {@link Texture} */
    type: string;
    /** The universal unique id of this {@link Texture} */
    readonly uuid: string;
    /** The {@link GPUTexture} used */
    texture: GPUTexture;
    /** Size of the {@link Texture#texture | texture} source, usually our {@link Renderer#canvas | renderer canvas} size */
    size: TextureSize;
    /** Options used to create this {@link Texture} */
    options: TextureParams;
    /** Array of {@link core/bindings/Binding.Binding | bindings} that will actually only hold one {@link TextureBinding | texture binding} */
    bindings: BindGroupBindingElement[];
    /**
     * Texture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}
     */
    constructor(renderer: Renderer | GPUCurtains, parameters?: TextureParams);
    /**
     * Copy another {@link Texture} into this {@link Texture}
     * @param texture - {@link Texture} to copy
     */
    copy(texture: Texture | DOMTexture): void;
    /**
     * Copy a {@link GPUTexture} directly into this {@link Texture}. Mainly used for depth textures.
     * @param texture - {@link GPUTexture} to copy
     */
    copyGPUTexture(texture: GPUTexture): void;
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
     */
    createTexture(): void;
    /**
     * Upload a source to the GPU and use it for our {@link texture}.
     * @param parameters - parameters used to upload the source.
     * @param parameters.source - source to use for our {@link texture}.
     * @param parameters.width - source width.
     * @param parameters.height - source height.
     * @param parameters.depth - source depth.
     * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the source copy.
     */
    uploadSource({ source, width, height, depth, origin, colorSpace, }: {
        source: GPUImageCopyExternalImageSource;
        width?: number;
        height?: number;
        depth?: number;
        origin?: GPUOrigin3D;
        colorSpace?: PredefinedColorSpace;
    }): void;
    /**
     * Use data as the {@link texture} source and upload it to the GPU.
     * @param parameters - parameters used to upload the source.
     * @param parameters.width - data source width.
     * @param parameters.height - data source height.
     * @param parameters.depth - data source depth.
     * @param parameters.origin - {@link GPUQueue.copyExternalImageToTexture().destination.origin | GPUOrigin3D} of the data source copy.
     * @param parameters.data - {@link Float32Array} data to use as source.
     */
    uploadData({ width, height, depth, origin, data, }: {
        width?: number;
        height?: number;
        depth?: number;
        origin?: GPUOrigin3D;
        data?: Float32Array;
    }): void;
    /**
     * Set our {@link Texture#bindings | bindings}
     */
    setBindings(): void;
    /**
     * Get our {@link TextureBinding | texture binding}
     * @readonly
     */
    get textureBinding(): TextureBinding;
    /**
     * Resize our {@link Texture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update
     * @param size - the optional new {@link TextureSize | size} to set
     */
    resize(size?: TextureSize | null): void;
    /**
     * Destroy our {@link Texture}
     */
    destroy(): void;
}
