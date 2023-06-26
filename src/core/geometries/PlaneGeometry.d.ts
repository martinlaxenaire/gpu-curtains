import { IndexedGeometry } from './IndexedGeometry'
import { GeometryParams } from './Geometry'

interface PlaneGeometryParams extends GeometryParams {
  widthSegments?: number
  heightSegments?: number
}

export class PlaneGeometry extends IndexedGeometry {
  definition: {
    id: number
    width: number
    height: number
    count: number
  }

  constructor({ widthSegments, heightSegments, verticesOrder }: PlaneGeometryParams)

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, CoreBufferParamsOption>
}
