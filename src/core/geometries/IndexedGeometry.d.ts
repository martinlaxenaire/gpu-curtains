import { Geometry, VertexBuffer } from './Geometry'

interface IndexedGeometryIndexBufferOptions {
  vertexBuffer?: VertexBuffer
  bufferFormat?: GPUVertexFormat
  array?: Uint32Array
}

export class IndexedGeometry extends Geometry {
  isIndexed: boolean

  setIndexBuffer({ vertexBuffer, bufferFormat, array }: IndexedGeometryIndexBufferOptions)
}
