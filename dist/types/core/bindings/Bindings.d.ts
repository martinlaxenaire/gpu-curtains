/// <reference types="dist" />
import { MaterialShadersType } from '../../types/Materials';
import { TextureBindings } from './TextureBindings';
import { SamplerBindings } from './SamplerBindings';
export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler';
export type TextureSamplerBindings = TextureBindings | SamplerBindings;
export interface BindingsParams {
    label?: string;
    name?: string;
    bindingType?: BindingType;
    bindIndex?: number;
    visibility?: MaterialShadersType | null;
}
/**
 * Bindings class:
 * Used as a shell to build actual bindings upon, like {@link BufferBindings}, {@link WorkBufferBindings}, {@link TextureBindings} and {@link SamplerBindings}
 */
export declare class Bindings {
    /**
     * The label of the {@link Bindings}
     * @type {string}
     */
    label: string;
    /**
     * The name/key of the {@link Bindings}
     * @type {string}
     */
    name: string;
    /**
     * The binding type of the {@link Bindings}
     * @type {BindingType}
     */
    bindingType: BindingType;
    /**
     * The binding index of the {@link Bindings}, used to link bindings in the shaders
     * @type {number}
     */
    bindIndex: number;
    /**
     * The visibility of the {@link Bindings} in the shaders
     * @type {GPUShaderStageFlags}
     */
    visibility: GPUShaderStageFlags;
    /**
     * The padded value array that will be sent to the GPUBuffer
     * @type {Float32Array}
     */
    value?: Float32Array | null;
    /**
     * Bindings constructor
     * @param {BindingsParams} parameters - parameters used to create our Bindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     */
    constructor({ label, name, bindingType, bindIndex, visibility, }: BindingsParams);
    /**
     * To update our buffers before at each render. Will be overriden.
     */
    onBeforeRender(): void;
}
