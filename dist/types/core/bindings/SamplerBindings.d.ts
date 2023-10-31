/// <reference types="dist" />
import { Bindings, BindingsParams } from './Bindings';
export type SamplerBindingResource = GPUSampler | null;
export interface SamplerBindingsParams extends BindingsParams {
    resource: SamplerBindingResource;
}
/**
 * SamplerBindings class:
 * Used to handle GPUSampler bindings
 * @extends Bindings
 */
export declare class SamplerBindings extends Bindings {
    /**
     * Our {@link SamplerBindings} resource, i.e. a GPUSampler
     * @type {SamplerBindingResource}
     */
    resource: SamplerBindingResource;
    /**
     * An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link SamplerBindings}
     * @type {string[]}
     */
    wgslGroupFragment: string[];
    /**
     * SamplerBindings constructor
     * @param {SamplerBindingsParams} parameters - parameters used to create our SamplerBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {SamplerBindingResource=} parameters.resource - a GPUSampler
     */
    constructor({ label, name, bindingType, bindIndex, visibility, resource, }: SamplerBindingsParams);
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
