import { IndexedGeometry } from '../../core/geometries/IndexedGeometry';
import { GeometryBaseParams } from '../../types/Geometries';
interface BoxGeometryParams extends GeometryBaseParams {
    widthSegments?: number;
    heightSegments?: number;
    depthSegments?: number;
}
export declare class BoxGeometry extends IndexedGeometry {
    constructor({ widthSegments, heightSegments, depthSegments, instancesCount, vertexBuffers, }?: BoxGeometryParams);
}
export {};
