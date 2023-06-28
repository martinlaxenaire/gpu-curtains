// TODO handle textures?
class CacheManager {
  constructor() {
    this.planeGeometries = []
  }

  getPlaneGeometry(planeGeometry) {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id)
  }

  addPlaneGeometry(planeGeometry) {
    this.planeGeometries.push(planeGeometry)
  }

  destroy() {
    this.planeGeometries = []
  }
}

export const cacheManager = new CacheManager()
