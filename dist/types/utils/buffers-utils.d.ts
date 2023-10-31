/// <reference types="dist" />
import { InputValue } from '../types/BindGroups';
import { VertexBuffer } from '../types/Geometries';
import { BindingType } from '../core/bindings/Bindings';
export type TypedArray = Int8Array | Uint8Array | Uint8ClampedArray | Int16Array | Uint16Array | Int32Array | Uint32Array | Float32Array | Float64Array;
type CoreBufferType = string;
type TypedArrayConstructor = Int8ArrayConstructor | Uint8ArrayConstructor | Int16ArrayConstructor | Uint16ArrayConstructor | Int32ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor | Float64ArrayConstructor;
export type BufferLayout = {
    numElements: number;
    align: number;
    size: number;
    type: CoreBufferType;
    View: TypedArrayConstructor;
    pad?: number[];
};
export interface BufferBindingsElement {
    name: string;
    type: CoreBufferType;
    key: string;
    update: (value: InputValue) => void;
    bufferLayout: BufferLayout;
    startOffset: number;
    endOffset: number;
    array?: TypedArray;
}
export interface AttributeBufferParamsOption {
    vertexBuffer?: VertexBuffer;
    name: string;
    type?: CoreBufferType;
    bufferFormat?: GPUVertexFormat;
    size?: number;
    array: Float32Array;
    verticesUsed?: number;
}
export interface AttributeBufferParams extends AttributeBufferParamsOption {
    type: CoreBufferType;
    bufferFormat: GPUVertexFormat;
    size: number;
    bufferLength: number;
    offset: number;
    bufferOffset: GPUSize64;
    verticesUsed: number;
}
export declare const getBufferLayout: (bufferType: CoreBufferType) => BufferLayout;
export declare const getBufferArrayStride: (bindingElement: BufferBindingsElement) => number;
export declare const getBindingWgslVarType: (bindingType: BindingType) => string;
export declare const getBindGroupLayoutBindingType: (bindingType: BindingType) => GPUBufferBindingType;
export {};
