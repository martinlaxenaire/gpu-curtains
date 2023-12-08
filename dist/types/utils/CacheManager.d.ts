import { PlaneGeometry } from '../core/geometries/PlaneGeometry';
/**
 * CacheManager class:
 * Used to cache [plane geometries]{@link PlaneGeometry} and avoidas many large array computations as possible.
 * Could be improved to handle other caches.
 */
export declare class CacheManager {
    /** Array of cached [plane geometries]{@link PlaneGeometry} */
    planeGeometries: PlaneGeometry[];
    /**
     * CacheManager constructor
     */
    constructor();
    /**
     * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition id]{@link PlaneGeometry#definition.id}
     * @param planeGeometry - [plane geometry]{@link PlaneGeometry} to check
     * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometry(planeGeometry: PlaneGeometry): PlaneGeometry | null;
    /**
     * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition]{@link PlaneGeometry#definition}
     * @param planeGeometryID - [plane geometry definition id]{@link PlaneGeometry#definition.id}
     * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometryByID(planeGeometryID: number): PlaneGeometry | null;
    /**
     * Add a [plane geometry]{@link PlaneGeometry} to our cache [plane geometries array]{@link CacheManager#planeGeometries}
     * @param planeGeometry
     */
    addPlaneGeometry(planeGeometry: PlaneGeometry): void;
    /**
     * Destroy our {@link CacheManager}
     */
    destroy(): void;
}
/** @exports @const cacheManager - {@link CacheManager} class object */
export declare const cacheManager: CacheManager;
