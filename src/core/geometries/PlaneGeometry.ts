import { IndexedGeometry } from './IndexedGeometry'
import { Geometry } from './Geometry'
import { GeometryBaseParams, VertexBufferAttributeParams } from '../../types/Geometries'

/**
 * Parameters used to create a {@link PlaneGeometry}
 */
export interface PlaneGeometryParams extends GeometryBaseParams {
  /** Number of segments along the X axis */
  widthSegments?: number
  /** Number of segments along the Y axis */
  heightSegments?: number
}

/**
 * Used to create an indexed plane geometry based on the number of segments along the X and Y axis.
 *
 * This is how it will look for a 3x2 quad. Indexing will take care of drawing the right vertices in the right order.
 *
 * <pre>
 *  0---1---2---3
 *  |  /|  /|  /|
 *  |/  |/  |/  |
 *  4---5---6---7
 *  |  /|  /|  /|
 *  |/  |/  |/  |
 *  8---9---10--11
 * </pre>
 *
 * @example
 * ```javascript
 * const planeGeometry = new PlaneGeometry()
 * ```
 */
export class PlaneGeometry extends IndexedGeometry {
  /**
   * Defines our {@link PlaneGeometry} definition based on the provided {@link PlaneGeometryParams | parameters}
   */
  definition: {
    /** unique id based on width and height segments, used to get {@link PlaneGeometry} from cache */
    id: number
    /** number of segments along the X axis */
    width: number
    /** number of segments along the Y axis */
    height: number
    /** total number of segments */
    count: number
  }

  /**
   * PlaneGeometry constructor
   * @param parameters - {@link PlaneGeometryParams | parameters} used to create our PlaneGeometry
   */
  constructor({
    widthSegments = 1,
    heightSegments = 1,
    instancesCount = 1,
    vertexBuffers = [],
    topology,
  }: PlaneGeometryParams = {}) {
    // plane geometries vertices are defined in the clockwise order
    super({ verticesOrder: 'cw', topology, instancesCount, vertexBuffers, mapBuffersAtCreation: true })

    this.type = 'PlaneGeometry'

    widthSegments = Math.floor(widthSegments)
    heightSegments = Math.floor(heightSegments)

    // unique plane geometry id based on width and height
    // used to get a geometry from cache
    this.definition = {
      id: widthSegments * heightSegments + widthSegments,
      width: widthSegments,
      height: heightSegments,
      count: widthSegments * heightSegments,
    }

    const verticesCount = (this.definition.width + 1) * (this.definition.height + 1)
    const attributes = this.getIndexedVerticesAndUVs(verticesCount)

    for (const attribute of Object.values(attributes)) {
      this.setAttribute(attribute as VertexBufferAttributeParams)
    }

    this.setIndexArray()
  }

  /**
   * Set our PlaneGeometry index array
   */
  setIndexArray() {
    const indexArray = this.useUint16IndexArray
      ? new Uint16Array(this.definition.count * 6)
      : new Uint32Array(this.definition.count * 6)

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
      bufferFormat: this.useUint16IndexArray ? 'uint16' : 'uint32',
    })
  }

  /**
   * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
   * @param verticesCount - {@link Geometry#verticesCount | number of vertices} of our {@link PlaneGeometry}
   * @returns - our position and uv {@link VertexBufferAttributeParams | attributes}
   */
  getIndexedVerticesAndUVs(verticesCount: Geometry['verticesCount']): Record<string, VertexBufferAttributeParams> {
    // geometry vertices and UVs
    const uv = {
      name: 'uv',
      type: 'vec2f',
      bufferFormat: 'float32x2',
      size: 2,
      array: new Float32Array(verticesCount * 2),
    }

    const position = {
      name: 'position',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
      size: 3,
      array: new Float32Array(verticesCount * 3),
    }

    const normal = {
      name: 'normal',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
      size: 3,
      array: new Float32Array(verticesCount * 3),
    }

    let positionOffset = 0
    let normalOffset = 0
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
      for (let x = 0; x <= this.definition.width; x++) {
        // uv
        uv.array[uvOffset++] = x / this.definition.width
        uv.array[uvOffset++] = 1 - y / this.definition.height

        // vertex position
        position.array[positionOffset++] = (x * 2) / this.definition.width - 1
        position.array[positionOffset++] = (y * 2) / this.definition.height - 1
        position.array[positionOffset++] = 0

        // normals are simple
        normal.array[normalOffset++] = 0
        normal.array[normalOffset++] = 0
        normal.array[normalOffset++] = 1
      }
    }

    return { position, uv, normal } as Record<string, VertexBufferAttributeParams>
  }
}
