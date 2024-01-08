import { IndexedGeometry } from '../../core/geometries/IndexedGeometry';
import { GeometryBaseParams } from '../../types/Geometries';
/**
 * Parameters used to create a {@link BoxGeometry}
 */
export interface BoxGeometryParams extends GeometryBaseParams {
    /** Number of segments along the X axis */
    widthSegments?: number;
    /** Number of segments along the Y axis */
    heightSegments?: number;
    /** Number of segments along the Z axis */
    depthSegments?: number;
}
/**
 * Helper to easily create 3D box indexed geometries.
 */
export declare class BoxGeometry extends IndexedGeometry {
    constructor({ widthSegments, heightSegments, depthSegments, instancesCount, vertexBuffers, topology, }?: BoxGeometryParams);
}
