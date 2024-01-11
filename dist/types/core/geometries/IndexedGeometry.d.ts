/// <reference types="dist" />
import { Geometry } from './Geometry';
import { GeometryParams } from '../../types/Geometries';
/**
 * Defines the available options to create an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexedGeometryIndexBufferOptions {
    /** index buffer format */
    bufferFormat?: GPUIndexFormat;
    /** index buffer array */
    array?: Uint16Array | Uint32Array;
}
/**
 * Defines an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexBuffer {
    /** index buffer format */
    bufferFormat: GPUIndexFormat;
    /** index buffer array */
    array: Uint16Array | Uint32Array;
    /** index buffer length */
    bufferLength: number;
    /** index buffer {@link GPUBuffer} */
    buffer?: GPUBuffer;
}
/**
 * Used to create an indexed geometry which holds an index array to use as indexBuffer.
 *
 * @example
 * ```javascript
 * const vertices = new Float32Array([
 *   -1, -1,  0,
 *    1, -1,  0,
 *   -1,  1,  0,
 *    1,  1,  0
 * ])
 *
 * // vertices index (order in which they should be drawn)
 * const indexArray = new Uint16Array([0, 2, 1, 1, 2, 3])
 *
 * // create an indexed quad geometry made of 4 vertices
 * const indexedGeometry = new IndexedGeometry()
 *
 * indexedGeometry.setAttribute({
 *   name: 'position',
 *   type: 'vec3f',
 *   bufferFormat: 'float32x3',
 *   size: 3,
 *   bufferLength: vertices.length,
 *   array: vertices,
 * })
 *
 * indexedGeometry.setIndexBuffer({
 *   array: indexArray,
 *   bufferFormat: 'uint16',
 * })
 * ```
 */
export declare class IndexedGeometry extends Geometry {
    /** Object containing our index buffer format & length, array and GPUBuffer */
    indexBuffer: IndexBuffer;
    /**
     * IndexedGeometry constructor
     * @param parameters - {@link GeometryParams | parameters} used to create our IndexedGeometry
     */
    constructor({ verticesOrder, topology, instancesCount, vertexBuffers, }?: GeometryParams);
    /**
     * Get whether this geometry is ready to draw, i.e. it has been computed, all its vertex buffers have been created and its index buffer has been created as well
     * @readonly
     */
    get ready(): boolean;
    /**
     * If we have less than 65.536 vertices, we should use a Uin16Array to hold our index buffer values
     * @readonly
     */
    get useUint16IndexArray(): boolean;
    /**
     * Set our {@link indexBuffer}
     * @param parameters - {@link IndexedGeometryIndexBufferOptions | parameters} used to create our index buffer
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
    /**
     * Destroy our indexed geometry vertex buffers and index buffer
     */
    destroy(): void;
}
