import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'

interface SphereGeometryParams {
  widthSegments?: number
  heightSegments?: number
  phiStart?: number
  phiLength?: number
  thetaStart?: number
  thetaLength?: number
}

export class SphereGeometry extends IndexedGeometry {
  constructor({ widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength }?: SphereGeometryParams)
}
