/// <reference types="dist" />
import { Binding, BindingParams } from './Binding';
import { SamplerOptions } from '../samplers/Sampler';
/** Defines a {@link SamplerBinding} [resource]{@link SamplerBinding#resource} */
export type SamplerBindingResource = GPUSampler | null;
/**
 * An object defining all possible {@link SamplerBinding} class instancing parameters
 */
export interface SamplerBindingParams extends BindingParams {
    /** {@link SamplerBinding} [bind group]{@link GPUBindGroup} resource */
    sampler: SamplerBindingResource;
    /** The bind group layout binding [type]{@link GPUSamplerBindingLayout#type} of this [sampler]{@link GPUSampler} */
    type: SamplerOptions['type'];
}
/**
 * SamplerBinding class:
 * Used to handle GPUSampler struct
 * @extends Binding
 */
export declare class SamplerBinding extends Binding {
    /** Our {@link SamplerBinding} resource, i.e. a {@link GPUSampler} */
    sampler: SamplerBindingResource;
    /** An array of strings to append to our shaders code declaring all the WGSL variables representing this {@link SamplerBinding} */
    wgslGroupFragment: string[];
    /** Options used to create this {@link SamplerBinding} */
    options: SamplerBindingParams;
    /**
     * SamplerBinding constructor
     * @param parameters - [parameters]{@link SamplerBindingParams} used to create our SamplerBindings
     */
    constructor({ label, name, bindingType, visibility, sampler, type, }: SamplerBindingParams);
    /**
     * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#sampler}
     */
    get resourceLayout(): {
        sampler: GPUSamplerBindingLayout;
    };
    /**
     * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource(): SamplerBindingResource;
    set resource(value: SamplerBindingResource);
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
