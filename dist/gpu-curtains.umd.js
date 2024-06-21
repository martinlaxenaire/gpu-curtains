(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.window = global.window || {}));
})(this, (function (exports) { 'use strict';

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
    renderer = renderer && renderer.renderer || renderer;
    const isRenderer2 = renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isRenderer2) {
      formatRendererError(renderer, "GPURenderer", type);
    }
    return renderer;
  };
  const isCameraRenderer = (renderer, type) => {
    renderer = renderer && renderer.renderer || renderer;
    const isCameraRenderer2 = renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isCameraRenderer2) {
      formatRendererError(renderer, "GPUCameraRenderer", type);
    }
    return renderer;
  };
  const isCurtainsRenderer = (renderer, type) => {
    renderer = renderer && renderer.renderer || renderer;
    const isCurtainsRenderer2 = renderer && renderer.type === "GPUCurtainsRenderer";
    if (!isCurtainsRenderer2) {
      formatRendererError(renderer, "GPUCurtainsRenderer", type);
    }
    return renderer;
  };
  const generateMips = /* @__PURE__ */ (() => {
    let sampler;
    let module;
    const pipelineByFormat = {};
    return function generateMips2(device, texture) {
      if (!module) {
        module = device.createShaderModule({
          label: "textured quad shaders for mip level generation",
          code: `
            struct VSOutput {
              @builtin(position) position: vec4f,
              @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
              @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
              let pos = array(

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
          minFilter: "linear",
          magFilter: "linear"
        });
      }
      if (!pipelineByFormat[texture.format]) {
        pipelineByFormat[texture.format] = device.createRenderPipeline({
          label: "Mip level generator pipeline",
          layout: "auto",
          vertex: {
            module
          },
          fragment: {
            module,
            targets: [{ format: texture.format }]
          }
        });
      }
      const pipeline = pipelineByFormat[texture.format];
      const encoder = device.createCommandEncoder({
        label: "Mip gen encoder"
      });
      let width = texture.width;
      let height = texture.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);
        for (let layer = 0; layer < texture.depthOrArrayLayers; ++layer) {
          const bindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
              { binding: 0, resource: sampler },
              {
                binding: 1,
                resource: texture.createView({
                  dimension: "2d",
                  baseMipLevel,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1
                })
              }
            ]
          });
          const renderPassDescriptor = {
            label: "Mip generation render pass",
            colorAttachments: [
              {
                view: texture.createView({
                  dimension: "2d",
                  baseMipLevel: baseMipLevel + 1,
                  mipLevelCount: 1,
                  baseArrayLayer: layer,
                  arrayLayerCount: 1
                }),
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
        ++baseMipLevel;
      }
      const commandBuffer = encoder.finish();
      device.queue.submit([commandBuffer]);
    };
  })();

  const bindingVisibilities = /* @__PURE__ */ new Map([
    ["vertex", GPUShaderStage.VERTEX],
    ["fragment", GPUShaderStage.FRAGMENT],
    ["compute", GPUShaderStage.COMPUTE]
  ]);
  const getBindingVisibility = (visibilities = []) => {
    return visibilities.reduce((acc, v) => {
      return acc | bindingVisibilities.get(v);
    }, 0);
  };
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
  const getBufferLayout = (bufferType) => {
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
    return binding.bindingType === "storage" ? `var ${binding.name}: texture_storage_${binding.options.viewDimension.replace("-", "_")}<${binding.options.format}, ${binding.options.access}>;` : binding.bindingType === "depth" ? `var ${binding.name}: texture_depth${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension.replace("-", "_")};` : `var ${binding.name}: texture${binding.options.multisampled ? "_multisampled" : ""}_${binding.options.viewDimension.replace("-", "_")}<f32>;`;
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
        case "storage":
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
              viewDimension: binding.options.viewDimension,
              sampleType: binding.options.multisampled ? "unfilterable-float" : "float"
            }
          };
        case "depth":
          return {
            texture: {
              multisampled: binding.options.multisampled,
              viewDimension: binding.options.viewDimension,
              sampleType: "depth"
            }
          };
        default:
          return null;
      }
    })();
  };
  const getBindGroupLayoutTextureBindingCacheKey = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "externalTexture":
          return `externalTexture,${binding.visibility},`;
        case "storage":
          return `storageTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`;
        case "texture":
          return `texture,${binding.options.multisampled},${binding.options.viewDimension},${binding.options.multisampled ? "unfilterable-float" : "float"},${binding.visibility},`;
        case "depth":
          return `depthTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`;
        default:
          return `${binding.visibility},`;
      }
    })();
  };

  class Binding {
    /**
     * Binding constructor
     * @param parameters - {@link BindingParams | parameters} used to create our {@link Binding}
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType = "uniform",
      visibility = ["vertex", "fragment", "compute"]
    }) {
      this.label = label;
      this.name = toCamelCase(name);
      this.bindingType = bindingType;
      this.visibility = getBindingVisibility(visibility);
      this.options = {
        label,
        name,
        bindingType,
        visibility
      };
      this.shouldResetBindGroup = false;
      this.shouldResetBindGroupLayout = false;
      this.cacheKey = `${bindingType},${this.visibility},`;
    }
  }

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
     * Divide a {@link Vec2} with this {@link Vec2}
     * @param vector - {@link Vec2} to divide with
     * @returns - this {@link Vec2} after division
     */
    divide(vector = new Vec2(1)) {
      this.x /= vector.x;
      this.y /= vector.y;
      return this;
    }
    /**
     * Divide all components of this {@link Vec2} with a scalar
     * @param value - number to divide with
     * @returns - this {@link Vec2} after division
     */
    divideScalar(value = 1) {
      this.x /= value;
      this.y /= value;
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
    setFromVec3(vector) {
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
    setFromAxisAngle(axis, angle = 0) {
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
    set(x = 0, y = x, z = x) {
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
     * Divide a {@link Vec3} with this {@link Vec3}
     * @param vector - {@link Vec3} to divide with
     * @returns - this {@link Vec3} after division
     */
    divide(vector = new Vec3(1)) {
      this.x /= vector.x;
      this.y /= vector.y;
      this.z /= vector.z;
      return this;
    }
    /**
     * Divide all components of this {@link Vec3} with a scalar
     * @param value - number to divide with
     * @returns - this {@link Vec3} after division
     */
    divideScalar(value = 1) {
      this.x /= value;
      this.y /= value;
      this.z /= value;
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
     * Get the euclidian distance between this {@link Vec3} and another {@link Vec3}
     * @param vector - {@link Vec3} to use for distance calculation
     * @returns - euclidian distance
     */
    distance(vector = new Vec3()) {
      return Math.hypot(vector.x - this.x, vector.y - this.y, vector.z - this.z);
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
    applyMat4(matrix) {
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
     * Set this {@link Vec3} to the translation component of a {@link Mat4 | matrix}.
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Vec3} after {@link Mat4 | matrix} application.
     */
    setFromMatrixPosition(matrix) {
      const e = matrix.elements;
      this.x = e[12];
      this.y = e[13];
      this.z = e[14];
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
      this.setValue = null;
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
      return Math.floor(this.endOffset / bytesPerSlot);
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
      } else if (size > bytesPerRow && nextPositionAvailable.byte > bytesPerRow) {
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
     * Set the {@link view} value from a float or an int
     * @param value - float or int to use
     */
    setValueFromFloat(value) {
      this.view[0] = value;
    }
    /**
     * Set the {@link view} value from a {@link Vec2} or an array
     * @param value - {@link Vec2} or array to use
     */
    setValueFromVec2(value) {
      this.view[0] = value.x ?? value[0] ?? 0;
      this.view[1] = value.y ?? value[1] ?? 0;
    }
    /**
     * Set the {@link view} value from a {@link Vec3} or an array
     * @param value - {@link Vec3} or array to use
     */
    setValueFromVec3(value) {
      this.view[0] = value.x ?? value[0] ?? 0;
      this.view[1] = value.y ?? value[1] ?? 0;
      this.view[2] = value.z ?? value[2] ?? 0;
    }
    /**
     * Set the {@link view} value from a {@link Mat4} or {@link Quat}
     * @param value - {@link Mat4} or {@link Quat} to use
     */
    setValueFromMat4OrQuat(value) {
      this.view.set(value.elements);
    }
    /**
     * Set the {@link view} value from a {@link Mat3}
     * @param value - {@link Mat3} to use
     */
    setValueFromMat3(value) {
      this.setValueFromArrayWithPad(value.elements);
    }
    /**
     * Set the {@link view} value from an array
     * @param value - array to use
     */
    setValueFromArray(value) {
      this.view.set(value);
    }
    /**
     * Set the {@link view} value from an array with pad applied
     * @param value - array to use
     */
    setValueFromArrayWithPad(value) {
      for (let i = 0, offset = 0; i < this.view.length; i += this.bufferLayout.pad[0] + this.bufferLayout.pad[1], offset++) {
        for (let j = 0; j < this.bufferLayout.pad[0]; j++) {
          this.view[i + j] = value[i + j - offset];
        }
      }
    }
    /**
     * Update the {@link view} based on the new value
     * @param value - new value to use
     */
    update(value) {
      if (!this.setValue) {
        this.setValue = ((value2) => {
          if (this.type === "f32" || this.type === "u32" || this.type === "i32") {
            return this.setValueFromFloat;
          } else if (this.type === "vec2f") {
            return this.setValueFromVec2;
          } else if (this.type === "vec3f") {
            return this.setValueFromVec3;
          } else if (this.type === "mat3x3f") {
            return value2.elements ? this.setValueFromMat3 : this.setValueFromArrayWithPad;
          } else if (value2.elements) {
            return this.setValueFromMat4OrQuat;
          } else if (ArrayBuffer.isView(value2) || Array.isArray(value2)) {
            if (!this.bufferLayout.pad) {
              return this.setValueFromArray;
            } else {
              return this.setValueFromArrayWithPad;
            }
          } else {
            throwWarning(`${this.constructor.name}: value passed to ${this.name} cannot be used: ${value2}`);
          }
        })(value);
      }
      this.setValue(value);
    }
    /**
     * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
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
      this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements);
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
     * Set the strided {@link view} value from an array
     * @param value - array to use
     */
    setValueFromArray(value) {
      let valueIndex = 0;
      const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT;
      const stride = Math.ceil(viewLength / this.numElements);
      for (let i = 0; i < this.numElements; i++) {
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          this.view[j + i * stride] = value[valueIndex];
          valueIndex++;
        }
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
      this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements);
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
     * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
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

  const bufferUsages = /* @__PURE__ */ new Map([
    ["copySrc", GPUBufferUsage.COPY_SRC],
    ["copyDst", GPUBufferUsage.COPY_DST],
    ["index", GPUBufferUsage.INDEX],
    ["indirect", GPUBufferUsage.INDIRECT],
    ["mapRead", GPUBufferUsage.MAP_READ],
    ["mapWrite", GPUBufferUsage.MAP_WRITE],
    ["queryResolve", GPUBufferUsage.QUERY_RESOLVE],
    ["storage", GPUBufferUsage.STORAGE],
    ["uniform", GPUBufferUsage.UNIFORM],
    ["vertex", GPUBufferUsage.VERTEX]
  ]);
  const getBufferUsages = (usages = []) => {
    return usages.reduce((acc, v) => {
      return acc | bufferUsages.get(v);
    }, 0);
  };

  class Buffer {
    /**
     * Buffer constructor
     * @param parameters - {@link GPUBufferDescriptor | parameters} used to create our Buffer
     */
    constructor({
      label = "Buffer",
      size = 0,
      usage = ["copySrc", "copyDst"],
      mappedAtCreation = false
    } = {}) {
      this.type = "Buffer";
      this.reset();
      this.uuid = generateUUID();
      this.consumers = /* @__PURE__ */ new Set();
      this.options = {
        label,
        size,
        usage: getBufferUsages(usage),
        mappedAtCreation
      };
    }
    /** Reset the {@link GPUBuffer} value to `null`. */
    reset() {
      this.GPUBuffer = null;
    }
    /** Allow to dynamically set the size of the {@link GPUBuffer}. */
    set size(value) {
      this.options.size = value;
    }
    /**
     * Create a {@link GPUBuffer} based on the descriptor stored in the {@link options | Buffer options}.
     * @param renderer - {@link core/renderers/GPURenderer.GPURenderer | renderer} used to create the {@link GPUBuffer}.
     * @param options - optional way to update the {@link options} previously set before creating the {@link GPUBuffer}.
     */
    createBuffer(renderer, options = {}) {
      const { usage, ...staticOptions } = options;
      this.options = {
        ...this.options,
        ...staticOptions,
        ...usage !== void 0 && { usage: getBufferUsages(usage) }
      };
      this.setBuffer(renderer.createBuffer(this));
    }
    /**
     * Set the {@link GPUBuffer}. This allows to use a {@link Buffer} with a {@link GPUBuffer} created separately.
     * @param GPUBuffer - GPU buffer to use.
     */
    setBuffer(GPUBuffer) {
      this.GPUBuffer = GPUBuffer;
    }
    /**
     * Copy an {@link Buffer#GPUBuffer | Buffer GPUBuffer} and its {@link options} into this {@link Buffer}.
     * @param buffer - {@link Buffer} to use for the copy.
     * @param destroyPreviousBuffer - whether to destroy the previous {@link Buffer} before the copy.
     */
    copy(buffer, destroyPreviousBuffer = false) {
      if (destroyPreviousBuffer) {
        this.destroy();
      }
      this.options = buffer.options;
      this.GPUBuffer = buffer.GPUBuffer;
      this.consumers = /* @__PURE__ */ new Set([...this.consumers, ...buffer.consumers]);
    }
    /**
     * Map the {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}.
     * @async
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    async mapBufferAsync() {
      if (!this.GPUBuffer || this.GPUBuffer.mapState !== "unmapped")
        return new Float32Array(0);
      await this.GPUBuffer.mapAsync(GPUMapMode.READ);
      const result = new Float32Array(this.GPUBuffer.getMappedRange().slice(0));
      this.GPUBuffer.unmap();
      return result;
    }
    /**
     * Destroy the {@link GPUBuffer} and {@link reset} its value.
     */
    destroy() {
      this.GPUBuffer?.destroy();
      this.reset();
      this.consumers.clear();
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
      usage = [],
      struct = {}
    }) {
      bindingType = bindingType ?? "uniform";
      super({ label, name, bindingType, visibility });
      this.options = {
        ...this.options,
        useStruct,
        access,
        usage,
        struct
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
        newBufferElement.alignment = bufferElement.alignment;
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
      if (!this.bufferElements.length)
        return;
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

  class WritableBufferBinding extends BufferBinding {
    /**
     * WritableBufferBinding constructor
     * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
     */
    constructor({
      label = "Work",
      name = "work",
      bindingType,
      visibility,
      useStruct = true,
      access = "read_write",
      usage = [],
      struct = {},
      shouldCopyResult = false
    }) {
      bindingType = "storage";
      visibility = ["compute"];
      super({ label, name, bindingType, visibility, useStruct, access, usage, struct });
      this.options = {
        ...this.options,
        shouldCopyResult
      };
      this.shouldCopyResult = shouldCopyResult;
      this.cacheKey += `${shouldCopyResult},`;
      this.resultBuffer = new Buffer();
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
      renderer = isRenderer(renderer, this.type);
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
      this.layoutCacheKey = "";
      this.pipelineCacheKey = "";
      this.resetEntries();
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.needsPipelineFlush = false;
      this.consumers = /* @__PURE__ */ new Set();
      for (const binding of this.bufferBindings) {
        if ("buffer" in binding) {
          binding.buffer.consumers.add(this.uuid);
        }
        if ("resultBuffer" in binding) {
          binding.resultBuffer.consumers.add(this.uuid);
        }
      }
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
      bindings.forEach((binding) => {
        if ("buffer" in binding) {
          this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
          binding.buffer.consumers.add(this.uuid);
        }
      });
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
      let bindings = [
        ...Object.keys(inputs).map((inputKey) => {
          const binding = inputs[inputKey];
          if (!binding.struct)
            return;
          const bindingParams = {
            label: toKebabCase(binding.label || inputKey),
            name: inputKey,
            bindingType,
            visibility: binding.access === "read_write" ? ["compute"] : binding.visibility,
            useStruct: true,
            // by default
            access: binding.access ?? "read",
            // read by default
            ...binding.usage && { usage: binding.usage },
            struct: binding.struct,
            ...binding.shouldCopyResult !== void 0 && { shouldCopyResult: binding.shouldCopyResult }
          };
          if (binding.useStruct !== false) {
            let key = `${bindingType},${binding.visibility === void 0 ? "all" : binding.access === "read_write" ? "compute" : binding.visibility},true,${binding.access ?? "read"},`;
            Object.keys(binding.struct).forEach((bindingKey) => {
              key += `${bindingKey},${binding.struct[bindingKey].type},`;
            });
            if (binding.shouldCopyResult !== void 0) {
              key += `${binding.shouldCopyResult},`;
            }
            const cachedBinding = this.renderer.deviceManager.bufferBindings.get(key);
            if (cachedBinding) {
              return cachedBinding.clone(bindingParams);
            }
          }
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
      bindings = bindings.filter(Boolean);
      bindings.forEach((binding) => {
        this.renderer.deviceManager.bufferBindings.set(binding.cacheKey, binding);
      });
      return bindings;
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
      this.pipelineCacheKey = "";
      for (const binding of this.bindings) {
        this.addBindGroupEntry(binding);
      }
      this.setBindGroup();
    }
    /**
     * Add a {@link BindGroup#entries.bindGroup | bindGroup entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupEntry(binding) {
      this.entries.bindGroup.push({
        binding: this.entries.bindGroup.length,
        resource: binding.resource
      });
      this.pipelineCacheKey += binding.cacheKey;
    }
    /**
     * Reset the {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entries}, recreates them and then recreate the {@link BindGroup#bindGroupLayout | GPU bind group layout}
     */
    resetBindGroupLayout() {
      this.entries.bindGroupLayout = [];
      this.layoutCacheKey = "";
      for (const binding of this.bindings) {
        this.addBindGroupLayoutEntry(binding);
      }
      this.setBindGroupLayout();
    }
    /**
     * Add a {@link BindGroup#entries.bindGroupLayout | bindGroupLayout entry}
     * @param binding - {@link BindGroupBindingElement | binding} to add
     */
    addBindGroupLayoutEntry(binding) {
      this.entries.bindGroupLayout.push({
        binding: this.entries.bindGroupLayout.length,
        ...binding.resourceLayout,
        visibility: binding.visibility
      });
      this.layoutCacheKey += binding.resourceLayoutCacheKey;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration
     */
    loseContext() {
      this.resetEntries();
      for (const binding of this.bufferBindings) {
        binding.buffer.reset();
        if ("resultBuffer" in binding) {
          binding.resultBuffer.reset();
        }
      }
      this.bindGroup = null;
      this.bindGroupLayout = null;
      this.needsPipelineFlush = true;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to update our bindings.
     */
    restoreContext() {
      if (this.shouldCreateBindGroup) {
        this.createBindGroup();
      }
      for (const bufferBinding of this.bufferBindings) {
        bufferBinding.shouldUpdate = true;
      }
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
      binding.buffer.createBuffer(this.renderer, {
        label: this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
        usage: [...["copySrc", "copyDst", binding.bindingType], ...binding.options.usage]
      });
      if ("resultBuffer" in binding) {
        binding.resultBuffer.createBuffer(this.renderer, {
          label: this.options.label + ": Result buffer from: " + binding.label,
          size: binding.arrayBuffer.byteLength,
          usage: ["copyDst", "mapRead"]
        });
      }
    }
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer struct, create a GPUBuffer first if needed
     */
    fillEntries() {
      for (const binding of this.bindings) {
        if (!binding.visibility) {
          binding.visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE;
        }
        if ("buffer" in binding) {
          if (!binding.buffer.GPUBuffer) {
            this.createBindingBuffer(binding);
          }
        }
        this.addBindGroupLayoutEntry(binding);
        this.addBindGroupEntry(binding);
      }
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
      const bindGroupLayout = this.renderer.deviceManager.bindGroupLayouts.get(this.layoutCacheKey);
      if (bindGroupLayout) {
        this.bindGroupLayout = bindGroupLayout;
      } else {
        this.bindGroupLayout = this.renderer.createBindGroupLayout({
          label: this.options.label + " layout",
          entries: this.entries.bindGroupLayout
        });
        this.renderer.deviceManager.bindGroupLayouts.set(this.layoutCacheKey, this.bindGroupLayout);
      }
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
      this.bindings.forEach((binding, index) => {
        if ("buffer" in binding) {
          binding.update();
          if (binding.shouldUpdate) {
            if (!binding.useStruct && binding.bufferElements.length > 1) {
              this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.bufferElements[index].view);
            } else {
              this.renderer.queueWriteBuffer(binding.buffer.GPUBuffer, 0, binding.arrayBuffer);
            }
          }
          binding.shouldUpdate = false;
        }
      });
    }
    /**
     * Update the {@link BindGroup}, which means update its {@link BindGroup#bufferBindings | buffer bindings} and {@link BindGroup#resetBindGroup | reset it} if needed.
     * Called at each render from the parentMesh {@link core/materials/Material.Material | material}
     */
    update() {
      this.updateBufferBindings();
      const needBindGroupReset = this.bindings.some((binding) => binding.shouldResetBindGroup);
      const needBindGroupLayoutReset = this.bindings.some((binding) => binding.shouldResetBindGroupLayout);
      if (needBindGroupReset || needBindGroupLayoutReset) {
        this.renderer.onAfterCommandEncoderSubmission.add(
          () => {
            for (const binding of this.bindings) {
              binding.shouldResetBindGroup = false;
              binding.shouldResetBindGroupLayout = false;
            }
          },
          { once: true }
        );
      }
      if (needBindGroupLayoutReset) {
        this.resetBindGroupLayout();
        this.needsPipelineFlush = true;
      }
      if (needBindGroupReset) {
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
      for (const binding of bindingsRef) {
        bindGroupCopy.addBinding(binding);
        if ("buffer" in binding) {
          if (!binding.buffer.GPUBuffer) {
            this.createBindingBuffer(binding);
          }
          binding.buffer.consumers.add(bindGroupCopy.uuid);
          if ("resultBuffer" in binding) {
            binding.resultBuffer.consumers.add(bindGroupCopy.uuid);
          }
        }
        if (!keepLayout) {
          bindGroupCopy.addBindGroupLayoutEntry(binding);
        }
        bindGroupCopy.addBindGroupEntry(binding);
      }
      if (keepLayout) {
        bindGroupCopy.entries.bindGroupLayout = [...this.entries.bindGroupLayout];
        bindGroupCopy.layoutCacheKey = this.layoutCacheKey;
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
      for (const binding of this.bufferBindings) {
        if ("buffer" in binding) {
          this.renderer.removeBuffer(binding.buffer);
          binding.buffer.consumers.delete(this.uuid);
          if (!binding.buffer.consumers.size) {
            binding.buffer.destroy();
          }
        }
        if ("resultBuffer" in binding) {
          this.renderer.removeBuffer(binding.resultBuffer);
          binding.resultBuffer.consumers.delete(this.uuid);
          if (!binding.resultBuffer.consumers.size) {
            binding.resultBuffer.destroy();
          }
        }
      }
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
      if (bindingType === "storage") {
        visibility = ["compute"];
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
      this.cacheKey += `${format},${access},${viewDimension},${multisampled},`;
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
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey() {
      return getBindGroupLayoutTextureBindingCacheKey(this);
    }
    /**
     * Get the {@link GPUBindGroupEntry#resource | bind group resource}
     */
    get resource() {
      return this.texture instanceof GPUTexture ? this.texture.createView({ label: this.options.label + " view", dimension: this.options.viewDimension }) : this.texture instanceof GPUExternalTexture ? this.texture : null;
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
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
        this.setWGSLFragment();
      }
    }
    /**
     * Set or update our texture {@link TextureBindingParams#format | format}. Note that if the texture is a `storage` {@link bindingType} and the `format` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param format - new texture {@link TextureBindingParams#format | format} value to use
     */
    setFormat(format) {
      const isNewFormat = format !== this.options.format;
      this.options.format = format;
      if (isNewFormat && this.bindingType === "storage") {
        this.setWGSLFragment();
        this.shouldResetBindGroupLayout = true;
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
      }
    }
    /**
     * Set or update our texture {@link TextureBindingParams#multisampled | multisampled}. Note that if the texture is not a `storage` {@link bindingType} and the `multisampled` value is different from the previous one, the associated {@link core/bindGroups/BindGroup.BindGroup#bindGroupLayout | GPU bind group layout} will be recreated.
     * @param multisampled - new texture {@link TextureBindingParams#multisampled | multisampled} value to use
     */
    setMultisampled(multisampled) {
      const isNewMultisampled = multisampled !== this.options.multisampled;
      this.options.multisampled = multisampled;
      if (isNewMultisampled && this.bindingType !== "storage") {
        this.setWGSLFragment();
        this.shouldResetBindGroupLayout = true;
        this.cacheKey = `${this.bindingType},${this.visibility},${this.options.format},${this.options.access},${this.options.viewDimension},${this.options.multisampled},`;
      }
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [`${getTextureBindingWGSLVarType(this)}`];
    }
  }

  const xAxis = new Vec3();
  const yAxis = new Vec3();
  const zAxis = new Vec3();
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
     * @param n11 - number
     * @param n12 - number
     * @param n13 - number
     * @param n14 - number
     * @param n21 - number
     * @param n22 - number
     * @param n23 - number
     * @param n24 - number
     * @param n31 - number
     * @param n32 - number
     * @param n33 - number
     * @param n34 - number
     * @param n41 - number
     * @param n42 - number
     * @param n43 - number
     * @param n44 - number
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
     * @param matrix - matrix to copy
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
     * @returns - the inverted {@link Mat4}
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
     * Transpose this {@link Mat4}
     * @returns - the transposed {@link Mat4}
     */
    transpose() {
      let t;
      const te = this.elements;
      t = te[1];
      te[1] = te[4];
      te[4] = t;
      t = te[2];
      te[2] = te[8];
      te[8] = t;
      t = te[3];
      te[3] = te[12];
      te[12] = t;
      t = te[6];
      te[6] = te[9];
      te[9] = t;
      t = te[7];
      te[7] = te[13];
      te[13] = t;
      t = te[11];
      te[11] = te[14];
      te[14] = t;
      return this;
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
     * Get the translation {@link Vec3} component of a {@link Mat4}
     * @param position - {@link Vec3} to set
     * @returns - translation {@link Vec3} component of this {@link Mat4}
     */
    getTranslation(position = new Vec3()) {
      return position.set(this.elements[12], this.elements[13], this.elements[14]);
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
     * Get the maximum scale of the {@link Mat4} on all axes
     * @returns - maximum scale of the {@link Mat4}
     */
    getMaxScaleOnAxis() {
      const te = this.elements;
      const scaleXSq = te[0] * te[0] + te[1] * te[1] + te[2] * te[2];
      const scaleYSq = te[4] * te[4] + te[5] * te[5] + te[6] * te[6];
      const scaleZSq = te[8] * te[8] + te[9] * te[9] + te[10] * te[10];
      return Math.sqrt(Math.max(scaleXSq, scaleYSq, scaleZSq));
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
    /**
     * Set this {@link Mat4} as a rotation matrix based on an eye, target and up {@link Vec3 | vectors}
     * @param eye - {@link Vec3 | position vector} of the object that should be rotated
     * @param target - {@link Vec3 | target vector} to look at
     * @param up - up {@link Vec3 | vector}
     * @returns - rotated {@link Mat4}
     */
    lookAt(eye = new Vec3(), target = new Vec3(), up = new Vec3(0, 1, 0)) {
      const te = this.elements;
      zAxis.copy(eye).sub(target);
      if (zAxis.lengthSq() === 0) {
        zAxis.z = 1;
      }
      zAxis.normalize();
      xAxis.crossVectors(up, zAxis);
      if (xAxis.lengthSq() === 0) {
        if (Math.abs(up.z) === 1) {
          zAxis.x += 1e-4;
        } else {
          zAxis.z += 1e-4;
        }
        zAxis.normalize();
        xAxis.crossVectors(up, zAxis);
      }
      xAxis.normalize();
      yAxis.crossVectors(zAxis, xAxis);
      te[0] = xAxis.x;
      te[1] = xAxis.y;
      te[2] = xAxis.z;
      te[3] = 0;
      te[4] = yAxis.x;
      te[5] = yAxis.y;
      te[6] = yAxis.z;
      te[7] = 0;
      te[8] = zAxis.x;
      te[9] = zAxis.y;
      te[10] = zAxis.z;
      te[11] = 0;
      te[12] = eye.x;
      te[13] = eye.y;
      te[14] = eye.z;
      te[15] = 1;
      return this;
    }
    /**
     * Compute a view {@link Mat4} matrix.
     *
     * This is a view matrix which transforms all other objects
     * to be in the space of the view defined by the parameters.
     *
     * Equivalent to `matrix.lookAt(eye, target, up).invert()` but faster.
     *
     * @param eye - the position of the object.
     * @param target - the position meant to be aimed at.
     * @param up - a vector pointing up.
     * @returns - the view {@link Mat4} matrix.
     */
    makeView(eye = new Vec3(), target = new Vec3(), up = new Vec3(0, 1, 0)) {
      const te = this.elements;
      zAxis.copy(eye).sub(target).normalize();
      xAxis.crossVectors(up, zAxis).normalize();
      yAxis.crossVectors(zAxis, xAxis).normalize();
      te[0] = xAxis.x;
      te[1] = yAxis.x;
      te[2] = zAxis.x;
      te[3] = 0;
      te[4] = xAxis.y;
      te[5] = yAxis.y;
      te[6] = zAxis.y;
      te[7] = 0;
      te[8] = xAxis.z;
      te[9] = yAxis.z;
      te[10] = zAxis.z;
      te[11] = 0;
      te[12] = -(xAxis.x * eye.x + xAxis.y * eye.y + xAxis.z * eye.z);
      te[13] = -(yAxis.x * eye.x + yAxis.y * eye.y + yAxis.z * eye.z);
      te[14] = -(zAxis.x * eye.x + zAxis.y * eye.y + zAxis.z * eye.z);
      te[15] = 1;
      return this;
    }
    /**
     * Create an orthographic {@link Mat4} matrix based on the parameters. Transforms from
     *  * the given the left, right, bottom, and top dimensions to -1 +1 in x, and y
     *  * and 0 to +1 in z.
     *
     * @param parameters - parameters used to create the camera orthographic matrix.
     * @param parameters.left - the left side of the camera near clipping plane viewport.
     * @param parameters.right - the right side of the camera near clipping plane viewport.
     * @param parameters.bottom - the bottom of the camera near clipping plane viewport.
     * @param parameters.top - the top of the camera near clipping plane viewport.
     * @param parameters.near - the camera near plane.
     * @param parameters.far - the camera far plane.
     * @returns - the camera orthographic {@link Mat4} matrix.
     */
    makeOrthographic({
      left,
      right,
      bottom,
      top,
      near,
      far
    }) {
      const te = this.elements;
      te[0] = 2 / (right - left);
      te[1] = 0;
      te[2] = 0;
      te[3] = 0;
      te[4] = 0;
      te[5] = 2 / (top - bottom);
      te[6] = 0;
      te[7] = 0;
      te[8] = 0;
      te[9] = 0;
      te[10] = 1 / (near - far);
      te[11] = 0;
      te[12] = (right + left) / (left - right);
      te[13] = (top + bottom) / (bottom - top);
      te[14] = near / (near - far);
      te[15] = 1;
      return this;
    }
    /**
     * Create a perspective {@link Mat4} matrix based on the parameters.
     *
     * Note, The matrix generated sends the viewing frustum to the unit box.
     * We assume a unit box extending from -1 to 1 in the x and y dimensions and
     * from -1 to 1 in the z dimension, as three.js and more generally WebGL handles it.
     *
     * @param parameters - parameters used to create the camera perspective matrix.
     * @param parameters.fov - the camera field of view (in radians).
     * @param parameters.aspect - the camera aspect ratio (width / height).
     * @param parameters.near - the camera near plane.
     * @param parameters.far - the camera far plane.
     * @returns - the camera perspective {@link Mat4} matrix.
     */
    makePerspective({ fov, aspect, near, far }) {
      const top = near * Math.tan(Math.PI / 180 * 0.5 * fov);
      const height = 2 * top;
      const width = aspect * height;
      const left = -0.5 * width;
      const right = left + width;
      const bottom = top - height;
      const x = 2 * near / (right - left);
      const y = 2 * near / (top - bottom);
      const a = (right + left) / (right - left);
      const b = (top + bottom) / (top - bottom);
      const c = -far / (far - near);
      const d = -far * near / (far - near);
      this.set(
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
      return this;
    }
  }

  let objectIndex = 0;
  const tempMatrix = new Mat4();
  class Object3D {
    /**
     * Object3D constructor
     */
    constructor() {
      this._parent = null;
      this.children = [];
      this.matricesNeedUpdate = false;
      Object.defineProperty(this, "object3DIndex", { value: objectIndex++ });
      this.setMatrices();
      this.setTransforms();
    }
    /* PARENT */
    /**
     * Get the parent of this {@link Object3D} if any
     */
    get parent() {
      return this._parent;
    }
    /**
     * Set the parent of this {@link Object3D}
     * @param value - new parent to set, could be an {@link Object3D} or null
     */
    set parent(value) {
      if (this._parent && value && this._parent.object3DIndex === value.object3DIndex) {
        return;
      }
      if (this._parent) {
        this._parent.children = this._parent.children.filter((child) => child.object3DIndex !== this.object3DIndex);
      }
      if (value) {
        this.shouldUpdateWorldMatrix();
      }
      this._parent = value;
      this._parent?.children.push(this);
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
     * Set our {@link modelMatrix | model matrix} and {@link worldMatrix | world matrix}
     */
    setMatrices() {
      this.matrices = {
        model: {
          matrix: new Mat4(),
          shouldUpdate: true,
          onUpdate: () => this.updateModelMatrix()
        },
        world: {
          matrix: new Mat4(),
          shouldUpdate: true,
          onUpdate: () => this.updateWorldMatrix()
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
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Get our {@link Mat4 | world matrix}
     */
    get worldMatrix() {
      return this.matrices.world.matrix;
    }
    /**
     * Set our {@link Mat4 | world matrix}
     * @param value - new {@link Mat4 | world matrix}
     */
    set worldMatrix(value) {
      this.matrices.world.matrix = value;
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Set our {@link worldMatrix | world matrix} shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateWorldMatrix() {
      this.matrices.world.shouldUpdate = true;
    }
    /**
     * Rotate this {@link Object3D} so it looks at the {@link Vec3 | target}
     * @param target - {@link Vec3 | target} to look at
     * @param position - {@link Vec3 | postion} from which to look at
     */
    lookAt(target = new Vec3(), position = this.position) {
      const rotationMatrix = tempMatrix.lookAt(target, position);
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
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Update our {@link worldMatrix | model matrix}
     */
    updateWorldMatrix() {
      if (!this.parent) {
        this.worldMatrix.copy(this.modelMatrix);
      } else {
        this.worldMatrix.multiplyMatrices(this.parent.worldMatrix, this.modelMatrix);
      }
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].shouldUpdateWorldMatrix();
      }
    }
    /**
     * Check whether at least one of the matrix should be updated
     */
    shouldUpdateMatrices() {
      this.matricesNeedUpdate = !!Object.values(this.matrices).find((matrix) => matrix.shouldUpdate);
    }
    /**
     * Check at each render whether we should update our matrices, and update them if needed
     */
    updateMatrixStack() {
      this.shouldUpdateMatrices();
      if (this.matricesNeedUpdate) {
        for (const matrixName in this.matrices) {
          if (this.matrices[matrixName].shouldUpdate) {
            this.matrices[matrixName].onUpdate();
            this.matrices[matrixName].shouldUpdate = false;
          }
        }
      }
      for (let i = 0, l = this.children.length; i < l; i++) {
        this.children[i].updateMatrixStack();
      }
    }
    /**
     * Destroy this {@link Object3D}. Removes its parent and set its children free.
     */
    destroy() {
      for (let i = 0, l = this.children.length; i < l; i++) {
        if (this.children[i])
          this.children[i].parent = null;
      }
      this.parent = null;
    }
  }

  const textureUsages = /* @__PURE__ */ new Map([
    ["copySrc", GPUTextureUsage.COPY_SRC],
    ["copyDst", GPUTextureUsage.COPY_DST],
    ["renderAttachment", GPUTextureUsage.RENDER_ATTACHMENT],
    ["storageBinding", GPUTextureUsage.STORAGE_BINDING],
    ["textureBinding", GPUTextureUsage.TEXTURE_BINDING]
  ]);
  const getTextureUsages = (usages = []) => {
    return usages.reduce((acc, v) => {
      return acc | textureUsages.get(v);
    }, 0);
  };
  const getDefaultTextureUsage = (usages = [], textureType) => {
    if (usages.length) {
      return getTextureUsages(usages);
    }
    return textureType !== "storage" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST;
  };
  const getNumMipLevels = (...sizes) => {
    const maxSize = Math.max(...sizes);
    return 1 + Math.log2(maxSize) | 0;
  };

  var __accessCheck$a = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$9 = (obj, member, getter) => {
    __accessCheck$a(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$a = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var _parentRatio, _sourceRatio, _coverScale, _rotationMatrix;
  const defaultDOMTextureParams = {
    name: "texture",
    generateMips: false,
    flipY: false,
    format: "rgba8unorm",
    premultipliedAlpha: false,
    placeholderColor: [0, 0, 0, 255],
    // default to black
    useExternalTextures: true,
    fromTexture: null,
    viewDimension: "2d",
    visibility: ["fragment"],
    cache: true
  };
  class DOMTexture extends Object3D {
    /**
     * DOMTexture constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link DOMTexture}
     * @param parameters - {@link DOMTextureParams | parameters} used to create this {@link DOMTexture}
     */
    constructor(renderer, parameters = defaultDOMTextureParams) {
      super();
      /** Private {@link Vec3 | vector} used for {@link#modelMatrix} calculations, based on {@link parentMesh} {@link core/DOM/DOMElement.RectSize | size} */
      __privateAdd$a(this, _parentRatio, new Vec3(1));
      /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on {@link size | source size} */
      __privateAdd$a(this, _sourceRatio, new Vec3(1));
      /** Private {@link Vec3 | vector} used for {@link modelMatrix} calculations, based on #parentRatio and #sourceRatio */
      __privateAdd$a(this, _coverScale, new Vec3(1));
      /** Private rotation {@link Mat4 | matrix} based on texture {@link quaternion} */
      __privateAdd$a(this, _rotationMatrix, new Mat4());
      // callbacks / events
      /** function assigned to the {@link onSourceLoaded} callback */
      this._onSourceLoadedCallback = () => {
      };
      /** function assigned to the {@link onSourceUploaded} callback */
      this._onSourceUploadedCallback = () => {
      };
      this.type = "Texture";
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const defaultOptions = {
        ...defaultDOMTextureParams,
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
          [this.options.name + "Matrix"]: {
            type: "mat4x4f",
            value: this.modelMatrix
          }
        }
      });
      this.renderer.deviceManager.bufferBindings.set(this.textureMatrix.cacheKey, this.textureMatrix);
      this.setBindings();
      this._parentMesh = null;
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      this.shouldUpdate = false;
      this.renderer.addDOMTexture(this);
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
          bindingType: this.options.sourceType === "externalVideo" ? "externalTexture" : "texture",
          visibility: this.options.visibility,
          texture: this.options.sourceType === "externalVideo" ? this.externalTexture : this.texture,
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
     * Get our texture {@link parentMesh}
     */
    get parentMesh() {
      return this._parentMesh;
    }
    /**
     * Set our texture {@link parentMesh}
     * @param value - texture {@link parentMesh} to set (i.e. any kind of {@link core/renderers/GPURenderer.RenderedMesh | Mesh}
     */
    set parentMesh(value) {
      this._parentMesh = value;
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
      if (!this.parentMesh)
        return;
      const parentScale = this.parentMesh.scale ? this.parentMesh.scale : new Vec3(1, 1, 1);
      const parentWidth = this.parentMesh.boundingRect ? this.parentMesh.boundingRect.width * parentScale.x : this.size.width;
      const parentHeight = this.parentMesh.boundingRect ? this.parentMesh.boundingRect.height * parentScale.y : this.size.height;
      const parentRatio = parentWidth / parentHeight;
      const sourceRatio = this.size.width / this.size.height;
      if (parentWidth > parentHeight) {
        __privateGet$9(this, _parentRatio).set(parentRatio, 1, 1);
        __privateGet$9(this, _sourceRatio).set(1 / sourceRatio, 1, 1);
      } else {
        __privateGet$9(this, _parentRatio).set(1, 1 / parentRatio, 1);
        __privateGet$9(this, _sourceRatio).set(1, sourceRatio, 1);
      }
      const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? __privateGet$9(this, _parentRatio).x * __privateGet$9(this, _sourceRatio).x : __privateGet$9(this, _sourceRatio).y * __privateGet$9(this, _parentRatio).y;
      __privateGet$9(this, _coverScale).set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1);
      __privateGet$9(this, _rotationMatrix).rotateFromQuaternion(this.quaternion);
      this.modelMatrix.identity().premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1)).premultiplyScale(__privateGet$9(this, _coverScale)).premultiplyScale(__privateGet$9(this, _parentRatio)).premultiply(__privateGet$9(this, _rotationMatrix)).premultiplyScale(__privateGet$9(this, _sourceRatio)).premultiplyTranslate(this.transformOrigin).translate(this.position);
    }
    /**
     * If our {@link modelMatrix} has been updated, tell the {@link textureMatrix | texture matrix binding} to update as well
     */
    updateMatrixStack() {
      super.updateMatrixStack();
      if (this.matricesNeedUpdate) {
        this.textureMatrix.shouldUpdateBinding(this.options.name + "Matrix");
      }
    }
    /**
     * Resize our {@link DOMTexture}
     */
    resize() {
      if (this.source && this.source instanceof HTMLCanvasElement && (this.source.width !== this.size.width || this.source.height !== this.size.height)) {
        this.setSourceSize();
        this.createTexture();
      }
      this.shouldUpdateModelMatrix();
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
     * Copy a {@link DOMTexture}
     * @param texture - {@link DOMTexture} to copy
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
        options.mipLevelCount = this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height) : 1;
        this.texture?.destroy();
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
      const cachedTexture = this.renderer.domTextures.find((t) => t.options.source === url);
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
      if (!this.sourceLoaded) {
        this.source = video;
        this.setSourceSize();
        this.resize();
        if (this.options.useExternalTextures) {
          this.options.sourceType = "externalVideo";
          this.texture?.destroy();
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
     * @returns - our {@link DOMTexture}
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
     * @returns - our {@link DOMTexture}
     */
    onSourceUploaded(callback) {
      if (callback) {
        this._onSourceUploadedCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Render a {@link DOMTexture}:
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
     * Destroy the {@link DOMTexture}
     */
    destroy() {
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
      this.renderer.removeDOMTexture(this);
      this.texture?.destroy();
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
      renderer = isRenderer(renderer, type);
      super(renderer, { label, index, bindings, uniforms, storages });
      this.options = {
        ...this.options,
        // will be filled after
        textures: [],
        samplers: []
      };
      if (textures.length) {
        for (const texture of textures) {
          this.addTexture(texture);
        }
      }
      if (samplers.length) {
        for (const sampler of samplers) {
          this.addSampler(sampler);
        }
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
      for (const texture of this.textures) {
        if (texture instanceof DOMTexture) {
          if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
            texture.copy(texture.options.fromTexture);
          }
          if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
            texture.uploadVideoTexture();
          }
        }
      }
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
      this.cacheKey += `${type},`;
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
     * Get the resource cache key
     * @readonly
     */
    get resourceLayoutCacheKey() {
      return `sampler,${this.options.type},${this.visibility},`;
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
      this.wgslGroupFragment = [
        `var ${this.name}: ${this.options.type === "comparison" ? `${this.bindingType}_comparison` : this.bindingType};`
      ];
    }
  }

  var __accessCheck$9 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$8 = (obj, member, getter) => {
    __accessCheck$9(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$9 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$8 = (obj, member, value, setter) => {
    __accessCheck$9(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _fov, _near, _far, _pixelRatio;
  class Camera extends Object3D {
    /**
     * Camera constructor
     * @param parameters - {@link CameraParams | parameters} used to create our {@link Camera}
     */
    constructor({
      fov = 50,
      near = 0.1,
      far = 150,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onMatricesChanged = () => {
      }
    } = {}) {
      super();
      /** Private {@link Camera} field of view */
      __privateAdd$9(this, _fov, void 0);
      /** Private {@link Camera} near plane */
      __privateAdd$9(this, _near, void 0);
      /** Private {@link Camera} far plane */
      __privateAdd$9(this, _far, void 0);
      /** Private {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs */
      __privateAdd$9(this, _pixelRatio, void 0);
      this.uuid = generateUUID();
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
          shouldUpdate: true,
          onUpdate: () => {
            this.viewMatrix.copy(this.worldMatrix).invert();
          }
        },
        projection: {
          matrix: new Mat4(),
          shouldUpdate: true,
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
      this.setVisibleSize();
      this.matrices.view.shouldUpdate = true;
    }
    /**
     * Update our world matrix and tell our view matrix to update as well
     */
    updateWorldMatrix() {
      super.updateWorldMatrix();
      this.matrices.view.shouldUpdate = true;
    }
    /**
     * Callback to run when the camera {@link modelMatrix | model matrix} has been updated
     */
    updateMatrixStack() {
      super.updateMatrixStack();
      if (this.matricesNeedUpdate) {
        this.onMatricesChanged();
      }
    }
    /**
     * Get the {@link Camera} {@link fov | field of view}
     */
    get fov() {
      return __privateGet$8(this, _fov);
    }
    /**
     * Set the {@link Camera} {@link fov | field of view}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param fov - new field of view
     */
    set fov(fov) {
      fov = Math.max(1, Math.min(fov ?? this.fov, 179));
      if (fov !== this.fov) {
        __privateSet$8(this, _fov, fov);
        this.shouldUpdateProjectionMatrix();
      }
      this.setVisibleSize();
      this.setCSSPerspective();
    }
    /**
     * Get the {@link Camera} {@link near} plane value.
     */
    get near() {
      return __privateGet$8(this, _near);
    }
    /**
     * Set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param near - new near plane value
     */
    set near(near) {
      near = Math.max(near ?? this.near, 0.01);
      if (near !== this.near) {
        __privateSet$8(this, _near, near);
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get / set the {@link Camera} {@link far} plane value.
     */
    get far() {
      return __privateGet$8(this, _far);
    }
    /**
     * Set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param far - new far plane value
     */
    set far(far) {
      far = Math.max(far ?? this.far, this.near + 1);
      if (far !== this.far) {
        __privateSet$8(this, _far, far);
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get the {@link Camera} {@link pixelRatio} value.
     */
    get pixelRatio() {
      return __privateGet$8(this, _pixelRatio);
    }
    /**
     * Set the {@link Camera} {@link pixelRatio} value. Update the {@link CSSPerspective} only if the pixel ratio actually changed
     * @param pixelRatio - new pixel ratio value
     */
    set pixelRatio(pixelRatio) {
      __privateSet$8(this, _pixelRatio, pixelRatio ?? this.pixelRatio);
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
      this.setVisibleSize();
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
     * Get visible width / height at a given z-depth from our {@link Camera} parameters.<br>
     * {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269 | See reference}
     * @param depth - depth to use for calculations
     * @returns - visible width and height at given depth
     */
    getVisibleSizeAtDepth(depth = 0) {
      const cameraOffset = this.position.z;
      if (depth < cameraOffset) {
        depth -= cameraOffset;
      } else {
        depth += cameraOffset;
      }
      const vFOV = this.fov * Math.PI / 180;
      const height = 2 * Math.tan(vFOV / 2) * Math.abs(depth);
      return {
        width: height * this.size.width / this.size.height,
        height
      };
    }
    /**
     * Sets visible width / height at a depth of 0.
     */
    setVisibleSize() {
      this.visibleSize = this.getVisibleSizeAtDepth();
    }
    /**
     * Rotate this {@link Camera} so it looks at the {@link Vec3 | target}
     * @param target - {@link Vec3 | target} to look at
     * @param position - {@link Vec3 | postion} from which to look at
     */
    lookAt(target = new Vec3(), position = this.position) {
      super.lookAt(position, target);
    }
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix() {
      this.projectionMatrix.makePerspective({
        fov: this.fov,
        aspect: this.size.width / this.size.height,
        near: this.near,
        far: this.far
      });
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
      type = "filtering",
      compare = null
    } = {}) {
      this.type = "Sampler";
      this.uuid = generateUUID();
      renderer = isRenderer(renderer, label ? label + " " + this.type : this.type);
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
        type,
        ...compare !== null && { compare }
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

  var __accessCheck$8 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$7 = (obj, member, getter) => {
    __accessCheck$8(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$8 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$7 = (obj, member, value, setter) => {
    __accessCheck$8(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _autoResize;
  const defaultTextureParams = {
    label: "Texture",
    name: "renderTexture",
    // default to 'renderTexture' for render target usage
    type: "texture",
    access: "write",
    fromTexture: null,
    viewDimension: "2d",
    sampleCount: 1,
    qualityRatio: 1,
    // copy external texture options
    generateMips: false,
    flipY: false,
    premultipliedAlpha: false,
    autoDestroy: true
  };
  class Texture {
    /**
     * Texture constructor
     * @param renderer - {@link Renderer | renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - {@link TextureParams | parameters} used to create this {@link Texture}
     */
    constructor(renderer, parameters = defaultTextureParams) {
      /** Whether this texture should be automatically resized when the {@link Renderer renderer} size changes. Default to true. */
      __privateAdd$8(this, _autoResize, true);
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " Texture" : "Texture");
      this.type = "Texture";
      this.renderer = renderer;
      this.uuid = generateUUID();
      this.options = { ...defaultTextureParams, ...parameters };
      if (this.options.format === "rgba32float" && !this.renderer.deviceManager.adapter.features.has("float32-filterable")) {
        this.options.format = "rgba16float";
      }
      if (parameters.fromTexture) {
        this.options.format = parameters.fromTexture.texture.format;
        this.options.sampleCount = parameters.fromTexture.texture.sampleCount;
        this.options.viewDimension = parameters.fromTexture.options.viewDimension;
      }
      if (!this.options.format) {
        this.options.format = this.renderer.options.preferredFormat;
      }
      this.size = this.options.fixedSize ? {
        width: this.options.fixedSize.width * this.options.qualityRatio,
        height: this.options.fixedSize.height * this.options.qualityRatio,
        depth: this.options.fixedSize.depth ?? this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
      } : {
        width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
        height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
        depth: this.options.viewDimension.indexOf("cube") !== -1 ? 6 : 1
      };
      if (this.options.fixedSize) {
        __privateSet$7(this, _autoResize, false);
      }
      this.setBindings();
      this.renderer.addTexture(this);
      this.createTexture();
    }
    /**
     * Copy another {@link Texture} into this {@link Texture}
     * @param texture - {@link Texture} to copy
     */
    copy(texture) {
      this.options.fromTexture = texture;
      this.createTexture();
    }
    /**
     * Copy a {@link GPUTexture} directly into this {@link Texture}. Mainly used for depth textures.
     * @param texture - {@link GPUTexture} to copy
     */
    copyGPUTexture(texture) {
      this.size = {
        width: texture.width,
        height: texture.height,
        depth: texture.depthOrArrayLayers
      };
      this.options.format = texture.format;
      this.options.sampleCount = texture.sampleCount;
      this.texture = texture;
      this.textureBinding.setFormat(this.options.format);
      this.textureBinding.setMultisampled(this.options.sampleCount > 1);
      this.textureBinding.resource = this.texture;
    }
    /**
     * Create the {@link GPUTexture | texture} (or copy it from source) and update the {@link TextureBinding#resource | binding resource}
     */
    createTexture() {
      if (!this.size.width || !this.size.height)
        return;
      if (this.options.fromTexture) {
        this.copyGPUTexture(this.options.fromTexture.texture);
        return;
      }
      this.texture?.destroy();
      this.texture = this.renderer.createTexture({
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height, this.size.depth ?? 1],
        dimensions: this.options.viewDimension,
        sampleCount: this.options.sampleCount,
        mipLevelCount: this.options.generateMips ? getNumMipLevels(this.size.width, this.size.height, this.size.depth ?? 1) : 1,
        usage: getDefaultTextureUsage(this.options.usage, this.options.type)
      });
      this.textureBinding.resource = this.texture;
    }
    /**
     * Upload a source to the GPU and use it for our {@link texture}.
     * @param parameters - parameters used to upload the source.
     * @param parameters.source - source to use for our {@link texture}.
     * @param parameters.width - source width.
     * @param parameters.height - source height.
     * @param parameters.depth - source depth.
     * @param parameters.origin - {@link GPUOrigin3D | origin} of the source copy.
     */
    uploadSource({
      source,
      width = this.size.width,
      height = this.size.height,
      depth = this.size.depth,
      origin = [0, 0, 0],
      colorSpace = "srgb"
    }) {
      this.renderer.device.queue.copyExternalImageToTexture(
        { source, flipY: this.options.flipY },
        { texture: this.texture, premultipliedAlpha: this.options.premultipliedAlpha, origin, colorSpace },
        [width, height, depth]
      );
      if (this.texture.mipLevelCount > 1) {
        generateMips(this.renderer.device, this.texture);
      }
    }
    /**
     * Use data as the {@link texture} source and upload it to the GPU.
     * @param parameters - parameters used to upload the source.
     * @param parameters.width - data source width.
     * @param parameters.height - data source height.
     * @param parameters.depth - data source depth.
     * @param parameters.origin - {@link GPUOrigin3D | origin} of the data source copy.
     * @param parameters.data - {@link Float32Array} data to use as source.
     */
    uploadData({
      width = this.size.width,
      height = this.size.height,
      depth = this.size.depth,
      origin = [0, 0, 0],
      data = new Float32Array(width * height * 4)
    }) {
      this.renderer.device.queue.writeTexture(
        { texture: this.texture, origin },
        data,
        { bytesPerRow: width * data.BYTES_PER_ELEMENT * 4, rowsPerImage: height },
        [width, height, depth]
      );
      if (this.texture.mipLevelCount > 1) {
        generateMips(this.renderer.device, this.texture);
      }
    }
    /**
     * Set our {@link Texture#bindings | bindings}
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": " + this.options.name + " texture",
          name: this.options.name,
          bindingType: this.options.type,
          visibility: this.options.visibility,
          texture: this.texture,
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
     * Resize our {@link Texture}, which means recreate it/copy it again and tell the {@link core/bindGroups/TextureBindGroup.TextureBindGroup | texture bind group} to update
     * @param size - the optional new {@link TextureSize | size} to set
     */
    resize(size = null) {
      if (!__privateGet$7(this, _autoResize))
        return;
      if (!size) {
        size = {
          width: Math.floor(this.renderer.canvas.width * this.options.qualityRatio),
          height: Math.floor(this.renderer.canvas.height * this.options.qualityRatio),
          depth: 1
        };
      }
      if (size.width === this.size.width && size.height === this.size.height && size.depth === this.size.depth) {
        return;
      }
      this.size = size;
      this.createTexture();
    }
    /**
     * Destroy our {@link Texture}
     */
    destroy() {
      this.renderer.removeTexture(this);
      if (!this.options.fromTexture) {
        this.texture?.destroy();
      }
      this.texture = null;
    }
  }
  _autoResize = new WeakMap();

  class Material {
    /**
     * Material constructor
     * @param renderer - our renderer class object
     * @param parameters - {@link types/Materials.MaterialParams | parameters} used to create our Material
     */
    constructor(renderer, parameters) {
      this.type = "Material";
      renderer = isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const {
        shaders,
        label,
        useAsyncPipeline,
        uniforms,
        storages,
        bindings,
        bindGroups,
        samplers,
        textures,
        domTextures
      } = parameters;
      this.options = {
        shaders,
        label,
        useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
        ...uniforms !== void 0 && { uniforms },
        ...storages !== void 0 && { storages },
        ...bindings !== void 0 && { bindings },
        ...bindGroups !== void 0 && { bindGroups },
        ...samplers !== void 0 && { samplers },
        ...textures !== void 0 && { textures },
        ...domTextures !== void 0 && { domTextures }
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
      for (const texture of this.domTextures) {
        texture.texture = null;
        texture.sourceUploaded = false;
      }
      for (const texture of this.textures) {
        texture.texture = null;
      }
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach(
        (bindGroup) => bindGroup.loseContext()
      );
      this.pipelineEntry.pipeline = null;
    }
    /**
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored to recreate our samplers, textures and bind groups.
     */
    restoreContext() {
      for (const sampler of this.samplers) {
        sampler.createSampler();
        sampler.binding.resource = sampler.sampler;
      }
      for (const texture of this.domTextures) {
        texture.createTexture();
        texture.resize();
      }
      for (const texture of this.textures) {
        texture.resize(texture.size);
      }
      [...this.bindGroups, ...this.clonedBindGroups, ...this.inputsBindGroups].forEach((bindGroup) => {
        bindGroup.restoreContext();
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
      this.uniforms = {};
      this.storages = {};
      this.inputsBindGroups = [];
      this.inputsBindings = /* @__PURE__ */ new Map();
      if (this.options.uniforms || this.options.storages || this.options.bindings) {
        const inputsBindGroup = new BindGroup(this.renderer, {
          label: this.options.label + ": Bindings bind group",
          uniforms: this.options.uniforms,
          storages: this.options.storages,
          bindings: this.options.bindings
        });
        this.processBindGroupBindings(inputsBindGroup);
        this.inputsBindGroups.push(inputsBindGroup);
        inputsBindGroup.consumers.add(this.uuid);
      }
      this.options.bindGroups?.forEach((bindGroup) => {
        this.processBindGroupBindings(bindGroup);
        this.inputsBindGroups.push(bindGroup);
        bindGroup.consumers.add(this.uuid);
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
      for (const inputBinding of bindGroup.bindings) {
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
        this.inputsBindings.set(inputBinding.name, inputBinding);
      }
    }
    /**
     * Create the bind groups if they need to be created
     */
    createBindGroups() {
      if (this.texturesBindGroup.shouldCreateBindGroup) {
        this.texturesBindGroup.setIndex(this.bindGroups.length);
        this.texturesBindGroup.createBindGroup();
        this.bindGroups.push(this.texturesBindGroup);
      }
      for (const bindGroup of this.inputsBindGroups) {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.setIndex(this.bindGroups.length);
          bindGroup.createBindGroup();
          this.bindGroups.push(bindGroup);
        }
      }
      this.options.bindGroups?.forEach((bindGroup) => {
        if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          bindGroup.setIndex(this.bindGroups.length);
          this.bindGroups.push(bindGroup);
        }
        if (bindGroup instanceof TextureBindGroup && !this.texturesBindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          this.texturesBindGroups.push(bindGroup);
          for (const texture of bindGroup.textures) {
            if (texture instanceof DOMTexture && !this.domTextures.find((t) => t.uuid === texture.uuid)) {
              this.domTextures.push(texture);
            } else if (texture instanceof Texture && !this.textures.find((t) => t.uuid === texture.uuid)) {
              this.textures.push(texture);
            }
          }
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
      bindGroup.consumers.delete(this.uuid);
      if (!bindGroup.consumers.size) {
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
      for (const bindGroup of this.bindGroups) {
        bindGroup.update();
        if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
          this.pipelineEntry.flushPipelineEntry(this.bindGroups);
          bindGroup.needsPipelineFlush = false;
        }
      }
    }
    /* INPUTS */
    /**
     * Look for a {@link BindGroupBindingElement | binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName = "") {
      return this.inputsBindings.get(bindingName);
    }
    /**
     * Look for a {@link BindGroupBufferBindingElement | buffer binding} by name in all {@link inputsBindings | input bindings}
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBufferBindingByName(bindingName = "") {
      const bufferBinding = this.getBindingByName(bindingName);
      return bufferBinding && "buffer" in bufferBinding ? bufferBinding : void 0;
    }
    /**
     * Force setting a given {@link BufferBindingInput | buffer binding} shouldUpdate flag to `true` to update it at next render
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
      this.domTextures = [];
      this.textures = [];
      this.texturesBindGroups.push(
        new TextureBindGroup(this.renderer, {
          label: this.options.label + ": Textures bind group"
        })
      );
      this.texturesBindGroup.consumers.add(this.uuid);
      this.options.domTextures?.forEach((texture) => {
        this.addTexture(texture);
      });
      this.options.textures?.forEach((texture) => {
        this.addTexture(texture);
      });
    }
    /**
     * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param texture - texture to add
     */
    addTexture(texture) {
      if (texture instanceof DOMTexture) {
        this.domTextures.push(texture);
      } else if (texture instanceof Texture) {
        this.textures.push(texture);
      }
      if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
        this.texturesBindGroup.addTexture(texture);
      }
    }
    /**
     * Destroy a {@link DOMTexture} or {@link Texture}, only if it is not used by another object or cached.
     * @param texture - {@link DOMTexture} or {@link Texture} to eventually destroy
     */
    destroyTexture(texture) {
      if (texture.options.cache)
        return;
      if (!texture.options.autoDestroy)
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
      this.domTextures?.forEach((texture) => this.destroyTexture(texture));
      this.textures?.forEach((texture) => this.destroyTexture(texture));
      this.domTextures = [];
      this.textures = [];
    }
    /**
     * Prepare our samplers array and always add a default sampler if not already passed as parameter
     */
    setSamplers() {
      this.samplers = [];
      this.options.samplers?.forEach((sampler) => {
        this.addSampler(sampler);
      });
      const hasDefaultSampler = this.samplers.find((sampler) => sampler.name === "defaultSampler");
      if (!hasDefaultSampler) {
        const sampler = new Sampler(this.renderer, { label: "Default sampler", name: "defaultSampler" });
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
     * Map a {@link Buffer#GPUBuffer | Buffer's GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param buffer - {@link Buffer} to use for mapping
     * @async
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data
     */
    async getBufferResult(buffer) {
      return await buffer.mapBufferAsync();
    }
    /**
     * Map the content of a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}
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
     * Map the content of a specific {@link BufferElement | buffer element} belonging to a {@link BufferBinding} {@link Buffer#GPUBuffer | GPU buffer} and put a copy of the data into a {@link Float32Array}
     * @param parameters - parameters used to get the result
     * @param parameters.bindingName - The name of the {@link inputsBindings | input bindings} from which to map the {@link Buffer#GPUBuffer | GPU buffer}
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
     * Then render the {@link domTextures}
     * Finally updates all the {@link bindGroups | bind groups}
     */
    onBeforeRender() {
      this.compileMaterial();
      for (const texture of this.domTextures) {
        texture.render();
      }
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
     * Use the {@link Renderer#pipelineManager | renderer pipelineManager} to only set the bind groups that are not already set.
     * @param pass - current pass encoder
     */
    setActiveBindGroups(pass) {
      this.renderer.pipelineManager.setActiveBindGroups(pass, this.bindGroups);
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
      this.setActiveBindGroups(pass);
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
      const type = "ComputeMaterial";
      renderer = isRenderer(renderer, type);
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
        for (const bindGroup of this.bindGroups) {
          pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        }
        pass.dispatchWorkgroups(this.dispatchSize[0], this.dispatchSize[1], this.dispatchSize[2]);
      }
    }
    /* RESULT BUFFER */
    /**
     * Copy all writable binding buffers that need it
     * @param commandEncoder - current command encoder
     */
    copyBufferToResult(commandEncoder) {
      for (const bindGroup of this.bindGroups) {
        bindGroup.bufferBindings.forEach((binding) => {
          if (binding.shouldCopyResult) {
            this.renderer.copyBufferToBuffer({
              srcBuffer: binding.buffer,
              dstBuffer: binding.resultBuffer,
              commandEncoder
            });
          }
        });
      }
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
      if (binding && "resultBuffer" in binding) {
        const result = await this.getBufferResult(binding.resultBuffer);
        if (bufferElementName && result.length) {
          return binding.extractBufferElementDataFromBufferResult({ result, bufferElementName });
        } else {
          return result;
        }
      } else {
        return new Float32Array(0);
      }
    }
  }

  var __accessCheck$7 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$6 = (obj, member, getter) => {
    __accessCheck$7(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$7 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$6 = (obj, member, value, setter) => {
    __accessCheck$7(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _autoRender$1;
  let computePassIndex = 0;
  class ComputePass {
    /**
     * ComputePass constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - {@link ComputePassParams | parameters} used to create our {@link ComputePass}
     */
    constructor(renderer, parameters = {}) {
      /**
       * Whether this {@link ComputePass} should be added to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically
       * @private
       */
      __privateAdd$7(this, _autoRender$1, true);
      // callbacks / events
      /** function assigned to the {@link onReady} callback */
      this._onReadyCallback = () => {
      };
      /** function assigned to the {@link onBeforeRender} callback */
      this._onBeforeRenderCallback = () => {
      };
      /** function assigned to the {@link onRender} callback */
      this._onRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterRender} callback */
      this._onAfterRenderCallback = () => {
      };
      /** function assigned to the {@link onAfterResize} callback */
      this._onAfterResizeCallback = () => {
      };
      const type = "ComputePass";
      renderer = isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
      parameters.label = parameters.label ?? "ComputePass " + renderer.computePasses?.length;
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
        domTextures,
        textures,
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
        ...dispatchSize !== void 0 && { dispatchSize },
        useAsyncPipeline: useAsyncPipeline === void 0 ? true : useAsyncPipeline,
        texturesOptions
        // TODO default
      };
      this.renderOrder = renderOrder ?? 0;
      if (autoRender !== void 0) {
        __privateSet$6(this, _autoRender$1, autoRender);
      }
      this.userData = {};
      this.ready = false;
      this.setMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        uniforms,
        storages,
        bindGroups,
        samplers,
        textures,
        domTextures,
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
      if (__privateGet$6(this, _autoRender$1)) {
        this.renderer.scene.addComputePass(this);
      }
    }
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene() {
      if (__privateGet$6(this, _autoRender$1)) {
        this.renderer.scene.removeComputePass(this);
      }
      this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
    }
    /**
     * Create the compute pass material
     * @param computeParameters - {@link ComputeMaterial} parameters
     */
    setMaterial(computeParameters) {
      this.useMaterial(new ComputeMaterial(this.renderer, computeParameters));
    }
    /**
     * Set or update the {@link ComputePass} {@link ComputeMaterial}
     * @param material - new {@link ComputeMaterial} to use
     */
    useMaterial(material) {
      this.material = material;
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
     * Get our {@link ComputeMaterial#domTextures | ComputeMaterial domTextures array}
     * @readonly
     */
    get domTextures() {
      return this.material?.domTextures || [];
    }
    /**
     * Get our {@link ComputeMaterial#textures | ComputeMaterial textures array}
     * @readonly
     */
    get textures() {
      return this.material?.textures || [];
    }
    /**
     * Create a new {@link DOMTexture}
     * @param options - {@link DOMTextureParams | DOMTexture parameters}
     * @returns - newly created {@link DOMTexture}
     */
    createDOMTexture(options) {
      if (!options.name) {
        options.name = "texture" + (this.textures.length + this.domTextures.length);
      }
      if (!options.label) {
        options.label = this.options.label + " " + options.name;
      }
      const domTexture = new DOMTexture(this.renderer, { ...options, ...this.options.texturesOptions });
      this.addTexture(domTexture);
      return domTexture;
    }
    /**
     * Create a new {@link Texture}
     * @param  options - {@link TextureParams | Texture parameters}
     * @returns - newly created {@link Texture}
     */
    createTexture(options) {
      if (!options.name) {
        options.name = "texture" + (this.textures.length + this.domTextures.length);
      }
      const texture = new Texture(this.renderer, options);
      this.addTexture(texture);
      return texture;
    }
    /**
     * Add a {@link Texture} or {@link DOMTexture}
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.material.addTexture(texture);
    }
    /**
     * Get our {@link ComputeMaterial#uniforms | ComputeMaterial uniforms}
     * @readonly
     */
    get uniforms() {
      return this.material?.uniforms;
    }
    /**
     * Get our {@link ComputeMaterial#storages | ComputeMaterial storages}
     * @readonly
     */
    get storages() {
      return this.material?.storages;
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
      !this.renderer.production && pass.pushDebugGroup(this.options.label);
      this.onRenderPass(pass);
      !this.renderer.production && pass.popDebugGroup();
      this.onAfterRenderPass();
    }
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array
     * @param commandEncoder - current GPU command encoder
     */
    copyBufferToResult(commandEncoder) {
      this.material?.copyBufferToResult(commandEncoder);
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
      return await this.material?.getComputeResult({ bindingName, bufferElementName });
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
      this.material?.destroy();
    }
  }
  _autoRender$1 = new WeakMap();

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
     * Check whether the {@link Box3} min and max values have actually been set
     */
    isEmpty() {
      return this.max.x < this.min.x || this.max.y < this.min.y || this.max.z < this.min.z;
    }
    /**
     * Copy a {@link Box3} into this {@link Box3}.
     * @param box - {@link Box3} to copy
     */
    copy(box) {
      this.set(box.min.clone(), box.max.clone());
      return this;
    }
    /**
     * Clone this {@link Box3}
     * @returns - cloned {@link Box3}
     */
    clone() {
      return new Box3().copy(this);
    }
    /**
     * Get the {@link Box3} center
     * @readonly
     * @returns - {@link Vec3 | center vector} of the {@link Box3}
     */
    get center() {
      return this.max.clone().add(this.min).multiplyScalar(0.5);
    }
    /**
     * Get the {@link Box3} size
     * @readonly
     * @returns - {@link Vec3 | size vector} of the {@link Box3}
     */
    get size() {
      return this.max.clone().sub(this.min);
    }
    /**
     * Get the {@link Box3} radius
     * @readonly
     * @returns - radius of the {@link Box3}
     */
    get radius() {
      return this.max.distance(this.min) * 0.5;
    }
    /**
     * Apply a {@link Mat4 | matrix} to a {@link Box3}
     * Useful to apply a transformation {@link Mat4 | matrix} to a {@link Box3}
     * @param matrix - {@link Mat4 | matrix} to use
     * @returns - this {@link Box3} after {@link Mat4 | matrix} application
     */
    applyMat4(matrix = new Mat4()) {
      if (this.isEmpty())
        return this;
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
          ...vertexBuffer.array && { array: vertexBuffer.array },
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
     * Reset all the {@link vertexBuffers | vertex buffers} when the device is lost
     */
    loseContext() {
      this.ready = false;
      for (const vertexBuffer of this.vertexBuffers) {
        vertexBuffer.buffer.destroy();
      }
    }
    /**
     * Restore the {@link Geometry} buffers on context restoration
     * @param renderer - The {@link Renderer} used to recreate the buffers
     */
    restoreContext(renderer) {
      if (this.ready)
        return;
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
     * Add a vertex buffer to our Geometry, set its attributes and return it
     * @param parameters - vertex buffer {@link VertexBufferParams | parameters}
     * @returns - newly created {@link VertexBuffer | vertex buffer}
     */
    addVertexBuffer({
      stepMode = "vertex",
      name,
      attributes = [],
      buffer = null,
      array = null,
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
        buffer,
        array,
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
      const attribute = {
        name,
        type,
        bufferFormat,
        size,
        bufferLength: arrayLength,
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
     * Get whether this Geometry is ready to compute, i.e. if its first vertex buffer array has not been created yet
     * @readonly
     */
    get shouldCompute() {
      return this.vertexBuffers.length && !this.vertexBuffers[0].array;
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
      if (this.ready)
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
              vertexBuffer.array[currentIndex] = attributeValue ?? 0;
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
      if (!this.wgslStructFragment) {
        this.setWGSLFragment();
      }
    }
    /**
     * Set the WGSL code snippet that will be appended to the vertex shader.
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
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label = this.type }) {
      if (this.ready)
        return;
      for (const vertexBuffer of this.vertexBuffers) {
        if (!vertexBuffer.bufferSize) {
          vertexBuffer.bufferSize = vertexBuffer.array.length * vertexBuffer.array.constructor.BYTES_PER_ELEMENT;
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
        new buffer.array.constructor(buffer.buffer.GPUBuffer.getMappedRange()).set(
          buffer.array
        );
        buffer.buffer.GPUBuffer.unmap();
      } else {
        renderer.queueWriteBuffer(buffer.buffer.GPUBuffer, 0, buffer.array);
      }
    }
    /** RENDER **/
    /**
     * Set our render pass geometry vertex buffers
     * @param pass - current render pass
     */
    setGeometryBuffers(pass) {
      this.vertexBuffers.forEach((vertexBuffer, index) => {
        pass.setVertexBuffer(index, vertexBuffer.buffer.GPUBuffer, vertexBuffer.bufferOffset, vertexBuffer.bufferSize);
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
        if (renderer)
          renderer.removeBuffer(vertexBuffer.buffer);
      }
    }
  }

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
      mapBuffersAtCreation = true
    } = {}) {
      super({ verticesOrder, topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
      this.type = "IndexedGeometry";
    }
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
      if (this.ready)
        return;
      if (!this.indexBuffer.buffer.GPUBuffer) {
        this.indexBuffer.buffer.createBuffer(renderer);
        this.uploadBuffer(renderer, this.indexBuffer);
        this.indexBuffer.buffer.consumers.add(this.uuid);
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
    setIndexBuffer({
      bufferFormat = "uint32",
      array = new Uint32Array(0),
      buffer = new Buffer(),
      bufferOffset = 0,
      bufferSize = null
    }) {
      this.indexBuffer = {
        array,
        bufferFormat,
        bufferLength: array.length,
        buffer,
        bufferOffset,
        bufferSize: bufferSize !== null ? bufferSize : array.length * array.constructor.BYTES_PER_ELEMENT
      };
    }
    /**
     * Create the {@link Geometry} {@link vertexBuffers | vertex buffers} and {@link indexBuffer | index buffer}.
     * @param parameters - parameters used to create the vertex buffers.
     * @param parameters.renderer - {@link Renderer} used to create the vertex buffers.
     * @param parameters.label - label to use for the vertex buffers.
     */
    createBuffers({ renderer, label = this.type }) {
      if (!this.indexBuffer.buffer.GPUBuffer) {
        this.indexBuffer.buffer.createBuffer(renderer, {
          label: label + ": index buffer",
          size: this.indexBuffer.array.byteLength,
          usage: this.options.mapBuffersAtCreation ? ["index"] : ["copyDst", "index"],
          mappedAtCreation: this.options.mapBuffersAtCreation
        });
        this.uploadBuffer(renderer, this.indexBuffer);
      }
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
      pass.setIndexBuffer(
        this.indexBuffer.buffer.GPUBuffer,
        this.indexBuffer.bufferFormat,
        this.indexBuffer.bufferOffset,
        this.indexBuffer.bufferSize
      );
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
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation: true });
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
      for (const attribute of Object.values(attributes)) {
        this.setAttribute(attribute);
      }
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
          uv.array[uvOffset++] = 1 - x / this.definition.width;
          uv.array[uvOffset++] = 1 - y / this.definition.height;
          position.array[positionOffset++] = 1 - x * 2 / this.definition.width;
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

  const compareRenderingOptions = (newOptions = {}, baseOptions = {}) => {
    return Object.keys(newOptions).filter((key) => {
      if (Array.isArray(newOptions[key])) {
        return JSON.stringify(newOptions[key]) !== JSON.stringify(baseOptions[key]);
      } else {
        return newOptions[key] !== baseOptions[key];
      }
    });
  };

  var default_projected_vsWgsl = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = getOutputPosition(attributes.position);
  vsOutput.uv = attributes.uv;
  vsOutput.normal = getWorldNormal(attributes.normal);
  
  return vsOutput;
}`
  );

  var default_vsWgsl = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn main(
  attributes: Attributes,
) -> VSOutput {
  var vsOutput: VSOutput;

  vsOutput.position = vec4f(attributes.position, 1.0);
  vsOutput.uv = attributes.uv;
  
  return vsOutput;
}`
  );

  var default_fsWgsl = (
    /* wgsl */
    `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`
  );

  class RenderMaterial extends Material {
    /**
     * RenderMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - {@link RenderMaterialParams | parameters} used to create our RenderMaterial
     */
    constructor(renderer, parameters) {
      const type = "RenderMaterial";
      renderer = isRenderer(renderer, type);
      if (!parameters.shaders) {
        parameters.shaders = {};
      }
      if (!parameters.shaders?.vertex) {
        parameters.shaders.vertex = {
          code: parameters.useProjection ? default_projected_vsWgsl : default_vsWgsl,
          entryPoint: "main"
        };
      }
      if (!parameters.shaders.vertex.entryPoint) {
        parameters.shaders.vertex.entryPoint = "main";
      }
      if (parameters.shaders.fragment === void 0) {
        parameters.shaders.fragment = {
          entryPoint: "main",
          code: default_fsWgsl
        };
      }
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      const { shaders } = parameters;
      const {
        useProjection,
        transparent,
        depth,
        depthWriteEnabled,
        depthCompare,
        depthFormat,
        cullMode,
        sampleCount,
        verticesOrder,
        topology
      } = parameters;
      let { targets } = parameters;
      if (targets === void 0) {
        targets = [
          {
            format: this.renderer.options.preferredFormat
          }
        ];
      }
      if (targets && targets.length && !targets[0].format) {
        targets[0].format = this.renderer.options.preferredFormat;
      }
      this.options = {
        ...this.options,
        shaders,
        rendering: {
          useProjection,
          transparent,
          depth,
          depthWriteEnabled,
          depthCompare,
          depthFormat,
          cullMode,
          sampleCount,
          targets,
          verticesOrder,
          topology
        }
      };
      this.attributes = null;
      this.pipelineEntry = null;
    }
    /**
     * Set (or reset) the current {@link pipelineEntry}. Use the {@link Renderer#pipelineManager | renderer pipelineManager} to check whether we can get an already created {@link RenderPipelineEntry} from cache or if we should create a new one.
     */
    setPipelineEntry() {
      this.pipelineEntry = this.renderer.pipelineManager.createRenderPipeline({
        renderer: this.renderer,
        label: this.options.label + " render pipeline",
        shaders: this.options.shaders,
        useAsync: this.options.useAsyncPipeline,
        rendering: this.options.rendering,
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
      if (this.attributes && !this.pipelineEntry) {
        this.setPipelineEntry();
      }
      if (this.pipelineEntry && this.pipelineEntry.canCompile) {
        await this.compilePipelineEntry();
      }
    }
    /**
     * Set or reset one of the {@link RenderMaterialRenderingOptions | rendering options}. Should be use with great caution, because if the {@link RenderPipelineEntry#pipeline | render pipeline} has already been compiled, it can cause a pipeline flush.
     * @param renderingOptions - new {@link RenderMaterialRenderingOptions | rendering options} properties to be set
     */
    setRenderingOptions(renderingOptions = {}) {
      const newProperties = compareRenderingOptions(renderingOptions, this.options.rendering);
      const oldRenderingOptions = { ...this.options.rendering };
      this.options.rendering = { ...this.options.rendering, ...renderingOptions };
      if (this.pipelineEntry) {
        if (this.pipelineEntry.ready && newProperties.length) {
          if (!this.renderer.production) {
            const oldProps = newProperties.map((key) => {
              return {
                [key]: Array.isArray(oldRenderingOptions[key]) ? oldRenderingOptions[key].map((optKey) => optKey) : oldRenderingOptions[key]
              };
            });
            const newProps = newProperties.map((key) => {
              return {
                [key]: Array.isArray(renderingOptions[key]) ? renderingOptions[key].map((optKey) => optKey) : renderingOptions[key]
              };
            });
            throwWarning(
              `${this.options.label}: the change of rendering options is causing this RenderMaterial pipeline to be recompiled. This should be avoided.

Old rendering options: ${JSON.stringify(
              oldProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}

--------

New rendering options: ${JSON.stringify(
              newProps.reduce((acc, v) => {
                return { ...acc, ...v };
              }, {}),
              null,
              4
            )}`
            );
          }
          this.setPipelineEntry();
        } else {
          this.pipelineEntry.options.rendering = { ...this.pipelineEntry.options.rendering, ...this.options.rendering };
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
        vertexBuffers: geometry.vertexBuffers,
        layoutCacheKey: geometry.layoutCacheKey
      };
    }
    /* BIND GROUPS */
    /**
     * Create the bind groups if they need to be created, but first add Camera bind group if needed
     */
    createBindGroups() {
      if ("cameraBindGroup" in this.renderer && this.options.rendering.useProjection) {
        this.bindGroups.push(this.renderer.cameraBindGroup);
        this.renderer.cameraBindGroup.consumers.add(this.uuid);
      }
      super.createBindGroups();
    }
  }

  var __accessCheck$6 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$5 = (obj, member, getter) => {
    __accessCheck$6(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$6 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$5 = (obj, member, value, setter) => {
    __accessCheck$6(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  let meshIndex = 0;
  const defaultMeshBaseParams = {
    // material
    autoRender: true,
    useProjection: false,
    useAsyncPipeline: true,
    // rendering
    cullMode: "back",
    depth: true,
    depthWriteEnabled: true,
    depthCompare: "less",
    depthFormat: "depth24plus",
    transparent: false,
    visible: true,
    renderOrder: 0,
    // textures
    texturesOptions: {}
  };
  function MeshBaseMixin(Base) {
    var _autoRender, _a;
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
        /** Whether we should add this {@link MeshBase} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
        __privateAdd$6(this, _autoRender, true);
        // callbacks / events
        /** function assigned to the {@link onReady} callback */
        this._onReadyCallback = () => {
        };
        /** function assigned to the {@link onBeforeRender} callback */
        this._onBeforeRenderCallback = () => {
        };
        /** function assigned to the {@link onRender} callback */
        this._onRenderCallback = () => {
        };
        /** function assigned to the {@link onAfterRender} callback */
        this._onAfterRenderCallback = () => {
        };
        /** function assigned to the {@link onAfterResize} callback */
        this._onAfterResizeCallback = () => {
        };
        let renderer = params[0];
        const parameters = { ...defaultMeshBaseParams, ...params[2] };
        this.type = "MeshBase";
        this.uuid = generateUUID();
        Object.defineProperty(this, "index", { value: meshIndex++ });
        renderer = isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const {
          label,
          shaders,
          geometry,
          visible,
          renderOrder,
          outputTarget,
          texturesOptions,
          autoRender,
          ...meshParameters
        } = parameters;
        this.outputTarget = outputTarget ?? null;
        meshParameters.sampleCount = !!meshParameters.sampleCount ? meshParameters.sampleCount : this.outputTarget ? this.outputTarget.renderPass.options.sampleCount : this.renderer && this.renderer.renderPass ? this.renderer.renderPass.options.sampleCount : 1;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          label: label ?? "Mesh " + this.renderer.meshes.length,
          ...shaders !== void 0 ? { shaders } : {},
          ...outputTarget !== void 0 && { outputTarget },
          texturesOptions,
          ...autoRender !== void 0 && { autoRender },
          ...meshParameters
        };
        if (autoRender !== void 0) {
          __privateSet$5(this, _autoRender, autoRender);
        }
        this.visible = visible;
        this.renderOrder = renderOrder;
        this.ready = false;
        this.userData = {};
        if (geometry) {
          this.useGeometry(geometry);
        }
        this.setMaterial({
          ...this.cleanupRenderMaterialParameters({ ...this.options }),
          ...geometry && { verticesOrder: geometry.verticesOrder, topology: geometry.topology }
        });
        this.addToScene(true);
      }
      /**
       * Get private #autoRender value
       * @readonly
       */
      get autoRender() {
        return __privateGet$5(this, _autoRender);
      }
      /**
       * Get/set whether a Mesh is ready or not
       * @readonly
       */
      get ready() {
        return this._ready;
      }
      set ready(value) {
        if (value && !this._ready) {
          this._onReadyCallback && this._onReadyCallback();
        }
        this._ready = value;
      }
      /* SCENE */
      /**
       * Add a Mesh to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer. Can patch the {@link RenderMaterial} render options to match the {@link RenderPass} used to draw this Mesh.
       * @param addToRenderer - whether to add this Mesh to the {@link Renderer#meshes | Renderer meshes array}
       */
      addToScene(addToRenderer = false) {
        if (addToRenderer) {
          this.renderer.meshes.push(this);
        }
        this.setRenderingOptionsForRenderPass(this.outputTarget ? this.outputTarget.renderPass : this.renderer.renderPass);
        if (__privateGet$5(this, _autoRender)) {
          this.renderer.scene.addMesh(this);
        }
      }
      /**
       * Remove a Mesh from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
       * @param removeFromRenderer - whether to remove this Mesh from the {@link Renderer#meshes | Renderer meshes array}
       */
      removeFromScene(removeFromRenderer = false) {
        if (__privateGet$5(this, _autoRender)) {
          this.renderer.scene.removeMesh(this);
        }
        if (removeFromRenderer) {
          this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
        }
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
        this.removeFromScene(true);
        this.renderer = renderer;
        this.addToScene(true);
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
       * @param outputTarget - the RenderTarget to assign or null if we want to remove the current RenderTarget
       */
      setOutputTarget(outputTarget) {
        if (outputTarget && outputTarget.type !== "RenderTarget") {
          throwWarning(`${this.options.label ?? this.type}: outputTarget is not a RenderTarget: ${outputTarget}`);
          return;
        }
        this.removeFromScene();
        this.outputTarget = outputTarget;
        this.addToScene();
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been lost to prepare everything for restoration.
       * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the Mesh
       */
      loseContext() {
        this.ready = false;
        this.geometry.loseContext();
        this.material.loseContext();
      }
      /**
       * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored
       */
      restoreContext() {
        this.geometry.restoreContext(this.renderer);
        this.material.restoreContext();
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing
       */
      setShaders() {
        const { shaders } = this.options;
        if (!shaders) {
          this.options.shaders = {
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
          if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
            shaders.fragment = {
              code: default_fsWgsl,
              entryPoint: "main"
            };
          }
        }
      }
      /* GEOMETRY */
      /**
       * Set or update the Mesh {@link Geometry}
       * @param geometry - new {@link Geometry} to use
       */
      useGeometry(geometry) {
        if (this.geometry) {
          if (geometry.shouldCompute) {
            geometry.computeGeometry();
          }
          if (this.geometry.layoutCacheKey !== geometry.layoutCacheKey) {
            throwWarning(
              `${this.options.label} (${this.type}): the current and new geometries do not have the same vertexBuffers layout, causing a probable pipeline recompilation. This should be avoided.

Current geometry layout:

${this.geometry.wgslStructFragment}

--------

New geometry layout:

${geometry.wgslStructFragment}`
            );
            this.material.setAttributesFromGeometry(geometry);
            this.material.setPipelineEntry();
          }
          this.geometry.consumers.delete(this.uuid);
        }
        this.geometry = geometry;
        this.geometry.consumers.add(this.uuid);
        this.computeGeometry();
        if (this.material) {
          const renderingOptions = {
            ...this.material.options.rendering,
            ...{ verticesOrder: geometry.verticesOrder, topology: geometry.topology }
          };
          this.material.setRenderingOptions(renderingOptions);
        }
      }
      /**
       * Compute the Mesh geometry if needed
       */
      computeGeometry() {
        if (this.geometry.shouldCompute) {
          this.geometry.computeGeometry();
        }
      }
      /**
       * Set our Mesh geometry: create buffers and add attributes to material
       */
      setGeometry() {
        if (this.geometry) {
          if (!this.geometry.ready) {
            this.geometry.createBuffers({
              renderer: this.renderer,
              label: this.options.label + " geometry"
            });
          }
          this.setMaterialGeometryAttributes();
        }
      }
      /* MATERIAL */
      /**
       * Set or update the {@link RenderMaterial} {@link types/Materials.RenderMaterialRenderingOptions | rendering options} to match the {@link RenderPass#descriptor | RenderPass descriptor} used to draw this Mesh.
       * @param renderPass - {@link RenderPass | RenderPass} used to draw this Mesh, default to the {@link core/renderers/GPURenderer.GPURenderer#renderPass | renderer renderPass}.
       */
      setRenderingOptionsForRenderPass(renderPass) {
        const renderingOptions = {
          // transparency (blend)
          transparent: this.transparent,
          // sample count
          sampleCount: renderPass.options.sampleCount,
          // color attachments
          ...renderPass.options.colorAttachments.length && {
            targets: renderPass.options.colorAttachments.map((colorAttachment, index) => {
              return {
                // patch format...
                format: colorAttachment.targetFormat,
                // ...but keep original blend values if any
                ...this.options.targets?.length && this.options.targets[index] && this.options.targets[index].blend && {
                  blend: this.options.targets[index].blend
                }
              };
            })
          },
          // depth
          depth: renderPass.options.useDepth,
          ...renderPass.options.useDepth && {
            depthFormat: renderPass.options.depthFormat
          }
        };
        this.material?.setRenderingOptions(renderingOptions);
      }
      /**
       * Hook used to clean up parameters before sending them to the {@link RenderMaterial}.
       * @param parameters - parameters to clean before sending them to the {@link RenderMaterial}
       * @returns - cleaned parameters
       */
      cleanupRenderMaterialParameters(parameters) {
        delete parameters.texturesOptions;
        delete parameters.outputTarget;
        delete parameters.autoRender;
        return parameters;
      }
      /**
       * Set or update the Mesh {@link RenderMaterial}
       * @param material - new {@link RenderMaterial} to use
       */
      useMaterial(material) {
        this.material = material;
        this.transparent = this.material.options.rendering.transparent;
        this.material.options.domTextures?.filter((texture) => texture instanceof DOMTexture).forEach((texture) => this.onDOMTextureAdded(texture));
      }
      /**
       * Patch the shaders if needed, then set the Mesh material
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        this.setShaders();
        meshParameters.shaders = this.options.shaders;
        meshParameters.label = meshParameters.label + " material";
        this.useMaterial(new RenderMaterial(this.renderer, meshParameters));
      }
      /**
       * Set Mesh material attributes
       */
      setMaterialGeometryAttributes() {
        if (this.material && !this.material.attributes) {
          this.material.setAttributesFromGeometry(this.geometry);
        }
      }
      /**
       * Get the transparent property value
       */
      get transparent() {
        return this._transparent;
      }
      /**
       * Set the transparent property value. Update the {@link RenderMaterial} rendering options and {@link core/scenes/Scene.Scene | Scene} stack if needed.
       * @param value
       */
      set transparent(value) {
        const switchTransparency = this.transparent !== void 0 && value !== this.transparent;
        if (switchTransparency) {
          this.removeFromScene();
        }
        this._transparent = value;
        if (switchTransparency) {
          this.addToScene();
        }
      }
      /**
       * Get the visible property value
       */
      get visible() {
        return this._visible;
      }
      /**
       * Set the visible property value
       * @param value - new visibility value
       */
      set visible(value) {
        this._visible = value;
      }
      /* TEXTURES */
      /**
       * Get our {@link RenderMaterial#domTextures | RenderMaterial domTextures array}
       * @readonly
       */
      get domTextures() {
        return this.material?.domTextures || [];
      }
      /**
       * Get our {@link RenderMaterial#textures | RenderMaterial textures array}
       * @readonly
       */
      get textures() {
        return this.material?.textures || [];
      }
      /**
       * Create a new {@link DOMTexture}
       * @param options - {@link DOMTextureParams | DOMTexture parameters}
       * @returns - newly created {@link DOMTexture}
       */
      createDOMTexture(options) {
        if (!options.name) {
          options.name = "texture" + (this.textures.length + this.domTextures.length);
        }
        if (!options.label) {
          options.label = this.options.label + " " + options.name;
        }
        const domTexture = new DOMTexture(this.renderer, { ...options, ...this.options.texturesOptions });
        this.addDOMTexture(domTexture);
        return domTexture;
      }
      /**
       * Add a {@link DOMTexture}
       * @param domTexture - {@link DOMTexture} to add
       */
      addDOMTexture(domTexture) {
        this.material.addTexture(domTexture);
        this.onDOMTextureAdded(domTexture);
      }
      /**
       * Callback run when a new {@link DOMTexture} has been added
       * @param domTexture - newly created DOMTexture
       */
      onDOMTextureAdded(domTexture) {
        domTexture.parentMesh = this;
      }
      /**
       * Create a new {@link Texture}
       * @param  options - {@link TextureParams | Texture parameters}
       * @returns - newly created {@link Texture}
       */
      createTexture(options) {
        if (!options.name) {
          options.name = "texture" + (this.textures.length + this.domTextures.length);
        }
        const texture = new Texture(this.renderer, options);
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
      /* BINDINGS */
      /**
       * Get the current {@link RenderMaterial} uniforms
       * @readonly
       */
      get uniforms() {
        return this.material?.uniforms;
      }
      /**
       * Get the current {@link RenderMaterial} storages
       * @readonly
       */
      get storages() {
        return this.material?.storages;
      }
      /* RESIZE */
      /**
       * Resize the Mesh's textures
       * @param boundingRect
       */
      resize(boundingRect) {
        if (super.resize) {
          super.resize(boundingRect);
        }
        this.textures?.forEach((texture) => {
          if (texture.options.fromTexture) {
            texture.copy(texture.options.fromTexture);
          }
        });
        this.domTextures?.forEach((texture) => {
          texture.resize();
        });
        this._onAfterResizeCallback && this._onAfterResizeCallback();
      }
      /* EVENTS */
      /**
       * Callback to execute when a Mesh is ready - i.e. its {@link material} and {@link geometry} are ready.
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
       * Callback to execute before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack. This means it is called early and allows to update transformations values before actually setting the Mesh matrices (if any). This also means it won't be called if the Mesh has not been added to the {@link core/scenes/Scene.Scene | Scene}. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
       * @param callback - callback to run just before updating the {@link core/scenes/Scene.Scene | Scene} matrix stack.
       * @returns - our Mesh
       */
      onBeforeRender(callback) {
        if (callback) {
          this._onBeforeRenderCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute right before actually rendering the Mesh. Useful to update uniforms for example. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
       * @param callback - callback to run just before rendering the {@link MeshBase}
       * @returns - our Mesh
       */
      onRender(callback) {
        if (callback) {
          this._onRenderCallback = callback;
        }
        return this;
      }
      /**
       * Callback to execute just after a Mesh has been rendered. The callback won't be called if the {@link Renderer} is not ready or the Mesh itself is neither {@link ready} nor {@link visible}.
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
       * Callback to execute just after a Mesh has been resized.
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
       * Execute {@link onBeforeRender} callback if needed. Called by the {@link core/scenes/Scene.Scene | Scene} before updating the matrix stack.
       */
      onBeforeRenderScene() {
        if (!this.renderer.ready || !this.ready || !this.visible)
          return;
        this._onBeforeRenderCallback && this._onBeforeRenderCallback();
      }
      /**
       * Called before rendering the Mesh
       * Set the geometry if needed (create buffers and add attributes to the {@link RenderMaterial})
       * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
       */
      onBeforeRenderPass() {
        if (!this.renderer.ready)
          return;
        this.ready = this.material && this.material.ready && this.geometry && this.geometry.ready;
        this.setGeometry();
        this.material.onBeforeRender();
      }
      /**
       * Render our {@link MeshBase} if the {@link RenderMaterial} is ready
       * @param pass - current render pass encoder
       */
      onRenderPass(pass) {
        if (!this.ready)
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
        !this.renderer.production && pass.pushDebugGroup(this.options.label);
        this.onRenderPass(pass);
        !this.renderer.production && pass.popDebugGroup();
        this.onAfterRenderPass();
      }
      /* DESTROY */
      /**
       * Remove the Mesh from the {@link core/scenes/Scene.Scene | Scene} and destroy it
       */
      remove() {
        this.removeFromScene(true);
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
        if (super.destroy) {
          super.destroy();
        }
        this.material?.destroy();
        this.geometry.consumers.delete(this.uuid);
        if (!this.geometry.consumers.size) {
          this.geometry?.destroy(this.renderer);
        }
      }
    }, _autoRender = new WeakMap(), _a;
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
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " FullscreenQuadMesh" : "FullscreenQuadMesh");
      let geometry = cacheManager.getPlaneGeometryByID(2);
      if (!geometry) {
        geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 });
        cacheManager.addPlaneGeometry(geometry);
      }
      if (!parameters.shaders || !parameters.shaders.vertex) {
        ["uniforms", "storages"].forEach((bindingType) => {
          Object.values(parameters[bindingType] ?? {}).forEach(
            (binding) => binding.visibility = ["fragment"]
          );
        });
      }
      parameters.depthWriteEnabled = false;
      if (!parameters.label) {
        parameters.label = "FullscreenQuadMesh";
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

  class Mat3 {
    // prettier-ignore
    /**
     * Mat3 constructor
     * @param elements - initial array to use, default to identity matrix
     */
    constructor(elements = new Float32Array([
      1,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      1
    ])) {
      this.type = "Mat3";
      this.elements = elements;
    }
    /**
     * Sets the matrix from 9 numbers
     *
     * @param n11 - number
     * @param n12 - number
     * @param n13 - number
     * @param n21 - number
     * @param n22 - number
     * @param n23 - number
     * @param n31 - number
     * @param n32 - number
     * @param n33 - number
     * @returns - this {@link Mat3} after being set
     */
    set(n11, n12, n13, n21, n22, n23, n31, n32, n33) {
      const te = this.elements;
      te[0] = n11;
      te[1] = n21;
      te[2] = n31;
      te[3] = n12;
      te[4] = n22;
      te[5] = n32;
      te[6] = n13;
      te[7] = n23;
      te[8] = n33;
      return this;
    }
    /**
     * Sets the {@link Mat3} to an identity matrix
     * @returns - this {@link Mat3} after being set
     */
    identity() {
      this.set(1, 0, 0, 0, 1, 0, 0, 0, 1);
      return this;
    }
    /**
     * Sets the {@link Mat3} values from an array
     * @param array - array to use
     * @returns - this {@link Mat3} after being set
     */
    // prettier-ignore
    setFromArray(array = new Float32Array([
      1,
      0,
      0,
      0,
      1,
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
     * Copy another {@link Mat3}
     * @param matrix - matrix to copy
     * @returns - this {@link Mat3} after being set
     */
    copy(matrix = new Mat3()) {
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
      return this;
    }
    /**
     * Clone a {@link Mat3}
     * @returns - cloned {@link Mat3}
     */
    clone() {
      return new Mat3().copy(this);
    }
    /**
     * Set a {@link Mat3} from a {@link Mat4}.
     * @param matrix - {@link Mat4} to use.
     * @returns - this {@link Mat3} after being set.
     */
    setFromMat4(matrix = new Mat4()) {
      const me = matrix.elements;
      this.set(me[0], me[4], me[8], me[1], me[5], me[9], me[2], me[6], me[10]);
      return this;
    }
    /**
     * Multiply this {@link Mat3} with another {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    multiply(matrix = new Mat3()) {
      return this.multiplyMatrices(this, matrix);
    }
    /**
     * Multiply another {@link Mat3} with this {@link Mat3}
     * @param matrix - {@link Mat3} to multiply with
     * @returns - this {@link Mat3} after multiplication
     */
    premultiply(matrix = new Mat3()) {
      return this.multiplyMatrices(matrix, this);
    }
    /**
     * Multiply two {@link Mat3}
     * @param a - first {@link Mat3}
     * @param b - second {@link Mat3}
     * @returns - {@link Mat3} resulting from the multiplication
     */
    multiplyMatrices(a = new Mat3(), b = new Mat3()) {
      const ae = a.elements;
      const be = b.elements;
      const te = this.elements;
      const a11 = ae[0], a12 = ae[3], a13 = ae[6];
      const a21 = ae[1], a22 = ae[4], a23 = ae[7];
      const a31 = ae[2], a32 = ae[5], a33 = ae[8];
      const b11 = be[0], b12 = be[3], b13 = be[6];
      const b21 = be[1], b22 = be[4], b23 = be[7];
      const b31 = be[2], b32 = be[5], b33 = be[8];
      te[0] = a11 * b11 + a12 * b21 + a13 * b31;
      te[3] = a11 * b12 + a12 * b22 + a13 * b32;
      te[6] = a11 * b13 + a12 * b23 + a13 * b33;
      te[1] = a21 * b11 + a22 * b21 + a23 * b31;
      te[4] = a21 * b12 + a22 * b22 + a23 * b32;
      te[7] = a21 * b13 + a22 * b23 + a23 * b33;
      te[2] = a31 * b11 + a32 * b21 + a33 * b31;
      te[5] = a31 * b12 + a32 * b22 + a33 * b32;
      te[8] = a31 * b13 + a32 * b23 + a33 * b33;
      return this;
    }
    /**
     * Invert this {@link Mat3}.
     * @returns - this {@link Mat3} after being inverted
     */
    invert() {
      const te = this.elements, n11 = te[0], n21 = te[1], n31 = te[2], n12 = te[3], n22 = te[4], n32 = te[5], n13 = te[6], n23 = te[7], n33 = te[8], t11 = n33 * n22 - n32 * n23, t12 = n32 * n13 - n33 * n12, t13 = n23 * n12 - n22 * n13, det = n11 * t11 + n21 * t12 + n31 * t13;
      if (det === 0)
        return this.set(0, 0, 0, 0, 0, 0, 0, 0, 0);
      const detInv = 1 / det;
      te[0] = t11 * detInv;
      te[1] = (n31 * n23 - n33 * n21) * detInv;
      te[2] = (n32 * n21 - n31 * n22) * detInv;
      te[3] = t12 * detInv;
      te[4] = (n33 * n11 - n31 * n13) * detInv;
      te[5] = (n31 * n12 - n32 * n11) * detInv;
      te[6] = t13 * detInv;
      te[7] = (n21 * n13 - n23 * n11) * detInv;
      te[8] = (n22 * n11 - n21 * n12) * detInv;
      return this;
    }
    /**
     * Transpose this {@link Mat3}.
     * @returns - this {@link Mat3} after being transposed
     */
    transpose() {
      let tmp;
      const m = this.elements;
      tmp = m[1];
      m[1] = m[3];
      m[3] = tmp;
      tmp = m[2];
      m[2] = m[6];
      m[6] = tmp;
      tmp = m[5];
      m[5] = m[7];
      m[7] = tmp;
      return this;
    }
    /**
     * Compute a normal {@link Mat3} matrix from a {@link Mat4} transformation matrix.
     * @param matrix - {@link Mat4} transformation matrix
     * @returns - this {@link Mat3} after being inverted and transposed
     */
    getNormalMatrix(matrix = new Mat4()) {
      return this.setFromMat4(matrix).invert().transpose();
    }
  }

  class ProjectedObject3D extends Object3D {
    /**
     * ProjectedObject3D constructor
     * @param renderer - {@link CameraRenderer} object or {@link GPUCurtains} class object used to create this {@link ProjectedObject3D}
     */
    constructor(renderer) {
      super();
      renderer = isCameraRenderer(renderer, "ProjectedObject3D");
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
          shouldUpdate: true,
          onUpdate: () => {
            this.modelViewMatrix.multiplyMatrices(this.viewMatrix, this.worldMatrix);
          }
        },
        modelViewProjection: {
          matrix: new Mat4(),
          shouldUpdate: true,
          onUpdate: () => {
            this.modelViewProjectionMatrix.multiplyMatrices(this.projectionMatrix, this.modelViewMatrix);
          }
        },
        normal: {
          matrix: new Mat3(),
          shouldUpdate: true,
          onUpdate: () => {
            this.normalMatrix.getNormalMatrix(this.worldMatrix);
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
     * Get our {@link normalMatrix | normal matrix}
     */
    get normalMatrix() {
      return this.matrices.normal.matrix;
    }
    /**
     * Set our {@link normalMatrix | normal matrix}
     * @param value - new {@link normalMatrix | normal matrix}
     */
    set normalMatrix(value) {
      this.matrices.normal.matrix = value;
      this.matrices.normal.shouldUpdate = true;
    }
    /**
     * Set our projection matrices shouldUpdate flags to true (tell them to update)
     */
    shouldUpdateProjectionMatrixStack() {
      this.matrices.modelView.shouldUpdate = true;
      this.matrices.modelViewProjection.shouldUpdate = true;
    }
    /**
     * When the world matrix update, tell our projection matrix to update as well
     */
    shouldUpdateWorldMatrix() {
      super.shouldUpdateWorldMatrix();
      this.shouldUpdateProjectionMatrixStack();
      this.matrices.normal.shouldUpdate = true;
    }
    /**
     * Tell all our matrices to update
     */
    shouldUpdateMatrixStack() {
      this.shouldUpdateModelMatrix();
      this.shouldUpdateProjectionMatrixStack();
    }
  }

  var default_normal_fsWgsl = (
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
    frustumCulling: true,
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
        // callbacks / events
        /** function assigned to the {@link onReEnterView} callback */
        this._onReEnterViewCallback = () => {
        };
        /** function assigned to the {@link onLeaveView} callback */
        this._onLeaveViewCallback = () => {
        };
        let renderer = params[0];
        const parameters = {
          ...defaultProjectedMeshParams,
          ...params[2],
          ...{ useProjection: true }
        };
        this.type = "MeshTransformed";
        renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
        this.renderer = renderer;
        const { frustumCulling, DOMFrustumMargins } = parameters;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          frustumCulling,
          DOMFrustumMargins
        };
        this.setDOMFrustum();
      }
      /* SHADERS */
      /**
       * Set default shaders if one or both of them are missing
       */
      setShaders() {
        const { shaders } = this.options;
        if (!shaders) {
          this.options.shaders = {
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
          if (shaders.fragment === void 0 || shaders.fragment && !shaders.fragment.code) {
            shaders.fragment = {
              code: default_normal_fsWgsl,
              entryPoint: "main"
            };
          }
        }
      }
      /* GEOMETRY */
      /**
       * Set or update the Projected Mesh {@link Geometry}
       * @param geometry - new {@link Geometry} to use
       */
      useGeometry(geometry) {
        super.useGeometry(geometry);
        if (this.domFrustum) {
          this.domFrustum.boundingBox = this.geometry.boundingBox;
        }
        this.shouldUpdateMatrixStack();
      }
      /**
       * Set the Mesh frustum culling
       */
      setDOMFrustum() {
        this.domFrustum = new DOMFrustum({
          boundingBox: this.geometry?.boundingBox,
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
        this.frustumCulling = this.options.frustumCulling;
      }
      /* MATERIAL */
      /**
       * Hook used to clean up parameters before sending them to the material.
       * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
       * @returns - cleaned parameters
       */
      cleanupRenderMaterialParameters(parameters) {
        delete parameters.frustumCulling;
        delete parameters.DOMFrustumMargins;
        super.cleanupRenderMaterialParameters(parameters);
        return parameters;
      }
      /**
       * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
       * @param meshParameters - {@link RenderMaterialParams | RenderMaterial parameters}
       */
      setMaterial(meshParameters) {
        const matricesUniforms = {
          label: "Matrices",
          visibility: ["vertex"],
          struct: {
            model: {
              type: "mat4x4f",
              value: this.worldMatrix
            },
            modelView: {
              // model view matrix (world matrix multiplied by camera view matrix)
              type: "mat4x4f",
              value: this.modelViewMatrix
            },
            normal: {
              // normal matrix
              type: "mat3x3f",
              value: this.normalMatrix
            }
            // modelViewProjection: {
            //   type: 'mat4x4f',
            //   value: this.modelViewProjectionMatrix,
            // },
          }
        };
        if (!meshParameters.uniforms)
          meshParameters.uniforms = {};
        meshParameters.uniforms = { matrices: matricesUniforms, ...meshParameters.uniforms };
        super.setMaterial(meshParameters);
      }
      /**
       * Get the visible property value
       */
      get visible() {
        return this._visible;
      }
      /**
       * Set the visible property value
       * @param value - new visibility value
       */
      set visible(value) {
        this.shouldUpdateMatrixStack();
        this._visible = value;
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
        for (const texture of this.domTextures) {
          texture.resize();
        }
      }
      /**
       * Get our {@link DOMFrustum} projected bounding rectangle
       * @readonly
       */
      get projectedBoundingRect() {
        return this.domFrustum?.projectedBoundingRect;
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
       * Check if the Mesh lies inside the {@link camera} view frustum or not.
       */
      checkFrustumCulling() {
        if (this.matricesNeedUpdate) {
          if (this.domFrustum && this.frustumCulling) {
            this.domFrustum.computeProjectedToDocumentCoords();
          }
        }
      }
      /**
       * Tell our matrices bindings to update if needed and call {@link MeshBaseClass#onBeforeRenderPass | Mesh base onBeforeRenderPass} super.
       */
      onBeforeRenderPass() {
        if (this.material && this.matricesNeedUpdate) {
          this.material.shouldUpdateInputsBindings("matrices");
        }
        super.onBeforeRenderPass();
      }
      /**
       * Render our Mesh if the {@link RenderMaterial} is ready and if it is not frustum culled.
       * @param pass - current render pass
       */
      onRenderPass(pass) {
        if (!this.ready)
          return;
        this._onRenderCallback && this._onRenderCallback();
        if (this.domFrustum && this.domFrustum.isIntersecting || !this.frustumCulling) {
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
    constructor(renderer, parameters = {}) {
      renderer = isCameraRenderer(renderer, parameters.label ? parameters.label + " Mesh" : "Mesh");
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
      renderer = isRenderer(renderer, label ? label + " " + this.type : this.type);
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
        label: this.options.label + ": " + type + " shader module",
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

  var get_output_position = (
    /* wgsl */
    `
fn getOutputPosition(position: vec3f) -> vec4f {
  return camera.projection * matrices.modelView * vec4f(position, 1.0);
}`
  );

  var get_normals = (
    /* wgsl */
    `
fn getWorldNormal(normal: vec3f) -> vec3f {
  return normalize(matrices.normal * normal);
}

fn getViewNormal(normal: vec3f) -> vec3f {
  return normalize((camera.view * vec4(matrices.normal * normal, 0.0)).xyz);
}`
  );

  var get_uv_cover = (
    /* wgsl */
    `
fn getUVCover(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {
  return (textureMatrix * vec4f(uv, 0.0, 1.0)).xy;
}`
  );

  var get_vertex_to_uv_coords = (
    /* wgsl */
    `
fn getVertex2DToUVCoords(vertex: vec2f) -> vec2f {
  return vec2(
    vertex.x * 0.5 + 0.5,
    0.5 - vertex.y * 0.5
  );
}

fn getVertex3DToUVCoords(vertex: vec3f) -> vec2f {
  return getVertex2DToUVCoords( vec2(vertex.x, vertex.y) );
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
      get_output_position,
      /** Get vec3f normals in world or view space */
      get_normals
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
      let { renderer, ...pipelineParams } = parameters;
      const { label, attributes, bindGroups, cacheKey, ...renderingOptions } = pipelineParams;
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
        attributes,
        bindGroups,
        cacheKey,
        ...renderingOptions
      };
      this.setPipelineEntryProperties({ attributes, bindGroups });
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
     * Patch the shaders by appending all the necessary shader chunks, {@link bindGroups | bind groups}) and {@link attributes} WGSL code fragments to the given {@link types/PipelineEntries.PipelineEntryParams#shaders | parameter shader code}
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
      if (this.options.shaders.fragment) {
        for (const chunk in ShaderChunks.fragment) {
          this.shaders.fragment.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
          if (this.shaders.full.head.indexOf(ShaderChunks.fragment[chunk]) === -1) {
            this.shaders.full.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
          }
        }
      }
      if (this.options.rendering.useProjection) {
        for (const chunk in ProjectedShaderChunks.vertex) {
          this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
          this.shaders.full.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.full.head}`;
        }
        if (this.options.shaders.fragment) {
          for (const chunk in ProjectedShaderChunks.fragment) {
            this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
            if (this.shaders.full.head.indexOf(ProjectedShaderChunks.fragment[chunk]) === -1) {
              this.shaders.full.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.full.head}`;
            }
          }
        }
      }
      const groupsBindings = [];
      for (const bindGroup of this.bindGroups) {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              visibility: binding.options.visibility,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      }
      for (const groupBinding of groupsBindings) {
        if (groupBinding.visibility.includes("vertex")) {
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
        if (this.options.shaders.fragment && groupBinding.visibility.includes("fragment")) {
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
      }
      this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
      this.shaders.full.head = `${this.attributes.wgslStructFragment}
${this.shaders.full.head}`;
      this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
      if (typeof this.options.shaders.fragment === "object")
        this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
      if (typeof this.options.shaders.fragment === "object") {
        if (this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0) {
          this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code;
        } else {
          this.shaders.full.code = this.shaders.full.head + this.options.shaders.vertex.code + this.options.shaders.fragment.code;
        }
      }
    }
    /* SETUP */
    /**
     * Get whether the shaders modules have been created
     * @readonly
     */
    get shadersModulesReady() {
      return !(!this.shaders.vertex.module || this.options.shaders.fragment && !this.shaders.fragment.module);
    }
    /**
     * Create the {@link shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      const isSameShader = typeof this.options.shaders.fragment === "object" && this.options.shaders.vertex.entryPoint !== this.options.shaders.fragment.entryPoint && this.options.shaders.vertex.code.localeCompare(this.options.shaders.fragment.code) === 0;
      this.shaders.vertex.module = this.createShaderModule({
        code: this.shaders[isSameShader ? "full" : "vertex"].code,
        type: "vertex"
      });
      if (this.options.shaders.fragment) {
        this.shaders.fragment.module = this.createShaderModule({
          code: this.shaders[isSameShader ? "full" : "fragment"].code,
          type: "fragment"
        });
      }
    }
    /**
     * Create the render pipeline {@link descriptor}
     */
    createPipelineDescriptor() {
      if (!this.shadersModulesReady)
        return;
      let vertexLocationIndex = -1;
      if (this.options.rendering.targets.length) {
        if (this.options.rendering.transparent) {
          this.options.rendering.targets[0].blend = this.options.rendering.targets[0].blend ? this.options.rendering.targets[0].blend : {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha"
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha"
            }
          };
        }
      } else {
        this.options.rendering.targets = [];
      }
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
        ...this.options.shaders.fragment && {
          fragment: {
            module: this.shaders.fragment.module,
            entryPoint: this.options.shaders.fragment.entryPoint,
            targets: this.options.rendering.targets
          }
        },
        primitive: {
          topology: this.options.rendering.topology,
          frontFace: this.options.rendering.verticesOrder,
          cullMode: this.options.rendering.cullMode
        },
        ...this.options.rendering.depth && {
          depthStencil: {
            depthWriteEnabled: this.options.rendering.depthWriteEnabled,
            depthCompare: this.options.rendering.depthCompare,
            format: this.options.rendering.depthFormat
          }
        },
        ...this.options.rendering.sampleCount > 1 && {
          multisample: {
            count: this.options.rendering.sampleCount
          }
        }
      };
    }
    /**
     * Create the render {@link pipeline}
     */
    createRenderPipeline() {
      if (!this.shadersModulesReady)
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
      if (!this.shadersModulesReady)
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
      const { renderer } = parameters;
      const { label } = parameters;
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
      for (const bindGroup of this.bindGroups) {
        let bindIndex = 0;
        bindGroup.bindings.forEach((binding, bindingIndex) => {
          binding.wgslGroupFragment.forEach((groupFragment, groupFragmentIndex) => {
            groupsBindings.push({
              groupIndex: bindGroup.index,
              bindIndex,
              wgslStructFragment: binding.wgslStructFragment,
              wgslGroupFragment: groupFragment,
              newLine: bindingIndex === bindGroup.bindings.length - 1 && groupFragmentIndex === binding.wgslGroupFragment.length - 1
            });
            bindIndex++;
          });
        });
      }
      for (const groupBinding of groupsBindings) {
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
      }
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
      this.activeBindGroups = [];
    }
    /**
     * Compare two {@link ShaderOptions | shader objects}
     * @param shaderA - first {@link ShaderOptions | shader object} to compare
     * @param shaderB - second {@link ShaderOptions | shader object} to compare
     * @returns - whether the two {@link ShaderOptions | shader objects} code and entryPoint match
     */
    compareShaders(shaderA, shaderB) {
      return shaderA.code === shaderB.code && shaderA.entryPoint === shaderB.entryPoint;
    }
    /**
     * Checks if the provided {@link RenderPipelineEntryParams | RenderPipelineEntry parameters} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
     * @returns - the found {@link RenderPipelineEntry}, or null if not found
     */
    isSameRenderPipeline(parameters) {
      return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
        const { options } = pipelineEntry;
        const { shaders, rendering, cacheKey } = parameters;
        const sameCacheKey = cacheKey === options.cacheKey;
        const sameVertexShader = this.compareShaders(shaders.vertex, options.shaders.vertex);
        const sameFragmentShader = !shaders.fragment && !options.shaders.fragment || this.compareShaders(shaders.fragment, options.shaders.fragment);
        const differentParams = compareRenderingOptions(rendering, options.rendering);
        return sameCacheKey && !differentParams.length && sameVertexShader && sameFragmentShader;
      });
    }
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given {@link RenderPipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link RenderPipelineEntryParams | RenderPipelineEntry parameters}
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created
     */
    createRenderPipeline(parameters) {
      const { attributes, bindGroups } = parameters;
      let cacheKey = attributes.layoutCacheKey;
      bindGroups.forEach((bindGroup) => {
        bindGroup.bindings.forEach((binding) => {
          cacheKey += binding.name + ",";
        });
        cacheKey += bindGroup.pipelineCacheKey;
      });
      const existingPipelineEntry = this.isSameRenderPipeline({ ...parameters, cacheKey });
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new RenderPipelineEntry({ ...parameters, cacheKey });
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Check if a {@link ComputePipelineEntry} has already been created with the given {@link PipelineEntryParams | parameters}.
     * Use it if found, else create a new one and add it to the {@link pipelineEntries} array.
     * @param parameters - {@link PipelineEntryParams | PipelineEntry parameters}
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(parameters) {
      const pipelineEntry = new ComputePipelineEntry(parameters);
      this.pipelineEntries.push(pipelineEntry);
      return pipelineEntry;
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
     * Track the active/already set {@link core/bindGroups/BindGroup.BindGroup | bind groups} to avoid `setBindGroup()` redundant calls.
     * @param pass - current pass encoder.
     * @param bindGroups - array {@link core/bindGroups/BindGroup.BindGroup | bind groups} passed by the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}.
     */
    setActiveBindGroups(pass, bindGroups) {
      bindGroups.forEach((bindGroup, index) => {
        if (!this.activeBindGroups[index] || this.activeBindGroups[index].uuid !== bindGroup.uuid || this.activeBindGroups[index].index !== bindGroup.index) {
          this.activeBindGroups[index] = bindGroup;
          pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        }
      });
    }
    /**
     * Reset the {@link PipelineManager#currentPipelineIndex | current pipeline index} and {@link activeBindGroups} so the next {@link AllowedPipelineEntries | PipelineEntry} will be set for sure
     */
    resetCurrentPipeline() {
      this.currentPipelineIndex = null;
      this.activeBindGroups = [];
    }
  }

  class ResizeManager {
    /**
     * ResizeManager constructor
     */
    constructor() {
      this.shouldWatch = true;
      this.entries = [];
      if (typeof window === "object" && "ResizeObserver" in window) {
        this.resizeObserver = new ResizeObserver((observedEntries) => {
          const allEntries = observedEntries.map((observedEntry) => {
            return this.entries.filter((e) => e.element.isSameNode(observedEntry.target));
          }).flat().sort((a, b) => b.priority - a.priority);
          allEntries?.forEach((entry) => {
            if (entry && entry.callback) {
              entry.callback();
            }
          });
        });
      }
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
      this.resizeObserver?.observe(element);
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
      this.resizeObserver?.unobserve(element);
      this.entries = this.entries.filter((e) => !e.element.isSameNode(element));
    }
    /**
     * Destroy our {@link ResizeManager}
     */
    destroy() {
      this.resizeObserver?.disconnect();
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
      if (!this.element || this.isResizing)
        return;
      this.isResizing = true;
      this.boundingRect = boundingRect ?? this.element.getBoundingClientRect();
      setTimeout(() => {
        this.isResizing = false;
      }, 10);
    }
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy() {
      this.resizeManager.unobserve(this.element);
    }
  }

  const camPosA = new Vec3();
  const camPosB = new Vec3();
  const posA = new Vec3();
  const posB = new Vec3();
  class Scene extends Object3D {
    /**
     * Scene constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
     */
    constructor({ renderer }) {
      super();
      renderer = isRenderer(renderer, "Scene");
      this.renderer = renderer;
      this.computePassEntries = [];
      this.renderPassEntries = {
        /** Array of {@link RenderPassEntry} that will handle {@link PingPongPlane}. Each {@link PingPongPlane} will be added as a distinct {@link RenderPassEntry} here */
        pingPong: [],
        /** Array of {@link RenderPassEntry} that will render to a specific {@link RenderTarget}. Each {@link RenderTarget} will be added as a distinct {@link RenderPassEntry} here */
        renderTarget: [],
        /** Array of {@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any {@link RenderTarget} assigned. Following entries will be created for every global {@link ShaderPass} */
        screen: []
      };
    }
    /**
     * Set the main {@link Renderer} render pass entry.
     */
    setMainRenderPassEntry() {
      this.renderPassEntries.screen.push({
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
      });
    }
    /**
     * Get the number of meshes a {@link RenderPassEntry | render pass entry} should draw.
     * @param renderPassEntry - The {@link RenderPassEntry | render pass entry} to test
     */
    getRenderPassEntryLength(renderPassEntry) {
      if (!renderPassEntry) {
        return 0;
      } else {
        return renderPassEntry.element ? renderPassEntry.element.visible ? 1 : 0 : renderPassEntry.stack.unProjected.opaque.length + renderPassEntry.stack.unProjected.transparent.length + renderPassEntry.stack.projected.opaque.length + renderPassEntry.stack.projected.transparent.length;
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
     * Add a {@link RenderTarget} to our scene {@link renderPassEntries} outputTarget array.
     * Every Meshes later added to this {@link RenderTarget} will be rendered to the {@link RenderTarget#renderTexture | RenderTarget Texture} using the {@link RenderTarget#renderPass.descriptor | RenderTarget RenderPass descriptor}
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
     * Remove a {@link RenderTarget} from our scene {@link renderPassEntries} outputTarget array.
     * @param renderTarget - {@link RenderTarget} to add
     */
    removeRenderTarget(renderTarget) {
      this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
        (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
      );
    }
    /**
     * Get the correct {@link renderPassEntries | render pass entry} (either {@link renderPassEntries} outputTarget or {@link renderPassEntries} screen) {@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
     * @param mesh - Mesh to check
     * @returns - the corresponding render pass entry {@link Stack}
     */
    getMeshProjectionStack(mesh) {
      const renderPassEntry = mesh.outputTarget ? this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === mesh.outputTarget.renderPass.uuid
      ) : this.renderPassEntries.screen[0];
      const { stack } = renderPassEntry;
      return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
    }
    /**
     * Add a Mesh to the correct {@link renderPassEntries | render pass entry} {@link Stack} array.
     * Meshes are then ordered by their {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#index | indexes (order of creation]}, {@link core/pipelines/RenderPipelineEntry.RenderPipelineEntry#index | pipeline entry indexes} and then {@link core/meshes/mixins/MeshBaseMixin.MeshBaseClass#renderOrder | renderOrder}
     * @param mesh - Mesh to add
     */
    addMesh(mesh) {
      const projectionStack = this.getMeshProjectionStack(mesh);
      const similarMeshes = mesh.transparent ? projectionStack.transparent : projectionStack.opaque;
      similarMeshes.push(mesh);
      similarMeshes.sort((a, b) => {
        return a.renderOrder - b.renderOrder || //a.material.pipelineEntry.index - b.material.pipelineEntry.index ||
        a.index - b.index;
      });
      if ("parent" in mesh && !mesh.parent && mesh.material.options.rendering.useProjection) {
        mesh.parent = this;
      }
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
      if ("parent" in mesh && mesh.parent && mesh.parent.object3DIndex === this.object3DIndex) {
        mesh.parent = null;
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
      const onBeforeRenderPass = shaderPass.inputTarget || shaderPass.outputTarget ? null : (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTexture && swapChainTexture) {
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
      const onAfterRenderPass = !shaderPass.outputTarget && shaderPass.options.copyOutputToRenderTexture ? (commandEncoder, swapChainTexture) => {
        if (shaderPass.renderTexture && swapChainTexture) {
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
      } : null;
      const shaderPassEntry = {
        // use output target or postprocessing render pass
        renderPass: shaderPass.outputTarget ? shaderPass.outputTarget.renderPass : this.renderer.postProcessingPass,
        // render to output target renderTexture or directly to screen
        renderTexture: shaderPass.outputTarget ? shaderPass.outputTarget.renderTexture : null,
        onBeforeRenderPass,
        onAfterRenderPass,
        element: shaderPass,
        stack: null
        // explicitly set to null
      };
      this.renderPassEntries.screen.push(shaderPassEntry);
      this.renderPassEntries.screen.sort((a, b) => {
        const isPostProA = a.element && !a.element.outputTarget;
        const renderOrderA = a.element ? a.element.renderOrder : 0;
        const indexA = a.element ? a.element.index : 0;
        const isPostProB = b.element && !b.element.outputTarget;
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
        renderPass: pingPongPlane.outputTarget.renderPass,
        renderTexture: pingPongPlane.outputTarget.renderTexture,
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
     * @param object - The object from which we want to get the parentMesh {@link RenderPassEntry}
     * @returns - the {@link RenderPassEntry} if found
     */
    getObjectRenderPassEntry(object) {
      if (object.type === "RenderTarget") {
        return this.renderPassEntries.renderTarget.find(
          (entry) => entry.renderPass.uuid === object.renderPass.uuid
        );
      } else if (object.type === "PingPongPlane") {
        return this.renderPassEntries.pingPong.find((entry) => entry.element.uuid === object.uuid);
      } else if (object.type === "ShaderPass") {
        return this.renderPassEntries.screen.find((entry) => entry.element?.uuid === object.uuid);
      } else {
        const entryType = object.outputTarget ? "renderTarget" : "screen";
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
     * Sort transparent projected meshes by their render order or distance to the camera (farther meshes should be drawn first).
     * @param meshes - transparent projected meshes array to sort
     */
    sortTransparentMeshes(meshes) {
      meshes.sort((meshA, meshB) => {
        if (meshA.renderOrder !== meshB.renderOrder) {
          return meshA.renderOrder - meshB.renderOrder;
        }
        meshA.geometry ? posA.copy(meshA.geometry.boundingBox.center).applyMat4(meshA.worldMatrix) : meshA.worldMatrix.getTranslation(posA);
        meshB.geometry ? posB.copy(meshB.geometry.boundingBox.center).applyMat4(meshB.worldMatrix) : meshB.worldMatrix.getTranslation(posB);
        const radiusA = meshA.geometry ? meshA.geometry.boundingBox.radius * meshA.worldMatrix.getMaxScaleOnAxis() : 0;
        const radiusB = meshB.geometry ? meshB.geometry.boundingBox.radius * meshB.worldMatrix.getMaxScaleOnAxis() : 0;
        return meshB.camera.worldMatrix.getTranslation(camPosB).distance(posB) - radiusB - (meshA.camera.worldMatrix.getTranslation(camPosA).distance(posA) - radiusA);
      });
    }
    /**
     * Here we render a {@link RenderPassEntry}:
     * - Set its {@link RenderPass#descriptor | renderPass descriptor} view or resolveTarget and get it at as swap chain texture
     * - Execute {@link RenderPassEntry#onBeforeRenderPass | onBeforeRenderPass} callback if specified
     * - Begin the {@link GPURenderPassEncoder | GPU render pass encoder} using our {@link RenderPass#descriptor | renderPass descriptor}
     * - Render the single element if specified or the render pass entry {@link Stack}: draw unprojected opaque / transparent meshes first, then set the {@link core/renderers/GPUCameraRenderer.GPUCameraRenderer#cameraBindGroup | camera bind group} and draw projected opaque / transparent meshes
     * - End the {@link GPURenderPassEncoder | GPU render pass encoder}
     * - Execute {@link RenderPassEntry#onAfterRenderPass | onAfterRenderPass} callback if specified
     * - Reset {@link core/pipelines/PipelineManager.PipelineManager#currentPipelineIndex | pipeline manager current pipeline}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param renderPassEntry - {@link RenderPassEntry} to render
     */
    renderSinglePassEntry(commandEncoder, renderPassEntry) {
      const swapChainTexture = renderPassEntry.renderPass.updateView(renderPassEntry.renderTexture?.texture);
      renderPassEntry.onBeforeRenderPass && renderPassEntry.onBeforeRenderPass(commandEncoder, swapChainTexture);
      const pass = commandEncoder.beginRenderPass(renderPassEntry.renderPass.descriptor);
      !this.renderer.production && pass.pushDebugGroup(
        renderPassEntry.element ? `${renderPassEntry.element.options.label} render pass using ${renderPassEntry.renderPass.options.label} descriptor` : `Render stack pass using ${renderPassEntry.renderPass.options.label}${renderPassEntry.renderTexture ? " onto " + renderPassEntry.renderTexture.options.label : ""}`
      );
      if (renderPassEntry.element) {
        renderPassEntry.element.render(pass);
      } else if (renderPassEntry.stack) {
        for (const mesh of renderPassEntry.stack.unProjected.opaque) {
          mesh.render(pass);
        }
        for (const mesh of renderPassEntry.stack.unProjected.transparent) {
          mesh.render(pass);
        }
        if (renderPassEntry.stack.projected.opaque.length || renderPassEntry.stack.projected.transparent.length) {
          for (const mesh of renderPassEntry.stack.projected.opaque) {
            mesh.render(pass);
          }
          this.sortTransparentMeshes(renderPassEntry.stack.projected.transparent);
          for (const mesh of renderPassEntry.stack.projected.transparent) {
            mesh.render(pass);
          }
        }
      }
      !this.renderer.production && pass.popDebugGroup();
      pass.end();
      renderPassEntry.onAfterRenderPass && renderPassEntry.onAfterRenderPass(commandEncoder, swapChainTexture);
      this.renderer.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Before actually rendering the scene, update matrix stack and frustum culling checks. Batching these calls greatly improve performance.
     */
    onBeforeRender() {
      for (let i = 0, l = this.renderer.meshes.length; i < l; i++) {
        this.renderer.meshes[i].onBeforeRenderScene();
      }
      this.updateMatrixStack();
      for (const mesh of this.renderer.meshes) {
        if ("checkFrustumCulling" in mesh && mesh.visible) {
          mesh.checkFrustumCulling();
        }
      }
    }
    /**
     * Render our {@link Scene}
     * - Execute {@link onBeforeRender} first
     * - Then render {@link computePassEntries}
     * - And finally render our {@link renderPassEntries}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      this.onBeforeRender();
      for (const computePass of this.computePassEntries) {
        const pass = commandEncoder.beginComputePass();
        computePass.render(pass);
        pass.end();
        computePass.copyBufferToResult(commandEncoder);
        this.renderer.pipelineManager.resetCurrentPipeline();
      }
      for (const renderPassEntryType in this.renderPassEntries) {
        let passDrawnCount = 0;
        this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
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

  class RenderPass {
    /**
     * RenderPass constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - {@link RenderPassParams | parameters} used to create this {@link RenderPass}
     */
    constructor(renderer, {
      label = "Render Pass",
      sampleCount = 4,
      qualityRatio = 1,
      // color
      useColorAttachments = true,
      renderToSwapChain = true,
      colorAttachments = [],
      // depth
      useDepth = true,
      depthTexture = null,
      depthLoadOp = "clear",
      depthStoreOp = "store",
      depthClearValue = 1,
      depthFormat = "depth24plus"
    } = {}) {
      renderer = isRenderer(renderer, "RenderPass");
      this.type = "RenderPass";
      this.uuid = generateUUID();
      this.renderer = renderer;
      if (useColorAttachments) {
        const defaultColorAttachment = {
          loadOp: "clear",
          storeOp: "store",
          clearValue: [0, 0, 0, 0],
          targetFormat: this.renderer.options.preferredFormat
        };
        if (!colorAttachments.length) {
          colorAttachments = [defaultColorAttachment];
        } else {
          colorAttachments = colorAttachments.map((colorAttachment) => {
            return { ...defaultColorAttachment, ...colorAttachment };
          });
        }
      }
      this.options = {
        label,
        sampleCount,
        qualityRatio,
        // color
        useColorAttachments,
        renderToSwapChain,
        colorAttachments,
        // depth
        useDepth,
        ...depthTexture !== void 0 && { depthTexture },
        depthLoadOp,
        depthStoreOp,
        depthClearValue,
        depthFormat
      };
      if (this.options.useDepth) {
        this.createDepthTexture();
      }
      this.viewTextures = [];
      this.resolveTargets = [];
      if (this.options.useColorAttachments && (!this.options.renderToSwapChain || this.options.sampleCount > 1)) {
        this.createViewTextures();
        this.createResolveTargets();
      }
      this.setRenderPassDescriptor();
    }
    /**
     * Create and set our {@link depthTexture | depth texture}
     */
    createDepthTexture() {
      if (this.options.depthTexture) {
        this.depthTexture = this.options.depthTexture;
        this.options.depthFormat = this.options.depthTexture.options.format;
      } else {
        this.depthTexture = new Texture(this.renderer, {
          label: this.options.label + " depth texture",
          name: "depthTexture",
          format: this.options.depthFormat,
          sampleCount: this.options.sampleCount,
          qualityRatio: this.options.qualityRatio,
          type: "depth",
          usage: ["renderAttachment", "textureBinding"]
        });
      }
    }
    /**
     * Create and set our {@link viewTextures | view textures}
     */
    createViewTextures() {
      this.options.colorAttachments.forEach((colorAttachment, index) => {
        this.viewTextures.push(
          new Texture(this.renderer, {
            label: `${this.options.label} colorAttachment[${index}] view texture`,
            name: `colorAttachment${index}ViewTexture`,
            format: colorAttachment.targetFormat,
            sampleCount: this.options.sampleCount,
            qualityRatio: this.options.qualityRatio,
            type: "texture",
            usage: ["copySrc", "copyDst", "renderAttachment", "textureBinding"]
          })
        );
      });
    }
    /**
     * Create and set our {@link resolveTargets | resolve targets} in case the {@link viewTextures} are multisampled.
     *
     * Note that if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}, the first resolve target will be set to `null` as the current swap chain texture will be used anyway in the render loop (see {@link updateView}).
     */
    createResolveTargets() {
      if (this.options.sampleCount > 1) {
        this.options.colorAttachments.forEach((colorAttachment, index) => {
          this.resolveTargets.push(
            this.options.renderToSwapChain && index === 0 ? null : new Texture(this.renderer, {
              label: `${this.options.label} resolve target[${index}] texture`,
              name: `resolveTarget${index}Texture`,
              format: colorAttachment.targetFormat,
              sampleCount: 1,
              qualityRatio: this.options.qualityRatio,
              type: "texture"
            })
          );
        });
      }
    }
    /**
     * Get the textures outputted by this {@link RenderPass}, which means the {@link viewTextures} if not multisampled, or their {@link resolveTargets} else (beware that the first resolve target might be `null` if this {@link RenderPass} should {@link RenderPassParams#renderToSwapChain | render to the swap chain}).
     *
     * @readonly
     */
    get outputTextures() {
      return this.options.sampleCount > 1 ? this.resolveTargets : this.viewTextures;
    }
    /**
     * Set our render pass {@link descriptor}
     */
    setRenderPassDescriptor() {
      this.descriptor = {
        label: this.options.label + " descriptor",
        colorAttachments: this.options.colorAttachments.map((colorAttachment, index) => {
          return {
            // view
            view: this.viewTextures[index]?.texture.createView({
              label: this.viewTextures[index]?.texture.label + " view"
            }),
            ...this.resolveTargets.length && {
              resolveTarget: this.resolveTargets[index]?.texture.createView({
                label: this.resolveTargets[index]?.texture.label + " view"
              })
            },
            // clear values
            clearValue: colorAttachment.clearValue,
            // loadOp: 'clear' specifies to clear the texture to the clear value before drawing
            // The other option is 'load' which means load the existing contents of the texture into the GPU so we can draw over what's already there.
            loadOp: colorAttachment.loadOp,
            // storeOp: 'store' means store the result of what we draw.
            // We could also pass 'discard' which would throw away what we draw.
            // see https://webgpufundamentals.org/webgpu/lessons/webgpu-multisampling.html
            storeOp: colorAttachment.storeOp
          };
        }),
        ...this.options.useDepth && {
          depthStencilAttachment: {
            view: this.depthTexture.texture.createView({
              label: this.depthTexture.texture.label + " view"
            }),
            depthClearValue: this.options.depthClearValue,
            // the same way loadOp is working, we can specify if we want to clear or load the previous depth buffer result
            depthLoadOp: this.options.depthLoadOp,
            depthStoreOp: this.options.depthStoreOp
          }
        }
      };
    }
    /**
     * Resize our {@link RenderPass}: reset its {@link Texture}
     */
    resize() {
      if (this.options.useDepth) {
        this.descriptor.depthStencilAttachment.view = this.depthTexture.texture.createView({
          label: this.depthTexture.options.label + " view"
        });
      }
      this.viewTextures.forEach((viewTexture, index) => {
        this.descriptor.colorAttachments[index].view = viewTexture.texture.createView({
          label: viewTexture.options.label + " view"
        });
      });
      this.resolveTargets.forEach((resolveTarget, index) => {
        if (resolveTarget) {
          this.descriptor.colorAttachments[index].resolveTarget = resolveTarget.texture.createView({
            label: resolveTarget.options.label + " view"
          });
        }
      });
    }
    /**
     * Set the {@link descriptor} {@link GPULoadOp | load operation}
     * @param loadOp - new {@link GPULoadOp | load operation} to use
     * @param colorAttachmentIndex - index of the color attachment for which to use this load operation
     */
    setLoadOp(loadOp = "clear", colorAttachmentIndex = 0) {
      if (this.options.useColorAttachments) {
        if (this.options.colorAttachments[colorAttachmentIndex]) {
          this.options.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
        }
        if (this.descriptor) {
          if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
            this.descriptor.colorAttachments[colorAttachmentIndex].loadOp = loadOp;
          }
        }
      }
    }
    /**
     * Set the {@link descriptor} {@link GPULoadOp | depth load operation}
     * @param depthLoadOp - new {@link GPULoadOp | depth load operation} to use
     */
    setDepthLoadOp(depthLoadOp = "clear") {
      this.options.depthLoadOp = depthLoadOp;
      if (this.options.useDepth && this.descriptor.depthStencilAttachment) {
        this.descriptor.depthStencilAttachment.depthLoadOp = depthLoadOp;
      }
    }
    /**
     * Set our {@link GPUColor | clear colors value}.<br>
     * Beware that if the {@link renderer} is using {@link core/renderers/GPURenderer.GPURenderer#alphaMode | premultiplied alpha mode}, your R, G and B channels should be premultiplied by your alpha channel.
     * @param clearValue - new {@link GPUColor | clear colors value} to use
     * @param colorAttachmentIndex - index of the color attachment for which to use this clear value
     */
    setClearValue(clearValue = [0, 0, 0, 0], colorAttachmentIndex = 0) {
      if (this.options.useColorAttachments) {
        if (this.renderer.alphaMode === "premultiplied") {
          const alpha = clearValue[3];
          clearValue[0] = Math.min(clearValue[0], alpha);
          clearValue[1] = Math.min(clearValue[1], alpha);
          clearValue[2] = Math.min(clearValue[2], alpha);
        }
        if (this.options.colorAttachments[colorAttachmentIndex]) {
          this.options.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
        }
        if (this.descriptor) {
          if (this.descriptor.colorAttachments && this.descriptor.colorAttachments[colorAttachmentIndex]) {
            this.descriptor.colorAttachments[colorAttachmentIndex].clearValue = clearValue;
          }
        }
      }
    }
    /**
     * Set the current {@link descriptor} texture {@link GPURenderPassColorAttachment#view | view} and {@link GPURenderPassColorAttachment#resolveTarget | resolveTarget} (depending on whether we're using multisampling)
     * @param renderTexture - {@link GPUTexture} to use, or the {@link core/renderers/GPURenderer.GPURenderer#context | context} {@link GPUTexture | current texture} if null.
     * @returns - the {@link GPUTexture | texture} to render to.
     */
    updateView(renderTexture = null) {
      if (!this.options.colorAttachments.length || !this.options.renderToSwapChain) {
        return renderTexture;
      }
      if (!renderTexture) {
        renderTexture = this.renderer.context.getCurrentTexture();
        renderTexture.label = `${this.renderer.type} context current texture`;
      }
      if (this.options.sampleCount > 1) {
        this.descriptor.colorAttachments[0].view = this.viewTextures[0].texture.createView({
          label: this.viewTextures[0].options.label + " view"
        });
        this.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView({
          label: renderTexture.label + " resolve target view"
        });
      } else {
        this.descriptor.colorAttachments[0].view = renderTexture.createView({
          label: renderTexture.label + " view"
        });
      }
      return renderTexture;
    }
    /**
     * Destroy our {@link RenderPass}
     */
    destroy() {
      this.viewTextures.forEach((viewTexture) => viewTexture.destroy());
      this.resolveTargets.forEach((resolveTarget) => resolveTarget?.destroy());
      if (!this.options.depthTexture && this.depthTexture) {
        this.depthTexture.destroy();
      }
    }
  }

  var __accessCheck$5 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$4 = (obj, member, getter) => {
    __accessCheck$5(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$5 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$4 = (obj, member, value, setter) => {
    __accessCheck$5(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var __privateWrapper = (obj, member, setter, getter) => ({
    set _(value) {
      __privateSet$4(obj, member, value, setter);
    },
    get _() {
      return __privateGet$4(obj, member, getter);
    }
  });
  var _taskCount;
  class TasksQueueManager {
    /**
     * TaskQueueManager constructor
     */
    constructor() {
      /** Private number to assign a unique id to each {@link TaskQueueItem | task queue item} */
      __privateAdd$5(this, _taskCount, 0);
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
        id: __privateGet$4(this, _taskCount)
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
      label = "Main renderer",
      container,
      pixelRatio = 1,
      autoResize = true,
      preferredFormat,
      alphaMode = "premultiplied",
      renderPass
    }) {
      // callbacks / events
      /** function assigned to the {@link onBeforeRender} callback */
      this._onBeforeRenderCallback = (commandEncoder) => {
      };
      /** function assigned to the {@link onAfterRender} callback */
      this._onAfterRenderCallback = (commandEncoder) => {
      };
      /** function assigned to the {@link resizeObjects} callback */
      this._onResizeCallback = () => {
      };
      /** function assigned to the {@link onAfterResize} callback */
      this._onAfterResizeCallback = () => {
      };
      this.type = "GPURenderer";
      this.uuid = generateUUID();
      if (!deviceManager) {
        throwError(`GPURenderer (${label}): no device manager provided: ${deviceManager}`);
      }
      this.deviceManager = deviceManager;
      this.deviceManager.addRenderer(this);
      this.shouldRender = true;
      this.shouldRenderScene = true;
      renderPass = { ...{ useDepth: true, sampleCount: 4, clearValue: [0, 0, 0, 0] }, ...renderPass };
      preferredFormat = preferredFormat ?? this.deviceManager.gpu?.getPreferredCanvasFormat();
      this.options = {
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        preferredFormat,
        alphaMode,
        renderPass
      };
      this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
      this.alphaMode = alphaMode;
      const isOffscreenCanvas = container instanceof OffscreenCanvas;
      const isContainerCanvas = isOffscreenCanvas || container instanceof HTMLCanvasElement;
      this.canvas = isContainerCanvas ? container : document.createElement("canvas");
      const { width, height } = this.canvas;
      this.rectBBox = {
        width,
        height,
        top: 0,
        left: 0
      };
      this.setScene();
      this.setTasksQueues();
      this.setRendererObjects();
      if (!isOffscreenCanvas) {
        this.domElement = new DOMElement({
          element: container,
          priority: 5,
          // renderer callback need to be called first
          onSizeChanged: () => {
            if (this.options.autoResize)
              this.resize();
          }
        });
        this.resize();
        if (!isContainerCanvas) {
          this.domElement.element.appendChild(this.canvas);
        }
      }
      if (this.deviceManager.device) {
        this.setContext();
      }
    }
    /**
     * Set the renderer {@link RectBBox} and canvas sizes
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    setSize(rectBBox = null) {
      rectBBox = {
        ...{
          width: Math.max(1, this.boundingRect.width),
          height: Math.max(1, this.boundingRect.height),
          top: this.boundingRect.top,
          left: this.boundingRect.left
        },
        ...rectBBox
      };
      this.rectBBox = rectBBox;
      const renderingSize = {
        width: this.rectBBox.width,
        height: this.rectBBox.height
      };
      renderingSize.width *= this.pixelRatio;
      renderingSize.height *= this.pixelRatio;
      this.clampToMaxDimension(renderingSize);
      this.canvas.width = Math.floor(renderingSize.width);
      this.canvas.height = Math.floor(renderingSize.height);
      if (this.canvas.style) {
        this.canvas.style.width = this.rectBBox.width + "px";
        this.canvas.style.height = this.rectBBox.height + "px";
      }
    }
    /**
     * Set the renderer {@link pixelRatio | pixel ratio} and {@link resize} it
     * @param pixelRatio - new pixel ratio to use
     */
    setPixelRatio(pixelRatio = 1) {
      this.pixelRatio = pixelRatio;
      this.resize(this.rectBBox);
    }
    /**
     * Resize our {@link GPURenderer}
     * @param rectBBox - the optional new {@link canvas} {@link RectBBox} to set
     */
    resize(rectBBox = null) {
      this.setSize(rectBBox);
      this._onResizeCallback && this._onResizeCallback();
      this.resizeObjects();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /**
     * Resize all tracked objects ({@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes).
     */
    resizeObjects() {
      this.textures.forEach((texture) => {
        texture.resize();
      });
      this.renderPass?.resize();
      this.postProcessingPass?.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize());
      this.computePasses.forEach((computePass) => computePass.resize());
      this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
      this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
      this.resizeMeshes();
    }
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes() {
      this.meshes.forEach((mesh) => {
        mesh.resize(this.boundingRect);
      });
    }
    /**
     * Get our {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}. If there's no {@link domElement | DOM Element} (like when using an offscreen canvas for example), the {@link rectBBox} values are used.
     */
    get boundingRect() {
      if (!!this.domElement && !!this.domElement.boundingRect) {
        return this.domElement.boundingRect;
      } else if (!!this.domElement) {
        const boundingRect = this.domElement.element?.getBoundingClientRect();
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
      } else {
        return {
          top: this.rectBBox.top,
          right: this.rectBBox.left + this.rectBBox.width,
          bottom: this.rectBBox.top + this.rectBBox.height,
          left: this.rectBBox.left,
          width: this.rectBBox.width,
          height: this.rectBBox.height,
          x: this.rectBBox.left,
          y: this.rectBBox.top
        };
      }
    }
    /**
     * Clamp to max WebGPU texture dimensions
     * @param dimension - width and height dimensions to clamp
     */
    clampToMaxDimension(dimension) {
      if (this.device) {
        dimension.width = Math.min(this.device.limits.maxTextureDimension2D, dimension.width);
        dimension.height = Math.min(this.device.limits.maxTextureDimension2D, dimension.height);
      }
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
     * Get whether our {@link GPUDeviceManager} is ready (i.e. its {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} are set) its {@link context} is set and its size is set
     * @readonly
     */
    get ready() {
      return this.deviceManager.ready && !!this.context && !!this.canvas.width && !!this.canvas.height;
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
     * Configure the context again, resize the {@link RenderTarget | render targets} and {@link Texture | textures}, restore our {@link renderedObjects | rendered objects} context.
     * @async
     */
    restoreContext() {
      this.configureContext();
      this.textures.forEach((texture) => {
        texture.createTexture();
      });
      this.renderPass?.resize();
      this.postProcessingPass?.resize();
      this.renderTargets.forEach((renderTarget) => renderTarget.resize());
      this.renderedObjects.forEach((sceneObject) => sceneObject.restoreContext());
    }
    /* PIPELINES, SCENE & MAIN RENDER PASS */
    /**
     * Set our {@link renderPass | main render pass} that will be used to render the result of our draw commands back to the screen and our {@link postProcessingPass | postprocessing pass} that will be used for any additional postprocessing render passes.
     */
    setMainRenderPasses() {
      this.renderPass = new RenderPass(this, {
        label: this.options.label + " render pass",
        ...this.options.renderPass
      });
      this.scene.setMainRenderPassEntry();
      this.postProcessingPass = new RenderPass(this, {
        label: this.options.label + " post processing render pass",
        // no need to handle depth or perform MSAA on a fullscreen quad
        useDepth: false,
        sampleCount: 1
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
     * @param buffer - {@link Buffer} to use for buffer creation
     * @returns - newly created {@link GPUBuffer}
     */
    createBuffer(buffer) {
      const GPUBuffer = this.deviceManager.device?.createBuffer(buffer.options);
      this.deviceManager.addBuffer(buffer);
      return GPUBuffer;
    }
    /**
     * Remove a {@link Buffer} from our {@link GPUDeviceManager#buffers | buffers Map}
     * @param buffer - {@link Buffer} to remove
     */
    removeBuffer(buffer) {
      this.deviceManager.removeBuffer(buffer);
    }
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - {@link GPUSize64 | buffer offset}
     * @param data - {@link BufferSource | data} to write
     */
    queueWriteBuffer(buffer, bufferOffset, data) {
      this.deviceManager.device?.queue.writeBuffer(buffer, bufferOffset, data);
    }
    /**
     * Copy a source {@link Buffer#GPUBuffer | Buffer GPUBuffer} into a destination {@link Buffer#GPUBuffer | Buffer GPUBuffer}
     * @param parameters - parameters used to realize the copy
     * @param parameters.srcBuffer - source {@link Buffer}
     * @param [parameters.dstBuffer] - destination {@link Buffer}. Will create a new one if none provided.
     * @param [parameters.commandEncoder] - {@link GPUCommandEncoder} to use for the copy. Will create a new one and submit the command buffer if none provided.
     * @returns - destination {@link Buffer} after copy
     */
    copyBufferToBuffer({
      srcBuffer,
      dstBuffer,
      commandEncoder
    }) {
      if (!srcBuffer || !srcBuffer.GPUBuffer) {
        throwWarning(
          `${this.type} (${this.options.label}): cannot copy to buffer because the source buffer has not been provided`
        );
        return null;
      }
      if (!dstBuffer) {
        dstBuffer = new Buffer();
      }
      if (!dstBuffer.GPUBuffer) {
        dstBuffer.createBuffer(this, {
          label: `GPURenderer (${this.options.label}): destination copy buffer from: ${srcBuffer.options.label}`,
          size: srcBuffer.GPUBuffer.size,
          //usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
          usage: ["copyDst", "mapRead"]
        });
      }
      if (srcBuffer.GPUBuffer.mapState !== "unmapped") {
        throwWarning(
          `${this.type} (${this.options.label}): Cannot copy from ${srcBuffer.GPUBuffer} because it is currently mapped`
        );
        return;
      }
      if (dstBuffer.GPUBuffer.mapState !== "unmapped") {
        throwWarning(
          `${this.type} (${this.options.label}): Cannot copy from ${dstBuffer.GPUBuffer} because it is currently mapped`
        );
        return;
      }
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = this.deviceManager.device?.createCommandEncoder({
          label: `${this.type} (${this.options.label}): Copy buffer command encoder`
        });
        !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Copy buffer command encoder`);
      }
      commandEncoder.copyBufferToBuffer(srcBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer, 0, dstBuffer.GPUBuffer.size);
      if (!hasCommandEncoder) {
        !this.production && commandEncoder.popDebugGroup();
        const commandBuffer = commandEncoder.finish();
        this.deviceManager.device?.queue.submit([commandBuffer]);
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
      return this.deviceManager.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    /**
     * Create a {@link GPUBindGroup}
     * @param bindGroupDescriptor - {@link GPUBindGroupDescriptor | GPU bind group descriptor}
     * @returns - newly created {@link GPUBindGroup}
     */
    createBindGroup(bindGroupDescriptor) {
      return this.deviceManager.device?.createBindGroup(bindGroupDescriptor);
    }
    /* SHADERS & PIPELINES */
    /**
     * Create a {@link GPUShaderModule}
     * @param shaderModuleDescriptor - {@link shaderModuleDescriptor | shader module descriptor}
     * @returns - newly created {@link GPUShaderModule}
     */
    createShaderModule(shaderModuleDescriptor) {
      return this.device?.createShaderModule(shaderModuleDescriptor);
    }
    /**
     * Create a {@link GPUPipelineLayout}
     * @param pipelineLayoutDescriptor - {@link GPUPipelineLayoutDescriptor | GPU pipeline layout descriptor}
     * @returns - newly created {@link GPUPipelineLayout}
     */
    createPipelineLayout(pipelineLayoutDescriptor) {
      return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
    }
    /**
     * Create a {@link GPURenderPipeline}
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipeline(pipelineDescriptor) {
      return this.device?.createRenderPipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPURenderPipeline}
     * @async
     * @param pipelineDescriptor - {@link GPURenderPipelineDescriptor | GPU render pipeline descriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    async createRenderPipelineAsync(pipelineDescriptor) {
      return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
    }
    /**
     * Create a {@link GPUComputePipeline}
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipeline(pipelineDescriptor) {
      return this.device?.createComputePipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPUComputePipeline}
     * @async
     * @param pipelineDescriptor - {@link GPUComputePipelineDescriptor | GPU compute pipeline descriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    async createComputePipelineAsync(pipelineDescriptor) {
      return await this.device?.createComputePipelineAsync(pipelineDescriptor);
    }
    /* TEXTURES */
    /**
     * Get all created {@link DOMTexture} tracked by our {@link GPUDeviceManager}
     * @readonly
     */
    get domTextures() {
      return this.deviceManager.domTextures;
    }
    /**
     * Add a {@link DOMTexture} to our {@link GPUDeviceManager#domTextures | textures array}
     * @param texture - {@link DOMTexture} to add
     */
    addDOMTexture(texture) {
      this.deviceManager.addDOMTexture(texture);
    }
    /**
     * Remove a {@link DOMTexture} from our {@link GPUDeviceManager#domTextures | textures array}
     * @param texture - {@link DOMTexture} to remove
     */
    removeDOMTexture(texture) {
      this.deviceManager.removeDOMTexture(texture);
    }
    /**
     * Add a {@link Texture} to our {@link textures} array
     * @param texture - {@link Texture} to add
     */
    addTexture(texture) {
      this.textures.push(texture);
    }
    /**
     * Remove a {@link Texture} from our {@link textures} array
     * @param texture - {@link Texture} to remove
     */
    removeTexture(texture) {
      this.textures = this.textures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Create a {@link GPUTexture}
     * @param textureDescriptor - {@link GPUTextureDescriptor | GPU texture descriptor}
     * @returns - newly created {@link GPUTexture}
     */
    createTexture(textureDescriptor) {
      return this.deviceManager.device?.createTexture(textureDescriptor);
    }
    /**
     * Upload a {@linkDOMTexture#texture | texture} to the GPU
     * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
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
      return this.deviceManager.device?.importExternalTexture({ source: video });
    }
    /**
     * Check if a {@link Sampler} has already been created with the same {@link Sampler#options | parameters}.
     * Use it if found, else create a new one and add it to the {@link GPUDeviceManager#samplers | samplers array}.
     * @param sampler - {@link Sampler} to create
     * @returns - the {@link GPUSampler}
     */
    createSampler(sampler) {
      const existingSampler = this.samplers.find((existingSampler2) => {
        return JSON.stringify(existingSampler2.options) === JSON.stringify(sampler.options) && existingSampler2.sampler;
      });
      if (existingSampler) {
        return existingSampler.sampler;
      } else {
        const { type, ...samplerOptions } = sampler.options;
        const gpuSampler = this.deviceManager.device?.createSampler({
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
      this.textures = [];
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
     * Useful (but slow) to know if a resource is used by multiple objects and if it is safe to destroy it or not.
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
     * Get all objects ({@link RenderedMesh | rendered meshes} or {@link ComputePass | compute passes}) using a given {@link DOMTexture} or {@link Texture}.
     * Useful to know if a resource is used by multiple objects and if it is safe to destroy it or not.
     * @param texture - {@link DOMTexture} or {@link Texture} to check
     */
    getObjectsByTexture(texture) {
      return this.deviceRenderedObjects.filter((object) => {
        return [...object.material.domTextures, ...object.material.textures].some((t) => t.uuid === texture.uuid);
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
     * Callback to run after the {@link GPURenderer} has been resized but before the {@link resizeObjects} method has been executed (before the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes are resized).
     * @param callback - callback to execute.
     * @returns - our {@link GPURenderer}
     */
    onResize(callback) {
      if (callback) {
        this._onResizeCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run after the {@link GPURenderer} has been resized and after the {@link resizeObjects} method has been executed (after the {@link Texture | textures}, {@link RenderPass | render passes}, {@link RenderTarget | render targets}, {@link ComputePass | compute passes} and meshes have been resized).
     * @param callback - callback to execute.
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
      const commandEncoder = this.device?.createCommandEncoder({
        label: "Render once command encoder"
      });
      !this.production && commandEncoder.pushDebugGroup("Render once command encoder");
      this.pipelineManager.resetCurrentPipeline();
      objects.forEach((object) => {
        if (object.type === "ComputePass") {
          this.renderSingleComputePass(commandEncoder, object);
        } else {
          this.renderSingleMesh(commandEncoder, object);
        }
      });
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
      this.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Force to clear a {@link GPURenderer} content to its {@link RenderPass#options.clearValue | clear value} by rendering and empty pass.
     * @param commandEncoder
     */
    forceClear(commandEncoder) {
      const hasCommandEncoder = !!commandEncoder;
      if (!hasCommandEncoder) {
        commandEncoder = this.device?.createCommandEncoder({
          label: `${this.type} (${this.options.label}): Force clear command encoder`
        });
        !this.production && commandEncoder.pushDebugGroup(`${this.type} (${this.options.label}): Force clear command encoder`);
      }
      this.renderPass.updateView();
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      pass.end();
      if (!hasCommandEncoder) {
        !this.production && commandEncoder.popDebugGroup();
        const commandBuffer = commandEncoder.finish();
        this.device?.queue.submit([commandBuffer]);
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
      if (!this.ready || !this.shouldRender)
        return;
      this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
      this.onBeforeRenderScene.execute(commandEncoder);
      if (this.shouldRenderScene)
        this.scene?.render(commandEncoder);
      this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
      this.onAfterRenderScene.execute(commandEncoder);
    }
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
     */
    destroy() {
      this.deviceManager.renderers = this.deviceManager.renderers.filter((renderer) => renderer.uuid !== this.uuid);
      this.domElement?.destroy();
      this.renderPass?.destroy();
      this.postProcessingPass?.destroy();
      this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
      this.renderedObjects.forEach((sceneObject) => sceneObject.remove());
      this.textures.forEach((texture) => texture.destroy());
      this.context?.unconfigure();
    }
  }

  class GPUCameraRenderer extends GPURenderer {
    /**
     * GPUCameraRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCameraRenderer}
     */
    constructor({
      deviceManager,
      label,
      container,
      pixelRatio = 1,
      autoResize = true,
      preferredFormat,
      alphaMode = "premultiplied",
      renderPass,
      camera = {}
    }) {
      super({
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        preferredFormat,
        alphaMode,
        renderPass
      });
      this.type = "GPUCameraRenderer";
      camera = { ...{ fov: 50, near: 0.1, far: 1e3 }, ...camera };
      this.options = {
        ...this.options,
        camera
      };
      this.setCamera(camera);
      this.setCameraBindGroupAndBinding();
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
     * Called when the {@link core/renderers/GPUDeviceManager.GPUDeviceManager#device | device} has been restored.
     * Configure the context again, resize the {@link core/renderPasses/RenderTarget.RenderTarget | render targets} and {@link core/textures/Texture.Texture | textures}, restore our {@link renderedObjects | rendered objects} context, re-write our {@link cameraBufferBinding | camera buffer binding}.
     * @async
     */
    restoreContext() {
      super.restoreContext();
      this.cameraBindGroup?.restoreContext();
      this.updateCameraBindings();
    }
    /**
     * Set the {@link camera}
     * @param cameraParameters - {@link CameraBasePerspectiveOptions | parameters} used to create the {@link camera}
     */
    setCamera(cameraParameters) {
      const { width, height } = this.rectBBox;
      this.useCamera(
        new Camera({
          fov: cameraParameters.fov,
          near: cameraParameters.near,
          far: cameraParameters.far,
          width,
          height,
          pixelRatio: this.pixelRatio,
          onMatricesChanged: () => {
            this.onCameraMatricesChanged();
          }
        })
      );
    }
    /**
     * Tell our {@link GPUCameraRenderer} to use this {@link Camera}. If a {@link camera} has already been set, reset the {@link cameraBufferBinding} inputs view values and the {@link meshes} {@link Camera} object.
     * @param camera - new {@link Camera} to use.
     */
    useCamera(camera) {
      if (this.camera && camera && this.camera.uuid === camera.uuid)
        return;
      if (this.camera) {
        this.camera.parent = null;
        this.camera.onMatricesChanged = () => {
        };
      }
      this.camera = camera;
      this.camera.parent = this.scene;
      if (this.cameraBufferBinding) {
        this.camera.onMatricesChanged = () => this.onCameraMatricesChanged();
        this.cameraBufferBinding.inputs.view.value = this.camera.viewMatrix;
        this.cameraBufferBinding.inputs.projection.value = this.camera.projectionMatrix;
        for (const mesh of this.meshes) {
          if ("modelViewMatrix" in mesh) {
            mesh.camera = this.camera;
          }
        }
      }
    }
    /**
     * Update the {@link ProjectedMesh | projected meshes} sizes and positions when the {@link camera} {@link Camera#position | position} changes
     */
    onCameraMatricesChanged() {
      this.updateCameraBindings();
      for (const mesh of this.meshes) {
        if ("modelViewMatrix" in mesh) {
          mesh.shouldUpdateMatrixStack();
        }
      }
    }
    /**
     * Set the {@link cameraBufferBinding | camera buffer binding} and {@link cameraBindGroup | camera bind group}
     */
    setCameraBindGroupAndBinding() {
      this.cameraBufferBinding = new BufferBinding({
        label: "Camera",
        name: "camera",
        visibility: ["vertex"],
        struct: {
          view: {
            // camera view matrix
            type: "mat4x4f",
            value: this.camera.viewMatrix
          },
          projection: {
            // camera projection matrix
            type: "mat4x4f",
            value: this.camera.projectionMatrix
          },
          position: {
            // camera world position
            type: "vec3f",
            value: this.camera.position.clone().setFromMatrixPosition(this.camera.worldMatrix),
            onBeforeUpdate: () => {
              this.cameraBufferBinding.inputs.position.value.copy(this.camera.position).setFromMatrixPosition(this.camera.worldMatrix);
            }
          }
        }
      });
      this.cameraBindGroup = new BindGroup(this, {
        label: "Camera Uniform bind group",
        bindings: [this.cameraBufferBinding]
      });
      this.cameraBindGroup.consumers.add(this.uuid);
    }
    /**
     * Create the {@link cameraBindGroup | camera bind group} buffers
     */
    setCameraBindGroup() {
      if (this.cameraBindGroup && this.cameraBindGroup.shouldCreateBindGroup) {
        this.cameraBindGroup.setIndex(0);
        this.cameraBindGroup.createBindGroup();
      }
    }
    /**
     * Tell our {@link cameraBufferBinding | camera buffer binding} that we should update its bindings and update the bind group. Called each time the camera matrices change.
     */
    updateCameraBindings() {
      this.cameraBufferBinding?.shouldUpdateBinding("view");
      this.cameraBufferBinding?.shouldUpdateBinding("projection");
      this.cameraBufferBinding?.shouldUpdateBinding("position");
      this.cameraBindGroup?.update();
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
      this.camera?.setPerspective({
        fov,
        near,
        far,
        width: this.rectBBox.width,
        height: this.rectBBox.height,
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
     * Call our {@link GPURenderer#resizeObjects | GPURenderer resizeObjects method} and resize our {@link camera} as well
     */
    resizeObjects() {
      this.setPerspective();
      super.resizeObjects();
    }
    /* RENDER */
    /**
     * {@link setCameraBindGroup | Set the camera bind group if needed} and then call our {@link GPURenderer#render | GPURenderer render method}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      if (!this.ready)
        return;
      this.setCameraBindGroup();
      super.render(commandEncoder);
    }
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy() {
      this.cameraBindGroup?.destroy();
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
      adapterOptions = {},
      onError = () => {
      },
      onDeviceLost = (info) => {
      }
    } = {}) {
      this.index = 0;
      this.label = label ?? "GPUDeviceManager instance";
      this.production = production;
      this.ready = false;
      this.adapterOptions = adapterOptions;
      this.onError = onError;
      this.onDeviceLost = onDeviceLost;
      this.gpu = navigator.gpu;
      this.setPipelineManager();
      this.setDeviceObjects();
    }
    /**
     * Set our {@link adapter} and {@link device} if possible.
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async setAdapterAndDevice({ adapter = null, device = null } = {}) {
      await this.setAdapter(adapter);
      await this.setDevice(device);
    }
    /**
     * Set up our {@link adapter} and {@link device} and all the already created {@link renderers} contexts
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async init({ adapter = null, device = null } = {}) {
      await this.setAdapterAndDevice({ adapter, device });
      if (this.device) {
        for (const renderer of this.renderers) {
          if (!renderer.context) {
            renderer.setContext();
          }
        }
      }
    }
    /**
     * Set our {@link adapter} if possible.
     * The adapter represents a specific GPU. Some devices have multiple GPUs.
     * @async
     * @param adapter - {@link GPUAdapter} to use if set.
     */
    async setAdapter(adapter = null) {
      if (!this.gpu) {
        this.onError();
        throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
      }
      if (adapter) {
        this.adapter = adapter;
      } else {
        try {
          this.adapter = await this.gpu?.requestAdapter(this.adapterOptions);
          if (!this.adapter) {
            this.onError();
            throwError("GPUDeviceManager: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
          }
        } catch (e) {
          this.onError();
          throwError("GPUDeviceManager: " + e.message);
        }
      }
      this.adapter?.requestAdapterInfo().then((infos) => {
        this.adapterInfos = infos;
      });
    }
    /**
     * Set our {@link device}.
     * @async
     * @param device - {@link GPUDevice} to use if set.
     */
    async setDevice(device = null) {
      if (device) {
        this.device = device;
        this.ready = true;
        this.index++;
      } else {
        try {
          const requiredFeatures = [];
          if (this.adapter.features.has("float32-filterable")) {
            requiredFeatures.push("float32-filterable");
          }
          this.device = await this.adapter?.requestDevice({
            label: this.label + " " + this.index,
            requiredFeatures
          });
          if (this.device) {
            this.ready = true;
            this.index++;
          }
        } catch (error) {
          this.onError();
          throwError(`${this.label}: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`);
        }
      }
      this.device?.lost.then((info) => {
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
      this.pipelineManager.resetCurrentPipeline();
      this.samplers.forEach((sampler) => sampler.sampler = null);
      this.renderers.forEach((renderer) => renderer.loseContext());
      this.bindGroupLayouts.clear();
      this.buffers.clear();
    }
    /**
     * Called when the {@link device} should be restored.
     * Restore all our renderers.
     * @async
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async restoreDevice({ adapter = null, device = null } = {}) {
      await this.setAdapterAndDevice({ adapter, device });
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
      this.bindGroups = /* @__PURE__ */ new Map();
      this.buffers = /* @__PURE__ */ new Map();
      this.bindGroupLayouts = /* @__PURE__ */ new Map();
      this.bufferBindings = /* @__PURE__ */ new Map();
      this.samplers = [];
      this.domTextures = [];
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
      this.bindGroups.set(bindGroup.uuid, bindGroup);
    }
    /**
     * Remove a {@link AllowedBindGroups | bind group} from our {@link bindGroups | bind groups array}
     * @param bindGroup - {@link AllowedBindGroups | bind group} to remove
     */
    removeBindGroup(bindGroup) {
      this.bindGroups.delete(bindGroup.uuid);
    }
    /**
     * Add a {@link GPUBuffer} to our our {@link buffers} array
     * @param buffer - {@link Buffer} to add
     */
    addBuffer(buffer) {
      this.buffers.set(buffer.uuid, buffer);
    }
    /**
     * Remove a {@link Buffer} from our {@link buffers} Map
     * @param buffer - {@link Buffer} to remove
     */
    removeBuffer(buffer) {
      this.buffers.delete(buffer?.uuid);
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
     * Add a {@link DOMTexture} to our {@link domTextures} array
     * @param texture - {@link DOMTexture} to add
     */
    addDOMTexture(texture) {
      this.domTextures.push(texture);
    }
    /**
     * Upload a {@link DOMTexture#texture | texture} to the GPU
     * @param texture - {@link DOMTexture} class object with the {@link DOMTexture#texture | texture} to upload
     */
    uploadTexture(texture) {
      if (texture.source) {
        try {
          this.device?.queue.copyExternalImageToTexture(
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
        this.device?.queue.writeTexture(
          { texture: texture.texture },
          new Uint8Array(texture.options.placeholderColor),
          { bytesPerRow: texture.size.width * 4 },
          { width: texture.size.width, height: texture.size.height }
        );
      }
    }
    /**
     * Remove a {@link DOMTexture} from our {@link domTextures} array
     * @param texture - {@link DOMTexture} to remove
     */
    removeDOMTexture(texture) {
      this.domTextures = this.domTextures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Render everything:
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onBeforeCommandEncoder | onBeforeCommandEncoder} callbacks
     * - create a {@link GPUCommandEncoder}
     * - render all our {@link renderers}
     * - submit our {@link GPUCommandBuffer}
     * - upload {@link DOMTexture#texture | DOMTexture textures} that do not have a parentMesh
     * - empty our {@link texturesQueue} array
     * - call all our {@link renderers} {@link core/renderers/GPURenderer.GPURenderer#onAfterCommandEncoder | onAfterCommandEncoder} callbacks
     */
    render() {
      if (!this.ready)
        return;
      for (const renderer of this.renderers) {
        if (renderer.shouldRender)
          renderer.onBeforeCommandEncoder();
      }
      const commandEncoder = this.device?.createCommandEncoder({ label: this.label + " command encoder" });
      !this.production && commandEncoder.pushDebugGroup(this.label + " command encoder: main render loop");
      this.renderers.forEach((renderer) => renderer.render(commandEncoder));
      !this.production && commandEncoder.popDebugGroup();
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
      this.domTextures.filter((texture) => !texture.parentMesh && texture.sourceLoaded && !texture.sourceUploaded).forEach((texture) => this.uploadTexture(texture));
      for (const texture of this.texturesQueue) {
        texture.sourceUploaded = true;
      }
      this.texturesQueue = [];
      for (const renderer of this.renderers) {
        if (renderer.shouldRender)
          renderer.onAfterCommandEncoder();
      }
    }
    /**
     * Destroy the {@link GPUDeviceManager} and its {@link renderers}
     */
    destroy() {
      this.device?.destroy();
      this.device = null;
      this.renderers.forEach((renderer) => renderer.destroy());
      this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.buffers.forEach((buffer) => buffer?.destroy());
      this.domTextures.forEach((texture) => texture.destroy());
      this.setDeviceObjects();
    }
  }

  var __accessCheck$4 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$3 = (obj, member, getter) => {
    __accessCheck$4(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$4 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$3 = (obj, member, value, setter) => {
    __accessCheck$4(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _autoRender;
  class RenderTarget {
    /**
     * RenderTarget constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - {@link RenderTargetParams | parameters} use to create this {@link RenderTarget}
     */
    constructor(renderer, parameters = {}) {
      /** Whether we should add this {@link RenderTarget} to our {@link core/scenes/Scene.Scene | Scene} to let it handle the rendering process automatically */
      __privateAdd$4(this, _autoRender, true);
      renderer = isRenderer(renderer, "RenderTarget");
      this.type = "RenderTarget";
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { label, colorAttachments, depthTexture, autoRender, ...renderPassParams } = parameters;
      const depthTextureToUse = !!depthTexture ? depthTexture : this.renderer.renderPass.options.sampleCount === (parameters.sampleCount ?? 4) ? this.renderer.renderPass.depthTexture : null;
      this.options = {
        label,
        ...renderPassParams,
        ...depthTextureToUse && { depthTexture: depthTextureToUse },
        ...colorAttachments && { colorAttachments },
        autoRender: autoRender === void 0 ? true : autoRender
      };
      if (autoRender !== void 0) {
        __privateSet$3(this, _autoRender, autoRender);
      }
      this.renderPass = new RenderPass(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
        ...colorAttachments && { colorAttachments },
        depthTexture: this.options.depthTexture,
        ...renderPassParams
      });
      if (renderPassParams.useColorAttachments !== false) {
        this.renderTexture = new Texture(this.renderer, {
          label: this.options.label ? `${this.options.label} Render Texture` : "Render Target render texture",
          name: "renderTexture",
          format: colorAttachments && colorAttachments.length && colorAttachments[0].targetFormat ? colorAttachments[0].targetFormat : this.renderer.options.preferredFormat,
          ...this.options.qualityRatio !== void 0 && { qualityRatio: this.options.qualityRatio },
          usage: ["copySrc", "renderAttachment", "textureBinding"]
        });
      }
      this.addToScene();
    }
    /**
     * Get the textures outputted by the {@link renderPass} if any, which means its {@link RenderPass.viewTextures | viewTextures} if not multisampled, or the {@link RenderPass.resolveTargets | resolveTargets} else.
     *
     * Since some {@link RenderPass} might not have any view textures (or in case the first resolve target is `null`), the first element can be the {@link RenderTarget.renderTexture | RenderTarget renderTexture} itself.
     *
     * @readonly
     */
    get outputTextures() {
      return !this.renderPass.outputTextures.length ? !this.renderTexture ? [] : [this.renderTexture] : this.renderPass.outputTextures.map((texture, index) => {
        return index === 0 && this.renderPass.options.renderToSwapChain ? this.renderTexture : texture;
      });
    }
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    addToScene() {
      this.renderer.renderTargets.push(this);
      if (__privateGet$3(this, _autoRender)) {
        this.renderer.scene.addRenderTarget(this);
      }
    }
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link core/scenes/Scene.Scene | Scene}
     */
    removeFromScene() {
      if (__privateGet$3(this, _autoRender)) {
        this.renderer.scene.removeRenderTarget(this);
      }
      this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
    }
    /**
     * Resize our {@link renderPass}
     */
    resize() {
      if (this.options.depthTexture) {
        this.renderPass.options.depthTexture.texture = this.options.depthTexture.texture;
      }
      this.renderPass?.resize();
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
      this.renderer.meshes.forEach((mesh) => {
        if (mesh.outputTarget && mesh.outputTarget.uuid === this.uuid) {
          mesh.setOutputTarget(null);
        }
      });
      this.renderer.shaderPasses.forEach((shaderPass) => {
        if (shaderPass.outputTarget && shaderPass.outputTarget.uuid === this.uuid) {
          shaderPass.outputTarget = null;
          shaderPass.setOutputTarget(null);
        }
      });
      this.removeFromScene();
      this.renderPass?.destroy();
      this.renderTexture?.destroy();
    }
  }
  _autoRender = new WeakMap();

  var default_pass_fsWGSl = (
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
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
      parameters.depth = false;
      const defaultBlend = {
        color: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        },
        alpha: {
          srcFactor: "one",
          dstFactor: "one-minus-src-alpha"
        }
      };
      if (!parameters.targets) {
        parameters.targets = [
          {
            blend: defaultBlend
          }
        ];
      } else if (parameters.targets && parameters.targets.length && !parameters.targets[0].blend) {
        parameters.targets[0].blend = defaultBlend;
      }
      parameters.label = parameters.label ?? "ShaderPass " + renderer.shaderPasses?.length;
      parameters.sampleCount = !!parameters.sampleCount ? parameters.sampleCount : renderer && renderer.postProcessingPass ? renderer && renderer.postProcessingPass.options.sampleCount : 1;
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
      if (parameters.inputTarget) {
        this.setInputTarget(parameters.inputTarget);
      }
      if (this.outputTarget) {
        this.setRenderingOptionsForRenderPass(this.outputTarget.renderPass);
      }
      this.type = "ShaderPass";
      this.createTexture({
        label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
        name: "renderTexture",
        fromTexture: this.inputTarget ? this.inputTarget.renderTexture : null,
        usage: ["copySrc", "copyDst", "textureBinding"],
        ...this.outputTarget && this.outputTarget.options.qualityRatio && { qualityRatio: this.outputTarget.options.qualityRatio }
      });
    }
    /**
     * Hook used to clean up parameters before sending them to the material.
     * @param parameters - parameters to clean before sending them to the {@link core/materials/RenderMaterial.RenderMaterial | RenderMaterial}
     * @returns - cleaned parameters
     */
    cleanupRenderMaterialParameters(parameters) {
      delete parameters.copyOutputToRenderTexture;
      delete parameters.inputTarget;
      super.cleanupRenderMaterialParameters(parameters);
      return parameters;
    }
    /**
     * Get our main {@link Texture} that contains the input content to be used by the {@link ShaderPass}. Can also contain the ouputted content if {@link ShaderPassOptions#copyOutputToRenderTexture | copyOutputToRenderTexture} is set to true.
     * @readonly
     */
    get renderTexture() {
      return this.textures.find((texture) => texture.options.name === "renderTexture");
    }
    /**
     * Assign or remove an input {@link RenderTarget} to this {@link ShaderPass}, which can be different from what has just been drawn to the {@link core/renderers/GPURenderer.GPURenderer#context | context} current texture.
     *
     * Since this manipulates the {@link core/scenes/Scene.Scene | Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the {@link RenderTarget#renderTexture | render target render texture} into the {@link ShaderPass} {@link renderTexture}
     * @param inputTarget - the {@link RenderTarget} to assign or null if we want to remove the current {@link RenderTarget}
     */
    setInputTarget(inputTarget) {
      if (inputTarget && inputTarget.type !== "RenderTarget") {
        throwWarning(`${this.options.label ?? this.type}: inputTarget is not a RenderTarget: ${inputTarget}`);
        return;
      }
      this.removeFromScene();
      this.inputTarget = inputTarget;
      this.addToScene();
      if (this.renderTexture) {
        if (inputTarget) {
          this.renderTexture.copy(this.inputTarget.renderTexture);
        } else {
          this.renderTexture.options.fromTexture = null;
          this.renderTexture.createTexture();
        }
      }
    }
    /**
     * Add the {@link ShaderPass} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer as well.
     * @param addToRenderer - whether to add this {@link ShaderPass} to the {@link Renderer#shaderPasses | Renderer shaderPasses array}
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.shaderPasses.push(this);
      }
      this.setRenderingOptionsForRenderPass(
        this.outputTarget ? this.outputTarget.renderPass : this.renderer.postProcessingPass
      );
      if (this.autoRender) {
        this.renderer.scene.addShaderPass(this);
      }
    }
    /**
     * Remove the {@link ShaderPass} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link ShaderPass} from the {@link Renderer#shaderPasses | Renderer shaderPasses array}
     */
    removeFromScene(removeFromRenderer = false) {
      if (this.outputTarget) {
        this.outputTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removeShaderPass(this);
      }
      if (removeFromRenderer) {
        this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid);
      }
    }
  }

  var __accessCheck$3 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$2 = (obj, member, getter) => {
    __accessCheck$3(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$3 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$2 = (obj, member, value, setter) => {
    __accessCheck$3(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _DOMObjectWorldPosition, _DOMObjectWorldScale, _DOMObjectDepthScaleRatio;
  class DOMObject3D extends ProjectedObject3D {
    /**
     * DOMObject3D constructor
     * @param renderer - {@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMObject3D}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
     * @param parameters - {@link DOMObject3DParams | parameters} used to create this {@link DOMObject3D}
     */
    constructor(renderer, element, parameters = {}) {
      super(renderer);
      /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3DTransforms#position.world | world position} accounting the {@link DOMObject3DTransforms#position.document | additional document translation} converted into world space */
      __privateAdd$3(this, _DOMObjectWorldPosition, new Vec3());
      /** Private {@link Vec3 | vector} used to keep track of the actual {@link DOMObject3D} world scale accounting the {@link DOMObject3D#size.world | DOMObject3D world size} */
      __privateAdd$3(this, _DOMObjectWorldScale, new Vec3(1));
      /** Private number representing the scale ratio of the {@link DOMObject3D} along Z axis to apply. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis. */
      __privateAdd$3(this, _DOMObjectDepthScaleRatio, 1);
      /** Helper {@link Box3 | bounding box} used to map the 3D object onto the 2D DOM element. */
      this.boundingBox = new Box3(new Vec3(-1), new Vec3(1));
      /** function assigned to the {@link onAfterDOMElementResize} callback */
      this._onAfterDOMElementResizeCallback = () => {
      };
      renderer = isCurtainsRenderer(renderer, "DOM3DObject");
      this.renderer = renderer;
      this.size = {
        shouldUpdate: true,
        normalizedWorld: {
          size: new Vec2(1),
          position: new Vec2()
        },
        cameraWorld: {
          size: new Vec2(1)
        },
        scaledWorld: {
          size: new Vec3(1),
          position: new Vec3()
        }
      };
      this.watchScroll = parameters.watchScroll;
      this.camera = this.renderer.camera;
      this.boundingBox.min.onChange(() => this.shouldUpdateComputedSizes());
      this.boundingBox.max.onChange(() => this.shouldUpdateComputedSizes());
      this.setDOMElement(element);
      this.renderer.domObjects.push(this);
    }
    /**
     * Set the {@link domElement | DOM Element}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setDOMElement(element) {
      this.domElement = new DOMElement({
        element,
        onSizeChanged: (boundingRect) => this.resize(boundingRect),
        onPositionChanged: () => this.onPositionChanged()
      });
      this.updateSizeAndPosition();
    }
    /**
     * Update size and position when the {@link domElement | DOM Element} position changed
     */
    onPositionChanged() {
      if (this.watchScroll) {
        this.shouldUpdateComputedSizes();
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
     * Resize the {@link DOMObject3D}
     * @param boundingRect - new {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     */
    resize(boundingRect = null) {
      if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
        return;
      this.updateSizeAndPosition();
      this._onAfterDOMElementResizeCallback && this._onAfterDOMElementResizeCallback();
    }
    /* BOUNDING BOXES GETTERS */
    /**
     * Get the {@link domElement | DOM Element} {@link DOMElement#boundingRect | bounding rectangle}
     * @readonly
     */
    get boundingRect() {
      return this.domElement?.boundingRect ?? {
        width: 1,
        height: 1,
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        x: 0,
        y: 0
      };
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
      return __privateGet$2(this, _DOMObjectWorldScale).clone();
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
      return __privateGet$2(this, _DOMObjectWorldPosition).clone();
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
     * Check whether at least one of the matrix should be updated
     */
    shouldUpdateMatrices() {
      super.shouldUpdateMatrices();
      if (this.matricesNeedUpdate || this.size.shouldUpdate) {
        this.updateSizeAndPosition();
      }
      this.size.shouldUpdate = false;
    }
    /**
     * Set the {@link DOMObject3D#size.shouldUpdate | size shouldUpdate} flag to true to compute the new sizes before next matrices calculations.
     */
    shouldUpdateComputedSizes() {
      this.size.shouldUpdate = true;
    }
    /**
     * Update the {@link DOMObject3D} sizes and position
     */
    updateSizeAndPosition() {
      this.setWorldSizes();
      this.applyDocumentPosition();
    }
    /**
     * Compute the {@link DOMObject3D} world position using its world position and document translation converted to world space
     */
    applyDocumentPosition() {
      let worldPosition = new Vec3(0, 0, 0);
      if (!this.documentPosition.equals(worldPosition)) {
        worldPosition = this.documentToWorldSpace(this.documentPosition);
      }
      __privateGet$2(this, _DOMObjectWorldPosition).set(
        this.position.x + this.size.scaledWorld.position.x + worldPosition.x,
        this.position.y + this.size.scaledWorld.position.y + worldPosition.y,
        this.position.z + this.size.scaledWorld.position.z + this.documentPosition.z / this.camera.CSSPerspective
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
        __privateGet$2(this, _DOMObjectWorldPosition),
        this.quaternion,
        this.scale,
        this.worldTransformOrigin
      );
      this.modelMatrix.scale(this.DOMObjectWorldScale);
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Convert a document position {@link Vec3 | vector} to a world position {@link Vec3 | vector}
     * @param vector - document position {@link Vec3 | vector} converted to world space
     */
    documentToWorldSpace(vector = new Vec3()) {
      return new Vec3(
        vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.visibleSize.width,
        -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.visibleSize.height,
        vector.z
      );
    }
    /**
     * Compute the {@link DOMObject3D#size | world sizes}
     */
    computeWorldSizes() {
      const containerBoundingRect = this.renderer.boundingRect;
      const planeCenter = {
        x: this.boundingRect.width / 2 + this.boundingRect.left,
        y: this.boundingRect.height / 2 + this.boundingRect.top
      };
      const containerCenter = {
        x: containerBoundingRect.width / 2 + containerBoundingRect.left,
        y: containerBoundingRect.height / 2 + containerBoundingRect.top
      };
      const { size, center } = this.boundingBox;
      if (size.x !== 0 && size.y !== 0 && size.z !== 0) {
        center.divide(size);
      }
      this.size.normalizedWorld.size.set(
        this.boundingRect.width / containerBoundingRect.width,
        this.boundingRect.height / containerBoundingRect.height
      );
      this.size.normalizedWorld.position.set(
        (planeCenter.x - containerCenter.x) / containerBoundingRect.width,
        (containerCenter.y - planeCenter.y) / containerBoundingRect.height
      );
      this.size.cameraWorld.size.set(
        this.size.normalizedWorld.size.x * this.camera.visibleSize.width,
        this.size.normalizedWorld.size.y * this.camera.visibleSize.height
      );
      this.size.scaledWorld.size.set(this.size.cameraWorld.size.x / size.x, this.size.cameraWorld.size.y / size.y, 1);
      this.size.scaledWorld.size.z = this.size.scaledWorld.size.y * (size.x / size.y / (this.boundingRect.width / this.boundingRect.height));
      this.size.scaledWorld.position.set(
        this.size.normalizedWorld.position.x * this.camera.visibleSize.width,
        this.size.normalizedWorld.position.y * this.camera.visibleSize.height,
        0
      );
    }
    /**
     * Compute and set the {@link DOMObject3D#size.world | world size} and set the {@link DOMObject3D} world transform origin
     */
    setWorldSizes() {
      this.computeWorldSizes();
      this.setWorldScale();
      this.setWorldTransformOrigin();
    }
    /**
     * Set the {@link worldScale} accounting for scaled world size and {@link DOMObjectDepthScaleRatio}
     */
    setWorldScale() {
      __privateGet$2(this, _DOMObjectWorldScale).set(
        this.size.scaledWorld.size.x,
        this.size.scaledWorld.size.y,
        this.size.scaledWorld.size.z * __privateGet$2(this, _DOMObjectDepthScaleRatio)
      );
      this.shouldUpdateMatrixStack();
    }
    /**
     * Set {@link DOMObjectDepthScaleRatio}. Since it can be difficult to guess the most accurate scale along the Z axis of an object mapped to 2D coordinates, this helps with adjusting the scale along the Z axis.
     * @param value - depth scale ratio value to use
     */
    set DOMObjectDepthScaleRatio(value) {
      __privateSet$2(this, _DOMObjectDepthScaleRatio, value);
      this.setWorldScale();
    }
    /**
     * Set the {@link DOMObject3D} world transform origin and tell the matrices to update
     */
    setWorldTransformOrigin() {
      this.transforms.origin.world = new Vec3(
        (this.transformOrigin.x * 2 - 1) * // between -1 and 1
        __privateGet$2(this, _DOMObjectWorldScale).x,
        -(this.transformOrigin.y * 2 - 1) * // between -1 and 1
        __privateGet$2(this, _DOMObjectWorldScale).y,
        this.transformOrigin.z * __privateGet$2(this, _DOMObjectWorldScale).z
      );
      this.shouldUpdateMatrixStack();
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
     * Callback to execute just after the {@link domElement} has been resized.
     * @param callback - callback to run just after {@link domElement} has been resized
     * @returns - our {@link DOMObject3D}
     */
    onAfterDOMElementResize(callback) {
      if (callback) {
        this._onAfterDOMElementResizeCallback = callback;
      }
      return this;
    }
    /**
     * Destroy our {@link DOMObject3D}
     */
    destroy() {
      super.destroy();
      this.domElement?.destroy();
    }
  }
  _DOMObjectWorldPosition = new WeakMap();
  _DOMObjectWorldScale = new WeakMap();
  _DOMObjectDepthScaleRatio = new WeakMap();

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
      // callbacks / events
      /** function assigned to the {@link onLoading} callback */
      this._onLoadingCallback = (texture) => {
      };
      parameters = { ...defaultDOMMeshParams, ...parameters };
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
      if (value && !this._ready && this.sourcesReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._ready = value;
    }
    /**
     * Get/set whether all the initial {@link DOMMesh} sources have been successfully loaded
     * @readonly
     */
    get sourcesReady() {
      return this._sourcesReady;
    }
    set sourcesReady(value) {
      if (value && !this._sourcesReady && this.ready) {
        this._onReadyCallback && this._onReadyCallback();
      }
      this._sourcesReady = value;
    }
    /**
     * Add a {@link DOMMesh} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - whether to add this {@link DOMMesh} to the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}
     */
    addToScene(addToRenderer = false) {
      super.addToScene(addToRenderer);
      if (addToRenderer) {
        this.renderer.domMeshes.push(this);
      }
    }
    /**
     * Remove a {@link DOMMesh} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link DOMMesh} from the {@link GPUCurtainsRenderer#meshes | renderer meshes array} and {@link GPUCurtainsRenderer#domMeshes | renderer domMeshes array}
     */
    removeFromScene(removeFromRenderer = false) {
      super.removeFromScene(removeFromRenderer);
      if (removeFromRenderer) {
        this.renderer.domMeshes = this.renderer.domMeshes.filter(
          (m) => m.uuid !== this.uuid
        );
      }
    }
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated {@link DOMTexture}
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
            const texture = this.createDOMTexture({
              name: image.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
            });
            texture.onSourceUploaded(() => onSourceUploaded(texture)).loadImage(image.src);
          });
        }
        if (videos.length) {
          videos.forEach((video) => {
            const texture = this.createDOMTexture({
              name: video.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
            });
            texture.onSourceUploaded(() => onSourceUploaded(texture)).loadVideo(video);
          });
        }
        if (canvases.length) {
          canvases.forEach((canvas) => {
            const texture = this.createDOMTexture({
              name: canvas.getAttribute("data-texture-name") ?? "texture" + this.domTextures.length
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
     * Compute the Mesh geometry if needed
     */
    computeGeometry() {
      super.computeGeometry();
      this.boundingBox.copy(this.geometry.boundingBox);
    }
    /* EVENTS */
    /**
     * Called each time one of the initial sources associated {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU
     * @param callback - callback to call each time a {@link DOMTexture#texture | GPU texture} has been uploaded to the GPU
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
      renderer = isCurtainsRenderer(renderer, parameters.label ? parameters.label + " Plane" : "Plane");
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
        x: 2 * (mouseCoords.x / this.renderer.boundingRect.width) - 1,
        y: 2 * (1 - mouseCoords.y / this.renderer.boundingRect.height) - 1
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
        const inverseViewMatrix = this.worldMatrix.getInverse().premultiply(this.camera.viewMatrix);
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

  class GPUCurtainsRenderer extends GPUCameraRenderer {
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - {@link GPUCameraRendererParams | parameters} used to create this {@link GPUCurtainsRenderer}
     */
    constructor({
      deviceManager,
      label,
      container,
      pixelRatio = 1,
      autoResize = true,
      preferredFormat,
      alphaMode = "premultiplied",
      renderPass,
      camera
    }) {
      super({
        deviceManager,
        label,
        container,
        pixelRatio,
        autoResize,
        preferredFormat,
        alphaMode,
        renderPass,
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
      this.domObjects = [];
    }
    /**
     * Update the {@link domObjects} sizes and positions when the {@link camera} {@link core/camera/Camera.Camera#position | position} or {@link core/camera/Camera.Camera#size | size} change.
     */
    onCameraMatricesChanged() {
      super.onCameraMatricesChanged();
      this.domObjects.forEach((domObject) => {
        domObject.updateSizeAndPosition();
      });
    }
    /**
     * Resize the {@link meshes}.
     */
    resizeMeshes() {
      this.meshes.forEach((mesh) => {
        if (!("domElement" in mesh)) {
          mesh.resize(this.boundingRect);
        }
      });
      this.domObjects.forEach((domObject) => {
        if (!domObject.domElement.isResizing) {
          domObject.domElement.setSize();
        }
      });
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
      label,
      pixelRatio = window.devicePixelRatio ?? 1,
      preferredFormat,
      alphaMode = "premultiplied",
      production = false,
      adapterOptions = {},
      renderPass,
      camera,
      autoRender = true,
      autoResize = true,
      watchScroll = true
    } = {}) {
      // callbacks / events
      /** function assigned to the {@link onRender} callback */
      this._onRenderCallback = () => {
      };
      /** function assigned to the {@link onScroll} callback */
      this._onScrollCallback = () => {
      };
      /** function assigned to the {@link onError} callback */
      this._onErrorCallback = () => {
      };
      /** function assigned to the {@link onContextLost} callback */
      this._onContextLostCallback = () => {
      };
      this.type = "CurtainsGPU";
      this.options = {
        container,
        label,
        pixelRatio,
        camera,
        production,
        adapterOptions,
        preferredFormat,
        alphaMode,
        renderPass,
        autoRender,
        autoResize,
        watchScroll
      };
      this.setDeviceManager();
      if (container) {
        this.setContainer(container);
      }
      this.initEvents();
      if (this.options.autoRender) {
        this.animate();
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
      this.setMainRenderer();
    }
    /**
     * Set the default {@link GPUCurtainsRenderer | renderer}
     */
    setMainRenderer() {
      this.createCurtainsRenderer({
        deviceManager: this.deviceManager,
        // TODO ...this.options?
        label: this.options.label,
        container: this.options.container,
        pixelRatio: this.options.pixelRatio,
        autoResize: this.options.autoResize,
        preferredFormat: this.options.preferredFormat,
        alphaMode: this.options.alphaMode,
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
      if (parameters.autoResize === void 0)
        parameters.autoResize = this.options.autoResize;
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
        adapterOptions: this.options.adapterOptions,
        onError: () => setTimeout(() => {
          this._onErrorCallback && this._onErrorCallback();
        }, 0),
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
     * Get the first created {@link Renderer} if any
     * @readonly
     */
    get renderer() {
      return this.renderers[0];
    }
    /**
     * Set the {@link GPUDeviceManager} {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device} if possible, then set all created {@link Renderer} contexts.
     * @async
     * @param parameters - {@link GPUAdapter} and/or {@link GPUDevice} to use if set.
     */
    async setDevice({ adapter = null, device = null } = {}) {
      await this.deviceManager.init({ adapter, device });
    }
    /**
     * Restore the {@link GPUDeviceManager#adapter | adapter} and {@link GPUDeviceManager#device | device}
     * @async
     */
    async restoreContext() {
      await this.deviceManager.restoreDevice();
    }
    /* RENDERER TRACKED OBJECTS */
    /**
     * Get all the created {@link PingPongPlane}
     * @readonly
     */
    get pingPongPlanes() {
      return this.renderers?.map((renderer) => renderer.pingPongPlanes).flat();
    }
    /**
     * Get all the created {@link ShaderPass}
     * @readonly
     */
    get shaderPasses() {
      return this.renderers?.map((renderer) => renderer.shaderPasses).flat();
    }
    /**
     * Get all the created {@link SceneStackedMesh | meshes}
     * @readonly
     */
    get meshes() {
      return this.renderers?.map((renderer) => renderer.meshes).flat();
    }
    /**
     * Get all the created {@link DOMMesh | DOM Meshes} (including {@link Plane | planes})
     * @readonly
     */
    get domMeshes() {
      return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domMeshes).flat();
    }
    /**
     * Get all created {@link curtains/objects3D/DOMObject3D.DOMObject3D | DOMObject3D} which position should be updated on scroll.
     * @readonly
     */
    get domObjects() {
      return this.renderers?.filter((renderer) => renderer instanceof GPUCurtainsRenderer).map((renderer) => renderer.domObjects).flat();
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
      return this.renderers?.map((renderer) => renderer.computePasses).flat();
    }
    /**
     * Get our {@link GPUCurtainsRenderer#setPerspective | default GPUCurtainsRenderer bounding rectangle}
     */
    get boundingRect() {
      return this.renderer?.boundingRect;
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
      this.domObjects.forEach((domObject) => {
        if (domObject.domElement && domObject.watchScroll) {
          domObject.updateScrollPosition(delta);
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
      if (this.animationFrameID) {
        window.cancelAnimationFrame(this.animationFrameID);
      }
      this.deviceManager.destroy();
      this.scrollManager?.destroy();
      resizeManager.destroy();
    }
  }

  var __accessCheck$2 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet$1 = (obj, member, getter) => {
    __accessCheck$2(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$2 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet$1 = (obj, member, value, setter) => {
    __accessCheck$2(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _lastPosition, _isOrbiting, _element;
  class OrbitControls extends Object3D {
    /**
     * OrbitControls constructor
     * @param renderer - {@link CameraRenderer} used to get the {@link core/scenes/Scene.Scene | Scene} object to use as {@link Object3D#parent | parent}, and eventually the {@link CameraRenderer#camera | Camera} as well.
     * @param parameters - optional parameters.
     * @param parameters.camera - optional {@link Camera} to use.
     * @param parameters.element - optional {@link HTMLElement} (or {@link Window} element) to use for event listeners.
     */
    constructor(renderer, { camera = null, element = null } = {}) {
      super();
      /**
       * Last pointer {@link Vec2 | position}, used internally for orbiting delta calculations.
       * @private
       */
      __privateAdd$2(this, _lastPosition, new Vec2());
      /**
       * Whether the {@link OrbitControls} are currently orbiting.
       * @private
       */
      __privateAdd$2(this, _isOrbiting, false);
      /** Whether to constrain the orbit controls along X axis or not. */
      this.constrainXOrbit = true;
      /** Whether to constrain the orbit controls along Y axis or not. */
      this.constrainYOrbit = false;
      /** Minimum orbit values to apply along both axis if constrained. */
      this.minOrbit = new Vec2(-Math.PI * 0.5, -Math.PI);
      /** Maximum orbit values to apply along both axis if constrained. */
      this.maxOrbit = new Vec2(Math.PI * 0.5, Math.PI);
      /** Orbit step (speed) values to use. */
      this.orbitStep = new Vec2(0.025);
      /** Whether to constrain the zoom or not. */
      this.constrainZoom = true;
      /** Minimum zoom value to apply if constrained (can be negative). */
      this.minZoom = 0;
      /** Maximum zoom value to apply if constrained. */
      this.maxZoom = 20;
      /** Zoom step (speed) value to use. */
      this.zoomStep = 5e-3;
      /**
       * {@link HTMLElement} (or {@link Window} element) to use for event listeners.
       * @private
       */
      __privateAdd$2(this, _element, null);
      this.renderer = renderer;
      this.parent = this.renderer.scene;
      this.quaternion.setAxisOrder("YXZ");
      this.camera = camera || this.renderer.camera;
      this.camera.parent = this;
      this.element = element ?? this.renderer.domElement.element;
    }
    /**
     * Set the element to use for event listeners. Can remove previous event listeners first if needed.
     * @param value - {@link HTMLElement} (or {@link Window} element) to use.
     */
    set element(value) {
      if (__privateGet$1(this, _element) && (!value || __privateGet$1(this, _element) !== value)) {
        this.removeEvents();
      }
      __privateSet$1(this, _element, value);
      if (value) {
        this.addEvents();
      }
    }
    /**
     * Get our element to use for event listeners.
     * @returns - {@link HTMLElement} (or {@link Window} element) used.
     */
    get element() {
      return __privateGet$1(this, _element);
    }
    /**
     * Add the event listeners.
     */
    addEvents() {
      __privateGet$1(this, _element).addEventListener("pointerdown", this.onPointerDown.bind(this));
      __privateGet$1(this, _element).addEventListener("pointermove", this.onPointerMove.bind(this));
      __privateGet$1(this, _element).addEventListener("pointerup", this.onPointerUp.bind(this));
      __privateGet$1(this, _element).addEventListener("wheel", this.onMouseWheel.bind(this));
    }
    /**
     * Remove the event listeners.
     */
    removeEvents() {
      __privateGet$1(this, _element).removeEventListener("pointerdown", this.onPointerDown.bind(this));
      __privateGet$1(this, _element).removeEventListener("pointermove", this.onPointerMove.bind(this));
      __privateGet$1(this, _element).removeEventListener("pointerup", this.onPointerUp.bind(this));
      __privateGet$1(this, _element).removeEventListener("wheel", this.onMouseWheel.bind(this));
    }
    /**
     * Callback executed on pointer down event.
     * @param e - {@link PointerEvent}.
     */
    onPointerDown(e) {
      if (e.isPrimary) {
        __privateSet$1(this, _isOrbiting, true);
      }
      __privateGet$1(this, _lastPosition).set(e.pageX, e.pageY);
    }
    /**
     * Callback executed on pointer move event.
     * @param e - {@link PointerEvent}.
     */
    onPointerMove(e) {
      let xDelta, yDelta;
      if (document.pointerLockElement) {
        xDelta = e.movementX;
        yDelta = e.movementY;
        this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y);
      } else if (__privateGet$1(this, _isOrbiting)) {
        xDelta = e.pageX - __privateGet$1(this, _lastPosition).x;
        yDelta = e.pageY - __privateGet$1(this, _lastPosition).y;
        __privateGet$1(this, _lastPosition).set(e.pageX, e.pageY);
        this.orbit(xDelta * this.orbitStep.x, yDelta * this.orbitStep.y);
      }
    }
    /**
     * Callback executed on pointer up event.
     * @param e - {@link PointerEvent}.
     */
    onPointerUp(e) {
      if (e.isPrimary) {
        __privateSet$1(this, _isOrbiting, false);
      }
    }
    /**
     * Callback executed on wheel event.
     * @param e - {@link WheelEvent}.
     */
    onMouseWheel(e) {
      this.zoom(this.position.z + e.deltaY * this.zoomStep);
      e.preventDefault();
    }
    /**
     * Reset the {@link OrbitControls} {@link position} and {@link rotation} values.
     */
    reset() {
      this.position.set(0);
      this.rotation.set(0);
    }
    /**
     * Update the {@link OrbitControls} {@link rotation} based on deltas.
     * @param xDelta - delta along the X axis.
     * @param yDelta - delta along the Y axis.
     */
    orbit(xDelta, yDelta) {
      if (xDelta || yDelta) {
        this.rotation.y -= xDelta;
        if (this.constrainYOrbit) {
          this.rotation.y = Math.min(Math.max(this.rotation.y, this.minOrbit.y), this.maxOrbit.y);
        } else {
          while (this.rotation.y < -Math.PI) {
            this.rotation.y += Math.PI * 2;
          }
          while (this.rotation.y >= Math.PI) {
            this.rotation.y -= Math.PI * 2;
          }
        }
        this.rotation.x -= yDelta;
        if (this.constrainXOrbit) {
          this.rotation.x = Math.min(Math.max(this.rotation.x, this.minOrbit.x), this.maxOrbit.x);
        } else {
          while (this.rotation.x < -Math.PI) {
            this.rotation.x += Math.PI * 2;
          }
          while (this.rotation.x >= Math.PI) {
            this.rotation.x -= Math.PI * 2;
          }
        }
      }
    }
    /**
     * Update the {@link OrbitControls} {@link position} Z component based on the new distance.
     * @param distance - new distance to use.
     */
    zoom(distance) {
      this.position.z = distance;
      if (this.constrainZoom) {
        this.position.z = Math.min(Math.max(this.position.z, this.minZoom), this.maxZoom);
      }
    }
    /**
     * Override {@link Object3D#updateModelMatrix | updateModelMatrix} method to compose the {@link modelMatrix}.
     */
    updateModelMatrix() {
      this.modelMatrix.identity().rotateFromQuaternion(this.quaternion).translate(this.position);
      this.shouldUpdateWorldMatrix();
    }
    /**
     * Destroy the {@link OrbitControls}.
     */
    destroy() {
      this.camera.parent = this.renderer.scene;
      this.parent = null;
      this.element = null;
    }
  }
  _lastPosition = new WeakMap();
  _isOrbiting = new WeakMap();
  _element = new WeakMap();

  class BoxGeometry extends IndexedGeometry {
    constructor({
      instancesCount = 1,
      vertexBuffers = [],
      topology,
      mapBuffersAtCreation = true,
      widthSegments = 1,
      heightSegments = 1,
      depthSegments = 1
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
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
      topology,
      instancesCount = 1,
      vertexBuffers = [],
      mapBuffersAtCreation = true,
      widthSegments = 32,
      heightSegments = 16,
      phiStart = 0,
      phiLength = Math.PI * 2,
      thetaStart = 0,
      thetaLength = Math.PI
    } = {}) {
      super({ verticesOrder: "ccw", topology, instancesCount, vertexBuffers, mapBuffersAtCreation });
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

  class PingPongPlane extends FullscreenPlane {
    /**
     * PingPongPlane constructor
     * @param renderer - {@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
     * @param parameters - {@link MeshBaseRenderParams | parameters} use to create this {@link PingPongPlane}
     */
    constructor(renderer, parameters = {}) {
      renderer = isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
      const colorAttachments = parameters.targets && parameters.targets.length && parameters.targets.map((target) => {
        return {
          targetFormat: target.format
        };
      });
      parameters.outputTarget = new RenderTarget(renderer, {
        label: parameters.label ? parameters.label + " render target" : "Ping Pong render target",
        useDepth: false,
        ...colorAttachments && { colorAttachments }
      });
      parameters.transparent = false;
      parameters.depth = false;
      parameters.label = parameters.label ?? "PingPongPlane " + renderer.pingPongPlanes?.length;
      super(renderer, parameters);
      this.type = "PingPongPlane";
      this.createTexture({
        label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
        name: "renderTexture",
        ...parameters.targets && parameters.targets.length && { format: parameters.targets[0].format },
        usage: ["copyDst", "textureBinding"]
      });
    }
    /**
     * Get our main {@link Texture}, the one that contains our ping pong content
     * @readonly
     */
    get renderTexture() {
      return this.textures.find((texture) => texture.options.name === "renderTexture");
    }
    /**
     * Add the {@link PingPongPlane} to the {@link core/scenes/Scene.Scene | Scene} and optionally to the renderer.
     * @param addToRenderer - whether to add this {@link PingPongPlane} to the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}
     */
    addToScene(addToRenderer = false) {
      if (addToRenderer) {
        this.renderer.pingPongPlanes.push(this);
      }
      if (this.autoRender) {
        this.renderer.scene.addPingPongPlane(this);
      }
    }
    /**
     * Remove the {@link PingPongPlane} from the {@link core/scenes/Scene.Scene | Scene} and optionally from the renderer as well.
     * @param removeFromRenderer - whether to remove this {@link PingPongPlane} from the {@link Renderer#pingPongPlanes | Renderer pingPongPlanes array}
     */
    removeFromScene(removeFromRenderer = false) {
      if (this.outputTarget) {
        this.outputTarget.destroy();
      }
      if (this.autoRender) {
        this.renderer.scene.removePingPongPlane(this);
      }
      if (removeFromRenderer) {
        this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
      }
    }
  }

  const GL$1 = WebGLRenderingContext;
  const GLB_MAGIC = 1179937895;
  const CHUNK_TYPE = {
    JSON: 1313821514,
    BIN: 5130562
  };
  const DEFAULT_TRANSLATION = [0, 0, 0];
  const DEFAULT_ROTATION = [0, 0, 0, 1];
  const DEFAULT_SCALE = [1, 1, 1];
  const absUriRegEx = typeof window !== "undefined" && new RegExp(`^${window.location.protocol}`, "i") || RegExp(`^(http|https):`, "i");
  const dataUriRegEx = /^data:/;
  class GLTFLoader {
    /**
     * {@link GLTFLoader} constructor.
     */
    constructor() {
      this.gltf = null;
    }
    /**
     * Build the absolute uri of the resource
     * @param uri - uri of the resource
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - absolute uri of the resource
     */
    static resolveUri(uri, baseUrl) {
      if (!!uri.match(absUriRegEx) || !!uri.match(dataUriRegEx)) {
        return uri;
      }
      return baseUrl + uri;
    }
    /**
     * Load a glTF from the given url.
     * @param url - url of the glTF.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    async loadFromUrl(url) {
      const i = url.lastIndexOf("/");
      const baseUrl = i !== 0 ? url.substring(0, i + 1) : "";
      const response = await fetch(url);
      if (url.endsWith(".gltf")) {
        return this.loadFromJson(await response.json(), baseUrl);
      } else if (url.endsWith(".glb")) {
        return this.loadFromBinary(await response.arrayBuffer(), baseUrl);
      } else {
        throw new Error("Unrecognized file extension");
      }
    }
    /**
     * Parse a {@link GLTF.IGLTF | glTF json} and create our {@link gltf} base object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - {@link gltf} base object.
     * @async
     */
    async loadFromJsonBase(json, baseUrl, binaryChunk = null) {
      if (!baseUrl) {
        throw new Error("baseUrl must be specified.");
      }
      if (!json.asset) {
        throw new Error("Missing asset description.");
      }
      if (json.asset.minVersion !== "2.0" && json.asset.version !== "2.0") {
        throw new Error("Incompatible asset version.");
      }
      for (const accessor of json.accessors) {
        accessor.byteOffset = accessor.byteOffset ?? 0;
        accessor.normalized = accessor.normalized ?? false;
      }
      for (const bufferView of json.bufferViews) {
        bufferView.byteOffset = bufferView.byteOffset ?? 0;
      }
      for (const node of json.nodes) {
        if (!node.matrix) {
          node.rotation = node.rotation ?? DEFAULT_ROTATION;
          node.scale = node.scale ?? DEFAULT_SCALE;
          node.translation = node.translation ?? DEFAULT_TRANSLATION;
        }
      }
      if (json.samplers) {
        for (const sampler of json.samplers) {
          sampler.wrapS = sampler.wrapS ?? GL$1.REPEAT;
          sampler.wrapT = sampler.wrapT ?? GL$1.REPEAT;
        }
      }
      const pendingBuffers = [];
      if (binaryChunk) {
        pendingBuffers.push(Promise.resolve(binaryChunk));
      } else {
        for (const index in json.buffers) {
          const buffer = json.buffers[index];
          const uri = GLTFLoader.resolveUri(buffer.uri, baseUrl);
          pendingBuffers[index] = fetch(uri).then((response) => response.arrayBuffer());
        }
      }
      const pendingImages = [];
      for (let index = 0; index < json.images?.length || 0; ++index) {
        const image = json.images[index];
        if (image.uri) {
          pendingImages[index] = fetch(GLTFLoader.resolveUri(image.uri, baseUrl)).then(async (response) => {
            return createImageBitmap(await response.blob());
          });
        } else {
          const bufferView = json.bufferViews[image.bufferView];
          pendingImages[index] = pendingBuffers[bufferView.buffer].then((buffer) => {
            const blob = new Blob([new Uint8Array(buffer, bufferView.byteOffset, bufferView.byteLength)], {
              type: image.mimeType
            });
            return createImageBitmap(blob);
          });
        }
      }
      return {
        ...json,
        arrayBuffers: await Promise.all(pendingBuffers),
        imagesBitmaps: await Promise.all(pendingImages)
      };
    }
    /**
     * Load a glTF from a .glb file.
     * @param arrayBuffer - {@link ArrayBuffer} containing the data.
     * @param baseUrl - base url from which to get all the other assets.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    async loadFromBinary(arrayBuffer, baseUrl) {
      const headerView = new DataView(arrayBuffer, 0, 12);
      const magic = headerView.getUint32(0, true);
      const version = headerView.getUint32(4, true);
      const length = headerView.getUint32(8, true);
      if (magic !== GLB_MAGIC) {
        throw new Error("Invalid magic string in binary header.");
      }
      if (version !== 2) {
        throw new Error("Incompatible version in binary header.");
      }
      const chunks = {};
      let chunkOffset = 12;
      while (chunkOffset < length) {
        const chunkHeaderView = new DataView(arrayBuffer, chunkOffset, 8);
        const chunkLength = chunkHeaderView.getUint32(0, true);
        const chunkType = chunkHeaderView.getUint32(4, true);
        chunks[chunkType] = arrayBuffer.slice(chunkOffset + 8, chunkOffset + 8 + chunkLength);
        chunkOffset += chunkLength + 8;
      }
      if (!chunks[CHUNK_TYPE.JSON]) {
        throw new Error("File contained no json chunk.");
      }
      const decoder = new TextDecoder("utf-8");
      const jsonString = decoder.decode(chunks[CHUNK_TYPE.JSON]);
      return this.loadFromJson(JSON.parse(jsonString), baseUrl, chunks[CHUNK_TYPE.BIN]);
    }
    /**
     * Load the glTF json, parse the data and create our {@link GPUCurtainsGLTF} object.
     * @param json - already parsed JSON content.
     * @param baseUrl - base url from which to get all the other assets.
     * @param binaryChunk - optional binary chunks.
     * @returns - the {@link GPUCurtainsGLTF} created.
     * @async
     */
    async loadFromJson(json, baseUrl, binaryChunk = null) {
      this.gltf = await this.loadFromJsonBase(json, baseUrl, binaryChunk);
      return this.gltf;
    }
  }

  var __accessCheck$1 = (obj, member, msg) => {
    if (!member.has(obj))
      throw TypeError("Cannot " + msg);
  };
  var __privateGet = (obj, member, getter) => {
    __accessCheck$1(obj, member, "read from private field");
    return getter ? getter.call(obj) : member.get(obj);
  };
  var __privateAdd$1 = (obj, member, value) => {
    if (member.has(obj))
      throw TypeError("Cannot add the same private member more than once");
    member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
  };
  var __privateSet = (obj, member, value, setter) => {
    __accessCheck$1(obj, member, "write to private field");
    setter ? setter.call(obj, value) : member.set(obj, value);
    return value;
  };
  var _primitiveInstances;
  const GL = WebGLRenderingContext;
  const _normalMatrix = new Mat4();
  const _GLTFScenesManager = class _GLTFScenesManager {
    /**
     * {@link GLTFScenesManager} constructor.
     * @param parameters - parameters used to create our {@link GLTFScenesManager}.
     * @param parameters.renderer - our {@link CameraRenderer} class object.
     * @param parameters.gltf - The {@link GLTFLoader.gltf | gltf} object used.
     */
    constructor({ renderer, gltf }) {
      /** The {@link PrimitiveInstances} Map, to group similar {@link Mesh} by instances. */
      __privateAdd$1(this, _primitiveInstances, void 0);
      renderer = isCameraRenderer(renderer, "GLTFScenesManager");
      this.renderer = renderer;
      this.gltf = gltf;
      __privateSet(this, _primitiveInstances, /* @__PURE__ */ new Map());
      const traverseChildren = (child) => {
        return [
          child.node,
          ...child.children?.map((c) => {
            return [...traverseChildren(c)];
          }).flat()
        ].flat();
      };
      this.scenesManager = {
        node: new Object3D(),
        boundingBox: new Box3(),
        samplers: [],
        materialsTextures: [],
        scenes: [],
        meshes: [],
        meshesDescriptors: [],
        getScenesNodes: () => {
          return this.scenesManager.scenes.map((scene) => {
            return traverseChildren(scene);
          }).flat();
        }
      };
      this.createSamplers();
      this.createMaterialTextures();
      this.createScenes();
    }
    /**
     * Get an attribute type, bufferFormat and size from its {@link GLTF.AccessorType | accessor type}.
     * @param type - {@link GLTF.AccessorType | accessor type} to use.
     * @returns - corresponding type, bufferFormat and size.
     */
    static getVertexAttributeParamsFromType(type) {
      switch (type) {
        case "VEC2":
          return {
            type: "vec2f",
            bufferFormat: "float32x2",
            size: 2
          };
        case "VEC3":
          return {
            type: "vec3f",
            bufferFormat: "float32x3",
            size: 3
          };
        case "VEC4":
          return {
            type: "vec4f",
            bufferFormat: "float32x4",
            size: 4
          };
        case "SCALAR":
        default:
          return {
            type: "f32",
            bufferFormat: "float32",
            size: 1
          };
      }
    }
    /**
     * Get the corresponding typed array constructor based on the {@link GLTF.AccessorComponentType | accessor component type}.
     * @param componentType - {@link GLTF.AccessorComponentType | accessor component type} to use.
     * @returns - corresponding typed array constructor.
     */
    static getTypedArrayConstructorFromComponentType(componentType) {
      switch (componentType) {
        case GL.BYTE:
          return Int8Array;
        case GL.UNSIGNED_BYTE:
          return Uint8Array;
        case GL.SHORT:
          return Int16Array;
        case GL.UNSIGNED_SHORT:
          return Uint16Array;
        case GL.UNSIGNED_INT:
          return Uint32Array;
        case GL.FLOAT:
        default:
          return Float32Array;
      }
    }
    /**
     * Get the {@link GPUPrimitiveTopology} based on the {@link GLTF.MeshPrimitiveMode | WebGL primitive mode}.
     * @param mode - {@link GLTF.MeshPrimitiveMode | WebGL primitive mode} to use.
     * @returns - corresponding {@link GPUPrimitiveTopology}.
     */
    static gpuPrimitiveTopologyForMode(mode) {
      switch (mode) {
        case GL.TRIANGLES:
          return "triangle-list";
        case GL.TRIANGLE_STRIP:
          return "triangle-strip";
        case GL.LINES:
          return "line-list";
        case GL.LINE_STRIP:
          return "line-strip";
        case GL.POINTS:
          return "point-list";
      }
    }
    /**
     * Get the {@link GPUAddressMode} based on the {@link GLTF.TextureWrapMode | WebGL texture wrap mode}.
     * @param wrap - {@link GLTF.TextureWrapMode | WebGL texture wrap mode} to use.
     * @returns - corresponding {@link GPUAddressMode}.
     */
    static gpuAddressModeForWrap(wrap) {
      switch (wrap) {
        case GL.CLAMP_TO_EDGE:
          return "clamp-to-edge";
        case GL.MIRRORED_REPEAT:
          return "mirror-repeat";
        default:
          return "repeat";
      }
    }
    /**
     * Create the {@link Sampler} and add them to the {@link ScenesManager.samplers | scenesManager samplers array}.
     */
    createSamplers() {
      if (this.gltf.samplers) {
        for (const [index, sampler] of Object.entries(this.gltf.samplers)) {
          const descriptor = {
            label: "glTF sampler " + index,
            name: "gltfSampler" + index,
            // TODO better name?
            addressModeU: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapS),
            addressModeV: _GLTFScenesManager.gpuAddressModeForWrap(sampler.wrapT)
          };
          if (!sampler.magFilter || sampler.magFilter === GL.LINEAR) {
            descriptor.magFilter = "linear";
          }
          switch (sampler.minFilter) {
            case GL.NEAREST:
              break;
            case GL.LINEAR:
            case GL.LINEAR_MIPMAP_NEAREST:
              descriptor.minFilter = "linear";
              break;
            case GL.NEAREST_MIPMAP_LINEAR:
              descriptor.mipmapFilter = "linear";
              break;
            case GL.LINEAR_MIPMAP_LINEAR:
            default:
              descriptor.minFilter = "linear";
              descriptor.mipmapFilter = "linear";
              break;
          }
          this.scenesManager.samplers.push(new Sampler(this.renderer, descriptor));
        }
      } else {
        this.scenesManager.samplers.push(
          new Sampler(this.renderer, {
            label: "Default sampler",
            name: "defaultSampler",
            magFilter: "linear",
            minFilter: "linear",
            mipmapFilter: "linear"
          })
        );
      }
    }
    /**
     * Create a {@link Texture} based on the options.
     * @param material - material using that texture.
     * @param image - image source of the texture.
     * @param name - name of the texture.
     * @returns - newly created {@link Texture}.
     */
    createTexture(material, image, name) {
      const format = (() => {
        switch (name) {
          case "baseColorTexture":
          case "emissiveTexture":
            return "bgra8unorm-srgb";
          case "occlusionTexture":
            return "r8unorm";
          default:
            return "bgra8unorm";
        }
      })();
      const texture = new Texture(this.renderer, {
        label: material.name ? material.name + ": " + name : name,
        name,
        format,
        visibility: ["fragment"],
        generateMips: true,
        // generate mips by default
        fixedSize: {
          width: image.width,
          height: image.height
        }
      });
      texture.uploadSource({
        source: image
      });
      return texture;
    }
    /**
     * Create the {ScenesManager.materialsTextures | scenesManager materialsTextures array} and each associated {@link types/gltf/GLTFScenesManager.MaterialTexture | MaterialTexture} and their respective {@link Texture}.
     */
    createMaterialTextures() {
      this.scenesManager.materialsTextures = [];
      if (this.gltf.materials) {
        for (const [materialIndex, material] of Object.entries(this.gltf.materials)) {
          const materialTextures = {
            material: materialIndex,
            texturesDescriptors: []
          };
          const getUVAttributeName = (texture) => {
            if (!texture.texCoord)
              return "uv";
            return texture.texCoord !== 0 ? "uv" + texture.texCoord : "uv";
          };
          this.scenesManager.materialsTextures[materialIndex] = materialTextures;
          if (material.pbrMetallicRoughness) {
            if (material.pbrMetallicRoughness.baseColorTexture && material.pbrMetallicRoughness.baseColorTexture.index !== void 0) {
              const index = material.pbrMetallicRoughness.baseColorTexture.index;
              const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source];
              const texture = this.createTexture(material, image, "baseColorTexture");
              const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler;
              materialTextures.texturesDescriptors.push({
                texture,
                sampler: this.scenesManager.samplers[samplerIndex ?? 0],
                texCoordAttributeName: getUVAttributeName(material.pbrMetallicRoughness.baseColorTexture)
              });
            }
            if (material.pbrMetallicRoughness.metallicRoughnessTexture && material.pbrMetallicRoughness.metallicRoughnessTexture.index !== void 0) {
              const index = material.pbrMetallicRoughness.metallicRoughnessTexture.index;
              const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source];
              const texture = this.createTexture(material, image, "metallicRoughnessTexture");
              const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler;
              materialTextures.texturesDescriptors.push({
                texture,
                sampler: this.scenesManager.samplers[samplerIndex ?? 0],
                texCoordAttributeName: getUVAttributeName(material.pbrMetallicRoughness.metallicRoughnessTexture)
              });
            }
          }
          if (material.normalTexture && material.normalTexture.index !== void 0) {
            const index = material.normalTexture.index;
            const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source];
            const texture = this.createTexture(material, image, "normalTexture");
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler;
            materialTextures.texturesDescriptors.push({
              texture,
              sampler: this.scenesManager.samplers[samplerIndex ?? 0],
              texCoordAttributeName: getUVAttributeName(material.normalTexture)
            });
          }
          if (material.occlusionTexture && material.occlusionTexture.index !== void 0) {
            const index = material.occlusionTexture.index;
            const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source];
            const texture = this.createTexture(material, image, "occlusionTexture");
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler;
            materialTextures.texturesDescriptors.push({
              texture,
              sampler: this.scenesManager.samplers[samplerIndex ?? 0],
              texCoordAttributeName: getUVAttributeName(material.occlusionTexture)
            });
          }
          if (material.emissiveTexture && material.emissiveTexture.index !== void 0) {
            const index = material.emissiveTexture.index;
            const image = this.gltf.imagesBitmaps[this.gltf.textures[index].source];
            const texture = this.createTexture(material, image, "emissiveTexture");
            const samplerIndex = this.gltf.textures.find((t) => t.source === index)?.sampler;
            materialTextures.texturesDescriptors.push({
              texture,
              sampler: this.scenesManager.samplers[samplerIndex ?? 0],
              texCoordAttributeName: getUVAttributeName(material.emissiveTexture)
            });
          }
        }
      }
    }
    /**
     * Create a {@link ChildDescriptor} from a parent {@link ChildDescriptor} and a {@link GLTF.INode | GLTF Node}
     * @param parent - parent {@link ChildDescriptor} to use.
     * @param node - {@link GLTF.INode | GLTF Node} to use.
     */
    createNode(parent, node) {
      if (node.camera !== void 0)
        return;
      const child = {
        name: node.name,
        node: new Object3D(),
        children: []
      };
      parent.children.push(child);
      child.node.parent = parent.node;
      if (node.matrix) {
        child.node.modelMatrix.setFromArray(new Float32Array(node.matrix));
        child.node.matrices.model.shouldUpdate = false;
      } else {
        if (node.translation)
          child.node.position.set(node.translation[0], node.translation[1], node.translation[2]);
        if (node.scale)
          child.node.scale.set(node.scale[0], node.scale[1], node.scale[2]);
        if (node.rotation)
          child.node.quaternion.setFromArray(new Float32Array(node.rotation));
      }
      const mesh = this.gltf.meshes[node.mesh];
      if (node.children) {
        node.children.forEach((childNodeIndex) => {
          const childNode = this.gltf.nodes[childNodeIndex];
          this.createNode(child, childNode);
        });
      }
      if (mesh) {
        mesh.primitives.forEach((primitive, index) => {
          const meshDescriptor = {
            parent: child.node,
            attributes: [],
            textures: [],
            parameters: {
              label: mesh.name ? mesh.name + " " + index : "glTF mesh " + index
            },
            nodes: []
          };
          let instancesDescriptor = __privateGet(this, _primitiveInstances).get(primitive);
          if (!instancesDescriptor) {
            instancesDescriptor = {
              instances: [],
              // instances
              nodes: [],
              // node transform
              meshDescriptor
            };
            __privateGet(this, _primitiveInstances).set(primitive, instancesDescriptor);
          }
          instancesDescriptor.instances.push(node);
          instancesDescriptor.nodes.push(child.node);
        });
      }
    }
    /**
     * Create the {@link ScenesManager#scenes | ScenesManager scenes} based on the {@link gltf} object.
     */
    createScenes() {
      this.scenesManager.node.parent = this.renderer.scene;
      this.gltf.scenes.forEach((childScene) => {
        const sceneDescriptor = {
          name: childScene.name,
          children: [],
          node: new Object3D()
        };
        sceneDescriptor.node.parent = this.scenesManager.node;
        this.scenesManager.scenes.push(sceneDescriptor);
        childScene.nodes.forEach((nodeIndex) => {
          const node = this.gltf.nodes[nodeIndex];
          this.createNode(sceneDescriptor, node);
        });
      });
      this.scenesManager.scenes.forEach((childScene) => {
        childScene.node.shouldUpdateModelMatrix();
        childScene.node.updateMatrixStack();
      });
      for (const [primitive, primitiveInstance] of __privateGet(this, _primitiveInstances)) {
        const { instances, nodes, meshDescriptor } = primitiveInstance;
        const instancesCount = instances.length;
        meshDescriptor.nodes = nodes;
        this.scenesManager.meshesDescriptors.push(meshDescriptor);
        const geometryBBox = new Box3();
        const defaultAttributes = [];
        let interleavedArray = null;
        let interleavedBufferView = null;
        let maxByteOffset = 0;
        for (const [attribName, accessorIndex] of Object.entries(primitive.attributes)) {
          const accessor = this.gltf.accessors[accessorIndex];
          const constructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
          const bufferView = this.gltf.bufferViews[accessor.bufferView];
          const name = attribName === "TEXCOORD_0" ? "uv" : attribName.replace("_", "").replace("TEXCOORD", "uv").toLowerCase();
          const byteStride = bufferView.byteStride || 0;
          const accessorByteOffset = accessor.byteOffset || 0;
          if (byteStride && accessorByteOffset && accessorByteOffset < byteStride) {
            maxByteOffset = Math.max(accessorByteOffset, maxByteOffset);
          } else {
            maxByteOffset = 0;
          }
          if (name === "position") {
            geometryBBox.min.min(new Vec3(accessor.min[0], accessor.min[1], accessor.min[2]));
            geometryBBox.max.max(new Vec3(accessor.max[0], accessor.max[1], accessor.max[2]));
            interleavedBufferView = bufferView;
          }
          const attributeParams = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type);
          const attribute = {
            name,
            ...attributeParams,
            array: new constructor(
              this.gltf.arrayBuffers[bufferView.buffer],
              accessor.byteOffset + bufferView.byteOffset,
              accessor.count * attributeParams.size
            )
          };
          defaultAttributes.push(attribute);
          meshDescriptor.attributes.push({
            name: attribute.name,
            type: attribute.type
          });
        }
        if (maxByteOffset > 0) {
          const accessorsBufferViews = Object.values(primitive.attributes).map(
            (accessorIndex) => this.gltf.accessors[accessorIndex].bufferView
          );
          if (!accessorsBufferViews.every((val) => val === accessorsBufferViews[0])) {
            let totalStride = 0;
            const mainBufferStrides = {};
            const arrayLength = Object.values(primitive.attributes).reduce(
              (acc, accessorIndex) => {
                const accessor = this.gltf.accessors[accessorIndex];
                const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
                if (!mainBufferStrides[accessor.bufferView]) {
                  mainBufferStrides[accessor.bufferView] = 0;
                }
                mainBufferStrides[accessor.bufferView] = Math.max(
                  mainBufferStrides[accessor.bufferView],
                  accessor.byteOffset + attrSize * Float32Array.BYTES_PER_ELEMENT
                );
                totalStride += attrSize * Float32Array.BYTES_PER_ELEMENT;
                return acc + accessor.count * attrSize;
              },
              0
            );
            interleavedArray = new Float32Array(Math.ceil(arrayLength / 4) * 4);
            Object.values(primitive.attributes).forEach((accessorIndex) => {
              const accessor = this.gltf.accessors[accessorIndex];
              const bufferView = this.gltf.bufferViews[accessor.bufferView];
              const attrSize = _GLTFScenesManager.getVertexAttributeParamsFromType(accessor.type).size;
              for (let i = 0; i < accessor.count; i++) {
                const startOffset = accessor.byteOffset / Float32Array.BYTES_PER_ELEMENT + i * totalStride / Float32Array.BYTES_PER_ELEMENT;
                interleavedArray.subarray(startOffset, startOffset + attrSize).set(
                  new Float32Array(
                    this.gltf.arrayBuffers[bufferView.buffer],
                    bufferView.byteOffset + accessor.byteOffset + i * mainBufferStrides[accessor.bufferView],
                    attrSize
                  )
                );
              }
            });
          } else {
            interleavedArray = new Float32Array(
              this.gltf.arrayBuffers[interleavedBufferView.buffer],
              interleavedBufferView.byteOffset,
              Math.ceil(interleavedBufferView.byteLength / 4) * 4 / Float32Array.BYTES_PER_ELEMENT
            );
          }
        } else {
          const attribOrder = ["position", "uv", "normal"];
          defaultAttributes.sort((a, b) => {
            let aIndex = attribOrder.findIndex((attrName) => attrName === a.name);
            aIndex = aIndex === -1 ? Infinity : aIndex;
            let bIndex = attribOrder.findIndex((attrName) => attrName === b.name);
            bIndex = bIndex === -1 ? Infinity : bIndex;
            return aIndex - bIndex;
          });
        }
        const geometryAttributes = {
          instancesCount,
          topology: _GLTFScenesManager.gpuPrimitiveTopologyForMode(primitive.mode),
          vertexBuffers: [
            {
              name: "attributes",
              stepMode: "vertex",
              // explicitly set the stepMode even if not mandatory
              attributes: defaultAttributes,
              ...interleavedArray && { array: interleavedArray }
              // interleaved array!
            }
          ]
        };
        const isIndexedGeometry = "indices" in primitive;
        const GeometryConstructor = isIndexedGeometry ? IndexedGeometry : Geometry;
        meshDescriptor.parameters.geometry = new GeometryConstructor(geometryAttributes);
        meshDescriptor.parameters.geometry.boundingBox = geometryBBox;
        if (isIndexedGeometry) {
          const accessor = this.gltf.accessors[primitive.indices];
          const bufferView = this.gltf.bufferViews[accessor.bufferView];
          const constructor = _GLTFScenesManager.getTypedArrayConstructorFromComponentType(accessor.componentType);
          const arrayOffset = accessor.byteOffset + bufferView.byteOffset;
          const arrayBuffer = this.gltf.arrayBuffers[bufferView.buffer];
          const arrayLength = Math.min(
            (arrayBuffer.byteLength - arrayOffset) / constructor.BYTES_PER_ELEMENT,
            Math.ceil(accessor.count / 4) * 4
          );
          const array = constructor.name === "Uint8Array" ? Uint16Array.from(new constructor(arrayBuffer, arrayOffset, arrayLength)) : new constructor(arrayBuffer, arrayOffset, arrayLength);
          meshDescriptor.parameters.geometry.setIndexBuffer({
            bufferFormat: constructor.name === "Uint32Array" ? "uint32" : "uint16",
            array
          });
        }
        const materialTextures = this.scenesManager.materialsTextures[primitive.material];
        meshDescriptor.parameters.samplers = [];
        meshDescriptor.parameters.textures = [];
        materialTextures?.texturesDescriptors.forEach((t) => {
          meshDescriptor.textures.push({
            texture: t.texture.options.name,
            sampler: t.sampler.name,
            texCoordAttributeName: t.texCoordAttributeName
          });
          const samplerExists = meshDescriptor.parameters.samplers.find((s) => s.uuid === t.sampler.uuid);
          if (!samplerExists) {
            meshDescriptor.parameters.samplers.push(t.sampler);
          }
          meshDescriptor.parameters.textures.push(t.texture);
        });
        const material = this.gltf.materials && this.gltf.materials[primitive.material] || {};
        meshDescriptor.parameters.cullMode = material.doubleSided ? "none" : "back";
        if (material.alphaMode === "BLEND" || material.extensions && material.extensions.KHR_materials_transmission) {
          meshDescriptor.parameters.transparent = true;
          meshDescriptor.parameters.targets = [
            {
              blend: {
                color: {
                  srcFactor: "src-alpha",
                  dstFactor: "one-minus-src-alpha"
                },
                alpha: {
                  // This just prevents the canvas from having alpha "holes" in it.
                  srcFactor: "one",
                  dstFactor: "one"
                }
              }
            }
          ];
        }
        const materialUniformStruct = {
          baseColorFactor: {
            type: "vec4f",
            value: material.pbrMetallicRoughness?.baseColorFactor || [1, 1, 1, 1]
          },
          alphaCutoff: {
            type: "f32",
            value: material.alphaCutoff !== void 0 ? material.alphaCutoff : material.alphaMode === "MASK" ? 0.5 : 0
          },
          metallicFactor: {
            type: "f32",
            value: material.pbrMetallicRoughness?.metallicFactor === void 0 ? 1 : material.pbrMetallicRoughness.metallicFactor
          },
          roughnessFactor: {
            type: "f32",
            value: material.pbrMetallicRoughness?.roughnessFactor === void 0 ? 1 : material.pbrMetallicRoughness.roughnessFactor
          },
          normalMapScale: {
            type: "f32",
            value: material.normalTexture?.scale === void 0 ? 1 : material.normalTexture.scale
          },
          occlusionStrength: {
            type: "f32",
            value: material.occlusionTexture?.strength === void 0 ? 1 : material.occlusionTexture.strength
          },
          emissiveFactor: {
            type: "vec3f",
            value: material.emissiveFactor !== void 0 ? material.emissiveFactor : [1, 1, 1]
          }
        };
        if (Object.keys(materialUniformStruct).length) {
          meshDescriptor.parameters.uniforms = {
            material: {
              visibility: ["vertex", "fragment"],
              struct: materialUniformStruct
            }
          };
        }
        if (instancesCount > 1) {
          const worldMatrices = new Float32Array(instancesCount * 16);
          const normalMatrices = new Float32Array(instancesCount * 16);
          for (let i = 0; i < instancesCount; ++i) {
            worldMatrices.set(nodes[i].worldMatrix.elements, i * 16);
            _normalMatrix.copy(nodes[i].worldMatrix).invert().transpose();
            normalMatrices.set(_normalMatrix.elements, i * 16);
          }
          meshDescriptor.parameters.storages = {
            instances: {
              visibility: ["vertex", "fragment"],
              struct: {
                modelMatrix: {
                  type: "array<mat4x4f>",
                  value: worldMatrices
                },
                normalMatrix: {
                  type: "array<mat4x4f>",
                  value: normalMatrices
                }
              }
            }
          };
        }
        for (let i = 0; i < nodes.length; i++) {
          const tempBbox = geometryBBox.clone();
          const transformedBbox = tempBbox.applyMat4(meshDescriptor.nodes[i].worldMatrix);
          this.scenesManager.boundingBox.min.min(transformedBbox.min);
          this.scenesManager.boundingBox.max.max(transformedBbox.max);
        }
      }
    }
    /**
     * Add all the needed {@link Mesh} based on the {@link ScenesManager#meshesDescriptors | ScenesManager meshesDescriptors} array.
     * @param patchMeshesParameters - allow to optionally patch the {@link Mesh} parameters before creating it (can be used to add custom shaders, uniforms or storages, change rendering options, etc.)
     * @returns - Array of created {@link Mesh}.
     */
    addMeshes(patchMeshesParameters = (meshDescriptor) => {
    }) {
      return this.scenesManager.meshesDescriptors.map((meshDescriptor) => {
        if (meshDescriptor.parameters.geometry) {
          patchMeshesParameters(meshDescriptor);
          const mesh = new Mesh(this.renderer, {
            ...meshDescriptor.parameters
          });
          if (meshDescriptor.nodes.length > 1) {
            const _updateWorldMatrix = mesh.updateWorldMatrix.bind(mesh);
            mesh.updateWorldMatrix = () => {
              _updateWorldMatrix();
              meshDescriptor.nodes.forEach((node, i) => {
                mesh.storages.instances.modelMatrix.value.set(node.worldMatrix.elements, i * 16);
                _normalMatrix.copy(node.worldMatrix).invert().transpose();
                mesh.storages.instances.normalMatrix.value.set(_normalMatrix.elements, i * 16);
              });
              mesh.storages.instances.modelMatrix.shouldUpdate = true;
              mesh.storages.instances.normalMatrix.shouldUpdate = true;
            };
            this.renderer.onAfterRenderScene.add(
              () => {
                mesh.shouldUpdateModelMatrix();
              },
              { once: true }
            );
          }
          mesh.parent = meshDescriptor.parent;
          this.scenesManager.meshes.push(mesh);
          return mesh;
        }
      });
    }
    /**
     * Destroy the current {@link ScenesManager} by removing all created {@link ScenesManager#meshes | meshes} and destroying all the {@link Object3D} nodes.
     */
    destroy() {
      this.scenesManager.meshes.forEach((mesh) => mesh.remove());
      this.scenesManager.meshes = [];
      const nodes = this.scenesManager.getScenesNodes();
      nodes.forEach((node) => {
        node.destroy();
      });
      this.scenesManager.node.destroy();
    }
  };
  _primitiveInstances = new WeakMap();
  let GLTFScenesManager = _GLTFScenesManager;

  const buildShaders = (meshDescriptor, shaderParameters = null) => {
    const baseColorTexture = meshDescriptor.textures.find((t) => t.texture === "baseColorTexture");
    const normalTexture = meshDescriptor.textures.find((t) => t.texture === "normalTexture");
    const emissiveTexture = meshDescriptor.textures.find((t) => t.texture === "emissiveTexture");
    const occlusionTexture = meshDescriptor.textures.find((t) => t.texture === "occlusionTexture");
    const metallicRoughnessTexture = meshDescriptor.textures.find((t) => t.texture === "metallicRoughnessTexture");
    const facultativeAttributes = meshDescriptor.attributes.filter((attribute) => attribute.name !== "position");
    const structAttributes = facultativeAttributes.map((attribute, index) => {
      return `@location(${index}) ${attribute.name}: ${attribute.type},`;
    }).join("\n	");
    let outputPositions = (
      /* wgsl */
      `
    let worldPos = matrices.model * vec4(attributes.position, 1.0);
    vsOutput.position = camera.projection * camera.view * worldPos;
    vsOutput.worldPosition = worldPos.xyz / worldPos.w;
    vsOutput.viewDirection = camera.position - vsOutput.worldPosition.xyz;
  `
    );
    let outputNormal = facultativeAttributes.find((attr) => attr.name === "normal") ? "vsOutput.normal = getWorldNormal(attributes.normal);" : "";
    if (meshDescriptor.parameters.storages && meshDescriptor.parameters.storages.instances) {
      outputPositions = /* wgsl */
      `
      let worldPos: vec4f = instances[attributes.instanceIndex].modelMatrix * vec4f(attributes.position, 1.0);
      vsOutput.position = camera.projection * camera.view * worldPos;
      vsOutput.worldPosition = worldPos.xyz;
      vsOutput.viewDirection = camera.position - vsOutput.worldPosition;
      `;
      outputNormal = `vsOutput.normal = normalize((instances[attributes.instanceIndex].normalMatrix * vec4(attributes.normal, 0.0)).xyz);`;
    }
    const outputAttributes = facultativeAttributes.filter((attr) => attr.name !== "normal").map((attribute) => {
      return `vsOutput.${attribute.name} = attributes.${attribute.name};`;
    }).join("\n	");
    let vertexOutputContent = `
      @builtin(position) position: vec4f,
      @location(${facultativeAttributes.length}) viewDirection: vec3f,
      @location(${facultativeAttributes.length + 1}) worldPosition: vec3f,
      ${structAttributes}
  `;
    let outputNormalMap = "";
    const tangentAttribute = facultativeAttributes.find((attr) => attr.name === "tangent");
    const useNormalMap = !!(normalTexture && tangentAttribute);
    if (useNormalMap) {
      vertexOutputContent += `
      @location(${facultativeAttributes.length + 2}) bitangent: vec3f,
      `;
      outputNormalMap = `
        vsOutput.tangent = normalize(matrices.model * attributes.tangent);
        vsOutput.bitangent = cross(vsOutput.normal, vsOutput.tangent.xyz) * attributes.tangent.w;
      `;
    }
    const vertexOutput = (
      /*wgsl */
      `
    struct VSOutput {
      ${vertexOutputContent}
    };`
    );
    const fragmentInput = (
      /*wgsl */
      `
    struct VSOutput {
      @builtin(front_facing) frontFacing: bool,
      ${vertexOutputContent}
    };`
    );
    const vs = (
      /* wgsl */
      `
    ${vertexOutput}
    
    @vertex fn main(
      attributes: Attributes,
    ) -> VSOutput {
      var vsOutput: VSOutput;
    
      ${outputPositions}
      ${outputNormal}
      ${outputAttributes}
      
      ${outputNormalMap}

      return vsOutput;
    }
  `
    );
    const initColor = (
      /* wgsl */
      "var color: vec4f = vec4();"
    );
    const returnColor = (
      /* wgsl */
      `
      return vec4(
        linearTosRGB(
          toneMapKhronosPbrNeutral(
            color.rgb
          )
        ),
        color.a
      );
  `
    );
    const vertexColor = meshDescriptor.attributes.find((attr) => attr.name === "color0");
    let baseColor = (
      /* wgsl */
      !!vertexColor ? vertexColor.type === "vec3f" ? "var baseColor: vec4f = vec4(fsInput.color0, 1.0) * material.baseColorFactor;" : "var baseColor: vec4f = fsInput.color0 * material.baseColorFactor;" : "var baseColor: vec4f = material.baseColorFactor;"
    );
    if (baseColorTexture) {
      baseColor = /* wgsl */
      `
      var baseColor: vec4f = textureSample(baseColorTexture, ${baseColorTexture.sampler}, fsInput.${baseColorTexture.texCoordAttributeName}) * material.baseColorFactor;
      
      if (baseColor.a < material.alphaCutoff) {
        discard;
      }
    `;
    }
    baseColor += /* wgsl */
    `
      color = baseColor;
  `;
    let normalMap = meshDescriptor.attributes.find((attribute) => attribute.name === "normal") ? (
      /* wgsl */
      `
      let faceDirection = select(-1.0, 1.0, fsInput.frontFacing);
      let geometryNormal: vec3f = normalize(faceDirection * fsInput.normal);
    `
    ) : (
      /* wgsl */
      `let geometryNormal: vec3f = normalize(vec3(0.0, 0.0, 1.0));`
    );
    if (useNormalMap) {
      normalMap += /* wgsl */
      `
      let tbn = mat3x3<f32>(normalize(fsInput.tangent.xyz), normalize(fsInput.bitangent), geometryNormal);
      let normalMap = textureSample(normalTexture, ${normalTexture.sampler}, fsInput.${normalTexture.texCoordAttributeName}).rgb;
      let normal = normalize(tbn * (2.0 * normalMap - vec3(material.normalMapScale, material.normalMapScale, 1.0)));
    `;
    } else {
      normalMap += /* wgsl */
      `
      let normal = geometryNormal;
    `;
    }
    normalMap += /* wgsl */
    `
      let worldPosition: vec3f = fsInput.worldPosition;
      let viewDirection: vec3f = fsInput.viewDirection;
      let N: vec3f = normal;
      let V: vec3f = normalize(viewDirection);
      let NdotV: f32 = clamp(dot(N, V), 0.0, 1.0);
  `;
    let metallicRoughness = (
      /*  wgsl */
      `
      var metallic = material.metallicFactor;
      var roughness = material.roughnessFactor;
  `
    );
    if (metallicRoughnessTexture) {
      metallicRoughness += /* wgsl */
      `
      let metallicRoughness = textureSample(metallicRoughnessTexture, ${metallicRoughnessTexture.sampler}, fsInput.${metallicRoughnessTexture.texCoordAttributeName});
      
      metallic = clamp(metallic * metallicRoughness.b, 0.0, 1.0);
      roughness = clamp(roughness * metallicRoughness.g, 0.0, 1.0);
    `;
    }
    const f0 = (
      /* wgsl */
      `
      let f0: vec3f = mix(vec3(0.04), color.rgb, vec3(metallic));
  `
    );
    let emissiveOcclusion = (
      /* wgsl */
      `
      var emissive: vec3f = vec3(0.0);
      var occlusion: f32 = 1.0;
  `
    );
    if (emissiveTexture) {
      emissiveOcclusion += /* wgsl */
      `
      emissive = textureSample(emissiveTexture, ${emissiveTexture.sampler}, fsInput.${emissiveTexture.texCoordAttributeName}).rgb;
      
      emissive *= material.emissiveFactor;
      `;
      if (occlusionTexture) {
        emissiveOcclusion += /* wgsl */
        `
      occlusion = textureSample(occlusionTexture, ${occlusionTexture.sampler}, fsInput.${occlusionTexture.texCoordAttributeName}).r;
      `;
      }
    }
    emissiveOcclusion += /* wgsl */
    `
      occlusion = 1.0 + material.occlusionStrength * (occlusion - 1.0);
  `;
    const initLightShading = (
      /* wgsl */
      `
      var lightContribution: LightContribution;
      
      lightContribution.ambient = vec3(1.0);
      lightContribution.diffuse = vec3(0.0);
      lightContribution.specular = vec3(0.0);
  `
    );
    const defaultAdditionalHead = "";
    const defaultPreliminaryColor = "";
    const defaultAdditionalColor = "";
    const defaultAmbientContribution = "";
    const defaultLightContribution = "";
    shaderParameters = shaderParameters ?? {};
    let chunks = shaderParameters.chunks;
    if (!chunks) {
      chunks = {
        additionalFragmentHead: defaultAdditionalHead,
        ambientContribution: defaultAmbientContribution,
        preliminaryColorContribution: defaultPreliminaryColor,
        lightContribution: defaultLightContribution,
        additionalColorContribution: defaultAdditionalColor
      };
    } else {
      if (!chunks.additionalFragmentHead)
        chunks.additionalFragmentHead = defaultAdditionalHead;
      if (!chunks.preliminaryColorContribution)
        chunks.preliminaryColorContribution = defaultPreliminaryColor;
      if (!chunks.ambientContribution)
        chunks.ambientContribution = defaultAmbientContribution;
      if (!chunks.lightContribution)
        chunks.lightContribution = defaultLightContribution;
      if (!chunks.additionalColorContribution)
        chunks.additionalColorContribution = defaultAdditionalColor;
    }
    const applyLightShading = (
      /* wgsl */
      `      
      lightContribution.ambient *= color.rgb * occlusion;
      lightContribution.diffuse *= color.rgb * occlusion;
      lightContribution.specular *= occlusion;
      
      color = vec4(
        lightContribution.ambient + lightContribution.diffuse + lightContribution.specular + emissive,
        color.a
      );
  `
    );
    const fs = (
      /* wgsl */
      `
    // Light
    struct LightContribution {
      ambient: vec3f,
      diffuse: vec3f,
      specular: vec3f,
    };
  
    // PBR
    const PI = ${Math.PI};
    
    // tone maping
    fn toneMapKhronosPbrNeutral( color: vec3f ) -> vec3f {
      var toneMapColor = color; 
      const startCompression: f32 = 0.8 - 0.04;
      const desaturation: f32 = 0.15;
      var x: f32 = min(toneMapColor.r, min(toneMapColor.g, toneMapColor.b));
      var offset: f32 = select(0.04, x - 6.25 * x * x, x < 0.08);
      toneMapColor = toneMapColor - offset;
      var peak: f32 = max(toneMapColor.r, max(toneMapColor.g, toneMapColor.b));
      if (peak < startCompression) {
        return toneMapColor;
      }
      const d: f32 = 1. - startCompression;
      let newPeak: f32 = 1. - d * d / (peak + d - startCompression);
      toneMapColor *= newPeak / peak;
      let g: f32 = 1. - 1. / (desaturation * (peak - newPeak) + 1.);
      return mix(toneMapColor, newPeak * vec3(1, 1, 1), g);
    }
    
  
    // linear <-> sRGB conversions
    fn linearTosRGB(linear: vec3f) -> vec3f {
      if (all(linear <= vec3(0.0031308))) {
        return linear * 12.92;
      }
      return (pow(abs(linear), vec3(1.0/2.4)) * 1.055) - vec3(0.055);
    }
  
    fn sRGBToLinear(srgb: vec3f) -> vec3f {
      if (all(srgb <= vec3(0.04045))) {
        return srgb / vec3(12.92);
      }
      return pow((srgb + vec3(0.055)) / vec3(1.055), vec3(2.4));
    }
    
    ${chunks.additionalFragmentHead}
  
    ${fragmentInput}
  
    @fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {       
      ${initColor}
      ${baseColor}

      ${normalMap}
      ${metallicRoughness}  
      ${initLightShading}  
      
      // user defined preliminary color contribution
      ${chunks.preliminaryColorContribution}
        
      ${f0}
      ${emissiveOcclusion}
      
      // user defined lightning
      ${chunks.ambientContribution}
      ${chunks.lightContribution}
      
      ${applyLightShading}
      
      // user defined additional color contribution
      ${chunks.additionalColorContribution}
      
      ${returnColor}
    }
  `
    );
    return {
      vertex: {
        code: vs,
        entryPoint: "main"
      },
      fragment: {
        code: fs,
        entryPoint: "main"
      }
    };
  };
  const buildPBRShaders = (meshDescriptor, shaderParameters = null) => {
    let chunks = shaderParameters?.chunks;
    const pbrAdditionalFragmentHead = (
      /* wgsl */
      `
    fn FresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
      return F0 + (vec3(1.0) - F0) * pow(1.0 - cosTheta, 5.0);
    }
    
    fn DistributionGGX(NdotH: f32, roughness: f32) -> f32 {
      let a      = roughness*roughness;
      let a2     = a*a;
      let NdotH2 = NdotH*NdotH;
    
      let num    = a2;
      let denom  = (NdotH2 * (a2 - 1.0) + 1.0);
    
      return num / (PI * denom * denom);
    }
    
    fn GeometrySchlickGGX(NdotV : f32, roughness : f32) -> f32 {
      let r = (roughness + 1.0);
      let k = (r*r) / 8.0;
    
      let num   = NdotV;
      let denom = NdotV * (1.0 - k) + k;
    
      return num / denom;
    }
    
    fn GeometrySmith(NdotL: f32, NdotV: f32, roughness : f32) -> f32 {
      let ggx2  = GeometrySchlickGGX(NdotV, roughness);
      let ggx1  = GeometrySchlickGGX(NdotL, roughness);
    
      return ggx1 * ggx2;
    }
  `
    );
    if (!chunks) {
      chunks = {
        additionalFragmentHead: pbrAdditionalFragmentHead
      };
    } else {
      if (!chunks.additionalFragmentHead) {
        chunks.additionalFragmentHead = pbrAdditionalFragmentHead;
      } else {
        chunks.additionalFragmentHead += pbrAdditionalFragmentHead;
      }
    }
    return buildShaders(meshDescriptor, shaderParameters);
  };
  const buildIBLShaders = (meshDescriptor, shaderParameters = null) => {
    shaderParameters = shaderParameters || {};
    const iblParameters = shaderParameters?.iblParameters;
    meshDescriptor.parameters.uniforms = {
      ...meshDescriptor.parameters.uniforms,
      ...{
        ibl: {
          struct: {
            diffuseStrength: {
              type: "f32",
              value: iblParameters?.diffuseStrength ?? 0.5
            },
            specularStrength: {
              type: "f32",
              value: iblParameters?.specularStrength ?? 0.5
            }
          }
        }
      }
    };
    const { lutTexture, envDiffuseTexture, envSpecularTexture } = iblParameters || {};
    const useIBLContribution = envDiffuseTexture && envDiffuseTexture.texture && envSpecularTexture && envSpecularTexture.texture && lutTexture && lutTexture.texture;
    let iblContributionHead = "";
    let iblLightContribution = "";
    if (useIBLContribution) {
      meshDescriptor.parameters.textures = [
        ...meshDescriptor.parameters.textures,
        lutTexture.texture,
        envDiffuseTexture.texture,
        envSpecularTexture.texture
      ];
      lutTexture.samplerName = lutTexture.samplerName || "defaultSampler";
      envDiffuseTexture.samplerName = envDiffuseTexture.samplerName || "defaultSampler";
      envSpecularTexture.samplerName = envSpecularTexture.samplerName || "defaultSampler";
      iblContributionHead = /* wgsl */
      `  
    const RECIPROCAL_PI = ${1 / Math.PI};
    const RECIPROCAL_PI2 = ${0.5 / Math.PI};
    
    fn cartesianToPolar(n: vec3f) -> vec2f {
      var uv: vec2f;
      uv.x = atan2(n.z, n.x) * RECIPROCAL_PI2 + 0.5;
      uv.y = asin(n.y) * RECIPROCAL_PI + 0.5;
      return uv;
    }
    
    struct IBLContribution {
      diffuse: vec3f,
      specular: vec3f,
    };
    
    fn getIBLContribution(NdotV: f32, roughness: f32, normal: vec3f, reflection: vec3f, diffuseColor: vec3f, f0: vec3f) -> IBLContribution {
      var iblContribution: IBLContribution;
    
      let brdfSamplePoint: vec2f = clamp(vec2(NdotV, roughness), vec2(0.0), vec2(1.0));
      
      let brdf: vec3f = textureSample(
        ${lutTexture.texture.options.name},
        ${lutTexture.samplerName},
        brdfSamplePoint
      ).rgb;
    
      let Fr: vec3f = max(vec3(1.0 - roughness), f0) - f0;
      let k_S: vec3f = f0 + Fr * pow(1.0 - NdotV, 5.0);
      var FssEss: vec3f = k_S * brdf.x + brdf.y;
      
      // IBL specular
      let lod: f32 = roughness * f32(textureNumLevels(${envSpecularTexture.texture.options.name}) - 1);
      
      let specularLight: vec4f = textureSampleLevel(
        ${envSpecularTexture.texture.options.name},
        ${envSpecularTexture.samplerName},
        ${envSpecularTexture.texture.options.viewDimension === "cube" ? "reflection" : "cartesianToPolar(reflection)"},
        lod
      );
      
      iblContribution.specular = specularLight.rgb * FssEss * ibl.specularStrength;
      
      // IBL diffuse
      let diffuseLight: vec4f = textureSample(
        ${envDiffuseTexture.texture.options.name},
        ${envDiffuseTexture.samplerName},
        ${envDiffuseTexture.texture.options.viewDimension === "cube" ? "normal" : "cartesianToPolar(normal)"}
      );
      
      // product of specularFactor and specularTexture.a
      let specularWeight: f32 = 1.0;
            
      FssEss = specularWeight * k_S * brdf.x + brdf.y;
      
      let Ems: f32 = (1.0 - (brdf.x + brdf.y));
      let F_avg: vec3f = specularWeight * (f0 + (1.0 - f0) / 21.0);
      let FmsEms: vec3f = Ems * FssEss * F_avg / (1.0 - F_avg * Ems);
      let k_D: vec3f = diffuseColor * (1.0 - FssEss + FmsEms);
      
      iblContribution.diffuse = (FmsEms + k_D) * diffuseLight.rgb * ibl.diffuseStrength;
      
      return iblContribution;
    }
    `;
      iblLightContribution = /* wgsl */
      `
      let reflection: vec3f = normalize(reflect(-V, N));
      
      let iblDiffuseColor: vec3f = mix(color.rgb, vec3(0.0), vec3(metallic));
    
      let iblContribution = getIBLContribution(NdotV, roughness, N, reflection, iblDiffuseColor, f0);
      
      lightContribution.diffuse += iblContribution.diffuse;
      lightContribution.specular += iblContribution.specular;
    `;
    }
    let chunks = shaderParameters?.chunks;
    if (!chunks) {
      chunks = {
        additionalFragmentHead: iblContributionHead,
        lightContribution: iblLightContribution
      };
    } else {
      if (!chunks.additionalFragmentHead) {
        chunks.additionalFragmentHead = iblContributionHead;
      } else {
        chunks.additionalFragmentHead += iblContributionHead;
      }
      if (!chunks.lightContribution) {
        chunks.lightContribution = iblLightContribution;
      } else {
        chunks.lightContribution = iblLightContribution + chunks.lightContribution;
      }
      if (!chunks.ambientContribution && useIBLContribution) {
        chunks.ambientContribution = "lightContribution.ambient = vec3(0.0);";
      }
    }
    shaderParameters.chunks = chunks;
    return buildPBRShaders(meshDescriptor, shaderParameters);
  };
  const computeDiffuseFromSpecular = async (renderer, diffuseTexture, specularTexture) => {
    if (specularTexture.options.viewDimension !== "cube") {
      throwWarning(
        "Could not compute the diffuse texture because the specular texture is not a cube map:" + specularTexture.options.viewDimension
      );
      return;
    }
    const computeDiffuseShader = `    
    fn radicalInverse_VdC(inputBits: u32) -> f32 {
        var bits: u32 = inputBits;
        bits = (bits << 16u) | (bits >> 16u);
        bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
        bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
        bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
        bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
        return f32(bits) * 2.3283064365386963e-10; // / 0x100000000
    }
    
    // hammersley2d describes a sequence of points in the 2d unit square [0,1)^2
    // that can be used for quasi Monte Carlo integration
    fn hammersley2d(i: u32, N: u32) -> vec2f {
        return vec2(f32(i) / f32(N), radicalInverse_VdC(i));
    }
    
    // TBN generates a tangent bitangent normal coordinate frame from the normal
    // (the normal must be normalized)
    fn generateTBN(normal: vec3f) -> mat3x3f {
      var bitangent: vec3f = vec3(0.0, 1.0, 0.0);
  
      let NdotUp: f32 = dot(normal, vec3(0.0, 1.0, 0.0));
      let epsilon: f32 = 0.0000001;
      
      if (1.0 - abs(NdotUp) <= epsilon) {
        // Sampling +Y or -Y, so we need a more robust bitangent.
        if (NdotUp > 0.0) {
          bitangent = vec3(0.0, 0.0, 1.0);
        }
        else {
          bitangent = vec3(0.0, 0.0, -1.0);
        }
      }
  
      let tangent: vec3f = normalize(cross(bitangent, normal));
      bitangent = cross(normal, tangent);
  
      return mat3x3f(tangent, bitangent, normal);
    }
    
    // Mipmap Filtered Samples (GPU Gems 3, 20.4)
    // https://developer.nvidia.com/gpugems/gpugems3/part-iii-rendering/chapter-20-gpu-based-importance-sampling
    // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
    fn computeLod(pdf: f32) -> f32 {
      // https://cgg.mff.cuni.cz/~jaroslav/papers/2007-sketch-fis/Final_sap_0073.pdf
      return 0.5 * log2( 6.0 * f32(params.faceSize) * f32(params.faceSize) / (f32(params.sampleCount) * pdf));
    }
    
    fn transformDirection(face: u32, uv: vec2f) -> vec3f {
      // Transform the direction based on the cubemap face
      switch (face) {
        case 0u {
          // +X
          return vec3f( 1.0,  uv.y, -uv.x);
        }
        case 1u {
          // -X
          return vec3f(-1.0,  uv.y,  uv.x);
        }
        case 2u {
          // +Y
          return vec3f( uv.x,  -1.0, uv.y);
        }
        case 3u {
          // -Y
          return vec3f( uv.x, 1.0,  -uv.y);
        }
        case 4u {
          // +Z
          return vec3f( uv.x,  uv.y,  1.0);
        }
        case 5u {
          // -Z
          return vec3f(-uv.x,  uv.y, -1.0);
        }
        default {
          return vec3f(0.0, 0.0, 0.0);
        }
      }
    }
    
    const PI = ${Math.PI};

    @compute @workgroup_size(8, 8, 1) fn main(
      @builtin(global_invocation_id) GlobalInvocationID: vec3u,
    ) {
      let faceSize: u32 = params.faceSize;
      let sampleCount: u32 = params.sampleCount;
      
      let face: u32 = GlobalInvocationID.z;
      let x: u32 = GlobalInvocationID.x;
      let y: u32 = GlobalInvocationID.y;
  
      if (x >= faceSize || y >= faceSize) {
          return;
      }
  
      let texelSize: f32 = 1.0 / f32(faceSize);
      let halfTexel: f32 = texelSize * 0.5;
      
      var uv: vec2f = vec2(
        (f32(x) + halfTexel) * texelSize,
        (f32(y) + halfTexel) * texelSize
      );
      
      uv = uv * 2.0 - 1.0;
  
      let normal: vec3<f32> = transformDirection(face, uv);
      
      var irradiance: vec3f = vec3f(0.0, 0.0, 0.0);
  
      for (var i: u32 = 0; i < sampleCount; i++) {
        // generate a quasi monte carlo point in the unit square [0.1)^2
        let xi: vec2f = hammersley2d(i, sampleCount);
        
        let cosTheta: f32 = sqrt(1.0 - xi.y);
        let sinTheta: f32 = sqrt(1.0 - cosTheta * cosTheta);
        let phi: f32 = 2.0 * PI * xi.x;
        let pdf: f32 = cosTheta / PI; // evaluation for solid angle, therefore drop the sinTheta

        let sampleVec: vec3f = vec3f(
            sinTheta * cos(phi),
            sinTheta * sin(phi),
            cosTheta
        );
        
        let TBN: mat3x3f = generateTBN(normalize(normal));
        
        var direction: vec3f = TBN * sampleVec;
        
        // invert along Y axis
        direction.y *= -1.0;
        
        let lod: f32 = computeLod(pdf);

        // Convert sampleVec to texture coordinates of the specular env map
        irradiance += textureSampleLevel(
          envSpecularTexture,
          specularSampler,
          direction,
          min(lod, f32(params.maxMipLevel))
        ).rgb;
      }
  
      irradiance /= f32(sampleCount);

      textureStore(diffuseEnvMap, vec2(x, y), face, vec4f(irradiance, 1.0));
    }
  `;
    let diffuseStorageTexture = new Texture(renderer, {
      label: "Diffuse storage cubemap",
      name: "diffuseEnvMap",
      format: "rgba32float",
      visibility: ["compute"],
      usage: ["copySrc", "storageBinding"],
      type: "storage",
      fixedSize: {
        width: specularTexture.size.width,
        height: specularTexture.size.height,
        depth: 6
      },
      viewDimension: "2d-array"
    });
    const sampler = new Sampler(renderer, {
      label: "Compute diffuse sampler",
      name: "specularSampler",
      addressModeU: "clamp-to-edge",
      addressModeV: "clamp-to-edge",
      minFilter: "linear",
      magFilter: "linear"
    });
    let computeDiffusePass = new ComputePass(renderer, {
      autoRender: false,
      // we're going to render only on demand
      dispatchSize: [Math.ceil(specularTexture.size.width / 8), Math.ceil(specularTexture.size.height / 8), 6],
      shaders: {
        compute: {
          code: computeDiffuseShader
        }
      },
      uniforms: {
        params: {
          struct: {
            faceSize: {
              type: "u32",
              value: specularTexture.size.width
            },
            maxMipLevel: {
              type: "u32",
              value: specularTexture.texture.mipLevelCount
            },
            sampleCount: {
              type: "u32",
              value: 2048
            }
          }
        }
      },
      samplers: [sampler],
      textures: [specularTexture, diffuseStorageTexture]
    });
    await computeDiffusePass.material.compileMaterial();
    renderer.onBeforeRenderScene.add(
      (commandEncoder) => {
        renderer.renderSingleComputePass(commandEncoder, computeDiffusePass);
        commandEncoder.copyTextureToTexture(
          {
            texture: diffuseStorageTexture.texture
          },
          {
            texture: diffuseTexture.texture
          },
          [diffuseTexture.texture.width, diffuseTexture.texture.height, diffuseTexture.texture.depthOrArrayLayers]
        );
      },
      { once: true }
    );
    renderer.onAfterCommandEncoderSubmission.add(
      () => {
        computeDiffusePass.destroy();
        diffuseStorageTexture.destroy();
        diffuseStorageTexture = null;
        computeDiffusePass = null;
      },
      { once: true }
    );
  };

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
  var _decodeRGBE, decodeRGBE_fn, _parseHeader, parseHeader_fn, _parseSize, parseSize_fn, _readLine, readLine_fn, _parseData, parseData_fn, _parseNewRLE, parseNewRLE_fn, _swap, swap_fn, _flipX, flipX_fn, _flipY, flipY_fn;
  class HDRLoader {
    constructor() {
      /**
       * @ignore
       */
      __privateAdd(this, _decodeRGBE);
      /**
       * @ignore
       */
      __privateAdd(this, _parseHeader);
      /**
       * @ignore
       */
      __privateAdd(this, _parseSize);
      /**
       * @ignore
       */
      __privateAdd(this, _readLine);
      /**
       * @ignore
       */
      __privateAdd(this, _parseData);
      /**
       * @ignore
       */
      __privateAdd(this, _parseNewRLE);
      /**
       * @ignore
       */
      __privateAdd(this, _swap);
      /**
       * @ignore
       */
      __privateAdd(this, _flipX);
      /**
       * @ignore
       */
      __privateAdd(this, _flipY);
    }
    /**
     * Load and decode RGBE-encoded data to a flat list of floating point pixel data (RGBA).
     * @param url -  The url of the .hdr file to load
     * @returns - The {@link HDRImageData}
     */
    async loadFromUrl(url) {
      const buffer = await (await fetch(url)).arrayBuffer();
      return __privateMethod(this, _decodeRGBE, decodeRGBE_fn).call(this, new DataView(buffer));
    }
    /**
     * Convert an equirectangular {@link HDRImageData} to 6 {@link HDRImageData} cube map faces. Works but can display artifacts at the poles.
     * @param parsedHdr - equirectangular {@link HDRImageData} to use.
     * @returns - 6 {@link HDRImageData} cube map faces
     */
    equirectangularToCubeMap(parsedHdr) {
      const faceSize = Math.max(parsedHdr.width / 4, parsedHdr.height / 2);
      const faces = {
        posX: new Float32Array(faceSize * faceSize * 4),
        negX: new Float32Array(faceSize * faceSize * 4),
        posY: new Float32Array(faceSize * faceSize * 4),
        negY: new Float32Array(faceSize * faceSize * 4),
        posZ: new Float32Array(faceSize * faceSize * 4),
        negZ: new Float32Array(faceSize * faceSize * 4)
      };
      function getPixel(u, v) {
        const x = Math.floor(u * parsedHdr.width);
        const y = Math.floor(v * parsedHdr.height);
        const index = (y * parsedHdr.width + x) * 4;
        return [parsedHdr.data[index], parsedHdr.data[index + 1], parsedHdr.data[index + 2], parsedHdr.data[index + 3]];
      }
      function setPixel(face, x, y, pixel) {
        const index = (y * faceSize + x) * 4;
        faces[face][index] = pixel[0];
        faces[face][index + 1] = pixel[1];
        faces[face][index + 2] = pixel[2];
        faces[face][index + 3] = pixel[3];
      }
      function mapDirection(face, x, y) {
        const a = 2 * (x + 0.5) / faceSize - 1;
        const b = 2 * (y + 0.5) / faceSize - 1;
        switch (face) {
          case "posX":
            return [a, -1, -b];
          case "negX":
            return [-a, 1, -b];
          case "posY":
            return [-b, -a, 1];
          case "negY":
            return [b, -a, -1];
          case "posZ":
            return [-1, -a, -b];
          case "negZ":
            return [1, a, -b];
        }
      }
      function directionToUV(direction) {
        const [x, y, z] = direction;
        const r = Math.sqrt(x * x + y * y);
        const theta = Math.atan2(y, x);
        const phi = Math.atan2(z, r);
        const u = (theta + Math.PI) / (2 * Math.PI);
        const v = (phi + Math.PI / 2) / Math.PI;
        return [u, v];
      }
      for (const face in faces) {
        for (let y = 0; y < faceSize; y++) {
          for (let x = 0; x < faceSize; x++) {
            const direction = mapDirection(face, x, y);
            const [u, v] = directionToUV(direction);
            const pixel = getPixel(u, v);
            setPixel(face, x, y, pixel);
          }
        }
      }
      const facesData = [faces.posX, faces.negX, faces.posY, faces.negY, faces.posZ, faces.negZ];
      return facesData.map((faceData) => {
        return {
          data: faceData,
          width: faceSize,
          height: faceSize,
          exposure: parsedHdr.exposure,
          gamma: parsedHdr.gamma
        };
      });
    }
  }
  _decodeRGBE = new WeakSet();
  decodeRGBE_fn = function(data) {
    const stream = {
      data,
      offset: 0
    };
    const header = __privateMethod(this, _parseHeader, parseHeader_fn).call(this, stream);
    return {
      width: header.width,
      height: header.height,
      exposure: header.exposure,
      gamma: header.gamma,
      data: __privateMethod(this, _parseData, parseData_fn).call(this, stream, header)
    };
  };
  _parseHeader = new WeakSet();
  parseHeader_fn = function(stream) {
    let line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
    const header = {
      colorCorr: [1, 1, 1],
      exposure: 1,
      gamma: 1,
      width: 0,
      height: 0,
      flipX: false,
      flipY: false
    };
    if (line !== "#?RADIANCE" && line !== "#?RGBE")
      throw new Error("Incorrect file format!");
    while (line !== "") {
      line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
      const parts2 = line.split("=");
      switch (parts2[0]) {
        case "GAMMA":
          header.gamma = parseFloat(parts2[1]);
          break;
        case "FORMAT":
          if (parts2[1] !== "32-bit_rle_rgbe" && parts2[1] !== "32-bit_rle_xyze")
            throw new Error("Incorrect encoding format!");
          break;
        case "EXPOSURE":
          header.exposure = parseFloat(parts2[1]);
          break;
        case "COLORCORR":
          header.colorCorr = parts2[1].replace(/^\s+|\s+$/g, "").split(" ").map((m) => parseFloat(m));
          break;
      }
    }
    line = __privateMethod(this, _readLine, readLine_fn).call(this, stream);
    const parts = line.split(" ");
    __privateMethod(this, _parseSize, parseSize_fn).call(this, parts[0], parseInt(parts[1]), header);
    __privateMethod(this, _parseSize, parseSize_fn).call(this, parts[2], parseInt(parts[3]), header);
    return header;
  };
  _parseSize = new WeakSet();
  parseSize_fn = function(label, value, header) {
    switch (label) {
      case "+X":
        header.width = value;
        break;
      case "-X":
        header.width = value;
        header.flipX = true;
        console.warn("Flipping horizontal orientation not currently supported");
        break;
      case "-Y":
        header.height = value;
        header.flipY = true;
        break;
      case "+Y":
        header.height = value;
        break;
    }
  };
  _readLine = new WeakSet();
  readLine_fn = function(stream) {
    let ch, str = "";
    while ((ch = stream.data.getUint8(stream.offset++)) !== 10)
      str += String.fromCharCode(ch);
    return str;
  };
  _parseData = new WeakSet();
  parseData_fn = function(stream, header) {
    const hash = stream.data.getUint16(stream.offset);
    let data;
    if (hash === 514) {
      data = __privateMethod(this, _parseNewRLE, parseNewRLE_fn).call(this, stream, header);
      if (header.flipX)
        __privateMethod(this, _flipX, flipX_fn).call(this, data, header);
      if (header.flipY)
        __privateMethod(this, _flipY, flipY_fn).call(this, data, header);
    } else {
      throw new Error("Obsolete HDR file version!");
    }
    return data;
  };
  _parseNewRLE = new WeakSet();
  parseNewRLE_fn = function(stream, header) {
    const { width, height, colorCorr } = header;
    const tgt = new Float32Array(width * height * 4);
    let i = 0;
    let { offset, data } = stream;
    for (let y = 0; y < height; ++y) {
      if (data.getUint16(offset) !== 514)
        throw new Error("Incorrect scanline start hash");
      if (data.getUint16(offset + 2) !== width)
        throw new Error("Scanline doesn't match picture dimension!");
      offset += 4;
      const numComps = width * 4;
      const comps = [];
      let x = 0;
      while (x < numComps) {
        let value = data.getUint8(offset++);
        if (value > 128) {
          const len = value - 128;
          value = data.getUint8(offset++);
          for (let rle = 0; rle < len; ++rle) {
            comps[x++] = value;
          }
        } else {
          for (let n = 0; n < value; ++n) {
            comps[x++] = data.getUint8(offset++);
          }
        }
      }
      for (x = 0; x < width; ++x) {
        const r = comps[x];
        const g = comps[x + width];
        const b = comps[x + width * 2];
        let e = comps[x + width * 3];
        e = e ? Math.pow(2, e - 136) : 0;
        tgt[i++] = r * e * colorCorr[0];
        tgt[i++] = g * e * colorCorr[1];
        tgt[i++] = b * e * colorCorr[2];
        tgt[i++] = e;
      }
    }
    return tgt;
  };
  _swap = new WeakSet();
  swap_fn = function(data, i1, i2) {
    i1 *= 4;
    i2 *= 4;
    for (let i = 0; i < 4; ++i) {
      const tmp = data[i1 + i];
      data[i1 + i] = data[i2 + i];
      data[i2 + i] = tmp;
    }
  };
  _flipX = new WeakSet();
  flipX_fn = function(data, header) {
    const { width, height } = header;
    const hw = width >> 1;
    for (let y = 0; y < height; ++y) {
      const b = y * width;
      for (let x = 0; x < hw; ++x) {
        const i1 = b + x;
        const i2 = b + width - 1 - x;
        __privateMethod(this, _swap, swap_fn).call(this, data, i1, i2);
      }
    }
  };
  _flipY = new WeakSet();
  flipY_fn = function(data, header) {
    const { width, height } = header;
    const hh = height >> 1;
    for (let y = 0; y < hh; ++y) {
      const b1 = y * width;
      const b2 = (height - 1 - y) * width;
      for (let x = 0; x < width; ++x) {
        __privateMethod(this, _swap, swap_fn).call(this, data, b1 + x, b2 + x);
      }
    }
  };

  const logSceneCommands = (renderer) => {
    const { scene } = renderer;
    if (!scene)
      return;
    const renderCommands = [];
    scene.computePassEntries.forEach((computePass) => {
      renderCommands.push({
        command: "Render ComputePass",
        content: computePass.options.label
      });
      computePass.material.bindGroups.forEach((bindGroup) => {
        bindGroup.bufferBindings.forEach((binding) => {
          if (binding.shouldCopyResult) {
            renderCommands.push({
              command: `Copy buffer to buffer`,
              source: `${binding.name} buffer`,
              destination: `${binding.name} result buffer`
            });
          }
        });
      });
    });
    for (const renderPassEntryType in scene.renderPassEntries) {
      let passDrawnCount = 0;
      scene.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
        if (!scene.getRenderPassEntryLength(renderPassEntry))
          return;
        const destination = !renderPassEntry.renderPass.options.useColorAttachments ? void 0 : renderPassEntry.renderPass.options.colorAttachments.length === 0 && renderPassEntry.renderPass.options.useDepth ? `${renderPassEntry.renderTexture.options.label} depth pass` : renderPassEntry.renderPass.options.colorAttachments.length > 1 ? `${renderPassEntry.renderTexture.options.label} multiple targets` : renderPassEntry.renderTexture ? `${renderPassEntry.renderTexture.options.label}` : "Context current texture";
        let descriptor = renderPassEntry.renderPass.options.label;
        const operations = {
          loadOp: renderPassEntry.renderPass.options.useColorAttachments ? renderPassEntryType === "screen" && passDrawnCount > 0 ? "load" : renderPassEntry.renderPass.options.loadOp : void 0,
          depthLoadOp: void 0,
          sampleCount: renderPassEntry.renderPass.options.sampleCount,
          ...renderPassEntry.renderPass.options.qualityRatio !== 1 && {
            qualityRatio: renderPassEntry.renderPass.options.qualityRatio
          }
        };
        if (renderPassEntry.renderPass.options.useDepth) {
          operations.depthLoadOp = renderPassEntry.renderPass.options.depthLoadOp;
        }
        passDrawnCount++;
        if (renderPassEntry.element) {
          if (renderPassEntry.element.type === "ShaderPass" && !(renderPassEntry.element.inputTarget || renderPassEntry.element.outputTarget)) {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.options.label} renderTexture`
            });
            operations.loadOp = "clear";
          }
          descriptor += " " + JSON.stringify(operations);
          renderCommands.push({
            command: `Render ${renderPassEntry.element.type}`,
            source: renderPassEntry.element.options.label,
            destination,
            descriptor
          });
          if (renderPassEntry.element.type === "ShaderPass" && !renderPassEntry.element.outputTarget && renderPassEntry.element.options.copyOutputToRenderTexture) {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.options.label} renderTexture`
            });
          } else if (renderPassEntry.element.type === "PingPongPlane") {
            renderCommands.push({
              command: `Copy texture to texture`,
              source: destination,
              destination: `${renderPassEntry.element.renderTexture.options.label}`
            });
          }
        } else if (renderPassEntry.stack) {
          descriptor += " " + JSON.stringify(operations);
          for (const stackType in renderPassEntry.stack) {
            for (const objectType in renderPassEntry.stack[stackType]) {
              if (renderPassEntry.stack[stackType][objectType].length) {
                renderCommands.push({
                  command: `Render stack (${stackType} ${objectType} objects)`,
                  source: renderPassEntry.stack[stackType][objectType],
                  destination,
                  descriptor
                });
              }
            }
          }
        }
      });
    }
    console.table(renderCommands);
  };

  exports.BindGroup = BindGroup;
  exports.Binding = Binding;
  exports.Box3 = Box3;
  exports.BoxGeometry = BoxGeometry;
  exports.Buffer = Buffer;
  exports.BufferBinding = BufferBinding;
  exports.Camera = Camera;
  exports.ComputeMaterial = ComputeMaterial;
  exports.ComputePass = ComputePass;
  exports.ComputePipelineEntry = ComputePipelineEntry;
  exports.DOMElement = DOMElement;
  exports.DOMFrustum = DOMFrustum;
  exports.DOMMesh = DOMMesh;
  exports.DOMObject3D = DOMObject3D;
  exports.DOMTexture = DOMTexture;
  exports.FullscreenPlane = FullscreenPlane;
  exports.GLTFLoader = GLTFLoader;
  exports.GLTFScenesManager = GLTFScenesManager;
  exports.GPUCameraRenderer = GPUCameraRenderer;
  exports.GPUCurtains = GPUCurtains;
  exports.GPUCurtainsRenderer = GPUCurtainsRenderer;
  exports.GPUDeviceManager = GPUDeviceManager;
  exports.GPURenderer = GPURenderer;
  exports.Geometry = Geometry;
  exports.HDRLoader = HDRLoader;
  exports.IndexedGeometry = IndexedGeometry;
  exports.Mat3 = Mat3;
  exports.Mat4 = Mat4;
  exports.Material = Material;
  exports.Mesh = Mesh;
  exports.Object3D = Object3D;
  exports.OrbitControls = OrbitControls;
  exports.PingPongPlane = PingPongPlane;
  exports.PipelineEntry = PipelineEntry;
  exports.PipelineManager = PipelineManager;
  exports.Plane = Plane;
  exports.PlaneGeometry = PlaneGeometry;
  exports.ProjectedObject3D = ProjectedObject3D;
  exports.Quat = Quat;
  exports.RenderMaterial = RenderMaterial;
  exports.RenderPass = RenderPass;
  exports.RenderPipelineEntry = RenderPipelineEntry;
  exports.RenderTarget = RenderTarget;
  exports.Sampler = Sampler;
  exports.SamplerBinding = SamplerBinding;
  exports.Scene = Scene;
  exports.ShaderPass = ShaderPass;
  exports.SphereGeometry = SphereGeometry;
  exports.Texture = Texture;
  exports.TextureBindGroup = TextureBindGroup;
  exports.TextureBinding = TextureBinding;
  exports.Vec2 = Vec2;
  exports.Vec3 = Vec3;
  exports.WritableBufferBinding = WritableBufferBinding;
  exports.buildIBLShaders = buildIBLShaders;
  exports.buildPBRShaders = buildPBRShaders;
  exports.buildShaders = buildShaders;
  exports.computeDiffuseFromSpecular = computeDiffuseFromSpecular;
  exports.logSceneCommands = logSceneCommands;

}));
