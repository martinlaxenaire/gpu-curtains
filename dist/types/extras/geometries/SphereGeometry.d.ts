import { IndexedGeometry } from '../../core/geometries/IndexedGeometry';
import { GeometryBaseParams } from '../../types/Geometries';
interface SphereGeometryParams extends GeometryBaseParams {
    widthSegments?: number;
    heightSegments?: number;
    phiStart?: number;
    phiLength?: number;
    thetaStart?: number;
    thetaLength?: number;
}
export declare class SphereGeometry extends IndexedGeometry {
    constructor({ widthSegments, heightSegments, phiStart, phiLength, thetaStart, thetaLength, instancesCount, vertexBuffers, }?: SphereGeometryParams);
}
export {};
