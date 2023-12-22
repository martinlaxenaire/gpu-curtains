import { PlaneGeometry } from '../core/geometries/PlaneGeometry'

/**
 * CacheManager class:
 * Used to cache [plane geometries]{@link PlaneGeometry} and avoidas many large array computations as possible.
 * Could be improved to handle other caches.
 */
export class CacheManager {
  /** Array of cached [plane geometries]{@link PlaneGeometry} */
  planeGeometries: PlaneGeometry[]

  /**
   * CacheManager constructor
   */
  constructor() {
    this.planeGeometries = []
  }

  /**
   * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition id]{@link PlaneGeometry#definition.id}
   * @param planeGeometry - [plane geometry]{@link PlaneGeometry} to check
   * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometry(planeGeometry: PlaneGeometry): PlaneGeometry | null {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id)
  }

  /**
   * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition]{@link PlaneGeometry#definition}
   * @param planeGeometryID - [plane geometry definition id]{@link PlaneGeometry#definition.id}
   * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
   */
  getPlaneGeometryByID(planeGeometryID: number): PlaneGeometry | null {
    return this.planeGeometries.find((element) => element.definition.id === planeGeometryID)
  }

  /**
   * Add a [plane geometry]{@link PlaneGeometry} to our cache [plane geometries array]{@link CacheManager#planeGeometries}
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

/** @exports @const cacheManager - {@link CacheManager} class object */
export const cacheManager = new CacheManager() as CacheManager
