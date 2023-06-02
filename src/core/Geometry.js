export class Geometry {
  constructor({ widthSegments = 1, heightSegments = 1 }) {
    this.type = 'Geometry'

    // unique plane buffers id based on width and height
    // used to get a geometry from cache
    this.definition = {
      id: widthSegments * heightSegments + widthSegments,
      width: widthSegments,
      height: heightSegments,
      count: widthSegments * heightSegments,
    }

    this.verticesCount = this.definition.width * 2 + 2 + (this.definition.height - 1) * (this.definition.width + 1)

    this.attributes = {
      uv: {
        type: 'vec2f',
        bufferFormat: 'float32x2',
        size: 2,
        bufferLength: this.verticesCount * 2,
        offset: 0,
        bufferOffset: 0,
      },
      position: {
        type: 'vec3f',
        bufferFormat: 'float32x3',
        // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
        //size: this.definition.width * this.definition.height * 3 * 3
        size: 3,
        bufferLength: this.verticesCount * 3,
        offset: this.verticesCount * 2, // previous bufferLength
        bufferOffset: 2 * 4, // previous size * 4 bytes
      },
    }

    const bufferLength = Object.keys(this.attributes).reduce((accumulator, attributeKey) => {
      const attribute = this.attributes[attributeKey]
      return accumulator + attribute.size * this.verticesCount
    }, 0)

    this.value = new Float32Array(bufferLength)

    this.arrayStride = 0

    //for(const attribute in this.attributes) {
    Object.keys(this.attributes).forEach((attributeKey, index) => {
      const attribute = this.attributes[attributeKey]

      attribute.array = new Float32Array(attribute.bufferLength)

      this.arrayStride += attribute.size * 4
    })

    this.setVerticesAndUVs()
    this.setWGSLFragment()
  }

  setVerticesAndUVs() {
    // TODO handle caching
    this.setIndexData()
    this.computeIndexedVerticesAndUVs()
  }

  setIndexData() {
    this.indexData = {
      array: new Uint32Array(this.definition.count * 6),
      bufferFormat: 'uint32',
      bufferLength: this.definition.count * 6,
    }

    let index = 0

    for (let y = 0; y < this.definition.height; y++) {
      for (let x = 0; x < this.definition.width; x++) {
        this.indexData.array[index++] = x + y * (this.definition.width + 1)
        this.indexData.array[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1)
        this.indexData.array[index++] = x + 1 + y * (this.definition.width + 1)

        this.indexData.array[index++] = x + 1 + y * (this.definition.width + 1)
        this.indexData.array[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1)
        this.indexData.array[index++] = this.definition.width + x + 2 + y * (this.definition.width + 1)
      }
    }
  }

  computeIndexedVerticesAndUVs() {
    // geometry vertices and UVs
    const position = this.attributes.position.array
    const uv = this.attributes.uv.array

    let positionOffset = 0
    let uvOffset = 0
    let offset = 0

    // this is how it will look for a 3x3 quad
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
          uv[uvOffset++] = u
          // remember on WebGPU, vec2(0, 0) for uv is the top left!
          uv[uvOffset++] = 1 - v

          position[positionOffset++] = (u - 0.5) * 2
          position[positionOffset++] = (v - 0.5) * 2
          position[positionOffset++] = 0

          this.value[offset++] = u
          this.value[offset++] = 1 - v
          this.value[offset++] = (u - 0.5) * 2
          this.value[offset++] = (v - 0.5) * 2
          this.value[offset++] = 0
        }

        uv[uvOffset++] = u + 1 / this.definition.width
        uv[uvOffset++] = 1 - v

        position[positionOffset++] = (u + 1 / this.definition.width - 0.5) * 2
        position[positionOffset++] = (v - 0.5) * 2
        position[positionOffset++] = 0

        this.value[offset++] = u + 1 / this.definition.width
        this.value[offset++] = 1 - v
        this.value[offset++] = (u + 1 / this.definition.width - 0.5) * 2
        this.value[offset++] = (v - 0.5) * 2
        this.value[offset++] = 0
      }
    }
  }

  setWGSLFragment() {
    this.wgslStructFragment = `
  struct Attributes {
    @location(0) uv: vec2f,
    @location(1) position: vec3f,
  };\n`
  }
}
