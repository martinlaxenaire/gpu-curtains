/// <reference types="dist" />
import { BindGroup } from '../core/bindGroups/BindGroup';
import { TextureBindGroup } from '../core/bindGroups/TextureBindGroup';
import { BufferBinding, BufferBindingParams } from '../core/bindings/BufferBinding';
import { SamplerBinding } from '../core/bindings/SamplerBinding';
import { TextureBinding } from '../core/bindings/TextureBinding';
import { WritableBufferBinding } from '../core/bindings/WritableBufferBinding';
import { Vec2 } from '../math/Vec2';
import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Quat } from '../math/Quat';
import { VertexBufferAttribute } from './Geometries';
/**
 * Defines all kind of possible input value types
 */
export type InputValue = number | number[] | Vec2 | Vec3 | Mat4 | Quat | Int32Array | Uint32Array | Float32Array | Uint16Array;
/**
 * Defines the base object on which an {@link Input} is based.
 */
export interface InputBase {
    /** {@link InputBase} type - could be 'f32', 'vec2f', etc. */
    type: VertexBufferAttribute['type'];
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
export type InputBindingsParams = BufferBindingParams;
/**
 * Defines an input bindings
 */
export type InputBindings = Record<string, InputBindingsParams>;
/**
 * Defines a specific type of {@link Binding} that handles a {@link BufferBinding#value} array to be sent to a {@link GPUBuffer}
 */
export type BindGroupBufferBindingElement = BufferBinding | WritableBufferBinding;
/**
 * Defines all kind of possible textures/ samplers {@link Binding}
 */
export type BindGroupTextureSamplerElement = SamplerBinding | TextureBinding;
/**
 * Defines all kind of possible {@link Binding}
 */
export type BindGroupBindingElement = BindGroupBufferBindingElement | BindGroupTextureSamplerElement;
/**
 * Defines all kind of possible {@link BindGroup}
 */
export type AllowedBindGroups = BindGroup | TextureBindGroup;
/**
 * An object defining all possible [bind group]{@link AllowedBindGroups} inputs
 */
export interface BindGroupInputs {
    /** uniforms input to pass to a {@link BindGroup} */
    uniforms?: InputBindings;
    /** read only or read/write storages input to pass to a {@link BindGroup} */
    storages?: InputBindings;
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
