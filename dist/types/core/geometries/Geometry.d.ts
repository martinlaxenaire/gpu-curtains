/// <reference types="dist" />
import { Box3 } from '../../math/Box3';
import { GeometryOptions, GeometryParams, VertexBuffer, VertexBufferAttribute, VertexBufferAttributeParams, VertexBufferParams } from '../../types/Geometries';
/**
 * Geometry class:
 * Used to create a Geometry from given parameters like instances count or geometry attributes.
 * Holds all attributes arrays, bounding box and handle WGSL code snippet for the vertex shader input attributes.
 */
export declare class Geometry {
    #private;
    /** Number of vertices defined by this geometry */
    verticesCount: number;
    /** Vertices order to be drawn by the [render pipeline]{@link RenderPipelineEntry} */
    verticesOrder: GPUFrontFace;
    /** Topology to use with this {@link Geometry}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
    topology: GPUPrimitiveTopology;
    /** Number of instances of this geometry to draw */
    instancesCount: number;
    /** Array of [vertex buffers]{@link VertexBuffer} to use with this geometry */
    vertexBuffers: VertexBuffer[];
    /** Options used to create this geometry */
    options: GeometryOptions;
    /** The type of the geometry */
    type: string;
    /** The bounding box of the geometry, i.e. two {@link Vec3} defining the min and max positions to wrap this geometry in a cube */
    boundingBox: Box3;
    /** A string to append to our shaders code describing the WGSL structure representing this geometry attributes */
    wgslStructFragment: string;
    /**
     * Geometry constructor
     * @param [parameters={}] - parameters used to create our Geometry
     * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     */
    constructor({ verticesOrder, topology, instancesCount, vertexBuffers, }?: GeometryParams);
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
     * @param [parameters={}] - vertex buffer parameters
     * @param [parameters.stepMode="vertex"] - GPU vertex step mode
     * @param [parameters.name] - vertex buffer name
     * @param [parameters.attributes=[]] - vertex buffer attributes
     * @returns - newly created [vertex buffer]{@link VertexBuffer}
     */
    addVertexBuffer({ stepMode, name, attributes }?: VertexBufferParams): VertexBuffer;
    /**
     * Get a vertex buffer by name
     * @param name - our vertex buffer name
     * @returns - found [vertex buffer]{@link VertexBuffer} or null if not found
     */
    getVertexBufferByName(name?: string): VertexBuffer | null;
    /**
     * Set a vertex buffer attribute
     * @param parameters - attributes parameters
     * @param {VertexBuffer=} parameters.vertexBuffer - vertex buffer holding this attribute
     * @param {string} parameters.name - attribute name
     * @param {WGSLVariableType} [parameters.type="vec3f"] - attribute type
     * @param {GPUVertexFormat} [parameters.bufferFormat="float32x3"] - attribute buffer format
     * @param {number} [parameters.size=3] - attribute size
     * @param {Float32Array} [parameters.array=Float32Array] - attribute array
     * @param {number} [parameters.verticesStride=1] - number of vertices used by this attribute, i.e. insert one for every X vertices
     */
    setAttribute({ vertexBuffer, name, type, bufferFormat, size, array, verticesStride, }: VertexBufferAttributeParams): void;
    /**
     * Get an attribute by name
     * @param name - name of the attribute to find
     * @returns - found [attribute]{@link VertexBufferAttribute} or null if not found
     */
    getAttributeByName(name: string): VertexBufferAttribute | null;
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
