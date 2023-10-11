import { Box3 } from '../../math/Box3'
import { AttributeBufferParams, AttributeBufferParamsOption } from '../../types/buffers-utils'

interface IndexBuffer {
  bufferFormat: GPUIndexFormat
  array: Uint32Array
  bufferLength: number
  buffer?: GPUBuffer
}

interface VertexBuffer {
  stepMode: GPUVertexStepMode
  arrayStride: number
  bufferLength: number
  attributes: AttributeBufferParams[]
  array?: Float32Array
  buffer?: GPUBuffer
  indexBuffer?: IndexBuffer
}

interface VertexBufferParams {
  stepMode?: GPUVertexStepMode
  attributes?: AttributeBufferParamsOption[]
}

interface GeometryOptions {
  instancesCount: number
  // TODO ugly fix so typescript does not complain about GPUFrontFace being a string
  verticesOrder?: GPUFrontFace | string
  vertexBuffers: VertexBufferParams[]
}

type GeometryParams = Partial<GeometryOptions>
export type GeometryBaseParams = Omit<GeometryParams, 'verticesOrder'>

export class Geometry {
  verticesCount: number
  verticesOrder: GPUFrontFace
  instancesCount: number
  vertexBuffers: VertexBuffer[]
  type: string

  boundingBox: Box3

  wgslStructFragment: string

  constructor({ verticesOrder, instancesCount, vertexBuffers }?: GeometryParams)

  setAttribute({ vertexBuffer, name, type, bufferFormat, size, array }: AttributeBufferParamsOption)

  getAttribute(name: string): AttributeBufferParams | null

  computeGeometry()

  setWGSLFragment()
}
