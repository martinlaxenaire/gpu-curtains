import { IndexedGeometry } from './IndexedGeometry'
import { GeometryParams } from './Geometry'
import { AttributeBufferParamsOption } from '../../types/buffers-utils'

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

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, AttributeBufferParamsOption>
}
