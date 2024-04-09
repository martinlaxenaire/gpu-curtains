import { Box3 } from '../../math/Box3'
import { generateUUID, throwError, throwWarning } from '../../utils/utils'
import {
  GeometryOptions,
  GeometryParams,
  VertexBuffer,
  VertexBufferAttribute,
  VertexBufferAttributeParams,
  VertexBufferParams,
} from '../../types/Geometries'
import { Buffer } from '../buffers/Buffer'
import { Renderer } from '../renderers/utils'

/**
 * Used to create a {@link Geometry} from given parameters like instances count or geometry attributes (vertices, uvs, normals).<br>
 * Holds all attributes arrays, bounding box and create as WGSL code snippet for the vertex shader input attributes.
 *
 * During the {@link Geometry#render | render}, the {@link Geometry} is responsible for setting the {@link Geometry#vertexBuffers | vertexBuffers} and drawing the vertices.
 *
 * @example
 * ```javascript
 * const vertices = new Float32Array([
 *   // first triangle
 *    1,  1,  0,
 *    1, -1,  0,
 *   -1, -1,  0,
 *
 *   // second triangle
 *    1,  1,  0,
 *   -1, -1,  0,
 *   -1,  1,  0
 * ])
 *
 * // create a quad geometry made of 2 triangles
 * const geometry = new Geometry()
 *
 * geometry.setAttribute({
 *   name: 'position',
 *   type: 'vec3f',
 *   bufferFormat: 'float32x3',
 *   size: 3,
 *   bufferLength: vertices.length,
 *   array: vertices,
 * })
 * ```
 */
export class Geometry {
  /** Number of vertices defined by this geometry */
  verticesCount: number
  /** Vertices order to be drawn by the {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry | render pipeline} */
  verticesOrder: GPUFrontFace
  /** {@link https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology | Topology} to use with this {@link Geometry}, i.e. whether to draw triangles or points */
  topology: GPUPrimitiveTopology
  /** Number of instances of this geometry to draw */
  instancesCount: number
  /** Array of {@link VertexBuffer | vertex buffers} to use with this geometry */
  vertexBuffers: VertexBuffer[]
  /** Options used to create this geometry */
  options: GeometryOptions
  /** The type of the geometry */
  type: string
  /** The universal unique id of the geometry */
  uuid: string

  /** The bounding box of the geometry, i.e. two {@link math/Vec3.Vec3 | Vec3} defining the min and max positions to wrap this geometry in a cube */
  boundingBox: Box3

  /** A string to append to our shaders code describing the WGSL structure representing this geometry attributes */
  wgslStructFragment: string

  /** A Set to store this {@link Geometry} consumers (Mesh uuid) */
  consumers: Set<string>

  /** Whether this geometry is ready to be drawn, i.e. it has been computed and all its vertex buffers have been created */
  ready: boolean

  /**
   * Geometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our Geometry
   */
  constructor({
    verticesOrder = 'ccw',
    topology = 'triangle-list',
    instancesCount = 1,
    vertexBuffers = [],
    mapVertexBuffersAtCreation = true,
  }: GeometryParams = {}) {
    this.verticesCount = 0
    this.verticesOrder = verticesOrder
    this.topology = topology
    this.instancesCount = instancesCount

    this.ready = false

    this.boundingBox = new Box3()

    this.type = 'Geometry'
    this.uuid = generateUUID()

    this.vertexBuffers = []

    this.consumers = new Set()

    // should contain our vertex position / uv data at least
    this.addVertexBuffer({
      name: 'attributes',
    })

    this.options = {
      verticesOrder,
      topology,
      instancesCount,
      vertexBuffers,
      mapVertexBuffersAtCreation,
    }

    for (const vertexBuffer of vertexBuffers) {
      this.addVertexBuffer({
        stepMode: vertexBuffer.stepMode ?? 'vertex',
        name: vertexBuffer.name,
        attributes: vertexBuffer.attributes,
        ...(vertexBuffer.buffer && { buffer: vertexBuffer.buffer }),
      })
    }
  }

