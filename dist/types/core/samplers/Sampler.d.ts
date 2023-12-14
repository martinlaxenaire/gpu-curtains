/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { SamplerBinding } from '../bindings/SamplerBinding';
import { GPUCurtains } from '../../curtains/GPUCurtains';
export interface SamplerOptions extends Partial<GPUSamplerDescriptor>, GPUSamplerBindingLayout {
}
/**
 * Parameters used to create a {@link Sampler}
 */
export interface SamplerParams extends SamplerOptions {
    /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBinding} */
    name: string;
}
/**
 * Sampler class:
 * Used to create a {@link GPUSampler} and its associated {@link SamplerBinding}
 */
export declare class Sampler {
    /** The type of the {@link Sampler} */
    type: string;
    /** The universal unique id of this {@link Sampler} */
    readonly uuid: string;
    /** [renderer]{@link Renderer} used by this {@link Sampler} */
    renderer: Renderer;
    /** The label of the {@link Sampler}, used to create the {@link GPUSampler} for debugging purpose */
    label: string;
    /** Name of the {@link Sampler} to use in the [binding]{@link SamplerBinding} */
    name: string;
    /** Options used to create this {@link Sampler} */
    options: SamplerOptions;
    /** {@link GPUSampler} */
    sampler: GPUSampler;
    /** {@link SamplerBinding} to pass to a [bind group]{@link BindGroup} */
    binding: SamplerBinding;
    /**
     * Sampler constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
     * @param parameters - [parameters]{@link SamplerParams} used to create this {@link Sampler}
     */
    constructor(renderer: GPUCurtains | Renderer, { label, name, addressModeU, addressModeV, magFilter, minFilter, mipmapFilter, maxAnisotropy, type, }?: SamplerParams);
    /**
     * Set the {@link GPUSampler}
     */
    createSampler(): void;
    /**
     * Set the [binding]{@link SamplerBinding}
     */
    createBinding(): void;
}
