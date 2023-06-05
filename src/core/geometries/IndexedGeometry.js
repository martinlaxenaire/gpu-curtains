import { Geometry } from './Geometry'

export class IndexedGeometry extends Geometry {
  constructor() {
    super()

    this.isIndexed = true
  }

  setIndexData({ bufferFormat = 'uint32', array = new Uint32Array(0) }) {
    this.indexData = {
      array,
      bufferFormat: 'uint32',
      bufferLength: array.length,
    }
  }
}
