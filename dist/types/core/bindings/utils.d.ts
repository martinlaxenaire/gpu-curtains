/// <reference types="dist" />
import { BufferBinding } from './BufferBinding';
import { TextureBinding } from './TextureBinding';
/** Defines a typed array */
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
/** Defines a typed array constructor */
export type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;
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
    /** Size in bytes of this variable type */
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
 * Get the correct WGSL variable declaration code fragment based on the given [buffer binding]{@link BufferBinding}
 * @param binding - [buffer binding]{@link BufferBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export declare const getBindingWGSLVarType: (binding: BufferBinding) => string;
/**
 * Get the correct WGSL variable declaration code fragment based on the given [texture binding]{@link TextureBinding}
 * @param binding - [texture binding]{@link TextureBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export declare const getTextureBindingWGSLVarType: (binding: TextureBinding) => string;
/**
 * Get the correct [bind group layout]{@link GPUBindGroupLayout} resource type based on the given [binding type]{@link BindingType}
 * @param binding - [buffer binding]{@link BufferBinding} to use
 * @returns - {@link GPUBindGroupLayout | bind group layout} resource type
 */
export declare const getBindGroupLayoutBindingType: (binding: BufferBinding) => GPUBufferBindingType;
/**
 * Get the correct [bind group layout]{@link GPUBindGroupLayout} resource type based on the given [texture binding type]{@link BindingType}
 * @param binding - [texture binding]{@link TextureBinding} to use
 * @returns - [bind group layout]{@link GPUBindGroupLayout} resource type
 */
export declare const getBindGroupLayoutTextureBindingType: (binding: TextureBinding) => GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null;
