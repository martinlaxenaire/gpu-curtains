import { GeometryBaseParams } from './Geometry'

export interface PlaneGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
}
