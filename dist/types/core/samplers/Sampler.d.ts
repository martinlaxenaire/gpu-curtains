/// <reference types="dist" />
import { Renderer } from '../renderers/utils';
import { SamplerBinding } from '../bindings/SamplerBinding';
import { GPUCurtains } from '../../curtains/GPUCurtains';
/** Options used to create a {@link Sampler} */
export interface SamplerOptions extends Partial<GPUSamplerDescriptor>, GPUSamplerBindingLayout {
}
/**
 * Parameters used to create a {@link Sampler}
 */
export interface SamplerParams extends SamplerOptions {
    /** Name of the {@link Sampler} to use in the {@link SamplerBinding | binding} */
    name: string;
}
/**
 * Used to create a {@link GPUSampler} and its associated {@link SamplerBinding}.
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
 * const mirrorSampler = new Sampler(gpuCurtains, {
 *   label: 'Mirror sampler',
 *   name: 'mirrorSampler',
 *   addressModeU: 'mirror-repeat',
 *   addressModeV: 'mirror-repeat',
 * })
 * ```
 */
export declare class Sampler {
    /** The type of the {@link Sampler} */
    type: string;
    /** The universal unique id of this {@link Sampler} */
    readonly uuid: string;
    /** {@link Renderer} used by this {@link Sampler} */
    renderer: Renderer;
    /** The label of the {@link Sampler}, used to create the {@link GPUSampler} for debugging purpose */
    label: string;
    /** Name of the {@link Sampler} to use in the {@link SamplerBinding | binding} */
    name: string;
    /** Options used to create this {@link Sampler} */
    options: SamplerOptions;
    /** {@link GPUSampler} */
    sampler: GPUSampler;
    /** {@link SamplerBinding | binding} to pass to a {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group} */
    binding: SamplerBinding;
    /**
     * Sampler constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
     * @param parameters - {@link SamplerParams | parameters} used to create this {@link Sampler}
     */
    constructor(renderer: GPUCurtains | Renderer, { label, name, addressModeU, addressModeV, magFilter, minFilter, mipmapFilter, maxAnisotropy, type, compare, }?: SamplerParams);
    /**
     * Set the {@link GPUSampler}
     */
    createSampler(): void;
    /**
     * Set the {@link SamplerBinding | binding}
     */
    createBinding(): void;
}
