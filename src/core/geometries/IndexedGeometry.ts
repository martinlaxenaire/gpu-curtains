import { Geometry } from './Geometry'
import { GeometryParams } from '../../types/core/geometries/Geometry'
import { IndexedGeometryIndexBufferOptions } from '../../types/core/geometries/IndexedGeometry'

export class IndexedGeometry extends Geometry {
  isIndexed: boolean

  constructor({ verticesOrder = 'cw', instancesCount = 1, vertexBuffers = [] }?: GeometryParams = {}) {
    super({ verticesOrder, instancesCount, vertexBuffers })

    this.type = 'IndexedGeometry'

    this.isIndexed = true
  }

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
