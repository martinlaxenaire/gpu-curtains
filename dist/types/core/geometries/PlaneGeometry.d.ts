import { IndexedGeometry } from './IndexedGeometry';
import { Geometry } from './Geometry';
import { AttributeBufferParamsOption } from '../../utils/buffers-utils';
import { GeometryBaseParams } from '../../types/Geometries';
export interface PlaneGeometryParams extends GeometryBaseParams {
    widthSegments?: number;
    heightSegments?: number;
}
/**
 * PlaneGeometry class:
 * Used to create an indexed plane geometry based on the number of segments along the X and Y axis.
 * @extends IndexedGeometry
 */
export declare class PlaneGeometry extends IndexedGeometry {
    definition: {
        id: number;
        width: number;
        height: number;
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
    constructor({ widthSegments, heightSegments, instancesCount, vertexBuffers, }?: PlaneGeometryParams);
    /**
     * Set our PlaneGeometry index array
     */
    setIndexArray(): void;
    /**
     * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
     * @param {Geometry['verticesCount']} verticesCount
     * @returns {Object.<string, AttributeBufferParamsOption>}
     */
    getIndexedVerticesAndUVs(verticesCount: Geometry['verticesCount']): Record<string, AttributeBufferParamsOption>;
}
