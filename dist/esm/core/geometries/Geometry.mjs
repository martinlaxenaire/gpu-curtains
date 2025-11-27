import { Box3 } from '../../math/Box3.mjs';
import { generateUUID, throwWarning, throwError } from '../../utils/utils.mjs';
import { Buffer } from '../buffers/Buffer.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { getVertexBufferAttributeLayout, vertexBufferViewSetFunction } from './utils.mjs';

class Geometry {
  /**
   * Geometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our Geometry.
   */
  constructor({
    verticesOrder = "ccw",
    topology = "triangle-list",
    instancesCount = 1,
    vertexBuffers = [],
    mapBuffersAtCreation = true
  } = {}) {
    this.verticesCount = 0;
    this.verticesOrder = verticesOrder;
    this.topology = topology;
    this.instancesCount = instancesCount;
    this.ready = false;
    this.boundingBox = new Box3();
    this.type = "Geometry";
    this.uuid = generateUUID();
    this.indirectDraw = null;
    this.vertexBuffers = [];
    this.consumers = /* @__PURE__ */ new Set();
    this.options = {
      verticesOrder,
      topology,
      instancesCount,
      vertexBuffers,
      mapBuffersAtCreation
    };
    const attributesBuffer = vertexBuffers.find((vertexBuffer) => vertexBuffer.name === "attributes");
    if (!vertexBuffers.length || !attributesBuffer) {
      this.addVertexBuffer({
        name: "attributes"
      });
    } else if (attributesBuffer) {
      vertexBuffers.sort((a, b) => {
        const aIndex = a.name !== "attributes" ? Infinity : -1;
        const bIndex = b.name !== "attributes" ? Infinity : -1;
        return aIndex - bIndex;
      });
    }
    for (const vertexBuffer of vertexBuffers) {
      this.addVertexBuffer({
        stepMode: vertexBuffer.stepMode ?? "vertex",
        name: vertexBuffer.name,
        attributes: vertexBuffer.attributes,
        ...vertexBuffer.array && { buffer: vertexBuffer.array },
        ...vertexBuffer.arrayBuffer && { buffer: vertexBuffer.arrayBuffer },
        ...vertexBuffer.buffer && { buffer: vertexBuffer.buffer },
        ...vertexBuffer.bufferOffset && { bufferOffset: vertexBuffer.bufferOffset },
        ...vertexBuffer.bufferSize && { bufferSize: vertexBuffer.bufferSize }
      });
    }
    if (attributesBuffer) {
      this.setWGSLFragment();
    }
  }
  /**
   * Reset all the {@link vertexBuffers | vertex buffers} when the device is lost.
   */
  loseContext() {
    this.ready = false;
    for (const vertexBuffer of this.vertexBuffers) {
      vertexBuffer.buffer.destroy();
    }
  }
  /**
   * Restore the {@link Geometry} buffers on context restoration.
   * @param renderer - The {@link Renderer} used to recreate the buffers.
   */
  restoreContext(renderer) {
    if (this.ready) return;
    for (const vertexBuffer of this.vertexBuffers) {
      if (!vertexBuffer.buffer.GPUBuffer && vertexBuffer.buffer.consumers.size === 0) {
        vertexBuffer.buffer.createBuffer(renderer);
        this.uploadBuffer(renderer, vertexBuffer);
      }
      vertexBuffer.buffer.consumers.add(this.uuid);
    }
    this.ready = true;
  }
  /**
   * Add a vertex buffer to our Geometry, set its attributes and return it.
   * @param parameters - Vertex buffer {@link VertexBufferParams | parameters}.
   * @returns - Newly created {@link VertexBuffer | vertex buffer}.
   */
  addVertexBuffer({
    stepMode = "vertex",
    name,
    attributes = [],
    array = null,
    arrayBuffer = null,
    buffer = null,
    bufferOffset = 0,
    bufferSize = null
  } = {}) {
    buffer = buffer || new Buffer();
    const vertexBuffer = {
      name: name ?? "attributes" + this.vertexBuffers.length,
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      array,
      arrayBuffer,
      buffer,
      bufferOffset,
      bufferSize
    };
    attributes?.forEach((attribute) => {
      this.setAttribute({
        vertexBuffer,
        ...attribute
      });
    });
    this.vertexBuffers.push(vertexBuffer);
    return vertexBuffer;
  }
  /**
   * Get a vertex buffer by name.
   * @param name - Our vertex buffer name.
   * @returns - Found {@link VertexBuffer | vertex buffer} or null if not found.
   */
  getVertexBufferByName(name = "") {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name);
  }
  /**
   * Set a vertex buffer attribute.
   * @param parameters - Attributes {@link VertexBufferAttributeParams | parameters}.
   */
  setAttribute({
    vertexBuffer = this.vertexBuffers[0],
    name,
    type,
    bufferFormat,
    size = 3,
    array = new Float32Array(this.verticesCount * size),
    normalized = false,
    verticesStride = 1
  }) {
    const attributes = vertexBuffer.attributes;
    const attributesLength = attributes.length;
    if (!name) name = "geometryAttribute" + attributesLength;
    const attributeLayout = getVertexBufferAttributeLayout({
      size,
      array,
      normalized
    });
    bufferFormat = bufferFormat ?? attributeLayout.format;
    type = type ?? attributeLayout.type;
    if (name === "position" && (type !== "vec3f" || bufferFormat !== "float32x3" || size !== 3)) {
      throwWarning(
        `Geometry 'position' attribute must have this exact properties set:
	type: 'vec3f',
	bufferFormat: 'float32x3',
	size: 3`
      );
      type = "vec3f";
      bufferFormat = "float32x3";
      size = 3;
    }
    let arrayLength = array.length;
    const attributeCount = arrayLength / size;
    if (name === "position") {
      this.verticesCount = attributeCount;
    }
    if (vertexBuffer.stepMode === "vertex" && this.verticesCount && this.verticesCount !== attributeCount * verticesStride) {
      throwError(
        `Geometry vertex attribute error. Attribute array of size ${size} must be of length: ${this.verticesCount * size}, current given: ${array.length}. (${this.verticesCount} vertices).`
      );
    } else if (vertexBuffer.stepMode === "instance" && attributeCount !== this.instancesCount) {
      if (vertexBuffer.buffer) {
        arrayLength = this.instancesCount * size;
      } else {
        throwError(
          `Geometry instance attribute error. Attribute array of size ${size} must be of length: ${this.instancesCount * size}, current given: ${array.length}. (${this.instancesCount} instances).`
        );
      }
    }
    const bufferOffset = attributesLength ? attributes[attributesLength - 1].bufferOffset + attributes[attributesLength - 1].size * attributes[attributesLength - 1].array.BYTES_PER_ELEMENT : 0;
    const attribute = {
      name,
      type,
      bufferFormat,
      size,
      bufferOffset,
      array,
      verticesStride,
      normalized
    };
    vertexBuffer.bufferLength += arrayLength * array.BYTES_PER_ELEMENT * verticesStride;
    vertexBuffer.arrayStride += attribute.size * array.BYTES_PER_ELEMENT;
    vertexBuffer.attributes.push(attribute);
  }
  /**
   * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet.
   * @readonly
   */
  get shouldCompute() {
    return this.vertexBuffers.length && !this.vertexBuffers[0].arrayBuffer;
  }
  /**
   * Get an attribute by name.
   * @param name - Name of the attribute to find.
   * @returns - Found {@link VertexBufferAttribute | attribute} or null if not found.
   */
  getAttributeByName(name) {
    let attribute;
    for (const vertexBuffer of this.vertexBuffers) {
      attribute = vertexBuffer.attributes.find((attribute2) => attribute2.name === name);
      if (attribute) break;
    }
    return attribute;
  }
  /**
   * Compute the normal {@link Vec3} from a triangle defined by three {@link Vec3} by computing edges {@link Vec3}.
   * @param vertex1 - First triangle position.
   * @param vertex2 - Second triangle position.
   * @param vertex3 - Third triangle position.
   * @param edge1 - First edge.
   * @param edge2 - Second edge.
   * @param normal - Flat normal generated.
   */
  computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal) {
    edge1.copy(vertex2).sub(vertex1);
    edge2.copy(vertex3).sub(vertex1);
    normal.crossVectors(edge1, edge2).normalize();
  }
  /**
   * Compute {@link Geometry} flat normals in case the `normal` attribute is missing.
   */
  computeFlatNormals() {
    const positionAttribute = this.getAttributeByName("position");
    const vertex1 = new Vec3();
    const vertex2 = new Vec3();
    const vertex3 = new Vec3();
    const edge1 = new Vec3();
    const edge2 = new Vec3();
    const normal = new Vec3();
    const posLength = positionAttribute.array.length;
    const normalArray = new Float32Array(posLength);
    for (let i = 0; i < posLength; i += positionAttribute.size * 3) {
      vertex1.set(positionAttribute.array[i], positionAttribute.array[i + 1], positionAttribute.array[i + 2]);
      vertex2.set(positionAttribute.array[i + 3], positionAttribute.array[i + 4], positionAttribute.array[i + 5]);
      vertex3.set(positionAttribute.array[i + 6], positionAttribute.array[i + 7], positionAttribute.array[i + 8]);
      this.computeNormalFromTriangle(vertex1, vertex2, vertex3, edge1, edge2, normal);
      for (let j = 0; j < 3; j++) {
        normalArray[i + j * 3] = normal.x;
        normalArray[i + 1 + j * 3] = normal.y;
        normalArray[i + 2 + j * 3] = normal.z;
      }
    }
    this.setAttribute({
      name: "normal",
      type: "vec3f",
      bufferFormat: "float32x3",
      size: 3,
      array: normalArray
    });
  }
  /**
   * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
   * Also compute the Geometry bounding box.
   */
  computeGeometry() {
    if (this.ready) return;
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      if (index === 0) {
        const hasPositionAttribute = vertexBuffer.attributes.find(
          (attribute) => attribute.name === "position"
        );
        if (!hasPositionAttribute) {
          throwError(`Geometry must have a 'position' attribute`);
        }
        if (hasPositionAttribute.type !== "vec3f" || hasPositionAttribute.bufferFormat !== "float32x3" || hasPositionAttribute.size !== 3) {
          throwWarning(
            `Geometry 'position' attribute must have this exact properties set:
	type: 'vec3f',
	bufferFormat: 'float32x3',
	size: 3`
          );
          hasPositionAttribute.type = "vec3f";
          hasPositionAttribute.bufferFormat = "float32x3";
          hasPositionAttribute.size = 3;
        }
        const hasNormalAttribute = vertexBuffer.attributes.find(
          (attribute) => attribute.name === "normal"
        );
        if (!hasNormalAttribute) {
          this.computeFlatNormals();
          this.setWGSLFragment();
        }
      }
      if (vertexBuffer.array && vertexBuffer.array.byteLength === vertexBuffer.bufferLength) {
        vertexBuffer.arrayBuffer = new ArrayBuffer(vertexBuffer.bufferLength);
        new Uint8Array(vertexBuffer.arrayBuffer).set(
          new Uint8Array(vertexBuffer.array.buffer, vertexBuffer.array.byteOffset, vertexBuffer.array.byteLength)
        );
      } else if (!vertexBuffer.arrayBuffer || vertexBuffer.arrayBuffer.byteLength !== vertexBuffer.bufferLength) {
        vertexBuffer.arrayBuffer = new ArrayBuffer(vertexBuffer.bufferLength);
        const arrayView = new DataView(vertexBuffer.arrayBuffer);
        for (let a = 0; a < vertexBuffer.attributes.length; a++) {
          const attribute = vertexBuffer.attributes[a];
          const { name, array, size, bufferOffset, verticesStride } = attribute;
          const setFunction = vertexBufferViewSetFunction(arrayView, array);
          const arrayLength = array.length;
          for (let i = 0; i < arrayLength; i += size) {
            for (let s = 0; s < size; s++) {
              const attrValue = array[i + s];
              if (name === "position") {
                if (s % 3 === 0) {
                  this.boundingBox.min.x = Math.min(this.boundingBox.min.x, attrValue);
                  this.boundingBox.max.x = Math.max(this.boundingBox.max.x, attrValue);
                } else if (s % 3 === 1) {
                  this.boundingBox.min.y = Math.min(this.boundingBox.min.y, attrValue);
                  this.boundingBox.max.y = Math.max(this.boundingBox.max.y, attrValue);
                } else if (s % 3 === 2) {
                  this.boundingBox.min.z = Math.min(this.boundingBox.min.z, attrValue);
                  this.boundingBox.max.z = Math.max(this.boundingBox.max.z, attrValue);
                }
              }
              const attrIndex = i / size;
              for (let vs = 0; vs < verticesStride; vs++) {
                const attrOffset = s * array.BYTES_PER_ELEMENT;
                const attrStrideOffset = attrIndex * vertexBuffer.arrayStride;
                const verticesStrideOffset = (vs + (verticesStride - 1) * attrIndex) * vertexBuffer.arrayStride;
                const startOffset = verticesStrideOffset + attrStrideOffset + bufferOffset + attrOffset;
                setFunction(startOffset, attrValue, true);
              }
            }
          }
        }
      }
    });
    if (!this.wgslStructFragment) {
      this.setWGSLFragment();
    }
  }
  /**
   * Set the {@link layoutCacheKey} and WGSL code snippet that will be appended to the vertex shader.
   */
  setWGSLFragment() {
    let locationIndex = -1;
    this.wgslStructFragment = `struct Attributes {
  @builtin(vertex_index) vertexIndex : u32,
  @builtin(instance_index) instanceIndex : u32,${this.vertexBuffers.map((vertexBuffer) => {
      return vertexBuffer.attributes.map((attribute) => {
        locationIndex++;
        return `
  @location(${locationIndex}) ${attribute.name}: ${attribute.type}`;
      });
    }).join(",")}
};`;
    this.layoutCacheKey = this.vertexBuffers.map((vertexBuffer) => {
      return vertexBuffer.name + "," + vertexBuffer.attributes.map((attribute) => {
        return `${attribute.name},${attribute.size}`;
      });
    }).join(",") + ",";
  }
  /**
   * Create the {@link Geometry} {@link vertexBuffers | vertex buffers}.
   * @param parameters - Parameters used to create the vertex buffers.
   * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
   * @param parameters.label - Label to use for the vertex buffers.
   */
  createBuffers({ renderer, label = this.type }) {
    if (this.ready) return;
    for (const vertexBuffer of this.vertexBuffers) {
      if (!vertexBuffer.bufferSize) {
        vertexBuffer.bufferSize = vertexBuffer.arrayBuffer.byteLength;
      }
      if (!vertexBuffer.buffer.GPUBuffer && !vertexBuffer.buffer.consumers.size) {
        vertexBuffer.buffer.createBuffer(renderer, {
          label: label + ": " + vertexBuffer.name + " buffer",
          size: vertexBuffer.bufferSize,
          usage: this.options.mapBuffersAtCreation ? ["vertex"] : ["copyDst", "vertex"],
          mappedAtCreation: this.options.mapBuffersAtCreation
        });
        this.uploadBuffer(renderer, vertexBuffer);
      }
      vertexBuffer.buffer.consumers.add(this.uuid);
    }
    this.ready = true;
  }
  /**
   * Upload a {@link GeometryBuffer} to the GPU.
   * @param renderer - {@link Renderer} used to upload the buffer.
   * @param buffer - {@link GeometryBuffer} holding a {@link Buffer} and a typed array to upload.
   */
  uploadBuffer(renderer, buffer) {
    if (this.options.mapBuffersAtCreation) {
      if (buffer.arrayBuffer) {
        const src = new Uint8Array(buffer.arrayBuffer);
        const mappedRange = buffer.buffer.GPUBuffer.getMappedRange();
        new Uint8Array(mappedRange).set(src);
      } else if (buffer.array) {
        new buffer.array.constructor(buffer.buffer.GPUBuffer.getMappedRange()).set(
          buffer.array
        );
      }
      buffer.buffer.GPUBuffer.unmap();
    } else {
      renderer.queueWriteBuffer(buffer.buffer.GPUBuffer, 0, buffer.arrayBuffer ?? buffer.array);
    }
  }
  /**
   * Set the {@link indirectDraw} parameters to draw this {@link Geometry} with an {@link extras/buffers/IndirectBuffer.IndirectBuffer | IndirectBuffer}.
   * @param parameters -  {@link IndirectDrawParams | indirect draw parameters} to use for this {@link Geometry}.
   */
  useIndirectBuffer({ buffer, offset = 0 }) {
    this.indirectDraw = {
      buffer,
      offset
    };
  }
  /** RENDER **/
  /**
   * Set our render pass geometry vertex buffers.
   * @param pass - Current render pass.
   */
  setGeometryBuffers(pass) {
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      pass.setVertexBuffer(index, vertexBuffer.buffer.GPUBuffer, vertexBuffer.bufferOffset, vertexBuffer.bufferSize);
    });
  }
  /**
   * Draw our geometry. Can use indirect drawing if {@link indirectDraw} is set up.
   * @param pass - current render pass.
   */
  drawGeometry(pass) {
    if (this.indirectDraw && this.indirectDraw.buffer && this.indirectDraw.buffer.GPUBuffer) {
      pass.drawIndirect(this.indirectDraw.buffer.GPUBuffer, this.indirectDraw.offset);
    } else {
      pass.draw(this.verticesCount, this.instancesCount);
    }
  }
  /**
   * Set our vertex buffers then draw the geometry.
   * @param pass - current render pass.
   */
  render(pass) {
    if (!this.ready) return;
    this.setGeometryBuffers(pass);
    this.drawGeometry(pass);
  }
  /**
   * Destroy our geometry vertex buffers.
   * @param renderer - current {@link Renderer}, in case we want to remove the {@link VertexBuffer#buffer | buffers} from the cache.
   */
  destroy(renderer = null) {
    this.ready = false;
    for (const vertexBuffer of this.vertexBuffers) {
      vertexBuffer.buffer.consumers.delete(this.uuid);
      if (!vertexBuffer.buffer.consumers.size) {
        vertexBuffer.buffer.destroy();
      }
      vertexBuffer.array = null;
      vertexBuffer.arrayBuffer = null;
      if (renderer) renderer.removeBuffer(vertexBuffer.buffer);
    }
  }
}

export { Geometry };
