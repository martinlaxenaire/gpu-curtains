import { PlaneGeometry } from '../core/geometries/PlaneGeometry';
/**
 * Used to cache {@link PlaneGeometry} and avoid as many large array computations as possible.<br>
 * Could be improved to handle other caches.
 */
export declare class CacheManager {
    /** Array of cached {@link PlaneGeometry} */
    planeGeometries: PlaneGeometry[];
    /**
     * CacheManager constructor
     */
    constructor();
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition.id | definition id}
     * @param planeGeometry - {@link PlaneGeometry} to check
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometry(planeGeometry: PlaneGeometry): PlaneGeometry | null;
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition | definition id}
     * @param planeGeometryID - {@link PlaneGeometry#definition.id | PlaneGeometry definition id}
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometryByID(planeGeometryID: number): PlaneGeometry | null;
    /**
     * Add a {@link PlaneGeometry} to our cache {@link planeGeometries} array
     * @param planeGeometry
     */
    addPlaneGeometry(planeGeometry: PlaneGeometry): void;
    /**
     * Destroy our {@link CacheManager}
     */
    destroy(): void;
}
/** The {@link CacheManager} instance. */
export declare const cacheManager: CacheManager;
