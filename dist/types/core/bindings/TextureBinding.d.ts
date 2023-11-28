/// <reference types="dist" />
import { Binding, BindingMemoryAccessType, BindingParams, BindingType } from './Binding';
/** Defines a {@link TextureBinding} [resource]{@link TextureBinding#resource} */
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null;
/**
 * An object defining all possible {@link TextureBinding} class instancing parameters
 */
export interface TextureBindingParams extends BindingParams {
    /** {@link TextureBinding} [resource]{@link TextureBinding#resource} */
    texture: TextureBindingResource;
    format?: GPUTextureFormat;
    access?: BindingMemoryAccessType;
}
/**
 * TextureBinding class:
 * Used to handle GPUTexture and GPUExternalTexture bindings
 * @extends Binding
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
     * @param parameters - [parameters]{@link TextureBindingParams} used to create our {@link TextureBinding}
     */
    constructor({ label, name, bindingType, bindIndex, visibility, texture, format, access, }: TextureBindingParams);
    /**
     * Get bind group layout entry resource, either for [texture]{@link GPUBindGroupLayoutEntry#texture} or [externalTexture]{@link GPUBindGroupLayoutEntry#externalTexture}
     */
    get resourceLayout(): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null;
    /**
     * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource(): GPUExternalTexture | GPUTextureView | null;
    set resource(value: TextureBindingResource);
    /**
     * Set or update our [bindingType]{@link Binding#bindingType} and our WGSL code snippet
     * @param bindingType - the new [binding type]{@link Binding#bindingType}
     */
    setBindingType(bindingType: BindingType): void;
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
