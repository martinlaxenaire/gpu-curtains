import { IndexedGeometry } from './IndexedGeometry';
import { Geometry } from './Geometry';
import { GeometryBaseParams, VertexBufferAttributeParams } from '../../types/Geometries';
/**
 * Parameters used to create a {@link PlaneGeometry}
 */
export interface PlaneGeometryParams extends GeometryBaseParams {
    /** Number of segments along the X axis */
    widthSegments?: number;
    /** Number of segments along the Y axis */
    heightSegments?: number;
}
/**
 * Used to create an indexed plane geometry based on the number of segments along the X and Y axis.
 *
 * This is how it will look for a 3x2 quad. Indexing will take care of drawing the right vertices in the right order.
 * <pre>
 *  0---1---2---3
 *  |  /|  /|  /|
 *  |/  |/  |/  |
 *  4---5---6---7
 *  |  /|  /|  /|
 *  |/  |/  |/  |
 *  8---9---10--11
 * </pre>
 * @example
 * ```javascript
 * const planeGeometry = new PlaneGeometry()
 * ```
 */
export declare class PlaneGeometry extends IndexedGeometry {
    /**
     * Defines our {@link PlaneGeometry} definition based on the provided {@link PlaneGeometryParams | parameters}
     */
    definition: {
        /** unique id based on width and height segments, used to get {@link PlaneGeometry} from cache */
        id: number;
        /** number of segments along the X axis */
        width: number;
        /** number of segments along the Y axis */
        height: number;
        /** total number of segments */
        count: number;
    };
    /**
     * PlaneGeometry constructor
     * @param parameters - {@link PlaneGeometryParams | parameters} used to create our PlaneGeometry
     */
    constructor({ widthSegments, heightSegments, instancesCount, vertexBuffers, topology, }?: PlaneGeometryParams);
    /**
     * Set our PlaneGeometry index array
     */
    setIndexArray(): void;
    /**
     * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
     * @param verticesCount - {@link Geometry#verticesCount | number of vertices} of our {@link PlaneGeometry}
     * @returns - our position and uv {@link VertexBufferAttributeParams | attributes}
     */
    getIndexedVerticesAndUVs(verticesCount: Geometry['verticesCount']): Record<string, VertexBufferAttributeParams>;
}
