/// <reference types="dist" />
import { BindingType } from '../core/bindings/Bindings';
import { BufferBindingsElement } from '../core/bindings/BufferBindings';
/** Defines a typed array */
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
/** Defines a typed array constructor */
type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;
/** Defines the possible WGSL variable types */
export type WGSLVariableType = string;
/**
 * Defines a {@link BufferLayout} object used to pad our {@link GPUBuffer} arrays
 */
export type BufferLayout = {
    /** Number of elements hold by this variable type */
    numElements: number;
    /** Required alignment by this variable type */
    align: number;
    /** Size of this variable type */
    size: number;
    /** Variable type */
    type: WGSLVariableType;
    /** Typed array constructor required by this variable type */
    View: TypedArrayConstructor;
    /** Pad values required by this variable type */
    pad?: number[];
};
/**
 * Get the correct [buffer layout]{@link BufferLayout} for given [variable type]{@link WGSLVariableType}
 * @param bufferType - [variable type]{@link WGSLVariableType} to use
 * @returns - the [buffer layout]{@link BufferLayout}
 */
export declare const getBufferLayout: (bufferType: WGSLVariableType) => BufferLayout;
/**
 * Get the correct buffer array stride for the given [binding element]{@link BufferBindingsElement}
 * @param bindingElement - [binding element]{@link BufferBindingsElement} to use
 * @returns - buffer array stride value
 */
export declare const getBufferArrayStride: (bindingElement: BufferBindingsElement) => number;
/**
 * Get the correct WGSL variable declaration code fragment based on the given [binding type]{@link BindingType}
 * @param bindingType - [binding type]{@link BindingType} to use
 * @returns - WGSL variable declaration code fragment
 */
export declare const getBindingWGSLVarType: (bindingType: BindingType) => string;
/**
 * Get the correct [bind group layout]{@link GPUBindGroupLayout} resource type based on the given [binding type]{@link BindingType}
 * @param bindingType - [binding type]{@link BindingType} to use
 * @returns - [bind group layout]{@link GPUBindGroupLayout} resource type
 */
export declare const getBindGroupLayoutBindingType: (bindingType: BindingType) => GPUBufferBindingType;
export {};
