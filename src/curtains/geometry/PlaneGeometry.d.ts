import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'

export class PlaneGeometry extends IndexedGeometry {
  definition: {
    id: number
    width: number
    height: number
    count: number
  }

  constructor({ widthSegments, heightSegments }: { widthSegments?: number; heightSegments?: number })

  setIndexArray()

  getIndexedVerticesAndUVs(vertexCount: number): Record<string, CoreBufferPropsOption>
}
