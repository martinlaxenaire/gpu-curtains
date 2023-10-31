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
 * @type {BindGroupBufferBindingElement}
 */
export type BindGroupBufferBindingElement = BufferBindings | WorkBufferBindings;
/**
 * Defines all kind of possible {@link Bindings}
 * @type {BindGroupBindingElement}
 */
export type BindGroupBindingElement = BindGroupBufferBindingElement | SamplerBindings | TextureBindings;
/**
 * Defines all kind of possible {@link BindGroup}
 * @type {AllowedBindGroups}
 */
export type AllowedBindGroups = BindGroup | TextureBindGroup;
/**
 * Defines an object composed of a {@link Float32Array} and its associated [buffer]{@link BindGroupBindingBuffer#buffer}, a reference to the original [inputBinding]{@link BindGroupBufferBindingElement} and eventually a [result buffer]{@link BindGroupBindingBuffer#resultBuffer}
 * @typedef {BindGroupBindingBuffer}
 * @property {Float32Array} array - {@link Float32Array} holding the [binding buffer]{@link BindGroupBindingBuffer} data
 * @property {GPUBuffer} buffer - {@link GPUBuffer} associated to the [array]{@link BindGroupBindingBuffer#array}
 * @property {BindGroupBufferBindingElement} inputBinding - reference to the original [input binding]{@link BindGroupBufferBindingElement}
 * @property {?GPUBuffer} resultBuffer - {@link GPUBuffer} eventually holding the result of writable storages bindings
 */
export interface BindGroupBindingBuffer {
    array: Float32Array;
    inputBinding: BindGroupBufferBindingElement;
    buffer: GPUBuffer;
    resultBuffer?: GPUBuffer;
}
/**
 * An object defining all possible [bind group]{@link AllowedBindGroups} inputs
 * @typedef {BindGroupInputs}
 * @property {?InputBindings} uniforms - uniforms input to pass to a {@link BindGroup}
 * @property {?InputBindings} storages - read storages input to pass to a {@link BindGroup}
 * @property {?InputBindings} works - read/write storages input to pass to a {@link BindGroup}
 */
export interface BindGroupInputs {
    uniforms?: InputBindings;
    storages?: InputBindings;
    works?: InputBindings;
}
/**
 * An object defining all possible {@link BindGroup} instancing parameters
 * @typedef {BindGroupParams}
 * @property {?string} label - {@link BindGroup} label
 * @property {?number} index - {@link BindGroup} index (used to generate shader code)
 * @property {BindGroupBindingElement[]} [bindings=[]] - array of already created [bindings]{@link BindGroupBindingElement} (buffers, texture, etc.) to pass to this {@link BindGroup}
 * @property {BindGroupInputs} [inputs={}] - [inputs]{@link BindGroupInputs} that will be used to create additional {@link BindGroup} [bindings]{@link BindGroupBindingElement}
 */
export interface BindGroupParams {
    label?: string;
    index?: number;
    bindings?: BindGroupBindingElement[];
    inputs?: BindGroupInputs;
}
/**
 * An object used to define {@link BindGroup} entries
 * @typedef {BindGroupEntries}
 * @property {GPUBindGroupLayoutEntry[]} bindGroupLayout - [GPUBindGroupLayout descriptor]{@link GPUBindGroupLayoutDescriptor} entries
 * @property {GPUBindGroupEntry[]} bindGroup - [GPUBindGroup descriptor]{@link GPUBindGroupDescriptor} entries
 */
export interface BindGroupEntries {
    bindGroupLayout: GPUBindGroupLayoutEntry[];
    bindGroup: GPUBindGroupEntry[];
}
/**
 * Defines all kind of possible input value types
 * @type {InputValue}
 */
export type InputValue = number | Vec2 | Vec3 | Mat4 | number[];
/**
 * Defines the base object on which an {@link Input} is based.
 * @typedef {InputBase}
 * @property {AttributeBufferParams['type']} type - {@link InputBase} type - could be 'f32', 'vec2f', etc.
 * @property {?string} name - {@link InputBase} name
 * @property {?function} onBeforeUpdate - callback to run before updating the [binding]{@link BindGroupBufferBindingElement} using this {@link InputBase}
 */
export interface InputBase {
    type: AttributeBufferParams['type'];
    name?: string;
    onBeforeUpdate?: () => void;
}
/**
 * An {@link Input} is an object used to pass data from the CPU to the GPU either via uniforms or storages.
 *
 * @typedef {Input}
 * @extends InputBase
 * @property {InputValue} value - The {@link Input} value
 */
export interface Input extends InputBase {
    value: InputValue;
}
/**
 * An object defining all possible {@link Bindings} instancing parameters
 * @typedef {InputBindingsParams}
 * @property {?string} label - {@link Bindings} label
 * @property {boolean} [useStruct=true] - Whether this {@link Bindings} should use structured WGSL variables
 * @property {?MaterialShadersType} visibility - {@link Bindings} variables shaders visiblity
 * @property {Object.<string, Input>} bindings - Object containing one or multiple {@link Input}
 */
export interface InputBindingsParams {
    label?: string;
    useStruct?: boolean;
    visibility?: MaterialShadersType;
    bindings: Record<string, Input>;
}
/**
 * @typedef {WorkInputBindingsParams}
 * @extends InputBindingsParams
 * @property {?(number | number[])} dispatchSize - work group dispatch size to use
 */
export interface WorkInputBindingsParams extends InputBindingsParams {
    dispatchSize?: number | number[];
}
/**
 * Defines all kind of input bindings params
 * @type {AllowedInputBindingsParams}
 */
export type AllowedInputBindingsParams = InputBindingsParams | WorkInputBindingsParams;
/**
 * Defines an input bindings
 * @type {Object.<string, AllowedInputBindingsParams>}
 */
export type InputBindings = Record<string, AllowedInputBindingsParams>;
