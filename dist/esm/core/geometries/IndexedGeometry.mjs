import { Geometry } from './Geometry.mjs';

class IndexedGeometry extends Geometry {
  /**
   * IndexedGeometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our IndexedGeometry
   */
  constructor({
    verticesOrder = "ccw",
    topology = "triangle-list",
    instancesCount = 1,
    vertexBuffers = []
  } = {}) {
    super({ verticesOrder, topology, instancesCount, vertexBuffers });
    this.type = "IndexedGeometry";
  }
  /**
   * Get whether this geometry is ready to draw, i.e. it has been computed, all its vertex buffers have been created and its index buffer has been created as well
   * @readonly
   */
  get ready() {
    return !this.shouldCompute && !this.vertexBuffers.find((vertexBuffer) => !vertexBuffer.buffer) && this.indexBuffer && !!this.indexBuffer.buffer;
  }
  /**
   * If we have less than 65.536 vertices, we should use a Uin16Array to hold our index buffer values
   * @readonly
   */
  get useUint16IndexArray() {
    return this.verticesCount < 256 * 256;
  }
  /**
   * Set our {@link indexBuffer}
   * @param parameters - {@link IndexedGeometryIndexBufferOptions | parameters} used to create our index buffer
   */
  setIndexBuffer({ bufferFormat = "uint32", array = new Uint32Array(0) }) {
    this.indexBuffer = {
      array,
      bufferFormat,
      bufferLength: array.length,
      buffer: null
    };
  }
  /** RENDER **/
  /**
   * First, set our render pass geometry vertex buffers
   * Then, set our render pass geometry index buffer
   * @param pass - current render pass
   */
  setGeometryBuffers(pass) {
    super.setGeometryBuffers(pass);
    pass.setIndexBuffer(this.indexBuffer.buffer, this.indexBuffer.bufferFormat);
  }
  /**
   * Override the parentMesh draw method to draw indexed geometry
   * @param pass - current render pass
   */
  drawGeometry(pass) {
    pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount);
  }
  /**
   * Destroy our indexed geometry vertex buffers and index buffer
   */
  destroy() {
    super.destroy();
    this.indexBuffer?.buffer?.destroy();
    this.indexBuffer.buffer = null;
  }
}

export { IndexedGeometry };
