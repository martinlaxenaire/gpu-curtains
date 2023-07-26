import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'

interface BoxGeometryParams {
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
}

export class BoxGeometry extends IndexedGeometry {
  constructor({ widthSegments, heightSegments, depthSegments }?: BoxGeometryParams)
}
