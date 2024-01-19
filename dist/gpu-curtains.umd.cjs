(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global.GPUCurtains = {}));
})(this, function(exports2) {
  "use strict";var __accessCheck = (obj, member, msg) => {
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
var __privateWrapper = (obj, member, setter, getter) => ({
  set _(value) {
    __privateSet(obj, member, value, setter);
  },
  get _() {
    return __privateGet(obj, member, getter);
  }
});
var __privateMethod = (obj, member, method) => {
  __accessCheck(obj, member, "access private method");
  return method;
};

  var _parentRatio, _sourceRatio, _coverScale, _rotationMatrix, _fov, _near, _far, _pixelRatio, _autoRender, _setWGSLFragment, setWGSLFragment_fn, _autoRender2, _DOMObjectWorldPosition, _DOMObjectWorldScale, _taskCount;
  const generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === "x" ? r : r & 3 | 8;
      return v.toString(16).toUpperCase();
    });
  };
  const toCamelCase = (string) => {
    return string.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, "");
  };
  const toKebabCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  let warningThrown = 0;
  const throwWarning = (warning) => {
    if (warningThrown > 100) {
      return;
    } else if (warningThrown === 100) {
      console.warn("GPUCurtains: too many warnings thrown, stop logging.");
    } else {
      console.warn(warning);
    }
    warningThrown++;
  };
  const throwError = (error) => {
    throw new Error(error);
  };
  const formatRendererError = (renderer, rendererType = "GPURenderer", type) => {
    const error = type ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}` : `The ${rendererType} is not defined: ${renderer}`;
    throwError(error);
  };
  const isRenderer = (renderer, type) => {
    const isRenderer2 = renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isRenderer2) {
      formatRendererError(renderer, "GPURenderer", type);
    }
    return isRenderer2;
  };
  const isCameraRenderer = (renderer, type) => {
    const isCameraRenderer2 = renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isCameraRenderer2) {
      formatRendererError(renderer, "GPUCameraRenderer", type);
    }
    return isCameraRenderer2;
  };
  const isCurtainsRenderer = (renderer, type) => {
    const isCurtainsRenderer2 = renderer && renderer.type === "GPUCurtainsRenderer";
    if (!isCurtainsRenderer2) {
      formatRendererError(renderer, "GPUCurtainsRenderer", type);
    }
    return isCurtainsRenderer2;
  };
  const generateMips = /* @__PURE__ */ (() => {
    let sampler;
    let module2;
    const pipelineByFormat = {};
    return function generateMips2(device, texture) {
      if (!module2) {
        module2 = device.createShaderModule({
          label: "textured quad shaders for mip level generation",
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              var pos = array<vec2f, 6>(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
              );

              var vsOutput: VSOutput;
              let xy = pos[vertexIndex];
              vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
              vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
              return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
              return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
          `
        });
        sampler = device.createSampler({
          minFilter: "linear"
        });
      }
      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: "mip level generator pipeline",
          layout: "auto",
          vertex: {
            module: module2,
            entryPoint: "vs"
          },
          fragment: {
            module: module2,
            entryPoint: "fs",
            targets: [{ format: texture.format }]
          }
        });
      }
      const pipeline = pipelineByFormat[texture.format];
      const encoder = device.createCommandEncoder({
        label: "mip gen encoder"
      });
      let width = texture.width;
      let height = texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);
        const bindGroup = device.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            {
              binding: 1,
              resource: texture.createView({
                baseMipLevel,
                mipLevelCount: 1
              })
            }
          ]
        });
        ++baseMipLevel;
        const renderPassDescriptor = {
          label: "our basic canvas renderPass",
          colorAttachments: [
            {
              view: texture.createView({ baseMipLevel, mipLevelCount: 1 }),
              loadOp: "clear",
              storeOp: "store"
            }
          ]
        };
        const pass = encoder.beginRenderPass(renderPassDescriptor);
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.draw(6);
        pass.end();
      }
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();
  class Binding {
    /**
     * Binding constructor
     * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}
     */
    constructor({ label = "Uniform", name = "uniform", bindingType = "uniform", visibility }) {
      this.label = label;
      this.name = toCamelCase(name);
      this.bindingType = bindingType;
      this.visibility = visibility ? (() => {
        switch (visibility) {
          case "vertex":
            return GPUShaderStage.VERTEX;
          case "fragment":
            return GPUShaderStage.FRAGMENT;
          case "compute":
            return GPUShaderStage.COMPUTE;
          default:
            return GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        }
      })() : GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
      this.options = {
        label,
        name,
        bindingType,
        visibility
      };
      this.shouldResetBindGroup = false;
      this.shouldResetBindGroupLayout = false;
    }
  }
  const getBufferLayout = (bufferType) => {
    const bufferLayouts = {
      i32: { numElements: 1, align: 4, size: 4, type: "i32", View: Int32Array },
      u32: { numElements: 1, align: 4, size: 4, type: "u32", View: Uint32Array },
      f32: { numElements: 1, align: 4, size: 4, type: "f32", View: Float32Array },
      f16: { numElements: 1, align: 2, size: 2, type: "u16", View: Uint16Array },
      vec2f: { numElements: 2, align: 8, size: 8, type: "f32", View: Float32Array },
      vec2i: { numElements: 2, align: 8, size: 8, type: "i32", View: Int32Array },
      vec2u: { numElements: 2, align: 8, size: 8, type: "u32", View: Uint32Array },
      vec2h: { numElements: 2, align: 4, size: 4, type: "u16", View: Uint16Array },
      vec3i: { numElements: 3, align: 16, size: 12, type: "i32", View: Int32Array },
      vec3u: { numElements: 3, align: 16, size: 12, type: "u32", View: Uint32Array },
      vec3f: { numElements: 3, align: 16, size: 12, type: "f32", View: Float32Array },
      vec3h: { numElements: 3, align: 8, size: 6, type: "u16", View: Uint16Array },
      vec4i: { numElements: 4, align: 16, size: 16, type: "i32", View: Int32Array },
      vec4u: { numElements: 4, align: 16, size: 16, type: "u32", View: Uint32Array },
      vec4f: { numElements: 4, align: 16, size: 16, type: "f32", View: Float32Array },
      vec4h: { numElements: 4, align: 8, size: 8, type: "u16", View: Uint16Array },
      // AlignOf(vecR)	SizeOf(array<vecR, C>)
      mat2x2f: { numElements: 4, align: 8, size: 16, type: "f32", View: Float32Array },
      mat2x2h: { numElements: 4, align: 4, size: 8, type: "u16", View: Uint16Array },
      mat3x2f: { numElements: 6, align: 8, size: 24, type: "f32", View: Float32Array },
      mat3x2h: { numElements: 6, align: 4, size: 12, type: "u16", View: Uint16Array },
      mat4x2f: { numElements: 8, align: 8, size: 32, type: "f32", View: Float32Array },
      mat4x2h: { numElements: 8, align: 4, size: 16, type: "u16", View: Uint16Array },
      mat2x3f: { numElements: 8, align: 16, size: 32, pad: [3, 1], type: "f32", View: Float32Array },
      mat2x3h: { numElements: 8, align: 8, size: 16, pad: [3, 1], type: "u16", View: Uint16Array },
      mat3x3f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: "f32", View: Float32Array },
      mat3x3h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: "u16", View: Uint16Array },
      mat4x3f: { numElements: 16, align: 16, size: 64, pad: [3, 1], type: "f32", View: Float32Array },
      mat4x3h: { numElements: 16, align: 8, size: 32, pad: [3, 1], type: "u16", View: Uint16Array },
      mat2x4f: { numElements: 8, align: 16, size: 32, type: "f32", View: Float32Array },
      mat2x4h: { numElements: 8, align: 8, size: 16, type: "u16", View: Uint16Array },
      mat3x4f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: "f32", View: Float32Array },
      mat3x4h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: "u16", View: Uint16Array },
      mat4x4f: { numElements: 16, align: 16, size: 64, type: "f32", View: Float32Array },
      mat4x4h: { numElements: 16, align: 8, size: 32, type: "u16", View: Uint16Array }
    };
    return bufferLayouts[bufferType];
  };
  const getBindingWGSLVarType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "storage":
          return `var<${binding.bindingType}, ${binding.options.access}>`;
        case "uniform":
        default:
          return "var<uniform>";
      }
    })();
  };
  const getTextureBindingWGSLVarType = (binding) => {
    if (binding.bindingType === "externalTexture") {
      return `var ${binding.name}: texture_external;`;
    }
    return binding.bindingType === "storageTexture" ? `var ${binding.name}: texture_storage_${binding.options.viewDimension}<${binding.options.format}, ${binding.options.access}>;` : binding.bindingType === "depthTexture" ? `var ${binding.name}: texture_depth${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension};` : `var ${binding.name}: texture${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension}<f32>;`;
  };
  const getBindGroupLayoutBindingType = (binding) => {
    if (binding.bindingType === "storage" && binding.options.access === "read_write") {
      return "storage";
    } else if (binding.bindingType === "storage") {
      return "read-only-storage";
    } else {
      return "uniform";
    }
  };
  const getBindGroupLayoutTextureBindingType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "externalTexture":
          return { externalTexture: {} };
        case "storageTexture":
          return {
            storageTexture: {
              format: binding.options.format,
              viewDimension: binding.options.viewDimension
            }
          };
        case "texture":
          return {
            texture: {
              multisampled: binding.options.multisampled,
              viewDimension: binding.options.viewDimension
            }
          };
        case "depthTexture":
          return {
            texture: {
              multisampled: binding.options.multisampled,
              format: binding.options.format,
              viewDimension: binding.options.viewDimension,
              sampleType: "depth"
            }
          };
        default:
          return null;
      }
    })();
  };
  class Vec2 {
    /**
     * Vec2 constructor
     * @param x - X component of our {@link Vec2}
     * @param y - Y component of our {@link Vec2}
     */
    constructor(x = 0, y = x) {
      this.type = "Vec2";
      this._x = x;
      this._y = y;
    }
    /**
     * Get the X component of the {@link Vec2}
     */
    get x() {
      return this._x;
    }
    /**
     * Set the X component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Y component of the {@link Vec2}
     */
    get y() {
      return this._y;
    }
    /**
     * Set the Y component of the {@link Vec2}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the {@link Vec2} has changed
     * @param callback - callback to run when at least one component of the {@link Vec2} has changed
     * @returns - our {@link Vec2}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the {@link Vec2} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @returns - this {@link Vec2} after being set
     */
    set(x = 0, y = x) {
      this.x = x;
      this.y = y;
      return this;
    }
    /**
     * Add a {@link Vec2} to this {@link Vec2}
     * @param vector - {@link Vec2} to add
     * @returns - this {@link Vec2} after addition
     */
    add(vector = new Vec2()) {
      this.x += vector.x;
      this.y += vector.y;
      return this;
    }
    /**
     * Add a scalar to all the components of this {@link Vec2}
     * @param value - number to add
     * @returns - this {@link Vec2} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      return this;
    }
    /**
     * Subtract a {@link Vec2} from this {@link Vec2}
     * @param vector - {@link Vec2} to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    sub(vector = new Vec2()) {
      this.x -= vector.x;
      this.y -= vector.y;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this {@link Vec2}
     * @param value - number to subtract
     * @returns - this {@link Vec2} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      return this;
    }
    /**
     * Multiply a {@link Vec2} with this {@link Vec2}
     * @param vector - {@link Vec2} to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiply(vector = new Vec2(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      return this;
    }
    /**
     * Multiply all components of this {@link Vec2} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec2} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      return this;
    }
    /**
     * Copy a {@link Vec2} into this {@link Vec2}
     * @param vector - {@link Vec2} to copy
     * @returns - this {@link Vec2} after copy
     */
    copy(vector = new Vec2()) {
      this.x = vector.x;
      this.y = vector.y;
      return this;
    }
    /**
     * Clone this {@link Vec2}
     * @returns - cloned {@link Vec2}
     */
    clone() {
      return new Vec2(this.x, this.y);
    }
    /**
     * Apply max values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing max values
     * @returns - {@link Vec2} with max values applied
     */
    max(vector = new Vec2()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      return this;
    }
    /**
     * Apply min values to this {@link Vec2} components
     * @param vector - {@link Vec2} representing min values
     * @returns - {@link Vec2} with min values applied
     */
    min(vector = new Vec2()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      return this;
    }
    /**
     * Clamp this {@link Vec2} components by min and max {@link Vec2} vectors
     * @param min - minimum {@link Vec2} components to compare with
     * @param max - maximum {@link Vec2} components to compare with
     * @returns - clamped {@link Vec2}
     */
    clamp(min = new Vec2(), max = new Vec2()) {
      this.x = Math.max(min.x, Math.min(max.x, this.x));
      this.y = Math.max(min.y, Math.min(max.y, this.y));
      return this;
    }
    /**
     * Check if 2 {@link Vec2} are equal
     * @param vector - {@link Vec2} to compare
     * @returns - whether the {@link Vec2} are equals or not
     */
    equals(vector = new Vec2()) {
      return this.x === vector.x && this.y === vector.y;
    }
    /**
     * Get the square length of this {@link Vec2}
     * @returns - square length of this {@link Vec2}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    /**
     * Get the length of this {@link Vec2}
     * @returns - length of this {@link Vec2}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this {@link Vec2}
     * @returns - normalized {@link Vec2}
     */
    normalize() {
      let len = this.x * this.x + this.y * this.y;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      return this;
    }
    /**
     * Calculate the dot product of 2 {@link Vec2}
     * @param vector - {@link Vec2} to use for dot product
     * @returns - dot product of the 2 {@link Vec2}
     */
    dot(vector = new Vec2()) {
      return this.x * vector.x + this.y * vector.y;
    }
    /**
     * Calculate the linear interpolation of this {@link Vec2} by given {@link Vec2} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec2} to interpolate towards
     * @param [alpha=1] - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec2} after linear interpolation
     */
    lerp(vector = new Vec2(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      return this;
    }
  }
  class Quat {
    /**
     * Quat constructor
     * @param [elements] - initial array to use
     * @param [axisOrder='XYZ'] - axis order to use
     */
    constructor(elements = new Float32Array([0, 0, 0, 1]), axisOrder = "XYZ") {
      this.type = "Quat";
      this.elements = elements;
      this.axisOrder = axisOrder;
    }
    /**
     * Sets the {@link Quat} values from an array
     * @param array - an array of at least 4 elements
     * @returns - this {@link Quat} after being set
     */
    setFromArray(array = new Float32Array([0, 0, 0, 1])) {
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      return this;
    }
    /**
     * Sets the {@link Quat} axis order
     * @param axisOrder - axis order to use
     * @returns - this {@link Quat} after axis order has been set
     */
    setAxisOrder(axisOrder = "XYZ") {
      axisOrder = axisOrder.toUpperCase();
      switch (axisOrder) {
        case "XYZ":
        case "YXZ":
        case "ZXY":
        case "ZYX":
        case "YZX":
        case "XZY":
          this.axisOrder = axisOrder;
          break;
        default:
          this.axisOrder = "XYZ";
      }
      return this;
    }
    /**
     * Copy a {@link Quat} into this {@link Quat}
     * @param quaternion - {@link Quat} to copy
     * @returns - this {@link Quat} after copy
     */
    copy(quaternion = new Quat()) {
      this.elements = quaternion.elements;
      this.axisOrder = quaternion.axisOrder;
      return this;
    }
    /**
     * Clone a {@link Quat}
     * @returns - cloned {@link Quat}
     */
    clone() {
      return new Quat().copy(this);
    }
    /**
     * Check if 2 {@link Quat} are equal
     * @param quaternion - {@link Quat} to check against
     * @returns - whether the {@link Quat} are equal or not
     */
    equals(quaternion = new Quat()) {
      return this.elements[0] === quaternion.elements[0] && this.elements[1] === quaternion.elements[1] && this.elements[2] === quaternion.elements[2] && this.elements[3] === quaternion.elements[3] && this.axisOrder === quaternion.axisOrder;
    }
    /**
     * Sets a rotation {@link Quat} using Euler angles {@link Vec3 | vector} and its axis order
     * @param vector - rotation {@link Vec3 | vector} to set our {@link Quat} from
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromVec3(vector = new Vec3()) {
      const ax = vector.x * 0.5;
      const ay = vector.y * 0.5;
      const az = vector.z * 0.5;
      const cosx = Math.cos(ax);
      const cosy = Math.cos(ay);
      const cosz = Math.cos(az);
      const sinx = Math.sin(ax);
      const siny = Math.sin(ay);
      const sinz = Math.sin(az);
      if (this.axisOrder === "XYZ") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "YXZ") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      } else if (this.axisOrder === "ZXY") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "ZYX") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      } else if (this.axisOrder === "YZX") {
        this.elements[0] = sinx * cosy * cosz + cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz + sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz - sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz - sinx * siny * sinz;
      } else if (this.axisOrder === "XZY") {
        this.elements[0] = sinx * cosy * cosz - cosx * siny * sinz;
        this.elements[1] = cosx * siny * cosz - sinx * cosy * sinz;
        this.elements[2] = cosx * cosy * sinz + sinx * siny * cosz;
        this.elements[3] = cosx * cosy * cosz + sinx * siny * sinz;
      }
      return this;
    }
    /**
     * Set a {@link Quat} from a rotation axis {@link Vec3 | vector} and an angle
     * @param axis - normalized {@link Vec3 | vector} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromAxisAngle(axis = new Vec3(), angle = 0) {
      const halfAngle = angle / 2, s = Math.sin(halfAngle);
      this.elements[0] = axis.x * s;
      this.elements[1] = axis.y * s;
      this.elements[2] = axis.z * s;
      this.elements[3] = Math.cos(halfAngle);
      return this;
    }
    /**
     * Set a {@link Quat} from a rotation {@link Mat4 | matrix}
     * @param matrix - rotation {@link Mat4 | matrix} to use
     * @returns - {@link Quat} after having applied the rotation
     */
    setFromRotationMatrix(matrix) {
      const te = matrix.elements, m11 = te[0], m12 = te[4], m13 = te[8], m21 = te[1], m22 = te[5], m23 = te[9], m31 = te[2], m32 = te[6], m33 = te[10], trace = m11 + m22 + m33;
      if (trace > 0) {
        const s = 0.5 / Math.sqrt(trace + 1);
        this.elements[3] = 0.25 / s;
        this.elements[0] = (m32 - m23) * s;
        this.elements[1] = (m13 - m31) * s;
        this.elements[2] = (m21 - m12) * s;
      } else if (m11 > m22 && m11 > m33) {
        const s = 2 * Math.sqrt(1 + m11 - m22 - m33);
        this.elements[3] = (m32 - m23) / s;
        this.elements[0] = 0.25 * s;
        this.elements[1] = (m12 + m21) / s;
        this.elements[2] = (m13 + m31) / s;
      } else if (m22 > m33) {
        const s = 2 * Math.sqrt(1 + m22 - m11 - m33);
        this.elements[3] = (m13 - m31) / s;
        this.elements[0] = (m12 + m21) / s;
        this.elements[1] = 0.25 * s;
        this.elements[2] = (m23 + m32) / s;
      } else {
        const s = 2 * Math.sqrt(1 + m33 - m11 - m22);
        this.elements[3] = (m21 - m12) / s;
        this.elements[0] = (m13 + m31) / s;
        this.elements[1] = (m23 + m32) / s;
        this.elements[2] = 0.25 * s;
      }
      return this;
    }
  }
  class Mat4 {
    // prettier-ignore
    /**
     * Mat4 constructor
     * @param elements - initial array to use, default to identity matrix
     */
    constructor(elements = new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ])) {
      this.type = "Mat4";
      this.elements = elements;
    }
    /***
     * Sets the matrix from 16 numbers
     *
     * @param n11 number
     * @param n12 number
     * @param n13 number
     * @param n14 number
     * @param n21 number
     * @param n22 number
     * @param n23 number
     * @param n24 number
     * @param n31 number
     * @param n32 number
     * @param n33 number
     * @param n34 number
     * @param n41 number
     * @param n42 number
     * @param n43 number
     * @param n44 number
     *
     * @returns - this {@link Mat4} after being set
     */
    set(n11, n12, n13, n14, n21, n22, n23, n24, n31, n32, n33, n34, n41, n42, n43, n44) {
      const te = this.elements;
      te[0] = n11;
      te[1] = n12;
      te[2] = n13;
      te[3] = n14;
      te[4] = n21;
      te[5] = n22;
      te[6] = n23;
      te[7] = n24;
      te[8] = n31;
      te[9] = n32;
      te[10] = n33;
      te[11] = n34;
      te[12] = n41;
      te[13] = n42;
      te[14] = n43;
      te[15] = n44;
      return this;
    }
    /**
     * Sets the {@link Mat4} to an identity matrix
     * @returns - this {@link Mat4} after being set
     */
    identity() {
      this.set(
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1,
        0,
        0,
        0,
        0,
        1
      );
      return this;
    }
    /**
     * Sets the {@link Mat4} values from an array
     * @param array - array to use
     * @returns - this {@link Mat4} after being set
     */
    // prettier-ignore
    setFromArray(array = new Float32Array([
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      1
    ])) {
      for (let i = 0; i < this.elements.length; i++) {
        this.elements[i] = array[i];
      }
      return this;
    }
    /**
     * Copy another {@link Mat4}
     * @param matrix
     * @returns - this {@link Mat4} after being set
     */
    copy(matrix = new Mat4()) {
      const array = matrix.elements;
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      this.elements[4] = array[4];
      this.elements[5] = array[5];
      this.elements[6] = array[6];
      this.elements[7] = array[7];
      this.elements[8] = array[8];
      this.elements[9] = array[9];
      this.elements[10] = array[10];
      this.elements[11] = array[11];
      this.elements[12] = array[12];
      this.elements[13] = array[13];
      this.elements[14] = array[14];
      this.elements[15] = array[15];
      return this;
    }
    /**
     * Clone a {@link Mat4}
     * @returns - cloned {@link Mat4}
     */
    clone() {
      return new Mat4().copy(this);
    }
    /**
     * Multiply this {@link Mat4} with another {@link Mat4}
     * @param matrix - {@link Mat4} to multiply with
     * @returns - this {@link Mat4} after multiplication
     */
    multiply(matrix = new Mat4()) {
      return this.multiplyMatrices(this, matrix);
    }
    /**
     * Multiply another {@link Mat4} with this {@link Mat4}
     * @param matrix - {@link Mat4} to multiply with
     * @returns - this {@link Mat4} after multiplication
     */
    premultiply(matrix = new Mat4()) {
      return this.multiplyMatrices(matrix, this);
    }
    /**
     * Multiply two {@link Mat4}
     * @param a - first {@link Mat4}
     * @param b - second {@link Mat4}
     * @returns - {@link Mat4} resulting from the multiplication
     */
    multiplyMatrices(a = new Mat4(), b = new Mat4()) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[4], a13 = ae[8], a14 = ae[12];
      const a21 = ae[1], a22 = ae[5], a23 = ae[9], a24 = ae[13];
      const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
      const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
      te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
      te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
      te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
      te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
      te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
      te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
      te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
      te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
      te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
      te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
      te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
      te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
      te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector))
     * @param vector - translation {@link Vec3 | vector} to use
     * @returns - this {@link Mat4} after the premultiply translate operation
     */
    premultiplyTranslate(vector = new Vec3()) {
      const a11 = 1;
      const a22 = 1;
      const a33 = 1;
      const a44 = 1;
      const a14 = vector.x;
      const a24 = vector.y;
      const a34 = vector.z;
      const be = this.elements;
      const te = this.elements;
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11 + a14 * b41;
      te[4] = a11 * b12 + a14 * b42;
      te[8] = a11 * b13 + a14 * b43;
      te[12] = a11 * b14 + a14 * b44;
      te[1] = a22 * b21 + a24 * b41;
      te[5] = a22 * b22 + a24 * b42;
      te[9] = a22 * b23 + a24 * b43;
      te[13] = a22 * b24 + a24 * b44;
      te[2] = a33 * b31 + a34 * b41;
      te[6] = a33 * b32 + a34 * b42;
      te[10] = a33 * b33 + a34 * b43;
      te[14] = a33 * b34 + a34 * b44;
      te[3] = a44 * b41;
      te[7] = a44 * b42;
      te[11] = a44 * b43;
      te[15] = a44 * b44;
      return this;
    }
    /**
     * {@link premultiply} this {@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector))
     * @param vector - scale {@link Vec3 | vector} to use
     * @returns - this {@link Mat4} after the premultiply scale operation
     */
    premultiplyScale(vector = new Vec3()) {
      const be = this.elements;
      const te = this.elements;
      const a11 = vector.x;
      const a22 = vector.y;
      const a33 = vector.z;
      const a44 = 1;
      const b11 = be[0], b12 = be[4], b13 = be[8], b14 = be[12];
      const b21 = be[1], b22 = be[5], b23 = be[9], b24 = be[13];
      const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
      const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];
      te[0] = a11 * b11;
      te[4] = a11 * b12;
      te[8] = a11 * b13;
      te[12] = a11 * b14;
      te[1] = a22 * b21;
      te[5] = a22 * b22;
      te[9] = a22 * b23;
      te[13] = a22 * b24;
      te[2] = a33 * b31;
      te[6] = a33 * b32;
      te[10] = a33 * b33;
      te[14] = a33 * b34;
      te[3] = a44 * b41;
      te[7] = a44 * b42;
      te[11] = a44 * b43;
      te[15] = a44 * b44;
      return this;
    }
    /**
     * Get the {@link Mat4} inverse
     * @returns - the {@link Mat4} inverted
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n41 = te[3], n12 = te[4], n22 = te[5], n32 = te[6], n42 = te[7], n13 = te[8], n23 = te[9], n33 = te[10], n43 = te[11], n14 = te[12], n24 = te[13], n34 = te[14], n44 = te[15], t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44, t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44, t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44, t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;
      const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;
      if (det === 0)
        return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44) * detInv;
      te[2] = (n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44) * detInv;
      te[3] = (n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43) * detInv;
      te[4] = t12 * detInv;
      te[5] = (n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44) * detInv;
      te[6] = (n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44) * detInv;
      te[7] = (n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43) * detInv;
      te[8] = t13 * detInv;
      te[9] = (n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44) * detInv;
      te[10] = (n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44) * detInv;
      te[11] = (n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43) * detInv;
      te[12] = t14 * detInv;
      te[13] = (n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34) * detInv;
      te[14] = (n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34) * detInv;
      te[15] = (n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33) * detInv;
      return this;
    }
    /**
     * Clone and invert the {@link Mat4}
     * @returns - inverted cloned {@link Mat4}
     */
    getInverse() {
      return this.clone().invert();
    }
    /**
     * Translate a {@link Mat4}
     * @param vector - translation {@link Vec3 | vector} to use
     * @returns - translated {@link Mat4}
     */
    translate(vector = new Vec3()) {
      const a = this.elements;
      a[12] = a[0] * vector.x + a[4] * vector.y + a[8] * vector.z + a[12];
      a[13] = a[1] * vector.x + a[5] * vector.y + a[9] * vector.z + a[13];
      a[14] = a[2] * vector.x + a[6] * vector.y + a[10] * vector.z + a[14];
      a[15] = a[3] * vector.x + a[7] * vector.y + a[11] * vector.z + a[15];
      return this;
    }
    /**
     * Scale a {@link Mat4}
     * @param vector - scale {@link Vec3 | vector} to use
     * @returns - scaled {@link Mat4}
     */
    scale(vector = new Vec3()) {
      const a = this.elements;
      a[0] *= vector.x;
      a[1] *= vector.x;
      a[2] *= vector.x;
      a[3] *= vector.x;
      a[4] *= vector.y;
      a[5] *= vector.y;
      a[6] *= vector.y;
      a[7] *= vector.y;
      a[8] *= vector.z;
      a[9] *= vector.z;
      a[10] *= vector.z;
      a[11] *= vector.z;
      return this;
    }
    /**
     * Rotate a {@link Mat4} from a {@link Quat | quaternion}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - rotated {@link Mat4}
     */
    rotateFromQuaternion(quaternion = new Quat()) {
      const te = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      te[0] = 1 - (yy + zz);
      te[4] = xy - wz;
      te[8] = xz + wy;
      te[1] = xy + wz;
      te[5] = 1 - (xx + zz);
      te[9] = yz - wx;
      te[2] = xz - wy;
      te[6] = yz + wx;
      te[10] = 1 - (xx + yy);
      return this;
    }
    /**
     * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}
     * @param eye - {@link Vec3 | position vector} of the object that should be rotated
     * @param target - {@link Vec3 | target vector} to look at
     * @param up - up {@link Vec3 | vector}
     * @returns - rotated {@link Mat4}
     */
    lookAt(eye = new Vec3(), target = new Vec3(), up = new Vec3(0, 1, 0)) {
      const te = this.elements;
      const _z = eye.clone().sub(target);
      if (_z.lengthSq() === 0) {
        _z.z = 1;
      }
      _z.normalize();
      const _x = new Vec3().crossVectors(up, _z);
      if (_x.lengthSq() === 0) {
        if (Math.abs(up.z) === 1) {
          _z.x += 1e-4;
        } else {
          _z.z += 1e-4;
        }
        _z.normalize();
        _x.crossVectors(up, _z);
      }
      _x.normalize();
      const _y = new Vec3().crossVectors(_z, _x);
      te[0] = _x.x;
      te[4] = _y.x;
      te[8] = _z.x;
      te[1] = _x.y;
      te[5] = _y.y;
      te[9] = _z.y;
      te[2] = _x.z;
      te[6] = _y.z;
      te[10] = _z.z;
      return this;
    }
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation {@link Vec3 | vector} to use
     * @param quaternion - {@link Quat | quaternion} to use
     * @param scale - translation {@link Vec3 | vector} to use
     * @returns - transformed {@link Mat4}
     */
    compose(translation = new Vec3(), quaternion = new Quat(), scale = new Vec3(1)) {
      const matrix = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;
      const sx = scale.x;
      const sy = scale.y;
      const sz = scale.z;
      matrix[0] = (1 - (yy + zz)) * sx;
      matrix[1] = (xy + wz) * sx;
      matrix[2] = (xz - wy) * sx;
      matrix[3] = 0;
      matrix[4] = (xy - wz) * sy;
      matrix[5] = (1 - (xx + zz)) * sy;
      matrix[6] = (yz + wx) * sy;
      matrix[7] = 0;
      matrix[8] = (xz + wy) * sz;
      matrix[9] = (yz - wx) * sz;
      matrix[10] = (1 - (xx + yy)) * sz;
      matrix[11] = 0;
      matrix[12] = translation.x;
      matrix[13] = translation.y;
      matrix[14] = translation.z;
      matrix[15] = 1;
      return this;
    }
    /**
     * Creates a {@link Mat4} from a {@link Quat | quaternion} rotation, {@link Vec3 | vector} translation and {@link Vec3 | vector} scale, rotating and scaling around the given {@link Vec3 | origin vector}
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation {@link Vec3 | vector} to use
     * @param quaternion - {@link Quat | quaternion} to use
     * @param scale - translation {@link Vec3 | vector} to use
     * @param origin - origin {@link Vec3 | vector} around which to scale and rotate
     * @returns - transformed {@link Mat4}
     */
    composeFromOrigin(translation = new Vec3(), quaternion = new Quat(), scale = new Vec3(1), origin = new Vec3()) {
      const matrix = this.elements;
      const x = quaternion.elements[0], y = quaternion.elements[1], z = quaternion.elements[2], w = quaternion.elements[3];
      const x2 = x + x;
      const y2 = y + y;
      const z2 = z + z;
      const xx = x * x2;
      const xy = x * y2;
      const xz = x * z2;
      const yy = y * y2;
      const yz = y * z2;
      const zz = z * z2;
      const wx = w * x2;
      const wy = w * y2;
      const wz = w * z2;
      const sx = scale.x;
      const sy = scale.y;
      const sz = scale.z;
      const ox = origin.x;
      const oy = origin.y;
      const oz = origin.z;
      const out0 = (1 - (yy + zz)) * sx;
      const out1 = (xy + wz) * sx;
      const out2 = (xz - wy) * sx;
      const out4 = (xy - wz) * sy;
      const out5 = (1 - (xx + zz)) * sy;
      const out6 = (yz + wx) * sy;
      const out8 = (xz + wy) * sz;
      const out9 = (yz - wx) * sz;
      const out10 = (1 - (xx + yy)) * sz;
      matrix[0] = out0;
      matrix[1] = out1;
      matrix[2] = out2;
      matrix[3] = 0;
      matrix[4] = out4;
      matrix[5] = out5;
      matrix[6] = out6;
      matrix[7] = 0;
      matrix[8] = out8;
      matrix[9] = out9;
      matrix[10] = out10;
      matrix[11] = 0;
      matrix[12] = translation.x + ox - (out0 * ox + out4 * oy + out8 * oz);
      matrix[13] = translation.y + oy - (out1 * ox + out5 * oy + out9 * oz);
      matrix[14] = translation.z + oz - (out2 * ox + out6 * oy + out10 * oz);
      matrix[15] = 1;
      return this;
    }
  }
  class Vec3 {
    /**
     * Vec3 constructor
     * @param x - X component of our {@link Vec3}
     * @param y - Y component of our {@link Vec3}
     * @param z - Z component of our {@link Vec3}
     */
    constructor(x = 0, y = x, z = x) {
      this.type = "Vec3";
      this._x = x;
      this._y = y;
      this._z = z;
    }
    /**
     * Get the X component of the {@link Vec3}
     */
    get x() {
      return this._x;
    }
    /**
     * Set the X component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - X component to set
     */
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Y component of the {@link Vec3}
     */
    get y() {
      return this._y;
    }
    /**
     * Set the Y component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Y component to set
     */
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get the Z component of the {@link Vec3}
     */
    get z() {
      return this._z;
    }
    /**
     * Set the Z component of the {@link Vec3}
     * Can trigger {@link onChange} callback
     * @param value - Z component to set
     */
    set z(value) {
      const changed = value !== this._z;
      this._z = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the {@link Vec3} has changed
     * @param callback - callback to run when at least one component of the {@link Vec3} has changed
     * @returns - our {@link Vec3}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the {@link Vec3} from values
     * @param x - new X component to set
     * @param y - new Y component to set
     * @param z - new Z component to set
     * @returns - this {@link Vec3} after being set
     */
    set(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    /**
     * Add a {@link Vec3} to this {@link Vec3}
     * @param vector - {@link Vec3} to add
     * @returns - this {@link Vec3} after addition
     */
    add(vector = new Vec3()) {
      this.x += vector.x;
      this.y += vector.y;
      this.z += vector.z;
      return this;
    }
    /**
     * Add a scalar to all the components of this {@link Vec3}
     * @param value - number to add
     * @returns - this {@link Vec3} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      this.z += value;
      return this;
    }
    /**
     * Subtract a {@link Vec3} from this {@link Vec3}
     * @param vector - {@link Vec3} to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    sub(vector = new Vec3()) {
      this.x -= vector.x;
      this.y -= vector.y;
      this.z -= vector.z;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this {@link Vec3}
     * @param value - number to subtract
     * @returns - this {@link Vec3} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      this.z -= value;
      return this;
    }
    /**
     * Multiply a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiply(vector = new Vec3(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      this.z *= vector.z;
      return this;
    }
    /**
     * Multiply all components of this {@link Vec3} with a scalar
     * @param value - number to multiply with
     * @returns - this {@link Vec3} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      this.z *= value;
      return this;
    }
    /**
     * Copy a {@link Vec3} into this {@link Vec3}
     * @param vector - {@link Vec3} to copy
     * @returns - this {@link Vec3} after copy
     */
    copy(vector = new Vec3()) {
      this.x = vector.x;
      this.y = vector.y;
      this.z = vector.z;
      return this;
    }
    /**
     * Clone this {@link Vec3}
     * @returns - cloned {@link Vec3}
     */
    clone() {
      return new Vec3(this.x, this.y, this.z);
    }
    /**
     * Apply max values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing max values
     * @returns - {@link Vec3} with max values applied
     */
    max(vector = new Vec3()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      this.z = Math.max(this.z, vector.z);
      return this;
    }
    /**
     * Apply min values to this {@link Vec3} components
     * @param vector - {@link Vec3} representing min values
     * @returns - {@link Vec3} with min values applied
     */
    min(vector = new Vec3()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      this.z = Math.min(this.z, vector.z);
      return this;
    }
    /**
     * Clamp this {@link Vec3} components by min and max {@link Vec3} vectors
     * @param min - minimum {@link Vec3} components to compare with
     * @param max - maximum {@link Vec3} components to compare with
     * @returns - clamped {@link Vec3}
     */
    clamp(min = new Vec3(), max = new Vec3()) {
      this.x = Math.max(min.x, Math.min(max.x, this.x));
      this.y = Math.max(min.y, Math.min(max.y, this.y));
      this.z = Math.max(min.z, Math.min(max.z, this.z));
      return this;
    }
    /**
     * Check if 2 {@link Vec3} are equal
     * @param vector - {@link Vec3} to compare
     * @returns - whether the {@link Vec3} are equals or not
     */
    equals(vector = new Vec3()) {
      return this.x === vector.x && this.y === vector.y && this.z === vector.z;
    }
    /**
     * Get the square length of this {@link Vec3}
     * @returns - square length of this {@link Vec3}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    /**
     * Get the length of this {@link Vec3}
     * @returns - length of this {@link Vec3}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this {@link Vec3}
     * @returns - normalized {@link Vec3}
     */
    normalize() {
      let len = this.lengthSq();
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      this.z *= len;
      return this;
    }
    /**
     * Calculate the dot product of 2 {@link Vec3}
     * @param vector - {@link Vec3} to use for dot product
     * @returns - dot product of the 2 {@link Vec3}
     */
    dot(vector = new Vec3()) {
      return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }
    /**
     * Get the cross product of this {@link Vec3} with another {@link Vec3}
     * @param vector - {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    cross(vector = new Vec3()) {
      return this.crossVectors(this, vector);
    }
    /**
     * Set this {@link Vec3} as the result of the cross product of two {@link Vec3}
     * @param a - first {@link Vec3} to use for cross product
     * @param b - second {@link Vec3} to use for cross product
     * @returns - this {@link Vec3} after cross product
     */
    crossVectors(a = new Vec3(), b = new Vec3()) {
      const ax = a.x, ay = a.y, az = a.z;
      const bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by;
      this.y = az * bx - ax * bz;
      this.z = ax * by - ay * bx;
      return this;
    }
    /**
     * Calculate the linear interpolation of this {@link Vec3} by given {@link Vec3} and alpha, where alpha is the percent distance along the line
     * @param vector - {@link Vec3} to interpolate towards
     * @param alpha - interpolation factor in the [0, 1] interval
     * @returns - this {@link Vec3} after linear interpolation
     */
    lerp(vector = new Vec3(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      this.z += (vector.z - this.z) * alpha;
      return this;
    }
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Vec3}
     * Useful to convert a position {@link Vec3} from plane local world to webgl space using projection view matrix for example
     * Source code from: http://glmatrix.net/docs/vec3.js.html
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix = new Mat4()) {
      const x = this._x, y = this._y, z = this._z;
      const mArray = matrix.elements;
      let w = mArray[3] * x + mArray[7] * y + mArray[11] * z + mArray[15];
      w = w || 1;
      this.x = (mArray[0] * x + mArray[4] * y + mArray[8] * z + mArray[12]) / w;
      this.y = (mArray[1] * x + mArray[5] * y + mArray[9] * z + mArray[13]) / w;
      this.z = (mArray[2] * x + mArray[6] * y + mArray[10] * z + mArray[14]) / w;
      return this;
    }
    /**
     * Apply a {@link Quat | quaternion} (rotation in 3D space) to this {@link Vec3}
     * @param quaternion - {@link Quat | quaternion} to use
     * @returns - this {@link Vec3} with the transformation applied
     */
    applyQuat(quaternion = new Quat()) {
      const x = this.x, y = this.y, z = this.z;
      const qx = quaternion.elements[0], qy = quaternion.elements[1], qz = quaternion.elements[2], qw = quaternion.elements[3];
      const ix = qw * x + qy * z - qz * y;
      const iy = qw * y + qz * x - qx * z;
      const iz = qw * z + qx * y - qy * x;
      const iw = -qx * x - qy * y - qz * z;
      this.x = ix * qw + iw * -qx + iy * -qz - iz * -qy;
      this.y = iy * qw + iw * -qy + iz * -qx - ix * -qz;
      this.z = iz * qw + iw * -qz + ix * -qy - iy * -qx;
      return this;
    }
    /**
     * Rotate a {@link Vec3} around and axis by a given angle
     * @param axis - normalized {@link Vec3} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @param quaternion - optional {@link Quat | quaternion} to use for rotation computations
     * @returns - this {@link Vec3} with the rotation applied
     */
    applyAxisAngle(axis = new Vec3(), angle = 0, quaternion = new Quat()) {
      return this.applyQuat(quaternion.setFromAxisAngle(axis, angle));
    }
    /**
     * Project a 3D coordinate {@link Vec3} to a 2D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - projected {@link Vec3}
     */
    project(camera) {
      this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix);
      return this;
    }
    /**
     * Unproject a 2D coordinate {@link Vec3} to 3D coordinate {@link Vec3}
     * @param camera - {@link Camera} to use for projection
     * @returns - unprojected {@link Vec3}
     */
    unproject(camera) {
      this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix);
      return this;
    }
  }
  const slotsPerRow = 4;
  const bytesPerSlot = 4;
  const bytesPerRow = slotsPerRow * bytesPerSlot;
  class BufferElement {
    /**
     * BufferElement constructor
     * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}
     */
    constructor({ name, key, type = "f32" }) {
      this.name = name;
      this.key = key;
      this.type = type;
      this.bufferLayout = getBufferLayout(this.type.replace("array", "").replace("<", "").replace(">", ""));
      this.alignment = {
        start: {
          row: 0,
          byte: 0
        },
        end: {
          row: 0,
          byte: 0
        }
      };
    }
    /**
     * Get the total number of rows used by this {@link BufferElement}
     * @readonly
     */
    get rowCount() {
      return this.alignment.end.row - this.alignment.start.row + 1;
    }
    /**
     * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets
     * @readonly
     */
    get byteCount() {
      return Math.abs(this.endOffset - this.startOffset) + 1;
    }
    /**
     * Get the total number of bytes used by this {@link BufferElement}, including final padding
     * @readonly
     */
    get paddedByteCount() {
      return (this.alignment.end.row + 1) * bytesPerRow;
    }
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} starts
     * @readonly
     */
    get startOffset() {
      return this.getByteCountAtPosition(this.alignment.start);
    }
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} starts
     * @readonly
     */
    get startOffsetToIndex() {
      return this.startOffset / bytesPerSlot;
    }
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffset() {
      return this.getByteCountAtPosition(this.alignment.end);
    }
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffsetToIndex() {
      return this.endOffset / bytesPerSlot;
    }
    /**
     * Get the position at given offset (i.e. byte index)
     * @param offset - byte index to use
     */
    getPositionAtOffset(offset = 0) {
      return {
        row: Math.floor(offset / bytesPerRow),
        byte: offset % bytesPerRow
      };
    }
    /**
     * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}
     * @param position - {@link BufferElementAlignmentPosition | position} from which to count
     * @returns - byte count at the given {@link BufferElementAlignmentPosition | position}
     */
    getByteCountAtPosition(position = { row: 0, byte: 0 }) {
      return position.row * bytesPerRow + position.byte;
    }
    /**
     * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16)
     * @param position - {@link BufferElementAlignmentPosition | position}
     * @returns - updated {@link BufferElementAlignmentPosition | position}
     */
    applyOverflowToPosition(position = { row: 0, byte: 0 }) {
      if (position.byte > bytesPerRow - 1) {
        const overflow = position.byte % bytesPerRow;
        position.row += Math.floor(position.byte / bytesPerRow);
        position.byte = overflow;
      }
      return position;
    }
    /**
     * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}
     * @param p1 - first {@link BufferElementAlignmentPosition | position}
     * @param p2 - second {@link BufferElementAlignmentPosition | position}
     * @returns - number of bytes
     */
    getByteCountBetweenPositions(p1 = { row: 0, byte: 0 }, p2 = { row: 0, byte: 0 }) {
      return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1));
    }
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}
     * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element
     * @returns - computed {@link BufferElementAlignment | alignment}
     */
    getElementAlignment(nextPositionAvailable = { row: 0, byte: 0 }) {
      const alignment = {
        start: nextPositionAvailable,
        end: nextPositionAvailable
      };
      const { size, align } = this.bufferLayout;
      if (nextPositionAvailable.byte % align !== 0) {
        nextPositionAvailable.byte += nextPositionAvailable.byte % align;
      }
      if (size <= bytesPerRow && nextPositionAvailable.byte + size > bytesPerRow) {
        nextPositionAvailable.row += 1;
        nextPositionAvailable.byte = 0;
      }
      alignment.end = {
        row: nextPositionAvailable.row + Math.ceil(size / bytesPerRow) - 1,
        byte: nextPositionAvailable.byte + (size % bytesPerRow === 0 ? bytesPerRow - 1 : size % bytesPerRow - 1)
        // end of row ? then it ends on slot (bytesPerRow - 1)
      };
      alignment.end = this.applyOverflowToPosition(alignment.end);
      return alignment;
    }
    /**
     * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}
     * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link !core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     */
    setAlignmentFromPosition(position = { row: 0, byte: 0 }) {
      this.alignment = this.getElementAlignment(position);
    }
    /**
     * Set the {@link BufferElementAlignment | alignment} from an offset (byte count)
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     */
    setAlignment(startOffset = 0) {
      this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset));
    }
    /**
     * Set the {@link view}
     * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
     */
    setView(arrayBuffer, arrayView) {
      this.view = new this.bufferLayout.View(
        arrayBuffer,
        this.startOffset,
        this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
      );
    }
    /**
     * Update the {@link view} based on the new value
     * @param value - new value to use
     */
    update(value) {
      if (this.type === "f32" || this.type === "u32" || this.type === "i32") {
        this.view[0] = value;
      } else if (this.type === "vec2f") {
        this.view[0] = value.x ?? value[0] ?? 0;
        this.view[1] = value.y ?? value[1] ?? 0;
      } else if (this.type === "vec3f") {
        this.view[0] = value.x ?? value[0] ?? 0;
        this.view[1] = value.y ?? value[1] ?? 0;
        this.view[2] = value.z ?? value[2] ?? 0;
      } else if (value.elements) {
        this.view.set(value.elements);
      } else if (ArrayBuffer.isView(value) || Array.isArray(value)) {
        this.view.set(value);
      }
    }
    /**
     * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data
     * @returns - extracted data from the {@link Float32Array}
     */
    extractDataFromBufferResult(result) {
      return result.slice(this.startOffsetToIndex, this.endOffsetToIndex);
    }
  }
  class BufferArrayElement extends BufferElement {
    /**
     * BufferArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type });
      this.arrayLength = arrayLength;
      this.numElements = this.arrayLength / this.bufferLayout.numElements;
    }
    /**
     * Get the array stride between two elements of the array, in indices
     * @readonly
     */
    get arrayStrideToIndex() {
      return this.arrayStride / bytesPerSlot;
    }
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
     * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the arrayStride between two array elements. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array buffer}
     */
    setAlignment(startOffset = 0) {
      super.setAlignment(startOffset);
      const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(this.endOffset + 1));
      this.arrayStride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end);
      this.alignment.end = this.getPositionAtOffset(this.endOffset + this.arrayStride * (this.numElements - 1));
    }
    /**
     * Update the {@link view} based on the new value
     * @param value - new value to use
     */
    update(value) {
      if (ArrayBuffer.isView(value) || Array.isArray(value)) {
        let valueIndex = 0;
        const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT;
        const stride = Math.ceil(viewLength / this.numElements);
        for (let i = 0; i < this.numElements; i++) {
          for (let j = 0; j < this.bufferLayout.numElements; j++) {
            this.view[j + i * stride] = value[valueIndex];
            valueIndex++;
          }
        }
      } else {
        throwWarning(`BufferArrayElement: value passed to ${this.name} is not an array: ${value}`);
      }
    }
  }
  class BufferInterleavedArrayElement extends BufferArrayElement {
    /**
     * BufferInterleavedArrayElement constructor
     * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferInterleavedArrayElement}
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type, arrayLength });
      this.arrayStride = 1;
      this.arrayLength = arrayLength;
      this.numElements = this.arrayLength / this.bufferLayout.numElements;
    }
    /**
     * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
     * @readonly
     */
    get byteCount() {
      return this.bufferLayout.size * this.numElements;
    }
    /**
     * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
     * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
     */
    setAlignment(startOffset = 0, stride = 0) {
      this.alignment = this.getElementAlignment(this.getPositionAtOffset(startOffset));
      this.arrayStride = stride;
      this.alignment.end = this.getPositionAtOffset(this.endOffset + stride * (this.numElements - 1));
    }
    /**
     * Set the {@link view} and {@link viewSetFunction}
     * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
     */
    setView(arrayBuffer, arrayView) {
      this.view = new this.bufferLayout.View(this.bufferLayout.numElements * this.numElements);
      this.viewSetFunction = ((arrayView2) => {
        switch (this.bufferLayout.View) {
          case Int32Array:
            return arrayView2.setInt32.bind(arrayView2);
          case Uint16Array:
            return arrayView2.setUint16.bind(arrayView2);
          case Uint32Array:
            return arrayView2.setUint32.bind(arrayView2);
          case Float32Array:
          default:
            return arrayView2.setFloat32.bind(arrayView2);
        }
      })(arrayView);
    }
    /**
     * Update the {@link view} based on the new value, and then update the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view} using sub arrays
     * @param value - new value to use
     */
    update(value) {
      super.update(value);
      for (let i = 0; i < this.numElements; i++) {
        const subarray = this.view.subarray(
          i * this.bufferLayout.numElements,
          i * this.bufferLayout.numElements + this.bufferLayout.numElements
        );
        const startByteOffset = this.startOffset + i * this.arrayStride;
        subarray.forEach((value2, index) => {
          this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value2, true);
        });
      }
    }
    /**
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data
     */
    extractDataFromBufferResult(result) {
      const interleavedResult = new Float32Array(this.arrayLength);
      for (let i = 0; i < this.numElements; i++) {
        const resultOffset = this.startOffsetToIndex + i * this.arrayStrideToIndex;
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          interleavedResult[i * this.bufferLayout.numElements + j] = result[resultOffset + j];
        }
      }
      return interleavedResult;
    }
  }
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
      this.buffer = null;
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
      return { buffer: this.buffer };
    }
    /**
     * Format bindings struct and set our {@link inputs}
     * @param bindings - bindings inputs
     */
    setBindings(bindings) {
      Object.keys(bindings).forEach((bindingKey) => {
        const binding = {};
        for (const key in bindings[bindingKey]) {
          if (key !== "value") {
            binding[key] = bindings[bindingKey][key];
          }
        }
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
      });
    }
    /**
     * Set our buffer attributes:
     * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link arrayBuffer} typed array accordingly.
     */
    setBufferAttributes() {
      const arrayBindings = Object.keys(this.inputs).filter(
        (bindingKey) => this.inputs[bindingKey].type.indexOf("array") !== -1
      );
      let orderedBindings = Object.keys(this.inputs).sort((bindingKeyA, bindingKeyB) => {
        const isBindingAArray = Math.min(0, this.inputs[bindingKeyA].type.indexOf("array"));
        const isBindingBArray = Math.min(0, this.inputs[bindingKeyB].type.indexOf("array"));
        return isBindingAArray - isBindingBArray;
      });
      if (arrayBindings.length > 1) {
        orderedBindings = orderedBindings.filter((bindingKey) => !arrayBindings.includes(bindingKey));
      }
      orderedBindings.forEach((bindingKey) => {
        const binding = this.inputs[bindingKey];
        const bufferElementOptions = {
          name: toCamelCase(binding.name ?? bindingKey),
          key: bindingKey,
          type: binding.type
        };
        const isArray = binding.type.indexOf("array") !== -1 && (Array.isArray(binding.value) || ArrayBuffer.isView(binding.value));
        this.bufferElements.push(
          isArray ? new BufferArrayElement({
            ...bufferElementOptions,
            arrayLength: binding.value.length
          }) : new BufferElement(bufferElementOptions)
        );
      });
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
      this.bufferElements.forEach((bufferElement) => {
        bufferElement.setView(this.arrayBuffer, this.arrayView);
      });
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
     * Set a binding shouldUpdate flag to true to update our {@link arrayBuffer} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName = "") {
      const bindingKey = Object.keys(this.inputs).find((bindingKey2) => this.inputs[bindingKey2].name === bindingName);
      if (bindingKey)
        this.inputs[bindingKey].shouldUpdate = true;
    }
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link arrayBuffer} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} knows it will need to update the {@link GPUBuffer}.
     */
    update() {
      Object.keys(this.inputs).forEach((bindingKey) => {
        const binding = this.inputs[bindingKey];
        const bufferElement = this.bufferElements.find((bufferEl) => bufferEl.key === bindingKey);
        if (binding.shouldUpdate && bufferElement) {
          binding.onBeforeUpdate && binding.onBeforeUpdate();
          bufferElement.update(binding.value);
          this.shouldUpdate = true;
          binding.shouldUpdate = false;
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
  class WritableBufferBinding extends BufferBinding {
    /**
     * WritableBufferBinding constructor
     * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
     */
    constructor({
      label = "Work",
      name = "work",
      bindingType,
      useStruct = true,
      struct = {},
      visibility,
      access = "read_write",
      shouldCopyResult = false
    }) {
      bindingType = "storage";
      visibility = "compute";
      super({ label, name, bindingType, useStruct, struct, visibility, access });
      this.options = {
        ...this.options,
        shouldCopyResult
      };
      this.shouldCopyResult = shouldCopyResult;
      this.resultBuffer = null;
    }
  }
  class BindGroup {
    /**
     * BindGroup constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - {@link BindGroupParams | parameters} used to create our {@link BindGroup}
     */
    constructor(renderer, { label = "BindGroup", index = 0, bindings = [], uniforms, storages } = {}) {
      this.type = "BindGroup";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.options = {
        label,
        index,
        bindings,
        ...uniforms && { uniforms },
        ...storages && { storages }
      };
      this.index = index;
      this.uuid = generateUUID();
      this.bindings = [];
      bindings.length && this.addBindings(bindings);
      if (this.options.uniforms || this.options.storages)
        this.setInputBindings();
      this.resetEntries();
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.needsPipelineFlush = false;
      this.renderer.addBindGroup(this);
    }
    /**
     * Sets our {@link BindGroup#index | bind group index}
     * @param index - {@link BindGroup#index | bind group index} to set
     */
    setIndex(index) {
      this.index = index;
    }
    /**
     * Adds an array of already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param bindings - {@link bindings} to add
     */
    addBindings(bindings = []) {
      this.bindings = [...this.bindings, ...bindings];
    }
    /**
     * Adds an already created {@link bindings} (buffers, texture, etc.) to the {@link bindings} array
     * @param binding - binding to add
     */
    addBinding(binding) {
      this.bindings.push(binding);
    }
    /**
     * Creates Bindings based on a list of inputs
     * @param bindingType - {@link core/bindings/Binding.Binding#bindingType | binding type}
     * @param inputs - {@link ReadOnlyInputBindings | inputs (uniform or storage)} that will be used to create the binding
     * @returns - a {@link bindings} array
     */
    createInputBindings(bindingType = "uniform", inputs = {}) {
      return [
        ...Object.keys(inputs).map((inputKey) => {
          const binding = inputs[inputKey];
          const bindingParams = {
            label: toKebabCase(binding.label || inputKey),
            name: inputKey,
            bindingType,
            useStruct: true,
            // by default
            visibility: binding.access === "read_write" ? "compute" : binding.visibility,
            access: binding.access ?? "read",
            // read by default
            struct: binding.struct,
            ...binding.shouldCopyResult !== void 0 && { shouldCopyResult: binding.shouldCopyResult }
          };
          const BufferBindingConstructor = bindingParams.access === "read_write" ? WritableBufferBinding : BufferBinding;
          return binding.useStruct !== false ? new BufferBindingConstructor(bindingParams) : Object.keys(binding.struct).map((bindingKey) => {
            bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey);
            bindingParams.name = inputKey + bindingKey;
            bindingParams.useStruct = false;
            bindingParams.struct = { [bindingKey]: binding.struct[bindingKey] };
            return new BufferBindingConstructor(bindingParams);
          });
        })
      ].flat();
    }
    /**
     * Create and adds {@link bindings} based on inputs provided upon creation
     */
    setInputBindings() {
      this.addBindings([
        ...this.createInputBindings("uniform", this.options.uniforms),
        ...this.createInputBindings("storage", this.options.storages)
      ]);
    }
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link bindings} and has not been created yet
     * @readonly
     */
    get shouldCreateBindGroup() {
      return !this.bindGroup && !!this.bindings.length;
    }
    /**
     * Reset our {@link BindGroup} {@link entries}
     */
    resetEntries() {
      this.entries = {
        bindGroupLayout: [],
        bindGroup: []
      };
    }
    /**
     * Create the GPU buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
     */
    createBindGroup() {
      this.fillEntries();
      this.setBindGroupLayout();
      this.setBindGroup();
    }
    /**
     * Reset the {@link BindGroup#entries.bindGroup | bindGroup entries}, recreates them and then recreate the {@link BindGroup#bindGroup | GPU bind group}
     */
    resetBindGroup() {
      this.entries.bindGroup = [];
      this.bindings.forEach((binding) => {
        this.entries.bindGroup.push({
          binding: this.entries.bindGroup.length,
          resource: binding.resource
        });
      });
      this.setBindGroup();
    }
    /**
     * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
     */
    resetBindGroupLayout() {
      this.entries.bindGroupLayout = [];
      this.bindings.forEach((binding) => {
        this.entries.bindGroupLayout.push({
          binding: this.entries.bindGroupLayout.length,
          ...binding.resourceLayout,
          visibility: binding.visibility
        });
      });
      this.setBindGroupLayout();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
     */
    loseContext() {
      this.resetEntries();
      this.bufferBindings.forEach((binding) => {
        binding.buffer = null;
        if ("resultBuffer" in binding) {
          binding.resultBuffer = null;
        }
      });
      this.bindGroup = null;
      this.bindGroupLayout = null;
      this.needsPipelineFlush = true;
    }
    /**
     * Get all {@link BindGroup#bindings | bind group bindings} that handle a {@link GPUBuffer}
     */
    get bufferBindings() {
      return this.bindings.filter(
        (binding) => binding instanceof BufferBinding || binding instanceof WritableBufferBinding
      );
    }
    /**
     * Creates binding GPUBuffer with correct params
     * @param binding - the binding element
     */
    createBindingBuffer(binding) {
      binding.buffer = this.renderer.createBuffer({
        label: this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
        size: binding.arrayBuffer.byteLength,
        usage: binding.bindingType === "uniform" ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
      });
      if ("resultBuffer" in binding) {
        binding.resultBuffer = this.renderer.createBuffer({
          label: this.options.label + ": Result buffer from: " + binding.label,
          size: binding.arrayBuffer.byteLength,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
      }
    }
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer struct, create a GPUBuffer first if needed
     */
    fillEntries() {
      this.bindings.forEach((binding) => {
        if (!binding.visibility) {
          binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        }
        if ("buffer" in binding && !binding.buffer) {
          this.createBindingBuffer(binding);
        }
        this.entries.bindGroupLayout.push({
          binding: this.entries.bindGroupLayout.length,
          ...binding.resourceLayout,
          visibility: binding.visibility
        });
        this.entries.bindGroup.push({
          binding: this.entries.bindGroup.length,
          resource: binding.resource
        });
      });
    }
    /**
     * Get a bind group binding by name/key
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName = "") {
      return this.bindings.find((binding) => binding.name === bindingName);
    }
    /**
     * Create a GPUBindGroupLayout and set our {@link bindGroupLayout}
     */
    setBindGroupLayout() {
      this.bindGroupLayout = this.renderer.createBindGroupLayout({
        label: this.options.label + " layout",
        entries: this.entries.bindGroupLayout
      });
    }
    /**
     * Create a GPUBindGroup and set our {@link bindGroup}
     */
    setBindGroup() {
      this.bindGroup = this.renderer.createBindGroup({
        label: this.options.label,
        layout: this.bindGroupLayout,
        entries: this.entries.bindGroup
      });
    }
    /**
     * Check whether we should update (write) our {@link GPUBuffer} or not.
     */
    updateBufferBindings() {
      this.bufferBindings.forEach((binding, index) => {
        binding.update();
        if (binding.shouldUpdate) {
          if (!binding.useStruct && binding.bufferElements.length > 1) {
            this.renderer.queueWriteBuffer(binding.buffer, 0, binding.bufferElements[index].view);
          } else {
            this.renderer.queueWriteBuffer(binding.buffer, 0, binding.arrayBuffer);
          }
        }
        binding.shouldUpdate = false;
      });
    }
    /**
     * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
     * Called at each render from the parent {@link core/materials/Material.Material | material}
     */
    update() {
      this.updateBufferBindings();
      const needsReset = this.bindings.some((binding) => binding.shouldResetBindGroup);
      const resetBindGroupLayout = this.bindings.some((binding) => binding.shouldResetBindGroupLayout);
      this.renderer.onAfterCommandEncoderSubmission.add(
        () => {
          this.bindings.forEach((binding) => {
            binding.shouldResetBindGroup = false;
            binding.shouldResetBindGroupLayout = false;
          });
        },
        { once: true }
      );
      if (resetBindGroupLayout) {
        this.resetBindGroupLayout();
        this.needsPipelineFlush = true;
      }
      if (needsReset) {
        this.resetBindGroup();
      }
    }
    /**
     * Clones a {@link BindGroup} from a list of {@link bindings}
     * Useful to create a new bind group with already created buffers, but swapped
     * @param parameters - parameters to use for cloning
     * @param parameters.bindings - our input {@link bindings}
     * @param [parameters.keepLayout=false] - whether we should keep original {@link bindGroupLayout} or not
     * @returns - the cloned {@link BindGroup}
     */
    clone({
      bindings = [],
      keepLayout = false
    } = {}) {
      const params = { ...this.options };
      params.label += " (copy)";
      const bindGroupCopy = new this.constructor(this.renderer, {
        label: params.label
      });
      bindGroupCopy.setIndex(this.index);
      bindGroupCopy.options = params;
      const bindingsRef = bindings.length ? bindings : this.bindings;
      bindingsRef.forEach((binding, index) => {
        bindGroupCopy.addBinding(binding);
        if ("buffer" in binding && !binding.buffer) {
          bindGroupCopy.createBindingBuffer(binding);
        }
        if (!keepLayout) {
          bindGroupCopy.entries.bindGroupLayout.push({
            binding: bindGroupCopy.entries.bindGroupLayout.length,
            ...binding.resourceLayout,
            visibility: binding.visibility
          });
        }
        bindGroupCopy.entries.bindGroup.push({
          binding: bindGroupCopy.entries.bindGroup.length,
          resource: binding.resource
        });
      });
      if (keepLayout) {
        bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout];
      }
      bindGroupCopy.setBindGroupLayout();
      bindGroupCopy.setBindGroup();
      return bindGroupCopy;
    }
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy() {
      this.renderer.removeBindGroup(this);
      this.bufferBindings.forEach((binding) => {
        var _a, _b;
        if ("buffer" in binding) {
          this.renderer.removeBuffer(binding.buffer);
          (_a = binding.buffer) == null ? void 0 : _a.destroy();
          binding.buffer = null;
        }
        if ("resultBuffer" in binding) {
          this.renderer.removeBuffer(binding.resultBuffer);
          (_b = binding.resultBuffer) == null ? void 0 : _b.destroy();
          binding.resultBuffer = null;
        }
      });
      this.bindings = [];
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.resetEntries();
    }
  }
  class TextureBinding extends Binding {
    /**
     * TextureBinding constructor
     * @param parameters - {@link TextureBindingParams | parameters} used to create our {@link TextureBinding}
     */
    constructor({
      label = "Texture",
      name = "texture",
      bindingType,
      visibility,
      texture,
      format = "rgba8unorm",
      access = "write",
      viewDimension = "2d",
      multisampled = false
    }) {
      bindingType = bindingType ?? "texture";
      if (bindingType === "storageTexture") {
        visibility = "compute";
      }
      super({ label, name, bindingType, visibility });
      this.options = {
        ...this.options,
        texture,
        format,
        access,
        viewDimension,
        multisampled
      };
      this.resource = texture;
      this.setWGSLFragment();
    }
    /**
     * Get bind group layout entry resource, either for {@link GPUBindGroupLayoutEntry#texture | texture} or {@link GPUBindGroupLayoutEntry#externalTexture | external texture}
     * @readonly
     */
    get resourceLayout() {
      return getBindGroupLayoutTextureBindingType(this);
    }
    /**
     * Get the {@link GPUBindGroupEntry#resource | bind group resource}
     */
    get resource() {
      return this.texture instanceof GPUTexture ? this.texture.createView({ label: this.options.label + " view" }) : this.texture instanceof GPUExternalTexture ? this.texture : null;
    }
    /**
     * Set the {@link GPUBindGroupEntry#resource | bind group resource}
     * @param value - new bind group resource
     */
    set resource(value) {
      if (value || this.texture)
        this.shouldResetBindGroup = true;
      this.texture = value;
    }
    /**
     * Set or update our {@link Binding#bindingType | bindingType} and our WGSL code snippet
     * @param bindingType - the new {@link Binding#bindingType | binding type}
     */
    setBindingType(bindingType) {
      if (bindingType !== this.bindingType) {
        if (bindingType)
          this.shouldResetBindGroupLayout = true;
        this.bindingType = bindingType;
        this.setWGSLFragment();
      }
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [`${getTextureBindingWGSLVarType(this)}`];
    }
  }
  class Object3D {
    /**
     * Object3D constructor
     */
    constructor() {
      this.setMatrices();
      this.setTransforms();
    }
    /* TRANSFORMS */
    /**
     * Set our transforms properties and {@link Vec3#onChange | vectors onChange} callbacks
     */
    setTransforms() {
      this.transforms = {
        origin: {
          model: new Vec3()
        },
        quaternion: new Quat(),
        rotation: new Vec3(),
        position: {
          world: new Vec3()
        },
        scale: new Vec3(1)
      };
      this.rotation.onChange(() => this.applyRotation());
      this.position.onChange(() => this.applyPosition());
      this.scale.onChange(() => this.applyScale());
      this.transformOrigin.onChange(() => this.applyTransformOrigin());
    }
    /**
     * Get our rotation {@link Vec3 | vector}
     */
    get rotation() {
      return this.transforms.rotation;
    }
    /**
     * Set our rotation {@link Vec3 | vector}
     * @param value - new rotation {@link Vec3 | vector}
     */
    set rotation(value) {
      this.transforms.rotation = value;
      this.applyRotation();
    }
    /**
     * Get our {@link Quat | quaternion}
     */
    get quaternion() {
      return this.transforms.quaternion;
    }
    /**
     * Set our {@link Quat | quaternion}
     * @param value - new {@link Quat | quaternion}
     */
    set quaternion(value) {
      this.transforms.quaternion = value;
    }
    /**
     * Get our position {@link Vec3 | vector}
     */
    get position() {
      return this.transforms.position.world;
    }
    /**
     * Set our position {@link Vec3 | vector}
     * @param value - new position {@link Vec3 | vector}
     */
    set position(value) {
      this.transforms.position.world = value;
    }
    /**
     * Get our scale {@link Vec3 | vector}
     */
    get scale() {
      return this.transforms.scale;
    }
    /**
     * Set our scale {@link Vec3 | vector}
     * @param value - new scale {@link Vec3 | vector}
     */
    set scale(value) {
      this.transforms.scale = value;
      this.applyScale();
    }
    /**
     * Get our transform origin {@link Vec3 | vector}
     */
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    /**
     * Set our transform origin {@link Vec3 | vector}
     * @param value - new transform origin {@link Vec3 | vector}
     */
    set transformOrigin(value) {
      this.transforms.origin.model = value;
    }
    /**
     * Apply our rotation and tell our {@link modelMatrix | model matrix} to update
     */
    applyRotation() {
      this.quaternion.setFromVec3(this.rotation);
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our {@link modelMatrix | model matrix} to update
     */
    applyPosition() {
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our {@link modelMatrix | model matrix} to update
     */
    applyScale() {
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our {@link modelMatrix | model matrix} to update
     */
    applyTransformOrigin() {
      this.shouldUpdateModelMatrix();
    }
    /* MATRICES */
    /**
     * Set our {@link modelMatrix | model matrix}
     */
    setMatrices() {
      this.matrices = {
        model: {
          matrix: new Mat4(),
          shouldUpdate: false,
          onUpdate: () => this.updateModelMatrix()
        }
      };
    }
    /**
     * Get our {@link Mat4 | model matrix}
     */
    get modelMatrix() {
      return this.matrices.model.matrix;
    }
    /**
     * Set our {@link Mat4 | model matrix}
     * @param value - new {@link Mat4 | model matrix}
     */
    set modelMatrix(value) {
      this.matrices.model.matrix = value;
      this.shouldUpdateModelMatrix();
    }
    /**
     * Set our {@link modelMatrix | model matrix} shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateModelMatrix() {
      this.matrices.model.shouldUpdate = true;
    }
    /**
     * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}
     * @param target - {@link Vec3 | target} to look at
     */
    lookAt(target = new Vec3()) {
      const rotationMatrix = new Mat4().lookAt(target, this.position);
      this.quaternion.setFromRotationMatrix(rotationMatrix);
      this.shouldUpdateModelMatrix();
    }
    /**
     * Update our {@link modelMatrix | model matrix}
     */
    updateModelMatrix() {
      this.modelMatrix = this.modelMatrix.composeFromOrigin(
        this.position,
        this.quaternion,
        this.scale,
        this.transformOrigin
      );
    }
    /**
     * Callback to run if at least one matrix of the stack has been updated
     */
    onAfterMatrixStackUpdate() {
    }
    /**
     * Check at each render whether we should update our matrices, and update them if needed
     */
    updateMatrixStack() {
      const matrixShouldUpdate = !!Object.keys(this.matrices).find((matrixName) => this.matrices[matrixName].shouldUpdate);
      for (const matrixName in this.matrices) {
        if (this.matrices[matrixName].shouldUpdate) {
          this.matrices[matrixName].onUpdate();
          this.matrices[matrixName].shouldUpdate = false;
        }
      }
      if (matrixShouldUpdate)
        this.onAfterMatrixStackUpdate();
    }
  }
  const defaultTextureParams = {
    name: "texture",
    generateMips: false,
    flipY: false,
    format: "rgba8unorm",
    premultipliedAlpha: true,
    placeholderColor: [0, 0, 0, 255],
    // default to black
    useExternalTextures: true,
    fromTexture: null,
    viewDimension: "2d",
    cache: true
  };
  class Texture extends Object3D {
    /**
     * Texture constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}
     */
    constructor(renderer, parameters = defaultTextureParams) {
      super();
      __privateAdd(this, _parentRatio, void 0);
      __privateAdd(this, _sourceRatio, void 0);
      __privateAdd(this, _coverScale, void 0);
      __privateAdd(this, _rotationMatrix, void 0);
      __privateSet(this, _parentRatio, new Vec3(1));
      __privateSet(this, _sourceRatio, new Vec3(1));
      __privateSet(this, _coverScale, new Vec3(1));
      __privateSet(this, _rotationMatrix, new Mat4());
      this._onSourceLoadedCallback = () => {
      };
      this._onSourceUploadedCallback = () => {
      };
      this.type = "Texture";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const defaultOptions = {
        ...defaultTextureParams,
        source: parameters.fromTexture ? parameters.fromTexture.options.source : null,
        sourceType: parameters.fromTexture ? parameters.fromTexture.options.sourceType : null
      };
      this.options = { ...defaultOptions, ...parameters };
      this.options.label = this.options.label ?? this.options.name;
      this.texture = null;
      this.externalTexture = null;
      this.source = null;
      this.size = {
        width: 1,
        height: 1,
        depth: 1
      };
      this.textureMatrix = new BufferBinding({
        label: this.options.label + ": model matrix",
        name: this.options.name + "Matrix",
        useStruct: false,
        struct: {
          matrix: {
            name: this.options.name + "Matrix",
            type: "mat4x4f",
            value: this.modelMatrix
          }
        }
      });
      this.setBindings();
      this._parent = null;
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      this.shouldUpdate = false;
      this.renderer.addTexture(this);
      this.createTexture();
    }
    /**
     * Set our {@link bindings}
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": texture",
          name: this.options.name,
          texture: this.options.sourceType === "externalVideo" ? this.externalTexture : this.texture,
          bindingType: this.options.sourceType === "externalVideo" ? "externalTexture" : "texture",
          viewDimension: this.options.viewDimension
        }),
        this.textureMatrix
      ];
    }
    /**
     * Get our {@link TextureBinding | GPU texture binding}
     * @readonly
     */
    get textureBinding() {
      return this.bindings[0];
    }
    /**
     * Get our texture {@link parent}
     */
    get parent() {
      return this._parent;
    }
    /**
     * Set our texture {@link parent}
     * @param value - texture {@link parent} to set (i.e. any kind of {@link core/renderers/GPURenderer.RenderedMesh | Mesh}
     */
    set parent(value) {
      this._parent = value;
      this.resize();
    }
    /**
     * Get whether our {@link source} has been loaded
     */
    get sourceLoaded() {
      return this._sourceLoaded;
    }
    /**
     * Set whether our {@link source} has been loaded
     * @param value - boolean flag indicating if the {@link source} has been loaded
     */
    set sourceLoaded(value) {
      if (value && !this.sourceLoaded) {
        this._onSourceLoadedCallback && this._onSourceLoadedCallback();
      }
      this._sourceLoaded = value;
    }
    /**
     * Get whether our {@link source} has been uploaded
     */
    get sourceUploaded() {
      return this._sourceUploaded;
    }
    /**
     * Set whether our {@link source} has been uploaded
     * @param value - boolean flag indicating if the {@link source} has been uploaded
     */
    set sourceUploaded(value) {
      if (value && !this.sourceUploaded) {
        this._onSourceUploadedCallback && this._onSourceUploadedCallback();
      }
      this._sourceUploaded = value;
    }
    /**
     * Set our texture {@link transforms} object
     */
    setTransforms() {
      super.setTransforms();
      this.transforms.quaternion.setAxisOrder("ZXY");
      this.transforms.origin.model.set(0.5, 0.5, 0);
    }
    /* TEXTURE MATRIX */
    /**
     * Update the {@link modelMatrix}
     */
    updateModelMatrix() {
      if (!this.parent)
        return;
      const parentScale = this.parent.scale ? this.parent.scale : new Vec3(1, 1, 1);
      const parentWidth = this.parent.boundingRect ? this.parent.boundingRect.width * parentScale.x : this.size.width;
      const parentHeight = this.parent.boundingRect ? this.parent.boundingRect.height * parentScale.y : this.size.height;
      const parentRatio = parentWidth / parentHeight;
      const sourceRatio = this.size.width / this.size.height;
      if (parentWidth > parentHeight) {
        __privateGet(this, _parentRatio).set(parentRatio, 1, 1);
        __privateGet(this, _sourceRatio).set(1 / sourceRatio, 1, 1);
      } else {
        __privateGet(this, _parentRatio).set(1, 1 / parentRatio, 1);
        __privateGet(this, _sourceRatio).set(1, sourceRatio, 1);
      }
      const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? __privateGet(this, _parentRatio).x * __privateGet(this, _sourceRatio).x : __privateGet(this, _sourceRatio).y * __privateGet(this, _parentRatio).y;
      __privateGet(this, _coverScale).set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1);
      __privateGet(this, _rotationMatrix).rotateFromQuaternion(this.quaternion);
      this.modelMatrix.identity().premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1)).premultiplyScale(__privateGet(this, _coverScale)).premultiplyScale(__privateGet(this, _parentRatio)).premultiply(__privateGet(this, _rotationMatrix)).premultiplyScale(__privateGet(this, _sourceRatio)).premultiplyTranslate(this.transformOrigin).translate(this.position);
    }
    /**
     * If our {@link modelMatrix} has been updated, tell the {@link textureMatrix | texture matrix binding} to update as well
     */
    onAfterMatrixStackUpdate() {
      this.textureMatrix.shouldUpdateBinding(this.options.name + "Matrix");
    }
    /**
     * Resize our {@link Texture}
     */
    resize() {
      if (this.source && this.source instanceof HTMLCanvasElement && (this.source.width !== this.size.width || this.source.height !== this.size.height)) {
        this.setSourceSize();
        this.createTexture();
      }
      this.shouldUpdateModelMatrix();
    }
    /**
     * Get the number of mip levels create based on {@link size}
     * @param sizes - Array containing our texture width, height and depth
     * @returns - number of mip levels
     */
    getNumMipLevels(...sizes) {
      const maxSize = Math.max(...sizes);
      return 1 + Math.log2(maxSize) | 0;
    }
    /**
     * Tell the {@link Renderer} to upload or texture
     */
    uploadTexture() {
      this.renderer.uploadTexture(this);
      this.shouldUpdate = false;
    }
    /**
     * Import a {@link GPUExternalTexture} from the {@link Renderer}, update the  {@link textureBinding} and its {@link core/bindGroups/TextureBindGroup.TextureBindGroup | bind group}
     */
    uploadVideoTexture() {
      this.externalTexture = this.renderer.importExternalTexture(this.source);
      this.textureBinding.resource = this.externalTexture;
      this.textureBinding.setBindingType("externalTexture");
      this.shouldUpdate = false;
      this.sourceUploaded = true;
    }
    /**
     * Copy a {@link Texture}
     * @param texture - {@link Texture} to copy
     */
    copy(texture) {
      if (this.options.sourceType === "externalVideo" && texture.options.sourceType !== "externalVideo") {
        throwWarning(`${this.options.label}: cannot copy a GPUTexture to a GPUExternalTexture`);
        return;
      } else if (this.options.sourceType !== "externalVideo" && texture.options.sourceType === "externalVideo") {
        throwWarning(`${this.options.label}: cannot copy a GPUExternalTexture to a GPUTexture`);
        return;
      }
      this.options.fromTexture = texture;
      this.options.sourceType = texture.options.sourceType;
      this.options.generateMips = texture.options.generateMips;
      this.options.flipY = texture.options.flipY;
      this.options.format = texture.options.format;
      this.options.premultipliedAlpha = texture.options.premultipliedAlpha;
      this.options.placeholderColor = texture.options.placeholderColor;
      this.options.useExternalTextures = texture.options.useExternalTextures;
      this.sourceLoaded = texture.sourceLoaded;
      this.sourceUploaded = texture.sourceUploaded;
      if (texture.texture) {
        if (texture.sourceLoaded) {
          this.size = texture.size;
          this.source = texture.source;
          this.resize();
        }
        if (texture.sourceUploaded) {
          this.texture = texture.texture;
          this.textureBinding.resource = this.texture;
        } else {
          this.createTexture();
        }
      }
    }
    /**
     * Set the {@link texture | GPU texture}
     */
    createTexture() {
      var _a;
      const options = {
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height, this.size.depth],
        // [1, 1] if no source
        dimensions: this.options.viewDimension === "1d" ? "1d" : this.options.viewDimension === "3d" ? "3d" : "2d",
        //sampleCount: this.source ? this.renderer.sampleCount : 1,
        usage: !!this.source ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      };
      if (this.options.sourceType !== "externalVideo") {
        options.mipLevelCount = this.options.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1;
        (_a = this.texture) == null ? void 0 : _a.destroy();
        this.texture = this.renderer.createTexture(options);
        this.textureBinding.resource = this.texture;
      }
      this.shouldUpdate = true;
    }
    /* SOURCES */
    /**
     * Set the {@link size} based on the {@link source}
     */
    setSourceSize() {
      this.size = {
        width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
        height: this.source.naturalHeight || this.source.height || this.source.videoHeight,
        depth: 1
      };
    }
    /**
     * Load an {@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a {@link source}
     * @async
     * @param url - URL of the image to load
     * @returns - the newly created {@link ImageBitmap}
     */
    async loadImageBitmap(url) {
      const res = await fetch(url);
      const blob = await res.blob();
      return await createImageBitmap(blob, { colorSpaceConversion: "none" });
    }
    /**
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a {@link source} and create the {@link GPUTexture}
     * @async
     * @param source - the image URL or {@link HTMLImageElement} to load
     * @returns - the newly created {@link ImageBitmap}
     */
    async loadImage(source) {
      const url = typeof source === "string" ? source : source.getAttribute("src");
      this.options.source = url;
      this.options.sourceType = "image";
      const cachedTexture = this.renderer.textures.find((t) => t.options.source === url);
      if (cachedTexture && cachedTexture.texture && cachedTexture.sourceUploaded) {
        this.copy(cachedTexture);
        return;
      }
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      this.source = await this.loadImageBitmap(this.options.source);
      this.setSourceSize();
      this.resize();
      this.sourceLoaded = true;
      this.createTexture();
    }
    // weirldy enough, we don't have to do anything in that callback
    // because the <video> is not visible in the viewport, the video playback is throttled
    // and the rendering is janky
    // using requestVideoFrameCallback helps preventing this but is unsupported in Firefox at the moment
    // WebCodecs may be the way to go when time comes!
    // https://developer.chrome.com/blog/new-in-webgpu-113/#use-webcodecs-videoframe-source-in-importexternaltexture
    /**
     * Set our {@link shouldUpdate} flag to true at each new video frame
     */
    onVideoFrameCallback() {
      if (this.videoFrameCallbackId) {
        this.shouldUpdate = true;
        this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this));
      }
    }
    /**
     * Callback to run when a {@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the {@link HTMLVideoElement} as a {@link source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
     * @param video - the newly loaded {@link HTMLVideoElement}
     */
    onVideoLoaded(video) {
      var _a;
      if (!this.sourceLoaded) {
        this.source = video;
        this.setSourceSize();
        this.resize();
        if (this.options.useExternalTextures) {
          this.options.sourceType = "externalVideo";
          (_a = this.texture) == null ? void 0 : _a.destroy();
        } else {
          this.options.sourceType = "video";
          this.createTexture();
        }
        if ("requestVideoFrameCallback" in HTMLVideoElement.prototype) {
          this.videoFrameCallbackId = this.source.requestVideoFrameCallback(
            this.onVideoFrameCallback.bind(this)
          );
        }
        this.sourceLoaded = true;
      }
    }
    /**
     * Get whether the {@link source} is a video
     * @readonly
     */
    get isVideoSource() {
      return this.source && (this.options.sourceType === "video" || this.options.sourceType === "externalVideo");
    }
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register {@link onVideoLoaded} callback
     * @param source - the video URL or {@link HTMLVideoElement} to load
     */
    loadVideo(source) {
      let video;
      if (typeof source === "string") {
        video = document.createElement("video");
        video.src = source;
      } else {
        video = source;
      }
      video.preload = "auto";
      video.muted = true;
      video.loop = true;
      video.crossOrigin = "anonymous";
      video.setAttribute("playsinline", "");
      this.options.source = video.src;
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      if (video.readyState >= video.HAVE_ENOUGH_DATA) {
        this.onVideoLoaded(video);
      } else {
        video.addEventListener("canplaythrough", this.onVideoLoaded.bind(this, video), {
          once: true
        });
      }
      if (isNaN(video.duration)) {
        video.load();
      }
    }
    /**
     * Load a {@link HTMLCanvasElement}, use it as a {@link source} and create the {@link GPUTexture}
     * @param source - the {@link HTMLCanvasElement} to use
     */
    loadCanvas(source) {
      this.options.source = source;
      this.options.sourceType = "canvas";
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      this.source = source;
      this.setSourceSize();
      this.resize();
      this.sourceLoaded = true;
      this.createTexture();
    }
    /* EVENTS */
    /**
     * Callback to run when the {@link source} has been loaded
     * @param callback - callback to run when the {@link source} has been loaded
     * @returns - our {@link Texture}
     */
    onSourceLoaded(callback) {
      if (callback) {
        this._onSourceLoadedCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when the {@link source} has been uploaded
     * @param callback - callback to run when the {@link source} been uploaded
     * @returns - our {@link Texture}
     */
    onSourceUploaded(callback) {
      if (callback) {
        this._onSourceUploadedCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Render a {@link Texture}:
     * - Update its {@link modelMatrix} and {@link bindings} if needed
     * - Upload the texture if it needs to be done
     */
    render() {
      this.updateMatrixStack();
      this.textureMatrix.update();
      if (this.options.sourceType === "externalVideo") {
        this.shouldUpdate = true;
      }
      if (this.isVideoSource && !this.videoFrameCallbackId && this.source.readyState >= this.source.HAVE_CURRENT_DATA && !this.source.paused) {
        this.shouldUpdate = true;
      }
      if (this.shouldUpdate && this.options.sourceType && this.options.sourceType !== "externalVideo") {
        this.uploadTexture();
      }
    }
    /* DESTROY */
    /**
     * Destroy the {@link Texture}
     */
    destroy() {
      var _a;
      if (this.videoFrameCallbackId) {
        this.source.cancelVideoFrameCallback(this.videoFrameCallbackId);
      }
      if (this.isVideoSource) {
        this.source.removeEventListener(
          "canplaythrough",
          this.onVideoLoaded.bind(this, this.source),
          {
            once: true
          }
        );
      }
      this.renderer.removeTexture(this);
      (_a = this.texture) == null ? void 0 : _a.destroy();
      this.texture = null;
    }
  }
  _parentRatio = new WeakMap();
  _sourceRatio = new WeakMap();
  _coverScale = new WeakMap();
  _rotationMatrix = new WeakMap();
  class TextureBindGroup extends BindGroup {
    /**
     * TextureBindGroup constructor
     * @param  renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - {@link TextureBindGroupParams | parameters} used to create our {@link TextureBindGroup}
     */
    constructor(renderer, { label, index = 0, bindings = [], uniforms, storages, textures = [], samplers = [] } = {}) {
      const type = "TextureBindGroup";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, type);
      super(renderer, { label, index, bindings, uniforms, storages });
      this.options = {
        ...this.options,
        // will be filled after
        textures: [],
        samplers: []
      };
      if (textures.length) {
        textures.forEach((texture) => this.addTexture(texture));
      }
      if (samplers.length) {
        samplers.forEach((sampler) => this.addSampler(sampler));
      }
      this.type = type;
    }
    /**
     * Adds a texture to the textures array and the struct
     * @param texture - texture to add
     */
    addTexture(texture) {
      this.textures.push(texture);
      this.addBindings([...texture.bindings]);
    }
    /**
     * Get the current textures array
     * @readonly
     */
    get textures() {
      return this.options.textures;
    }
    /**
     * Adds a sampler to the samplers array and the struct
     * @param sampler
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
      this.addBindings([sampler.binding]);
    }
    /**
     * Get the current samplers array
     * @readonly
     */
    get samplers() {
      return this.options.samplers;
    }
    /**
     * Get whether the GPU bind group is ready to be created
     * It can be created if it has {@link BindGroup#bindings} and has not been created yet and all GPU textures and samplers are created
     * @readonly
     */
    get shouldCreateBindGroup() {
      return !this.bindGroup && !!this.bindings.length && !this.textures.find((texture) => !(texture.texture || texture.externalTexture)) && !this.samplers.find((sampler) => !sampler.sampler);
    }
    /**
     * Update the {@link TextureBindGroup#textures | bind group textures}:
     * - Check if they need to copy their source texture
     * - Upload video texture if needed
     */
    updateTextures() {
      this.textures.forEach((texture, textureIndex) => {
        if (texture instanceof Texture) {
          if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
            texture.copy(texture.options.fromTexture);
          }
          if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
            texture.uploadVideoTexture();
          }
        }
      });
    }
    /**
     * Update the {@link TextureBindGroup}, which means update its {@link TextureBindGroup#textures | textures}, then update its {@link TextureBindGroup#bufferBindings | buffer bindings} and finally {@link TextureBindGroup#resetBindGroup | reset it} if needed
     */
    update() {
      this.updateTextures();
      super.update();
    }
    /**
     * Destroy our {@link TextureBindGroup}
     */
    destroy() {
      super.destroy();
      this.options.textures = [];
      this.options.samplers = [];
    }
  }
  class SamplerBinding extends Binding {
    /**
     * SamplerBinding constructor
     * @param parameters - {@link SamplerBindingParams | parameters} used to create our SamplerBindings
     */
    constructor({
      label = "Sampler",
      name = "sampler",
      bindingType,
      visibility,
      sampler,
      type = "filtering"
    }) {
      bindingType = bindingType ?? "sampler";
      super({ label, name, bindingType, visibility });
      this.options = {
        ...this.options,
        sampler,
        type
      };
      this.resource = sampler;
      this.setWGSLFragment();
    }
    /**
     * Get {@link GPUBindGroupLayoutEntry#sampler | bind group layout entry resource}
     * @readonly
     */
    get resourceLayout() {
      return {
        sampler: {
          type: this.options.type
          // TODO set shouldResetBindGroupLayout to true if it changes afterwards
        }
      };
    }
    /**
     * Get the {@link GPUBindGroupEntry#resource | bind group resource}
     */
    get resource() {
      return this.sampler;
    }
    /**
     * Set the {@link GPUBindGroupEntry#resource | bind group resource}
     * @param value - new bind group resource
     */
    set resource(value) {
      if (value && this.sampler)
        this.shouldResetBindGroup = true;
      this.sampler = value;
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`];
    }
  }
  class Camera extends Object3D {
    /**
     * Camera constructor
     * @param parameters - {@link CameraParams | parameters} used to create our {@link Camera}
     */
    constructor({
      fov = 50,
      near = 0.01,
      far = 150,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onMatricesChanged = () => {
      }
    } = {}) {
      super();
      /** Private {@link Camera} field of view */
      __privateAdd(this, _fov, void 0);
      /** Private {@link Camera} near plane */
      __privateAdd(this, _near, void 0);
      /** Private {@link Camera} far plane */
      __privateAdd(this, _far, void 0);
      /** Private {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs */
      __privateAdd(this, _pixelRatio, void 0);
      this.position.set(0, 0, 10);
      this.onMatricesChanged = onMatricesChanged;
      this.size = {
        width: 1,
        height: 1
      };
      this.setPerspective({ fov, near, far, width, height, pixelRatio });
    }
    /**
     * Set our transform and projection matrices
     */
    setMatrices() {
      super.setMatrices();
      this.matrices = {
        ...this.matrices,
        view: {
          matrix: new Mat4(),
          shouldUpdate: false,
          onUpdate: () => {
            this.viewMatrix.copy(this.modelMatrix).invert();
          }
        },
        projection: {
          matrix: new Mat4(),
          shouldUpdate: false,
          onUpdate: () => this.updateProjectionMatrix()
        }
      };
    }
    /**
     * Get our view matrix
     * @readonly
     */
    get viewMatrix() {
      return this.matrices.view.matrix;
    }
    set viewMatrix(value) {
      this.matrices.view.matrix = value;
      this.matrices.view.shouldUpdate = true;
    }
    /**
     * Get our projection matrix
     * @readonly
     */
    get projectionMatrix() {
      return this.matrices.projection.matrix;
    }
    set projectionMatrix(value) {
      this.matrices.projection.matrix = value;
      this.shouldUpdateProjectionMatrix();
    }
    /**
     * Set our projection matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateProjectionMatrix() {
      this.matrices.projection.shouldUpdate = true;
    }
    /**
     * Update our model matrix and tell our view matrix to update as well
     */
    updateModelMatrix() {
      super.updateModelMatrix();
      this.setScreenRatios();
      this.matrices.view.shouldUpdate = true;
    }
    /**
     * Get the {@link Camera} {@link fov | field of view}
     */
    get fov() {
      return __privateGet(this, _fov);
    }
    /**
     * Set the {@link Camera} {@link fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param fov - new field of view
     */
    set fov(fov) {
      fov = Math.max(1, Math.min(fov ?? this.fov, 179));
      if (fov !== this.fov) {
        __privateSet(this, _fov, fov);
        this.shouldUpdateProjectionMatrix();
      }
      this.setScreenRatios();
      this.setCSSPerspective();
    }
    /**
     * Get the {@link Camera} {@link near} plane value.
     */
    get near() {
      return __privateGet(this, _near);
    }
    /**
     * Set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param near - new near plane value
     */
    set near(near) {
      near = Math.max(near ?? this.near, 0.01);
      if (near !== this.near) {
        __privateSet(this, _near, near);
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get / set the {@link Camera} {@link far} plane value.
     */
    get far() {
      return __privateGet(this, _far);
    }
    /**
     * Set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param far - new far plane value
     */
    set far(far) {
      far = Math.max(far ?? this.far, this.near + 1);
      if (far !== this.far) {
        __privateSet(this, _far, far);
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get the {@link Camera} {@link pixelRatio} value.
     */
    get pixelRatio() {
      return __privateGet(this, _pixelRatio);
    }
    /**
     * Set the {@link Camera} {@link pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
     * @param pixelRatio - new pixel ratio value
     */
    set pixelRatio(pixelRatio) {
      __privateSet(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
      this.setCSSPerspective();
    }
    /**
     * Set the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param size - {@link width} and {@link height} values to use
     */
    setSize({ width, height }) {
      if (width !== this.size.width || height !== this.size.height) {
        this.shouldUpdateProjectionMatrix();
      }
      this.size.width = width;
      this.size.height = height;
      this.setScreenRatios();
      this.setCSSPerspective();
    }
    /**
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if needed.
     * @param parameters - {@link CameraPerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({
      fov = this.fov,
      near = this.near,
      far = this.far,
      width = this.size.width,
      height = this.size.height,
      pixelRatio = this.pixelRatio
    } = {}) {
      this.setSize({ width, height });
      this.pixelRatio = pixelRatio;
      this.fov = fov;
      this.near = near;
      this.far = far;
    }
    /**
     * Callback to run when the camera {@link modelMatrix | model matrix} has been updated
     */
    onAfterMatrixStackUpdate() {
      this.onMatricesChanged();
    }
    /**
     * Sets a {@link CSSPerspective} property based on {@link size}, {@link pixelRatio} and {@link fov}.<br>
     * Used to translate planes along the Z axis using pixel units as CSS would do.<br>
     * {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value | See reference}
     */
    setCSSPerspective() {
      this.CSSPerspective = Math.pow(
        Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan(this.fov * 0.5 * Math.PI / 180);
    }
    /**
     * Sets visible width / height at a given z-depth from our {@link Camera} parameters.<br>
     * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}
     * @param depth - depth to use for calculations
     */
    setScreenRatios(depth = 0) {
      const cameraOffset = this.position.z;
      if (depth < cameraOffset) {
        depth -= cameraOffset;
      } else {
        depth += cameraOffset;
      }
      const vFOV = this.fov * Math.PI / 180;
      const height = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
      this.screenRatio = {
        width: height * this.size.width / this.size.height,
        height
      };
    }
    /**
     * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}
     * @param target - {@link Vec3 | target} to look at
     */
    lookAt(target = new Vec3()) {
      const rotationMatrix = new Mat4().lookAt(this.position, target);
      this.quaternion.setFromRotationMatrix(rotationMatrix);
      this.shouldUpdateModelMatrix();
    }
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix() {
      const aspect = this.size.width / this.size.height;
      const top = this.near * Math.tan(Math.PI / 180 * 0.5 * this.fov);
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;
      const right = left + width;
      const bottom = top - height;
      const x = 2 * this.near / (right - left);
      const y = 2 * this.near / (top - bottom);
      const a = (right + left) / (right - left);
      const b = (top + bottom) / (top - bottom);
      const c = -(this.far + this.near) / (this.far - this.near);
      const d = -2 * this.far * this.near / (this.far - this.near);
      this.projectionMatrix.set(
        x,
        0,
        0,
        0,
        0,
        y,
        0,
        0,
        a,
        b,
        c,
        -1,
        0,
        0,
        d,
        0
      );
    }
  }
  _fov = new WeakMap();
  _near = new WeakMap();
  _far = new WeakMap();
  _pixelRatio = new WeakMap();
  class Sampler {
    /**
     * Sampler constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
     * @param parameters - {@link SamplerParams | parameters} used to create this {@link Sampler}
     */
    constructor(renderer, {
      label = "Sampler",
      name,
      addressModeU = "repeat",
      addressModeV = "repeat",
      magFilter = "linear",
      minFilter = "linear",
      mipmapFilter = "linear",
      maxAnisotropy = 1,
      type = "filtering"
    } = {}) {
      this.type = "Sampler";
      this.uuid = generateUUID();
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, label ? label + " " + this.type : this.type);
      this.renderer = renderer;
      this.label = label;
      if (!name && !this.renderer.production) {
        name = "sampler" + this.renderer.samplers.length;
        throwWarning(
          `Sampler: you are trying to create a sampler without the mandatory name parameter. A default name will be used instead: ${name}`
        );
      }
      this.name = name;
      this.options = {
        addressModeU,
        addressModeV,
        magFilter,
        minFilter,
        mipmapFilter,
        maxAnisotropy,
        type
      };
      this.createSampler();
      this.createBinding();
    }
    /**
     * Set the {@link GPUSampler}
     */
    createSampler() {
      this.sampler = this.renderer.createSampler(this);
    }
    /**
     * Set the {@link SamplerBinding | binding}
     */
    createBinding() {
      this.binding = new SamplerBinding({
        label: this.label,
        name: this.name,
        bindingType: "sampler",
        sampler: this.sampler,
        type: this.options.type
      });
    }
  }
  const defaultRenderTextureParams = {
    label: "RenderTexture",
    name: "renderTexture",
    usage: "texture",
    access: "write",
    fromTexture: null,
    viewDimension: "2d",
    sampleCount: 1
  };
  class RenderTexture {
    /**
     * RenderTexture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTexture}
     * @param parameters - {@link RenderTextureParams | parameters} used to create this {@link RenderTexture}
     */
    constructor(renderer, parameters = defaultRenderTextureParams) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " RenderTexture" : "RenderTexture");
      this.type = "RenderTexture";
      this.renderer = renderer;
      this.uuid = generateUUID();
      this.options = { ...defaultRenderTextureParams, ...parameters };
      if (!this.options.format) {
        this.options.format = this.renderer.options.preferredFormat;
      }
      this.size = this.options.size ?? {
        width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
        height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
        depth: 1
      };
      this.setBindings();
      this.renderer.addRenderTexture(this);
      this.createTexture();
    }
    /**
     * Copy another {@link RenderTexture} into this {@link RenderTexture}
     * @param texture - {@link RenderTexture} to copy
     */
    copy(texture) {
      this.options.fromTexture = texture;
      this.createTexture();
    }
    /**
     * Copy a {@link GPUTexture} directly into this {@link RenderTexture}. Mainly used for depth textures.
     * @param texture - {@link GPUTexture} to copy
     */
    copyGPUTexture(texture) {
      this.size = {
        width: texture.width,
        height: texture.height,
        depth: texture.depthOrArrayLayers
      };
      this.texture = texture;
      this.textureBinding.resource = this.texture;
    }
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
     */
    createTexture() {
      var _a;
      if (this.options.fromTexture) {
        this.copyGPUTexture(this.options.fromTexture.texture);
        return;
      }
      (_a = this.texture) == null ? void 0 : _a.destroy();
      this.texture = this.renderer.createTexture({
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height, this.size.depth],
        dimensions: this.options.viewDimension === "1d" ? "1d" : this.options.viewDimension === "3d" ? "3d" : "2d",
        sampleCount: this.options.sampleCount,
        usage: (
          // TODO let user chose?
          // see https://matrix.to/#/!MFogdGJfnZLrDmgkBN:matrix.org/$vESU70SeCkcsrJQdyQGMWBtCgVd3XqnHcBxFDKTKKSQ?via=matrix.org&via=mozilla.org&via=hej.im
          this.options.usage !== "storageTexture" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        )
      });
      this.textureBinding.resource = this.texture;
    }
    /**
     * Set our {@link RenderTexture#bindings | bindings}
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": " + this.options.name + " render texture",
          name: this.options.name,
          texture: this.texture,
          bindingType: this.options.usage,
          format: this.options.format,
          viewDimension: this.options.viewDimension,
          multisampled: this.options.sampleCount > 1
        })
      ];
    }
    /**
     * Get our {@link TextureBinding | texture binding}
     * @readonly
     */
    get textureBinding() {
      return this.bindings[0];
    }
    /**
     * Force a {@link RenderTexture} to be recreated with the new size
     * @param size - new {@link TextureSize | size} to set
     */
    forceResize(size) {
      this.size = size;
      this.createTexture();
    }
    /**
     * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update
     * @param size - the optional new {@link TextureSize | size} to set
     */
    resize(size = null) {
      if (!size) {
        size = {
          width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
          height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
          depth: 1
        };
      }
      if (size.width === this.size.width && size.height === this.size.height && size.depth === this.size.depth) {
        return;
      }
      this.forceResize(size);
    }
    /**
     * Destroy our {@link RenderTexture}
     */
    destroy() {
      var _a;
      this.renderer.removeRenderTexture(this);
      if (!this.options.fromTexture) {
        (_a = this.texture) == null ? void 0 : _a.destroy();
      }
      this.texture = null;
    }
  }
  class Material {
    /**
     * Material constructor
     * @param renderer - our renderer class object
     * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material
     */
    constructor(renderer, parameters) {
      this.type = "Material";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { shaders, label, useAsyncPipeline, uniforms, storages, bindGroups, samplers, textures, renderTextures } = parameters;
      this.options = {
        shaders,
        label,
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline },
        ...uniforms !== void 0 && { uniforms },
        ...storages !== void 0 && { storages },
        ...bindGroups !== void 0 && { bindGroups },
        ...samplers !== void 0 && { samplers },
        ...textures !== void 0 && { textures },
        ...renderTextures !== void 0 && { renderTextures }
      };
      this.bindGroups = [];
      this.texturesBindGroups = [];
      this.clonedBindGroups = [];
      this.setBindGroups();
      this.setTextures();
      this.setSamplers();
    }
    /**
     * Check if all bind groups are ready, and create them if needed
     */
    compileMaterial() {
      const texturesBindGroupLength = this.texturesBindGroup.bindings.length ? 1 : 0;
      const bindGroupsReady = this.bindGroups.length >= this.inputsBindGroups.length + texturesBindGroupLength;
      if (!bindGroupsReady) {
        this.createBindGroups();
      }
    }
    /**
     * Get whether the renderer is ready, our pipeline entry and pipeline have been created and successfully compiled
     * @readonly
     */
    get ready() {
      return !!(this.renderer.ready && this.pipelineEntry && this.pipelineEntry.pipeline && this.pipelineEntry.ready);
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
     */
    loseContext() {
      this.textures.forEach((texture) => {
        texture.texture = null;
        texture.sourceUploaded = false;
      });
      this.renderTextures.forEach((texture) => {
        texture.texture = null;
      });
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach(
        (bindGroup) => bindGroup.loseContext()
      );
      this.pipelineEntry.pipeline = null;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our bind groups.
     */
    restoreContext() {
      this.samplers.forEach((sampler) => {
        sampler.createSampler();
        sampler.binding.resource = sampler.sampler;
      });
      this.textures.forEach((texture) => {
        texture.createTexture();
        texture.resize();
      });
      this.renderTextures.forEach((texture) => {
        texture.resize(texture.size);
      });
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.createBindGroup();
        }
        bindGroup.bufferBindings.forEach((bufferBinding) => bufferBinding.shouldUpdate = true);
      });
    }
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="full"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getShaderCode(shaderType = "full") {
      if (!this.pipelineEntry)
        return "";
      shaderType = (() => {
        switch (shaderType) {
          case "vertex":
          case "fragment":
          case "compute":
          case "full":
            return shaderType;
          default:
            return "full";
        }
      })();
      return this.pipelineEntry.shaders[shaderType].code;
    }
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="vertex"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getAddedShaderCode(shaderType = "vertex") {
      if (!this.pipelineEntry)
        return "";
      shaderType = (() => {
        switch (shaderType) {
          case "vertex":
          case "fragment":
          case "compute":
            return shaderType;
          default:
            return "vertex";
        }
      })();
      return this.pipelineEntry.shaders[shaderType].head;
    }
    /* BIND GROUPS */
    /**
     * Prepare and set our bind groups based on inputs and bindGroups Material parameters
     */
    setBindGroups() {
      var _a;
      this.uniforms = {};
      this.storages = {};
      this.inputsBindGroups = [];
      this.inputsBindings = [];
      if (this.options.uniforms || this.options.storages) {
        const inputsBindGroup = new BindGroup(this.renderer, {
          label: this.options.label + ": Bindings bind group",
          uniforms: this.options.uniforms,
          storages: this.options.storages
        });
        this.processBindGroupBindings(inputsBindGroup);
        this.inputsBindGroups.push(inputsBindGroup);
      }
      (_a = this.options.bindGroups) == null ? void 0 : _a.forEach((bindGroup) => {
        this.processBindGroupBindings(bindGroup);
        this.inputsBindGroups.push(bindGroup);
      });
    }
    /**
     * Get the main {@link TextureBindGroup | texture bind group} created by this {@link Material} to manage all textures related struct
     * @readonly
     */
    get texturesBindGroup() {
      return this.texturesBindGroups[0];
    }
    /**
     * Process all {@link BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
     * @param bindGroup - The {@link BindGroup} to process
     */
    processBindGroupBindings(bindGroup) {
      bindGroup.bindings.forEach((inputBinding) => {
        if (inputBinding.bindingType === "uniform")
          this.uniforms = {
            ...this.uniforms,
            [inputBinding.name]: inputBinding.inputs
          };
        if (inputBinding.bindingType === "storage")
          this.storages = {
            ...this.storages,
            [inputBinding.name]: inputBinding.inputs
          };
        this.inputsBindings.push(inputBinding);
      });
    }
    /**
     * Create the bind groups if they need to be created
     */
    createBindGroups() {
      var _a;
      if (this.texturesBindGroup.shouldCreateBindGroup) {
        this.texturesBindGroup.setIndex(this.bindGroups.length);
        this.texturesBindGroup.createBindGroup();
        this.bindGroups.push(this.texturesBindGroup);
      }
      this.inputsBindGroups.forEach((bindGroup) => {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.setIndex(this.bindGroups.length);
          bindGroup.createBindGroup();
          this.bindGroups.push(bindGroup);
        }
      });
      (_a = this.options.bindGroups) == null ? void 0 : _a.forEach((bindGroup) => {
        if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          bindGroup.setIndex(this.bindGroups.length);
          this.bindGroups.push(bindGroup);
        }
        if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          this.texturesBindGroups.push(bindGroup);
          bindGroup.textures.forEach((texture) => {
            if (texture instanceof Texture && !this.textures.find((t) => t.uuid === texture.uuid)) {
              this.textures.push(texture);
            } else if (texture instanceof RenderTexture && !this.renderTextures.find((t) => t.uuid === texture.uuid)) {
              this.renderTextures.push(texture);
            }
          });
        }
      });
    }
    /**
     * Clones a {@link BindGroup} from a list of buffers
     * Useful to create a new bind group with already created buffers, but swapped
     * @param parameters - parameters used to clone the {@link BindGroup | bind group}
     * @param parameters.bindGroup - the BindGroup to clone
     * @param parameters.bindings - our input binding buffers
     * @param parameters.keepLayout - whether we should keep original bind group layout or not
     * @returns - the cloned BindGroup
     */
    cloneBindGroup({
      bindGroup,
      bindings = [],
      keepLayout = true
    }) {
      if (!bindGroup)
        return null;
      const clone = bindGroup.clone({ bindings, keepLayout });
      this.clonedBindGroups.push(clone);
      return clone;
    }
    /**
     * Get a corresponding {@link BindGroup} or {@link TextureBindGroup} from one of its binding name/key
     * @param bindingName - the binding name/key to look for
     * @returns - bind group found or null if not found
     */
    getBindGroupByBindingName(bindingName = "") {
      return (this.ready ? this.bindGroups : this.inputsBindGroups).find((bindGroup) => {
        return bindGroup.bindings.find((binding) => binding.name === bindingName);
      });
    }
    /**
     * Destroy a bind group, only if it is not used by another object
     * @param bindGroup - bind group to eventually destroy
     */
    destroyBindGroup(bindGroup) {
      const objectsUsingBindGroup = this.renderer.getObjectsByBindGroup(bindGroup);
      const shouldDestroy = !objectsUsingBindGroup || !objectsUsingBindGroup.find((object) => object.material.uuid !== this.uuid);
      if (shouldDestroy) {
        bindGroup.destroy();
      }
    }
    /**
     * Destroy all bind groups
     */
    destroyBindGroups() {
      this.bindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.clonedBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.texturesBindGroups.forEach((bindGroup) => this.destroyBindGroup(bindGroup));
      this.texturesBindGroups = [];
      this.inputsBindGroups = [];
      this.bindGroups = [];
      this.clonedBindGroups = [];
    }
    /**
     * {@link BindGroup#update | Update} all bind groups:
     * - Update all {@link texturesBindGroups | textures bind groups} textures
     * - Update its {@link BindGroup#bufferBindings | buffer bindings}
     * - Check if it eventually needs a {@link BindGroup#resetBindGroup | reset}
     * - Check if we need to flush the pipeline
     */
    updateBindGroups() {
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.update();
        if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
          this.pipelineEntry.flushPipelineEntry(this.bindGroups);
          bindGroup.needsPipelineFlush = false;
        }
      });
    }
    /* INPUTS */
    /**
     * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName = "") {
      return this.inputsBindings.find((binding) => binding.name === bindingName);
    }
    /**
     * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBufferBindingByName(bindingName = "") {
      return this.inputsBindings.find((binding) => binding.name === bindingName && "buffer" in binding);
    }
    /**
     * Force a given buffer binding update flag to update it at next render
     * @param bufferBindingName - the buffer binding name
     * @param bindingName - the binding name
     */
    shouldUpdateInputsBindings(bufferBindingName, bindingName) {
      if (!bufferBindingName)
        return;
      const bufferBinding = this.getBindingByName(bufferBindingName);
      if (bufferBinding) {
        if (!bindingName) {
          Object.keys(bufferBinding.inputs).forEach(
            (bindingKey) => bufferBinding.shouldUpdateBinding(bindingKey)
          );
        } else {
          bufferBinding.shouldUpdateBinding(bindingName);
        }
      }
    }
    /* SAMPLERS & TEXTURES */
    /**
     * Prepare our textures array and set the {@link TextureBindGroup}
     */
    setTextures() {
      var _a, _b;
      this.textures = [];
      this.renderTextures = [];
      this.texturesBindGroups.push(
        new TextureBindGroup(this.renderer, {
          label: this.options.label + ": Textures bind group"
        })
      );
      (_a = this.options.textures) == null ? void 0 : _a.forEach((texture) => {
        this.addTexture(texture);
      });
      (_b = this.options.renderTextures) == null ? void 0 : _b.forEach((texture) => {
        this.addTexture(texture);
      });
    }
    /**
     * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param texture - texture to add
     */
    addTexture(texture) {
      if (texture instanceof Texture) {
        this.textures.push(texture);
      } else if (texture instanceof RenderTexture) {
        this.renderTextures.push(texture);
      }
      if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
        this.texturesBindGroup.addTexture(texture);
      }
    }
    /**
     * Destroy a {@link Texture} or {@link RenderTexture}, only if it is not used by another object or cached.
     * @param texture - {@link Texture} or {@link RenderTexture} to eventually destroy
     */
    destroyTexture(texture) {
      if (texture.options.cache)
        return;
      const objectsUsingTexture = this.renderer.getObjectsByTexture(texture);
      const shouldDestroy = !objectsUsingTexture || !objectsUsingTexture.some((object) => object.material.uuid !== this.uuid);
      if (shouldDestroy) {
        texture.destroy();
      }
    }
    /**
     * Destroy all the Material textures
     */
    destroyTextures() {
      var _a, _b;
      (_a = this.textures) == null ? void 0 : _a.forEach((texture) => this.destroyTexture(texture));
      (_b = this.renderTextures) == null ? void 0 : _b.forEach((texture) => this.destroyTexture(texture));
      this.textures = [];
      this.renderTextures = [];
    }
    /**
     * Prepare our samplers array and always add a default sampler if not already passed as parameter
     */
    setSamplers() {
      var _a;
      this.samplers = [];
      (_a = this.options.samplers) == null ? void 0 : _a.forEach((sampler) => {
        this.addSampler(sampler);
      });
      const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === "defaultSampler");
      if (!hasDefaultSampler) {
        const sampler = new Sampler(this.renderer, { name: "defaultSampler" });
        this.addSampler(sampler);
      }
    }
    /**
     * Add a sampler to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param sampler - sampler to add
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
      if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(sampler.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(sampler.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(sampler.name) !== -1) {
        this.texturesBindGroup.addSampler(sampler);
      }
    }
    /* BUFFER RESULTS */
    /**
     * Map a {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}
     * @param buffer - {@link GPUBuffer} to map
     * @async
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
     */
    async getBufferResult(buffer) {
      await buffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(buffer.getMappedRange().slice(0));
      buffer.unmap();
      return result;
    }
    /**
     * Map the content of a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
     * @async
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
     */
    async getBufferBindingResultByBindingName(bindingName = "") {
      const binding = this.getBufferBindingByName(bindingName);
      if (binding && "buffer" in binding) {
        const dstBuffer = this.renderer.copyBufferToBuffer({
          srcBuffer: binding.buffer
        });
        return await this.getBufferResult(dstBuffer);
      } else {
        return new Float32Array(0);
      }
    }
    /**
     * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding#buffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param parameters - parameters used to get the result
     * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link BufferBinding#buffer | GPU buffer}
     * @param parameters.bufferElementName - The name of the {@link BufferElement | buffer element} from which to extract the data afterwards
     * @returns - {@link Float32Array} holding {@link GPUBuffer} data
     */
    async getBufferElementResultByNames({
      bindingName,
      bufferElementName
    }) {
      const result = await this.getBufferBindingResultByBindingName(bindingName);
      if (!bufferElementName || result.length) {
        return result;
      } else {
        const binding = this.getBufferBindingByName(bindingName);
        if (binding) {
          return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
        } else {
          return result;
        }
      }
    }
    /* RENDER */
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline
     * Then render the {@link textures}
     * Finally updates all the {@link bindGroups | bind groups}
     */
    onBeforeRender() {
      this.compileMaterial();
      this.textures.forEach((texture) => {
        texture.render();
      });
      this.updateBindGroups();
    }
    /**
     * Set the current pipeline
     * @param pass - current pass encoder
     */
    setPipeline(pass) {
      this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups
     * @param pass - current pass encoder
     */
    render(pass) {
      if (!this.ready)
        return;
      this.setPipeline(pass);
      this.bindGroups.forEach((bindGroup) => {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
      });
    }
    /**
     * Destroy the Material
     */
    destroy() {
      this.destroyBindGroups();
      this.destroyTextures();
    }
  }
  class ComputeMaterial extends Material {
    /**
     * ComputeMaterial constructor
     * @param renderer - our {@link Renderer} class object
     * @param parameters - {@link ComputeMaterialParams | parameters} used to create our {@link ComputeMaterial}
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      const type = "ComputeMaterial";
      isRenderer(renderer, type);
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      let { shaders, dispatchSize } = parameters;
      if (!shaders || !shaders.compute) {
        shaders = {
          compute: {
            code: "",
            entryPoint: "main"
          }
        };
      }
      if (!shaders.compute.code) {
        shaders.compute.code = "@compute @workgroup_size(1) fn main(){}";
      }
      if (!shaders.compute.entryPoint) {
        shaders.compute.entryPoint = "main";
      }
      this.options = {
        ...this.options,
        shaders,
        ...parameters.dispatchSize !== void 0 && { dispatchSize: parameters.dispatchSize }
      };
      if (!dispatchSize) {
        dispatchSize = 1;
      }
      if (Array.isArray(dispatchSize)) {
        dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1);
        dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1);
        dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1);
      } else if (!isNaN(dispatchSize)) {
        dispatchSize = [Math.ceil(dispatchSize), 1, 1];
      }
      this.dispatchSize = dispatchSize;
      this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
        renderer: this.renderer,
        label: this.options.label + " compute pipeline",
        shaders: this.options.shaders,
        useAsync: this.options.useAsyncPipeline
      });
    }
    /**
     * When all bind groups are created, add them to the {@link ComputePipelineEntry}
     */
    setPipelineEntryProperties() {
      this.pipelineEntry.setPipelineEntryProperties({
        bindGroups: this.bindGroups
      });
    }
    /**
     * Compile the {@link ComputePipelineEntry}
     * @async
     */
    async compilePipelineEntry() {
      await this.pipelineEntry.compilePipelineEntry();
    }
    /**
     * Check if all bind groups are ready, create them if needed, set {@link ComputePipelineEntry} bind group buffers and compile the pipeline
     * @async
     */
    async compileMaterial() {
      super.compileMaterial();
      if (this.pipelineEntry && this.pipelineEntry.canCompile) {
        this.setPipelineEntryProperties();
        await this.compilePipelineEntry();
      }
    }
    /**
     * Get the complete code of a given shader including all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="compute"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getShaderCode(shaderType = "compute") {
      return super.getShaderCode(shaderType);
    }
    /**
     * Get the added code of a given shader, i.e. all the WGSL fragment code snippets added by the pipeline
     * @param [shaderType="compute"] - shader to get the code from
     * @returns - The corresponding shader code
     */
    getAddedShaderCode(shaderType = "compute") {
      return super.getAddedShaderCode(shaderType);
    }
    /* RENDER */
    /**
     * If a custom render function has been defined instead of the default one, register the callback
     * @param callback - callback to run instead of the default render behaviour, which is to set the {@link bindGroups | bind groups} and dispatch the work groups based on the {@link dispatchSize | default dispatch size}. This is where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     */
    useCustomRender(callback) {
      if (callback) {
        this._useCustomRenderCallback = callback;
      }
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups
     * @param pass - current compute pass encoder
     */
    render(pass) {
      if (!this.ready)
        return;
      this.setPipeline(pass);
      if (this._useCustomRenderCallback !== void 0) {
        this._useCustomRenderCallback(pass);
      } else {
        this.bindGroups.forEach((bindGroup) => {
          pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        });
        pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2]);
      }
    }
    /* RESULT BUFFER */
    /**
     * Copy all writable binding buffers that need it
     * @param commandEncoder - current command encoder
     */
    copyBufferToResult(commandEncoder) {
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.bufferBindings.forEach((binding) => {
          if (binding.shouldCopyResult && binding.resultBuffer.mapState === "unmapped") {
            commandEncoder.copyBufferToBuffer(binding.buffer, 0, binding.resultBuffer, 0, binding.resultBuffer.size);
          }
        });
      });
    }
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
     * @param parameters - parameters used to get the result
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
     * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
     * @async
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
     */
    async getComputeResult({
      bindingName = "",
      bufferElementName = ""
    }) {
      const binding = this.getBufferBindingByName(bindingName);
      if (binding && "resultBuffer" in binding && binding.resultBuffer.mapState === "unmapped") {
        const result = await this.getBufferResult(binding.resultBuffer);
        if (bufferElementName) {
          return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
        } else {
          return result;
        }
      } else {
        return new Float32Array(0);
      }
    }
  }
  let computePassIndex = 0;
  class ComputePass {
    /**
     * ComputePass constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}
     */
    constructor(renderer, parameters = {}) {
      __privateAdd(this, _autoRender, void 0);
      var _a;
      __privateSet(this, _autoRender, true);
      this._onReadyCallback = () => {
      };
      this._onBeforeRenderCallback = () => {
      };
      this._onRenderCallback = () => {
      };
      this._onAfterRenderCallback = () => {
      };
      this._onAfterResizeCallback = () => {
      };
      const type = "ComputePass";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
      parameters.label = parameters.label ?? "ComputePass " + ((_a = renderer.computePasses) == null ? void 0 : _a.length);
      this.renderer = renderer;
      this.type = type;
      this.uuid = generateUUID();
      Object.defineProperty(this, "index", { value: computePassIndex++ });
      const {
        label,
        shaders,
        renderOrder,
        uniforms,
        storages,
        bindGroups,
        samplers,
        textures,
        renderTextures,
        autoRender,
        useAsyncPipeline,
        texturesOptions,
        dispatchSize
      } = parameters;
      this.options = {
        label,
        shaders,
        ...autoRender !== void 0 && { autoRender },
        ...renderOrder !== void 0 && { renderOrder },
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline },
        ...dispatchSize !== void 0 && { dispatchSize },
        texturesOptions
        // TODO default
      };
      this.renderOrder = renderOrder ?? 0;
      if (autoRender !== void 0) {
        __privateSet(this, _autoRender, autoRender);
      }
      this.userData = {};
      this.ready = false;
      this.setComputeMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        uniforms,
        storages,
        bindGroups,
        samplers,
        textures,
        renderTextures,
        useAsyncPipeline,
        dispatchSize
      });
      this.addToScene();
    }
    /**
     * Get or set whether the compute pass is ready to render (the material has been successfully compiled)
     * @readonly
     */
    get ready() {
      return this._ready;
    }
    set ready(value) {
      if (value) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /**
     * Add our compute pass to the scene and the renderer
     */
    addToScene() {
      this.renderer.computePasses.push(this);
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.addComputePass(this);
      }
    }
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene() {
      if (__privateGet(this, _autoRender)) {
        this.renderer.scene.removeComputePass(this);
      }
      this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
    }
    /**
     * Create the compute pass material
     * @param computeParameters - {@link ComputeMaterial} parameters
     */
    setComputeMaterial(computeParameters) {
      this.material = new ComputeMaterial(this.renderer, computeParameters);
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to render
     */
    loseContext() {
      this.material.loseContext();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
     */
    restoreContext() {
      this.material.restoreContext();
    }
    /* TEXTURES */
    /**
     * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
     * @readonly
     */
    get textures() {
      var _a;
      return ((_a = this.material) == null ? void 0 : _a.textures) || [];
    }
    /**
     * Get our {@link ComputeMaterial#renderTextures | ComputeMaterial render textures array}
     * @readonly
     */
    get renderTextures() {
      var _a;
      return ((_a = this.material) == null ? void 0 : _a.renderTextures) || [];
    }
    /**
     * Create a new {@link Texture}
     * @param options - {@link TextureParams | Texture parameters}
     * @returns - newly created {@link Texture}
     */
    createTexture(options) {
      if (!options.name) {
        options.name = "texture" + this.textures.length;
      }
      if (!options.label) {
        options.label = this.options.label + " " + options.name;
      }
      const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions });
      this.addTexture(texture);
      return texture;
    }
    /**
     * Add a {@link Texture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.material.addTexture(texture);
    }
    /**
     * Create a new {@link RenderTexture}
     * @param  options - {@link RenderTextureParams | RenderTexture parameters}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options) {
      if (!options.name) {
        options.name = "renderTexture" + this.renderTextures.length;
      }
      const renderTexture = new RenderTexture(this.renderer, options);
      this.addRenderTexture(renderTexture);
      return renderTexture;
    }
    /**
     * Add a {@link RenderTexture}
     * @param renderTexture - {@link RenderTexture} to add
     */
    addRenderTexture(renderTexture) {
      this.material.addTexture(renderTexture);
    }
    /**
     * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}
     * @readonly
     */
    get uniforms() {
      var _a;
      return (_a = this.material) == null ? void 0 : _a.uniforms;
    }
    /**
     * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}
     * @readonly
     */
    get storages() {
      var _a;
      return (_a = this.material) == null ? void 0 : _a.storages;
    }
    /**
     * Called from the renderer, useful to trigger an after resize callback.
     */
    resize() {
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /** EVENTS **/
    /**
     * Callback to run when the {@link ComputePass} is ready
     * @param callback - callback to run when {@link ComputePass} is ready
     */
    onReady(callback) {
      if (callback) {
        this._onReadyCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run before the {@link ComputePass} is rendered
     * @param callback - callback to run just before {@link ComputePass} will be rendered
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when the {@link ComputePass} is rendered
     * @param callback - callback to run when {@link ComputePass} is rendered
     */
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run after the {@link ComputePass} has been rendered
     * @param callback - callback to run just after {@link ComputePass} has been rendered
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Callback used to run a custom render function instead of the default one.
     * @param callback - Your custom render function where you will have to set all the {@link core/bindGroups/BindGroup.BindGroup | bind groups} and dispatch the workgroups by yourself.
     */
    useCustomRender(callback) {
      this.material.useCustomRender(callback);
      return this;
    }
    /**
     * Callback to run after the {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
     * @param callback - callback to run just after {@link core/renderers/GPURenderer.GPURenderer | renderer} has been resized
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /**
     * Called before rendering the ComputePass
     * Checks if the material is ready and eventually update its struct
     */
    onBeforeRenderPass() {
      if (!this.renderer.ready)
        return;
      if (this.material && this.material.ready && !this.ready) {
        this.ready = true;
      }
      this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      this.material.onBeforeRender();
    }
    /**
     * Render our {@link ComputeMaterial}
     * @param pass - current compute pass encoder
     */
    onRenderPass(pass) {
      if (!this.material.ready)
        return;
      this._onRenderCallback && this._onRenderCallback();
      this.material.render(pass);
    }
    /**
     * Called after having rendered the ComputePass
     */
    onAfterRenderPass() {
      this._onAfterRenderCallback && this._onAfterRenderCallback();
    }
    /**
     * Render our compute pass
     * Basically just check if our {@link core/renderers/GPURenderer.GPURenderer | renderer} is ready, and then render our {@link ComputeMaterial}
     * @param pass
     */
    render(pass) {
      this.onBeforeRenderPass();
      if (!this.renderer.ready)
        return;
      this.onRenderPass(pass);
      this.onAfterRenderPass();
    }
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array
     * @param commandEncoder - current GPU command encoder
     */
    copyBufferToResult(commandEncoder) {
      var _a;
      (_a = this.material) == null ? void 0 : _a.copyBufferToResult(commandEncoder);
    }
    /**
     * Get the {@link core/bindings/WritableBufferBinding.WritableBufferBinding#resultBuffer | result GPU buffer} content by {@link core/bindings/WritableBufferBinding.WritableBufferBinding | binding} and {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} names
     * @param parameters - parameters used to get the result
     * @param parameters.bindingName - {@link core/bindings/WritableBufferBinding.WritableBufferBinding#name | binding name} from which to get the result
     * @param parameters.bufferElementName - optional {@link core/bindings/bufferElements/BufferElement.BufferElement | buffer element} (i.e. struct member) name if the result needs to be restrained to only one element
     * @async
     * @returns - the mapped content of the {@link GPUBuffer} as a {@link Float32Array}
     */
    async getComputeResult({
      bindingName,
      bufferElementName
    }) {
      var _a;
      return await ((_a = this.material) == null ? void 0 : _a.getComputeResult({ bindingName, bufferElementName }));
    }
    /**
     * Remove the ComputePass from the scene and destroy it
     */
    remove() {
      this.removeFromScene();
      this.destroy();
    }
    /**
     * Destroy the ComputePass
     */
    destroy() {
      var _a;
      (_a = this.material) == null ? void 0 : _a.destroy();
    }
  }
  _autoRender = new WeakMap();
  const points = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
  class Box3 {
    /**
     * Box3 constructor
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    constructor(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min = min;
      this.max = max;
    }
    /**
     * Set a {@link Box3} from two min and max {@link Vec3 | vectors}
     * @param min - min {@link Vec3 | vector} of the {@link Box3}
     * @param max - max {@link Vec3 | vector} of the {@link Box3}
     */
    set(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min.copy(min);
      this.max.copy(max);
      return this;
    }
    /**
     * Clone this {@link Box3}
     * @returns - cloned {@link Box3}
     */
    clone() {
      return new Box3().set(this.min, this.max);
    }
    /**
     * Get the {@link Box3} center
     * @returns - {@link Vec3 | center vector} of the {@link Box3}
     */
    getCenter() {
      return this.max.clone().add(this.min).multiplyScalar(0.5);
    }
    /**
     * Get the {@link Box3} size
     * @returns - {@link Vec3 | size vector} of the {@link Box3}
     */
    getSize() {
      return this.max.clone().sub(this.min);
    }
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Box3}
     * Useful to apply a transformation {@link Mat4 | matrix} to a {@link Box3}
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Box3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix = new Mat4()) {
      const corners = [];
      if (this.min.z === this.max.z) {
        corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[1] = points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[2] = points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[3] = points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix);
      } else {
        corners[0] = points[0].set(this.min.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[1] = points[1].set(this.min.x, this.min.y, this.max.z).applyMat4(matrix);
        corners[2] = points[2].set(this.min.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[3] = points[3].set(this.min.x, this.max.y, this.max.z).applyMat4(matrix);
        corners[4] = points[4].set(this.max.x, this.min.y, this.min.z).applyMat4(matrix);
        corners[5] = points[5].set(this.max.x, this.min.y, this.max.z).applyMat4(matrix);
        corners[6] = points[6].set(this.max.x, this.max.y, this.min.z).applyMat4(matrix);
        corners[7] = points[7].set(this.max.x, this.max.y, this.max.z).applyMat4(matrix);
      }
      const transFormedBox = new Box3();
      for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
        transFormedBox.min.min(corners[i]);
        transFormedBox.max.max(corners[i]);
      }
      return transFormedBox;
    }
  }
  const defaultDOMFrustumMargins = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  class DOMFrustum {
    /**
     * DOMFrustum constructor
     * @param {DOMFrustumParams} parameters - {@link DOMFrustumParams | parameters} used to create our {@link DOMFrustum}
     */
    constructor({
      boundingBox = new Box3(),
      modelViewProjectionMatrix = new Mat4(),
      containerBoundingRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0
      },
      DOMFrustumMargins = defaultDOMFrustumMargins,
      onReEnterView = () => {
      },
      onLeaveView = () => {
      }
    }) {
      this.boundingBox = boundingBox;
      this.modelViewProjectionMatrix = modelViewProjectionMatrix;
      this.containerBoundingRect = containerBoundingRect;
      this.DOMFrustumMargins = { ...defaultDOMFrustumMargins, ...DOMFrustumMargins };
      this.projectedBoundingRect = {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        width: 0,
        height: 0,
        x: 0,
        y: 0
      };
      this.onReEnterView = onReEnterView;
      this.onLeaveView = onLeaveView;
      this.isIntersecting = false;
      this.shouldUpdate = false;
    }
    /**
     * Set our {@link containerBoundingRect} (called on resize)
     * @param boundingRect - new bounding rectangle
     */
    setContainerBoundingRect(boundingRect) {
      this.containerBoundingRect = boundingRect;
    }
    /**
     * Get our DOM frustum bounding rectangle, i.e. our {@link containerBoundingRect} with the {@link DOMFrustumMargins} applied
     * @readonly
     */
    get DOMFrustumBoundingRect() {
      return {
        top: this.projectedBoundingRect.top - this.DOMFrustumMargins.top,
        right: this.projectedBoundingRect.right + this.DOMFrustumMargins.right,
        bottom: this.projectedBoundingRect.bottom + this.DOMFrustumMargins.bottom,
        left: this.projectedBoundingRect.left - this.DOMFrustumMargins.left
      };
    }
    /**
     * Applies all {@link modelViewProjectionMatrix} transformations to our {@link boundingBox} and then check against intersections
     */
    computeProjectedToDocumentCoords() {
      const projectedBox = this.boundingBox.applyMat4(this.modelViewProjectionMatrix);
      projectedBox.min.x = (projectedBox.min.x + 1) * 0.5;
      projectedBox.max.x = (projectedBox.max.x + 1) * 0.5;
      projectedBox.min.y = 1 - (projectedBox.min.y + 1) * 0.5;
      projectedBox.max.y = 1 - (projectedBox.max.y + 1) * 0.5;
      const { width, height, top, left } = this.containerBoundingRect;
      this.projectedBoundingRect = {
        left: projectedBox.min.x * width + left,
        x: projectedBox.min.x * width + left,
        top: projectedBox.max.y * height + top,
        y: projectedBox.max.y * height + top,
        right: projectedBox.max.x * width + left,
        bottom: projectedBox.min.y * height + top,
        width: projectedBox.max.x * width + left - (projectedBox.min.x * width + left),
        height: projectedBox.min.y * height + top - (projectedBox.max.y * height + top)
      };
      this.intersectsContainer();
    }
    /**
     * Check whether our {@link projectedBoundingRect} intersects with our {@link DOMFrustumBoundingRect}
     */
    intersectsContainer() {
      if (Math.round(this.DOMFrustumBoundingRect.right) <= this.containerBoundingRect.left || Math.round(this.DOMFrustumBoundingRect.left) >= this.containerBoundingRect.left + this.containerBoundingRect.width || Math.round(this.DOMFrustumBoundingRect.bottom) <= this.containerBoundingRect.top || Math.round(this.DOMFrustumBoundingRect.top) >= this.containerBoundingRect.top + this.containerBoundingRect.height) {
        if (this.isIntersecting) {
          this.onLeaveView();
        }
        this.isIntersecting = false;
      } else {
        if (!this.isIntersecting) {
          this.onReEnterView();
        }
        this.isIntersecting = true;
      }
    }
  }
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
      attributes == null ? void 0 : attributes.forEach((attribute) => {
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
        var _a;
        (_a = vertexBuffer.buffer) == null ? void 0 : _a.destroy();
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
     * Override the parent draw method to draw indexed geometry
     * @param pass - current render pass
     */
    drawGeometry(pass) {
      pass.drawIndexed(this.indexBuffer.bufferLength, this.instancesCount);
    }
    /**
     * Destroy our indexed geometry vertex buffers and index buffer
     */
    destroy() {
      var _a, _b;
      super.destroy();
      (_b = (_a = this.indexBuffer) == null ? void 0 : _a.buffer) == null ? void 0 : _b.destroy();
      this.indexBuffer.buffer = null;
    }
  }
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
      Object.keys(attributes).forEach((attributeKey) => {
        this.setAttribute(attributes[attributeKey]);
      });
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
  class RenderMaterial extends Material {
    /**
     * RenderMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      const type = "RenderMaterial";
      isRenderer(renderer, type);
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      const { shaders, label, useAsyncPipeline, uniforms, storages, bindGroups, ...renderingOptions } = parameters;
      if (!shaders.vertex.entryPoint) {
        shaders.vertex.entryPoint = "main";
      }
      if (!shaders.fragment.entryPoint) {
        shaders.fragment.entryPoint = "main";
      }
      this.options = {
        ...this.options,
        shaders,
        rendering: renderingOptions
      };
      this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
        renderer: this.renderer,
        label: this.options.label + " render pipeline",
        shaders: this.options.shaders,
        useAsync: this.options.useAsyncPipeline,
        ...this.options.rendering
      });
      this.attributes = null;
    }
    /**
     * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry}
     */
    setPipelineEntryProperties() {
      this.pipelineEntry.setPipelineEntryProperties({
        attributes: this.attributes,
        bindGroups: this.bindGroups
      });
    }
    /**
     * Compile the {@link RenderPipelineEntry}
     * @async
     */
    async compilePipelineEntry() {
      await this.pipelineEntry.compilePipelineEntry();
    }
    /**
     * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers and compile the pipeline
     * @async
     */
    async compileMaterial() {
      super.compileMaterial();
      if (this.attributes && this.pipelineEntry && this.pipelineEntry.canCompile) {
        this.setPipelineEntryProperties();
        await this.compilePipelineEntry();
      }
    }
    /**
     * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
     * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
     */
    setRenderingOptions(renderingOptions = {}) {
      const newProperties = Object.keys(renderingOptions).filter(
        (key) => renderingOptions[key] !== this.options.rendering[key]
      );
      this.options.rendering = { ...this.options.rendering, ...renderingOptions };
      if (this.pipelineEntry) {
        this.pipelineEntry.options = { ...this.pipelineEntry.options, ...this.options.rendering };
        if (this.pipelineEntry.ready && newProperties.length) {
          throwWarning(
            `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be flushed and recompiled. This should be avoided. Rendering options that caused this: { ${newProperties.map((key) => `"${key}": ${renderingOptions[key]}`).join(", ")} }`
          );
          this.pipelineEntry.flushPipelineEntry(this.bindGroups);
        }
      }
    }
    /* ATTRIBUTES */
    /**
     * Compute geometry if needed and get all useful geometry properties needed to create attributes buffers
     * @param geometry - the geometry to draw
     */
    setAttributesFromGeometry(geometry) {
      this.attributes = {
        wgslStructFragment: geometry.wgslStructFragment,
        vertexBuffers: geometry.vertexBuffers
      };
    }
    /* BIND GROUPS */
    /**
     * Create the bind groups if they need to be created, but first add Camera bind group if needed
     */
    createBindGroups() {
      const bindGroupStartIndex = this.options.rendering.useProjection ? 1 : 0;
      if (this.texturesBindGroup.shouldCreateBindGroup) {
        this.texturesBindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex);
        this.texturesBindGroup.createBindGroup();
        this.bindGroups.push(this.texturesBindGroup);
      }
      this.inputsBindGroups.forEach((bindGroup) => {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.setIndex(this.bindGroups.length + bindGroupStartIndex);
          bindGroup.createBindGroup();
          this.bindGroups.push(bindGroup);
        }
      });
    }
  }
  const default_vsWgsl = (
    /* wgsl */
    `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VertexOutput {
  var vsOutput: VertexOutput;

  vsOutput.position = vec4f(attributes.position, 1.0);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`
  );
  const default_fsWgsl = (
    /* wgsl */
    `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`
  );
  let meshIndex = 0;
  const defaultMeshBaseParams = {
    // geometry
    geometry: new Geometry(),
    // material
    shaders: {},
    autoRender: true,
    useProjection: false,
    // rendering
    cullMode: "back",
    depth: true,
    depthWriteEnabled: true,
    depthCompare: "less",
    transparent: false,
    visible: true,
    renderOrder: 0,
    // textures
    texturesOptions: {}
  };
  function MeshBaseMixin(Base) {
    var _autoRender3, _a;
    return _a = class extends Base {
      /**
       * MeshBase constructor
       *
       * @typedef MeshBaseArrayParams
       * @type {array}
       * @property {(Renderer|GPUCurtains)} 0 - our {@link Renderer} class object
       * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
       * @property {MeshBaseParams} 2 - {@link MeshBaseParams | Mesh base parameters}
       *
       * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
       */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultMeshBaseParams, ...params[2] }
        );
        __privateAdd(this, _autoRender3, void 0);
        __privateSet(this, _autoRender3, true);
        this._onReadyCallback = () => {
        };
        this._onBeforeRenderCallback = () => {
        };
        this._onRenderCallback = () => {
        };
        this._onAfterRenderCallback = () => {
        };
        this._onAfterResizeCallback = () => {
        };
        let renderer = params[0];
        const parameters = { ...defaultMeshBaseParams, ...params[2] };
        this.type = "MeshBase";
        this.uuid = generateUUID();
        Object.defineProperty(this, "index", { value: meshIndex++ });
        renderer = renderer && renderer.renderer || renderer;
        isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const {
          label,
          shaders,
          geometry,
          visible,
          renderOrder,
          renderTarget,
          texturesOptions,
          autoRender,
          ...meshParameters
        } = parameters;
        meshParameters.sampleCount = meshParameters.sampleCount ?? this.renderer.renderPass.options.sampleCount;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          label: label ?? "Mesh " + this.renderer.meshes.length,
          shaders,
          texturesOptions,
          ...renderTarget !== void 0 && { renderTarget },
          ...autoRender !== void 0 && { autoRender },
          ...meshParameters.useAsyncPipeline !== void 0 && { useAsyncPipeline: meshParameters.useAsyncPipeline }
        };
        this.renderTarget = renderTarget ?? null;
        this.geometry = geometry;
        if (autoRender !== void 0) {
          __privateSet(this, _autoRender3, autoRender);
        }
        this.visible = visible;
        this.renderOrder = renderOrder;
        this.ready = false;
        this.userData = {};
        this.computeGeometry();
        this.setMaterial({
          label: this.options.label,
          shaders: this.options.shaders,
          ...{ ...meshParameters, verticesOrder: geometry.verticesOrder, topology: geometry.topology }
        });
        this.addToScene();
      }
      /**
       * Get private #autoRender value
       * @readonly
       */
      get autoRender() {
        return __privateGet(this, _autoRender3);
      }
      /**
       * Get/set whether a Mesh is ready or not
       * @readonly
       */
      get ready() {
        return this._ready;
      }
      set ready(value) {
        if (value) {
          this._onReadyCallback && this._onReadyCallback();
        }
        this._ready = value;
      }
      /* SCENE */
      /**
       * Add a Mesh to the renderer and the {@link core/scenes/Scene.Scene | Scene}
       */
      addToScene() {
        var _a2;
        this.renderer.meshes.push(this);
        (_a2 = this.material) == null ? void 0 : _a2.setRenderingOptions({
          sampleCount: this.renderTarget ? this.renderTarget.renderPass.options.sampleCount : this.renderer.renderPass.options.sampleCount
        });
        if (__privateGet(this, _autoRender3)) {
          this.renderer.scene.addMesh(this);
        }
      }
      /**
       * Remove a Mesh from the renderer and the {@link core/scenes/Scene.Scene | Scene}
       */
      removeFromScene() {
        if (__privateGet(this, _autoRender3)) {
          this.renderer.scene.removeMesh(this);
        }
        this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
      }
      /**
       * Set a new {@link Renderer} for this Mesh
       * @param renderer - new {@link Renderer} to set
       */
      setRenderer(renderer) {
        renderer = renderer && renderer.renderer || renderer;
        if (!renderer || !(renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer")) {
          throwWarning(
            `${this.options.label}: Cannot set ${renderer} as a renderer because it is not of a valid Renderer type.`
          );
          return;
        }
        const oldRenderer = this.renderer;
        this.removeFromScene();
        this.renderer = renderer;
        this.addToScene();
        if (!oldRenderer.meshes.length) {
          oldRenderer.onBeforeRenderScene.add(
            (commandEncoder) => {
              oldRenderer.forceClear(commandEncoder);
            },
            { once: true }
          );
        }
      }
      /**
       * Assign or remove a {@link RenderTarget} to this Mesh
       * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
       * @param renderTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
       */
      setRenderTarget(renderTarget) {
        if (renderTarget && renderTarget.type !== "RenderTarget") {
          throwWarning(`${this.options.label ?? this.type}: renderTarget is not a RenderTarget: ${renderTarget}`);
          return;
        }
        this.removeFromScene();
        this.renderTarget = renderTarget;
        this.addToScene();
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
       * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
       */
      loseContext() {
        this.geometry.vertexBuffers.forEach((vertexBuffer) => {
          vertexBuffer.buffer = null;
        });
        if ("indexBuffer" in this.geometry) {
          this.geometry.indexBuffer.buffer = null;
        }
        this.material.loseContext();
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
       */
      restoreContext() {
        this.material.restoreContext();
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing
       */
      setShaders() {
        let { shaders } = this.options;
        if (!shaders) {
          shaders = {
            vertex: {
              code: default_vsWgsl,
              entryPoint: "main"
            },
            fragment: {
              code: default_fsWgsl,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: default_vsWgsl,
              entryPoint: "main"
            };
          }
          if (!shaders.fragment || !shaders.fragment.code) {
            shaders.fragment = {
              code: default_fsWgsl,
              entryPoint: "main"
            };
          }
        }
      }
      /* GEOMETRY */
      /**
       * Compute the Mesh geometry if needed
       */
      computeGeometry() {
        if (this.geometry.shouldCompute) {
          this.geometry.computeGeometry();
        }
      }
      /**
       * Create the Mesh Geometry vertex and index buffers if needed
       */
      createGeometryBuffers() {
        if (!this.geometry.ready) {
          this.geometry.vertexBuffers.forEach((vertexBuffer) => {
            if (!vertexBuffer.buffer) {
              vertexBuffer.buffer = this.renderer.createBuffer({
                label: this.options.label + " geometry: " + vertexBuffer.name + " buffer",
                size: vertexBuffer.array.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
              });
              this.renderer.queueWriteBuffer(vertexBuffer.buffer, 0, vertexBuffer.array);
            }
          });
          if ("indexBuffer" in this.geometry && this.geometry.indexBuffer && !this.geometry.indexBuffer.buffer) {
            this.geometry.indexBuffer.buffer = this.renderer.createBuffer({
              label: this.options.label + " geometry: index buffer",
              size: this.geometry.indexBuffer.array.byteLength,
              usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST
            });
            this.renderer.queueWriteBuffer(this.geometry.indexBuffer.buffer, 0, this.geometry.indexBuffer.array);
          }
        }
      }
      /**
       * Set our Mesh geometry: create buffers and add attributes to material
       */
      setGeometry() {
        if (this.geometry && this.renderer.ready) {
          this.createGeometryBuffers();
          this.setMaterialGeometryAttributes();
        }
      }
      /* MATERIAL */
      /**
       * Set a Mesh transparent property, then set its material
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        var _a2;
        this.transparent = meshParameters.transparent;
        this.setShaders();
        this.material = new RenderMaterial(this.renderer, meshParameters);
        (_a2 = this.material.options.textures) == null ? void 0 : _a2.filter((texture) => texture instanceof Texture).forEach((texture) => this.onTextureAdded(texture));
      }
      /**
       * Set Mesh material attributes
       */
      setMaterialGeometryAttributes() {
        if (this.material && !this.material.attributes) {
          this.material.setAttributesFromGeometry(this.geometry);
        }
      }
      /* TEXTURES */
      /**
       * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
       * @readonly
       */
      get textures() {
        var _a2;
        return ((_a2 = this.material) == null ? void 0 : _a2.textures) || [];
      }
      /**
       * Get our {@link RenderMaterial#renderTextures | RenderMaterial render textures array}
       * @readonly
       */
      get renderTextures() {
        var _a2;
        return ((_a2 = this.material) == null ? void 0 : _a2.renderTextures) || [];
      }
      /**
       * Create a new {@link Texture}
       * @param options - {@link TextureParams | Texture parameters}
       * @returns - newly created {@link Texture}
       */
      createTexture(options) {
        if (!options.name) {
          options.name = "texture" + this.textures.length;
        }
        if (!options.label) {
          options.label = this.options.label + " " + options.name;
        }
        const texture = new Texture(this.renderer, { ...options, ...this.options.texturesOptions });
        this.addTexture(texture);
        return texture;
      }
      /**
       * Add a {@link Texture}
       * @param texture - {@link Texture} to add
       */
      addTexture(texture) {
        this.material.addTexture(texture);
        this.onTextureAdded(texture);
      }
      /**
       * Callback run when a new {@link Texture} has been added
       * @param texture - newly created Texture
       */
      onTextureAdded(texture) {
        texture.parent = this;
      }
      /**
       * Create a new {@link RenderTexture}
       * @param  options - {@link RenderTextureParams | RenderTexture parameters}
       * @returns - newly created {@link RenderTexture}
       */
      createRenderTexture(options) {
        if (!options.name) {
          options.name = "renderTexture" + this.renderTextures.length;
        }
        const renderTexture = new RenderTexture(this.renderer, options);
        this.addRenderTexture(renderTexture);
        return renderTexture;
      }
      /**
       * Add a {@link RenderTexture}
       * @param renderTexture - {@link RenderTexture} to add
       */
      addRenderTexture(renderTexture) {
        this.material.addTexture(renderTexture);
      }
      /* BINDINGS */
      /**
       * Get the current {@link RenderMaterial} uniforms
       * @readonly
       */
      get uniforms() {
        var _a2;
        return (_a2 = this.material) == null ? void 0 : _a2.uniforms;
      }
      /**
       * Get the current {@link RenderMaterial} storages
       * @readonly
       */
      get storages() {
        var _a2;
        return (_a2 = this.material) == null ? void 0 : _a2.storages;
      }
      /* RESIZE */
      /**
       * Resize the Mesh's render textures only if they're not storage textures
       */
      resizeRenderTextures() {
        var _a2;
        (_a2 = this.renderTextures) == null ? void 0 : _a2.filter((renderTexture) => renderTexture.options.usage !== "storageTexture").forEach((renderTexture) => renderTexture.resize());
      }
      /**
       * Resize the Mesh's textures
       * @param boundingRect
       */
      resize(boundingRect) {
        var _a2;
        this.resizeRenderTextures();
        if (super.resize) {
          super.resize(boundingRect);
        }
        (_a2 = this.textures) == null ? void 0 : _a2.forEach((texture) => {
          texture.resize();
        });
        this._onAfterResizeCallback && this._onAfterResizeCallback();
      }
      /* EVENTS */
      /**
       * Assign a callback function to _onReadyCallback
       * @param callback - callback to run when {@link MeshBase} is ready
       * @returns - our Mesh
       */
      onReady(callback) {
        if (callback) {
          this._onReadyCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onBeforeRenderCallback
       * @param callback - callback to run just before {@link MeshBase} will be rendered
       * @returns - our Mesh
       */
      onBeforeRender(callback) {
        if (callback) {
          this._onBeforeRenderCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onRenderCallback
       * @param callback - callback to run when {@link MeshBase} is rendered
       * @returns - our Mesh
       */
      onRender(callback) {
        if (callback) {
          this._onRenderCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onAfterRenderCallback
       * @param callback - callback to run just after {@link MeshBase} has been rendered
       * @returns - our Mesh
       */
      onAfterRender(callback) {
        if (callback) {
          this._onAfterRenderCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onBeforeRenderCallback
       * @param callback - callback to run just after {@link MeshBase} has been resized
       * @returns - our Mesh
       */
      onAfterResize(callback) {
        if (callback) {
          this._onAfterResizeCallback = callback;
        }
        return this;
      }
      /* RENDER */
      /**
       * Called before rendering the Mesh
       * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
       * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its struct
       */
      onBeforeRenderPass() {
        if (!this.renderer.ready)
          return;
        if (this.material && this.material.ready && this.geometry && this.geometry.ready && !this.ready) {
          this.ready = true;
        }
        this.setGeometry();
        this._onBeforeRenderCallback && this._onBeforeRenderCallback();
        this.material.onBeforeRender();
      }
      /**
       * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
       * @param pass - current render pass encoder
       */
      onRenderPass(pass) {
        if (!this.material.ready)
          return;
        this._onRenderCallback && this._onRenderCallback();
        this.material.render(pass);
        this.geometry.render(pass);
      }
      /**
       * Called after having rendered the Mesh
       */
      onAfterRenderPass() {
        this._onAfterRenderCallback && this._onAfterRenderCallback();
      }
      /**
       * Render our Mesh
       * - Execute {@link onBeforeRenderPass}
       * - Stop here if {@link Renderer} is not ready or Mesh is not {@link visible}
       * - Execute super render call if it exists
       * - {@link onRenderPass | render} our {@link material} and {@link geometry}
       * - Execute {@link onAfterRenderPass}
       * @param pass - current render pass encoder
       */
      render(pass) {
        this.onBeforeRenderPass();
        if (!this.renderer.ready || !this.visible)
          return;
        if (super.render) {
          super.render();
        }
        this.onRenderPass(pass);
        this.onAfterRenderPass();
      }
      /* DESTROY */
      /**
       * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
       */
      remove() {
        this.removeFromScene();
        this.destroy();
        if (!this.renderer.meshes.length) {
          this.renderer.onBeforeRenderScene.add(
            (commandEncoder) => {
              this.renderer.forceClear(commandEncoder);
            },
            { once: true }
          );
        }
      }
      /**
       * Destroy the Mesh
       */
      destroy() {
        var _a2, _b;
        if (super.destroy) {
          super.destroy();
        }
        (_a2 = this.material) == null ? void 0 : _a2.destroy();
        this.geometry.vertexBuffers.forEach((vertexBuffer) => {
          this.renderer.removeBuffer(
            vertexBuffer.buffer,
            this.options.label + " geometry: " + vertexBuffer.name + " buffer"
          );
        });
        if ("indexBuffer" in this.geometry) {
          this.renderer.removeBuffer(this.geometry.indexBuffer.buffer);
        }
        (_b = this.geometry) == null ? void 0 : _b.destroy();
      }
    }, _autoRender3 = new WeakMap(), _a;
  }
  class CacheManager {
    /**
     * CacheManager constructor
     */
    constructor() {
      this.planeGeometries = [];
    }
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition.id | definition id}
     * @param planeGeometry - {@link PlaneGeometry} to check
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometry(planeGeometry) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id);
    }
    /**
     * Check if a given {@link PlaneGeometry} is already cached based on its {@link PlaneGeometry#definition | definition id}
     * @param planeGeometryID - {@link PlaneGeometry#definition.id | PlaneGeometry definition id}
     * @returns - {@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometryByID(planeGeometryID) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometryID);
    }
    /**
     * Add a {@link PlaneGeometry} to our cache {@link planeGeometries} array
     * @param planeGeometry
     */
    addPlaneGeometry(planeGeometry) {
      this.planeGeometries.push(planeGeometry);
    }
    /**
     * Destroy our {@link CacheManager}
     */
    destroy() {
      this.planeGeometries = [];
    }
  }
  const cacheManager = new CacheManager();
  class FullscreenPlane extends MeshBaseMixin(class {
  }) {
    /**
     * FullscreenPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link FullscreenPlane}
     */
    constructor(renderer, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " FullscreenQuadMesh" : "FullscreenQuadMesh");
      let geometry = cacheManager.getPlaneGeometryByID(2);
      if (!geometry) {
        geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 });
        cacheManager.addPlaneGeometry(geometry);
      }
      super(renderer, null, { geometry, ...parameters });
      this.size = {
        document: {
          width: this.renderer.boundingRect.width,
          height: this.renderer.boundingRect.height,
          top: this.renderer.boundingRect.top,
          left: this.renderer.boundingRect.left
        }
      };
      this.type = "FullscreenQuadMesh";
    }
    /**
     * Resize our {@link FullscreenPlane}
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect = null) {
      this.size.document = boundingRect ?? this.renderer.boundingRect;
      super.resize(boundingRect);
    }
    /**
     * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link FullscreenPlane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
     * @returns - the mapped {@link Vec2 | vector} coordinates in the [-1, 1] range
     */
    mouseToPlaneCoords(mouseCoords = new Vec2()) {
      return new Vec2(
        (mouseCoords.x - this.size.document.left) / this.size.document.width * 2 - 1,
        1 - (mouseCoords.y - this.size.document.top) / this.size.document.height * 2
      );
    }
  }
  class ProjectedObject3D extends Object3D {
    /**
     * ProjectedObject3D constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link ProjectedObject3D}
     */
    constructor(renderer) {
      super();
      renderer = renderer && renderer.renderer || renderer;
      isCameraRenderer(renderer, "ProjectedObject3D");
      this.camera = renderer.camera;
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyPosition() {
      super.applyPosition();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyRotation() {
      super.applyRotation();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyScale() {
      super.applyScale();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Tell our projection matrix stack to update
     */
    applyTransformOrigin() {
      super.applyTransformOrigin();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Set our transform and projection matrices
     */
    setMatrices() {
      super.setMatrices();
      this.matrices = {
        ...this.matrices,
        modelView: {
          matrix: new Mat4(),
          shouldUpdate: false,
          onUpdate: () => {
            this.modelViewMatrix.multiplyMatrices(this.viewMatrix, this.modelMatrix);
          }
        },
        modelViewProjection: {
          matrix: new Mat4(),
          shouldUpdate: false,
          onUpdate: () => {
            this.modelViewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.modelViewMatrix);
          }
        }
      };
    }
    /**
     * Get our {@link modelViewMatrix | model view matrix}
     */
    get modelViewMatrix() {
      return this.matrices.modelView.matrix;
    }
    /**
     * Set our {@link modelViewMatrix | model view matrix}
     * @param value - new {@link modelViewMatrix | model view matrix}
     */
    set modelViewMatrix(value) {
      this.matrices.modelView.matrix = value;
      this.matrices.modelView.shouldUpdate = true;
    }
    /**
     * Get our {@link Camera#viewMatrix | camera view matrix}
     * @readonly
     */
    get viewMatrix() {
      return this.camera.viewMatrix;
    }
    /**
     * Get our {@link Camera#projectionMatrix | camera projection matrix}
     * @readonly
     */
    get projectionMatrix() {
      return this.camera.projectionMatrix;
    }
    /**
     * Get our {@link modelViewProjectionMatrix | model view projection matrix}
     */
    get modelViewProjectionMatrix() {
      return this.matrices.modelViewProjection.matrix;
    }
    /**
     * Set our {@link modelViewProjectionMatrix | model view projection matrix}
     * @param value - new {@link modelViewProjectionMatrix | model view projection matrix}s
     */
    set modelViewProjectionMatrix(value) {
      this.matrices.modelViewProjection.matrix = value;
      this.matrices.modelViewProjection.shouldUpdate = true;
    }
    /**
     * Set our projection matrices shouldUpdate flags to true (tell them to update)
     */
    shouldUpdateProjectionMatrixStack() {
      this.matrices.modelView.shouldUpdate = true;
      this.matrices.modelViewProjection.shouldUpdate = true;
    }
    /**
     * Tell all our matrices to update
     */
    shouldUpdateMatrixStack() {
      this.shouldUpdateModelMatrix();
      this.shouldUpdateProjectionMatrixStack();
    }
  }
  const default_projected_vsWgsl = (
    /* wgsl */
    `
struct VertexOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VertexOutput {
  var vsOutput: VertexOutput;

  vsOutput.position = getOutputPosition(camera, matrices, attributes.position);
  vsOutput.uv = attributes.uv;
  vsOutput.normal = attributes.normal;
  
  return vsOutput;
}`
  );
  const default_normal_fsWgsl = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  // normals
  return vec4(normalize(fsInput.normal) * 0.5 + 0.5, 1.0);
}`
  );
  const defaultProjectedMeshParams = {
    // frustum culling and visibility
    frustumCulled: true,
    DOMFrustumMargins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
  function ProjectedMeshBaseMixin(Base) {
    return class ProjectedMeshBase extends MeshBaseMixin(Base) {
      /**
       * ProjectedMeshBase constructor
       *
       * @typedef MeshBaseArrayParams
       * @type {array}
       * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
       * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
       * @property {ProjectedMeshParameters} 2 - Projected Mesh parameters
       *
       * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
       */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultProjectedMeshParams, ...params[2], ...{ useProjection: true } }
        );
        this._onReEnterViewCallback = () => {
        };
        this._onLeaveViewCallback = () => {
        };
        let renderer = params[0];
        const parameters = {
          ...defaultProjectedMeshParams,
          ...params[2],
          ...{ useProjection: true }
        };
        this.type = "MeshTransformed";
        renderer = renderer && renderer.renderer || renderer;
        isCameraRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const { geometry, frustumCulled, DOMFrustumMargins } = parameters;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          frustumCulled,
          DOMFrustumMargins
        };
        this.setDOMFrustum();
        this.geometry = geometry;
        this.shouldUpdateMatrixStack();
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing
       */
      setShaders() {
        let { shaders } = this.options;
        if (!shaders) {
          shaders = {
            vertex: {
              code: default_projected_vsWgsl,
              entryPoint: "main"
            },
            fragment: {
              code: default_normal_fsWgsl,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: default_projected_vsWgsl,
              entryPoint: "main"
            };
          }
          if (!shaders.fragment || !shaders.fragment.code) {
            shaders.fragment = {
              code: default_normal_fsWgsl,
              entryPoint: "main"
            };
          }
        }
      }
      /* GEOMETRY */
      /**
       * Set the Mesh frustum culling
       */
      setDOMFrustum() {
        this.domFrustum = new DOMFrustum({
          boundingBox: this.geometry.boundingBox,
          modelViewProjectionMatrix: this.modelViewProjectionMatrix,
          containerBoundingRect: this.renderer.boundingRect,
          DOMFrustumMargins: this.options.DOMFrustumMargins,
          onReEnterView: () => {
            this._onReEnterViewCallback && this._onReEnterViewCallback();
          },
          onLeaveView: () => {
            this._onLeaveViewCallback && this._onLeaveViewCallback();
          }
        });
        this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins;
        this.frustumCulled = this.options.frustumCulled;
        this.domFrustum.shouldUpdate = this.frustumCulled;
      }
      /* MATERIAL */
      /**
       * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        const matricesUniforms = {
          label: "Matrices",
          struct: {
            model: {
              name: "model",
              type: "mat4x4f",
              value: this.modelMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.struct.model.value = this.modelMatrix;
              }
            },
            modelView: {
              // model view matrix (model matrix multiplied by camera view matrix)
              name: "modelView",
              type: "mat4x4f",
              value: this.modelViewMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.struct.modelView.value = this.modelViewMatrix;
              }
            },
            modelViewProjection: {
              name: "modelViewProjection",
              type: "mat4x4f",
              value: this.modelViewProjectionMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.struct.modelViewProjection.value = this.modelViewProjectionMatrix;
              }
            }
          }
        };
        if (!meshParameters.uniforms)
          meshParameters.uniforms = {};
        meshParameters.uniforms.matrices = matricesUniforms;
        super.setMaterial(meshParameters);
      }
      /* SIZE & TRANSFORMS */
      /**
       * Resize our {@link ProjectedMeshBaseClass}
       * @param boundingRect - the new bounding rectangle
       */
      resize(boundingRect) {
        if (this.domFrustum)
          this.domFrustum.setContainerBoundingRect(this.renderer.boundingRect);
        super.resize(boundingRect);
      }
      /**
       * Apply scale and resize textures
       */
      applyScale() {
        super.applyScale();
        this.textures.forEach((texture) => texture.resize());
      }
      /**
       * Get our {@link DOMFrustum} projected bounding rectangle
       * @readonly
       */
      get projectedBoundingRect() {
        var _a;
        return (_a = this.domFrustum) == null ? void 0 : _a.projectedBoundingRect;
      }
      /**
       * At least one of the matrix has been updated, update according uniforms and frustum
       */
      onAfterMatrixStackUpdate() {
        if (this.material) {
          this.material.shouldUpdateInputsBindings("matrices");
        }
        if (this.domFrustum)
          this.domFrustum.shouldUpdate = true;
      }
      /* EVENTS */
      /**
       * Assign a callback function to _onReEnterViewCallback
       * @param callback - callback to run when {@link ProjectedMeshBaseClass} is reentering the view frustum
       * @returns - our Mesh
       */
      onReEnterView(callback) {
        if (callback) {
          this._onReEnterViewCallback = callback;
        }
        return this;
      }
      /**
       * Assign a callback function to _onLeaveViewCallback
       * @param callback - callback to run when {@link ProjectedMeshBaseClass} is leaving the view frustum
       * @returns - our Mesh
       */
      onLeaveView(callback) {
        if (callback) {
          this._onLeaveViewCallback = callback;
        }
        return this;
      }
      /* RENDER */
      /**
       * Called before rendering the Mesh to update matrices and {@link DOMFrustum}.
       * First, we update our matrices to have fresh results. It eventually calls onAfterMatrixStackUpdate() if at least one matrix has been updated.
       * Then we check if we need to update the {@link DOMFrustum} projected bounding rectangle.
       * Finally we call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super
       */
      onBeforeRenderPass() {
        this.updateMatrixStack();
        if (this.domFrustum && this.domFrustum.shouldUpdate && this.frustumCulled) {
          this.domFrustum.computeProjectedToDocumentCoords();
          this.domFrustum.shouldUpdate = false;
        }
        super.onBeforeRenderPass();
      }
      /**
       * Only render the Mesh if it is in view frustum.
       * Since render() is actually called before onRenderPass(), we are sure to have fresh frustum bounding rectangle values here.
       * @param pass - current render pass
       */
      onRenderPass(pass) {
        if (!this.material.ready)
          return;
        this._onRenderCallback && this._onRenderCallback();
        if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulled) {
          this.material.render(pass);
          this.geometry.render(pass);
        }
      }
    };
  }
  class Mesh extends ProjectedMeshBaseMixin(ProjectedObject3D) {
    /**
     * Mesh constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link Mesh}
     * @param parameters - {@link MeshBaseParams | parameters} use to create this {@link Mesh}
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      isCameraRenderer(renderer, parameters.label ? parameters.label + " Mesh" : "Mesh");
      super(renderer, null, parameters);
      this.type = "Mesh";
    }
  }
  let pipelineId = 0;
  class PipelineEntry {
    /**
     * PipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link PipelineEntry}
     */
    constructor(parameters) {
      this.type = "PipelineEntry";
      let { renderer } = parameters;
      const { label, shaders, useAsync } = parameters;
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, label ? label + " " + this.type : this.type);
      this.renderer = renderer;
      Object.defineProperty(this, "index", { value: pipelineId++ });
      this.layout = null;
      this.pipeline = null;
      this.status = {
        compiling: false,
        compiled: false,
        error: null
      };
      this.options = {
        label,
        shaders,
        useAsync: useAsync !== void 0 ? useAsync : true
      };
    }
    /**
     * Get whether the {@link pipeline} is ready, i.e. successfully compiled
     * @readonly
     */
    get ready() {
      return !this.status.compiling && this.status.compiled && !this.status.error;
    }
    /**
     * Get whether the {@link pipeline} is ready to be compiled, i.e. we have not already tried to compile it, and it's not currently compiling neither
     * @readonly
     */
    get canCompile() {
      return !this.status.compiling && !this.status.compiled && !this.status.error;
    }
    /**
     * Set our {@link PipelineEntry#bindGroups | pipeline entry bind groups}
     * @param bindGroups - {@link core/materials/Material.Material#bindGroups | bind groups} to use with this {@link PipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = bindGroups;
    }
    /* SHADERS */
    /**
     * Create a {@link GPUShaderModule}
     * @param parameters - Parameters used
     * @param parameters.code - patched WGSL code string
     * @param parameters.type - {@link MaterialShadersType | shader type}
     * @returns - compiled {@link GPUShaderModule} if successful
     */
    createShaderModule({ code = "", type = "vertex" }) {
      const shaderModule = this.renderer.createShaderModule({
        label: this.options.label + ": " + type + "Shader module",
        code
      });
      if ("getCompilationInfo" in shaderModule && !this.renderer.production) {
        shaderModule.getCompilationInfo().then((compilationInfo) => {
          for (const message of compilationInfo.messages) {
            let formattedMessage = "";
            if (message.lineNum) {
              formattedMessage += `Line ${message.lineNum}:${message.linePos} - ${code.substring(
                message.offset,
                message.offset + message.length
              )}
`;
            }
            formattedMessage += message.message;
            switch (message.type) {
              case "error":
                console.error(`${this.options.label} compilation error:
${formattedMessage}`);
                break;
              case "warning":
                console.warn(`${this.options.label} compilation warning:
${formattedMessage}`);
                break;
              case "info":
                console.log(`${this.options.label} compilation information:
${formattedMessage}`);
                break;
            }
          }
        });
      }
      return shaderModule;
    }
    /* SETUP */
    /**
     * Create the {@link PipelineEntry} shaders
     */
    createShaders() {
    }
    /**
     * Create the pipeline entry {@link layout}
     */
    createPipelineLayout() {
      this.layout = this.renderer.createPipelineLayout({
        label: this.options.label + " layout",
        bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout)
      });
    }
    /**
     * Create the {@link PipelineEntry} descriptor
     */
    createPipelineDescriptor() {
    }
    /**
     * Flush a {@link PipelineEntry}, i.e. reset its {@link bindGroups | bind groups}, {@link layout} and descriptor and recompile the {@link pipeline}
     * Used when one of the bind group or rendering property has changed
     * @param newBindGroups - new {@link bindGroups | bind groups} in case they have changed
     */
    flushPipelineEntry(newBindGroups = []) {
      this.status.compiling = false;
      this.status.compiled = false;
      this.status.error = null;
      this.setPipelineEntryBindGroups(newBindGroups);
      this.compilePipelineEntry();
    }
    /**
     * Set up a {@link pipeline} by creating the shaders, the {@link layout} and the descriptor
     */
    compilePipelineEntry() {
      this.status.compiling = true;
      this.createShaders();
      this.createPipelineLayout();
      this.createPipelineDescriptor();
    }
  }
  const get_output_position = (
    /* wgsl */
    `
fn getOutputPosition(camera: Camera, matrices: Matrices, position: vec3f) -> vec4f {
  return camera.projection * matrices.modelView * vec4f(position, 1.0);
}`
  );
  const get_uv_cover = (
    /* wgsl */
    `
fn getUVCover(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {
  return (textureMatrix * vec4f(uv, 0.0, 1.0)).xy;
}`
  );
  const get_vertex_to_uv_coords = (
    /* wgsl */
    `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}
`
  );
  const ShaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Applies given texture matrix to given uv coordinates */
      get_uv_cover
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {
      /** Applies given texture matrix to given uv coordinates */
      get_uv_cover,
      /** Convert vertex position to uv coordinates */
      get_vertex_to_uv_coords
    }
  };
  const ProjectedShaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Get output vec4f position vector by applying model view projection matrix to vec3f attribute position vector */
      get_output_position
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {}
  };
  class RenderPipelineEntry extends PipelineEntry {
    /**
     * RenderPipelineEntry constructor
     * @param parameters - {@link RenderPipelineEntryParams | parameters} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters) {
      let { renderer } = parameters;
      const { label, ...renderingOptions } = parameters;
      renderer = renderer && renderer.renderer || renderer;
      const type = "RenderPipelineEntry";
      isRenderer(renderer, label ? label + " " + type : type);
      super(parameters);
      this.type = type;
      this.shaders = {
        vertex: {
          head: "",
          code: "",
          module: null
        },
        fragment: {
          head: "",
          code: "",
          module: null
        },
        full: {
          head: "",
          code: "",
          module: null
        }
      };
      this.descriptor = null;
      this.options = {
        ...this.options,
        ...renderingOptions
      };
    }
    // TODO! need to chose whether we should silently add the camera bind group here
    // or explicitly in the RenderMaterial class createBindGroups() method
    /**
     * Merge our {@link bindGroups | pipeline entry bind groups} with the {@link CameraRenderer#cameraBindGroup | camera bind group} if needed and set them
     * @param bindGroups - {@link core/materials/RenderMaterial.RenderMaterial#bindGroups | bind groups} to use with this {@link RenderPipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = "cameraBindGroup" in this.renderer && this.options.useProjection ? [this.renderer.cameraBindGroup, ...bindGroups] : bindGroups;
    }
    /**
     * Set {@link RenderPipelineEntry} properties (in this case the {@link bindGroups | bind groups} and {@link attributes})
     * @param parameters - the {@link core/materials/RenderMaterial.RenderMaterial#bindGroups | bind groups} and {@link core/materials/RenderMaterial.RenderMaterial#attributes | attributes} to use
     */
    setPipelineEntryProperties(parameters) {
      const { attributes, bindGroups } = parameters;
      this.attributes = attributes;
      this.setPipelineEntryBindGroups(bindGroups);
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders() {
      this.shaders.vertex.head = "";
      this.shaders.vertex.code = "";
      this.shaders.fragment.head = "";
      this.shaders.fragment.code = "";
      this.shaders.full.head = "";
      this.shaders.full.code = "";
      for (const chunk in ShaderChunks.vertex) {
        this.shaders.vertex.head = `${ShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
        this.shaders.full.head = `${ShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
      }
      for (const chunk in ShaderChunks.fragment) {
        this.shaders.fragment.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
        if (this.shaders.full.head.indexOf(ShaderChunks.fragment[chunk]) === -1) {
          this.shaders.full.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
        }
      }
      if (this.options.useProjection) {
        for (const chunk in ProjectedShaderChunks.vertex) {
          this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
          this.shaders.full.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
        }
        for (const chunk in ProjectedShaderChunks.fragment) {
          this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
          if (this.shaders.full.head.indexOf(ProjectedShaderChunks.fragment[chunk]) === -1) {
            this.shaders.full.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
          }
        }
      }
      const groupsBindings = [];
      this.bindGroups.forEach((bindGroup) => {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              visibility: binding.visibility,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      });
      groupsBindings.forEach((groupBinding) => {
        if (groupBinding.visibility === GPUShaderStage.VERTEX || groupBinding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)) {
          if (groupBinding.wgslStructFragment && this.shaders.vertex.head.indexOf(groupBinding.wgslStructFragment) === -1) {
            this.shaders.vertex.head = `
${groupBinding.wgslStructFragment}
${this.shaders.vertex.head}`;
          }
          if (this.shaders.vertex.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
            this.shaders.vertex.head = `${this.shaders.vertex.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
            if (groupBinding.newLine)
              this.shaders.vertex.head += `
`;
          }
        }
        if (groupBinding.visibility === GPUShaderStage.FRAGMENT || groupBinding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)) {
          if (groupBinding.wgslStructFragment && this.shaders.fragment.head.indexOf(groupBinding.wgslStructFragment) === -1) {
            this.shaders.fragment.head = `
${groupBinding.wgslStructFragment}
${this.shaders.fragment.head}`;
          }
          if (this.shaders.fragment.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
            this.shaders.fragment.head = `${this.shaders.fragment.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
            if (groupBinding.newLine)
              this.shaders.fragment.head += `
`;
          }
        }
        if (groupBinding.wgslStructFragment && this.shaders.full.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.full.head = `
${groupBinding.wgslStructFragment}
${this.shaders.full.head}`;
        }
        if (this.shaders.full.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.full.head = `${this.shaders.full.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine)
            this.shaders.full.head += `
`;
        }
      });
      this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
      this.shaders.full.head = `${this.attributes.wgslStructFragment}
${this.shaders.full.head}`;
      this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
      this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
      if (this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0) {
        this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code;
      } else {
        this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code + this.options.shaders.fragment.code;
      }
    }
    /* SETUP */
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      const isSameShader = this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0;
      this.shaders.vertex.module = this.createShaderModule({
        code: this.shaders[isSameShader ? "full" : "vertex"].code,
        type: "vertex"
      });
      this.shaders.fragment.module = this.createShaderModule({
        code: this.shaders[isSameShader ? "full" : "fragment"].code,
        type: "fragment"
      });
    }
    /**
     * Create the render pipeline {@link descriptor}
     */
    createPipelineDescriptor() {
      if (!this.shaders.vertex.module || !this.shaders.fragment.module)
        return;
      let vertexLocationIndex = -1;
      const blend = this.options.blend ?? (this.options.transparent && {
        color: {
          srcFactor: "src-alpha",
          dstFactor: "one-minus-src-alpha"
        },
        alpha: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        }
      });
      this.descriptor = {
        label: this.options.label,
        layout: this.layout,
        vertex: {
          module: this.shaders.vertex.module,
          entryPoint: this.options.shaders.vertex.entryPoint,
          buffers: this.attributes.vertexBuffers.map((vertexBuffer) => {
            return {
              stepMode: vertexBuffer.stepMode,
              arrayStride: vertexBuffer.arrayStride * 4,
              // 4 bytes each
              attributes: vertexBuffer.attributes.map((attribute) => {
                vertexLocationIndex++;
                return {
                  shaderLocation: vertexLocationIndex,
                  offset: attribute.bufferOffset,
                  // previous attribute size * 4
                  format: attribute.bufferFormat
                };
              })
            };
          })
        },
        fragment: {
          module: this.shaders.fragment.module,
          entryPoint: this.options.shaders.fragment.entryPoint,
          targets: [
            {
              format: this.options.targetFormat ?? this.renderer.options.preferredFormat,
              ...blend && {
                blend
              }
            }
          ]
        },
        primitive: {
          topology: this.options.topology,
          frontFace: this.options.verticesOrder,
          cullMode: this.options.cullMode
        },
        ...this.options.depth && {
          depthStencil: {
            depthWriteEnabled: this.options.depthWriteEnabled,
            depthCompare: this.options.depthCompare,
            format: "depth24plus"
          }
        },
        ...this.options.sampleCount > 1 && {
          multisample: {
            count: this.options.sampleCount
          }
        }
      };
    }
    /**
     * Create the render {@link pipeline}
     */
    createRenderPipeline() {
      if (!this.shaders.vertex.module || !this.shaders.fragment.module)
        return;
      try {
        this.pipeline = this.renderer.createRenderPipeline(this.descriptor);
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Asynchronously create the render {@link pipeline}
     * @async
     * @returns - void promise result
     */
    async createRenderPipelineAsync() {
      if (!this.shaders.vertex.module || !this.shaders.fragment.module)
        return;
      try {
        this.pipeline = await this.renderer.createRenderPipelineAsync(this.descriptor);
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our render {@link pipeline}
     * @async
     */
    async compilePipelineEntry() {
      super.compilePipelineEntry();
      if (this.options.useAsync) {
        await this.createRenderPipelineAsync();
      } else {
        this.createRenderPipeline();
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      }
    }
  }
  class ComputePipelineEntry extends PipelineEntry {
    /**
     * ComputePipelineEntry constructor
     * @param parameters - {@link PipelineEntryParams | parameters} used to create this {@link ComputePipelineEntry}
     */
    constructor(parameters) {
      let { renderer } = parameters;
      const { label } = parameters;
      renderer = renderer && renderer.renderer || renderer;
      const type = "ComputePipelineEntry";
      isRenderer(renderer, label ? label + " " + type : type);
      super(parameters);
      this.type = type;
      this.shaders = {
        compute: {
          head: "",
          code: "",
          module: null
        }
      };
      this.descriptor = null;
    }
    /**
     * Set {@link ComputePipelineEntry} properties (in this case the {@link bindGroups | bind groups})
     * @param parameters - the {@link core/materials/ComputeMaterial.ComputeMaterial#bindGroups | bind groups} to use
     */
    setPipelineEntryProperties(parameters) {
      const { bindGroups } = parameters;
      this.setPipelineEntryBindGroups(bindGroups);
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the {@link bindGroups | bind groups}) WGSL code fragments to the given {@link PipelineEntryParams#shaders | parameter shader code}
     */
    patchShaders() {
      this.shaders.compute.head = "";
      this.shaders.compute.code = "";
      const groupsBindings = [];
      this.bindGroups.forEach((bindGroup) => {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              visibility: binding.visibility,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      });
      groupsBindings.forEach((groupBinding) => {
        if (groupBinding.wgslStructFragment && this.shaders.compute.head.indexOf(groupBinding.wgslStructFragment) === -1) {
          this.shaders.compute.head = `
${groupBinding.wgslStructFragment}
${this.shaders.compute.head}`;
        }
        if (this.shaders.compute.head.indexOf(groupBinding.wgslGroupFragment) === -1) {
          this.shaders.compute.head = `${this.shaders.compute.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
        }
        if (groupBinding.newLine)
          this.shaders.compute.head += `
`;
      });
      this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code;
    }
    /* SETUP */
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      this.shaders.compute.module = this.createShaderModule({
        code: this.shaders.compute.code,
        type: "compute"
      });
    }
    /**
     * Create the compute pipeline {@link descriptor}
     */
    createPipelineDescriptor() {
      if (!this.shaders.compute.module)
        return;
      this.descriptor = {
        label: this.options.label,
        layout: this.layout,
        compute: {
          module: this.shaders.compute.module,
          entryPoint: this.options.shaders.compute.entryPoint
        }
      };
    }
    /**
     * Create the compute {@link pipeline}
     */
    createComputePipeline() {
      if (!this.shaders.compute.module)
        return;
      try {
        this.pipeline = this.renderer.createComputePipeline(this.descriptor);
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Asynchronously create the compute {@link pipeline}
     * @async
     * @returns - void promise result
     */
    async createComputePipelineAsync() {
      if (!this.shaders.compute.module)
        return;
      try {
        this.pipeline = await this.renderer.createComputePipelineAsync(this.descriptor);
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      } catch (error) {
        this.status.error = error;
        throwError(error);
      }
    }
    /**
     * Call {@link PipelineEntry#compilePipelineEntry | PipelineEntry compilePipelineEntry} method, then create our compute {@link pipeline}
     * @async
     */
    async compilePipelineEntry() {
      super.compilePipelineEntry();
      if (this.options.useAsync) {
        await this.createComputePipelineAsync();
      } else {
        this.createComputePipeline();
        this.status.compiled = true;
        this.status.compiling = false;
        this.status.error = null;
      }
    }
  }
  class PipelineManager {
    constructor() {
      this.type = "PipelineManager";
      this.currentPipelineIndex = null;
      this.pipelineEntries = [];
    }
    /**
     * Checks if the provided {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - {@link RenderPipelineEntryBaseParams | RenderPipelineEntry parameters}
     * @returns - the found {@link RenderPipelineEntry}, or null if not found
     */
    isSameRenderPipeline(parameters) {
      const {
        shaders,
        cullMode,
        depth,
        depthWriteEnabled,
        depthCompare,
        transparent,
        verticesOrder,
        topology,
        sampleCount
      } = parameters;
      return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
        const { options } = pipelineEntry;
        return shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 && shaders.vertex.entryPoint === options.shaders.vertex.entryPoint && shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 && shaders.fragment.entryPoint === options.shaders.fragment.entryPoint && cullMode === options.cullMode && depth === options.depth && depthWriteEnabled === options.depthWriteEnabled && depthCompare === options.depthCompare && transparent === options.transparent && sampleCount === options.sampleCount && verticesOrder === options.verticesOrder && topology === options.topology;
      });
    }
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created
     */
    createRenderPipeline(parameters) {
      const existingPipelineEntry = this.isSameRenderPipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new RenderPipelineEntry(parameters);
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Checks if the provided {@link PipelineEntryParams | parameters} belongs to an already created {@link ComputePipelineEntry}.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
     * @returns - the found {@link ComputePipelineEntry}, or null if not found
     */
    isSameComputePipeline(parameters) {
      const { shaders } = parameters;
      return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof ComputePipelineEntry).find((pipelineEntry) => {
        const { options } = pipelineEntry;
        return shaders.compute.code.localeCompare(options.shaders.compute.code) === 0 && shaders.compute.entryPoint === options.shaders.compute.entryPoint;
      });
    }
    /**
     * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(parameters) {
      const existingPipelineEntry = this.isSameComputePipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new ComputePipelineEntry(parameters);
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Check if the given {@link AllowedPipelineEntries | PipelineEntry} is already set, if not set it
     * @param pass - current pass encoder
     * @param pipelineEntry - the {@link AllowedPipelineEntries | PipelineEntry} to set
     */
    setCurrentPipeline(pass, pipelineEntry) {
      if (pipelineEntry.index !== this.currentPipelineIndex) {
        pass.setPipeline(pipelineEntry.pipeline);
        this.currentPipelineIndex = pipelineEntry.index;
      }
    }
    /**
     * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
     */
    resetCurrentPipeline() {
      this.currentPipelineIndex = null;
    }
  }
  class ResizeManager {
    /**
     * ResizeManager constructor
     */
    constructor() {
      this.shouldWatch = true;
      this.entries = [];
      this.resizeObserver = new ResizeObserver((observedEntries) => {
        const allEntries = observedEntries.map((observedEntry) => {
          return this.entries.filter((e) => e.element.isSameNode(observedEntry.target));
        }).flat().sort((a, b) => b.priority - a.priority);
        allEntries == null ? void 0 : allEntries.forEach((entry) => {
          if (entry && entry.callback) {
            entry.callback();
          }
        });
      });
    }
    /**
     * Set {@link shouldWatch}
     * @param shouldWatch - whether to watch or not
     */
    useObserver(shouldWatch = true) {
      this.shouldWatch = shouldWatch;
    }
    /**
     * Track an {@link HTMLElement} size change and execute a callback function when it happens
     * @param entry - {@link ResizeManagerEntry | entry} to watch
     */
    observe({ element, priority, callback }) {
      if (!element || !this.shouldWatch)
        return;
      this.resizeObserver.observe(element);
      const entry = {
        element,
        priority,
        callback
      };
      this.entries.push(entry);
    }
    /**
     * Unobserve an {@link HTMLElement} and remove it from our {@link entries} array
     * @param element - {@link HTMLElement} to unobserve
     */
    unobserve(element) {
      this.resizeObserver.unobserve(element);
      this.entries = this.entries.filter((e) => !e.element.isSameNode(element));
    }
    /**
     * Destroy our {@link ResizeManager}
     */
    destroy() {
      this.resizeObserver.disconnect();
    }
  }
  const resizeManager = new ResizeManager();
  class DOMElement {
    /**
     * DOMElement constructor
     * @param parameters - {@link DOMElementParams | parameters} used to create our DOMElement
     */
    constructor({
      element = document.body,
      priority = 1,
      onSizeChanged = (boundingRect = null) => {
      },
      onPositionChanged = (boundingRect = null) => {
      }
    } = {}) {
      if (typeof element === "string") {
        this.element = document.querySelector(element);
        if (!this.element) {
          const notFoundEl = typeof element === "string" ? `'${element}' selector` : `${element} HTMLElement`;
          throwError(`DOMElement: corresponding ${notFoundEl} not found.`);
        }
      } else {
        this.element = element;
      }
      this.priority = priority;
      this.isResizing = false;
      this.onSizeChanged = onSizeChanged;
      this.onPositionChanged = onPositionChanged;
      this.resizeManager = resizeManager;
      this.resizeManager.observe({
        element: this.element,
        priority: this.priority,
        callback: () => {
          this.setSize();
        }
      });
      this.setSize();
    }
    /**
     * Check whether 2 bounding rectangles are equals
     * @param rect1 - first bounding rectangle
     * @param rect2 - second bounding rectangle
     * @returns - whether the rectangles are equals or not
     */
    compareBoundingRect(rect1, rect2) {
      return !["x", "y", "left", "top", "right", "bottom", "width", "height"].some((k) => rect1[k] !== rect2[k]);
    }
    /**
     * Get our element bounding rectangle
     */
    get boundingRect() {
      return this._boundingRect;
    }
    /**
     * Set our element bounding rectangle
     * @param boundingRect - new bounding rectangle
     */
    set boundingRect(boundingRect) {
      const isSameRect = !!this.boundingRect && this.compareBoundingRect(boundingRect, this.boundingRect);
      this._boundingRect = {
        top: boundingRect.top,
        right: boundingRect.right,
        bottom: boundingRect.bottom,
        left: boundingRect.left,
        width: boundingRect.width,
        height: boundingRect.height,
        x: boundingRect.x,
        y: boundingRect.y
      };
      if (!isSameRect) {
        this.onSizeChanged(this.boundingRect);
      }
    }
    /**
     * Update our element bounding rectangle because the scroll position has changed
     * @param delta - scroll delta values along X and Y axis
     */
    updateScrollPosition(delta = { x: 0, y: 0 }) {
      if (this.isResizing)
        return;
      this._boundingRect.top += delta.y;
      this._boundingRect.left += delta.x;
      if (delta.x || delta.y) {
        this.onPositionChanged(this.boundingRect);
      }
    }
    /**
     * Set our element bounding rectangle, either by a value or a getBoundingClientRect call
     * @param boundingRect - new bounding rectangle
     */
    setSize(boundingRect = null) {
      if (!this.element)
        return;
      this.boundingRect = boundingRect ?? this.element.getBoundingClientRect();
      this.isResizing = false;
    }
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy() {
      this.resizeManager.unobserve(this.element);
    }
  }
  const default_pass_fsWGSl = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  return textureSample(renderTexture, defaultSampler, fsInput.uv);
}`
  );
  class ShaderPass extends FullscreenPlane {
    /**
     * ShaderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - {@link ShaderPassParams | parameters} use to create this {@link ShaderPass}
     */
    constructor(renderer, parameters = {}) {
      var _a;
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
      parameters.transparent = true;
      parameters.label = parameters.label ?? "ShaderPass " + ((_a = renderer.shaderPasses) == null ? void 0 : _a.length);
      if (!parameters.shaders) {
        parameters.shaders = {};
      }
      if (!parameters.shaders.fragment) {
        parameters.shaders.fragment = {
          code: default_pass_fsWGSl,
          entryPoint: "main"
        };
      }
      parameters.depth = false;
      super(renderer, parameters);
      this.type = "ShaderPass";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
        name: "renderTexture",
        fromTexture: this.renderTarget ? this.renderTarget.renderTexture : null
      });
    }
    /**
     * Get our main {@link RenderTexture}, the one that contains our post processed content
     * @readonly
     */
    get renderTexture() {
      return this.renderTextures.find((texture) => texture.options.name === "renderTexture");
    }
    /**
     * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
     * @param renderTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
     */
    setRenderTarget(renderTarget) {
      super.setRenderTarget(renderTarget);
      if (renderTarget) {
        this.renderTexture.copy(this.renderTarget.renderTexture);
      } else {
        this.renderTexture.options.fromTexture = null;
        this.renderTexture.createTexture();
      }
    }
    /**
     * Add the {@link ShaderPass} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      this.renderer.shaderPasses.push(this);
      if (this.autoRender) {
        this.renderer.scene.addShaderPass(this);
      }
    }
    /**
     * Remove the {@link ShaderPass} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (this.renderTarget) {
        this.renderTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removeShaderPass(this);
      }
      this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid);
    }
  }
  class RenderPass {
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
     */
    constructor(renderer, {
      label = "Render Pass",
      sampleCount = 4,
      loadOp = "clear",
      clearValue = [0, 0, 0, 0],
      targetFormat,
      depth = true,
      depthTexture,
      depthLoadOp = "clear",
      depthClearValue = 1
    } = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "RenderPass");
      this.type = "RenderPass";
      this.uuid = generateUUID();
      this.renderer = renderer;
      this.options = {
        label,
        sampleCount,
        // color
        loadOp,
        clearValue,
        targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
        // depth
        depth,
        ...depthTexture !== void 0 && { depthTexture },
        depthLoadOp,
        depthClearValue
      };
      this.setClearValue(clearValue);
      if (this.options.depth) {
        this.createDepthTexture();
      }
      this.viewTexture = new RenderTexture(this.renderer, {
        label: this.options.label + " view texture",
        name: "viewTexture",
        format: this.options.targetFormat,
        sampleCount: this.options.sampleCount
      });
      this.setRenderPassDescriptor();
    }
    /**
     * Set our {@link depthTexture | depth texture}
     */
    createDepthTexture() {
      if (this.options.depthTexture) {
        this.depthTexture = this.options.depthTexture;
        return;
      }
      this.depthTexture = new RenderTexture(this.renderer, {
        label: this.options.label + " depth texture",
        name: "depthTexture",
        usage: "depthTexture",
        format: "depth24plus",
        sampleCount: this.options.sampleCount
      });
    }
    /**
     * Reset our {@link depthTexture | depth texture}
     */
    resetRenderPassDepth() {
      this.depthTexture.forceResize({
        width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
        height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
        depth: 1
      });
      this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
        label: this.depthTexture.options.label + " view"
      });
    }
    /**
     * Reset our {@link viewTexture | view texture}
     */
    resetRenderPassView() {
      this.viewTexture.forceResize({
        width: Math.floor(this.renderer.pixelRatioBoundingRect.width),
        height: Math.floor(this.renderer.pixelRatioBoundingRect.height),
        depth: 1
      });
      this.descriptor.colorAttachments[0].view = this.viewTexture.texture.createView({
        label: this.viewTexture.options.label + " view"
      });
    }
    /**
     * Set our render pass {@link descriptor}
     */
    setRenderPassDescriptor() {
      this.descriptor = {
        label: this.options.label + " descriptor",
        colorAttachments: [
          {
            // view: <- to be filled out when we set our render pass view
            view: this.viewTexture.texture.createView({
              label: this.viewTexture.options.label + " view"
            }),
            // ...(this.options.sampleCount > 1 && {
            //   resolveTarget: this.resolveTexture.texture.createView({
            //     label: this.resolveTexture.options.label + ' view',
            //   }),
            // }),
            // clear values
            clearValue: this.options.clearValue,
            // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
            // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
            loadOp: this.options.loadOp,
            // storeOp: 'store' means store the result of what we draw.
            // We could also pass 'discard' which would throw away what we draw.
            // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
            storeOp: "store"
          }
        ],
        ...this.options.depth && {
          depthStencilAttachment: {
            view: this.depthTexture.texture.createView({
              label: this.depthTexture.options.label + " view"
            }),
            depthClearValue: this.options.depthClearValue,
            // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
            depthLoadOp: this.options.depthLoadOp,
            depthStoreOp: "store"
          }
        }
      };
    }
    /**
     * Resize our {@link RenderPass}: reset its {@link RenderTexture}
     */
    resize() {
      if (this.options.depth)
        this.resetRenderPassDepth();
      this.resetRenderPassView();
    }
    /**
     * Set the {@link descriptor} {@link GPULoadOp | load operation}
     * @param loadOp - new {@link GPULoadOp | load operation} to use
     */
    setLoadOp(loadOp = "clear") {
      this.options.loadOp = loadOp;
      if (this.descriptor) {
        if (this.descriptor.colorAttachments) {
          this.descriptor.colorAttachments[0].loadOp = loadOp;
        }
      }
    }
    /**
     * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
     * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
     */
    setDepthLoadOp(depthLoadOp = "clear") {
      this.options.depthLoadOp = depthLoadOp;
      if (this.options.depth && this.descriptor.depthStencilAttachment) {
        this.descriptor.depthStencilAttachment.depthLoadOp = depthLoadOp;
      }
    }
    /**
     * Set our {@link GPUColor | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link GPUColor | clear colors value} to use
     */
    setClearValue(clearValue = [0, 0, 0, 0]) {
      if (this.renderer.alphaMode === "premultiplied") {
        const alpha = clearValue[3];
        clearValue[0] = Math.min(clearValue[0], alpha);
        clearValue[1] = Math.min(clearValue[1], alpha);
        clearValue[2] = Math.min(clearValue[2], alpha);
      } else {
        this.options.clearValue = clearValue;
      }
      if (this.descriptor && this.descriptor.colorAttachments) {
        this.descriptor.colorAttachments[0].clearValue = clearValue;
      }
    }
    /**
     * Destroy our {@link RenderPass}
     */
    destroy() {
      var _a;
      (_a = this.viewTexture) == null ? void 0 : _a.destroy();
      if (!this.options.depthTexture && this.depthTexture) {
        this.depthTexture.destroy();
      }
    }
  }
  class RenderTarget {
    /**
     * RenderTarget constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
     */
    constructor(renderer, parameters) {
      __privateAdd(this, _autoRender2, void 0);
      __privateSet(this, _autoRender2, true);
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "RenderTarget");
      this.type = "RenderTarget";
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { label, targetFormat, autoRender, ...renderPassParams } = parameters;
      this.options = {
        label,
        ...renderPassParams,
        targetFormat: targetFormat ?? this.renderer.options.preferredFormat,
        autoRender
      };
      if (autoRender !== void 0) {
        __privateSet(this, _autoRender2, autoRender);
      }
      this.renderPass = new RenderPass(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
        targetFormat: this.options.targetFormat,
        depthTexture: this.renderer.renderPass.depthTexture,
        // reuse renderer depth texture for every pass
        ...renderPassParams
      });
      this.renderTexture = new RenderTexture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : "Render Target Render Texture",
        name: "renderTexture",
        format: this.options.targetFormat
      });
      this.addToScene();
    }
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      this.renderer.renderTargets.push(this);
      if (__privateGet(this, _autoRender2)) {
        this.renderer.scene.addRenderTarget(this);
      }
    }
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (__privateGet(this, _autoRender2)) {
        this.renderer.scene.removeRenderTarget(this);
      }
      this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
    }
    /**
     * Resize our {@link renderPass} and {@link renderTexture}
     * @param boundingRect - new {@link DOMElementBoundingRect | bounding rectangle}
     */
    resize(boundingRect) {
      var _a, _b;
      this.renderPass.options.depthTexture.texture = this.renderer.renderPass.depthTexture.texture;
      (_a = this.renderPass) == null ? void 0 : _a.resize();
      (_b = this.renderTexture) == null ? void 0 : _b.resize();
    }
    /**
     * Remove our {@link RenderTarget}. Alias of {@link RenderTarget#destroy}
     */
    remove() {
      this.destroy();
    }
    /**
     * Destroy our {@link RenderTarget}
     */
    destroy() {
      var _a, _b;
      this.renderer.meshes.forEach((mesh) => {
        if (mesh.renderTarget && mesh.renderTarget.uuid === this.uuid) {
          mesh.setRenderTarget(null);
        }
      });
      this.renderer.shaderPasses.forEach((shaderPass) => {
        if (shaderPass.renderTarget && shaderPass.renderTarget.uuid === this.uuid) {
          shaderPass.renderTarget = null;
          shaderPass.setRenderTarget(null);
        }
      });
      this.removeFromScene();
      (_a = this.renderPass) == null ? void 0 : _a.destroy();
      (_b = this.renderTexture) == null ? void 0 : _b.destroy();
    }
  }
  _autoRender2 = new WeakMap();
  class PingPongPlane extends FullscreenPlane {
    /**
     * PingPongPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link PingPongPlane}
     */
    constructor(renderer, parameters = {}) {
      var _a;
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
      parameters.renderTarget = new RenderTarget(renderer, {
        label: parameters.label ? parameters.label + " render target" : "Ping Pong render target",
        depth: false,
        ...parameters.targetFormat && { targetFormat: parameters.targetFormat }
      });
      parameters.transparent = false;
      parameters.depth = false;
      parameters.label = parameters.label ?? "PingPongPlane " + ((_a = renderer.pingPongPlanes) == null ? void 0 : _a.length);
      super(renderer, parameters);
      this.type = "PingPongPlane";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
        name: "renderTexture",
        ...parameters.targetFormat && { format: parameters.targetFormat }
      });
    }
    /**
     * Get our main {@link RenderTexture}, the one that contains our ping pong content
     * @readonly
     */
    get renderTexture() {
      return this.renderTextures.find((texture) => texture.options.name === "renderTexture");
    }
    /**
     * Add the {@link PingPongPlane} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      this.renderer.pingPongPlanes.push(this);
      if (this.autoRender) {
        this.renderer.scene.addPingPongPlane(this);
      }
    }
    /**
     * Remove the {@link PingPongPlane} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (this.renderTarget) {
        this.renderTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removePingPongPlane(this);
      }
      this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
    }
  }
  class DOMObject3D extends ProjectedObject3D {
    /**
     * DOMObject3D constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
     * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
     */
    constructor(renderer, element, parameters) {
      super(renderer);
      __privateAdd(this, _DOMObjectWorldPosition, void 0);
      __privateAdd(this, _DOMObjectWorldScale, void 0);
      __privateSet(this, _DOMObjectWorldPosition, new Vec3());
      __privateSet(this, _DOMObjectWorldScale, new Vec3());
      renderer = renderer && renderer.renderer || renderer;
      isCurtainsRenderer(renderer, "DOM3DObject");
      this.renderer = renderer;
      this.size = {
        world: {
          width: 0,
          height: 0,
          top: 0,
          left: 0
        },
        document: {
          width: 0,
          height: 0,
          top: 0,
          left: 0
        }
      };
      this.watchScroll = parameters.watchScroll;
      this.camera = this.renderer.camera;
      this.setDOMElement(element);
    }
    /**
     * Set the {@link domElement | DOM Element}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setDOMElement(element) {
      this.domElement = new DOMElement({
        element,
        onSizeChanged: (boundingRect) => this.resize(boundingRect),
        onPositionChanged: (boundingRect) => this.onPositionChanged(boundingRect)
      });
    }
    /**
     * Update size and position when the {@link domElement | DOM Element} position changed
     * @param boundingRect - the new bounding rectangle
     */
    onPositionChanged(boundingRect) {
      if (this.watchScroll) {
        this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
        this.updateSizeAndPosition();
      }
    }
    /**
     * Reset the {@link domElement | DOMElement}
     * @param element - the new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    resetDOMElement(element) {
      if (this.domElement) {
        this.domElement.destroy();
      }
      this.setDOMElement(element);
    }
    /**
     * Update the {@link DOMObject3D} sizes and position
     */
    updateSizeAndPosition() {
      this.setWorldSizes();
      this.applyPosition();
      this.shouldUpdateModelMatrix();
    }
    /**
     * Update the {@link DOMObject3D} sizes, position and projection
     */
    shouldUpdateMatrixStack() {
      this.updateSizeAndPosition();
      super.shouldUpdateMatrixStack();
    }
    /**
     * Resize the {@link DOMObject3D}
     * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    resize(boundingRect) {
      var _a;
      if (!boundingRect && (!this.domElement || ((_a = this.domElement) == null ? void 0 : _a.isResizing)))
        return;
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
      this.shouldUpdateMatrixStack();
    }
    /* BOUNDING BOXES GETTERS */
    /**
     * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     * @readonly
     */
    get boundingRect() {
      return this.domElement.boundingRect;
    }
    /* TRANSFOMS */
    /**
     * Set our transforms properties and {@link Vec3#onChange | onChange vector} callbacks
     */
    setTransforms() {
      super.setTransforms();
      this.transforms.origin.model.set(0.5, 0.5, 0);
      this.transforms.origin.world = new Vec3();
      this.transforms.position.document = new Vec3();
      this.documentPosition.onChange(() => this.applyPosition());
      this.transformOrigin.onChange(() => this.setWorldTransformOrigin());
    }
    /**
     * Get the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
     */
    get documentPosition() {
      return this.transforms.position.document;
    }
    /**
     * Set the {@link DOMObject3DTransforms#position.document | additional translation relative to the document}
     * @param value - additional translation relative to the document to apply
     */
    set documentPosition(value) {
      this.transforms.position.document = value;
      this.applyPosition();
    }
    /**
     * Get the {@link domElement | DOM element} scale in world space
     * @readonly
     */
    get DOMObjectWorldScale() {
      return __privateGet(this, _DOMObjectWorldScale).clone();
    }
    /**
     * Get the {@link DOMObject3D} scale in world space (accounting for {@link scale})
     * @readonly
     */
    get worldScale() {
      return this.DOMObjectWorldScale.multiply(this.scale);
    }
    /**
     * Get the {@link DOMObject3D} position in world space
     * @readonly
     */
    get worldPosition() {
      return __privateGet(this, _DOMObjectWorldPosition).clone();
    }
    /**
     * Get the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
     */
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    /**
     * Set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
     * @param value - new transform origin
     */
    set transformOrigin(value) {
      this.transforms.origin.model = value;
      this.setWorldTransformOrigin();
    }
    /**
     * Get the {@link DOMObject3D} transform origin in world space
     */
    get worldTransformOrigin() {
      return this.transforms.origin.world;
    }
    /**
     * Set the {@link DOMObject3D} transform origin in world space
     * @param value - new world space transform origin
     */
    set worldTransformOrigin(value) {
      this.transforms.origin.world = value;
    }
    /**
     * Set the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyPosition() {
      this.applyDocumentPosition();
      super.applyPosition();
    }
    /**
     * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyDocumentPosition() {
      let worldPosition = new Vec3(0, 0, 0);
      if (!this.documentPosition.equals(worldPosition)) {
        worldPosition = this.documentToWorldSpace(this.documentPosition);
      }
      __privateGet(this, _DOMObjectWorldPosition).set(
        this.position.x + this.size.world.left + worldPosition.x,
        this.position.y + this.size.world.top + worldPosition.y,
        this.position.z + this.documentPosition.z / this.camera.CSSPerspective
      );
    }
    /**
     * Apply the transform origin and set the {@link DOMObject3D} world transform origin
     */
    applyTransformOrigin() {
      if (!this.size)
        return;
      this.setWorldTransformOrigin();
      super.applyTransformOrigin();
    }
    /* MATRICES */
    /**
     * Update the {@link modelMatrix | model matrix} accounting the {@link DOMObject3D} world position and {@link DOMObject3D} world scale
     */
    updateModelMatrix() {
      this.modelMatrix.composeFromOrigin(
        __privateGet(this, _DOMObjectWorldPosition),
        this.quaternion,
        this.scale,
        this.worldTransformOrigin
      );
      this.modelMatrix.scale(__privateGet(this, _DOMObjectWorldScale));
    }
    /**
     * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
     * @param vector - document position {@link Vec3 | vector} converted to world space
     */
    documentToWorldSpace(vector = new Vec3()) {
      return new Vec3(
        vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.screenRatio.width,
        -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.screenRatio.height,
        vector.z
      );
    }
    /**
     * Set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
     */
    setWorldSizes() {
      const containerBoundingRect = this.renderer.boundingRect;
      const planeCenter = {
        x: this.size.document.width / 2 + this.size.document.left,
        y: this.size.document.height / 2 + this.size.document.top
      };
      const containerCenter = {
        x: containerBoundingRect.width / 2 + containerBoundingRect.left,
        y: containerBoundingRect.height / 2 + containerBoundingRect.top
      };
      this.size.world = {
        width: this.size.document.width / containerBoundingRect.width * this.camera.screenRatio.width / 2,
        height: this.size.document.height / containerBoundingRect.height * this.camera.screenRatio.height / 2,
        top: (containerCenter.y - planeCenter.y) / containerBoundingRect.height * this.camera.screenRatio.height,
        left: (planeCenter.x - containerCenter.x) / containerBoundingRect.width * this.camera.screenRatio.width
      };
      __privateGet(this, _DOMObjectWorldScale).set(this.size.world.width, this.size.world.height, 1);
      this.setWorldTransformOrigin();
    }
    /**
     * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
     */
    setWorldTransformOrigin() {
      this.transforms.origin.world = new Vec3(
        (this.transformOrigin.x * 2 - 1) * // between -1 and 1
        this.size.world.width,
        -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
        this.size.world.height,
        this.transformOrigin.z
      );
      this.shouldUpdateModelMatrix();
      this.shouldUpdateProjectionMatrixStack();
    }
    /**
     * Update the {@link domElement | DOM Element} scroll position
     * @param delta - last {@link utils/ScrollManager.ScrollManager.delta | scroll delta values}
     */
    updateScrollPosition(delta = { x: 0, y: 0 }) {
      if (delta.x || delta.y) {
        this.domElement.updateScrollPosition(delta);
      }
    }
    /**
     * Destroy our {@link DOMObject3D}
     */
    destroy() {
      var _a;
      (_a = this.domElement) == null ? void 0 : _a.destroy();
    }
  }
  _DOMObjectWorldPosition = new WeakMap();
  _DOMObjectWorldScale = new WeakMap();
  const defaultDOMMeshParams = {
    autoloadSources: true,
    watchScroll: true
  };
  class DOMMesh extends ProjectedMeshBaseMixin(DOMObject3D) {
    /**
     * DOMMesh constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
     * @param parameters - {@link DOMMeshParams | parameters} used to create this {@link DOMMesh}
     */
    constructor(renderer, element, parameters) {
      super(renderer, element, { ...defaultDOMMeshParams, ...parameters });
      this._onLoadingCallback = (texture) => {
      };
      parameters = { ...defaultDOMMeshParams, ...parameters };
      renderer = renderer && renderer.renderer || renderer;
      isCurtainsRenderer(renderer, parameters.label ? parameters.label + " DOMMesh" : "DOMMesh");
      this.type = "DOMMesh";
      const { autoloadSources } = parameters;
      this.autoloadSources = autoloadSources;
      this.sourcesReady = false;
      this.setInitSources();
    }
    /**
     * Get/set whether our {@link material} and {@link geometry} are ready
     * @readonly
     */
    get ready() {
      return this._ready;
    }
    set ready(value) {
      this._ready = value;
      if (this.DOMMeshReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
    }
    /**
     * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded
     * @readonly
     */
    get sourcesReady() {
      return this._sourcesReady;
    }
    set sourcesReady(value) {
      this._sourcesReady = value;
      if (this.DOMMeshReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
    }
    /**
     * Get whether our {@link DOMMesh} is ready. A {@link DOMMesh} is ready when its {@link sourcesReady | sources are ready} and its {@link material} and {@link geometry} are ready.
     * @readonly
     */
    get DOMMeshReady() {
      return this.ready && this.sourcesReady;
    }
    /**
     * Add a {@link DOMMesh} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      super.addToScene();
      this.renderer.domMeshes.push(this);
    }
    /**
     * Remove a {@link DOMMesh} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      super.removeFromScene();
      this.renderer.domMeshes = this.renderer.domMeshes.filter(
        (m) => m.uuid !== this.uuid
      );
    }
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated {@link Texture}
     */
    setInitSources() {
      let loaderSize = 0;
      let sourcesLoaded = 0;
      if (this.autoloadSources) {
        const images = this.domElement.element.querySelectorAll("img");
        const videos = this.domElement.element.querySelectorAll("video");
        const canvases = this.domElement.element.querySelectorAll("canvas");
        loaderSize = images.length + videos.length + canvases.length;
        const onSourceUploaded = (texture) => {
          sourcesLoaded++;
          this._onLoadingCallback && this._onLoadingCallback(texture);
          if (sourcesLoaded === loaderSize) {
            this.sourcesReady = true;
          }
        };
        if (!loaderSize) {
          this.sourcesReady = true;
        }
        if (images.length) {
          images.forEach((image) => {
            const texture = this.createTexture({
              name: image.getAttribute("data-texture-name") ?? "texture" + this.textures.length
            });
            texture.onSourceUploaded(() => onSourceUploaded(texture)).loadImage(image.src);
          });
        }
        if (videos.length) {
          videos.forEach((video) => {
            const texture = this.createTexture({
              name: video.getAttribute("data-texture-name") ?? "texture" + this.textures.length
            });
            texture.onSourceUploaded(() => onSourceUploaded(texture)).loadVideo(video);
          });
        }
        if (canvases.length) {
          canvases.forEach((canvas) => {
            const texture = this.createTexture({
              name: canvas.getAttribute("data-texture-name") ?? "texture" + this.textures.length
            });
            texture.onSourceUploaded(() => onSourceUploaded(texture)).loadCanvas(canvas);
          });
        }
      } else {
        this.sourcesReady = true;
      }
    }
    /**
     * Reset/change the {@link domElement | DOM Element}
     * @param element - new {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    resetDOMElement(element) {
      if (!!element) {
        super.resetDOMElement(element);
      } else if (!element && !this.renderer.production) {
        throwWarning(
          `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
        );
      }
    }
    /**
     * Get our {@link DOMMesh#domElement | DOM Element} {@link core/DOM/DOMElement.DOMElement#boundingRect | bounding rectangle} accounting for current {@link core/renderers/GPURenderer.GPURenderer#pixelRatio | renderer pixel ratio}
     */
    get pixelRatioBoundingRect() {
      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const scaleBoundingRect = this.renderer.pixelRatio / devicePixelRatio;
      return Object.keys(this.domElement.boundingRect).reduce(
        (a, key) => ({ ...a, [key]: this.domElement.boundingRect[key] * scaleBoundingRect }),
        {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );
    }
    /**
     * Create a new {@link RenderTexture}
     * @param  options - {@link RenderTextureParams | RenderTexture parameters}
     * @returns - newly created {@link RenderTexture}
     */
    createRenderTexture(options) {
      options = {
        ...options,
        size: { width: this.pixelRatioBoundingRect.width, height: this.pixelRatioBoundingRect.height }
      };
      return super.createRenderTexture(options);
    }
    /**
     * Resize the Mesh's render textures only if they're not storage textures
     */
    resizeRenderTextures() {
      var _a;
      (_a = this.renderTextures) == null ? void 0 : _a.filter((renderTexture) => renderTexture.options.usage === "texture").forEach(
        (renderTexture) => renderTexture.resize({ width: this.pixelRatioBoundingRect.width, height: this.pixelRatioBoundingRect.height })
      );
    }
    /* EVENTS */
    /**
     * Called each time one of the initial sources associated {@link Texture#texture | GPU texture} has been uploaded to the GPU
     * @param callback - callback to call each time a {@link Texture#texture | GPU texture} has been uploaded to the GPU
     * @returns - our {@link DOMMesh}
     */
    onLoading(callback) {
      if (callback) {
        this._onLoadingCallback = callback;
      }
      return this;
    }
  }
  const defaultPlaneParams = {
    label: "Plane",
    // geometry
    instancesCount: 1,
    vertexBuffers: []
  };
  class Plane extends DOMMesh {
    /**
     * Plane constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
     * @param parameters - {@link PlaneParams | parameters} used to create this {@link Plane}
     */
    constructor(renderer, element, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isCurtainsRenderer(renderer, parameters.label ? parameters.label + " Plane" : "Plane");
      const params = { ...defaultPlaneParams, ...parameters };
      let { geometry, widthSegments, heightSegments, ...DOMMeshParams2 } = params;
      const { instancesCount, vertexBuffers, ...materialParams } = DOMMeshParams2;
      if (!geometry || geometry.type !== "PlaneGeometry") {
        widthSegments = widthSegments ?? 1;
        heightSegments = heightSegments ?? 1;
        const geometryID = widthSegments * heightSegments + widthSegments;
        if (!vertexBuffers.length) {
          geometry = cacheManager.getPlaneGeometryByID(geometryID);
        }
        if (!geometry) {
          geometry = new PlaneGeometry({ widthSegments, heightSegments, instancesCount, vertexBuffers });
          cacheManager.addPlaneGeometry(geometry);
        } else {
          geometry.instancesCount = instancesCount;
        }
      }
      super(renderer, element, { geometry, ...materialParams });
      this.type = "Plane";
    }
    /**
     * Take the pointer {@link Vec2 | vector} position relative to the document and returns it relative to our {@link Plane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer {@link Vec2 | vector} coordinates
     * @returns - raycasted {@link Vec2 | vector} coordinates relative to the {@link Plane}
     */
    mouseToPlaneCoords(mouseCoords = new Vec2()) {
      const worldMouse = {
        x: 2 * (mouseCoords.x / this.renderer.pixelRatioBoundingRect.width) - 1,
        y: 2 * (1 - mouseCoords.y / this.renderer.pixelRatioBoundingRect.height) - 1
      };
      const rayOrigin = this.camera.position.clone();
      const rayDirection = new Vec3(worldMouse.x, worldMouse.y, -0.5);
      rayDirection.unproject(this.camera);
      rayDirection.sub(rayOrigin).normalize();
      const planeNormals = new Vec3(0, 0, 1);
      planeNormals.applyQuat(this.quaternion).normalize();
      const result = new Vec3(0, 0, 0);
      const denominator = planeNormals.dot(rayDirection);
      if (Math.abs(denominator) >= 1e-4) {
        const inverseViewMatrix = this.modelMatrix.getInverse().premultiply(this.camera.viewMatrix);
        const planeOrigin = this.worldTransformOrigin.clone().add(this.worldPosition);
        const rotatedOrigin = new Vec3(
          this.worldPosition.x - planeOrigin.x,
          this.worldPosition.y - planeOrigin.y,
          this.worldPosition.z - planeOrigin.z
        );
        rotatedOrigin.applyQuat(this.quaternion);
        planeOrigin.add(rotatedOrigin);
        const distance = planeNormals.dot(planeOrigin.clone().sub(rayOrigin)) / denominator;
        result.copy(rayOrigin.add(rayDirection.multiplyScalar(distance)));
        result.applyMat4(inverseViewMatrix);
      } else {
        result.set(Infinity, Infinity, Infinity);
      }
      return new Vec2(result.x, result.y);
    }
  }
  class Scene {
    /**
     * Scene constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
     */
    constructor({ renderer }) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "Scene");
      this.renderer = renderer;
      this.computePassEntries = [];
      this.renderPassEntries = {
        /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here */
        pingPong: [],
        /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here */
        renderTarget: [],
        /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. Following entries will be created for every global {@link ShaderPass} */
        screen: [
          // add our basic scene entry
          {
            renderPass: this.renderer.renderPass,
            renderTexture: null,
            onBeforeRenderPass: null,
            onAfterRenderPass: null,
            element: null,
            // explicitly set to null
            stack: {
              unProjected: {
                opaque: [],
                transparent: []
              },
              projected: {
                opaque: [],
                transparent: []
              }
            }
          }
        ]
      };
    }
    /**
     * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
     * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test
     */
    getRenderPassEntryLength(renderPassEntry) {
      if (!renderPassEntry) {
        return 0;
      } else {
        return renderPassEntry.element ? 1 : renderPassEntry.stack.unProjected.opaque.length + renderPassEntry.stack.unProjected.transparent.length + renderPassEntry.stack.projected.opaque.length + renderPassEntry.stack.projected.transparent.length;
      }
    }
    /**
     * Add a {@link ComputePass} to our scene {@link computePassEntries} array
     * @param computePass - {@link ComputePass} to add
     */
    addComputePass(computePass) {
      this.computePassEntries.push(computePass);
      this.computePassEntries.sort((a, b) => {
        if (a.renderOrder !== b.renderOrder) {
          return a.renderOrder - b.renderOrder;
        } else {
          return a.index - b.index;
        }
      });
    }
    /**
     * Remove a {@link ComputePass} from our scene {@link computePassEntries} array
     * @param computePass - {@link ComputePass} to remove
     */
    removeComputePass(computePass) {
      this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
    }
    /**
     * Add a {@link RenderTarget} to our scene {@link renderPassEntries} renderTarget array.
     * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget RenderTexture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
     * @param renderTarget - {@link RenderTarget} to add
     */
    addRenderTarget(renderTarget) {
      if (!this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === renderTarget.renderPass.uuid))
        this.renderPassEntries.renderTarget.push({
          renderPass: renderTarget.renderPass,
          renderTexture: renderTarget.renderTexture,
          onBeforeRenderPass: null,
          onAfterRenderPass: null,
          element: null,
          // explicitly set to null
          stack: {
            unProjected: {
              opaque: [],
              transparent: []
            },
            projected: {
              opaque: [],
              transparent: []
            }
          }
        });
    }
    /**
     * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} renderTarget array.
     * @param renderTarget - {@link RenderTarget} to add
     */
    removeRenderTarget(renderTarget) {
      this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
        (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
      );
    }
    /**
     * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} renderTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
     * @param mesh - Mesh to check
     * @returns - the corresponding render pass entry {@link Stack}
     */
    getMeshProjectionStack(mesh) {
      const renderPassEntry = mesh.renderTarget ? this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
      ) : this.renderPassEntries.screen[0];
      const { stack } = renderPassEntry;
      return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
    }
    /**
     * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, position along the Z axis in case they are transparent and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
     * @param mesh - Mesh to add
     */
    addMesh(mesh) {
      const projectionStack = this.getMeshProjectionStack(mesh);
      const similarMeshes = mesh.transparent ? [...projectionStack.transparent] : [...projectionStack.opaque];
      let siblingMeshIndex = -1;
      for (let i = similarMeshes.length - 1; i >= 0; i--) {
        if (similarMeshes[i].material.pipelineEntry.index === mesh.material.pipelineEntry.index) {
          siblingMeshIndex = i + 1;
          break;
        }
      }
      siblingMeshIndex = Math.max(0, siblingMeshIndex);
      similarMeshes.splice(siblingMeshIndex, 0, mesh);
      similarMeshes.sort((a, b) => a.index - b.index);
      if ((mesh instanceof DOMMesh || mesh instanceof Plane) && mesh.transparent) {
        similarMeshes.sort(
          (a, b) => b.documentPosition.z - a.documentPosition.z
        );
      }
      similarMeshes.sort((a, b) => a.renderOrder - b.renderOrder);
      mesh.transparent ? projectionStack.transparent = similarMeshes : projectionStack.opaque = similarMeshes;
    }
    /**
     * Remove a Mesh from our {@link Scene}
     * @param mesh - Mesh to remove
     */
    removeMesh(mesh) {
      const projectionStack = this.getMeshProjectionStack(mesh);
      if (mesh.transparent) {
        projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid);
      } else {
        projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid);
      }
    }
    /**
     * Add a {@link ShaderPass} to our scene {@link renderPassEntries} screen array.
     * Before rendering the {@link ShaderPass}, we will copy the correct input texture into its {@link ShaderPass#renderTexture | renderTexture}
     * This also handles the {@link renderPassEntries} screen array entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4 | minimal code example}
     * @param shaderPass - {@link ShaderPass} to add
     */
    addShaderPass(shaderPass) {
      const onBeforeRenderPass = shaderPass.renderTarget ? null : (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTexture) {
          commandEncoder.copyTextureToTexture(
            {
              texture: swapChainTexture
            },
            {
              texture: shaderPass.renderTexture.texture
            },
            [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
          );
        }
        this.renderer.postProcessingPass.setLoadOp("clear");
      };
      const onAfterRenderPass = shaderPass.renderTarget ? (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTarget && shaderPass.renderTarget.renderTexture) {
          commandEncoder.copyTextureToTexture(
            {
              texture: swapChainTexture
            },
            {
              texture: shaderPass.renderTarget.renderTexture.texture
            },
            [shaderPass.renderTarget.renderTexture.size.width, shaderPass.renderTarget.renderTexture.size.height]
          );
        }
      } : null;
      const shaderPassEntry = {
        renderPass: this.renderer.postProcessingPass,
        // render directly to screen
        renderTexture: null,
        onBeforeRenderPass,
        onAfterRenderPass,
        element: shaderPass,
        stack: null
        // explicitly set to null
      };
      this.renderPassEntries.screen.push(shaderPassEntry);
      this.renderPassEntries.screen.sort((a, b) => {
        const isPostProA = a.element && !a.element.renderTarget;
        const renderOrderA = a.element ? a.element.renderOrder : 0;
        const indexA = a.element ? a.element.index : 0;
        const isPostProB = b.element && !b.element.renderTarget;
        const renderOrderB = b.element ? b.element.renderOrder : 0;
        const indexB = b.element ? b.element.index : 0;
        if (isPostProA && !isPostProB) {
          return 1;
        } else if (!isPostProA && isPostProB) {
          return -1;
        } else if (renderOrderA !== renderOrderB) {
          return renderOrderA - renderOrderB;
        } else {
          return indexA - indexB;
        }
      });
    }
    /**
     * Remove a {@link ShaderPass} from our scene {@link renderPassEntries} screen array
     * @param shaderPass - {@link ShaderPass} to remove
     */
    removeShaderPass(shaderPass) {
      this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
        (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
      );
    }
    /**
     * Add a {@link PingPongPlane} to our scene {@link renderPassEntries} pingPong array.
     * After rendering the {@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture | renderTexture} so we'll be able to use it as an input for the next pass
     * @see {@link https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p | minimal code example}
     * @param pingPongPlane
     */
    addPingPongPlane(pingPongPlane) {
      this.renderPassEntries.pingPong.push({
        renderPass: pingPongPlane.renderTarget.renderPass,
        renderTexture: pingPongPlane.renderTarget.renderTexture,
        onBeforeRenderPass: null,
        onAfterRenderPass: (commandEncoder, swapChainTexture) => {
          commandEncoder.copyTextureToTexture(
            {
              texture: swapChainTexture
            },
            {
              texture: pingPongPlane.renderTexture.texture
            },
            [pingPongPlane.renderTexture.size.width, pingPongPlane.renderTexture.size.height]
          );
        },
        element: pingPongPlane,
        stack: null
        // explicitly set to null
      });
      this.renderPassEntries.pingPong.sort((a, b) => a.element.renderOrder - b.element.renderOrder);
    }
    /**
     * Remove a {@link PingPongPlane} from our scene {@link renderPassEntries} pingPong array.
     * @param pingPongPlane - {@link PingPongPlane} to remove
     */
    removePingPongPlane(pingPongPlane) {
      this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
        (entry) => entry.element.uuid !== pingPongPlane.uuid
      );
    }
    /**
     * Get any rendered object or {@link RenderTarget} {@link RenderPassEntry}. Useful to override a {@link RenderPassEntry#onBeforeRenderPass | RenderPassEntry onBeforeRenderPass} or {@link RenderPassEntry#onAfterRenderPass | RenderPassEntry onAfterRenderPass} default behavior.
     * @param object - The object from which we want to get the parent {@link RenderPassEntry}
     * @returns - the {@link RenderPassEntry} if found
     */
    getObjectRenderPassEntry(object) {
      if (object instanceof RenderTarget) {
        return this.renderPassEntries.renderTarget.find((entry) => entry.renderPass.uuid === object.renderPass.uuid);
      } else if (object instanceof PingPongPlane) {
        return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid);
      } else if (object instanceof ShaderPass) {
        return this.renderPassEntries.screen.find((entry) => {
          var _a;
          return ((_a = entry.element) == null ? void 0 : _a.uuid) === object.uuid;
        });
      } else {
        const entryType = object.renderTarget ? "renderTarget" : "screen";
        return this.renderPassEntries[entryType].find((entry) => {
          return [
            ...entry.stack.unProjected.opaque,
            ...entry.stack.unProjected.transparent,
            ...entry.stack.projected.opaque,
            ...entry.stack.projected.transparent
          ].some((mesh) => mesh.uuid === object.uuid);
        });
      }
    }
    /**
     * Here we render a {@link RenderPassEntry}:
     * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
     * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
     * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
     * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link CameraRenderer#cameraBindGroup | camera bind group} and draw projected opaque / transparent meshes
     * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
     * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
     * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param renderPassEntry - {@link RenderPassEntry} to render
     */
    renderSinglePassEntry(commandEncoder, renderPassEntry) {
      var _a;
      const swapChainTexture = this.renderer.setRenderPassCurrentTexture(
        renderPassEntry.renderPass,
        (_a = renderPassEntry.renderTexture) == null ? void 0 : _a.texture
      );
      renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture);
      const pass = commandEncoder.beginRenderPass(renderPassEntry.renderPass.descriptor);
      if (renderPassEntry.element) {
        renderPassEntry.element.render(pass);
      } else if (renderPassEntry.stack) {
        renderPassEntry.stack.unProjected.opaque.forEach((mesh) => mesh.render(pass));
        renderPassEntry.stack.unProjected.transparent.forEach((mesh) => mesh.render(pass));
        if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
          if (this.renderer.cameraBindGroup) {
            pass.setBindGroup(
              this.renderer.cameraBindGroup.index,
              this.renderer.cameraBindGroup.bindGroup
            );
          }
          renderPassEntry.stack.projected.opaque.forEach((mesh) => mesh.render(pass));
          renderPassEntry.stack.projected.transparent.forEach((mesh) => mesh.render(pass));
        }
      }
      pass.end();
      renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture);
      this.renderer.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Render our {@link Scene}
     * - Render {@link computePassEntries} first
     * - Then our {@link renderPassEntries}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      this.computePassEntries.forEach((computePass) => {
        const pass = commandEncoder.beginComputePass();
        computePass.render(pass);
        pass.end();
        computePass.copyBufferToResult(commandEncoder);
        this.renderer.pipelineManager.resetCurrentPipeline();
      });
      for (const renderPassEntryType in this.renderPassEntries) {
        let passDrawnCount = 0;
        this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry, index) => {
          if (!this.getRenderPassEntryLength(renderPassEntry))
            return;
          renderPassEntry.renderPass.setLoadOp(
            renderPassEntryType === "screen" && passDrawnCount !== 0 ? "load" : "clear"
          );
          passDrawnCount++;
          this.renderSinglePassEntry(commandEncoder, renderPassEntry);
        });
      }
    }
  }
  class TasksQueueManager {
    /**
     * TaskQueueManager constructor
     */
    constructor() {
      __privateAdd(this, _taskCount, void 0);
      __privateSet(this, _taskCount, 0);
      this.queue = [];
    }
    /**
     * Add a {@link TaskQueueItem | task queue item} to the queue
     * @param callback - callback to add to the {@link TaskQueueItem | task queue item}
     * @param parameters - {@link TaskQueueItemParams | parameters} of the {@link TaskQueueItem | task queue item} to add
     * @returns - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item}, useful to later remove the task if needed
     */
    add(callback = (args) => {
    }, { order = this.queue.length, once = false } = {}) {
      const task = {
        callback,
        order,
        once,
        id: __privateGet(this, _taskCount)
      };
      __privateWrapper(this, _taskCount)._++;
      this.queue.push(task);
      this.queue.sort((a, b) => {
        return a.order - b.order;
      });
      return task.id;
    }
    /**
     * Remove a {@link TaskQueueItem | task queue item} from the queue
     * @param taskId - {@link TaskQueueItem#id | id} of the new {@link TaskQueueItem | task queue item} to remove
     */
    remove(taskId = 0) {
      this.queue = this.queue.filter((task) => task.id !== taskId);
    }
    /**
     * Execute the {@link TasksQueueManager#queue | tasks queue array}
     */
    execute(args) {
      this.queue.forEach((task) => {
        task.callback(args);
        if (task.once) {
          this.remove(task.id);
        }
      });
    }
  }
  _taskCount = new WeakMap();
  class GPURenderer {
    /**
     * GPURenderer constructor
     * @param parameters - {@link GPURendererParams | parameters} used to create this {@link GPURenderer}
     */
    constructor({
      deviceManager,
      container,
      pixelRatio = 1,
      preferredFormat,
      alphaMode = "premultiplied",
      multisampled = true,
      renderPass
    }) {
      var _a;
      this._onBeforeRenderCallback = (commandEncoder) => {
      };
      this._onAfterRenderCallback = (commandEncoder) => {
      };
      this._onAfterResizeCallback = () => {
      };
      this.type = "GPURenderer";
      this.uuid = generateUUID();
      this.deviceManager = deviceManager;
      this.deviceManager.addRenderer(this);
      renderPass = { ...{ depth: true, sampleCount: 4, clearValue: [0, 0, 0, 0] }, ...renderPass };
      preferredFormat = preferredFormat ?? ((_a = this.deviceManager.gpu) == null ? void 0 : _a.getPreferredCanvasFormat());
      this.options = {
        deviceManager,
        container,
        pixelRatio,
        preferredFormat,
        alphaMode,
        multisampled,
        renderPass
      };
      this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
      this.alphaMode = alphaMode;
      this.setTasksQueues();
      this.setRendererObjects();
      const isContainerCanvas = container instanceof HTMLCanvasElement;
      this.canvas = isContainerCanvas ? container : document.createElement("canvas");
      this.domElement = new DOMElement({
        element: container,
        priority: 5,
        // renderer callback need to be called first
        onSizeChanged: (boundingRect) => this.resize(boundingRect)
      });
      if (!isContainerCanvas) {
        this.domElement.element.appendChild(this.canvas);
      }
      if (this.deviceManager.device) {
        this.setContext();
      }
    }
    /**
     * Set {@link canvas} size
     * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    setSize(boundingRect) {
      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const scaleBoundingRect = this.pixelRatio / devicePixelRatio;
      this.canvas.style.width = Math.floor(boundingRect.width) + "px";
      this.canvas.style.height = Math.floor(boundingRect.height) + "px";
      const renderingSize = {
        width: Math.floor(boundingRect.width * scaleBoundingRect),
        height: Math.floor(boundingRect.height * scaleBoundingRect)
      };
      this.canvas.width = this.device ? Math.min(renderingSize.width, this.device.limits.maxTextureDimension2D) : renderingSize.width;
      this.canvas.height = this.device ? Math.min(renderingSize.height, this.device.limits.maxTextureDimension2D) : renderingSize.height;
    }
    /**
     * Resize our {@link GPURenderer}
     * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    resize(boundingRect = null) {
      if (!this.domElement && !boundingRect)
        return;
      if (!boundingRect)
        boundingRect = this.domElement.element.getBoundingClientRect();
      this.setSize(boundingRect);
      this.onResize();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /**
     * Resize all tracked objects
     */
    onResize() {
      var _a, _b;
      (_a = this.renderPass) == null ? void 0 : _a.resize();
      (_b = this.postProcessingPass) == null ? void 0 : _b.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize(this.pixelRatioBoundingRect));
      this.renderTextures.forEach((renderTexture) => renderTexture.resize());
      this.computePasses.forEach((computePass) => computePass.resize());
      this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
      this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
      this.meshes.forEach((mesh) => {
        if (!("domElement" in mesh)) {
          mesh.resize(this.boundingRect);
        } else {
          this.onBeforeCommandEncoderCreation.add(
            () => {
              if (!mesh.domElement.isResizing) {
                mesh.domElement.setSize();
              }
            },
            { once: true }
          );
        }
      });
    }
    /**
     * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    get boundingRect() {
      var _a;
      if (!!this.domElement.boundingRect) {
        return this.domElement.boundingRect;
      } else {
        const boundingRect = (_a = this.domElement.element) == null ? void 0 : _a.getBoundingClientRect();
        return {
          top: boundingRect.top,
          right: boundingRect.right,
          bottom: boundingRect.bottom,
          left: boundingRect.left,
          width: boundingRect.width,
          height: boundingRect.height,
          x: boundingRect.x,
          y: boundingRect.y
        };
      }
    }
    /**
     * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle} accounting for current {@link pixelRatio | pixel ratio}
     */
    get pixelRatioBoundingRect() {
      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const scaleBoundingRect = this.pixelRatio / devicePixelRatio;
      return Object.keys(this.boundingRect).reduce(
        (a, key) => ({ ...a, [key]: this.boundingRect[key] * scaleBoundingRect }),
        {
          x: 0,
          y: 0,
          width: 0,
          height: 0,
          top: 0,
          right: 0,
          bottom: 0,
          left: 0
        }
      );
    }
    /* USEFUL DEVICE MANAGER OBJECTS */
    /**
     * Get our {@link GPUDeviceManager#device | device}
     * @readonly
     */
    get device() {
      return this.deviceManager.device;
    }
    /**
     * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) and its size is set
     * @readonly
     */
    get ready() {
      return this.deviceManager.ready && !!this.canvas.style.width;
    }
    /**
     * Get our {@link GPUDeviceManager#production | GPUDeviceManager production flag}
     * @readonly
     */
    get production() {
      return this.deviceManager.production;
    }
    /**
     * Get all the created {@link GPUDeviceManager#samplers | samplers}
     * @readonly
     */
    get samplers() {
      return this.deviceManager.samplers;
    }
    /**
     * Get all the created {@link GPUDeviceManager#buffers | GPU buffers}
     * @readonly
     */
    get buffers() {
      return this.deviceManager.buffers;
    }
    /**
     * Get the {@link GPUDeviceManager#pipelineManager | pipeline manager}
     * @readonly
     */
    get pipelineManager() {
      return this.deviceManager.pipelineManager;
    }
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by the {@link GPUDeviceManager}
     * @readonly
     */
    get deviceRenderedObjects() {
      return this.deviceManager.deviceRenderedObjects;
    }
    /**
     * Configure our {@link context} with the given options
     */
    configureContext() {
      this.context.configure({
        device: this.device,
        format: this.options.preferredFormat,
        alphaMode: this.alphaMode,
        // needed so we can copy textures for post processing usage
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
        //viewFormats: []
      });
    }
    /**
     * Set our {@link context} if possible and set {@link renderPass | main render pass} and {@link scene}
     */
    setContext() {
      this.context = this.canvas.getContext("webgpu");
      if (this.device) {
        this.configureContext();
        this.setMainRenderPasses();
        this.setScene();
      }
    }
    /**
     * Called when the {@link GPUDeviceManager#device | device} is lost.
     * Force all our scene objects to lose context.
     */
    loseContext() {
      this.renderedObjects.forEach((sceneObject) => sceneObject.loseContext());
    }
    /**
     * Called when the {@link GPUDeviceManager#device | device} should be restored.
     * Configure the context again, resize the {@link RenderTarget | render targets} and {@link RenderTexture | render textures}, restore our {@link renderedObjects | rendered objects} context.
     * @async
     */
    restoreContext() {
      var _a, _b;
      this.configureContext();
      this.renderTextures.forEach((renderTexture) => {
        renderTexture.forceResize({
          width: Math.floor(this.pixelRatioBoundingRect.width),
          height: Math.floor(this.pixelRatioBoundingRect.height),
          depth: 1
        });
      });
      (_a = this.renderPass) == null ? void 0 : _a.resize();
      (_b = this.postProcessingPass) == null ? void 0 : _b.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize(this.pixelRatioBoundingRect));
      this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext());
    }
    /* PIPELINES, SCENE & MAIN RENDER PASS */
    /**
     * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen
     */
    setMainRenderPasses() {
      this.renderPass = new RenderPass(this, {
        label: "Main render pass",
        targetFormat: this.options.preferredFormat,
        ...this.options.renderPass
      });
      this.postProcessingPass = new RenderPass(this, {
        label: "Post processing render pass",
        targetFormat: this.options.preferredFormat,
        depth: false,
        sampleCount: this.options.renderPass.sampleCount
        // TODO?
      });
    }
    /**
     * Set our {@link scene}
     */
    setScene() {
      this.scene = new Scene({ renderer: this });
    }
    /* BUFFERS & BINDINGS */
    /**
     * Create a {@link GPUBuffer}
     * @param bufferDescriptor - {@link GPUBufferDescriptor | GPU buffer descriptor}
     * @returns - newly created {@link GPUBuffer}
     */
    createBuffer(bufferDescriptor) {
      var _a;
      const buffer = (_a = this.device) == null ? void 0 : _a.createBuffer(bufferDescriptor);
      this.deviceManager.addBuffer(buffer);
      return buffer;
    }
    /**
     * Remove a {@link GPUBuffer} from our {@link GPUDeviceManager#buffers | GPU buffers array}
     * @param buffer - {@link GPUBuffer} to remove
     * @param [originalLabel] - original {@link GPUBuffer} label in case the buffer has been swapped and its label has changed
     */
    removeBuffer(buffer, originalLabel) {
      this.deviceManager.removeBuffer(buffer, originalLabel);
    }
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - {@link GPUSize64 | buffer offset}
     * @param data - {@link BufferSource | data} to write
     */
    queueWriteBuffer(buffer, bufferOffset, data) {
      var _a;
      (_a = this.device) == null ? void 0 : _a.queue.writeBuffer(buffer, bufferOffset, data);
    }
    /**
     * Copy a source {@link GPUBuffer} into a destination {@link GPUBuffer}
     * @param parameters - parameters used to realize the copy
     * @param parameters.srcBuffer - source {@link GPUBuffer}
     * @param [parameters.dstBuffer] - destination {@link GPUBuffer}. Will create a new one if none provided.
     * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
     * @returns - destination {@link GPUBuffer} after copy
     */
    copyBufferToBuffer({
      srcBuffer,
      dstBuffer,
      commandEncoder
    }) {
      var _a, _b;
      if (!srcBuffer) {
        throwWarning(`${this.type}: cannot copy to buffer because the source buffer has not been provided`);
        return null;
      }
      if (!dstBuffer) {
        dstBuffer = this.createBuffer({
          label: this.type + ": destination copy buffer from: " + srcBuffer.label,
          size: srcBuffer.size,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
      }
      if (srcBuffer.mapState !== "unmapped") {
        throwWarning(`${this.type}: Cannot copy from ${srcBuffer} because it is currently mapped`);
        return;
      }
      if (dstBuffer.mapState !== "unmapped") {
        throwWarning(`${this.type}: Cannot copy from ${dstBuffer} because it is currently mapped`);
        return;
      }
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = (_a = this.device) == null ? void 0 : _a.createCommandEncoder({ label: "Copy buffer command encoder" });
      }
      commandEncoder.copyBufferToBuffer(srcBuffer, 0, dstBuffer, 0, dstBuffer.size);
      if (!hasCommandEncoder) {
        const commandBuffer = commandEncoder.finish();
        (_b = this.device) == null ? void 0 : _b.queue.submit([commandBuffer]);
      }
      return dstBuffer;
    }
    /* BIND GROUPS & LAYOUTS */
    /**
     * Get all created {@link AllowedBindGroups | bind group} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get bindGroups() {
      return this.deviceManager.bindGroups;
    }
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link GPUDeviceManager#bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add
     */
    addBindGroup(bindGroup) {
      this.deviceManager.addBindGroup(bindGroup);
    }
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link GPUDeviceManager#bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
     */
    removeBindGroup(bindGroup) {
      this.deviceManager.removeBindGroup(bindGroup);
    }
    /**
     * Create a {@link GPUBindGroupLayout}
     * @param bindGroupLayoutDescriptor - {@link GPUBindGroupLayoutDescriptor | GPU bind group layout descriptor}
     * @returns - newly created {@link GPUBindGroupLayout}
     */
    createBindGroupLayout(bindGroupLayoutDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    /**
     * Create a {@link GPUBindGroup}
     * @param bindGroupDescriptor - {@link GPUBindGroupDescriptor | GPU bind group descriptor}
     * @returns - newly created {@link GPUBindGroup}
     */
    createBindGroup(bindGroupDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createBindGroup(bindGroupDescriptor);
    }
    /* SHADERS & PIPELINES */
    /**
     * Create a {@link GPUShaderModule}
     * @param shaderModuleDescriptor - {@link shaderModuleDescriptor | shader module descriptor}
     * @returns - newly created {@link GPUShaderModule}
     */
    createShaderModule(shaderModuleDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createShaderModule(shaderModuleDescriptor);
    }
    /**
     * Create a {@link GPUPipelineLayout}
     * @param pipelineLayoutDescriptor - {@link GPUPipelineLayoutDescriptor | GPU pipeline layout descriptor}
     * @returns - newly created {@link GPUPipelineLayout}
     */
    createPipelineLayout(pipelineLayoutDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createPipelineLayout(pipelineLayoutDescriptor);
    }
    /**
     * Create a {@link GPURenderPipeline}
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipeline(pipelineDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createRenderPipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPURenderPipeline}
     * @async
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    async createRenderPipelineAsync(pipelineDescriptor) {
      var _a;
      return await ((_a = this.device) == null ? void 0 : _a.createRenderPipelineAsync(pipelineDescriptor));
    }
    /**
     * Create a {@link GPUComputePipeline}
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipeline(pipelineDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createComputePipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPUComputePipeline}
     * @async
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    async createComputePipelineAsync(pipelineDescriptor) {
      var _a;
      return await ((_a = this.device) == null ? void 0 : _a.createComputePipelineAsync(pipelineDescriptor));
    }
    /* TEXTURES */
    /**
     * Get all created {@link Texture} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get textures() {
      return this.deviceManager.textures;
    }
    /**
     * Add a {@link Texture} to our {@link GPUDeviceManager#textures | textures array}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.deviceManager.addTexture(texture);
    }
    /**
     * Remove a {@link Texture} from our {@link GPUDeviceManager#textures | textures array}
     * @param texture - {@link Texture} to remove
     */
    removeTexture(texture) {
      this.deviceManager.removeTexture(texture);
    }
    /**
     * Add a {@link RenderTexture} to our {@link renderTextures} array
     * @param texture - {@link RenderTexture} to add
     */
    addRenderTexture(texture) {
      this.renderTextures.push(texture);
    }
    /**
     * Remove a {@link RenderTexture} from our {@link renderTextures} array
     * @param texture - {@link RenderTexture} to remove
     */
    removeRenderTexture(texture) {
      this.renderTextures = this.renderTextures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Create a {@link GPUTexture}
     * @param textureDescriptor - {@link GPUTextureDescriptor | GPU texture descriptor}
     * @returns - newly created {@link GPUTexture}
     */
    createTexture(textureDescriptor) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.createTexture(textureDescriptor);
    }
    /**
     * Upload a {@link Texture#texture | texture} to the GPU
     * @param texture - {@link Texture} class object with the {@link Texture#texture | texture} to upload
     */
    uploadTexture(texture) {
      this.deviceManager.uploadTexture(texture);
    }
    /**
     * Import a {@link GPUExternalTexture}
     * @param video - {@link HTMLVideoElement} source
     * @returns - {@link GPUExternalTexture}
     */
    importExternalTexture(video) {
      var _a;
      return (_a = this.device) == null ? void 0 : _a.importExternalTexture({ source: video });
    }
    /**
     * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
     * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
     * @param sampler - {@link Sampler} to create
     * @returns - the {@link GPUSampler}
     */
    createSampler(sampler) {
      var _a;
      const existingSampler = this.samplers.find((existingSampler2) => {
        return JSON.stringify(existingSampler2.options) === JSON.stringify(sampler.options) && existingSampler2.sampler;
      });
      if (existingSampler) {
        return existingSampler.sampler;
      } else {
        const { type, ...samplerOptions } = sampler.options;
        const gpuSampler = (_a = this.device) == null ? void 0 : _a.createSampler({
          label: sampler.label,
          ...samplerOptions
        });
        this.deviceManager.addSampler(sampler);
        return gpuSampler;
      }
    }
    /**
     * Remove a {@link Sampler} from our {@link GPUDeviceManager#samplers | samplers array}
     * @param sampler - {@link Sampler} to remove
     */
    removeSampler(sampler) {
      this.deviceManager.removeSampler(sampler);
    }
    /* OBJECTS & TASKS */
    /**
     * Set different tasks queue managers to execute callbacks at different phases of our render call:
     * - {@link onBeforeCommandEncoderCreation}: callbacks executed before the creation of the command encoder
     * - {@link onBeforeRenderScene}: callbacks executed after the creation of the command encoder and before rendering the {@link Scene}
     * - {@link onAfterRenderScene}: callbacks executed after the creation of the command encoder and after rendering the {@link Scene}
     * - {@link onAfterCommandEncoderSubmission}: callbacks executed after the submission of the command encoder
     */
    setTasksQueues() {
      this.onBeforeCommandEncoderCreation = new TasksQueueManager();
      this.onBeforeRenderScene = new TasksQueueManager();
      this.onAfterRenderScene = new TasksQueueManager();
      this.onAfterCommandEncoderSubmission = new TasksQueueManager();
    }
    /**
     * Set all objects arrays that we'll keep track of
     */
    setRendererObjects() {
      this.computePasses = [];
      this.pingPongPlanes = [];
      this.shaderPasses = [];
      this.renderTargets = [];
      this.meshes = [];
      this.renderTextures = [];
    }
    /**
     * Get all this {@link GPURenderer} rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes)
     * @readonly
     */
    get renderedObjects() {
      return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes];
    }
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup) {
      return this.deviceRenderedObjects.filter((object) => {
        return [
          ...object.material.bindGroups,
          ...object.material.inputsBindGroups,
          ...object.material.clonedBindGroups
        ].some((bG) => bG.uuid === bindGroup.uuid);
      });
    }
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link Texture} or {@link RenderTexture}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param texture - {@link Texture} or {@link RenderTexture} to check
     */
    getObjectsByTexture(texture) {
      return this.deviceRenderedObjects.filter((object) => {
        return [...object.material.textures, ...object.material.renderTextures].some((t) => t.uuid === texture.uuid);
      });
    }
    /* EVENTS */
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before the {@link render} method will be executed
     * @returns - our {@link GPURenderer}
     */
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onAfterRenderCallback
     * @param callback - callback to run just after the {@link render} method has been executed
     * @returns - our {@link GPURenderer}
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /**
     * Assign a callback function to _onAfterResizeCallback
     * @param callback - callback to run just after the {@link GPURenderer} has been resized
     * @returns - our {@link GPURenderer}
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Set the current {@link RenderPass#descriptor | render pass descriptor} texture {@link GPURenderPassColorAttachment#view | view} and {@link GPURenderPassColorAttachment#resolveTarget | resolveTarget} (depending on whether we're using multisampling)
     * @param renderPass - current {@link RenderPass}
     * @param renderTexture - {@link GPUTexture} to use, or the {@link context} {@link GPUTexture | current texture} if null
     * @returns - the {@link GPUTexture | current render texture}
     */
    setRenderPassCurrentTexture(renderPass, renderTexture = null) {
      if (!renderTexture) {
        renderTexture = this.context.getCurrentTexture();
        renderTexture.label = `${this.type} context current texture`;
      }
      if (renderPass.options.sampleCount > 1) {
        renderPass.descriptor.colorAttachments[0].view = renderPass.viewTexture.texture.createView({
          label: renderPass.viewTexture.options.label + " view"
        });
        renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView({
          label: renderTexture.label + " resolve target view"
        });
      } else {
        renderPass.descriptor.colorAttachments[0].view = renderTexture.createView({
          label: renderTexture.label + " view"
        });
      }
      return renderTexture;
    }
    /**
     * Render a single {@link ComputePass}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param computePass - {@link ComputePass}
     */
    renderSingleComputePass(commandEncoder, computePass) {
      const pass = commandEncoder.beginComputePass();
      computePass.render(pass);
      pass.end();
      computePass.copyBufferToResult(commandEncoder);
    }
    /**
     * Render a single {@link RenderedMesh | Mesh}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - {@link RenderedMesh | Mesh} to render
     */
    renderSingleMesh(commandEncoder, mesh) {
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      mesh.render(pass);
      pass.end();
    }
    /**
     * Render an array of objects (either {@link RenderedMesh | Meshes} or {@link ComputePass}) once. This method won't call any of the renderer render hooks like {@link onBeforeRender}, {@link onAfterRender}
     * @param objects - Array of {@link RenderedMesh | Meshes} or {@link ComputePass} to render
     */
    renderOnce(objects) {
      var _a, _b;
      const commandEncoder = (_a = this.device) == null ? void 0 : _a.createCommandEncoder({
        label: "Renderer once command encoder"
      });
      this.pipelineManager.resetCurrentPipeline();
      objects.forEach((object) => {
        if (object instanceof ComputePass) {
          this.renderSingleComputePass(commandEncoder, object);
        } else {
          this.renderSingleMesh(commandEncoder, object);
        }
      });
      const commandBuffer = commandEncoder.finish();
      (_b = this.device) == null ? void 0 : _b.queue.submit([commandBuffer]);
      this.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
     * @param commandEncoder
     */
    forceClear(commandEncoder) {
      var _a, _b;
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = (_a = this.device) == null ? void 0 : _a.createCommandEncoder({ label: "Force clear command encoder" });
      }
      this.setRenderPassCurrentTexture(this.renderPass);
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      pass.end();
      if (!hasCommandEncoder) {
        const commandBuffer = commandEncoder.finish();
        (_b = this.device) == null ? void 0 : _b.queue.submit([commandBuffer]);
      }
    }
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} before the {@link GPUCommandEncoder} has been created
     */
    onBeforeCommandEncoder() {
      if (!this.ready)
        return;
      this.onBeforeCommandEncoderCreation.execute();
    }
    /**
     * Called by the {@link GPUDeviceManager#render | GPUDeviceManager render method} after the {@link GPUCommandEncoder} has been created.
     */
    onAfterCommandEncoder() {
      if (!this.ready)
        return;
      this.onAfterCommandEncoderSubmission.execute();
    }
    /**
     * Called at each draw call to render our scene and its content
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      if (!this.ready)
        return;
      this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
      this.onBeforeRenderScene.execute(commandEncoder);
      this.scene.render(commandEncoder);
      this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
      this.onAfterRenderScene.execute(commandEncoder);
    }
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
     */
    destroy() {
      var _a, _b, _c, _d;
      (_a = this.domElement) == null ? void 0 : _a.destroy();
      (_b = this.renderPass) == null ? void 0 : _b.destroy();
      (_c = this.postProcessingPass) == null ? void 0 : _c.destroy();
      this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
      this.renderedObjects.forEach((sceneObject) => sceneObject.remove());
      this.renderTextures.forEach((texture) => texture.destroy());
      (_d = this.context) == null ? void 0 : _d.unconfigure();
    }
  }
  class GPUCameraRenderer extends GPURenderer {
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({
      deviceManager,
      container,
      pixelRatio = 1,
      preferredFormat,
      alphaMode = "premultiplied",
      multisampled = true,
      renderPass,
      camera = {}
    }) {
      super({
        deviceManager,
        container,
        pixelRatio,
        preferredFormat,
        alphaMode,
        multisampled,
        renderPass
      });
      this.type = "GPUCameraRenderer";
      camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera };
      this.options = {
        ...this.options,
        camera
      };
      this.setCamera(camera);
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext() {
      super.loseContext();
      this.cameraBindGroup.loseContext();
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} should be restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/RenderTexture.RenderTexture | render textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBufferBinding | camera buffer binding}.
     * @async
     */
    async restoreContext() {
      this.cameraBufferBinding.shouldUpdate = true;
      return super.restoreContext();
    }
    /**
     * Set the {@link camera}
     * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
     */
    setCamera(cameraParameters) {
      const width = this.boundingRect ? this.boundingRect.width : 1;
      const height = this.boundingRect ? this.boundingRect.height : 1;
      this.camera = new Camera({
        fov: cameraParameters.fov,
        near: cameraParameters.near,
        far: cameraParameters.far,
        width,
        height,
        pixelRatio: this.pixelRatio,
        onMatricesChanged: () => {
          this.onCameraMatricesChanged();
        }
      });
      this.setCameraBufferBinding();
    }
    /**
     * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
     */
    onCameraMatricesChanged() {
      this.updateCameraBindings();
      this.meshes.forEach((mesh) => {
        if ("modelViewMatrix" in mesh) {
          mesh.shouldUpdateMatrixStack();
        }
      });
    }
    /**
     * Set the {@link cameraBufferBinding | camera buffer binding} and {@link cameraBindGroup | camera bind group}
     */
    setCameraBufferBinding() {
      this.cameraBufferBinding = new BufferBinding({
        label: "Camera",
        name: "camera",
        visibility: "vertex",
        struct: {
          model: {
            // camera model matrix
            name: "model",
            type: "mat4x4f",
            value: this.camera.modelMatrix,
            onBeforeUpdate: () => {
              this.cameraBufferBinding.inputs.model.value = this.camera.modelMatrix;
            }
          },
          view: {
            // camera view matrix
            name: "view",
            type: "mat4x4f",
            value: this.camera.viewMatrix,
            onBeforeUpdate: () => {
              this.cameraBufferBinding.inputs.view.value = this.camera.viewMatrix;
            }
          },
          projection: {
            // camera projection matrix
            name: "projection",
            type: "mat4x4f",
            value: this.camera.projectionMatrix,
            onBeforeUpdate: () => {
              this.cameraBufferBinding.inputs.projection.value = this.camera.projectionMatrix;
            }
          }
        }
      });
      this.cameraBindGroup = new BindGroup(this, {
        label: "Camera Uniform bind group",
        bindings: [this.cameraBufferBinding]
      });
    }
    /**
     * Create the {@link cameraBindGroup | camera bind group} buffers
     */
    setCameraBindGroup() {
      if (this.cameraBindGroup.shouldCreateBindGroup) {
        this.cameraBindGroup.setIndex(0);
        this.cameraBindGroup.createBindGroup();
      }
    }
    /**
     * Tell our {@link cameraBufferBinding | camera buffer binding} that we should update its struct
     */
    updateCameraBindings() {
      var _a, _b, _c;
      (_a = this.cameraBufferBinding) == null ? void 0 : _a.shouldUpdateBinding("model");
      (_b = this.cameraBufferBinding) == null ? void 0 : _b.shouldUpdateBinding("view");
      (_c = this.cameraBufferBinding) == null ? void 0 : _c.shouldUpdateBinding("projection");
    }
    /**
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link core/computePasses/ComputePass.ComputePass | compute passes}) using a given {@link AllowedBindGroups | bind group}, including {@link cameraBindGroup | camera bind group}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param bindGroup - {@link AllowedBindGroups | bind group} to check
     */
    getObjectsByBindGroup(bindGroup) {
      return this.deviceRenderedObjects.filter((object) => {
        return [
          ...object.material.bindGroups,
          ...object.material.inputsBindGroups,
          ...object.material.clonedBindGroups,
          this.cameraBindGroup
        ].some((bG) => bG.uuid === bindGroup.uuid);
      });
    }
    /**
     * Set our {@link camera} perspective matrix new parameters (fov, near plane and far plane)
     * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({ fov, near, far } = {}) {
      var _a;
      (_a = this.camera) == null ? void 0 : _a.setPerspective({
        fov,
        near,
        far,
        width: this.boundingRect.width,
        height: this.boundingRect.height,
        pixelRatio: this.pixelRatio
      });
    }
    /**
     * Set our {@link camera} {@link Camera#position | position}
     * @param position - new {@link Camera#position | position}
     */
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      this.camera.position.copy(position);
    }
    /**
     * Call our {@link GPURenderer#onResize | GPURenderer onResize method} and resize our {@link camera} as well
     */
    onResize() {
      super.onResize();
      this.setPerspective();
      this.updateCameraBindings();
    }
    /* RENDER */
    /**
     * Update the camera model matrix, check if the {@link cameraBindGroup | camera bind group} should be created, create it if needed and then update it
     */
    updateCamera() {
      var _a, _b;
      (_a = this.camera) == null ? void 0 : _a.updateMatrixStack();
      this.setCameraBindGroup();
      (_b = this.cameraBindGroup) == null ? void 0 : _b.update();
    }
    /**
     * Render a single {@link RenderedMesh | mesh} (binds the {@link cameraBindGroup | camera bind group} if needed)
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - {@link RenderedMesh | mesh} to render
     */
    renderSingleMesh(commandEncoder, mesh) {
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      if (mesh.material.options.rendering.useProjection) {
        pass.setBindGroup(this.cameraBindGroup.index, this.cameraBindGroup.bindGroup);
      }
      mesh.render(pass);
      pass.end();
    }
    /**
     * {@link updateCamera | Update the camera} and then call our {@link GPURenderer#render | GPURenderer render method}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      if (!this.ready)
        return;
      this.updateCamera();
      super.render(commandEncoder);
    }
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy() {
      var _a;
      (_a = this.cameraBindGroup) == null ? void 0 : _a.destroy();
      super.destroy();
    }
  }
  class GPUDeviceManager {
    /**
     * GPUDeviceManager constructor
     * @param parameters - {@link GPUDeviceManagerParams | parameters} used to create this {@link GPUDeviceManager}
     */
    constructor({
      label,
      production = false,
      onError = () => {
      },
      onDeviceLost = (info) => {
      }
    }) {
      this.index = 0;
      this.label = label ?? "GPUDeviceManager instance";
      this.production = production;
      this.ready = false;
      this.onError = onError;
      this.onDeviceLost = onDeviceLost;
      this.gpu = navigator.gpu;
      if (!this.gpu) {
        setTimeout(() => {
          this.onError();
          throwError("GPURenderer: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
        }, 0);
      }
      this.setPipelineManager();
      this.setDeviceObjects();
    }
    /**
     * Set our {@link adapter} and {@link device} if possible
     */
    async setAdapterAndDevice() {
      await this.setAdapter();
      await this.setDevice();
    }
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
     */
    async init() {
      await this.setAdapterAndDevice();
      if (this.device) {
        this.renderers.forEach((renderer) => {
          if (!renderer.context) {
            renderer.setContext();
          }
        });
      }
    }
    /**
     * Set our {@link adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @async
     */
    async setAdapter() {
      var _a, _b;
      this.adapter = await ((_a = this.gpu) == null ? void 0 : _a.requestAdapter().catch(() => {
        setTimeout(() => {
          this.onError();
          throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
        }, 0);
      }));
      (_b = this.adapter) == null ? void 0 : _b.requestAdapterInfo().then((infos) => {
        this.adapterInfos = infos;
      });
    }
    /**
     * Set our {@link device}
     * @async
     */
    async setDevice() {
      var _a, _b;
      try {
        this.device = await ((_a = this.adapter) == null ? void 0 : _a.requestDevice({
          label: this.label + " " + this.index
        }));
        this.ready = true;
        this.index++;
      } catch (error) {
        setTimeout(() => {
          this.onError();
          throwError(`${this.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`);
        }, 0);
      }
      (_b = this.device) == null ? void 0 : _b.lost.then((info) => {
        throwWarning(`${this.label}: WebGPU device was lost: ${info.message}`);
        this.loseDevice();
        if (info.reason !== "destroyed") {
          this.onDeviceLost(info);
        }
      });
    }
    /**
     * Set our {@link pipelineManager | pipeline manager}
     */
    setPipelineManager() {
      this.pipelineManager = new PipelineManager();
    }
    /**
     * Called when the {@link device} is lost.
     * Reset all our renderers
     */
    loseDevice() {
      this.ready = false;
      this.samplers.forEach((sampler) => sampler.sampler = null);
      this.renderers.forEach((renderer) => renderer.loseContext());
      this.buffers = [];
    }
    /**
     * Called when the {@link device} should be restored.
     * Restore all our renderers
     */
    async restoreDevice() {
      await this.setAdapterAndDevice();
      if (this.device) {
        this.samplers.forEach((sampler) => {
          const { type, ...samplerOptions } = sampler.options;
          sampler.sampler = this.device.createSampler({
            label: sampler.label,
            ...samplerOptions
          });
        });
        this.renderers.forEach((renderer) => renderer.restoreContext());
      }
    }
    /**
     * Set all objects arrays that we'll keep track of
     */
    setDeviceObjects() {
      this.renderers = [];
      this.bindGroups = [];
      this.buffers = [];
      this.samplers = [];
      this.textures = [];
      this.texturesQueue = [];
    }
    /**
     * Add a {@link Renderer} to our {@link renderers} array
     * @param renderer - {@link Renderer} to add
     */
    addRenderer(renderer) {
      this.renderers.push(renderer);
    }
    /**
     * Remove a {@link Renderer} from our {@link renderers} array
     * @param renderer - {@link Renderer} to remove
     */
    removeRenderer(renderer) {
      this.renderers = this.renderers.filter((r) => r.uuid !== renderer.uuid);
    }
    /**
     * Get all the rendered objects (i.e. compute passes, meshes, ping pong planes and shader passes) created by this {@link GPUDeviceManager}
     * @readonly
     */
    get deviceRenderedObjects() {
      return this.renderers.map((renderer) => renderer.renderedObjects).flat();
    }
    /**
     * Add a {@link AllowedBindGroups | bind group} to our {@link bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to add
     */
    addBindGroup(bindGroup) {
      if (!this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
        this.bindGroups.push(bindGroup);
      }
    }
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
     */
    removeBindGroup(bindGroup) {
      this.bindGroups = this.bindGroups.filter((bG) => bG.uuid !== bindGroup.uuid);
    }
    /**
     * Add a {@link GPUBuffer} to our our {@link buffers} array
     * @param buffer - {@link GPUBuffer} to add
     */
    addBuffer(buffer) {
      this.buffers.push(buffer);
    }
    /**
     * Remove a {@link GPUBuffer} from our {@link buffers} array
     * @param buffer - {@link GPUBuffer} to remove
     * @param [originalLabel] - original {@link GPUBuffer} label in case the buffer has been swapped and its label has changed
     */
    removeBuffer(buffer, originalLabel) {
      if (buffer) {
        this.buffers = this.buffers.filter((b) => {
          return !(b.label === (originalLabel ?? buffer.label) && b.size === buffer.size);
        });
      }
    }
    /**
     * Add a {@link Sampler} to our {@link samplers} array
     * @param sampler - {@link Sampler} to add
     */
    addSampler(sampler) {
      this.samplers.push(sampler);
    }
    /**
     * Remove a {@link Sampler} from our {@link samplers} array
     * @param sampler - {@link Sampler} to remove
     */
    removeSampler(sampler) {
      this.samplers = this.samplers.filter((s) => s.uuid !== sampler.uuid);
    }
    /**
     * Add a {@link Texture} to our {@link textures} array
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.textures.push(texture);
    }
    /**
     * Upload a {@link Texture#texture | texture} to the GPU
     * @param texture - {@link Texture} class object with the {@link Texture#texture | texture} to upload
     */
    uploadTexture(texture) {
      var _a, _b;
      if (texture.source) {
        try {
          (_a = this.device) == null ? void 0 : _a.queue.copyExternalImageToTexture(
            {
              source: texture.source,
              flipY: texture.options.flipY
            },
            { texture: texture.texture, premultipliedAlpha: texture.options.premultipliedAlpha },
            { width: texture.size.width, height: texture.size.height }
          );
          if (texture.texture.mipLevelCount > 1) {
            generateMips(this.device, texture.texture);
          }
          this.texturesQueue.push(texture);
        } catch ({ message }) {
          throwError(`GPUDeviceManager: could not upload texture: ${texture.options.name} because: ${message}`);
        }
      } else {
        (_b = this.device) == null ? void 0 : _b.queue.writeTexture(
          { texture: texture.texture },
          new Uint8Array(texture.options.placeholderColor),
          { bytesPerRow: texture.size.width * 4 },
          { width: texture.size.width, height: texture.size.height }
        );
      }
    }
    /**
     * Remove a {@link Texture} from our {@link textures} array
     * @param texture - {@link Texture} to remove
     */
    removeTexture(texture) {
      this.textures = this.textures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Render everything:
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
     * - create a {@link GPUCommandEncoder}
     * - render all our {@link renderers}
     * - submit our {@link GPUCommandBuffer}
     * - upload {@link Texture#texture | textures} that do not have a parent
     * - empty our {@link texturesQueue} array
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
     */
    render() {
      var _a, _b;
      if (!this.ready)
        return;
      this.renderers.forEach((renderer) => renderer.onBeforeCommandEncoder());
      const commandEncoder = (_a = this.device) == null ? void 0 : _a.createCommandEncoder({ label: this.label + " command encoder" });
      this.renderers.forEach((renderer) => renderer.render(commandEncoder));
      const commandBuffer = commandEncoder.finish();
      (_b = this.device) == null ? void 0 : _b.queue.submit([commandBuffer]);
      this.textures.filter((texture) => !texture.parent && texture.sourceLoaded && !texture.sourceUploaded).forEach((texture) => this.uploadTexture(texture));
      this.texturesQueue.forEach((texture) => {
        texture.sourceUploaded = true;
      });
      this.texturesQueue = [];
      this.renderers.forEach((renderer) => renderer.onAfterCommandEncoder());
    }
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}
     */
    destroy() {
      var _a;
      (_a = this.device) == null ? void 0 : _a.destroy();
      this.device = null;
      this.renderers.forEach((renderer) => renderer.destroy());
      this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.buffers.forEach((buffer) => buffer == null ? void 0 : buffer.destroy());
      this.textures.forEach((texture) => texture.destroy());
      this.setDeviceObjects();
    }
  }
  class GPUCurtainsRenderer extends GPUCameraRenderer {
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
     */
    constructor({
      deviceManager,
      container,
      pixelRatio = 1,
      preferredFormat,
      alphaMode = "premultiplied",
      multisampled = true,
      renderPass,
      camera
    }) {
      super({
        deviceManager,
        container,
        pixelRatio,
        preferredFormat,
        alphaMode,
        renderPass,
        multisampled,
        camera
      });
      this.type = "GPUCurtainsRenderer";
    }
    /**
     * Add the {@link GPUCurtainsRenderer#domMeshes | domMeshes} to our tracked elements
     */
    setRendererObjects() {
      super.setRendererObjects();
      this.domMeshes = [];
    }
  }
  class ScrollManager {
    /**
     * ScrollManager constructor
     * @param parameters - {@link ScrollManagerParams | parameters} used to create this {@link ScrollManager}
     */
    constructor({
      scroll = { x: 0, y: 0 },
      delta = { x: 0, y: 0 },
      shouldWatch = true,
      onScroll = (delta2 = { x: 0, y: 0 }) => {
      }
    } = {}) {
      this.scroll = scroll;
      this.delta = delta;
      this.shouldWatch = shouldWatch;
      this.onScroll = onScroll;
      if (this.shouldWatch) {
        window.addEventListener("scroll", this.setScroll.bind(this), { passive: true });
      }
    }
    /**
     * Called by the scroll event listener
     */
    setScroll() {
      this.updateScrollValues({ x: window.pageXOffset, y: window.pageYOffset });
    }
    /**
     * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
     * Internally called by the scroll event listener
     * Could be called externally as well if the user wants to handle the scroll by himself
     * @param parameters - {@link core/DOM/DOMElement.DOMPosition | scroll values}
     */
    updateScrollValues({ x, y }) {
      const lastScroll = this.scroll;
      this.scroll = { x, y };
      this.delta = {
        x: lastScroll.x - this.scroll.x,
        y: lastScroll.y - this.scroll.y
      };
      if (this.onScroll) {
        this.onScroll(this.delta);
      }
    }
    /**
     * Destroy our scroll manager (just remove our event listner if it had been added previously)
     */
    destroy() {
      if (this.shouldWatch) {
        window.removeEventListener("scroll", this.setScroll.bind(this), { passive: true });
      }
    }
  }
  class GPUCurtains {
    /**
     * GPUCurtains constructor
     * @param parameters - {@link GPUCurtainsParams | parameters} used to create this {@link GPUCurtains}
     */
    constructor({
      container,
      pixelRatio = window.devicePixelRatio ?? 1,
      preferredFormat,
      alphaMode = "premultiplied",
      production = false,
      multisampled = true,
      renderPass,
      camera,
      autoRender = true,
      autoResize = true,
      watchScroll = true
    }) {
      this._onRenderCallback = () => {
      };
      this._onScrollCallback = () => {
      };
      this._onErrorCallback = () => {
      };
      this._onContextLostCallback = () => {
      };
      this.type = "CurtainsGPU";
      this.options = {
        container,
        pixelRatio,
        camera,
        production,
        preferredFormat,
        alphaMode,
        multisampled,
        renderPass,
        autoRender,
        autoResize,
        watchScroll
      };
      this.setDeviceManager();
      if (container) {
        this.setContainer(container);
      }
    }
    /**
     * Set the {@link container}
     * @param container - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setContainer(container) {
      if (!container) {
        const container2 = document.createElement("div");
        container2.setAttribute("id", "curtains-gpu-canvas");
        document.body.appendChild(container2);
        this.options.container = container2;
      } else {
        if (typeof container === "string") {
          container = document.querySelector(container);
          if (!container) {
            const container2 = document.createElement("div");
            container2.setAttribute("id", "curtains-gpu-canvas");
            document.body.appendChild(container2);
            this.options.container = container2;
          } else {
            this.options.container = container;
          }
        } else if (container instanceof Element) {
          this.options.container = container;
        }
      }
      this.container = this.options.container;
      this.setCurtains();
    }
    /**
     * Set the default {@link GPUCurtainsRenderer | renderer}
     */
    setMainRenderer() {
      this.createCurtainsRenderer({
        deviceManager: this.deviceManager,
        // TODO ...this.options?
        container: this.options.container,
        pixelRatio: this.options.pixelRatio,
        preferredFormat: this.options.preferredFormat,
        alphaMode: this.options.alphaMode,
        multisampled: this.options.multisampled,
        renderPass: this.options.renderPass,
        camera: this.options.camera
      });
    }
    /**
     * Patch the options with default values before creating a {@link Renderer}
     * @param parameters - parameters to patch
     */
    patchRendererOptions(parameters) {
      if (parameters.pixelRatio === void 0)
        parameters.pixelRatio = this.options.pixelRatio;
      return parameters;
    }
    /**
     * Create a new {@link GPURenderer} instance
     * @param parameters - {@link GPURendererParams | parameters} to use
     */
    createRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPURenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Create a new {@link GPUCameraRenderer} instance
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use
     */
    createCameraRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPUCameraRenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Create a new {@link GPUCurtainsRenderer} instance
     * @param parameters - {@link GPUCameraRendererParams | parameters} to use
     */
    createCurtainsRenderer(parameters) {
      parameters = this.patchRendererOptions(parameters);
      return new GPUCurtainsRenderer({ ...parameters, deviceManager: this.deviceManager });
    }
    /**
     * Set our {@link GPUDeviceManager}
     */
    setDeviceManager() {
      this.deviceManager = new GPUDeviceManager({
        label: "GPUCurtains default device",
        production: this.options.production,
        onError: () => this._onErrorCallback && this._onErrorCallback(),
        onDeviceLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info)
      });
    }
    /**
     * Get all created {@link Renderer}
     * @readonly
     */
    get renderers() {
      return this.deviceManager.renderers;
    }
    /**
     * Get the default {@link GPUCurtainsRenderer} created
     * @readonly
     */
    get renderer() {
      return this.renderers[0];
    }
    /**
     * Set the {@link GPUDeviceManager} {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} if possible, then set all created {@link Renderer} contexts
     */
    async setDevice() {
      await this.deviceManager.init();
    }
    /**
     * Restore the {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device}
     * @async
     */
    async restoreContext() {
      await this.deviceManager.restoreDevice();
    }
    /**
     * Set the various event listeners, set the {@link GPUCurtainsRenderer} and start rendering if needed
     */
    setCurtains() {
      this.initEvents();
      this.setMainRenderer();
      if (this.options.autoRender) {
        this.animate();
      }
    }
    /* RENDERER TRACKED OBJECTS */
    /**
     * Get all the created {@link PingPongPlane}
     * @readonly
     */
    get pingPongPlanes() {
      var _a;
      return (_a = this.renderers) == null ? void 0 : _a.map((renderer) => renderer.pingPongPlanes).flat();
    }
    /**
     * Get all the created {@link ShaderPass}
     * @readonly
     */
    get shaderPasses() {
      var _a;
      return (_a = this.renderers) == null ? void 0 : _a.map((renderer) => renderer.shaderPasses).flat();
    }
    /**
     * Get all the created {@link ProjectedMesh | projected meshes}
     * @readonly
     */
    get meshes() {
      var _a;
      return (_a = this.renderers) == null ? void 0 : _a.map((renderer) => renderer.meshes).flat();
    }
    /**
     * Get all the created {@link DOMMesh | DOM Meshes} (including {@link Plane | planes})
     * @readonly
     */
    get domMeshes() {
      var _a;
      return (_a = this.renderers) == null ? void 0 : _a.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domMeshes).flat();
    }
    /**
     * Get all the created {@link Plane | planes}
     * @readonly
     */
    get planes() {
      return this.domMeshes.filter((domMesh) => domMesh instanceof Plane);
    }
    /**
     * Get all the created {@link ComputePass | compute passes}
     * @readonly
     */
    get computePasses() {
      var _a;
      return (_a = this.renderers) == null ? void 0 : _a.map((renderer) => renderer.computePasses).flat();
    }
    /**
     * Get the {@link GPUCurtainsRenderer#camera | default GPUCurtainsRenderer camera}
     * @readonly
     */
    get camera() {
      var _a;
      return (_a = this.renderer) == null ? void 0 : _a.camera;
    }
    /**
     * Set the {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer camera} perspective
     * @param parameters - {@link CameraBasePerspectiveOptions | parameters} to use for the perspective
     */
    setPerspective({ fov = 50, near = 0.01, far = 50 } = {}) {
      var _a;
      (_a = this.renderer) == null ? void 0 : _a.setPerspective({ fov, near, far });
    }
    /**
     * Set the default {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer camera} {@link Camera#position | position}
     * @param position - new {@link Camera#position | position}
     */
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      var _a;
      (_a = this.renderer) == null ? void 0 : _a.setCameraPosition(position);
    }
    /**
     * Get our {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer bounding rectangle}
     */
    get boundingRect() {
      var _a;
      return (_a = this.renderer) == null ? void 0 : _a.boundingRect;
    }
    /* SCROLL */
    /**
     * Set the {@link scrollManager}
     */
    initScroll() {
      this.scrollManager = new ScrollManager({
        // init values
        scroll: {
          x: window.pageXOffset,
          y: window.pageYOffset
        },
        delta: {
          x: 0,
          y: 0
        },
        shouldWatch: this.options.watchScroll,
        onScroll: (delta) => this.updateScroll(delta)
      });
    }
    /**
     * Update all {@link DOMMesh#updateScrollPosition | DOMMesh scroll positions}
     * @param delta - last {@link ScrollManager#delta | scroll delta values}
     */
    updateScroll(delta = { x: 0, y: 0 }) {
      this.domMeshes.forEach((mesh) => {
        if (mesh.domElement) {
          mesh.updateScrollPosition(delta);
        }
      });
      this._onScrollCallback && this._onScrollCallback();
    }
    /**
     * Update our {@link ScrollManager#scroll | scrollManager scroll values}. Called each time the scroll has changed if {@link GPUCurtains#options.watchScroll | watchScroll option} is set to true. Could be called externally as well.
     * @param scroll - new {@link DOMPosition | scroll values}
     */
    updateScrollValues(scroll = { x: 0, y: 0 }) {
      this.scrollManager.updateScrollValues(scroll);
    }
    /**
     * Get our {@link ScrollManager#delta | scrollManager delta values}
     * @readonly
     */
    get scrollDelta() {
      return this.scrollManager.delta;
    }
    /**
     * Get our {@link ScrollManager#scroll | scrollManager scroll values}
     * @readonly
     */
    get scrollValues() {
      return this.scrollManager.scroll;
    }
    /* EVENT LISTENERS */
    /**
     * Set the resize and scroll event listeners
     */
    initEvents() {
      resizeManager.useObserver(this.options.autoResize);
      this.initScroll();
    }
    /* EVENTS */
    /**
     * Called at each render frame
     * @param callback - callback to run at each render
     * @returns - our {@link GPUCurtains}
     */
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    /**
     * Called each time the {@link ScrollManager#scroll | scrollManager scroll values} changed
     * @param callback - callback to run each time the {@link ScrollManager#scroll | scrollManager scroll values} changed
     * @returns - our {@link GPUCurtains}
     */
    onScroll(callback) {
      if (callback) {
        this._onScrollCallback = callback;
      }
      return this;
    }
    /**
     * Called if there's been an error while trying to create the {@link GPUDeviceManager#device | device}
     * @param callback - callback to run if there's been an error while trying to create the {@link GPUDeviceManager#device | device}
     * @returns - our {@link GPUCurtains}
     */
    onError(callback) {
      if (callback) {
        this._onErrorCallback = callback;
      }
      return this;
    }
    /**
     * Called whenever the {@link GPUDeviceManager#device | device} is lost
     * @param callback - callback to run whenever the {@link GPUDeviceManager#device | device} is lost
     * @returns - our {@link GPUCurtains}
     */
    onContextLost(callback) {
      if (callback) {
        this._onContextLostCallback = callback;
      }
      return this;
    }
    /**
     * Create a requestAnimationFrame loop and run it
     */
    animate() {
      this.render();
      this.animationFrameID = window.requestAnimationFrame(this.animate.bind(this));
    }
    /**
     * Render our {@link GPUDeviceManager}
     */
    render() {
      this._onRenderCallback && this._onRenderCallback();
      this.deviceManager.render();
    }
    /**
     * Destroy our {@link GPUCurtains} and {@link GPUDeviceManager}
     */
    destroy() {
      var _a;
      if (this.animationFrameID) {
        window.cancelAnimationFrame(this.animationFrameID);
      }
      this.deviceManager.destroy();
      (_a = this.scrollManager) == null ? void 0 : _a.destroy();
      resizeManager.destroy();
    }
  }
  class BoxGeometry extends IndexedGeometry {
    constructor({
      widthSegments = 1,
      heightSegments = 1,
      depthSegments = 1,
      instancesCount = 1,
      vertexBuffers = [],
      topology
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers });
      this.type = "BoxGeometry";
      widthSegments = Math.floor(widthSegments);
      heightSegments = Math.floor(heightSegments);
      depthSegments = Math.floor(depthSegments);
      const vertices = [];
      const uvs = [];
      const normals = [];
      const indices = [];
      let numberOfVertices = 0;
      const buildPlane = (u, v, w, udir, vdir, width, height, depth, gridX, gridY) => {
        const segmentWidth = width / gridX;
        const segmentHeight = height / gridY;
        const widthHalf = width / 2;
        const heightHalf = height / 2;
        const depthHalf = depth / 2;
        const gridX1 = gridX + 1;
        const gridY1 = gridY + 1;
        let vertexCounter = 0;
        const vector = new Vec3();
        for (let iy = 0; iy < gridY1; iy++) {
          const y = iy * segmentHeight - heightHalf;
          for (let ix = 0; ix < gridX1; ix++) {
            const x = ix * segmentWidth - widthHalf;
            vector[u] = x * udir;
            vector[v] = y * vdir;
            vector[w] = depthHalf;
            vertices.push(vector.x, vector.y, vector.z);
            vector[u] = 0;
            vector[v] = 0;
            vector[w] = depth > 0 ? 1 : -1;
            normals.push(vector.x, vector.y, vector.z);
            uvs.push(ix / gridX);
            uvs.push(iy / gridY);
            vertexCounter += 1;
          }
        }
        for (let iy = 0; iy < gridY; iy++) {
          for (let ix = 0; ix < gridX; ix++) {
            const a = numberOfVertices + ix + gridX1 * iy;
            const b = numberOfVertices + ix + gridX1 * (iy + 1);
            const c = numberOfVertices + (ix + 1) + gridX1 * (iy + 1);
            const d = numberOfVertices + (ix + 1) + gridX1 * iy;
            indices.push(a, b, d);
            indices.push(b, c, d);
            numberOfVertices += vertexCounter;
          }
        }
      };
      buildPlane("z", "y", "x", -1, -1, 2, 2, 2, depthSegments, heightSegments);
      buildPlane("z", "y", "x", 1, -1, 2, 2, -2, depthSegments, heightSegments);
      buildPlane("x", "z", "y", 1, 1, 2, 2, 2, widthSegments, depthSegments);
      buildPlane("x", "z", "y", 1, -1, 2, 2, -2, widthSegments, depthSegments);
      buildPlane("x", "y", "z", 1, -1, 2, 2, 2, widthSegments, heightSegments);
      buildPlane("x", "y", "z", -1, -1, 2, 2, -2, widthSegments, heightSegments);
      this.setAttribute({
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(vertices)
      });
      this.setAttribute({
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        array: new Float32Array(uvs)
      });
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(normals)
      });
      this.setIndexBuffer({
        array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
        bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
      });
    }
  }
  class SphereGeometry extends IndexedGeometry {
    constructor({
      widthSegments = 32,
      heightSegments = 16,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI,
      instancesCount = 1,
      vertexBuffers = [],
      topology
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers });
      this.type = "SphereGeometry";
      widthSegments = Math.max(3, Math.floor(widthSegments));
      heightSegments = Math.max(2, Math.floor(heightSegments));
      const radius = 1;
      const thetaEnd = Math.min(thetaStart + thetaLength, Math.PI);
      let index = 0;
      const grid = [];
      const vertex = new Vec3();
      const normal = new Vec3();
      const indices = [];
      const vertices = [];
      const normals = [];
      const uvs = [];
      for (let iy = 0; iy <= heightSegments; iy++) {
        const verticesRow = [];
        const v = iy / heightSegments;
        let uOffset = 0;
        if (iy === 0 && thetaStart === 0) {
          uOffset = 0.5 / widthSegments;
        } else if (iy === heightSegments && thetaEnd === Math.PI) {
          uOffset = -0.5 / widthSegments;
        }
        for (let ix = 0; ix <= widthSegments; ix++) {
          const u = ix / widthSegments;
          vertex.x = -radius * Math.cos(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vertex.y = radius * Math.cos(thetaStart + v * thetaLength);
          vertex.z = radius * Math.sin(phiStart + u * phiLength) * Math.sin(thetaStart + v * thetaLength);
          vertices.push(vertex.x, vertex.y, vertex.z);
          normal.copy(vertex).normalize();
          normals.push(normal.x, normal.y, normal.z);
          uvs.push(u + uOffset, v);
          verticesRow.push(index++);
        }
        grid.push(verticesRow);
      }
      for (let iy = 0; iy < heightSegments; iy++) {
        for (let ix = 0; ix < widthSegments; ix++) {
          const a = grid[iy][ix + 1];
          const b = grid[iy][ix];
          const c = grid[iy + 1][ix];
          const d = grid[iy + 1][ix + 1];
          if (iy !== 0 || thetaStart > 0)
            indices.push(a, b, d);
          if (iy !== heightSegments - 1 || thetaEnd < Math.PI)
            indices.push(b, c, d);
        }
      }
      this.setAttribute({
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(vertices)
      });
      this.setAttribute({
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        array: new Float32Array(uvs)
      });
      this.setAttribute({
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        size: 3,
        array: new Float32Array(normals)
      });
      this.setIndexBuffer({
        array: this.useUint16IndexArray ? new Uint16Array(indices) : new Uint32Array(indices),
        bufferFormat: this.useUint16IndexArray ? "uint16" : "uint32"
      });
    }
  }
  exports2.BindGroup = BindGroup;
  exports2.Binding = Binding;
  exports2.Box3 = Box3;
  exports2.BoxGeometry = BoxGeometry;
  exports2.BufferBinding = BufferBinding;
  exports2.Camera = Camera;
  exports2.ComputeMaterial = ComputeMaterial;
  exports2.ComputePass = ComputePass;
  exports2.ComputePipelineEntry = ComputePipelineEntry;
  exports2.DOMElement = DOMElement;
  exports2.DOMFrustum = DOMFrustum;
  exports2.DOMMesh = DOMMesh;
  exports2.DOMObject3D = DOMObject3D;
  exports2.FullscreenPlane = FullscreenPlane;
  exports2.GPUCameraRenderer = GPUCameraRenderer;
  exports2.GPUCurtains = GPUCurtains;
  exports2.GPUCurtainsRenderer = GPUCurtainsRenderer;
  exports2.GPUDeviceManager = GPUDeviceManager;
  exports2.GPURenderer = GPURenderer;
  exports2.Geometry = Geometry;
  exports2.IndexedGeometry = IndexedGeometry;
  exports2.Mat4 = Mat4;
  exports2.Material = Material;
  exports2.Mesh = Mesh;
  exports2.Object3D = Object3D;
  exports2.PingPongPlane = PingPongPlane;
  exports2.PipelineEntry = PipelineEntry;
  exports2.PipelineManager = PipelineManager;
  exports2.Plane = Plane;
  exports2.PlaneGeometry = PlaneGeometry;
  exports2.ProjectedObject3D = ProjectedObject3D;
  exports2.Quat = Quat;
  exports2.RenderMaterial = RenderMaterial;
  exports2.RenderPass = RenderPass;
  exports2.RenderPipelineEntry = RenderPipelineEntry;
  exports2.RenderTarget = RenderTarget;
  exports2.RenderTexture = RenderTexture;
  exports2.Sampler = Sampler;
  exports2.SamplerBinding = SamplerBinding;
  exports2.Scene = Scene;
  exports2.ShaderPass = ShaderPass;
  exports2.SphereGeometry = SphereGeometry;
  exports2.Texture = Texture;
  exports2.TextureBindGroup = TextureBindGroup;
  exports2.TextureBinding = TextureBinding;
  exports2.Vec2 = Vec2;
  exports2.Vec3 = Vec3;
  exports2.WritableBufferBinding = WritableBufferBinding;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
