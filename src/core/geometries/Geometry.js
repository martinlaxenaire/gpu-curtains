import { Box3 } from '../../math/Box3'
import { throwError, throwWarning } from '../../utils/utils'

export class Geometry {
  constructor({ verticesOrder = 'cw' } = {}) {
    this.verticesCount = null
    this.verticesOrder = verticesOrder
    this.arrayStride = 0
    this.bufferLength = 0

    this.attributes = []

    this.boundingBox = new Box3()
  }

  setAttribute({ name, type = 'vec3f', bufferFormat = 'float32x3', size = 3, array = new Float32Array(0) }) {
    const attributesLength = this.attributes.length

    if (!name) name = 'geometryAttribute' + attributesLength

    if (name === 'position' && (type !== 'vec3f' || bufferFormat !== 'float32x3' || size !== 3)) {
      throwWarning(
        `Geometry 'position' attribute must have this exact properties set:\n\ttype: 'vec3f',\n\tbufferFormat: 'float32x3',\n\tsize: 3`
      )
      type = 'vec3f'
      bufferFormat = 'float32x3'
      size = 3
    }

    const attributeVerticesCount = array.length / size
    if (this.verticesCount && this.verticesCount !== attributeVerticesCount) {
      throwError(
        `Geometry vertices count error. Previous vertices count: ${this.verticesCount}, current given: ${attributeVerticesCount}`
      )
    }

    this.verticesCount = attributeVerticesCount

    const attribute = {
      name,
      type,
      bufferFormat,
      size,
      bufferLength: array.length,
      offset: attributesLength ? this.attributes[attributesLength - 1].bufferLength : 0,
      bufferOffset: attributesLength
        ? this.attributes[attributesLength - 1].bufferOffset + this.attributes[attributesLength - 1].size * 4
        : 0,
      array,
    }

    this.bufferLength += attribute.bufferLength
    this.arrayStride += attribute.size

    this.attributes.push(attribute)
  }

  computeGeometry() {
    const hasPositionAttribute = this.attributes.find((attribute) => attribute.name === 'position')
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

    this.array = new Float32Array(this.bufferLength)

    let currentIndex = 0
    let attributeIndex = 0
    for (let i = 0; i < this.bufferLength; i += this.arrayStride) {
      for (let j = 0; j < this.attributes.length; j++) {
        const attributeSize = this.attributes[j].size
        const attributeArray = this.attributes[j].array

        for (let s = 0; s < attributeSize; s++) {
          const attributeValue = attributeArray[attributeIndex * attributeSize + s]
          this.array[currentIndex] = attributeValue

          if (this.attributes[j].name === 'position') {
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

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslStructFragment = `struct Attributes {\n\t${this.attributes
      .map((attribute, index) => '@location(' + index + ') ' + attribute.name + ': ' + attribute.type)
      .join(',\n\t')}
};`
  }
}
