import { GeometryBaseParams } from '../../core/geometries/Geometry'

export interface BoxGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
  depthSegments?: number
}
