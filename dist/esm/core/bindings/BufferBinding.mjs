import { Binding } from './Binding.mjs';
import { getBindGroupLayoutBindingType, getBufferLayout, getBindingWGSLVarType } from './utils.mjs';
import { toCamelCase, throwWarning, toKebabCase } from '../../utils/utils.mjs';
import { Vec2 } from '../../math/Vec2.mjs';
import { Vec3 } from '../../math/Vec3.mjs';
import { BufferElement } from './bufferElements/BufferElement.mjs';
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
    struct = {}
  }) {
    bindingType = bindingType ?? "uniform";
    super({ label, name, bindingType, visibility });
    this.options = {
      ...this.options,
      useStruct,
      access,
      struct
    };
    this.arrayBufferSize = 0;
    this.shouldUpdate = false;
    this.useStruct = useStruct;
    this.bufferElements = [];
    this.inputs = {};
    this.buffer = new Buffer();
    this.setBindings(struct);
    this.setBufferAttributes();
    this.setWGSLFragment();
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
   * Get {@link GPUBindGroupEntry#resource | bind group resource}
   * @readonly
   */
  get resource() {
    return { buffer: this.buffer.GPUBuffer };
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
        binding.value.onChange(() => binding.shouldUpdate = true);
      }
      this.inputs[bindingKey] = binding;
    }
  }
  /**
   * Set our buffer attributes:
   * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
   */
  setBufferAttributes() {
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
        return binding.value.length / bufferLayout.numElements;
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
          bufferElement.setAlignment(tempBufferElements[index].startOffset, totalStride);
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
    this.arrayBufferSize = this.bufferElements.length ? this.bufferElements[this.bufferElements.length - 1].paddedByteCount : 0;
    this.arrayBuffer = new ArrayBuffer(this.arrayBufferSize);
    this.arrayView = new DataView(this.arrayBuffer, 0, this.arrayBuffer.byteLength);
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
    const kebabCaseLabel = toKebabCase(this.label);
    if (this.useStruct) {
      const bufferElements = this.bufferElements.filter(
        (bufferElement) => !(bufferElement instanceof BufferInterleavedArrayElement)
      );
      const interleavedBufferElements = this.bufferElements.filter(
        (bufferElement) => bufferElement instanceof BufferInterleavedArrayElement
      );
      if (interleavedBufferElements.length) {
        const arrayLength = this.bindingType === "uniform" ? `, ${interleavedBufferElements[0].numElements}` : "";
        if (bufferElements.length) {
          this.wgslStructFragment = `struct ${kebabCaseLabel}Element {
	${interleavedBufferElements.map((binding) => binding.name + ": " + binding.type.replace("array", "").replace("<", "").replace(">", "")).join(",\n	")}
};

`;
          const interleavedBufferStructDeclaration = `${this.name}Element: array<${kebabCaseLabel}Element${arrayLength}>,`;
          this.wgslStructFragment += `struct ${kebabCaseLabel} {
	${bufferElements.map((bufferElement) => bufferElement.name + ": " + bufferElement.type).join(",\n	")}
	${interleavedBufferStructDeclaration}
};`;
          const varType = getBindingWGSLVarType(this);
          this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
        } else {
          this.wgslStructFragment = `struct ${kebabCaseLabel} {
	${this.bufferElements.map((binding) => binding.name + ": " + binding.type.replace("array", "").replace("<", "").replace(">", "")).join(",\n	")}
};`;
          const varType = getBindingWGSLVarType(this);
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}${arrayLength}>;`];
        }
      } else {
        this.wgslStructFragment = `struct ${kebabCaseLabel} {
	${this.bufferElements.map((binding) => {
          const bindingType = this.bindingType === "uniform" && "numElements" in binding ? `array<${binding.type.replace("array", "").replace("<", "").replace(">", "")}, ${binding.numElements}>` : binding.type;
          return binding.name + ": " + bindingType;
        }).join(",\n	")}
};`;
        const varType = getBindingWGSLVarType(this);
        this.wgslGroupFragment = [`${varType} ${this.name}: ${kebabCaseLabel};`];
      }
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
