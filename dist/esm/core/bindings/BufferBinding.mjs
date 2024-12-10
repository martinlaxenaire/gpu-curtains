import { Binding } from './Binding.mjs';
import { getBindGroupLayoutBindingType, getBufferLayout, getBindingWGSLVarType } from './utils.mjs';
import { throwWarning, toCamelCase, toKebabCase } from '../../utils/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { BufferElement, bytesPerRow } from './bufferElements/BufferElement.mjs';
import { BufferArrayElement } from './bufferElements/BufferArrayElement.mjs';
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement.mjs';
import { Buffer } from '../buffers/Buffer.mjs';

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
  member.set(obj, value);
  return value;
};
var _parent;
const _BufferBinding = class _BufferBinding extends Binding {
  /**
   * BufferBinding constructor
   * @param parameters - {@link BufferBindingParams | parameters} used to create our BufferBindings
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
    childrenBindings = [],
    parent = null,
    minOffset = 256,
    offset = 0
  }) {
    bindingType = bindingType ?? "uniform";
    super({ label, name, bindingType, visibility });
    /** @ignore */
    __privateAdd(this, _parent, void 0);
    this.options = {
      ...this.options,
      useStruct,
      access,
      usage,
      struct,
      childrenBindings,
      parent,
      minOffset,
      offset
    };
    this.cacheKey += `${useStruct},${access},`;
    this.arrayBufferSize = 0;
    this.shouldUpdate = false;
    this.useStruct = useStruct;
    this.bufferElements = [];
    this.inputs = {};
    this.buffer = new Buffer();
    if (Object.keys(struct).length) {
      this.setBindings(struct);
      this.setInputsAlignment();
    }
    this.setChildrenBindings(childrenBindings);
    if (Object.keys(struct).length || this.childrenBindings.length) {
      this.setBufferAttributes();
      this.setWGSLFragment();
    }
    this.parent = parent;
  }
  /**
   * Clone a {@link BufferBindingParams#struct | struct object} width new default values.
   * @param struct - New cloned struct object.
   */
  static cloneStruct(struct) {
    return Object.keys(struct).reduce((acc, bindingKey) => {
      const binding = struct[bindingKey];
      let value;
      if (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value)) {
        value = new binding.value.constructor(binding.value.length);
      } else if (typeof binding.value === "number") {
        value = 0;
      } else {
        value = new binding.value.constructor();
      }
      return {
        ...acc,
        [bindingKey]: {
          type: binding.type,
          value
        }
      };
    }, {});
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
    if (!!value) {
      this.parentView = new DataView(value.arrayBuffer, this.offset, this.getMinOffsetSize(this.arrayBufferSize));
      const getAllBufferElements = (binding) => {
        const getBufferElements = (binding2) => {
          return binding2.bufferElements;
        };
        return [
          ...getBufferElements(binding),
          binding.childrenBindings.map((child) => getAllBufferElements(child)).flat()
        ].flat();
      };
      const bufferElements = getAllBufferElements(this);
      this.parentViewSetBufferEls = bufferElements.map((bufferElement) => {
        switch (bufferElement.bufferLayout.View) {
          case Int32Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setInt32.bind(this.parentView)
            };
          case Uint16Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setUint16.bind(this.parentView)
            };
          case Uint32Array:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setUint32.bind(this.parentView)
            };
          case Float32Array:
          default:
            return {
              bufferElement,
              viewSetFunction: this.parentView.setFloat32.bind(this.parentView)
            };
        }
      });
      if (!this.parent && this.buffer.GPUBuffer) {
        this.buffer.destroy();
      }
    } else {
      this.parentView = null;
      this.parentViewSetBufferEls = null;
    }
    __privateSet(this, _parent, value);
  }
  /**
   * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
   * @param value - Size to round.
   */
  getMinOffsetSize(value) {
    return Math.ceil(value / this.options.minOffset) * this.options.minOffset;
  }
  /**
   * Get this {@link BufferBinding} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
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
   * Get the resource cache key
   * @readonly
   */
  get resourceLayoutCacheKey() {
    return `buffer,${getBindGroupLayoutBindingType(this)},${this.visibility},`;
  }
  /**
   * Get {@link GPUBindGroupEntry#resource | bind group resource}.
   * @readonly
   */
  get resource() {
    return {
      buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
      ...this.parent && { offset: this.offset, size: this.arrayBufferSize }
    };
  }
  /**
   * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
   * @param params - params to use for cloning
   */
  clone(params = {}) {
    let { struct, childrenBindings, parent, ...defaultParams } = params;
    const { label, name, bindingType, visibility, useStruct, access, usage } = this.options;
    defaultParams = { ...{ label, name, bindingType, visibility, useStruct, access, usage }, ...defaultParams };
    const bufferBindingCopy = new this.constructor(defaultParams);
    struct = struct || _BufferBinding.cloneStruct(this.options.struct);
    bufferBindingCopy.options.struct = struct;
    bufferBindingCopy.setBindings(struct);
    bufferBindingCopy.arrayBufferSize = this.arrayBufferSize;
    bufferBindingCopy.arrayBuffer = new ArrayBuffer(bufferBindingCopy.arrayBufferSize);
    bufferBindingCopy.arrayView = new DataView(
      bufferBindingCopy.arrayBuffer,
      0,
      bufferBindingCopy.arrayBuffer.byteLength
    );
    bufferBindingCopy.buffer.size = bufferBindingCopy.arrayBuffer.byteLength;
    this.bufferElements.forEach((bufferElement) => {
      const newBufferElement = new bufferElement.constructor({
        name: bufferElement.name,
        key: bufferElement.key,
        type: bufferElement.type,
        ...bufferElement.arrayLength && {
          arrayLength: bufferElement.arrayLength
        }
      });
      newBufferElement.alignment = JSON.parse(JSON.stringify(bufferElement.alignment));
      if (bufferElement.arrayStride) {
        newBufferElement.arrayStride = bufferElement.arrayStride;
      }
      newBufferElement.setView(bufferBindingCopy.arrayBuffer, bufferBindingCopy.arrayView);
      bufferBindingCopy.bufferElements.push(newBufferElement);
    });
    if (this.options.childrenBindings) {
      bufferBindingCopy.options.childrenBindings = this.options.childrenBindings;
      bufferBindingCopy.options.childrenBindings.forEach((child) => {
        const count = child.count ? Math.max(1, child.count) : 1;
        bufferBindingCopy.cacheKey += `child(count:${count}):${child.binding.cacheKey}`;
      });
      bufferBindingCopy.options.childrenBindings.forEach((child) => {
        bufferBindingCopy.childrenBindings = [
          ...bufferBindingCopy.childrenBindings,
          Array.from(Array(Math.max(1, child.count || 1)).keys()).map((i) => {
            return child.binding.clone({
              ...child.binding.options,
              // clone struct with new arrays
              struct: _BufferBinding.cloneStruct(child.binding.options.struct)
            });
          })
        ].flat();
      });
      bufferBindingCopy.childrenBindings.forEach((binding, index) => {
        let offset = this.arrayView.byteLength;
        for (let i = 0; i < index; i++) {
          offset += this.childrenBindings[i].arrayBuffer.byteLength;
        }
        binding.bufferElements.forEach((bufferElement, i) => {
          bufferElement.alignment.start.row = this.childrenBindings[index].bufferElements[i].alignment.start.row;
          bufferElement.alignment.end.row = this.childrenBindings[index].bufferElements[i].alignment.end.row;
        });
        binding.arrayView = new DataView(bufferBindingCopy.arrayBuffer, offset, binding.arrayBuffer.byteLength);
        for (const bufferElement of binding.bufferElements) {
          bufferElement.setView(bufferBindingCopy.arrayBuffer, binding.arrayView);
        }
      });
    }
    if (this.name === bufferBindingCopy.name && this.label === bufferBindingCopy.label) {
      bufferBindingCopy.wgslStructFragment = this.wgslStructFragment;
      bufferBindingCopy.wgslGroupFragment = this.wgslGroupFragment;
    } else {
      bufferBindingCopy.setWGSLFragment();
    }
    if (parent) {
      bufferBindingCopy.parent = parent;
    }
    bufferBindingCopy.shouldUpdate = bufferBindingCopy.arrayBufferSize > 0;
    return bufferBindingCopy;
  }
  /**
   * Format bindings struct and set our {@link inputs}
   * @param bindings - bindings inputs
   */
  setBindings(bindings) {
    for (const bindingKey of Object.keys(bindings)) {
      const binding = {};
      for (const key in bindings[bindingKey]) {
        if (key !== "value") {
          binding[key] = bindings[bindingKey][key];
        }
      }
      binding.name = bindingKey;
      Object.defineProperty(binding, "value", {
        get() {
          return binding._value;
        },
        set(v) {
          binding._value = v;
          binding.shouldUpdate = true;
        }
      });
      binding.value = bindings[bindingKey].value;
      if (binding.value instanceof Vec2 || binding.value instanceof Vec3) {
        const _onChangeCallback = binding.value._onChangeCallback;
        binding.value._onChangeCallback = () => {
          if (_onChangeCallback) {
            _onChangeCallback();
          }
          binding.shouldUpdate = true;
        };
      }
      this.inputs[bindingKey] = binding;
      this.cacheKey += `${bindingKey},${bindings[bindingKey].type},`;
    }
  }
  /**
   * Set this {@link BufferBinding} optional {@link childrenBindings}.
   * @param childrenBindings - Array of {@link BufferBindingChildrenBinding} to use as {@link childrenBindings}.
   */
  setChildrenBindings(childrenBindings) {
    this.childrenBindings = [];
    if (childrenBindings && childrenBindings.length) {
      const childrenArray = [];
      childrenBindings.sort((a, b) => {
        const countA = a.count ? Math.max(a.count) : a.forceArray ? 1 : 0;
        const countB = b.count ? Math.max(b.count) : b.forceArray ? 1 : 0;
        return countA - countB;
      }).forEach((child) => {
        if (child.count && child.count > 1 || child.forceArray) {
          childrenArray.push(child.binding);
        }
      });
      if (childrenArray.length > 1) {
        childrenArray.shift();
        throwWarning(
          `BufferBinding: "${this.label}" contains multiple children bindings arrays. These children bindings cannot be added to the BufferBinding: "${childrenArray.map((child) => child.label).join(", ")}"`
        );
        childrenArray.forEach((removedChildBinding) => {
          childrenBindings = childrenBindings.filter((child) => child.binding.name !== removedChildBinding.name);
        });
      }
      this.options.childrenBindings = childrenBindings;
      childrenBindings.forEach((child) => {
        const count = child.count ? Math.max(1, child.count) : 1;
        this.cacheKey += `child(count:${count}):${child.binding.cacheKey}`;
        this.childrenBindings = [
          ...this.childrenBindings,
          Array.from(Array(count).keys()).map((i) => {
            return child.binding.clone({
              ...child.binding.options,
              // clone struct with new arrays
              struct: _BufferBinding.cloneStruct(child.binding.options.struct)
            });
          })
        ].flat();
      });
    }
  }
  /**
   * Set the buffer alignments from {@link inputs}.
   */
  setInputsAlignment() {
    let orderedBindings = Object.keys(this.inputs);
    const arrayBindings = orderedBindings.filter((bindingKey) => {
      return this.inputs[bindingKey].type.includes("array");
    });
    if (arrayBindings.length) {
      orderedBindings.sort((bindingKeyA, bindingKeyB) => {
        const isBindingAArray = Math.min(0, this.inputs[bindingKeyA].type.indexOf("array"));
        const isBindingBArray = Math.min(0, this.inputs[bindingKeyB].type.indexOf("array"));
        return isBindingAArray - isBindingBArray;
      });
      if (arrayBindings.length > 1) {
        orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey));
      }
    }
    for (const bindingKey of orderedBindings) {
      const binding = this.inputs[bindingKey];
      const bufferElementOptions = {
        name: toCamelCase(binding.name ?? bindingKey),
        key: bindingKey,
        type: binding.type
      };
      const isArray = binding.type.includes("array") && (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value));
      this.bufferElements.push(
        isArray ? new BufferArrayElement({
          ...bufferElementOptions,
          arrayLength: binding.value.length
        }) : new BufferElement(bufferElementOptions)
      );
    }
    this.bufferElements.forEach((bufferElement, index) => {
      const startOffset = index === 0 ? 0 : this.bufferElements[index - 1].endOffset + 1;
      bufferElement.setAlignment(startOffset);
    });
    if (arrayBindings.length > 1) {
      const arraySizes = arrayBindings.map((bindingKey) => {
        const binding = this.inputs[bindingKey];
        const bufferLayout = getBufferLayout(binding.type.replace("array", "").replace("<", "").replace(">", ""));
        return Math.ceil(binding.value.length / bufferLayout.numElements);
      });
      const equalSize = arraySizes.every((size, i, array) => size === array[0]);
      if (equalSize) {
        const interleavedBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.inputs[bindingKey];
          return new BufferInterleavedArrayElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type,
            arrayLength: binding.value.length
          });
        });
        const tempBufferElements = arrayBindings.map((bindingKey) => {
          const binding = this.inputs[bindingKey];
          return new BufferElement({
            name: toCamelCase(binding.name ?? bindingKey),
            key: bindingKey,
            type: binding.type.replace("array", "").replace("<", "").replace(">", "")
          });
        });
        tempBufferElements.forEach((bufferElement, index) => {
          if (index === 0) {
            if (this.bufferElements.length) {
              bufferElement.setAlignmentFromPosition({
                row: this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1,
                byte: 0
              });
            } else {
              bufferElement.setAlignment(0);
            }
          } else {
            bufferElement.setAlignment(tempBufferElements[index - 1].endOffset + 1);
          }
        });
        const totalStride = tempBufferElements[tempBufferElements.length - 1].endOffset + 1 - tempBufferElements[0].startOffset;
        interleavedBufferElements.forEach((bufferElement, index) => {
          bufferElement.setAlignment(
            tempBufferElements[index].startOffset,
            Math.ceil(totalStride / bytesPerRow) * bytesPerRow
          );
        });
        this.bufferElements = [...this.bufferElements, ...interleavedBufferElements];
      } else {
        throwWarning(
          `BufferBinding: "${this.label}" contains multiple array inputs that should use an interleaved array, but their sizes do not match. These inputs cannot be added to the BufferBinding: "${arrayBindings.join(
            ", "
          )}"`
        );
      }
    }
  }
  /**
   * Set our buffer attributes:
   * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
   */
  setBufferAttributes() {
    const bufferElementsArrayBufferSize = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].paddedByteCount : 0;
    this.arrayBufferSize = bufferElementsArrayBufferSize;
    this.childrenBindings.forEach((binding) => {
      this.arrayBufferSize += binding.arrayBufferSize;
    });
    this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize);
    this.arrayView = new DataView(this.arrayBuffer, 0, bufferElementsArrayBufferSize);
    this.childrenBindings.forEach((binding, index) => {
      let offset = bufferElementsArrayBufferSize;
      for (let i = 0; i < index; i++) {
        offset += this.childrenBindings[i].arrayBuffer.byteLength;
      }
      const bufferElLastRow = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1 : 0;
      const bindingLastRow = index > 0 ? this.childrenBindings[index - 1].bufferElements.length ? this.childrenBindings[index - 1].bufferElements[this.childrenBindings[index - 1].bufferElements.length - 1].alignment.end.row + 1 : 0 : 0;
      binding.bufferElements.forEach((bufferElement) => {
        const rowOffset = index === 0 ? bufferElLastRow + bindingLastRow : bindingLastRow;
        bufferElement.alignment.start.row += rowOffset;
        bufferElement.alignment.end.row += rowOffset;
      });
      binding.arrayView = new DataView(this.arrayBuffer, offset, binding.arrayBuffer.byteLength);
      for (const bufferElement of binding.bufferElements) {
        bufferElement.setView(this.arrayBuffer, binding.arrayView);
      }
    });
    this.buffer.size = this.arrayBuffer.byteLength;
    for (const bufferElement of this.bufferElements) {
      bufferElement.setView(this.arrayBuffer, this.arrayView);
    }
    this.shouldUpdate = this.arrayBufferSize > 0;
  }
  /**
   * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
   */
  setWGSLFragment() {
    if (!this.bufferElements.length && !this.childrenBindings.length)
      return;
    const kebabCaseLabel = toKebabCase(this.label);
    if (this.useStruct) {
      const structs = {};
      structs[kebabCaseLabel] = {};
      const bufferElements = this.bufferElements.filter(
        (bufferElement) => !(bufferElement instanceof BufferInterleavedArrayElement)
      );
      const interleavedBufferElements = this.bufferElements.filter(
        (bufferElement) => bufferElement instanceof BufferInterleavedArrayElement
      );
      if (interleavedBufferElements.length) {
        const arrayLength = this.bindingType === "uniform" ? `, ${interleavedBufferElements[0].numElements}` : "";
        if (bufferElements.length) {
          structs[`${kebabCaseLabel}Element`] = {};
          interleavedBufferElements.forEach((binding) => {
            structs[`${kebabCaseLabel}Element`][binding.name] = binding.type.replace("array", "").replace("<", "").replace(">", "");
          });
          bufferElements.forEach((binding) => {
            structs[kebabCaseLabel][binding.name] = binding.type;
          });
          const interleavedBufferName = this.bufferElements.find((bufferElement) => bufferElement.name === "elements") ? `${this.name}Elements` : "elements";
          structs[kebabCaseLabel][interleavedBufferName] = `array<${kebabCaseLabel}Element${arrayLength}>`;
          const varType = getBindingWGSLVarType(this);
          this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
        } else {
          this.bufferElements.forEach((binding) => {
            structs[kebabCaseLabel][binding.name] = binding.type.replace("array", "").replace("<", "").replace(">", "");
          });
          const varType = getBindingWGSLVarType(this);
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}${arrayLength}>;`];
        }
      } else {
        bufferElements.forEach((binding) => {
          const bindingType = this.bindingType === "uniform" && "numElements" in binding ? `array<${binding.type.replace("array", "").replace("<", "").replace(">", "")}, ${binding.numElements}>` : binding.type;
          structs[kebabCaseLabel][binding.name] = bindingType;
        });
        const varType = getBindingWGSLVarType(this);
        this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
      }
      if (this.childrenBindings.length) {
        this.options.childrenBindings.forEach((child) => {
          structs[kebabCaseLabel][child.binding.name] = child.count && child.count > 1 || child.forceArray ? `array<${toKebabCase(child.binding.label)}>` : toKebabCase(child.binding.label);
        });
      }
      const additionalBindings = this.childrenBindings.length ? this.options.childrenBindings.map((child) => child.binding.wgslStructFragment).join("\n\n") + "\n\n" : "";
      this.wgslStructFragment = additionalBindings + Object.keys(structs).reverse().map((struct) => {
        return `struct ${struct} {
	${Object.keys(structs[struct]).map((binding) => `${binding}: ${structs[struct][binding]}`).join(",\n	")}
};`;
      }).join("\n\n");
    } else {
      this.wgslStructFragment = "";
      this.wgslGroupFragment = this.bufferElements.map((binding) => {
        const varType = getBindingWGSLVarType(this);
        return `${varType} ${binding.name}: ${binding.type};`;
      });
    }
  }
  /**
   * Set a {@link BufferBinding#shouldUpdate | binding shouldUpdate} flag to `true` to update our {@link arrayBuffer} array during next render.
   * @param bindingName - the binding name/key to update
   */
  shouldUpdateBinding(bindingName = "") {
    if (this.inputs[bindingName]) {
      this.inputs[bindingName].shouldUpdate = true;
    }
  }
  /**
   * Executed at the beginning of a Material render call.
   * If any of the {@link inputs} has changed, run its `onBeforeUpdate` callback then updates our {@link arrayBuffer} array.
   * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
   */
  update() {
    const inputs = Object.values(this.inputs);
    for (const binding of inputs) {
      const bufferElement = this.bufferElements.find((bufferEl) => bufferEl.key === binding.name);
      if (binding.shouldUpdate && bufferElement) {
        binding.onBeforeUpdate && binding.onBeforeUpdate();
        bufferElement.update(binding.value);
        this.shouldUpdate = true;
        binding.shouldUpdate = false;
      }
    }
    this.childrenBindings.forEach((binding) => {
      binding.update();
      if (binding.shouldUpdate) {
        this.shouldUpdate = true;
      }
      binding.shouldUpdate = false;
    });
    if (this.shouldUpdate && this.parent && this.parentViewSetBufferEls) {
      let index = 0;
      this.parentViewSetBufferEls.forEach((viewSetBuffer, i) => {
        const { bufferElement, viewSetFunction } = viewSetBuffer;
        bufferElement.view.forEach((value) => {
          viewSetFunction(index * bufferElement.view.BYTES_PER_ELEMENT, value, true);
          index++;
        });
      });
      this.parent.shouldUpdate = true;
      this.shouldUpdate = false;
    }
  }
  /**
   * Extract the data corresponding to a specific {@link BufferElement} from a {@link Float32Array} holding the {@link BufferBinding#buffer | GPU buffer} data of this {@link BufferBinding}
   * @param parameters - parameters used to extract the data
   * @param parameters.result - {@link Float32Array} holding {@link GPUBuffer} data
   * @param parameters.bufferElementName - name of the {@link BufferElement} to use to extract the data
   * @returns - extracted data from the {@link Float32Array}
   */
  extractBufferElementDataFromBufferResult({
    result,
    bufferElementName
  }) {
    const bufferElement = this.bufferElements.find((bufferElement2) => bufferElement2.name === bufferElementName);
    if (bufferElement) {
      return bufferElement.extractDataFromBufferResult(result);
    } else {
      return result;
    }
  }
};
_parent = new WeakMap();
let BufferBinding = _BufferBinding;

export { BufferBinding };
