/// <reference types="dist" />
import { Renderer } from '../../utils/renderer-utils';
import { SamplerBindings } from '../bindings/SamplerBindings';
import { GPUCurtains } from '../../curtains/GPUCurtains';
export interface SamplerParams extends GPUSamplerDescriptor {
    name: string;
}
export declare class Sampler {
    type: string;
    renderer: Renderer;
    label: string;
    name: string;
    options: GPUSamplerDescriptor;
    sampler: GPUSampler;
    binding: SamplerBindings;
    constructor(renderer: GPUCurtains | Renderer, { label, name, addressModeU, addressModeV, magFilter, minFilter, mipmapFilter, maxAnisotropy, }?: SamplerParams);
    createSampler(): void;
    createBinding(): void;
}
