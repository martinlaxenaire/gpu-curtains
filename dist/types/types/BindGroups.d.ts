/// <reference types="dist" />
import { BindGroup } from '../core/bindGroups/BindGroup';
import { TextureBindGroup } from '../core/bindGroups/TextureBindGroup';
import { BufferBindings } from '../core/bindings/BufferBindings';
import { SamplerBindings } from '../core/bindings/SamplerBindings';
import { TextureBindings } from '../core/bindings/TextureBindings';
import { WorkBufferBindings } from '../core/bindings/WorkBufferBindings';
import { Vec2 } from '../math/Vec2';
import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { AttributeBufferParams } from '../utils/buffers-utils';
import { MaterialShadersType } from './Materials';
/**
 * Defines a specific type of {@link Bindings} that handles a {@link BufferBindings#value} array to be sent to a {@link GPUBuffer}
 */
export type BindGroupBufferBindingElement = BufferBindings | WorkBufferBindings;
/**
 * Defines all kind of possible {@link Bindings}
 */
export type BindGroupBindingElement = BindGroupBufferBindingElement | SamplerBindings | TextureBindings;
/**
 * Defines all kind of possible {@link BindGroup}
 */
export type AllowedBindGroups = BindGroup | TextureBindGroup;
/**
 * Defines an object composed of a {@link Float32Array} and its associated [buffer]{@link BindGroupBindingBuffer#buffer}, a reference to the original [inputBinding]{@link BindGroupBufferBindingElement} and eventually a [result buffer]{@link BindGroupBindingBuffer#resultBuffer}
s */
export interface BindGroupBindingBuffer {
    /** {@link Float32Array} holding the [binding buffer]{@link BindGroupBindingBuffer} data */
    array: Float32Array;
    /** {@link GPUBuffer} associated to the [array]{@link BindGroupBindingBuffer#array} */
    buffer: GPUBuffer;
    /** reference to the original [input binding]{@link BindGroupBufferBindingElement} */
    inputBinding: BindGroupBufferBindingElement;
    /** {@link GPUBuffer} eventually holding the result of writable storages bindings */
    resultBuffer?: GPUBuffer;
}
/**
 * An object defining all possible [bind group]{@link AllowedBindGroups} inputs
 */
export interface BindGroupInputs {
    /** uniforms input to pass to a {@link BindGroup} */
    uniforms?: InputBindings;
    /** read storages input to pass to a {@link BindGroup} */
    storages?: InputBindings;
    /** read/write storages input to pass to a {@link BindGroup} */
    works?: InputBindings;
}
/**
 * An object defining all possible {@link BindGroup} class instancing parameters
 */
export interface BindGroupParams {
    /** {@link BindGroup} label */
    label?: string;
    /** {@link BindGroup} index (used to generate shader code) */
    index?: number;
    /** array of already created [bindings]{@link BindGroupBindingElement} (buffers, texture, etc.) to pass to this {@link BindGroup} */
    bindings?: BindGroupBindingElement[];
    /** [inputs]{@link BindGroupInputs} that will be used to create additional {@link BindGroup} [bindings]{@link BindGroupBindingElement} */
    inputs?: BindGroupInputs;
}
/**
 * An object used to define {@link BindGroup} entries
 */
export interface BindGroupEntries {
    /** [GPUBindGroupLayout descriptor]{@link GPUBindGroupLayoutDescriptor} entries */
    bindGroupLayout: GPUBindGroupLayoutEntry[];
    /** [GPUBindGroup descriptor]{@link GPUBindGroupDescriptor} entries */
    bindGroup: GPUBindGroupEntry[];
}
/**
 * Defines all kind of possible input value types
 */
export type InputValue = number | Vec2 | Vec3 | Mat4 | number[];
/**
 * Defines the base object on which an {@link Input} is based.
 */
export interface InputBase {
    /** {@link InputBase} type - could be 'f32', 'vec2f', etc. */
    type: AttributeBufferParams['type'];
    /** {@link InputBase} name */
    name?: string;
    /** callback to run before updating the [binding]{@link BindGroupBufferBindingElement} using this {@link InputBase} */
    onBeforeUpdate?: () => void;
}
/**
 * An {@link Input} is an object used to pass data from the CPU to the GPU either via uniforms or storages.
 */
export interface Input extends InputBase {
    /** The {@link Input} value */
    value: InputValue;
}
/**
 * An object defining all possible {@link InputBindingsParams} parameters
 */
export interface InputBindingsParams {
    /** {@link Bindings} label */
    label?: string;
    /** Whether this {@link Bindings} should use structured WGSL variables */
    useStruct?: boolean;
    /** {@link Bindings} variables shaders visibility */
    visibility?: MaterialShadersType;
    /** Object containing one or multiple [input bindings]{@link Input} */
    bindings: Record<string, Input>;
}
/**
 * An object defining all possible {@link WorkInputBindingsParams} parameters
 */
export interface WorkInputBindingsParams extends InputBindingsParams {
    /** Work group dispatch size to use */
    dispatchSize?: number | number[];
}
/**
 * Defines all kind of input bindings params
 */
export type AllowedInputBindingsParams = InputBindingsParams | WorkInputBindingsParams;
/**
 * Defines an input bindings
 */
export type InputBindings = Record<string, AllowedInputBindingsParams>;
