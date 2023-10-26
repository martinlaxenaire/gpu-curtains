import { VertexBuffer } from './Geometry'

export interface IndexedGeometryIndexBufferOptions {
  vertexBuffer?: VertexBuffer
  bufferFormat?: GPUIndexFormat
  array?: Uint32Array
}
