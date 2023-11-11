/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { SamplerBindings } from '../bindings/SamplerBindings';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/**
 * Parameters used to create a {@link Sampler}
 */
export interface SamplerParams extends GPUSamplerDescriptor {
    /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBindings} */
    name: string;
}
/**
 * Sampler class:
 * Used to create a {@link GPUSampler} and its associated {@link SamplerBindings}
 */
export declare class Sampler {
    /** The type of the {@link Sampler} */
    type: string;
    /** [renderer]{@link Renderer} used by this {@link Sampler} */
    renderer: Renderer;
    /** The label of the {@link Sampler}, used to create the {@link GPUSampler} for debugging purpose */
    label: string;
    /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBindings} */
    name: string;
    /** Options used to create this {@link Sampler} */
    options: GPUSamplerDescriptor;
    /** {@link GPUSampler} */
    sampler: GPUSampler;
    /** {@link SamplerBindings} to pass to a [bind group]{@link BindGroup} */
    binding: SamplerBindings;
    /**
     * Sampler constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
     * @param parameters - [parameters]{@link SamplerParams} used to create this {@link Sampler}
     */
    constructor(renderer: GPUCurtains | Renderer, { label, name, addressModeU, addressModeV, magFilter, minFilter, mipmapFilter, maxAnisotropy, }?: SamplerParams);
    /**
     * Set the {@link GPUSampler}
     */
    createSampler(): void;
    /**
     * Set the [binding]{@link SamplerBindings}
     */
    createBinding(): void;
}
