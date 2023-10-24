import { IndexedGeometry } from './IndexedGeometry'
import { AttributeBufferParamsOption } from '../../types/buffers-utils'
import { GeometryBaseParams } from './Geometry'

interface PlaneGeometryParams extends GeometryBaseParams {
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

  constructor({ widthSegments, heightSegments, instancesCount, vertexBuffers }?: PlaneGeometryParams)

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, AttributeBufferParamsOption>
}
