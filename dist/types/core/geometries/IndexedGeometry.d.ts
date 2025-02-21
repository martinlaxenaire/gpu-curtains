/// <reference types="dist" />
import { Geometry } from './Geometry';
import { GeometryBuffer, GeometryParams } from '../../types/Geometries';
import { Renderer } from '../renderers/utils';
import { GPURenderPassTypes } from '../pipelines/PipelineManager';
/**
 * Defines the available options to create an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexedGeometryIndexBufferOptions extends Partial<GeometryBuffer> {
    /** index buffer format */
    bufferFormat?: GPUIndexFormat;
    /** index buffer array */
    array?: Uint16Array | Uint32Array;
}
/**
 * Defines an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexBuffer extends GeometryBuffer {
    /** index buffer format */
    bufferFormat: GPUIndexFormat;
    /** index buffer array */
    array: Uint16Array | Uint32Array;
    /** index buffer length */
    bufferLength: number;
}
/**
 * Used to create an {@link IndexedGeometry} which holds an index array to use as an index buffer.
 *
 * The index array represents the order in which the attributes should be processed. This allows to create smaller vertex, uv and normal arrays.
 *
 * During the {@link IndexedGeometry#render | render}, the {@link IndexedGeometry} is responsible for setting the {@link IndexedGeometry#vertexBuffers | vertexBuffers} and drawing the indexed vertices.
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
    constructor({ verticesOrder, topology, instancesCount, vertexBuffers, mapBuffersAtCreation, }?: GeometryParams);
    /**
     * Reset all the {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer} when the device is lost
     */
    loseContext(): void;
    /**
     * Restore the {@link IndexedGeometry} buffers on context restoration
     * @param renderer - The {@link Renderer} used to recreate the buffers
     */
    restoreContext(renderer: Renderer): void;
    /**
     * Compute {@link IndexedGeometry} flat normals in case the `normal` attribute is missing.
     */
    computeFlatNormals(): void;
    /**
     * If we have less than 65.536 vertices, we should use a Uin16Array to hold our index buffer values
     * @readonly
     */
    get useUint16IndexArray(): boolean;
    /**
     * Set our {@link indexBuffer}
     * @param parameters - {@link IndexedGeometryIndexBufferOptions | parameters} used to create our index buffer
     */
    setIndexBuffer({ bufferFormat, array, buffer, bufferOffset, bufferSize, }: IndexedGeometryIndexBufferOptions): void;
    /**
     * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
     */
    setWGSLFragment(): void;
    /**
     * Create the {@link Geometry} {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer}.
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label }: {
        renderer: Renderer;
        label?: string;
    }): void;
    /** RENDER **/
    /**
     * First, set our render pass geometry vertex buffers
     * Then, set our render pass geometry index buffer
     * @param pass - current render pass
     */
    setGeometryBuffers(pass: GPURenderPassTypes): void;
    /**
     * Draw our indexed geometry. Can use indirect drawing if {@link indirectDraw} is set up.
     * @param pass - current render pass.
     */
    drawGeometry(pass: GPURenderPassTypes): void;
    /**
     * Destroy our indexed geometry vertex buffers and index buffer.
     * @param renderer - current {@link Renderer}, in case we want to remove the {@link IndexBuffer#buffer | buffer} from the cache.
     */
    destroy(renderer?: null | Renderer): void;
}
