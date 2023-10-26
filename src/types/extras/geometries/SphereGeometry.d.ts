import { GeometryBaseParams } from '../../core/geometries/Geometry'

export interface SphereGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
  phiStart?: number
  phiLength?: number
  thetaStart?: number
  thetaLength?: number
}
