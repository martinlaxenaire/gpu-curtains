//import { Geometry, VertexBuffer } from './Geometry'
import { VertexBuffer } from './Geometry'

export interface IndexedGeometryIndexBufferOptions {
  vertexBuffer?: VertexBuffer
  bufferFormat?: GPUIndexFormat
  array?: Uint32Array
}

// export class IndexedGeometry extends Geometry {
//   isIndexed: boolean
//
//   setIndexBuffer({ vertexBuffer, bufferFormat, array }: IndexedGeometryIndexBufferOptions)
// }
