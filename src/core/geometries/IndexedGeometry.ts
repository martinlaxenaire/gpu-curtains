import { Geometry } from './Geometry'
import { GeometryBuffer, GeometryParams } from '../../types/Geometries'
import { Buffer } from '../buffers/Buffer'
import { Renderer } from '../renderers/utils'
import { TypedArrayConstructor } from '../bindings/utils'
import { GPURenderPassTypes } from '../pipelines/PipelineManager'
import { Vec3 } from '../../math/Vec3'

/**
 * Defines the available options to create an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexedGeometryIndexBufferOptions extends Partial<GeometryBuffer> {
  /** index buffer format */
  bufferFormat?: GPUIndexFormat
  /** index buffer array */
  array?: Uint16Array | Uint32Array
}

/**
 * Defines an {@link IndexedGeometry#indexBuffer | index buffer}
 */
export interface IndexBuffer extends GeometryBuffer {
  /** index buffer format */
  bufferFormat: GPUIndexFormat
  /** index buffer array */
  array: Uint16Array | Uint32Array
  /** index buffer length */
  bufferLength: number
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
    mapBuffersAtCreation = true,
  }: GeometryParams = {}) {
    super({ verticesOrder, topology, instancesCount, vertexBuffers, mapBuffersAtCreation })

    this.type = 'IndexedGeometry'
  }

  /**
   * Reset all the {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer} when the device is lost
   */
  loseContext() {
    super.loseContext()

    if (this.indexBuffer) {
      this.indexBuffer.buffer.destroy()
    }
  }

  /**
   * Restore the {@link IndexedGeometry} buffers on context restoration
   * @param renderer - The {@link Renderer} used to recreate the buffers
   */
  restoreContext(renderer: Renderer) {
    if (this.ready) return

    if (!this.indexBuffer.buffer.GPUBuffer) {
      this.indexBuffer.buffer.createBuffer(renderer)

      this.uploadBuffer(renderer, this.indexBuffer)

      this.indexBuffer.buffer.consumers.add(this.uuid)
    }

    super.restoreContext(renderer)
  }

  /**
   * Compute {@link IndexedGeometry} flat normals in case the `normal` attribute is missing.
   */
  computeFlatNormals() {
    const positionAttribute = this.getAttributeByName('position')
    const vertex1 = new Vec3()
    const vertex2 = new Vec3()
    const vertex3 = new Vec3()
    const edge1 = new Vec3()
    const edge2 = new Vec3()
    const normal = new Vec3()

    const posLength = positionAttribute.array.length
    const normalArray = new Float32Array(posLength)

    const nbIndices = this.indexBuffer.array.length
    for (let i = 0; i < nbIndices; i += 3) {
      const i0 = this.indexBuffer.array[i] * 3
      const i1 = this.indexBuffer.array[i + 1] * 3
      const i2 = this.indexBuffer.array[i + 2] * 3

      // avoid to access non existing values if we padded our indices array
      if (posLength < i0 + 2) continue
      vertex1.set(positionAttribute.array[i0], positionAttribute.array[i0 + 1], positionAttribute.array[i0 + 2])
      if (posLength < i1 + 2) continue
      vertex2.set(positionAttribute.array[i1], positionAttribute.array[i1 + 1], positionAttribute.array[i1 + 2])
      if (posLength < i2 + 2) continue
      vertex3.set(positionAttribute.array[i2], positionAttribute.array[i2 + 1], positionAttribute.array[i2 + 2])

      this.computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal)

      for (let j = 0; j < 3; j++) {
        normalArray[this.indexBuffer.array[i + j] * 3] = normal.x
        normalArray[this.indexBuffer.array[i + j] * 3 + 1] = normal.y
        normalArray[this.indexBuffer.array[i + j] * 3 + 2] = normal.z
      }
    }

    this.setAttribute({
      name: 'normal',
      type: 'vec3f',
      bufferFormat: 'float32x3',
      size: 3,
      array: normalArray,
    })
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
  setIndexBuffer({
    bufferFormat = 'uint32',
    array = new Uint32Array(0),
    buffer = new Buffer(),
    bufferOffset = 0,
    bufferSize = null,
  }: IndexedGeometryIndexBufferOptions) {
    this.indexBuffer = {
      array,
      bufferFormat,
      bufferLength: array.length,
      buffer,
      bufferOffset,
      bufferSize:
        bufferSize !== null
          ? bufferSize
          : array.length * (array.constructor as TypedArrayConstructor).BYTES_PER_ELEMENT,
    }
  }

  /**
   * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
   */
  setWGSLFragment() {
    super.setWGSLFragment()
    if (this.indexBuffer) {
      this.layoutCacheKey += 'indexFormat,' + this.indexBuffer.bufferFormat + ','
    }
  }

  /**
   * Create the {@link Geometry} {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer}.
   * @param parameters - parameters used to create the vertex buffers.
   * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
   * @param parameters.label - label to use for the vertex buffers.
   */
  createBuffers({ renderer, label = this.type }: { renderer: Renderer; label?: string }) {
    if (!this.indexBuffer.buffer.GPUBuffer) {
      this.indexBuffer.buffer.createBuffer(renderer, {
        label: label + ': index buffer',
        size: this.indexBuffer.array.byteLength,
        usage: this.options.mapBuffersAtCreation ? ['index'] : ['copyDst', 'index'],
        mappedAtCreation: this.options.mapBuffersAtCreation,
      })

      this.uploadBuffer(renderer, this.indexBuffer)
    }

    this.indexBuffer.buffer.consumers.add(this.uuid)

    super.createBuffers({ renderer, label })
  }

  /** RENDER **/

  /**
   * First, set our render pass geometry vertex buffers
   * Then, set our render pass geometry index buffer
   * @param pass - current render pass
   */
  setGeometryBuffers(pass: GPURenderPassTypes) {
    super.setGeometryBuffers(pass)

    pass.setIndexBuffer(
      this.indexBuffer.buffer.GPUBuffer,
      this.indexBuffer.bufferFormat,
      this.indexBuffer.bufferOffset,
      this.indexBuffer.bufferSize
    )
  }

  /**
   * Draw our indexed geometry. Can use indirect drawing if {@link indirectDraw} is set up.
   * @param pass - current render pass.
   */
  drawGeometry(pass: GPURenderPassTypes) {
    if (this.indirectDraw && this.indirectDraw.buffer && this.indirectDraw.buffer.GPUBuffer) {
      pass.drawIndexedIndirect(this.indirectDraw.buffer.GPUBuffer, this.indirectDraw.offset)
    } else {
      pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount)
    }
  }

  /**
   * Destroy our indexed geometry vertex buffers and index buffer.
   * @param renderer - current {@link Renderer}, in case we want to remove the {@link IndexBuffer#buffer | buffer} from the cache.
   */
  destroy(renderer: null | Renderer = null) {
    super.destroy(renderer)

    if (this.indexBuffer) {
      this.indexBuffer.buffer.consumers.delete(this.uuid)
      this.indexBuffer.buffer.destroy()
      if (renderer) renderer.removeBuffer(this.indexBuffer.buffer)
    }
  }
}
