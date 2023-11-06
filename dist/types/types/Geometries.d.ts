/// <reference types="dist" />
import { AttributeBufferParams, AttributeBufferParamsOption } from '../utils/buffers-utils';
export interface IndexBuffer {
    bufferFormat: GPUIndexFormat;
    array: Uint32Array;
    bufferLength: number;
    buffer?: GPUBuffer;
}
export interface VertexBuffer {
    name: string;
    stepMode: GPUVertexStepMode;
    arrayStride: number;
    bufferLength: number;
    attributes: AttributeBufferParams[];
    array?: Float32Array;
    buffer?: GPUBuffer;
}
export interface VertexBufferParams {
    stepMode?: GPUVertexStepMode;
    name?: string;
    attributes?: AttributeBufferParamsOption[];
}
export interface GeometryOptions {
    instancesCount: number;
    verticesOrder?: GPUFrontFace;
    vertexBuffers: VertexBufferParams[];
}
export type GeometryParams = Partial<GeometryOptions>;
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>;
