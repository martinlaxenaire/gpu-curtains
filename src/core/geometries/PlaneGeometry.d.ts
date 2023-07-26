import { IndexedGeometry } from './IndexedGeometry'
import { AttributeBufferParamsOption } from '../../types/buffers-utils'

interface PlaneGeometryParams {
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

  constructor({ widthSegments, heightSegments }: PlaneGeometryParams)

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, AttributeBufferParamsOption>
}
