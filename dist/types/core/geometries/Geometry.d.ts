/// <reference types="@webgpu/types" />
import { Box3 } from '../../math/Box3';
import { GeometryBuffer, GeometryOptions, GeometryParams, VertexBuffer, VertexBufferAttribute, VertexBufferAttributeParams, VertexBufferParams, IndirectDrawParams } from '../../types/Geometries';
import { Renderer } from '../renderers/utils';
import { GPURenderPassTypes } from '../pipelines/PipelineManager';
import { Vec3 } from '../../math/Vec3';
/**
 * Used to create a {@link Geometry} from given parameters like instances count or geometry attributes (vertices, uvs, normals).<br>
 * Holds all attributes arrays, bounding box and create as WGSL code snippet for the vertex shader input attributes.
 *
 * During the {@link Geometry#render | render}, the {@link Geometry} is responsible for setting the {@link Geometry#vertexBuffers | vertexBuffers} and drawing the vertices.
 *
 * @example
 * ```javascript
 * const vertices = new Float32Array([
 *   // first triangle
 *    1,  1,  0,
 *    1, -1,  0,
 *   -1, -1,  0,
 *
 *   // second triangle
 *    1,  1,  0,
 *   -1, -1,  0,
 *   -1,  1,  0
 * ])
 *
 * // create a quad geometry made of 2 triangles
 * const geometry = new Geometry()
 *
 * geometry.setAttribute({
 *   name: 'position',
 *   type: 'vec3f',
 *   bufferFormat: 'float32x3',
 *   size: 3,
 *   bufferLength: vertices.length,
 *   array: vertices,
 * })
 * ```
 */
export declare class Geometry {
    /** Number of vertices defined by this geometry */
    verticesCount: number;
    /** Vertices order to be drawn by the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | render pipeline} */
    verticesOrder: GPUFrontFace;
    /** {@link https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology | Topology} to use with this {@link Geometry}, i.e. whether to draw triangles or points */
    topology: GPUPrimitiveTopology;
    /** Number of instances of this geometry to draw */
    instancesCount: number;
    /** Array of {@link VertexBuffer | vertex buffers} to use with this geometry */
    vertexBuffers: VertexBuffer[];
    /** Options used to create this geometry */
    options: GeometryOptions;
    /** The type of the geometry */
    type: string;
    /** The universal unique id of the geometry */
    uuid: string;
    /** Allow to draw this {@link Geometry} with an {@link extras/buffers/IndirectBuffer.IndirectBuffer | IndirectBuffer} if set. */
    indirectDraw: IndirectDrawParams | null;
    /** The bounding box of the geometry, i.e. two {@link math/Vec3.Vec3 | Vec3} defining the min and max positions to wrap this geometry in a cube */
    boundingBox: Box3;
    /** A string to append to our shaders code describing the WGSL structure representing this geometry attributes */
    wgslStructFragment: string;
    /** A string representing the {@link vertexBuffers} layout, used for pipelines caching */
    layoutCacheKey: string;
    /** A Set to store this {@link Geometry} consumers (Mesh uuid) */
    consumers: Set<string>;
    /** Whether this geometry is ready to be drawn, i.e. it has been computed and all its vertex buffers have been created */
    ready: boolean;
    /**
     * Geometry constructor
     * @param parameters - {@link GeometryParams | parameters} used to create our Geometry
     */
    constructor({ verticesOrder, topology, instancesCount, vertexBuffers, mapBuffersAtCreation, }?: GeometryParams);
    /**
     * Reset all the {@link vertexBuffers | vertex buffers} when the device is lost
     */
    loseContext(): void;
    /**
     * Restore the {@link Geometry} buffers on context restoration
     * @param renderer - The {@link Renderer} used to recreate the buffers
     */
    restoreContext(renderer: Renderer): void;
    /**
     * Add a vertex buffer to our Geometry, set its attributes and return it
     * @param parameters - vertex buffer {@link VertexBufferParams | parameters}
     * @returns - newly created {@link VertexBuffer | vertex buffer}
     */
    addVertexBuffer({ stepMode, name, attributes, buffer, array, bufferOffset, bufferSize, }?: VertexBufferParams): VertexBuffer;
    /**
     * Get a vertex buffer by name
     * @param name - our vertex buffer name
     * @returns - found {@link VertexBuffer | vertex buffer} or null if not found
     */
    getVertexBufferByName(name?: string): VertexBuffer | null;
    /**
     * Set a vertex buffer attribute
     * @param parameters - attributes {@link VertexBufferAttributeParams | parameters}
     */
    setAttribute({ vertexBuffer, name, type, bufferFormat, size, array, verticesStride, }: VertexBufferAttributeParams): void;
    /**
     * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
     * @readonly
     */
    get shouldCompute(): boolean;
    /**
     * Get an attribute by name
     * @param name - name of the attribute to find
     * @returns - found {@link VertexBufferAttribute | attribute} or null if not found
     */
    getAttributeByName(name: string): VertexBufferAttribute | null;
    /**
     * Compute the normal {@link Vec3} from a triangle defined by three {@link Vec3} by computing edges {@link Vec3}.
     * @param vertex1 - first triangle position
     * @param vertex2 - second triangle position
     * @param vertex3 - third triangle position
     * @param edge1 - first edge
     * @param edge2 - second edge
     * @param normal - flat normal generated.
     */
    computeNormalFromTriangle(vertex1: Vec3, vertex2: Vec3, vertex3: Vec3, edge1: Vec3, edge2: Vec3, normal: Vec3): void;
    /**
     * Compute {@link Geometry} flat normals in case the `normal` attribute is missing.
     */
    computeFlatNormals(): void;
    /**
     * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
     * Also compute the Geometry bounding box.
     */
    computeGeometry(): void;
    /**
     * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
     */
    setWGSLFragment(): void;
    /**
     * Create the {@link Geometry} {@link vertexBuffers | vertex buffers}.
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label }: {
        renderer: Renderer;
        label?: string;
    }): void;
    /**
     * Upload a {@link GeometryBuffer} to the GPU.
     * @param renderer - {@link Renderer} used to upload the buffer.
     * @param buffer - {@link GeometryBuffer} holding a {@link Buffer} and a typed array to upload.
     */
    uploadBuffer(renderer: Renderer, buffer: GeometryBuffer): void;
    /**
     * Set the {@link indirectDraw} parameters to draw this {@link Geometry} with an {@link extras/buffers/IndirectBuffer.IndirectBuffer | IndirectBuffer}.
     * @param parameters -  {@link IndirectDrawParams | indirect draw parameters} to use for this {@link Geometry}.
     */
    useIndirectBuffer({ buffer, offset }: IndirectDrawParams): void;
    /** RENDER **/
    /**
     * Set our render pass geometry vertex buffers
     * @param pass - current render pass
     */
    setGeometryBuffers(pass: GPURenderPassTypes): void;
    /**
     * Draw our geometry. Can use indirect drawing if {@link indirectDraw} is set up.
     * @param pass - current render pass.
     */
    drawGeometry(pass: GPURenderPassTypes): void;
    /**
     * Set our vertex buffers then draw the geometry.
     * @param pass - current render pass.
     */
    render(pass: GPURenderPassTypes): void;
    /**
     * Destroy our geometry vertex buffers.
     * @param renderer - current {@link Renderer}, in case we want to remove the {@link VertexBuffer#buffer | buffers} from the cache.
     */
    destroy(renderer?: null | Renderer): void;
}
