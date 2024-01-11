import { Geometry } from './Geometry'
import { GeometryParams } from '../../types/Geometries'

/**
 * Defines the available options to create an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexedGeometryIndexBufferOptions {
  /** index buffer format */
  bufferFormat?: GPUIndexFormat
  /** index buffer array */
  array?: Uint16Array | Uint32Array
}

/**
 * Defines an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexBuffer {
  /** index buffer format */
  bufferFormat: GPUIndexFormat
  /** index buffer array */
  array: Uint16Array | Uint32Array
  /** index buffer length */
  bufferLength: number
  /** index buffer {@link GPUBuffer} */
  buffer?: GPUBuffer
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
export class IndexedGeometry extends Geometry {
  /** Object containing our index buffer format & length, array and GPUBuffer */
  indexBuffer: IndexBuffer

  /**
   * IndexedGeometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our IndexedGeometry
   */
  constructor({
    verticesOrder = 'ccw',
    topology = 'triangle-list',
    instancesCount = 1,
    vertexBuffers = [],
  }: GeometryParams = {}) {
    super({ verticesOrder, topology, instancesCount, vertexBuffers })

    this.type = 'IndexedGeometry'
  }

  /**
   * Get whether this geometry is ready to draw, i.e. it has been computed, all its vertex buffers have been created and its index buffer has been created as well
   * @readonly
   */
  get ready(): boolean {
    return (
      !this.shouldCompute &&
      !this.vertexBuffers.find((vertexBuffer) => !vertexBuffer.buffer) &&
      this.indexBuffer &&
      !!this.indexBuffer.buffer
    )
  }

  /**
   * If we have less than 65.536 vertices, we should use a Uin16Array to hold our index buffer values
   * @readonly
   */
  get useUint16IndexArray(): boolean {
    return this.verticesCount < 256 * 256
  }

  /**
   * Set our {@link indexBuffer}
   * @param parameters - {@link IndexedGeometryIndexBufferOptions | parameters} used to create our index buffer
   */
  setIndexBuffer({ bufferFormat = 'uint32', array = new Uint32Array(0) }: IndexedGeometryIndexBufferOptions) {
    this.indexBuffer = {
      array,
      bufferFormat,
      bufferLength: array.length,
      buffer: null,
    }
  }

  /** RENDER **/

  /**
   * First, set our render pass geometry vertex buffers
   * Then, set our render pass geometry index buffer
   * @param pass - current render pass
   */
  setGeometryBuffers(pass: GPURenderPassEncoder) {
    super.setGeometryBuffers(pass)

    pass.setIndexBuffer(this.indexBuffer.buffer, this.indexBuffer.bufferFormat)
  }

  /**
   * Override the parent draw method to draw indexed geometry
   * @param pass - current render pass
   */
  drawGeometry(pass: GPURenderPassEncoder) {
    pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount)
  }

  /**
   * Destroy our indexed geometry vertex buffers and index buffer
   */
  destroy() {
    super.destroy()

    this.indexBuffer?.buffer?.destroy()
    this.indexBuffer.buffer = null
  }
}
