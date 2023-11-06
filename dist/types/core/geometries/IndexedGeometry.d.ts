/// <reference types="dist" />
import { Geometry } from './Geometry';
import { GeometryParams, IndexBuffer } from '../../types/Geometries';
export interface IndexedGeometryIndexBufferOptions {
    bufferFormat?: GPUIndexFormat;
    array?: Uint32Array;
}
/**
 * IndexedGeometry class:
 * Used to created an indexed geometry which holds an index array to use as indexBuffer
 * @extends Geometry
 */
export declare class IndexedGeometry extends Geometry {
    indexBuffer: IndexBuffer;
    /**
     * IndexedGeometry constructor
     * @param {GeometryParams} [parameters={}] - parameters used to create our IndexedGeometry
     * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     */
    constructor({ verticesOrder, instancesCount, vertexBuffers }?: GeometryParams);
    /**
     *
     * @param {IndexedGeometryIndexBufferOptions} parameters - parameters used to create our index buffer
     * @param {GPUIndexFormat} [parameters.bufferFormat="uint32"]
     * @param {Uint32Array} [parameters.array=Uint32Array]
     */
    setIndexBuffer({ bufferFormat, array }: IndexedGeometryIndexBufferOptions): void;
    /** RENDER **/
    /**
     * First, set our render pass geometry vertex buffers
     * Then, set our render pass geometry index buffer
     * @param pass - current render pass
     */
    setGeometryBuffers(pass: GPURenderPassEncoder): void;
    /**
     * Override the parent draw method to draw indexed geometry
     * @param pass - current render pass
     */
    drawGeometry(pass: GPURenderPassEncoder): void;
}
