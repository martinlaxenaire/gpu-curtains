/// <reference types="dist" />
import { Bindings, BindingsParams, BindingType } from './Bindings';
export type TextureBindingResource = GPUTexture | GPUExternalTexture | null;
export interface TextureBindingsParams extends BindingsParams {
    resource: TextureBindingResource;
}
/**
 * TextureBindings class:
 * Used to handle GPUTexture and GPUExternalTexture bindings
 * @extends Bindings
 */
export declare class TextureBindings extends Bindings {
    /**
     * Our {@link TextureBindings} resource, i.e. a GPUTexture or GPUExternalTexture
     * @type {TextureBindingResource}
     */
    resource: TextureBindingResource;
    /**
     * An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link TextureBindings}
     * @type {string[]}
     */
    wgslGroupFragment: string[];
    /**
     * TextureBindings constructor
     * @param {TextureBindingsParams} parameters - parameters used to create our TextureBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {TextureBindingResource=} parameters.resource - a GPUTexture or GPUExternalTexture
     */
    constructor({ label, name, resource, bindingType, bindIndex, visibility, }: TextureBindingsParams);
    /**
     * Set or update our {@link Bindings#bindingType} and our WGSL code snippet
     * @param {BindingType} bindingType - the new binding type
     */
    setBindingType(bindingType: BindingType): void;
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
