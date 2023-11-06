import { Geometry } from './Geometry'
import { GeometryParams, IndexBuffer } from '../../types/Geometries'

export interface IndexedGeometryIndexBufferOptions {
  bufferFormat?: GPUIndexFormat
  array?: Uint32Array
}

/**
 * IndexedGeometry class:
 * Used to created an indexed geometry which holds an index array to use as indexBuffer
 * @extends Geometry
 */
export class IndexedGeometry extends Geometry {
  indexBuffer: IndexBuffer

  /**
   * IndexedGeometry constructor
   * @param {GeometryParams} [parameters={}] - parameters used to create our IndexedGeometry
   * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
   * @param {number} [parameters.instancesCount=1] - number of instances to draw
   * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
   */
  constructor({ verticesOrder = 'cw', instancesCount = 1, vertexBuffers = [] }: GeometryParams = {}) {
    super({ verticesOrder, instancesCount, vertexBuffers })

    this.type = 'IndexedGeometry'
  }

  /**
   *
   * @param {IndexedGeometryIndexBufferOptions} parameters - parameters used to create our index buffer
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
}
