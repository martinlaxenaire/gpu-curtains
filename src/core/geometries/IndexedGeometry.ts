import { Geometry } from './Geometry'
import { GeometryParams, VertexBuffer } from '../../types/Geometries'

export interface IndexedGeometryIndexBufferOptions {
  vertexBuffer?: VertexBuffer
  bufferFormat?: GPUIndexFormat
  array?: Uint32Array
}

/**
 * IndexedGeometry class:
 * Used to created an indexed geometry which holds an index array to use as indexBuffer
 * @extends Geometry
 */
export class IndexedGeometry extends Geometry {
  isIndexed: boolean

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

    this.isIndexed = true
  }

  /**
   *
   * @param {IndexedGeometryIndexBufferOptions} parameters - parameters used to create our index buffer
   * @param {VertexBuffer=} parameters.vertexBuffer
   * @param {GPUIndexFormat} [parameters.bufferFormat="uint32"]
   * @param {Uint32Array} [parameters.array=Uint32Array]
   */
  setIndexBuffer({
    vertexBuffer = this.vertexBuffers[0],
    bufferFormat = 'uint32',
    array = new Uint32Array(0),
  }: IndexedGeometryIndexBufferOptions) {
    vertexBuffer.indexBuffer = {
      array,
      bufferFormat,
      bufferLength: array.length,
      buffer: null,
    }
  }
}
