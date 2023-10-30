import { Box3 } from '../../math/Box3'
import { AttributeBufferParams, AttributeBufferParamsOption } from '../../utils/buffers-utils'
import { throwError, throwWarning } from '../../utils/utils'
import { GeometryOptions, GeometryParams, VertexBuffer, VertexBufferParams } from '../../types/Geometries'

/**
 * Geometry class:
 * Used to create a Geometry from given parameters like instances count or geometry attributes.
 * Holds all attributes arrays, bounding box and handle WGSL code snippet for the vertex shader input attributes.
 */
export class Geometry {
  verticesCount: number
  verticesOrder: GPUFrontFace
  instancesCount: number
  vertexBuffers: VertexBuffer[]
  options: GeometryOptions
  type: string

  boundingBox: Box3

  wgslStructFragment: string

  /**
   * Geometry constructor
   * @param {GeometryParams} [parameters={}] - parameters used to create our Geometry
   * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
   * @param {number} [parameters.instancesCount=1] - number of instances to draw
   * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
   */
  constructor({ verticesOrder = 'cw', instancesCount = 1, vertexBuffers = [] }: GeometryParams = {}) {
    this.verticesCount = 0
    this.verticesOrder = verticesOrder
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
   * Add a vertex buffer to our Geometry, set its attributes and return it
   * @param {VertexBufferParams} [parameters={}] - vertex buffer parameters
   * @param {GPUVertexStepMode} [parameters.stepMode="vertex"] - GPU vertex step mode
   * @param {string} [parameters.name] - vertex buffer name
   * @param {AttributeBufferParamsOption[]} [parameters.attributes=[]] - vertex buffer attributes
   * @returns {VertexBuffer}
   */
  addVertexBuffer({ stepMode = 'vertex', name, attributes = [] }: VertexBufferParams = {}): VertexBuffer {
    const vertexBuffer = {
      name: name ?? 'attributes' + this.vertexBuffers.length,
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      buffer: null,
      indexBuffer: null,
    } as VertexBuffer

    // set attributes right away if possible
    attributes?.forEach((attribute) => {
      this.setAttribute({
        vertexBuffer,
        ...attribute,
      } as AttributeBufferParamsOption)
    })

    this.vertexBuffers.push(vertexBuffer)

    return vertexBuffer
  }

  /**
   * Get a vertex buffer by name
   * @param {string} name - our vertex buffer name
   * @returns {?VertexBuffer} - found vertex buffer or null if not found
   */
  getVertexBufferByName(name = ''): VertexBuffer | null {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name)
  }

  /**
   * Set a vertex buffer attribute
   * @param {AttributeBufferParamsOption} parameters - attributes parameters
   * @param {VertexBuffer=} parameters.vertexBuffer - vertex buffer holding this attribute
   * @param {string} parameters.name - attribute name
   * @param {CoreBufferType} [parameters.type="vec3f"] - attribute type
   * @param {GPUVertexFormat} [parameters.bufferFormat="float32x3"] - attribute buffer format
   * @param {number} [parameters.size=3] - attribute size
   * @param {Float32Array} [parameters.array=Float32Array] - attribute array
   * @param {number} [parameters.verticesUsed=1] - number of vertices used by this attribute, i.e. insert one for every X vertices
   */
  setAttribute({
    vertexBuffer = this.vertexBuffers[0],
    name,
    type = 'vec3f',
    bufferFormat = 'float32x3',
    size = 3,
    array = new Float32Array(this.verticesCount * size),
    verticesUsed = 1,
  }: AttributeBufferParamsOption) {
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
      this.verticesCount !== attributeCount * verticesUsed
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
      verticesUsed,
    }

    vertexBuffer.bufferLength += attribute.bufferLength * verticesUsed
    vertexBuffer.arrayStride += attribute.size
    vertexBuffer.attributes.push(attribute)
  }

  /**
   * Get an attribute by name
   * @param {string} name - name of the attribute to find
   * @returns {?AttributeBufferParams} - found attribute or null if not found
   */
  getAttributeByName(name: string): AttributeBufferParams | null {
    let attribute
    this.vertexBuffers.forEach((vertexBuffer) => {
      attribute = vertexBuffer.attributes.find((attribute) => attribute.name === name)
    })

    return attribute
  }

  /**
   * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
   * @readonly
   * @type {boolean}
   */
  get shouldCompute(): boolean {
    return !this.vertexBuffers[0].array
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
        ) as AttributeBufferParams | null

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
          const { name, size, array, verticesUsed } = vertexBuffer.attributes[j]

          for (let s = 0; s < size; s++) {
            const attributeValue = array[Math.floor(attributeIndex / verticesUsed) * size + s]
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
}
