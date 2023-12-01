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
 * PlaneGeometry class:
 * Used to create an indexed plane geometry based on the number of segments along the X and Y axis.
 * @extends IndexedGeometry
 */
export declare class PlaneGeometry extends IndexedGeometry {
    /**
     * Defines our {@link PlaneGeometry} definition based on the provided [parameters]{@link PlaneGeometryParams}
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
     * @param {PlaneGeometryParams} [parameters={}] - parameters used to create our PlaneGeometry
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     * @param {number} [parameters.widthSegments=1] - number of segments along the X axis
     * @param {number} [parameters.heightSegments=1] - number of segments along the Y axis
     */
    constructor({ widthSegments, heightSegments, instancesCount, vertexBuffers, topology, }?: PlaneGeometryParams);
    /**
     * Set our PlaneGeometry index array
     */
    setIndexArray(): void;
    /**
     * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
     * @param verticesCount - [number of vertices]{@link Geometry#verticesCount} of our {@link PlaneGeometry}
     * @returns - our position and uv [attributes]{@link VertexBufferAttributeParams}
     */
    getIndexedVerticesAndUVs(verticesCount: Geometry['verticesCount']): Record<string, VertexBufferAttributeParams>;
}
