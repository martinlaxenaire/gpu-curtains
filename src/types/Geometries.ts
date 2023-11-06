import { CoreBufferType } from '../utils/buffers-utils'

export interface VertexBufferAttributeParams {
  vertexBuffer?: VertexBuffer
  name: string
  type?: CoreBufferType
  bufferFormat?: GPUVertexFormat
  size?: number
  array: Float32Array
  verticesUsed?: number
}

export interface VertexBufferAttribute extends VertexBufferAttributeParams {
  type: CoreBufferType
  bufferFormat: GPUVertexFormat
  size: number
  bufferLength: number
  offset: number
  bufferOffset: GPUSize64
  verticesUsed: number
}

export interface VertexBuffer {
  name: string
  stepMode: GPUVertexStepMode
  arrayStride: number
  bufferLength: number
  attributes: VertexBufferAttribute[]
  array?: Float32Array
  buffer?: GPUBuffer
}

export interface VertexBufferParams {
  stepMode?: GPUVertexStepMode
  name?: string
  attributes?: VertexBufferAttributeParams[]
}

export interface GeometryOptions {
  instancesCount: number
  verticesOrder?: GPUFrontFace
  vertexBuffers: VertexBufferParams[]
}

export type GeometryParams = Partial<GeometryOptions>
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>
