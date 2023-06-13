interface GeometryParams {
  verticesOrder?: GPUFrontFace
}

export class Geometry {
  verticesCount: null | number
  verticesOrder: GPUFrontFace
  arrayStride: number
  bufferLength: number

  attributes: CoreBufferParams[]

  array: Float32Array

  wgslStructFragment: string

  constructor({ verticesOrder }: GeometryParams)

  setAttribute({ name, type, bufferFormat, size, array }: CoreBufferParamsOption)

  computeGeometry()

  setWGSLFragment()
}
