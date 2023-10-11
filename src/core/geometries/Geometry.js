import { Box3 } from '../../math/Box3'
import { throwError, throwWarning } from '../../utils/utils'

export class Geometry {
  constructor({ verticesOrder = 'cw', instancesCount = 1, vertexBuffers = [] } = {}) {
    this.verticesCount = 0
    this.verticesOrder = verticesOrder
    this.instancesCount = instancesCount

    this.boundingBox = new Box3()

    this.type = 'Geometry'

    // TODO
    this.vertexBuffers = []
    this.addVertexBuffer() // will contain our vertex position / uv data at least

    this.options = {
      verticesOrder,
      instancesCount,
      vertexBuffers,
    }

    vertexBuffers.forEach((newVertexBuffer) => {
      const vertexBuffer = this.addVertexBuffer(newVertexBuffer.stepMode ?? 'vertex')
      newVertexBuffer.attributes?.forEach((attribute) => {
        this.setAttribute({
          vertexBuffer,
          ...attribute,
        })
      })
    })
  }

  addVertexBuffer(stepMode = 'vertex') {
    const vertexBuffer = {
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      buffer: null,
      indexBuffer: null,
    }
    this.vertexBuffers.push(vertexBuffer)

    return vertexBuffer
  }

  setAttribute({
    vertexBuffer = this.vertexBuffers[0],
    name,
    type = 'vec3f',
    bufferFormat = 'float32x3',
    size = 3,
    array = new Float32Array(this.verticesCount * size),
  }) {
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

    if (vertexBuffer.stepMode === 'vertex' && this.verticesCount && this.verticesCount !== attributeCount) {
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
      offset: attributesLength ? attributes[attributesLength - 1].bufferLength : 0,
      bufferOffset: attributesLength
        ? attributes[attributesLength - 1].bufferOffset + attributes[attributesLength - 1].size * 4
        : 0,
      array,
    }

    vertexBuffer.bufferLength += attribute.bufferLength
    vertexBuffer.arrayStride += attribute.size
    vertexBuffer.attributes.push(attribute)
  }

  getAttribute(name) {
    // TODO
    return this.vertexBuffers.find((vertexBuffer) => {
      return vertexBuffer.attributes.find((attribute) => attribute.name === name)
    })
  }

  computeGeometry() {
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      if (index === 0) {
        const hasPositionAttribute = vertexBuffer.attributes.find((attribute) => attribute.name === 'position')
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
          const attributeSize = vertexBuffer.attributes[j].size
          const attributeArray = vertexBuffer.attributes[j].array

          for (let s = 0; s < attributeSize; s++) {
            const attributeValue = attributeArray[attributeIndex * attributeSize + s]
            vertexBuffer.array[currentIndex] = attributeValue

            // compute bounding box
            if (vertexBuffer.attributes[j].name === 'position') {
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

    this.setWGSLFragment()
  }

  setWGSLFragment() {
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
