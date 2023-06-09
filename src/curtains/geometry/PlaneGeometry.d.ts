import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'

interface PlaneGeometryProps {
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

  constructor({ widthSegments, heightSegments }: PlaneGeometryProps)

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, CoreBufferPropsOption>
}
