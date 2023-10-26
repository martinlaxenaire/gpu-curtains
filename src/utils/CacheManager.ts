// TODO handle textures?
// TODO type will change?!
import { PlaneGeometry } from '../core/geometries/PlaneGeometry'

export class CacheManager {
  planeGeometries: PlaneGeometry[]

  constructor() {
    this.planeGeometries = []
  }

  getPlaneGeometry(planeGeometry: PlaneGeometry) {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id)
  }

  getPlaneGeometryByID(planeGeometryID: number) {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometryID)
  }

  addPlaneGeometry(planeGeometry: PlaneGeometry) {
    this.planeGeometries.push(planeGeometry)
  }

  destroy() {
    this.planeGeometries = []
  }
}

export const cacheManager = new CacheManager() as CacheManager
