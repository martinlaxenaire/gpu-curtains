export class Geometry {
  vertexCount: null | number
  arrayStride: number
  bufferLength: number

  attributes: CoreBufferProps[]

  array: Float32Array

  wgslStructFragment: string

  constructor()

  setAttribute({ name, type, bufferFormat, size, array }: CoreBufferPropsOption)

  computeGeometry()

  setWGSLFragment()
}
