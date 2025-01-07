import { PlaneGeometry } from '../core/geometries/PlaneGeometry'

/**
 * Used to cache {@link PlaneGeometry} and avoid as many large array computations as possible.<br>
 * Could be improved to handle other caches.
 */
export class CacheManager {
  /** Array of cached {@link PlaneGeometry} */
  planeGeometries: PlaneGeometry[]

  /**
   * CacheManager constructor
   */
  constructor() {
    this.planeGeometries = []
  }

  /**
   * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition.id | definition id}
   * @param planeGeometry - {@link PlaneGeometry} to check
   * @returns - {@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometry(planeGeometry: PlaneGeometry): PlaneGeometry | null {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id)
  }

  /**
   * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition | definition id}
   * @param planeGeometryID - {@link PlaneGeometry#definition.id | PlaneGeometry definition id}
   * @returns - {@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometryByID(planeGeometryID: number): PlaneGeometry | null {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometryID)
  }

  /**
   * Add a {@link PlaneGeometry} to our cache {@link planeGeometries} array
   * @param planeGeometry
   */
  addPlaneGeometry(planeGeometry: PlaneGeometry) {
    this.planeGeometries.push(planeGeometry)
  }

  /**
   * Destroy our {@link CacheManager}
   */
  destroy() {
    this.planeGeometries = []
  }
}

/** The {@link CacheManager} instance. */
export const cacheManager = new CacheManager() as CacheManager
