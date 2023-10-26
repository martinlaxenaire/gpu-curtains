//import { Box3 } from '../../../math/Box3'
import { AttributeBufferParams, AttributeBufferParamsOption } from '../../../utils/buffers-utils'

export interface IndexBuffer {
  bufferFormat: GPUIndexFormat
  array: Uint32Array
  bufferLength: number
  buffer?: GPUBuffer
}

export interface VertexBuffer {
  name: string
  stepMode: GPUVertexStepMode
  arrayStride: number
  bufferLength: number
  attributes: AttributeBufferParams[]
  array?: Float32Array
  buffer?: GPUBuffer
  indexBuffer?: IndexBuffer
}

export interface VertexBufferParams {
  stepMode?: GPUVertexStepMode
  name?: string
  attributes?: AttributeBufferParamsOption[]
}

export interface GeometryOptions {
  instancesCount: number
  // TODO ugly fix so typescript does not complain about GPUFrontFace being a string
  verticesOrder?: GPUFrontFace
  vertexBuffers: VertexBufferParams[]
}

export type GeometryParams = Partial<GeometryOptions>
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>

// export class Geometry {
//   verticesCount: number
//   verticesOrder: GPUFrontFace
//   instancesCount: number
//   vertexBuffers: VertexBuffer[]
//   type: string
//
//   boundingBox: Box3
//
//   wgslStructFragment: string
//
//   constructor({ verticesOrder, instancesCount, vertexBuffers }?: GeometryParams)
//
//   #addVertexBuffer({ stepMode, name, attributes }?: VertexBufferParams): VertexBuffer
//   getVertexBufferByName(name?: string): VertexBuffer | null
//
//   setAttribute({ vertexBuffer, name, type, bufferFormat, size, array, verticesUsed }: AttributeBufferParamsOption)
//   getAttributeByName(name: string): AttributeBufferParams | null
//
//   get shouldCompute(): boolean
//   computeGeometry()
//
//   #setWGSLFragment()
// }
