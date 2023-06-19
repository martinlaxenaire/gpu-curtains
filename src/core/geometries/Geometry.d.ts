import { Vec3 } from '../../math/Vec3'
import { Box3 } from '../../math/Box3'

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
//   attributes: CoreBufferParams[]
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

  attributes: CoreBufferParams[]

  boundingBox: Box3

  array: Float32Array

  wgslStructFragment: string

  constructor({ verticesOrder }?: GeometryParams)

  setAttribute({ name, type, bufferFormat, size, array }: CoreBufferParamsOption)

  computeGeometry()

  setWGSLFragment()
}
