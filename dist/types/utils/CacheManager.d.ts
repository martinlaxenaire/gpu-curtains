import { PlaneGeometry } from '../core/geometries/PlaneGeometry';
export declare class CacheManager {
    planeGeometries: PlaneGeometry[];
    constructor();
    getPlaneGeometry(planeGeometry: PlaneGeometry): PlaneGeometry;
    getPlaneGeometryByID(planeGeometryID: number): PlaneGeometry;
    addPlaneGeometry(planeGeometry: PlaneGeometry): void;
    destroy(): void;
}
export declare const cacheManager: CacheManager;
