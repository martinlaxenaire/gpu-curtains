import { BufferBinding } from './BufferBinding.mjs';
import { getBindGroupLayoutBindingType } from './utils.mjs';

var __accessCheck = (obj, member, msg) => {
  if (!member.has(obj))
    throw TypeError("Cannot " + msg);
};
var __privateGet = (obj, member, getter) => {
  __accessCheck(obj, member, "read from private field");
  return getter ? getter.call(obj) : member.get(obj);
};
var __privateAdd = (obj, member, value) => {
  if (member.has(obj))
    throw TypeError("Cannot add the same private member more than once");
  member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
};
var __privateSet = (obj, member, value, setter) => {
  __accessCheck(obj, member, "write to private field");
  setter ? setter.call(obj, value) : member.set(obj, value);
  return value;
};
var _parent;
class BufferBindingOffsetChild extends BufferBinding {
  /**
   * BufferBindingOffsetChild constructor
   * @param parameters - {@link BufferBindingOffsetChildParams | parameters} used to create this {@link BufferBindingOffsetChild}.
   */
  constructor({
    label = "Uniform",
    name = "uniform",
    bindingType,
    visibility,
    useStruct = true,
    access = "read",
    usage = [],
    struct = {},
    bindings = [],
    parent = null,
    minOffset = 256,
    offset = 0
  }) {
    super({ label, name, bindingType, visibility, useStruct, access, usage, struct, bindings });
    /** @ignore */
    __privateAdd(this, _parent, void 0);
    this.options = {
      ...this.options,
      minOffset,
      offset
    };
    this.parent = parent;
  }
  /**
   * Get the {@link BufferBinding} parent if any.
   * @readonly
   * @returns - The {@link BufferBinding} parent if any.
   */
  get parent() {
    return __privateGet(this, _parent);
  }
  /**
   * Set the new {@link BufferBinding} parent.
   * @param value - New {@link BufferBinding} parent to set if any.
   */
  set parent(value) {
    __privateSet(this, _parent, value);
    if (!!value) {
      this.parentView = new DataView(value.arrayBuffer, this.offset, this.getMinOffsetSize(this.arrayBufferSize));
      this.viewSetFunctions = this.bufferElements.map((bufferElement) => {
        switch (bufferElement.bufferLayout.View) {
          case Int32Array:
            return this.parentView.setInt32.bind(this.parentView);
          case Uint16Array:
            return this.parentView.setUint16.bind(this.parentView);
          case Uint32Array:
            return this.parentView.setUint32.bind(this.parentView);
          case Float32Array:
          default:
            return this.parentView.setFloat32.bind(this.parentView);
        }
      });
    } else {
      this.parentView = null;
      this.viewSetFunctions = null;
    }
  }
  /**
   * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
   * @param value - Size to round.
   */
  getMinOffsetSize(value) {
    return Math.ceil(value / this.options.minOffset) * this.options.minOffset;
  }
  /**
   * Get this {@link BufferBindingOffsetChild} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
   * @readonly
   * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
   */
  get offset() {
    return this.getMinOffsetSize(this.options.offset * this.getMinOffsetSize(this.arrayBufferSize));
  }
  /**
   * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}.
   * @readonly
   */
  get resourceLayout() {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this)
      },
      ...this.parent && { offset: this.offset, size: this.arrayBufferSize }
    };
  }
  /**
   * Get {@link GPUBindGroupEntry#resource | bind group resource}
   * @readonly
   */
  get resource() {
    return {
      buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
      ...this.parent && { offset: this.offset, size: this.arrayBufferSize }
    };
  }
  /**
   * Update the {@link BufferBindingOffsetChild} at the beginning of a Material render call.
   *
   * If a {@link parent} is set, then update its {@link arrayBuffer | arrayBuffer} using our {@link viewSetFunctions}.
   */
  update() {
    super.update();
    if (this.shouldUpdate && this.parent && this.viewSetFunctions) {
      let index = 0;
      this.bufferElements.forEach((bufferElement, i) => {
        bufferElement.view.forEach((value) => {
          this.viewSetFunctions[i](index * bufferElement.view.BYTES_PER_ELEMENT, value, true);
          index++;
        });
      });
      this.parent.shouldUpdate = true;
      this.shouldUpdate = false;
    }
  }
}
_parent = new WeakMap();

export { BufferBindingOffsetChild };
