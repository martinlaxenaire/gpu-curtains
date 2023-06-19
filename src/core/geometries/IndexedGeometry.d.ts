import { Geometry } from './Geometry'

interface IndexedGeometryIndexDataOptions {
  bufferFormat?: GPUVertexFormat
  array?: Uint32Array
}

interface IndexedGeometryIndexData extends IndexedGeometryIndexDataOptions {
  bufferFormat: GPUVertexFormat
  array: Uint32Array
  bufferLength: number
}

export class IndexedGeometry extends Geometry {
  isIndexed: boolean
  indexData: IndexedGeometryIndexData

  setIndexData({ bufferFormat, array }: IndexedGeometryIndexDataOptions)
}