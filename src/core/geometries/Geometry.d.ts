import { Box3 } from '../../math/Box3'
import { AttributeBufferParams, AttributeBufferParamsOption } from '../../types/buffers-utils'

interface GeometryParams {
  // TODO ugly fix so typescript does not complain about GPUFrontFace being a string
  verticesOrder?: GPUFrontFace | string
}

// interface GeometryProps {
//   verticesCount: null | number
//   verticesOrder: GPUFrontFace
//   arrayStride: number
//   bufferLength: number
//
//   attributes: AttributeBufferParams[]
//
//   array: Float32Array
//
//   wgslStructFragment: string
// }

export class Geometry {
  verticesCount: null | number
  verticesOrder: GPUFrontFace
  arrayStride: number
  bufferLength: number

  attributes: AttributeBufferParams[]

  boundingBox: Box3

  array: Float32Array

  wgslStructFragment: string

  constructor({ verticesOrder }?: GeometryParams)

  setAttribute({ name, type, bufferFormat, size, array }: AttributeBufferParamsOption)

  getAttribute(name: string): AttributeBufferParams | null

  computeGeometry()

  setWGSLFragment()
}
