import { Box3 } from '../../math/Box3.mjs';
import { throwWarning, throwError } from '../../utils/utils.mjs';

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
var _setWGSLFragment, setWGSLFragment_fn;
class Geometry {
  /**
   * Geometry constructor
   * @param parameters - {@link GeometryParams | parameters} used to create our Geometry
   */
  constructor({
    verticesOrder = "ccw",
    topology = "triangle-list",
    instancesCount = 1,
    vertexBuffers = []
  } = {}) {
    /**
     * Set the WGSL code snippet that will be appended to the vertex shader.
     * @private
     */
    __privateAdd(this, _setWGSLFragment);
    this.verticesCount = 0;
    this.verticesOrder = verticesOrder;
    this.topology = topology;
    this.instancesCount = instancesCount;
    this.boundingBox = new Box3();
    this.type = "Geometry";
    this.vertexBuffers = [];
    this.addVertexBuffer({
      name: "attributes"
    });
    this.options = {
      verticesOrder,
      instancesCount,
      vertexBuffers,
      topology
    };
    vertexBuffers.forEach((vertexBuffer) => {
      this.addVertexBuffer({
        stepMode: vertexBuffer.stepMode ?? "vertex",
        name: vertexBuffer.name,
        attributes: vertexBuffer.attributes
      });
    });
  }
  /**
   * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
   * @readonly
   */
  get shouldCompute() {
    return this.vertexBuffers.length && !this.vertexBuffers[0].array;
  }
  /**
   * Get whether this geometry is ready to draw, i.e. it has been computed and all its vertex buffers have been created
   * @readonly
   */
  get ready() {
    return !this.shouldCompute && !this.vertexBuffers.find((vertexBuffer) => !vertexBuffer.buffer);
  }
  /**
   * Add a vertex buffer to our Geometry, set its attributes and return it
   * @param parameters - vertex buffer {@link VertexBufferParams | parameters}
   * @returns - newly created {@link VertexBuffer | vertex buffer}
   */
  addVertexBuffer({ stepMode = "vertex", name, attributes = [] } = {}) {
    const vertexBuffer = {
      name: name ?? "attributes" + this.vertexBuffers.length,
      stepMode,
      arrayStride: 0,
      bufferLength: 0,
      attributes: [],
      buffer: null
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
   * Get a vertex buffer by name
   * @param name - our vertex buffer name
   * @returns - found {@link VertexBuffer | vertex buffer} or null if not found
   */
  getVertexBufferByName(name = "") {
    return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name);
  }
  /**
   * Set a vertex buffer attribute
   * @param parameters - attributes {@link VertexBufferAttributeParams | parameters}
   */
  setAttribute({
    vertexBuffer = this.vertexBuffers[0],
    name,
    type = "vec3f",
    bufferFormat = "float32x3",
    size = 3,
    array = new Float32Array(this.verticesCount * size),
    verticesStride = 1
  }) {
    const attributes = vertexBuffer.attributes;
    const attributesLength = attributes.length;
    if (!name)
      name = "geometryAttribute" + attributesLength;
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
    const attributeCount = array.length / size;
    if (name === "position") {
      this.verticesCount = attributeCount;
    }
    if (vertexBuffer.stepMode === "vertex" && this.verticesCount && this.verticesCount !== attributeCount * verticesStride) {
      throwError(
        `Geometry vertex attribute error. Attribute array of size ${size} must be of length: ${this.verticesCount * size}, current given: ${array.length}. (${this.verticesCount} vertices).`
      );
    } else if (vertexBuffer.stepMode === "instance" && attributeCount !== this.instancesCount) {
      throwError(
        `Geometry instance attribute error. Attribute array of size ${size} must be of length: ${this.instancesCount * size}, current given: ${array.length}. (${this.instancesCount} instances).`
      );
    }
    const attribute = {
      name,
      type,
      bufferFormat,
      size,
      bufferLength: array.length,
      offset: attributesLength ? attributes.reduce((accumulator, currentValue) => {
        return accumulator + currentValue.bufferLength;
      }, 0) : 0,
      bufferOffset: attributesLength ? attributes[attributesLength - 1].bufferOffset + attributes[attributesLength - 1].size * 4 : 0,
      array,
      verticesStride
    };
    vertexBuffer.bufferLength += attribute.bufferLength * verticesStride;
    vertexBuffer.arrayStride += attribute.size;
    vertexBuffer.attributes.push(attribute);
  }
  /**
   * Get an attribute by name
   * @param name - name of the attribute to find
   * @returns - found {@link VertexBufferAttribute | attribute} or null if not found
   */
  getAttributeByName(name) {
    let attribute;
    this.vertexBuffers.forEach((vertexBuffer) => {
      attribute = vertexBuffer.attributes.find((attribute2) => attribute2.name === name);
    });
    return attribute;
  }
  /**
   * Compute a Geometry, which means iterate through all vertex buffers and create the attributes array that will be sent as buffers.
   * Also compute the Geometry bounding box.
   */
  computeGeometry() {
    if (!this.shouldCompute)
      return;
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
      }
      vertexBuffer.array = new Float32Array(vertexBuffer.bufferLength);
      let currentIndex = 0;
      let attributeIndex = 0;
      for (let i = 0; i < vertexBuffer.bufferLength; i += vertexBuffer.arrayStride) {
        for (let j = 0; j < vertexBuffer.attributes.length; j++) {
          const { name, size, array, verticesStride } = vertexBuffer.attributes[j];
          for (let s = 0; s < size; s++) {
            const attributeValue = array[Math.floor(attributeIndex / verticesStride) * size + s];
            vertexBuffer.array[currentIndex] = attributeValue;
            if (name === "position") {
              if (s % 3 === 0) {
                if (this.boundingBox.min.x > attributeValue)
                  this.boundingBox.min.x = attributeValue;
                if (this.boundingBox.max.x < attributeValue)
                  this.boundingBox.max.x = attributeValue;
              } else if (s % 3 === 1) {
                if (this.boundingBox.min.y > attributeValue)
                  this.boundingBox.min.y = attributeValue;
                if (this.boundingBox.max.y < attributeValue)
                  this.boundingBox.max.y = attributeValue;
              } else if (s % 3 === 2) {
                if (this.boundingBox.min.z > attributeValue)
                  this.boundingBox.min.z = attributeValue;
                if (this.boundingBox.max.z < attributeValue)
                  this.boundingBox.max.z = attributeValue;
              }
            }
            currentIndex++;
          }
        }
        attributeIndex++;
      }
    });
    __privateMethod(this, _setWGSLFragment, setWGSLFragment_fn).call(this);
  }
  /** RENDER **/
  /**
   * Set our render pass geometry vertex buffers
   * @param pass - current render pass
   */
  setGeometryBuffers(pass) {
    this.vertexBuffers.forEach((vertexBuffer, index) => {
      pass.setVertexBuffer(index, vertexBuffer.buffer);
    });
  }
  /**
   * Draw our geometry
   * @param pass - current render pass
   */
  drawGeometry(pass) {
    pass.draw(this.verticesCount, this.instancesCount);
  }
  /**
   * Set our vertex buffers then draw the geometry
   * @param pass - current render pass
   */
  render(pass) {
    if (!this.ready)
      return;
    this.setGeometryBuffers(pass);
    this.drawGeometry(pass);
  }
  /**
   * Destroy our geometry vertex buffers
   */
  destroy() {
    this.vertexBuffers.forEach((vertexBuffer) => {
      vertexBuffer.buffer?.destroy();
      vertexBuffer.buffer = null;
    });
  }
}
_setWGSLFragment = new WeakSet();
setWGSLFragment_fn = function() {
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
};

export { Geometry };
