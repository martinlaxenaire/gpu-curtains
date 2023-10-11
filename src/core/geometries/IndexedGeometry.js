import { Geometry } from './Geometry'

export class IndexedGeometry extends Geometry {
  constructor({ verticesOrder = 'cw', instancesCount = 1, vertexBuffers = [] }) {
    super({ verticesOrder, instancesCount, vertexBuffers })

    this.type = 'IndexedGeometry'

    this.isIndexed = true
  }

  setIndexBuffer({ vertexBuffer = this.vertexBuffers[0], bufferFormat = 'uint32', array = new Uint32Array(0) }) {
    vertexBuffer.indexBuffer = {
      array,
      bufferFormat: 'uint32',
      bufferLength: array.length,
      buffer: null,
    }
  }
}
