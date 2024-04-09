import { Geometry } from './Geometry.mjs';
import { Buffer } from '../buffers/Buffer.mjs';

class IndexedGeometry extends Geometry {
  /**
   * IndexedGeometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our IndexedGeometry
   */
  constructor({
    verticesOrder = "ccw",
    topology = "triangle-list",
    instancesCount = 1,
    vertexBuffers = [],
    mapVertexBuffersAtCreation = true
  } = {}) {
    super({ verticesOrder, topology, instancesCount, vertexBuffers, mapVertexBuffersAtCreation });
    this.type = "IndexedGeometry";
  }
  /**
   * Get whether this geometry is ready to draw, i.e. it has been computed, all its vertex buffers have been created and its index buffer has been created as well
   * @readonly
   */
  // get ready(): boolean {
  //   return super.ready && this.indexBuffer && !!this.indexBuffer.buffer.GPUBuffer
  // }
  /**
   * Reset all the {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer} when the device is lost
   */
  loseContext() {
    super.loseContext();
    if (this.indexBuffer) {
      this.indexBuffer.buffer.destroy();
    }
  }
  /**
   * Restore the {@link IndexedGeometry} buffers on context restoration
   * @param renderer - The {@link Renderer} used to recreate the buffers
   */
  restoreContext(renderer) {
    if (!this.indexBuffer.buffer.GPUBuffer) {
      this.indexBuffer.buffer.createBuffer(renderer);
      renderer.queueWriteBuffer(this.indexBuffer.buffer.GPUBuffer, 0, this.indexBuffer.array);
    }
    super.restoreContext(renderer);
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
      buffer: new Buffer()
    };
  }
  /**
   * Create the {@link Geometry} {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer}.
   * @param parameters - parameters used to create the vertex buffers.
   * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
   * @param parameters.label - label to use for the vertex buffers.
   */
  createBuffers({ renderer, label = this.type }) {
    this.indexBuffer.buffer.createBuffer(renderer, {
      label: label + ": index buffer",
      size: this.indexBuffer.array.byteLength,
      usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
    });
    renderer.queueWriteBuffer(this.indexBuffer.buffer.GPUBuffer, 0, this.indexBuffer.array);
    this.indexBuffer.buffer.consumers.add(this.uuid);
    super.createBuffers({ renderer, label });
  }
  /** RENDER **/
  /**
   * First, set our render pass geometry vertex buffers
   * Then, set our render pass geometry index buffer
   * @param pass - current render pass
   */
  setGeometryBuffers(pass) {
    super.setGeometryBuffers(pass);
    pass.setIndexBuffer(this.indexBuffer.buffer.GPUBuffer, this.indexBuffer.bufferFormat);
  }
  /**
   * Override the parentMesh draw method to draw indexed geometry
   * @param pass - current render pass
   */
  drawGeometry(pass) {
    pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount);
  }
  /**
   * Destroy our indexed geometry vertex buffers and index buffer.
   * @param renderer - current {@link Renderer}, in case we want to remove the {@link IndexBuffer#buffer | buffer} from the cache.
   */
  destroy(renderer = null) {
    super.destroy(renderer);
    if (this.indexBuffer) {
      this.indexBuffer.buffer.consumers.delete(this.uuid);
      this.indexBuffer.buffer.destroy();
      if (renderer)
        renderer.removeBuffer(this.indexBuffer.buffer);
    }
  }
}

export { IndexedGeometry };
