/// <reference types="dist" />
import { Binding, BindingMemoryAccessType, BindingParams, DOMTextureBindingType } from './Binding';
/** Defines a {@link TextureBinding} {@link TextureBinding#resource | resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null;
/**
 * An object defining all possible {@link TextureBinding} class instancing parameters
 */
export interface TextureBindingParams extends BindingParams {
    /** The binding type of the {@link TextureBinding} */
    bindingType?: DOMTextureBindingType;
    /** {@link TextureBinding} {@link TextureBinding#resource | resource} */
    texture: TextureBindingResource;
    /** The {@link GPUTexture | texture} format to use */
    format?: GPUTextureFormat;
    /** The storage {@link GPUTexture | texture} binding memory access types (read only, write only or read/write) */
    access?: BindingMemoryAccessType;
    /** The {@link GPUTexture | texture} view dimension to use */
    viewDimension?: GPUTextureViewDimension;
    /** Whethe the {@link GPUTexture | texture} is a multisampled texture. Mainly used internally by depth textures if needed. */
    multisampled?: boolean;
}
/**
 * Used to handle {@link GPUTexture} and {@link GPUExternalTexture} bindings.
 *
 * Provide both {@link TextureBinding#resourceLayout | resourceLayout} and {@link TextureBinding#resource | resource} to the {@link GPUBindGroupLayout} and {@link GPUBindGroup}.<br>
 * Also create the appropriate WGSL code snippet to add to the shaders.
 */
export declare class TextureBinding extends Binding {
    /** The binding type of the {@link TextureBinding} */
    bindingType: DOMTextureBindingType;
    /** Our {@link TextureBinding} resource, i.e. a {@link GPUTexture} or {@link GPUExternalTexture} */
    texture: TextureBindingResource;
    /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link TextureBinding} */
    wgslGroupFragment: string[];
    /** Options used to create this {@link TextureBinding} */
    options: TextureBindingParams;
    /**
     * TextureBinding constructor
     * @param parameters - {@link TextureBindingParams | parameters} used to create our {@link TextureBinding}
     */
    constructor({ label, name, bindingType, visibility, texture, format, access, viewDimension, multisampled, }: TextureBindingParams);
    /**
     * Get bind group layout entry resource, either for {@link GPUBindGroupLayoutEntry#texture | texture} or {@link GPUBindGroupLayoutEntry#externalTexture | external texture}
     * @readonly
     */
    get resourceLayout(): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null;
    /**
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey(): string;
    /**
     * Get the {@link GPUBindGroupEntry#resource | bind group resource}
     */
    get resource(): GPUExternalTexture | GPUTextureView | null;
    /**
     * Set the {@link GPUBindGroupEntry#resource | bind group resource}
     * @param value - new bind group resource
     */
    set resource(value: TextureBindingResource);
    /**
     * Set or update our {@link Binding#bindingType | bindingType} and our WGSL code snippet
     * @param bindingType - the new {@link Binding#bindingType | binding type}
     */
    setBindingType(bindingType: DOMTextureBindingType): void;
    /**
     * Set or update our texture {@link TextureBindingParams#format | format}. Note that if the texture is a `storage` {@link bindingType} and the `format` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param format - new texture {@link TextureBindingParams#format | format} value to use
     */
    setFormat(format: GPUTextureFormat): void;
    /**
     * Set or update our texture {@link TextureBindingParams#multisampled | multisampled}. Note that if the texture is not a `storage` {@link bindingType} and the `multisampled` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param multisampled - new texture {@link TextureBindingParams#multisampled | multisampled} value to use
     */
    setMultisampled(multisampled: boolean): void;
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
