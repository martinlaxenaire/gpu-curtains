import { Geometry } from './Geometry'
import { GeometryParams } from '../../types/Geometries'

/**
 * Defines the available options to create an [index buffer]{@link IndexedGeometry#indexBuffer}
 */
export interface IndexedGeometryIndexBufferOptions {
  /** index buffer format */
  bufferFormat?: GPUIndexFormat
  /** index buffer array */
  array?: Uint32Array
}

/**
 * Defines an [index buffer]{@link IndexedGeometry#indexBuffer}
 */
export interface IndexBuffer {
  /** index buffer format */
  bufferFormat: GPUIndexFormat
  /** index buffer array */
  array: Uint32Array
  /** index buffer length */
  bufferLength: number
  /** index buffer {@link GPUBuffer} */
  buffer?: GPUBuffer
}

/**
 * IndexedGeometry class:
 * Used to created an indexed geometry which holds an index array to use as indexBuffer
 * @extends Geometry
 */
export class IndexedGeometry extends Geometry {
  /** Object containing our index buffer format & length, array and GPUBuffer */
  indexBuffer: IndexBuffer

  /**
   * IndexedGeometry constructor
   * @param {GeometryParams} [parameters={}] - parameters used to create our IndexedGeometry
   * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
   * @param {number} [parameters.instancesCount=1] - number of instances to draw
   * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
   */
  constructor({
    verticesOrder = 'cw',
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
   *
   * @param parameters - parameters used to create our index buffer
   * @param {GPUIndexFormat} [parameters.bufferFormat="uint32"]
   * @param {Uint32Array} [parameters.array=Uint32Array]
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
    this.indexBuffer = null
  }
}
