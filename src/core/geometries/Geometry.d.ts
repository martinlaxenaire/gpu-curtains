interface GeometryProps {
  verticesOrder?: GPUFrontFace
}

export class Geometry {
  verticesCount: null | number
  verticesOrder: GPUFrontFace
  arrayStride: number
  bufferLength: number

  attributes: CoreBufferProps[]

  array: Float32Array

  wgslStructFragment: string

  constructor({ verticesOrder }: GeometryProps)

  setAttribute({ name, type, bufferFormat, size, array }: CoreBufferPropsOption)

  computeGeometry()

  setWGSLFragment()
}