  /**
   * Reset all the {@link vertexBuffers | vertex buffers} when the device is lost
   */
  loseContext() {
    this.ready = false

    for (const vertexBuffer of this.vertexBuffers) {
      vertexBuffer.buffer.destroy()
    }
  }

  /**
   * Restore the {@link Geometry} buffers on context restoration
   * @param renderer - The {@link Renderer} used to recreate the buffers
   */
  restoreContext(renderer: Renderer) {
    // do not try to recreate buffers of a geometry that has already been restored
    if (!this.ready) {
      for (const vertexBuffer of this.vertexBuffers) {
        if (!vertexBuffer.buffer.GPUBuffer && vertexBuffer.buffer.consumers.size === 1) {
          vertexBuffer.buffer.createBuffer(renderer)

          if (!this.options.mapVertexBuffersAtCreation)
            renderer.queueWriteBuffer(vertexBuffer.buffer.GPUBuffer, 0, vertexBuffer.array)
        }
      }

      if (this.options.mapVertexBuffersAtCreation) this.computeGeometry()

      this.ready = true
    }
  }

  /**
   * Add a vertex buffer to our Geometry, set its attributes and return it
   * @param parameters - vertex buffer {@link VertexBufferParams | parameters}
   * @returns - newly created {@link VertexBuffer | vertex buffer}
   */
  addVertexBuffer({
    stepMode = 'vertex',
    name,
    attributes = [],
    buffer = null,
  }: VertexBufferParams = {}): VertexBuffer {
    buffer = buffer || new Buffer()

    const vertexBuffer = {
      name: name ?? 'attributes' + this.vertexBuffers.length,
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      buffer,
      array: null,
    }

    // set attributes right away if possible
    attributes?.forEach((attribute) => {
      this.setAttribute({
        vertexBuffer,
        ...attribute,
      } as VertexBufferAttributeParams)
    })

    this.vertexBuffers.push(vertexBuffer)

    return vertexBuffer
  }

