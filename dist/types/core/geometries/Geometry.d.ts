/// <reference types="dist" />
import { Box3 } from '../../math/Box3';
import { AttributeBufferParams, AttributeBufferParamsOption } from '../../utils/buffers-utils';
import { GeometryOptions, GeometryParams, VertexBuffer, VertexBufferParams } from '../../types/Geometries';
/**
 * Geometry class:
 * Used to create a Geometry from given parameters like instances count or geometry attributes.
 * Holds all attributes arrays, bounding box and handle WGSL code snippet for the vertex shader input attributes.
 */
export declare class Geometry {
    #private;
    verticesCount: number;
    verticesOrder: GPUFrontFace;
    instancesCount: number;
    vertexBuffers: VertexBuffer[];
    options: GeometryOptions;
    type: string;
    boundingBox: Box3;
    wgslStructFragment: string;
    /**
     * Geometry constructor
     * @param {GeometryParams} [parameters={}] - parameters used to create our Geometry
     * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     */
    constructor({ verticesOrder, instancesCount, vertexBuffers }?: GeometryParams);
    /**
     * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
     * @readonly
     */
    get shouldCompute(): boolean;
    /**
     * Get whether this geometry is ready to draw, i.e. it has been computed and all its vertex buffers have been created
     * @readonly
     */
    get ready(): boolean;
    /**
     * Add a vertex buffer to our Geometry, set its attributes and return it
     * @param {VertexBufferParams} [parameters={}] - vertex buffer parameters
     * @param {GPUVertexStepMode} [parameters.stepMode="vertex"] - GPU vertex step mode
     * @param {string} [parameters.name] - vertex buffer name
     * @param {AttributeBufferParamsOption[]} [parameters.attributes=[]] - vertex buffer attributes
     * @returns {VertexBuffer}
     */
    addVertexBuffer({ stepMode, name, attributes }?: VertexBufferParams): VertexBuffer;
    /**
     * Get a vertex buffer by name
     * @param {string} name - our vertex buffer name
     * @returns {?VertexBuffer} - found vertex buffer or null if not found
     */
    getVertexBufferByName(name?: string): VertexBuffer | null;
    /**
     * Set a vertex buffer attribute
     * @param {AttributeBufferParamsOption} parameters - attributes parameters
     * @param {VertexBuffer=} parameters.vertexBuffer - vertex buffer holding this attribute
     * @param {string} parameters.name - attribute name
     * @param {CoreBufferType} [parameters.type="vec3f"] - attribute type
     * @param {GPUVertexFormat} [parameters.bufferFormat="float32x3"] - attribute buffer format
     * @param {number} [parameters.size=3] - attribute size
     * @param {Float32Array} [parameters.array=Float32Array] - attribute array
     * @param {number} [parameters.verticesUsed=1] - number of vertices used by this attribute, i.e. insert one for every X vertices
     */
    setAttribute({ vertexBuffer, name, type, bufferFormat, size, array, verticesUsed, }: AttributeBufferParamsOption): void;
    /**
     * Get an attribute by name
     * @param {string} name - name of the attribute to find
     * @returns {?AttributeBufferParams} - found attribute or null if not found
     */
    getAttributeByName(name: string): AttributeBufferParams | null;
    /**
     * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
     * Also compute the Geometry bounding box.
     */
    computeGeometry(): void;
    /** RENDER **/
    /**
     * Set our render pass geometry vertex buffers
     * @param pass - current render pass
     */
    setGeometryBuffers(pass: GPURenderPassEncoder): void;
    /**
     * Draw our geometry
     * @param pass - current render pass
     */
    drawGeometry(pass: GPURenderPassEncoder): void;
    /**
     * Set our vertex buffers then draw the geometry
     * @param pass - current render pass
     */
    render(pass: GPURenderPassEncoder): void;
    /**
     * Destroy our geometry vertex buffers
     */
    destroy(): void;
}
