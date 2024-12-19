import { isRenderer } from '../../core/renderers/utils.mjs';
import { Buffer } from '../../core/buffers/Buffer.mjs';
import { generateUUID } from '../../utils/utils.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};
var _addGeometryToIndirectMappedBuffer, addGeometryToIndirectMappedBuffer_fn;
const indirectBufferEntrySize = 5;
class IndirectBuffer {
  /**
   * IndirectBuffer constructor.
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link IndirectBuffer}.
   * @param parameters - {@link IndirectBufferParams | parameters} use to create this {@link IndirectBuffer}.
   */
  constructor(renderer, { label = "Indirect buffer", geometries = [], minEntrySize = indirectBufferEntrySize } = {}) {
    /**
     * Add a {@link Geometry} or {@link IndexedGeometry} attributes to the {@link buffer} mapped array buffer.
     * @param geometry - {@link Geometry} or {@link IndexedGeometry} to add the attributes from
     * @param mappedBuffer - The {@link buffer} mapped array buffer
     * @param index - Index in the {@link buffer} mapped array buffer at which to add the attributes.
     * @private
     */
    __privateAdd(this, _addGeometryToIndirectMappedBuffer);
    this.type = "IndirectBuffer";
    renderer = isRenderer(renderer, this.type);
    this.renderer = renderer;
    this.uuid = generateUUID();
    this.options = {
      label,
      geometries,
      minEntrySize
    };
    this.geometries = /* @__PURE__ */ new Map();
    this.buffer = null;
    this.addGeometries(geometries);
  }
  /**
   * Get the number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
   * @returns - Number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
   * @readonly
   */
  get size() {
    return this.geometries.size;
  }
  /**
   * Add multiple {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
   * @param geometries - Array of {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
   */
  addGeometries(geometries = []) {
    geometries.forEach((geometry) => this.addGeometry(geometry));
  }
  /**
   * Add a {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
   * @param geometry - A {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
   */
  addGeometry(geometry) {
    this.geometries.set(geometry.uuid, geometry);
  }
  /**
   * Get the byte offset in the {@link buffer} at a given index.
   * @param index - Index to get the byte offset from.
   * @returns - Byte offset in the {@link buffer} at a given index.
   */
  getByteOffsetAtIndex(index = 0) {
    return index * this.options.minEntrySize * Uint32Array.BYTES_PER_ELEMENT;
  }
  /**
   * Create the {@link buffer} (or destroy it if it already exists) with the right size, create its {@link GPUBuffer} in a mapped state, add all {@link geometries} attributes to the mapped buffer and tell the {@link geometries} to use this {@link IndirectBuffer}.
   */
  create() {
    const size = this.getByteOffsetAtIndex(this.geometries.size);
    if (this.buffer) {
      this.buffer.destroy();
      this.buffer.options.size = size;
    } else {
      this.buffer = new Buffer({
        label: this.options.label,
        size,
        usage: ["copyDst", "indirect", "storage"],
        mappedAtCreation: true
      });
    }
    this.buffer.consumers.add(this.uuid);
    this.buffer.createBuffer(this.renderer);
    const indirectMappedBuffer = new Uint32Array(this.buffer.GPUBuffer.getMappedRange());
    let offset = 0;
    this.geometries.forEach((geometry) => {
      __privateMethod(this, _addGeometryToIndirectMappedBuffer, addGeometryToIndirectMappedBuffer_fn).call(this, geometry, indirectMappedBuffer, offset * this.options.minEntrySize);
      geometry.useIndirectBuffer(this.buffer, this.getByteOffsetAtIndex(offset));
      offset++;
    });
    this.buffer.GPUBuffer.unmap();
  }
  /**
   * Destroy this {@link IndirectBuffer}. Reset all {@link geometries} {@link Geometry#indirectDraw | indirectDraw} properties and destroy the {@link Buffer}.
   */
  destroy() {
    this.geometries.forEach((geometry) => geometry.indirectDraw = null);
    this.buffer?.destroy();
    this.buffer = null;
    this.geometries = null;
  }
}
_addGeometryToIndirectMappedBuffer = new WeakSet();
addGeometryToIndirectMappedBuffer_fn = function(geometry, mappedBuffer, index = 0) {
  if ("indexBuffer" in geometry && geometry.indexBuffer) {
    mappedBuffer[index] = geometry.indexBuffer.bufferLength;
    mappedBuffer[index + 1] = geometry.instancesCount;
    mappedBuffer[index + 2] = 0;
    mappedBuffer[index + 3] = 0;
    mappedBuffer[index + 4] = 0;
  } else {
    mappedBuffer[index] = geometry.verticesCount;
    mappedBuffer[index + 1] = geometry.instancesCount;
    mappedBuffer[index + 2] = 0;
    mappedBuffer[index + 3] = 0;
    mappedBuffer[index + 4] = 0;
  }
};

export { IndirectBuffer };