  /**
   * Get a vertex buffer by name
   * @param name - our vertex buffer name
   * @returns - found {@link VertexBuffer | vertex buffer} or null if not found
   */
  getVertexBufferByName(name = ''): VertexBuffer | null {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name)
  }

  /**
   * Set a vertex buffer attribute
   * @param parameters - attributes {@link VertexBufferAttributeParams | parameters}
   */
  setAttribute({
    vertexBuffer = this.vertexBuffers[0],
    name,
    type = 'vec3f',
    bufferFormat = 'float32x3',
    size = 3,
    array = new Float32Array(this.verticesCount * size),
    verticesStride = 1,
  }: VertexBufferAttributeParams) {
    const attributes = vertexBuffer.attributes
    const attributesLength = attributes.length

    if (!name) name = 'geometryAttribute' + attributesLength

    if (name === 'position' && (type !== 'vec3f' || bufferFormat !== 'float32x3' || size !== 3)) {
      throwWarning(
        `Geometry 'position' attribute must have this exact properties set:\n\ttype: 'vec3f',\n\tbufferFormat: 'float32x3',\n\tsize: 3`
      )
      type = 'vec3f'
      bufferFormat = 'float32x3'
      size = 3
    }

    const attributeCount = array.length / size

    if (name === 'position') {
      this.verticesCount = attributeCount
    }

    if (
      vertexBuffer.stepMode === 'vertex' &&
      this.verticesCount &&
      this.verticesCount !== attributeCount * verticesStride
    ) {
      throwError(
        `Geometry vertex attribute error. Attribute array of size ${size} must be of length: ${
          this.verticesCount * size
        }, current given: ${array.length}. (${this.verticesCount} vertices).`
      )
    } else if (vertexBuffer.stepMode === 'instance' && attributeCount !== this.instancesCount) {
      throwError(
        `Geometry instance attribute error. Attribute array of size ${size} must be of length: ${
          this.instancesCount * size
        }, current given: ${array.length}. (${this.instancesCount} instances).`
      )
    }

    const attribute = {
      name,
      type,
      bufferFormat,
      size,
      bufferLength: array.length,
      offset: attributesLength
        ? attributes.reduce((accumulator: number, currentValue) => {
            return accumulator + currentValue.bufferLength
          }, 0)
        : 0,
      bufferOffset: attributesLength
        ? attributes[attributesLength - 1].bufferOffset + attributes[attributesLength - 1].size * 4
        : 0,
      array,
      verticesStride: verticesStride,
    }

    vertexBuffer.bufferLength += attribute.bufferLength * verticesStride
    vertexBuffer.arrayStride += attribute.size
    vertexBuffer.attributes.push(attribute)
  }

  /**
   * Get an attribute by name
   * @param name - name of the attribute to find
   * @returns - found {@link VertexBufferAttribute | attribute} or null if not found
   */
  getAttributeByName(name: string): VertexBufferAttribute | null {
    let attribute
    this.vertexBuffers.forEach((vertexBuffer) => {
      attribute = vertexBuffer.attributes.find((attribute) => attribute.name === name)
    })

    return attribute
  }

  /**
   * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
   * Also compute the Geometry bounding box.
   */
  computeGeometry() {
    if (this.ready) return

    this.vertexBuffers.forEach((vertexBuffer, index) => {
      if (index === 0) {
        const hasPositionAttribute = vertexBuffer.attributes.find(
          (attribute) => attribute.name === 'position'
        ) as VertexBufferAttribute | null

        if (!hasPositionAttribute) {
          throwError(`Geometry must have a 'position' attribute`)
        }

        if (
          hasPositionAttribute.type !== 'vec3f' ||
          hasPositionAttribute.bufferFormat !== 'float32x3' ||
          hasPositionAttribute.size !== 3
        ) {
          throwWarning(
            `Geometry 'position' attribute must have this exact properties set:\n\ttype: 'vec3f',\n\tbufferFormat: 'float32x3',\n\tsize: 3`
          )
          hasPositionAttribute.type = 'vec3f'
          hasPositionAttribute.bufferFormat = 'float32x3'
          hasPositionAttribute.size = 3
        }
      }

      const isBufferMapped = vertexBuffer.buffer.GPUBuffer && vertexBuffer.buffer.GPUBuffer.mapState === 'mapped'

      vertexBuffer.array = isBufferMapped
        ? new Float32Array(vertexBuffer.buffer.GPUBuffer.getMappedRange())
        : new Float32Array(vertexBuffer.bufferLength)

      let currentIndex = 0
      let attributeIndex = 0
      for (let i = 0; i < vertexBuffer.bufferLength; i += vertexBuffer.arrayStride) {
        for (let j = 0; j < vertexBuffer.attributes.length; j++) {
          const { name, size, array, verticesStride } = vertexBuffer.attributes[j]

          for (let s = 0; s < size; s++) {
            const attributeValue = array[Math.floor(attributeIndex / verticesStride) * size + s]
            vertexBuffer.array[currentIndex] = attributeValue

            // compute bounding box
            if (name === 'position') {
              if (s % 3 === 0) {
                // x
                if (this.boundingBox.min.x > attributeValue) this.boundingBox.min.x = attributeValue
                if (this.boundingBox.max.x < attributeValue) this.boundingBox.max.x = attributeValue
              } else if (s % 3 === 1) {
                // y
                if (this.boundingBox.min.y > attributeValue) this.boundingBox.min.y = attributeValue
                if (this.boundingBox.max.y < attributeValue) this.boundingBox.max.y = attributeValue
              } else if (s % 3 === 2) {
                // z
                if (this.boundingBox.min.z > attributeValue) this.boundingBox.min.z = attributeValue
                if (this.boundingBox.max.z < attributeValue) this.boundingBox.max.z = attributeValue
              }
            }

            currentIndex++
          }
        }

        attributeIndex++
      }

      if (isBufferMapped) {
        vertexBuffer.buffer.GPUBuffer.unmap()
      }
    })

    if (!this.wgslStructFragment) {
      this.#setWGSLFragment()
    }
  }

  /**
   * Set the WGSL code snippet that will be appended to the vertex shader.
   * @private
   */
  #setWGSLFragment() {
    let locationIndex = -1
    this.wgslStructFragment = `struct Attributes {\n\t@builtin(vertex_index) vertexIndex : u32,\n\t@builtin(instance_index) instanceIndex : u32,${this.vertexBuffers
      .map((vertexBuffer) => {
        return vertexBuffer.attributes.map((attribute) => {
          locationIndex++
          return `\n\t@location(${locationIndex}) ${attribute.name}: ${attribute.type}`
        })
      })
      .join(',')}\n};`
  }

  /**
   * Create the {@link createBuffers | geometry buffers} and {@link computeGeometry | compute the geometry}. The order in which those operations take place depends on mappedAtCreation parameter.
   * @param parameters - parameters used to create the geometry.
   * @param parameters.renderer - {@link Renderer} used to create the buffers.
   * @param parameters.label - label to use for the buffers.
   */
  createGeometry({ renderer, label = this.type }: { renderer: Renderer; label?: string }) {
    if (this.options.mapVertexBuffersAtCreation) {
      this.createBuffers({ renderer, label })
      this.computeGeometry()
    } else {
      this.computeGeometry()
      this.createBuffers({ renderer, label })
    }

    this.ready = true
  }

  /**
   * Create the {@link Geometry} {@link vertexBuffers | vertex buffers}.
   * @param parameters - parameters used to create the vertex buffers.
   * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
   * @param parameters.label - label to use for the vertex buffers.
   */
  createBuffers({ renderer, label = this.type }: { renderer: Renderer; label?: string }) {
    for (const vertexBuffer of this.vertexBuffers) {
      if (!vertexBuffer.buffer.GPUBuffer && !vertexBuffer.buffer.consumers.size) {
        vertexBuffer.buffer.createBuffer(renderer, {
          label: label + ': ' + vertexBuffer.name + ' buffer',
          size: vertexBuffer.bufferLength * Float32Array.BYTES_PER_ELEMENT,
          usage: this.options.mapVertexBuffersAtCreation
            ? GPUBufferUsage.VERTEX
            : GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
          mappedAtCreation: this.options.mapVertexBuffersAtCreation,
        })

        if (!this.options.mapVertexBuffersAtCreation)
          renderer.queueWriteBuffer(vertexBuffer.buffer.GPUBuffer, 0, vertexBuffer.array)
      }

      vertexBuffer.buffer.consumers.add(this.uuid)
    }
  }

  /** RENDER **/

  /**
   * Set our render pass geometry vertex buffers
   * @param pass - current render pass
   */
  setGeometryBuffers(pass: GPURenderPassEncoder) {
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      pass.setVertexBuffer(index, vertexBuffer.buffer.GPUBuffer)
    })
  }

  /**
   * Draw our geometry
   * @param pass - current render pass
   */
  drawGeometry(pass: GPURenderPassEncoder) {
    pass.draw(this.verticesCount, this.instancesCount)
  }

  /**
   * Set our vertex buffers then draw the geometry
   * @param pass - current render pass
   */
  render(pass: GPURenderPassEncoder) {
    if (!this.ready) return

    this.setGeometryBuffers(pass)
    this.drawGeometry(pass)
  }

  /**
   * Destroy our geometry vertex buffers.
   * @param renderer - current {@link Renderer}, in case we want to remove the {@link VertexBuffer#buffer | buffers} from the cache.
   */
  destroy(renderer: null | Renderer = null) {
    for (const vertexBuffer of this.vertexBuffers) {
      vertexBuffer.buffer.consumers.delete(this.uuid)
      if (!vertexBuffer.buffer.consumers.size) {
        vertexBuffer.buffer.destroy()
      }

      vertexBuffer.array = null

      if (renderer) renderer.removeBuffer(vertexBuffer.buffer)
    }
  }
}
