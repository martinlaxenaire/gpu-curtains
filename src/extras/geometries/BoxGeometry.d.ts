import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { GeometryBaseParams, GeometryParams } from '../../core/geometries/Geometry'

interface BoxGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
}

export class BoxGeometry extends IndexedGeometry {
  constructor({ widthSegments, heightSegments, depthSegments, instancesCount, vertexBuffers }?: BoxGeometryParams)
}
