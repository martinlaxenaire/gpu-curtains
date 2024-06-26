import { IndexedGeometry } from '../../core/geometries/IndexedGeometry';
import { GeometryBaseParams } from '../../types/Geometries';
/**
 * Parameters used to create a {@link SphereGeometry}
 */
export interface SphereGeometryParams extends GeometryBaseParams {
    /** Number of horizontal segments */
    widthSegments?: number;
    /** Number of vertical segments */
    heightSegments?: number;
    /** Horizontal starting angle */
    phiStart?: number;
    /** Horizontal sweep angle size */
    phiLength?: number;
    /** Vertical starting angle */
    thetaStart?: number;
    /** Vertical sweep angle size */
    thetaLength?: number;
}
/**
 * Helper to easily create 3D sphere indexed geometries.
 *
 * @example
 * ```javascript
 * const sphereGeometry = new SphereGeometry()
 * ```
 */
export declare class SphereGeometry extends IndexedGeometry {
    constructor({ topology, instancesCount, vertexBuffers, mapBuffersAtCreation, widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength, }?: SphereGeometryParams);
}
