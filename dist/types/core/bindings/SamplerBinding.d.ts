/// <reference types="dist" />
import { Binding, BindingParams } from './Binding';
import { SamplerOptions } from '../samplers/Sampler';
/** Defines a {@link SamplerBinding} {@link SamplerBinding#resource | resource} */
export type SamplerBindingResource = GPUSampler | null;
/**
 * An object defining all possible {@link SamplerBinding} class instancing parameters
 */
export interface SamplerBindingParams extends BindingParams {
    /** {@link SamplerBinding} {@link GPUBindGroup | GPU bind group} resource */
    sampler: SamplerBindingResource;
    /** The bind group layout binding {@link GPUSamplerBindingLayout#type | type} of this {@link GPUSampler | GPU sampler} */
    type: SamplerOptions['type'];
}
/**
 * Used to handle GPUSampler bindings.
 *
 * Provide both {@link SamplerBinding#resourceLayout | resourceLayout} and {@link SamplerBinding#resource | resource} to the {@link GPUBindGroupLayout} and {@link GPUBindGroup}.<br>
 * Also create the appropriate WGSL code snippet to add to the shaders.
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
     * @param parameters - {@link SamplerBindingParams | parameters} used to create our SamplerBindings
     */
    constructor({ label, name, bindingType, visibility, sampler, type, }: SamplerBindingParams);
    /**
     * Get {@link GPUBindGroupLayoutEntry#sampler | bind group layout entry resource}
     * @readonly
     */
    get resourceLayout(): {
        /** {@link GPUBindGroupLayout | bind group layout} resource */
        sampler: GPUSamplerBindingLayout;
    };
    /**
     * Get the {@link GPUBindGroupEntry#resource | bind group resource}
     */
    get resource(): SamplerBindingResource;
    /**
     * Set the {@link GPUBindGroupEntry#resource | bind group resource}
     * @param value - new bind group resource
     */
    set resource(value: SamplerBindingResource);
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment(): void;
}
