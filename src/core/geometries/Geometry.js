export class Geometry {
  constructor() {
    this.vertexCount = null
    this.arrayStride = 0
    this.bufferLength = 0

    this.attributes = []
  }

  setAttribute({ name, type = 'vec3f', bufferFormat = 'float32x3', size = 3, array = new Float32Array(0) }) {
    const attributesLength = this.attributes.length

    if (!name) name = 'geometryAttribute' + attributesLength

    const attributeVerticesCount = array.length / size
    if (this.vertexCount && this.vertexCount !== attributeVerticesCount) {
      console.error(
        'Geometry vertices count error. Previous vertices count:',
        this.vertexCount,
        ', current given:',
        attributeVerticesCount
      )

      return
    }

    this.vertexCount = attributeVerticesCount

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
    this.array = new Float32Array(this.bufferLength)

    let currentIndex = 0
    let attributeIndex = 0
    for (let i = 0; i < this.bufferLength; i += this.arrayStride) {
      for (let j = 0; j < this.attributes.length; j++) {
        const attributeSize = this.attributes[j].size
        const attributeArray = this.attributes[j].array

        for (let s = 0; s < attributeSize; s++) {
          this.array[currentIndex] = attributeArray[attributeIndex * attributeSize + s]
          currentIndex++
        }
      }

      attributeIndex++
    }

    this.setWGSLFragment()
  }

  setWGSLFragment() {
    this.wgslStructFragment = `
struct Attributes {
   ${this.attributes
     .map((attribute, index) => '@location(' + index + ')' + attribute.name + ': ' + attribute.type)
     .join(',\n\t')}
};\n`
  }
}
