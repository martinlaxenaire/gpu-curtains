import { IndexedGeometry } from './IndexedGeometry'
import { Geometry } from './Geometry'
import { AttributeBufferParamsOption } from '../../utils/buffers-utils'
import { GeometryBaseParams } from '../../types/Geometries'

export interface PlaneGeometryParams extends GeometryBaseParams {
  widthSegments?: number
  heightSegments?: number
}

/**
 * PlaneGeometry class:
 * Used to create an indexed plane geometry based on the number of segments along the X and Y axis.
 * @extends IndexedGeometry
 */
export class PlaneGeometry extends IndexedGeometry {
  definition: {
    id: number
    width: number
    height: number
    count: number
  }

  /**
   * PlaneGeometry constructor
   * @param {PlaneGeometryParams} [parameters={}] - parameters used to create our PlaneGeometry
   * @param {number} [parameters.instancesCount=1] - number of instances to draw
   * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
   * @param {number} [parameters.widthSegments=1] - number of segments along the X axis
   * @param {number} [parameters.heightSegments=1] - number of segments along the Y axis
   */
  constructor({
    widthSegments = 1,
    heightSegments = 1,
    instancesCount = 1,
    vertexBuffers = [],
  }: PlaneGeometryParams = {}) {
    super({ verticesOrder: 'cw', instancesCount, vertexBuffers })

    this.type = 'PlaneGeometry'

    widthSegments = Math.floor(widthSegments)
    heightSegments = Math.floor(heightSegments)

    // unique plane buffers id based on width and height
    // used to get a geometry from cache
    this.definition = {
      id: widthSegments * heightSegments + widthSegments,
      width: widthSegments,
      height: heightSegments,
      count: widthSegments * heightSegments,
    }

    this.setIndexArray()

    const verticesCount = this.definition.width * 2 + 2 + (this.definition.height - 1) * (this.definition.width + 1)
    const attributes = this.getIndexedVerticesAndUVs(verticesCount)

    Object.keys(attributes).forEach((attributeKey) => {
      this.setAttribute(attributes[attributeKey] as AttributeBufferParamsOption)
    })
  }

  /**
   * Set our PlaneGeometry index array
   */
  setIndexArray() {
    const indexArray = new Uint32Array(this.definition.count * 6)

    let index = 0

    for (let y = 0; y < this.definition.height; y++) {
      for (let x = 0; x < this.definition.width; x++) {
        indexArray[index++] = x + y * (this.definition.width + 1)
        indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1)
        indexArray[index++] = x + 1 + y * (this.definition.width + 1)

        indexArray[index++] = x + 1 + y * (this.definition.width + 1)
        indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1)
        indexArray[index++] = this.definition.width + x + 2 + y * (this.definition.width + 1)
      }
    }

    this.setIndexBuffer({
      array: indexArray,
    })
  }

  /**
   * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
   * @param {Geometry['verticesCount']} verticesCount
   * @returns {Object.<string, AttributeBufferParamsOption>}
   */
  getIndexedVerticesAndUVs(verticesCount: Geometry['verticesCount']): Record<string, AttributeBufferParamsOption> {
    // geometry vertices and UVs
    const uv = {
      name: 'uv',
      type: 'vec2f',
      bufferFormat: 'float32x2',
      size: 2,
      bufferLength: verticesCount * 2,
      array: new Float32Array(verticesCount * 2),
    }

    const position = {
      name: 'position',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
      size: 3,
      bufferLength: verticesCount * 3,
      array: new Float32Array(verticesCount * 3),
    }

    let positionOffset = 0
    let uvOffset = 0

    // this is how it will look for a 3x2 quad
    // indexing will take care of drawing the right vertices at the right time
    // 0---1---2---3
    // | //| //| //|
    // |// |// |// |
    // 4---5---6---7
    // | //| //| //|
    // |// |// |// |
    // 8---9---10--11

    for (let y = 0; y <= this.definition.height; y++) {
      const v = y / this.definition.height

      for (let x = 0; x < this.definition.width; x++) {
        const u = x / this.definition.width

        // top left
        // filled only on first iteration
        // on next iterations it is the same as previous top right values
        if (x === 0) {
          uv.array[uvOffset++] = u
          // remember on WebGPU, vec2(0, 0) for uv is the top left!
          uv.array[uvOffset++] = 1 - v

          position.array[positionOffset++] = (u - 0.5) * 2
          position.array[positionOffset++] = (v - 0.5) * 2
          position.array[positionOffset++] = 0
        }

        uv.array[uvOffset++] = u + 1 / this.definition.width
        uv.array[uvOffset++] = 1 - v

        position.array[positionOffset++] = (u + 1 / this.definition.width - 0.5) * 2
        position.array[positionOffset++] = (v - 0.5) * 2
        position.array[positionOffset++] = 0
      }
    }

    return { position, uv } as Record<string, AttributeBufferParamsOption>
  }
}