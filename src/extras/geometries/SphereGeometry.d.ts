import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { GeometryBaseParams, GeometryParams } from '../../core/geometries/Geometry'

interface SphereGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
  phiStart?: number
  phiLength?: number
  thetaStart?: number
  thetaLength?: number
}

export class SphereGeometry extends IndexedGeometry {
  constructor({
    widthSegments,
    heightSegments,
    phiStart,
    phiLength,
    thetaStart,
    thetaLength,
    instancesCount,
    vertexBuffers,
  }?: SphereGeometryParams)
}
