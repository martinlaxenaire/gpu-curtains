import { Box3 } from '../../math/Box3'
import { throwError, throwWarning } from '../../utils/utils'
import {
  GeometryOptions,
  GeometryParams,
  VertexBuffer,
  VertexBufferAttribute,
  VertexBufferAttributeParams,
  VertexBufferParams,
} from '../../types/Geometries'

/**
 * Geometry class:
 * Used to create a Geometry from given parameters like instances count or geometry attributes.
 * Holds all attributes arrays, bounding box and handle WGSL code snippet for the vertex shader input attributes.
 */
export class Geometry {
  /** Number of vertices defined by this geometry */
  verticesCount: number
  /** Vertices order to be drawn by the [render pipeline]{@link RenderPipelineEntry} */
  verticesOrder: GPUFrontFace
  /** Topology to use with this {@link Geometry}, i.e. whether to draw triangles or points (see https://www.w3.org/TR/webgpu/#enumdef-gpuprimitivetopology) */
  topology: GPUPrimitiveTopology
  /** Number of instances of this geometry to draw */
  instancesCount: number
  /** Array of [vertex buffers]{@link VertexBuffer} to use with this geometry */
  vertexBuffers: VertexBuffer[]
  /** Options used to create this geometry */
  options: GeometryOptions
  /** The type of the geometry */
  type: string

  /** The bounding box of the geometry, i.e. two {@link Vec3} defining the min and max positions to wrap this geometry in a cube */
  boundingBox: Box3

  /** A string to append to our shaders code describing the WGSL structure representing this geometry attributes */
  wgslStructFragment: string

  /**
   * Geometry constructor
   * @param [parameters={}] - parameters used to create our Geometry
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
    this.verticesCount = 0
    this.verticesOrder = verticesOrder
    this.topology = topology
    this.instancesCount = instancesCount

    this.boundingBox = new Box3()

    this.type = 'Geometry'

    this.vertexBuffers = []

    // should contain our vertex position / uv data at least
    this.addVertexBuffer({
      name: 'attributes',
    })

    this.options = {
      verticesOrder,
      instancesCount,
      vertexBuffers,
      topology,
    }

    vertexBuffers.forEach((vertexBuffer) => {
      this.addVertexBuffer({
        stepMode: vertexBuffer.stepMode ?? 'vertex',
        name: vertexBuffer.name,
        attributes: vertexBuffer.attributes,
      })
    })
  }

  /**
   * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
   * @readonly
   */
  get shouldCompute(): boolean {
    return this.vertexBuffers.length && !this.vertexBuffers[0].array
  }

  /**
   * Get whether this geometry is ready to draw, i.e. it has been computed and all its vertex buffers have been created
   * @readonly
   */
  get ready(): boolean {
    return !this.shouldCompute && !this.vertexBuffers.find((vertexBuffer) => !vertexBuffer.buffer)
  }

  /**
   * Add a vertex buffer to our Geometry, set its attributes and return it
   * @param [parameters={}] - vertex buffer parameters
   * @param [parameters.stepMode="vertex"] - GPU vertex step mode
   * @param [parameters.name] - vertex buffer name
   * @param [parameters.attributes=[]] - vertex buffer attributes
   * @returns - newly created [vertex buffer]{@link VertexBuffer}
   */
  addVertexBuffer({ stepMode = 'vertex', name, attributes = [] }: VertexBufferParams = {}): VertexBuffer {
    const vertexBuffer = {
      name: name ?? 'attributes' + this.vertexBuffers.length,
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      buffer: null,
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
   * @returns - found [vertex buffer]{@link VertexBuffer} or null if not found
   */
  getVertexBufferByName(name = ''): VertexBuffer | null {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name)
  }

  /**
   * Set a vertex buffer attribute
   * @param parameters - attributes parameters
   * @param {VertexBuffer=} parameters.vertexBuffer - vertex buffer holding this attribute
   * @param {string} parameters.name - attribute name
   * @param {WGSLVariableType} [parameters.type="vec3f"] - attribute type
   * @param {GPUVertexFormat} [parameters.bufferFormat="float32x3"] - attribute buffer format
   * @param {number} [parameters.size=3] - attribute size
   * @param {Float32Array} [parameters.array=Float32Array] - attribute array
   * @param {number} [parameters.verticesStride=1] - number of vertices used by this attribute, i.e. insert one for every X vertices
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
   * @returns - found [attribute]{@link VertexBufferAttribute} or null if not found
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
    if (!this.shouldCompute) return

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

      vertexBuffer.array = new Float32Array(vertexBuffer.bufferLength)

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
    })

    this.#setWGSLFragment()
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

  /** RENDER **/

  /**
   * Set our render pass geometry vertex buffers
   * @param pass - current render pass
   */
  setGeometryBuffers(pass: GPURenderPassEncoder) {
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      pass.setVertexBuffer(index, vertexBuffer.buffer)
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
   * Destroy our geometry vertex buffers
   */
  destroy() {
    this.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.buffer?.destroy()
      vertexBuffer.buffer = null
    })
  }
}
