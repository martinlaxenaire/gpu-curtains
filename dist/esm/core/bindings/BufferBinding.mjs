import { Binding } from './Binding.mjs';
import { getBindGroupLayoutBindingType, getBufferLayout, getBindingWGSLVarType } from './utils.mjs';
import { toCamelCase, throwWarning, toKebabCase } from '../../utils/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { BufferElement, bytesPerRow } from './bufferElements/BufferElement.mjs';
import { BufferArrayElement } from './bufferElements/BufferArrayElement.mjs';
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement.mjs';
import { Buffer } from '../buffers/Buffer.mjs';

class BufferBinding extends Binding {
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
    bindings = []
  }) {
    bindingType = bindingType ?? "uniform";
    super({ label, name, bindingType, visibility });
    this.options = {
      ...this.options,
      useStruct,
      access,
      usage,
      struct,
      bindings
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
    this.bindings = bindings;
    if (Object.keys(struct).length || this.bindings.length) {
      this.setBufferAttributes();
      this.setWGSLFragment();
    }
  }
  /**
   * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}
   * @readonly
   */
  get resourceLayout() {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this)
      }
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
   * Get {@link GPUBindGroupEntry#resource | bind group resource}
   * @readonly
   */
  get resource() {
    return { buffer: this.buffer.GPUBuffer };
  }
  /**
   * Clone this {@link BufferBinding} into a new one. Allows to skip buffer layout alignment computations.
   * @param params - params to use for cloning
   */
  clone(params) {
    const { struct, ...defaultParams } = params;
    const bufferBindingCopy = new this.constructor(defaultParams);
    struct && bufferBindingCopy.setBindings(struct);
    bufferBindingCopy.options.struct = struct;
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
    if (this.name === bufferBindingCopy.name && this.label === bufferBindingCopy.label) {
      bufferBindingCopy.wgslStructFragment = this.wgslStructFragment;
      bufferBindingCopy.wgslGroupFragment = this.wgslGroupFragment;
    } else {
      bufferBindingCopy.setWGSLFragment();
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
    this.bindings.forEach((binding) => {
      this.arrayBufferSize += binding.arrayBufferSize;
    });
    this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize);
    this.arrayView = new DataView(this.arrayBuffer, 0, bufferElementsArrayBufferSize);
    this.bindings.forEach((binding, index) => {
      let offset = bufferElementsArrayBufferSize;
      for (let i = 0; i < index; i++) {
        offset += this.bindings[i].arrayBuffer.byteLength;
      }
      const bufferElLastRow = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].alignment.end.row + 1 : 0;
      const bindingLastRow = index > 0 ? this.bindings[index - 1].bufferElements.length ? this.bindings[index - 1].bufferElements[this.bindings[index - 1].bufferElements.length - 1].alignment.end.row + 1 : 0 : 0;
      binding.bufferElements.forEach((bufferElement) => {
        bufferElement.alignment.start.row += bufferElLastRow + bindingLastRow;
        bufferElement.alignment.end.row += bufferElLastRow + bindingLastRow;
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
    if (!this.bufferElements.length && !this.bindings.length)
      return;
    const uniqueBindings = [];
    this.bindings.forEach((binding) => {
      const bindingExists = uniqueBindings.find((b) => b.name === binding.name);
      if (!bindingExists) {
        uniqueBindings.push({
          name: binding.name,
          label: binding.label,
          count: 1,
          wgslStructFragment: binding.wgslStructFragment
        });
      } else {
        bindingExists.count++;
      }
    });
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
      if (uniqueBindings.length) {
        uniqueBindings.forEach((binding) => {
          structs[kebabCaseLabel][binding.name] = binding.count > 1 ? `array<${toKebabCase(binding.label)}>` : toKebabCase(binding.label);
        });
      }
      const additionalBindings = uniqueBindings.length ? uniqueBindings.map((binding) => binding.wgslStructFragment).join("\n\n") + "\n\n" : "";
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
   * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link arrayBuffer} array.
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
    this.bindings.forEach((binding) => {
      binding.update();
      if (binding.shouldUpdate) {
        this.shouldUpdate = true;
      }
    });
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
}

export { BufferBinding };
