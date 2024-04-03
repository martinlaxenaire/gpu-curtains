import { IndexedGeometry } from './IndexedGeometry.mjs';

class PlaneGeometry extends IndexedGeometry {
  /**
   * PlaneGeometry constructor
   * @param parameters - {@link PlaneGeometryParams | parameters} used to create our PlaneGeometry
   */
  constructor({
    widthSegments = 1,
    heightSegments = 1,
    instancesCount = 1,
    vertexBuffers = [],
    topology
  } = {}) {
    super({ verticesOrder: "cw", topology, instancesCount, vertexBuffers });
    this.type = "PlaneGeometry";
    widthSegments = Math.floor(widthSegments);
    heightSegments = Math.floor(heightSegments);
    this.definition = {
      id: widthSegments * heightSegments + widthSegments,
      width: widthSegments,
      height: heightSegments,
      count: widthSegments * heightSegments
    };
    const verticesCount = (this.definition.width + 1) * (this.definition.height + 1);
    const attributes = this.getIndexedVerticesAndUVs(verticesCount);
    for (const attribute of Object.values(attributes)) {
      this.setAttribute(attribute);
    }
    this.setIndexArray();
  }
  /**
   * Set our PlaneGeometry index array
   */
  setIndexArray() {
    const indexArray = this.useUint16IndexArray ? new Uint16Array(this.definition.count * 6) : new Uint32Array(this.definition.count * 6);
    let index = 0;
    for (let y = 0; y < this.definition.height; y++) {
      for (let x = 0; x < this.definition.width; x++) {
        indexArray[index++] = x + y * (this.definition.width + 1);
        indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1);
        indexArray[index++] = x + 1 + y * (this.definition.width + 1);
        indexArray[index++] = x + 1 + y * (this.definition.width + 1);
        indexArray[index++] = this.definition.width + x + 1 + y * (this.definition.width + 1);
        indexArray[index++] = this.definition.width + x + 2 + y * (this.definition.width + 1);
      }
    }
    this.setIndexBuffer({
      array: indexArray,
      bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
    });
  }
  /**
   * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
   * @param verticesCount - {@link Geometry#verticesCount | number of vertices} of our {@link PlaneGeometry}
   * @returns - our position and uv {@link VertexBufferAttributeParams | attributes}
   */
  getIndexedVerticesAndUVs(verticesCount) {
    const uv = {
      name: "uv",
      type: "vec2f",
      bufferFormat: "float32x2",
      size: 2,
      array: new Float32Array(verticesCount * 2)
    };
    const position = {
      name: "position",
      type: "vec3f",
      bufferFormat: "float32x3",
      // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
      size: 3,
      array: new Float32Array(verticesCount * 3)
    };
    const normal = {
      name: "normal",
      type: "vec3f",
      bufferFormat: "float32x3",
      // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
      size: 3,
      array: new Float32Array(verticesCount * 3)
    };
    let positionOffset = 0;
    let normalOffset = 0;
    let uvOffset = 0;
    for (let y = 0; y <= this.definition.height; y++) {
      for (let x = 0; x <= this.definition.width; x++) {
        uv.array[uvOffset++] = x / this.definition.width;
        uv.array[uvOffset++] = 1 - y / this.definition.height;
        position.array[positionOffset++] = x * 2 / this.definition.width - 1;
        position.array[positionOffset++] = y * 2 / this.definition.height - 1;
        position.array[positionOffset++] = 0;
        normal.array[normalOffset++] = 0;
        normal.array[normalOffset++] = 0;
        normal.array[normalOffset++] = 1;
      }
    }
    return { position, uv, normal };
  }
}

export { PlaneGeometry };
