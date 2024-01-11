/// <reference types="dist" />
import { Binding, BindingMemoryAccessType, BindingParams, BindingType } from './Binding';
/** Defines a {@link TextureBinding} {@link TextureBinding#resource | resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null;
/**
 * An object defining all possible {@link TextureBinding} class instancing parameters
 */
export interface TextureBindingParams extends BindingParams {
    /** {@link TextureBinding} {@link TextureBinding#resource | resource} */
    texture: TextureBindingResource;
    /** The {@link GPUTexture | texture} format to use */
    format?: GPUTextureFormat;
    /** The storage {@link GPUTexture | texture} binding memory access types (read only, write only or read/write) */
    access?: BindingMemoryAccessType;
    /** The {@link GPUTexture | texture} view dimension to use */
    viewDimension?: GPUTextureViewDimension;
}
/**
 * Used to handle {@link GPUTexture} and {@link GPUExternalTexture} bindings.
 *
 * Provide both {@link TextureBinding#resourceLayout | resourceLayout} and {@link TextureBinding#resource | resource} to the {@link GPUBindGroupLayout} and {@link GPUBindGroup}.<br>
 * Also create the appropriate WGSL code snippet to add to the shaders.
 */
export declare class TextureBinding extends Binding {
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
    constructor({ label, name, bindingType, visibility, texture, format, access, viewDimension, }: TextureBindingParams);
    /**
     * Get bind group layout entry resource, either for {@link GPUBindGroupLayoutEntry#texture | texture} or {@link GPUBindGroupLayoutEntry#externalTexture | external texture}
     * @readonly
     */
    get resourceLayout(): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null;
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
    setBindingType(bindingType: BindingType): void;
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
