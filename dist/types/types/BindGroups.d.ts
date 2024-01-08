/// <reference types="dist" />
import { BindGroup } from '../core/bindGroups/BindGroup';
import { TextureBindGroup } from '../core/bindGroups/TextureBindGroup';
import { BufferBinding, BufferBindingParams } from '../core/bindings/BufferBinding';
import { SamplerBinding } from '../core/bindings/SamplerBinding';
import { TextureBinding } from '../core/bindings/TextureBinding';
import { WritableBufferBinding, WritableBufferBindingParams } from '../core/bindings/WritableBufferBinding';
import { Vec2 } from '../math/Vec2';
import { Vec3 } from '../math/Vec3';
import { Mat4 } from '../math/Mat4';
import { Quat } from '../math/Quat';
import { WGSLVariableType } from '../core/bindings/utils';
/**
 * Defines all kind of possible input value types
 */
export type InputValue = number | number[] | Vec2 | Vec3 | Mat4 | Quat | Int32Array | Uint32Array | Float32Array | Uint16Array;
/**
 * Defines the base object on which an {@link Input} is based.
 */
export interface InputBase {
    /** {@link InputBase} type - could be 'f32', 'vec2f', etc. */
    type: WGSLVariableType;
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
 * Defines a read only input binding
 */
export type ReadOnlyInputBindings = Record<string, BufferBindingParams>;
/**
 * Defines a read only or read/write input binding
 */
export type ReadWriteInputBindings = Record<string, BufferBindingParams | WritableBufferBindingParams>;
/**
 * Defines a specific type of {@link core/bindings/Binding.Binding} that handles a {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer} array to be sent to a {@link GPUBuffer}
 */
export type BindGroupBufferBindingElement = BufferBinding | WritableBufferBinding;
/**
 * Defines all kind of possible textures/ samplers {@link core/bindings/Binding.Binding}
 */
export type BindGroupTextureSamplerElement = SamplerBinding | TextureBinding;
/**
 * Defines all kind of possible {@link core/bindings/Binding.Binding}
 */
export type BindGroupBindingElement = BindGroupBufferBindingElement | BindGroupTextureSamplerElement;
/**
 * Defines all kind of possible {@link core/bindGroups/BindGroup.BindGroup}
 */
export type AllowedBindGroups = BindGroup | TextureBindGroup;
/**
 * Uniforms and storages [bind group]{@link AllowedBindGroups} inputs
 */
export interface BindGroupInputs {
    /** uniforms input to pass to a {@link core/bindGroups/BindGroup.BindGroup} */
    uniforms?: ReadOnlyInputBindings;
    /** read only or read/write storages input to pass to a {@link core/bindGroups/BindGroup.BindGroup} */
    storages?: ReadWriteInputBindings;
}
/**
 * An object defining all possible {@link core/bindGroups/BindGroup.BindGroup} class instancing parameters
 */
export interface BindGroupParams extends BindGroupInputs {
    /** {@link core/bindGroups/BindGroup.BindGroup} label */
    label?: string;
    /** {@link core/bindGroups/BindGroup.BindGroup} index (used to generate shader code) */
    index?: number;
    /** array of already created [struct]{@link BindGroupBindingElement} (buffers, texture, etc.) to pass to this {@link core/bindGroups/BindGroup.BindGroup} */
    bindings?: BindGroupBindingElement[];
}
/**
 * An object used to define {@link core/bindGroups/BindGroup.BindGroup} entries
 */
export interface BindGroupEntries {
    /** [GPUBindGroupLayout descriptor]{@link GPUBindGroupLayoutDescriptor} entries */
    bindGroupLayout: GPUBindGroupLayoutEntry[];
    /** [GPUBindGroup descriptor]{@link GPUBindGroupDescriptor} entries */
    bindGroup: GPUBindGroupEntry[];
}
