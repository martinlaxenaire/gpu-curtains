/// <reference types="dist" />
import { BufferBinding } from './BufferBinding';
import { TextureBinding } from './TextureBinding';
import { MaterialShadersType } from '../../types/Materials';
/**
 * Get the corresponding {@link GPUDevice.createBindGroupLayout().visibility | GPUShaderStageFlags} based on an array of {@link MaterialShadersType | shaders types names}.
 * @param visibilities - array of {@link MaterialShadersType | shaders types names}.
 * @returns - corresponding {@link GPUDevice.createBindGroupLayout().visibility | GPUShaderStageFlags}.
 */
export declare const getBindingVisibility: (visibilities?: MaterialShadersType[]) => GPUShaderStageFlags;
/** Defines a typed array */
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
/** Defines a typed array constructor */
export type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;
/** Defines the possible base WGSL variable types */
export type WGSLBaseVariableType = string;
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
 * Get the correct {@link BufferLayout | buffer layout} for given {@link WGSLVariableType | variable type}
 * @param bufferType - [{@link WGSLVariableType | variable type} to use
 * @returns - the ={@link BufferLayout | buffer layout}
 */
export declare const getBufferLayout: (bufferType: WGSLVariableType) => BufferLayout;
/**
 * Get the correct WGSL variable declaration code fragment based on the given {@link BufferBinding}
 * @param binding - {@link BufferBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export declare const getBindingWGSLVarType: (binding: BufferBinding) => string;
/**
 * Get the correct WGSL variable declaration code fragment based on the given {@link TextureBinding}
 * @param binding - {@link TextureBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export declare const getTextureBindingWGSLVarType: (binding: TextureBinding) => string;
/**
 * Get the correct {@link GPUBindGroupLayout | bind group layout} resource type based on the given {@link core/bindings/Binding.BindingType | binding type}
 * @param binding - {@link BufferBinding | buffer binding} to use
 * @returns - {@link GPUBindGroupLayout | bind group layout} resource type
 */
export declare const getBindGroupLayoutBindingType: (binding: BufferBinding) => GPUBufferBindingType;
/**
 * Get the correct {@link GPUBindGroupLayout} resource type based on the given {@link core/bindings/Binding.BindingType | texture binding type}
 * @param binding - {@link TextureBinding | texture binding} to use
 * @returns - {@link GPUBindGroupLayout} resource type
 */
export declare const getBindGroupLayoutTextureBindingType: (binding: TextureBinding) => GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null;
/**
 * Get the correct {@link TextureBinding | texture binding} cache key.
 * @param binding - {@link TextureBinding | texture binding} to use
 * @returns - binding cache key
 */
export declare const getBindGroupLayoutTextureBindingCacheKey: (binding: TextureBinding) => string;
