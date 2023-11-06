/// <reference types="dist" />
import { MaterialShadersType } from '../../types/Materials';
import { TextureBindings } from './TextureBindings';
import { SamplerBindings } from './SamplerBindings';
/**
 * Defines all kind of binding types
 */
export type BindingType = 'uniform' | 'storage' | 'storageWrite' | 'texture' | 'externalTexture' | 'sampler';
/**
 * Defines all kind of {@link Bindings} that are related to textures or samplers
 */
export type TextureSamplerBindings = TextureBindings | SamplerBindings;
/**
 * An object defining all possible {@link Bindings} class instancing parameters
 */
export interface BindingsParams {
    /** {@link Bindings} label */
    label?: string;
    /** {@link Bindings} name/key */
    name?: string;
    /** [bindingType]{@link BindingType} to use with this {@link Bindings} */
    bindingType?: BindingType;
    /** binding index inside the [bind group]{@link GPUBindGroup} */
    bindIndex?: number;
    /** {@link Bindings} variables shaders visibility */
    visibility?: MaterialShadersType | null;
}
/**
 * Bindings class:
 * Used as a shell to build actual bindings upon, like {@link BufferBindings}, {@link WorkBufferBindings}, {@link TextureBindings} and {@link SamplerBindings}.
 * Ultimately the goal of a Bindings element is to provide correct resources for {@link GPUBindGroupLayoutEntry} and {@link GPUBindGroupEntry}
 */
export declare class Bindings {
    /** The label of the {@link Bindings} */
    label: string;
    /** The name/key of the {@link Bindings} */
    name: string;
    /** The binding type of the {@link Bindings} */
    bindingType: BindingType;
    /** The binding index of the {@link Bindings}, used to link bindings in the shaders */
    bindIndex: number;
    /** The visibility of the {@link Bindings} in the shaders */
    visibility: GPUShaderStageFlags;
    /** The padded value array that will be sent to the GPUBuffer */
    value?: Float32Array | null;
    /**
     * Bindings constructor
     * @param {BindingsParams} parameters - [parameters]{@link BindingsParams} used to create our {@link Bindings}
     */
    constructor({ label, name, bindingType, bindIndex, visibility, }: BindingsParams);
    /**
     * To update our buffers before at each render. Will be overriden.
     */
    onBeforeRender(): void;
}
