import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { GeometryProps } from '../../core/geometries/Geometry'

interface PlaneGeometryProps extends GeometryProps {
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

  constructor({ widthSegments, heightSegments, verticesOrder }: PlaneGeometryProps)

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, CoreBufferPropsOption>
}
