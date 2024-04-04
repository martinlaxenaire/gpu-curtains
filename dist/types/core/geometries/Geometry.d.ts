/// <reference types="dist" />
import { Box3 } from '../../math/Box3';
import { GeometryOptions, GeometryParams, VertexBuffer, VertexBufferAttribute, VertexBufferAttributeParams, VertexBufferParams } from '../../types/Geometries';
import { Renderer } from '../renderers/utils';
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
    #private;
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
    /** The bounding box of the geometry, i.e. two {@link math/Vec3.Vec3 | Vec3} defining the min and max positions to wrap this geometry in a cube */
    boundingBox: Box3;
    /** A string to append to our shaders code describing the WGSL structure representing this geometry attributes */
    wgslStructFragment: string;
    /** A Set to store this {@link Geometry} consumers (Mesh uuid) */
    consumers: Set<string>;
    /**
     * Geometry constructor
     * @param parameters - {@link GeometryParams | parameters} used to create our Geometry
     */
    constructor({ verticesOrder, topology, instancesCount, vertexBuffers, mapVertexBuffersAtCreation, }?: GeometryParams);
    /**
     * Get whether this geometry is ready to draw, i.e. it has been computed and all its vertex buffers have been created
     * @readonly
     */
    get ready(): boolean;
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
    addVertexBuffer({ stepMode, name, attributes }?: VertexBufferParams): VertexBuffer;
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
     * Get an attribute by name
     * @param name - name of the attribute to find
     * @returns - found {@link VertexBufferAttribute | attribute} or null if not found
     */
    getAttributeByName(name: string): VertexBufferAttribute | null;
    /**
     * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
     * Also compute the Geometry bounding box.
     */
    computeGeometry(): void;
    /**
     * Create the {@link createBuffers | geometry buffers} and {@link computeGeometry | compute the geometry}. The order in which those operations take place depends on mappedAtCreation parameter.
     * @param parameters - parameters used to create the geometry.
     * @param parameters.renderer - {@link Renderer} used to create the buffers.
     * @param parameters.label - label to use for the buffers.
     */
    createGeometry({ renderer, label }: {
        renderer: Renderer;
        label?: string;
    }): void;
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
     * Destroy our geometry vertex buffers.
     * @param renderer - current {@link Renderer}, in case we want to remove the {@link VertexBuffer#buffer | buffers} from the cache.
     */
    destroy(renderer?: null | Renderer): void;
}
