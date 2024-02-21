class CacheManager {
  /**
   * CacheManager constructor
   */
  constructor() {
    this.planeGeometries = [];
  }
  /**
   * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition.id | definition id}
   * @param planeGeometry - {@link PlaneGeometry} to check
   * @returns - {@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometry(planeGeometry) {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id);
  }
  /**
   * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition | definition id}
   * @param planeGeometryID - {@link PlaneGeometry#definition.id | PlaneGeometry definition id}
   * @returns - {@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometryByID(planeGeometryID) {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometryID);
  }
  /**
   * Add a {@link PlaneGeometry} to our cache {@link planeGeometries} array
   * @param planeGeometry
   */
  addPlaneGeometry(planeGeometry) {
    this.planeGeometries.push(planeGeometry);
  }
  /**
   * Destroy our {@link CacheManager}
   */
  destroy() {
    this.planeGeometries = [];
  }
}
const cacheManager = new CacheManager();

export { CacheManager, cacheManager };
//# sourceMappingURL=CacheManager.mjs.map
