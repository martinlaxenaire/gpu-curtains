var GPUCurtains = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // src/index.js
  var src_exports = {};
  __export(src_exports, {
    BindGroup: () => BindGroup,
    Binding: () => Binding,
    Box3: () => Box3,
    BoxGeometry: () => BoxGeometry,
    BufferBinding: () => BufferBinding,
    Camera: () => Camera,
    ComputeMaterial: () => ComputeMaterial,
    ComputePass: () => ComputePass,
    ComputePipelineEntry: () => ComputePipelineEntry,
    DOMElement: () => DOMElement,
    DOMFrustum: () => DOMFrustum,
    DOMMesh: () => DOMMesh,
    DOMObject3D: () => DOMObject3D,
    FullscreenPlane: () => FullscreenPlane,
    GPUCameraRenderer: () => GPUCameraRenderer,
    GPUCurtains: () => GPUCurtains,
    GPUCurtainsRenderer: () => GPUCurtainsRenderer,
    GPURenderer: () => GPURenderer,
    Geometry: () => Geometry,
    IndexedGeometry: () => IndexedGeometry,
    Mat4: () => Mat4,
    Material: () => Material,
    Mesh: () => Mesh,
    Object3D: () => Object3D,
    PingPongPlane: () => PingPongPlane,
    PipelineEntry: () => PipelineEntry,
    PipelineManager: () => PipelineManager,
    Plane: () => Plane,
    PlaneGeometry: () => PlaneGeometry,
    ProjectedObject3D: () => ProjectedObject3D,
    Quat: () => Quat,
    RenderMaterial: () => RenderMaterial,
    RenderPass: () => RenderPass,
    RenderPipelineEntry: () => RenderPipelineEntry,
    RenderTarget: () => RenderTarget,
    RenderTexture: () => RenderTexture,
    Sampler: () => Sampler,
    SamplerBinding: () => SamplerBinding,
    Scene: () => Scene,
    ShaderPass: () => ShaderPass,
    SphereGeometry: () => SphereGeometry,
    Texture: () => Texture,
    TextureBindGroup: () => TextureBindGroup,
    TextureBinding: () => TextureBinding,
    Vec2: () => Vec2,
    Vec3: () => Vec3,
    WritableBufferBinding: () => WritableBufferBinding
  });

  // src/utils/utils.ts
  var generateUUID = () => {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0, v = c === "x" ? r : r & 3 | 8;
      return v.toString(16).toUpperCase();
    });
  };
  var toCamelCase = (string) => {
    return string.replace(/(?:^\w|[A-Z]|\b\w)/g, (ltr, idx) => idx === 0 ? ltr.toLowerCase() : ltr.toUpperCase()).replace(/\s+/g, "");
  };
  var toKebabCase = (string) => {
    const camelCase = toCamelCase(string);
    return camelCase.charAt(0).toUpperCase() + camelCase.slice(1);
  };
  var warningThrown = 0;
  var throwWarning = (warning) => {
    if (warningThrown > 100) {
      return;
    } else if (warningThrown === 100) {
      console.warn("GPUCurtains: too many warnings thrown, stop logging.");
    } else {
      console.warn(warning);
    }
    warningThrown++;
  };
  var throwError = (error) => {
    throw new Error(error);
  };

  // src/core/renderers/utils.ts
  var formatRendererError = (renderer, rendererType = "GPURenderer", type) => {
    const error = type ? `Unable to create ${type} because the ${rendererType} is not defined: ${renderer}` : `The ${rendererType} is not defined: ${renderer}`;
    throwError(error);
  };
  var isRenderer = (renderer, type) => {
    const isRenderer2 = renderer && (renderer.type === "GPURenderer" || renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isRenderer2) {
      formatRendererError(renderer, "GPURenderer", type);
    }
    return isRenderer2;
  };
  var isCameraRenderer = (renderer, type) => {
    const isCameraRenderer2 = renderer && (renderer.type === "GPUCameraRenderer" || renderer.type === "GPUCurtainsRenderer");
    if (!isCameraRenderer2) {
      formatRendererError(renderer, "GPUCameraRenderer", type);
    }
    return isCameraRenderer2;
  };
  var isCurtainsRenderer = (renderer, type) => {
    const isCurtainsRenderer2 = renderer && renderer.type === "GPUCurtainsRenderer";
    if (!isCurtainsRenderer2) {
      formatRendererError(renderer, "GPUCurtainsRenderer", type);
    }
    return isCurtainsRenderer2;
  };
  var generateMips = (() => {
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
            module,
            entryPoint: "vs"
          },
          fragment: {
            module,
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

  // src/core/bindings/Binding.ts
  var Binding = class {
    /**
     * Binding constructor
     * @param parameters - [parameters]{@link BindingParams} used to create our {@link Binding}
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType = "uniform",
      bindIndex = 0,
      visibility
    }) {
      this.label = label;
      this.name = toCamelCase(name);
      this.bindingType = bindingType;
      this.bindIndex = bindIndex;
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
        bindIndex,
        visibility
      };
    }
  };

  // src/core/bindings/utils.ts
  var getBufferLayout = (bufferType) => {
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
  var getBindingWGSLVarType = (binding) => {
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
  var getTextureBindingWGSLVarType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "storageTexture":
          return `var ${binding.name}: texture_storage_2d<${binding.options.format}, ${binding.options.access}>;`;
        case "externalTexture":
          return `var ${binding.name}: texture_external;`;
        case "texture":
        default:
          return `var ${binding.name}: texture_2d<f32>;`;
      }
    })();
  };
  var getBindGroupLayoutBindingType = (binding) => {
    if (binding.bindingType === "storage" && binding.options.access === "read_write") {
      return "storage";
    } else if (binding.bindingType === "storage") {
      return "read-only-storage";
    } else {
      return "uniform";
    }
  };
  var getBindGroupLayoutTextureBindingType = (binding) => {
    return (() => {
      switch (binding.bindingType) {
        case "externalTexture":
          return { externalTexture: {} };
        case "storageTexture":
          return {
            storageTexture: {
              format: binding.options.format,
              viewDimension: "2d"
              // TODO allow for other dimensions?
            }
          };
        case "texture":
          return {
            texture: {
              viewDimension: "2d"
              // TODO allow for other dimensions?
            }
          };
        default:
          return null;
      }
    })();
  };

  // src/math/Vec2.ts
  var Vec2 = class _Vec2 {
    /**
     * Vec2 constructor
     * @param x=0 - X component of our [vector]{@link Vec2}
     * @param y=x - Y component of our [vector]{@link Vec2}
     */
    constructor(x = 0, y = x) {
      this.type = "Vec2";
      this._x = x;
      this._y = y;
    }
    /**
     * Get/set the X component of the [vector]{@link Vec2}
     * When set, can trigger [onChange]{@link Vec2#onChange} callback
     * @readonly
     */
    get x() {
      return this._x;
    }
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get/set the Y component of the [vector]{@link Vec2}
     * When set, can trigger [onChange]{@link Vec2#onChange} callback
     * @readonly
     */
    get y() {
      return this._y;
    }
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the [vector]{@link Vec2} has changed
     * @param callback - callback to run when at least one component of the [vector]{@link Vec2} has changed
     * @returns - our {@link Vec2}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the [vector]{@link Vec2} from values
     * @param x=0 - new X component to set
     * @param y=x - new Y component to set
     * @returns - this [vector]{@link Vec2} after being set
     */
    set(x = 0, y = x) {
      this.x = x;
      this.y = y;
      return this;
    }
    /**
     * Add a [vector]{@link Vec2} to this [vector]{@link Vec2}
     * @param vector - [vector]{@link Vec2} to add
     * @returns - this [vector]{@link Vec2} after addition
     */
    add(vector = new _Vec2()) {
      this.x += vector.x;
      this.y += vector.y;
      return this;
    }
    /**
     * Add a scalar to all the components of this [vector]{@link Vec2}
     * @param value=0 - number to add
     * @returns - this [vector]{@link Vec2} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      return this;
    }
    /**
     * Subtract a [vector]{@link Vec2} from this [vector]{@link Vec2}
     * @param vector - [vector]{@link Vec2} to subtract
     * @returns - this [vector]{@link Vec2} after subtraction
     */
    sub(vector = new _Vec2()) {
      this.x -= vector.x;
      this.y -= vector.y;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this [vector]{@link Vec2}
     * @param value=0 - number to subtract
     * @returns - this [vector]{@link Vec2} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      return this;
    }
    /**
     * Multiply a [vector]{@link Vec2} with this [vector]{@link Vec2}
     * @param vector - [vector]{@link Vec2} to multiply with
     * @returns - this [vector]{@link Vec2} after multiplication
     */
    multiply(vector = new _Vec2(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      return this;
    }
    /**
     * Multiply all components of this [vector]{@link Vec2} with a scalar
     * @param value=1 - number to multiply with
     * @returns - this [vector]{@link Vec2} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      return this;
    }
    /**
     * Copy a [vector]{@link Vec2} into this [vector]{@link Vec2}
     * @param vector - [vector]{@link Vec2} to copy
     * @returns - this [vector]{@link Vec2} after copy
     */
    copy(vector = new _Vec2()) {
      this.x = vector.x;
      this.y = vector.y;
      return this;
    }
    /**
     * Clone this [vector]{@link Vec2}
     * @returns - cloned [vector]{@link Vec2}
     */
    clone() {
      return new _Vec2(this.x, this.y);
    }
    /**
     * Apply max values to this [vector]{@link Vec2} components
     * @param vector - [vector]{@link Vec2} representing max values
     * @returns - [vector]{@link Vec2} with max values applied
     */
    max(vector = new _Vec2()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      return this;
    }
    /**
     * Apply min values to this [vector]{@link Vec2} components
     * @param vector - [vector]{@link Vec2} representing min values
     * @returns - [vector]{@link Vec2} with min values applied
     */
    min(vector = new _Vec2()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      return this;
    }
    /**
     * Check if 2 [vectors]{@link Vec2} are equal
     * @param vector - [vector]{@link Vec2} to compare
     * @returns - whether the [vectors]{@link Vec2} are equals or not
     */
    equals(vector = new _Vec2()) {
      return this.x === vector.x && this.y === vector.y;
    }
    /**
     * Get the square length of this [vector]{@link Vec2}
     * @returns - square length of this [vector]{@link Vec2}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y;
    }
    /**
     * Get the length of this [vector]{@link Vec2}
     * @returns - length of this [vector]{@link Vec2}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this [vector]{@link Vec2}
     * @returns - normalized [vector]{@link Vec2}
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
     * Calculate the dot product of 2 [vectors]{@link Vec2}
     * @param vector - [vector]{@link Vec2} to use for dot product
     * @returns - dot product of the 2 [vectors]{@link Vec2}
     */
    dot(vector = new _Vec2()) {
      return this.x * vector.x + this.y * vector.y;
    }
    /**
     * Calculate the linear interpolation of this [vector]{@link Vec2} by given [vector]{@link Vec2} and alpha, where alpha is the percent distance along the line
     * @param vector - [vector]{@link Vec2} to interpolate towards
     * @param alpha=1 - interpolation factor in the [0, 1] interval
     * @returns - this [vector]{@link Vec2} after linear interpolation
     */
    lerp(vector = new _Vec2(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      return this;
    }
  };

  // src/math/Quat.ts
  var Quat = class _Quat {
    /**
     * Quat constructor
     * @param elements - initial array to use
     * @param axisOrder='XYZ' - axis order to use
     */
    constructor(elements = new Float32Array([0, 0, 0, 1]), axisOrder = "XYZ") {
      this.type = "Quat";
      this.elements = elements;
      this.axisOrder = axisOrder;
    }
    /**
     * Sets the [quaternion]{@link Quat} values from an array
     * @param array - an array of at least 4 elements
     * @returns - this [quaternion]{@link Quat} after being set
     */
    setFromArray(array = new Float32Array([0, 0, 0, 1])) {
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      return this;
    }
    /**
     * Sets the [quaternion]{@link Quat} axis order
     * @param axisOrder - axis order to use
     * @returns - this [quaternion]{@link Quat} after axis order has been set
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
     * Copy a [quaternion]{@link Quat} into this [quaternion]{@link Quat}
     * @param quaternion - [quaternion]{@link Quat} to copy
     * @returns - this [quaternion]{@link Quat} after copy
     */
    copy(quaternion = new _Quat()) {
      this.elements = quaternion.elements;
      this.axisOrder = quaternion.axisOrder;
      return this;
    }
    /**
     * Clone a [quaternion]{@link Quat}
     * @returns - cloned [quaternion]{@link Quat}
     */
    clone() {
      return new _Quat().copy(this);
    }
    /**
     * Check if 2 [quaternions]{@link Quat} are equal
     * @param quaternion - [quaternion]{@link Quat} to check against
     * @returns - whether the [quaternions]{@link Quat} are equal or not
     */
    equals(quaternion = new _Quat()) {
      return this.elements[0] === quaternion.elements[0] && this.elements[1] === quaternion.elements[1] && this.elements[2] === quaternion.elements[2] && this.elements[3] === quaternion.elements[3] && this.axisOrder === quaternion.axisOrder;
    }
    /**
     * Sets a rotation [quaternion]{@link Quat} using Euler angles [vector]{@link Vec3} and its axis order
     * @param vector - rotation [vector]{@link Vec3} to set our [quaternion]{@link Quat} from
     * @returns - [quaternion]{@link Quat} after having applied the rotation
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
     * Set a [quaternion]{@link Quat} from a rotation axis [vector]{@link Vec3} and an angle
     * @param axis - normalized [vector]{@link Vec3} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @returns - [quaternion]{@link Quat} after having applied the rotation
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
     * Set a [quaternion]{@link Quat} from a rotation [matrix]{@link Mat4}
     * @param matrix - rotation [matrix]{@link Mat4} to use
     * @returns - [quaternion]{@link Quat} after having applied the rotation
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
  };

  // src/math/Mat4.ts
  var Mat4 = class _Mat4 {
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
     * @returns - this [matrix]{@link Mat4} after being set
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
     * Sets the [matrix]{@link Mat4} to an identity matrix
     * @returns - this [matrix]{@link Mat4} after being set
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
     * Sets the [matrix]{@link Mat4} values from an array
     * @param array - array to use
     * @returns - this [matrix]{@link Mat4} after being set
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
     * Copy another [matrix]{@link Mat4}
     * @param matrix
     * @returns - this [matrix]{@link Mat4} after being set
     */
    copy(matrix = new _Mat4()) {
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
     * Clone a [matrix]{@link Mat4}
     * @returns - cloned [matrix]{@link Mat4}
     */
    clone() {
      return new _Mat4().copy(this);
    }
    /**
     * Multiply this [matrix]{@link Mat4} with another [matrix]{@link Mat4}
     * @param matrix - [matrix]{@link Mat4} to multiply with
     * @returns - this [matrix]{@link Mat4} after multiplication
     */
    multiply(matrix = new _Mat4()) {
      return this.multiplyMatrices(this, matrix);
    }
    /**
     * Multiply another [matrix]{@link Mat4} with this [matrix]{@link Mat4}
     * @param matrix - [matrix]{@link Mat4} to multiply with
     * @returns - this [matrix]{@link Mat4} after multiplication
     */
    premultiply(matrix = new _Mat4()) {
      return this.multiplyMatrices(matrix, this);
    }
    /**
     * Multiply two [matrices]{@link Mat4}
     * @param a - first [matrix]{@link Mat4}
     * @param b - second [matrix]{@link Mat4}
     * @returns - [matrix]{@link Mat4} resulting from the multiplication
     */
    multiplyMatrices(a = new _Mat4(), b = new _Mat4()) {
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
     * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a translate matrix (i.e. translateMatrix = new Mat4().translate(vector))
     * @param vector - translation [vector]{@link Vec3} to use
     * @returns - this [matrix]{@link Mat4} after the premultiply translate operation
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
     * [Premultiply]{@link Mat4#premultiply} this [matrix]{@link Mat4} by a scale matrix (i.e. translateMatrix = new Mat4().scale(vector))
     * @param vector - scale [vector]{@link Vec3} to use
     * @returns - this [matrix]{@link Mat4} after the premultiply scale operation
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
     * Get the [matrix]{@link Mat4} inverse
     * @returns - the [matrix]{@link Mat4} inverted
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
     * Clone and invert the [matrix]{@link Mat4}
     * @returns - inverted cloned [matrix]{@link Mat4}
     */
    getInverse() {
      return this.clone().invert();
    }
    /**
     * Translate a [matrix]{@link Mat4}
     * @param vector - translation [vector]{@link Vec3} to use
     * @returns - translated [matrix]{@link Mat4}
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
     * Scale a [matrix]{@link Mat4}
     * @param vector - scale [vector]{@link Vec3} to use
     * @returns - scaled [matrix]{@link Mat4}
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
     * Rotate a [matrix]{@link Mat4} from a [quaternion]{@link Quat}
     * @param quaternion - [quaternion]{@link Vec3} to use
     * @returns - rotated [matrix]{@link Mat4}
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
     * Set this [matrix]{@link Mat4} as a rotation matrix based on an eye, target and up [vectors]{@link Vec3}
     * @param eye - [position]{@link Vec3} of the object that should be rotated
     * @param target - [target]{@link Vec3} to look at
     * @param up - up [vector]{@link Vec3}
     * @returns - rotated [matrix]{@link Mat4}
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
     * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation [vector]{@link Vec3} to use
     * @param quaternion - [quaternion]{@link Quat} to use
     * @param scale - translation [vector]{@link Vec3} to use
     * @returns - transformed [matrix]{@link Mat4}
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
     * Creates a [matrix]{@link Mat4} from a [quaternion]{@link Quat} rotation, [vector]{@link Vec3} translation and [vector]{@link Vec3} scale, rotating and scaling around the given [origin]{@link Vec3}
     * Equivalent for applying translation, rotation and scale matrices but much faster
     * Source code from: http://glmatrix.net/docs/mat4.js.html
     *
     * @param translation - translation [vector]{@link Vec3} to use
     * @param quaternion - [quaternion]{@link Quat} to use
     * @param scale - translation [vector]{@link Vec3} to use
     * @param origin - origin [vector]{@link Vec3} around which to scale and rotate
     * @returns - transformed [matrix]{@link Mat4}
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
  };

  // src/math/Vec3.ts
  var Vec3 = class _Vec3 {
    /**
     * Vec3 constructor
     * @param x=0 - X component of our [vector]{@link Vec3}
     * @param y=x - Y component of our [vector]{@link Vec3}
     * @param z=x - Z component of our [vector]{@link Vec3}
     */
    constructor(x = 0, y = x, z = x) {
      this.type = "Vec3";
      this._x = x;
      this._y = y;
      this._z = z;
    }
    /**
     * Get/set the X component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get x() {
      return this._x;
    }
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get/set the Y component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get y() {
      return this._y;
    }
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Get/set the Z component of the [vector]{@link Vec3}
     * When set, can trigger [onChange]{@link Vec3#onChange} callback
     * @readonly
     */
    get z() {
      return this._z;
    }
    set z(value) {
      const changed = value !== this._z;
      this._z = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    /**
     * Called when at least one component of the [vector]{@link Vec3} has changed
     * @param callback - callback to run when at least one component of the [vector]{@link Vec3} has changed
     * @returns - our {@link Vec3}
     */
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /**
     * Set the [vector]{@link Vec3} from values
     * @param x=0 - new X component to set
     * @param y=0 - new Y component to set
     * @param z=0 - new Z component to set
     * @returns - this [vector]{@link Vec3} after being set
     */
    set(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    /**
     * Add a [vector]{@link Vec3} to this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to add
     * @returns - this [vector]{@link Vec3} after addition
     */
    add(vector = new _Vec3()) {
      this.x += vector.x;
      this.y += vector.y;
      this.z += vector.z;
      return this;
    }
    /**
     * Add a scalar to all the components of this [vector]{@link Vec3}
     * @param value=0 - number to add
     * @returns - this [vector]{@link Vec3} after addition
     */
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      this.z += value;
      return this;
    }
    /**
     * Subtract a [vector]{@link Vec3} from this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to subtract
     * @returns - this [vector]{@link Vec3} after subtraction
     */
    sub(vector = new _Vec3()) {
      this.x -= vector.x;
      this.y -= vector.y;
      this.z -= vector.z;
      return this;
    }
    /**
     * Subtract a scalar to all the components of this [vector]{@link Vec3}
     * @param value=0 - number to subtract
     * @returns - this [vector]{@link Vec3} after subtraction
     */
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      this.z -= value;
      return this;
    }
    /**
     * Multiply a [vector]{@link Vec3} with this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to multiply with
     * @returns - this [vector]{@link Vec3} after multiplication
     */
    multiply(vector = new _Vec3(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      this.z *= vector.z;
      return this;
    }
    /**
     * Multiply all components of this [vector]{@link Vec3} with a scalar
     * @param value=1 - number to multiply with
     * @returns - this [vector]{@link Vec3} after multiplication
     */
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      this.z *= value;
      return this;
    }
    /**
     * Copy a [vector]{@link Vec3} into this [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to copy
     * @returns - this [vector]{@link Vec3} after copy
     */
    copy(vector = new _Vec3()) {
      this.x = vector.x;
      this.y = vector.y;
      this.z = vector.z;
      return this;
    }
    /**
     * Clone this [vector]{@link Vec3}
     * @returns - cloned [vector]{@link Vec3}
     */
    clone() {
      return new _Vec3(this.x, this.y, this.z);
    }
    /**
     * Apply max values to this [vector]{@link Vec3} components
     * @param vector - [vector]{@link Vec3} representing max values
     * @returns - [vector]{@link Vec3} with max values applied
     */
    max(vector = new _Vec3()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      this.z = Math.max(this.z, vector.z);
      return this;
    }
    /**
     * Apply min values to this [vector]{@link Vec3} components
     * @param vector - [vector]{@link Vec3} representing min values
     * @returns - [vector]{@link Vec3} with min values applied
     */
    min(vector = new _Vec3()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      this.z = Math.min(this.z, vector.z);
      return this;
    }
    /**
     * Check if 2 [vectors]{@link Vec3} are equal
     * @param vector - [vector]{@link Vec3} to compare
     * @returns - whether the [vectors]{@link Vec3} are equals or not
     */
    equals(vector = new _Vec3()) {
      return this.x === vector.x && this.y === vector.y && this.z === vector.z;
    }
    /**
     * Get the square length of this [vector]{@link Vec3}
     * @returns - square length of this [vector]{@link Vec3}
     */
    lengthSq() {
      return this.x * this.x + this.y * this.y + this.z * this.z;
    }
    /**
     * Get the length of this [vector]{@link Vec3}
     * @returns - length of this [vector]{@link Vec3}
     */
    length() {
      return Math.sqrt(this.lengthSq());
    }
    /**
     * Normalize this [vector]{@link Vec3}
     * @returns - normalized [vector]{@link Vec3}
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
     * Calculate the dot product of 2 [vectors]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to use for dot product
     * @returns - dot product of the 2 [vectors]{@link Vec3}
     */
    dot(vector = new _Vec3()) {
      return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }
    /**
     * Get the cross product of this [vector]{@link Vec3} with another [vector]{@link Vec3}
     * @param vector - [vector]{@link Vec3} to use for cross product
     * @returns - this [vector]{@link Vec3} after cross product
     */
    cross(vector = new _Vec3()) {
      return this.crossVectors(this, vector);
    }
    /**
     * Set this [vector]{@link Vec3} as the result of the cross product of two [vectors]{@link Vec3}
     * @param a - first [vector]{@link Vec3} to use for cross product
     * @param b - second [vector]{@link Vec3} to use for cross product
     * @returns - this [vector]{@link Vec3} after cross product
     */
    crossVectors(a = new _Vec3(), b = new _Vec3()) {
      const ax = a.x, ay = a.y, az = a.z;
      const bx = b.x, by = b.y, bz = b.z;
      this.x = ay * bz - az * by;
      this.y = az * bx - ax * bz;
      this.z = ax * by - ay * bx;
      return this;
    }
    /**
     * Calculate the linear interpolation of this [vector]{@link Vec3} by given [vector]{@link Vec3} and alpha, where alpha is the percent distance along the line
     * @param vector - [vector]{@link Vec3} to interpolate towards
     * @param alpha=1 - interpolation factor in the [0, 1] interval
     * @returns - this [vector]{@link Vec3} after linear interpolation
     */
    lerp(vector = new _Vec3(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      this.z += (vector.z - this.z) * alpha;
      return this;
    }
    /**
     * Apply a [matrix]{@link Mat4} to a [vector]{@link Vec3}
     * Useful to convert a position [vector]{@link Vec3} from plane local world to webgl space using projection view matrix for example
     * Source code from: http://glmatrix.net/docs/vec3.js.html
     * @param matrix - [matrix]{@link Mat4} to use
     * @returns - this [vector]{@link Vec3} after [matrix]{@link Mat4} application
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
     * Apply a [quaternion]{@link Quat} (rotation in 3D space) to this [vector]{@link Vec3}
     * @param quaternion - [quaternion]{@link Quat} to use
     * @returns - this [vector]{@link Vec3} with the transformation applied
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
     * Rotate a [vector]{@link Vec3} around and axis by a given angle
     * @param axis - normalized [vector]{@link Vec3} around which to rotate
     * @param angle - angle (in radians) to rotate
     * @param quaternion - optional [quaternion]{@link Quat} to use for rotation computations
     * @returns - this [vector]{@link Vec3} with the rotation applied
     */
    applyAxisAngle(axis = new _Vec3(), angle = 0, quaternion = new Quat()) {
      return this.applyQuat(quaternion.setFromAxisAngle(axis, angle));
    }
    /**
     * Project a 3D coordinate [vector]{@link Vec3} to a 2D coordinate [vector]{@link Vec3}
     * @param camera - [camera]{@link Camera} to use for projection
     * @returns - projected [vector]{@link Vec3}
     */
    project(camera) {
      this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix);
      return this;
    }
    /**
     * Unproject a 2D coordinate [vector]{@link Vec3} to 3D coordinate [vector]{@link Vec3}
     * @param camera - [camera]{@link Camera} to use for projection
     * @returns - unprojected [vector]{@link Vec3}
     */
    unproject(camera) {
      this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix);
      return this;
    }
  };

  // src/core/bindings/bufferElements/BufferElement.ts
  var slotsPerRow = 4;
  var bytesPerSlot = 4;
  var bytesPerRow = slotsPerRow * bytesPerSlot;
  var BufferElement = class {
    /**
     * BufferElement constructor
     * @param parameters - [parameters]{@link BufferElementParams} used to create our {@link BufferElement}
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
     * Get the total number of bytes used by this {@link BufferElement} based on [alignment]{@link BufferElementAlignment} start and end offsets
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
     * Get the offset (i.e. byte index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffset() {
      return this.getByteCountAtPosition(this.alignment.end);
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
     * Get the number of bytes at a given [position]{@link BufferElementAlignmentPosition}
     * @param position - [position]{@link BufferElementAlignmentPosition} from which to count
     * @returns - byte count at the given [position]{@link BufferElementAlignmentPosition}
     */
    getByteCountAtPosition(position = { row: 0, byte: 0 }) {
      return position.row * bytesPerRow + position.byte;
    }
    /**
     * Check that a [position byte]{@link BufferElementAlignmentPosition#byte} does not overflow its max value (16)
     * @param position - [position]{@link BufferElementAlignmentPosition} to check
     * @returns - updated [position]{@link BufferElementAlignmentPosition#
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
     * Get the number of bytes between two [positions]{@link BufferElementAlignmentPosition}
     * @param p1 - first [position]{@link BufferElementAlignmentPosition}
     * @param p2 - second [position]{@link BufferElementAlignmentPosition}
     * @returns - number of bytes
     */
    getByteCountBetweenPositions(p1 = { row: 0, byte: 0 }, p2 = { row: 0, byte: 0 }) {
      return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1));
    }
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available [position]{@link BufferElementAlignmentPosition}
     * @param nextPositionAvailable - next [position]{@link BufferElementAlignmentPosition} at which we should insert this element
     * @returns - computed [alignment]{@link BufferElementAlignment}
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
     * Set the [alignment]{@link BufferElementAlignment} from a [position]{@link BufferElementAlignmentPosition}
     * @param position - [position]{@link BufferElementAlignmentPosition} at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignmentFromPosition(position = { row: 0, byte: 0 }) {
      this.alignment = this.getElementAlignment(position);
    }
    /**
     * Set the [alignment]{@link BufferElementAlignment} from an offset (byte count)
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignment(startOffset = 0) {
      this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset));
    }
    /**
     * Set the [view]{@link BufferElement#view}
     * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
     */
    setView(arrayBuffer, arrayView) {
      this.view = new this.bufferLayout.View(
        arrayBuffer,
        this.startOffset,
        this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
      );
    }
    /**
     * Update the [view]{@link BufferElement#view} based on the new value
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
        for (let i = 0; i < this.view.length; i++) {
          this.view[i] = value[i] ? value[i] : 0;
        }
      }
    }
  };

  // src/core/bindings/bufferElements/BufferArrayElement.ts
  var BufferArrayElement = class extends BufferElement {
    /**
     * BufferArrayElement constructor
     * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferArrayElement}
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type });
      this.arrayLength = arrayLength;
      this.numElements = this.arrayLength / this.bufferLayout.numElements;
    }
    /**
     * Set the [alignment]{@link BufferElementAlignment}
     * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the stride between two array elements. Using the stride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignment(startOffset = 0) {
      super.setAlignment(startOffset);
      const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(this.endOffset + 1));
      this.stride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end);
      this.alignment.end = this.getPositionAtOffset(this.endOffset + this.stride * (this.numElements - 1));
    }
    /**
     * Update the [view]{@link BufferElement#view} based on the new value
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
  };

  // src/core/bindings/bufferElements/BufferInterleavedArrayElement.ts
  var BufferInterleavedArrayElement = class extends BufferArrayElement {
    /**
     * BufferInterleavedArrayElement constructor
     * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferInterleavedArrayElement}
     */
    constructor({ name, key, type = "f32", arrayLength = 1 }) {
      super({ name, key, type, arrayLength });
      this.stride = 1;
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
     * Set the [alignment]{@link BufferElementAlignment}
     * To compute how arrays are packed, we need to compute the stride between two elements beforehand and pass it here. Using the stride and the total number of elements, we can easily get the end alignment position.
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
     */
    setAlignment(startOffset = 0, stride = 0) {
      this.alignment = this.getElementAlignment(this.getPositionAtOffset(startOffset));
      this.stride = stride;
      this.alignment.end = this.getPositionAtOffset(this.endOffset + stride * (this.numElements - 1));
    }
    /**
     * Set the [view]{@link BufferInterleavedArrayElement#view} and [viewSetFunction]{@link BufferInterleavedArrayElement#viewSetFunction}
     * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
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
     * Update the [view]{@link BufferArrayElement#view} based on the new value, and then update the [buffer binding array view]{@link BufferBinding#arrayView} using sub arrays
     * @param value - new value to use
     */
    update(value) {
      super.update(value);
      for (let i = 0; i < this.numElements; i++) {
        const subarray = this.view.subarray(
          i * this.bufferLayout.numElements,
          i * this.bufferLayout.numElements + this.bufferLayout.numElements
        );
        const startByteOffset = this.startOffset + i * this.stride;
        subarray.forEach((value2, index) => {
          this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value2, true);
        });
      }
    }
  };

  // src/core/bindings/BufferBinding.ts
  var BufferBinding = class extends Binding {
    /**
     * BufferBinding constructor
     * @param parameters - parameters used to create our BufferBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
     * @param {Object.<string, Input>} parameters.bindings - struct inputs
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType,
      bindIndex = 0,
      visibility,
      useStruct = true,
      access = "read",
      struct = {}
    }) {
      bindingType = bindingType ?? "uniform";
      super({ label, name, bindIndex, bindingType, visibility });
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
     * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#buffer}
     */
    get resourceLayout() {
      return {
        buffer: {
          type: getBindGroupLayoutBindingType(this)
        }
      };
    }
    /**
     * Get [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource() {
      return { buffer: this.buffer };
    }
    /**
     * Format input struct and set our {@link inputs}
     * @param bindings - struct inputs
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
     * Takes all the {@link inputs} and adds them to the {@link bufferElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
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
            `BufferBinding: "${this.label}" contains multiple array inputs that should use an interleaved array, but their size does not match. These inputs cannot be added to the BufferBinding: "${arrayBindings.join(
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
     * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName = "") {
      const bindingKey = Object.keys(this.inputs).find((bindingKey2) => this.inputs[bindingKey2].name === bindingName);
      if (bindingKey)
        this.inputs[bindingKey].shouldUpdate = true;
    }
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link inputs} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the {@link GPUBuffer}.
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
  };

  // src/core/bindings/WritableBufferBinding.ts
  var WritableBufferBinding = class extends BufferBinding {
    /**
     * WritableBufferBinding constructor
     * @param parameters - [parameters]{@link WritableBufferBindingParams} used to create our {@link WritableBufferBinding}
     */
    constructor({
      label = "Work",
      name = "work",
      bindingType,
      bindIndex = 0,
      useStruct = true,
      struct = {},
      visibility,
      access = "read_write",
      shouldCopyResult = false
    }) {
      bindingType = "storage";
      visibility = "compute";
      super({ label, name, bindIndex, bindingType, useStruct, struct, visibility, access });
      this.options = {
        ...this.options,
        shouldCopyResult
      };
      this.shouldCopyResult = shouldCopyResult;
      this.result = new Float32Array(this.arrayBuffer.slice(0));
      this.resultBuffer = null;
    }
  };

  // src/core/bindGroups/BindGroup.ts
  var BindGroup = class {
    /**
     * BindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {BindGroupParams=} parameters - [parameters]{@link BindGroupParams} used to create our {@link BindGroup}
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
      this.needsReset = false;
      this.needsPipelineFlush = false;
    }
    /**
     * Sets our [BindGroup index]{@link BindGroup#index}
     * @param index - [BindGroup index]{@link BindGroup#index}
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
     * @param bindingType - [binding type]{@link Binding#bindingType}
     * @param inputs - [inputs]{@link ReadOnlyInputBindings} that will be used to create the binding
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
     * Create buffers, {@link bindings}, {@link entries}, {@link bindGroupLayout} and {@link bindGroup}
     */
    createBindGroup() {
      this.fillEntries();
      this.setBindGroupLayout();
      this.setBindGroup();
    }
    /**
     * Reset the [bind group entries]{@link BindGroup#entries}, recreates it then recreate the [bind group layout]{@link BindGroup#bindGroupLayout} and [bind group]{@link BindGroup#bindGroup}
     */
    // TODO not necessarily needed?
    resetBindGroup() {
      this.resetEntries();
      this.createBindGroup();
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration
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
     * Get all [bind group struct]{@link BindGroup#bindings} that handle a {@link GPUBuffer}
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
     * Update the {@link BindGroup}, which means update its [buffer struct]{@link BindGroup#bufferBindings} and [reset it]{@link BindGroup#resetBindGroup} if needed.
     * Called at each render from the parent {@link Material}
     * (TODO - add a Material 'setBindGroup' method and call it from here? - would allow to automatically update bind groups that are eventually not part of the Material bindGroups when set)
     */
    update() {
      this.updateBufferBindings();
      if (this.needsReset) {
        this.resetBindGroup();
        this.needsReset = false;
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
     * Clones a bind group with all its {@link bindings}
     * @returns - the cloned BindGroup
     */
    // clone(): AllowedBindGroups {
    //   return this.cloneFromBindings()
    // }
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy() {
      this.bufferBindings.forEach((binding) => {
        if ("buffer" in binding) {
          this.renderer.removeBuffer(binding.buffer);
          binding.buffer?.destroy();
        }
        if ("resultBuffer" in binding) {
          this.renderer.removeBuffer(binding.resultBuffer);
          binding.resultBuffer?.destroy();
        }
      });
      this.bindings = [];
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.resetEntries();
    }
  };

  // src/core/bindings/TextureBinding.ts
  var TextureBinding = class extends Binding {
    /**
     * TextureBinding constructor
     * @param parameters - [parameters]{@link TextureBindingParams} used to create our {@link TextureBinding}
     */
    constructor({
      label = "Texture",
      name = "texture",
      bindingType,
      bindIndex = 0,
      visibility,
      texture,
      format = "rgba8unorm",
      access = "write"
    }) {
      bindingType = bindingType ?? "texture";
      if (bindingType === "storageTexture") {
        visibility = "compute";
      }
      super({ label, name, bindingType, bindIndex, visibility });
      this.options = {
        ...this.options,
        texture,
        format,
        access
      };
      this.resource = texture;
      this.setWGSLFragment();
    }
    /**
     * Get bind group layout entry resource, either for [texture]{@link GPUBindGroupLayoutEntry#texture} or [externalTexture]{@link GPUBindGroupLayoutEntry#externalTexture}
     */
    get resourceLayout() {
      return getBindGroupLayoutTextureBindingType(this);
    }
    /**
     * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource() {
      return this.texture instanceof GPUExternalTexture ? this.texture : this.texture instanceof GPUTexture ? this.texture.createView() : null;
    }
    set resource(value) {
      this.texture = value;
    }
    /**
     * Set or update our [bindingType]{@link Binding#bindingType} and our WGSL code snippet
     * @param bindingType - the new [binding type]{@link Binding#bindingType}
     */
    setBindingType(bindingType) {
      if (bindingType !== this.bindingType) {
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
  };

  // src/core/objects3D/Object3D.ts
  var Object3D = class {
    /**
     * Object3D constructor
     */
    constructor() {
      this.setMatrices();
      this.setTransforms();
    }
    /* TRANSFORMS */
    /**
     * Set our transforms properties and [onChange]{@link Vec3#onChange} callbacks
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
     * Get/set our rotation vector
     * @readonly
     */
    get rotation() {
      return this.transforms.rotation;
    }
    set rotation(value) {
      this.transforms.rotation = value;
      this.applyRotation();
    }
    /**
     * Get/set our quaternion
     * @readonly
     */
    get quaternion() {
      return this.transforms.quaternion;
    }
    set quaternion(value) {
      this.transforms.quaternion = value;
    }
    /**
     * Get/set our position vector
     * @readonly
     */
    get position() {
      return this.transforms.position.world;
    }
    set position(value) {
      this.transforms.position.world = value;
    }
    /**
     * Get/set our scale vector
     * @readonly
     */
    get scale() {
      return this.transforms.scale;
    }
    set scale(value) {
      this.transforms.scale = value;
      this.applyScale();
    }
    /**
     * Get/set our transform origin vector
     * @readonly
     */
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    set transformOrigin(value) {
      this.transforms.origin.model = value;
    }
    /**
     * Apply our rotation and tell our model matrix to update
     */
    applyRotation() {
      this.quaternion.setFromVec3(this.rotation);
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our model matrix to update
     */
    applyPosition() {
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our model matrix to update
     */
    applyScale() {
      this.shouldUpdateModelMatrix();
    }
    /**
     * Tell our model matrix to update
     */
    applyTransformOrigin() {
      this.shouldUpdateModelMatrix();
    }
    /* MATRICES */
    /**
     * Set our model matrix
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
     * Get/set our model matrix
     * @readonly
     */
    get modelMatrix() {
      return this.matrices.model.matrix;
    }
    set modelMatrix(value) {
      this.matrices.model.matrix = value;
      this.shouldUpdateModelMatrix();
    }
    /**
     * Set our model matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateModelMatrix() {
      this.matrices.model.shouldUpdate = true;
    }
    /**
     * Rotate this {@link Object3D} so it looks at the [target]{@link Vec3}
     * @param target - [target]{@link Vec3} to look at
     */
    lookAt(target = new Vec3()) {
      const rotationMatrix = new Mat4().lookAt(target, this.position);
      this.quaternion.setFromRotationMatrix(rotationMatrix);
      this.shouldUpdateModelMatrix();
    }
    /**
     * Update our model matrix
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
     * Tell our model matrix to update
     */
    updateSizeAndPosition() {
      this.shouldUpdateModelMatrix();
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
  };

  // src/core/textures/Texture.ts
  var defaultTextureParams = {
    name: "texture",
    generateMips: false,
    flipY: false,
    format: "rgba8unorm",
    placeholderColor: [0, 0, 0, 255],
    // default to black
    useExternalTextures: true,
    fromTexture: null
  };
  var Texture = class extends Object3D {
    /**
     * Texture constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Texture}
     * @param parameters - [parameters]{@link TextureParams} used to create this {@link Texture}
     */
    constructor(renderer, parameters = defaultTextureParams) {
      super();
      /** Private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [parent]{@link Texture#parent} [size]{@link RectSize} */
      this.#parentRatio = new Vec3(1);
      /** Private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [source size]{@link Texture#size} */
      this.#sourceRatio = new Vec3(1);
      /** Private [vector]{@link Vec3} used for [texture matrix]{@link Texture#modelMatrix} calculations, based on [#parentRatio]{@link Texture##parentRatio} and [#sourceRatio]{@link Texture##sourceRatio} */
      this.#coverScale = new Vec3(1);
      /** Private rotation [matrix]{@link Mat4} based on [texture quaternion]{@link Texture#quaternion} */
      this.#rotationMatrix = new Mat4();
      // callbacks / events
      /** function assigned to the [onSourceLoaded]{@link Texture#onSourceLoaded} callback */
      this._onSourceLoadedCallback = () => {
      };
      /** function assigned to the [onSourceUploaded]{@link Texture#onSourceUploaded} callback */
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
        height: 1
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
            //onBeforeUpdate: () => this.updateTextureMatrix(),
          }
        }
      });
      this.setBindings();
      this._parent = null;
      this.sourceLoaded = false;
      this.sourceUploaded = false;
      this.shouldUpdate = false;
      this.shouldUpdateBindGroup = false;
      this.renderer.addTexture(this);
    }
    #parentRatio;
    #sourceRatio;
    #coverScale;
    #rotationMatrix;
    /**
     * Set our [struct]{@link Texture#bindings}
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": texture",
          name: this.options.name,
          texture: this.options.sourceType === "externalVideo" ? this.externalTexture : this.texture,
          bindingType: this.options.sourceType === "externalVideo" ? "externalTexture" : "texture"
        }),
        this.textureMatrix
      ];
    }
    /**
     * Get our [texture binding]{@link TextureBinding}
     * @readonly
     */
    get textureBinding() {
      return this.bindings[0];
    }
    /**
     * Get/set our [texture parent]{@link Texture#_parent}
     * @readonly
     */
    get parent() {
      return this._parent;
    }
    set parent(value) {
      this._parent = value;
      this.resize();
    }
    /**
     * Get/set whether our [texture source]{@link Texture#source} has loaded
     * @readonly
     */
    get sourceLoaded() {
      return this._sourceLoaded;
    }
    set sourceLoaded(value) {
      if (value && !this.sourceLoaded) {
        this._onSourceLoadedCallback && this._onSourceLoadedCallback();
      }
      this._sourceLoaded = value;
    }
    /**
     * Get/set whether our [texture source]{@link Texture#source} has been uploaded
     * @readonly
     */
    get sourceUploaded() {
      return this._sourceUploaded;
    }
    set sourceUploaded(value) {
      if (value && !this.sourceUploaded) {
        this._onSourceUploadedCallback && this._onSourceUploadedCallback();
      }
      this._sourceUploaded = value;
    }
    /**
     * Set our [texture transforms object]{@link Texture#transforms}
     */
    setTransforms() {
      super.setTransforms();
      this.transforms.quaternion.setAxisOrder("ZXY");
      this.transforms.origin.model.set(0.5, 0.5, 0);
    }
    /* TEXTURE MATRIX */
    /**
     * Update the [texture model matrix]{@link Texture#modelMatrix}
     */
    updateModelMatrix() {
      if (!this.parent)
        return;
      const parentScale = this.parent.scale ? this.parent.scale : new Vec3(1, 1, 1);
      const parentWidth = this.parent.boundingRect ? this.parent.boundingRect.width * parentScale.x : this.size.width;
      const parentHeight = this.parent.boundingRect ? this.parent.boundingRect.height * parentScale.y : this.size.height;
      const parentRatio = parentWidth / parentHeight;
      const sourceWidth = this.size.width;
      const sourceHeight = this.size.height;
      const sourceRatio = sourceWidth / sourceHeight;
      if (parentWidth > parentHeight) {
        this.#parentRatio.set(parentRatio, 1, 1);
        this.#sourceRatio.set(1 / sourceRatio, 1, 1);
      } else {
        this.#parentRatio.set(1, 1 / parentRatio, 1);
        this.#sourceRatio.set(1, sourceRatio, 1);
      }
      const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? this.#parentRatio.x * this.#sourceRatio.x : this.#sourceRatio.y * this.#parentRatio.y;
      this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1);
      this.#rotationMatrix.rotateFromQuaternion(this.quaternion);
      this.modelMatrix.identity().premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1)).premultiplyScale(this.#coverScale).premultiplyScale(this.#parentRatio).premultiply(this.#rotationMatrix).premultiplyScale(this.#sourceRatio).premultiplyTranslate(this.transformOrigin).translate(this.position);
    }
    /**
     * Our [model matrix]{@link Texture#modelMatrix} has been updated, tell the [texture matrix binding]{@link Texture#textureMatrix} to update as well
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
     * Get the number of mip levels create based on [texture source size]{@link Texture#size}
     * @param sizes
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
     * Import an [external texture]{@link GPUExternalTexture} from the {@link Renderer}, update the [texture binding]{@link Texture#textureBinding} and its [bind group]{@link BindGroup}
     */
    uploadVideoTexture() {
      this.externalTexture = this.renderer.importExternalTexture(this.source);
      this.textureBinding.resource = this.externalTexture;
      this.textureBinding.setBindingType("externalTexture");
      this.shouldUpdateBindGroup = true;
      this.shouldUpdate = false;
      this.sourceUploaded = true;
    }
    /**
     * Copy a [texture]{@link Texture}
     * @param texture - [texture]{@link Texture} to copy
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
          this.shouldUpdateBindGroup = true;
        } else {
          this.createTexture();
        }
      }
    }
    /**
     * Set the [texture]{@link Texture#texture}
     */
    createTexture() {
      const options = {
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height],
        // [1, 1] if no source
        usage: !!this.source ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      };
      if (this.options.sourceType !== "externalVideo") {
        options.mipLevelCount = this.options.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1;
        this.texture?.destroy();
        this.texture = this.renderer.createTexture(options);
        this.textureBinding.resource = this.texture;
        this.shouldUpdateBindGroup = !!this.source;
      }
      this.shouldUpdate = true;
    }
    /* SOURCES */
    /**
     * Set the [size]{@link Texture#size} based on [texture source]{@link Texture#source}
     */
    setSourceSize() {
      this.size = {
        width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
        height: this.source.naturalHeight || this.source.height || this.source.videoHeight
      };
    }
    /**
     * Load an [image]{@link HTMLImageElement} from a URL and create an {@link ImageBitmap} to use as a [texture source]{@link Texture#source}
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
     * Load and create an {@link ImageBitmap} from a URL or {@link HTMLImageElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
     * @async
     * @param source - the image URL or {@link HTMLImageElement} to load
     * @returns - the newly created {@link ImageBitmap}
     */
    async loadImage(source) {
      const image = typeof source === "string" ? source : source.getAttribute("src");
      this.options.source = image;
      this.options.sourceType = "image";
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
     * Set our [shouldUpdate]{@link Texture#shouldUpdate} flag to true at each new video frame
     */
    onVideoFrameCallback() {
      if (this.videoFrameCallbackId) {
        this.shouldUpdate = true;
        this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this));
      }
    }
    /**
     * Callback to run when a [video]{@link HTMLVideoElement} has loaded (when it has enough data to play).
     * Set the [video]{@link HTMLVideoElement} as a [texture source]{@link Texture#source} and create the {@link GPUTexture} or {@link GPUExternalTexture}
     * @param video - the newly loaded [video]{@link HTMLVideoElement}
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
     * Get whether the [texture source]{@link Texture#source} is a video
     * @readonly
     */
    get isVideoSource() {
      return this.source && (this.options.sourceType === "video" || this.options.sourceType === "externalVideo");
    }
    /**
     * Load a video from a URL or {@link HTMLVideoElement} and register [onVideoLoaded]{@link Texture#onVideoLoaded} callback
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
     * Load a [canvas]{@link HTMLCanvasElement}, use it as a [texture source]{@link Texture#source} and create the {@link GPUTexture}
     * @param source
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
     * Callback to run when the [texture source]{@link Texture#source} has loaded
     * @param callback - callback to run when the [texture source]{@link Texture#source} has loaded
     * @returns - our {@link Texture}
     */
    onSourceLoaded(callback) {
      if (callback) {
        this._onSourceLoadedCallback = callback;
      }
      return this;
    }
    /**
     * Callback to run when the [texture source]{@link Texture#source} has been uploaded
     * @param callback - callback to run when the [texture source]{@link Texture#source} been uploaded
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
     * - Update its [model matrix]{@link Texture#modelMatrix} and [struct]{@link Texture#bindings} if needed
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
      if (this.videoFrameCallbackId) {
        ;
        this.source.cancelVideoFrameCallback(this.videoFrameCallbackId);
      }
      if (this.isVideoSource) {
        ;
        this.source.removeEventListener(
          "canplaythrough",
          this.onVideoLoaded.bind(this, this.source),
          {
            once: true
          }
        );
      }
      this.renderer.removeTexture(this);
      this.texture?.destroy();
      this.texture = null;
    }
  };

  // src/core/bindGroups/TextureBindGroup.ts
  var TextureBindGroup = class extends BindGroup {
    /**
     * TextureBindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {TextureBindGroupParams=} parameters - [parameters]{@link TextureBindGroupParams} used to create our {@link TextureBindGroup}
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
      this.externalTexturesIDs = [];
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
     * Reset our {@link TextureBindGroup}, first by reassigning correct {@link BindGroup#entries} resources, then by recreating the GPUBindGroup.
     * Called each time a GPUTexture or GPUExternalTexture has changed:
     * 1. A [texture source]{@link Texture#source} has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
     * 2. A [texture]{@link Texture} copy just happened
     * 3. {@link GPUExternalTexture} at each tick
     * 4. A [render texture GPUTexture]{@link RenderTexture#texture} has changed (on resize)
     */
    resetTextureBindGroup() {
      const textureBindingsIndexes = [...this.bindings].reduce(
        (foundIndexes, binding, index) => (binding instanceof TextureBinding && foundIndexes.push(index), foundIndexes),
        []
      );
      if (textureBindingsIndexes.length) {
        textureBindingsIndexes.forEach((index) => {
          this.entries.bindGroup[index].resource = this.bindings[index].resource;
        });
        this.setBindGroup();
      }
    }
    /**
     * Get whether we should update our video [bind group layout]{@link GPUBindGroupLayout}.
     * Happens when a GPUExternalTexture is created, we need to rebuild the {@link BindGroup#bindGroup} and {@link BindGroup#bindGroupLayout} from scratch. We might even need to recreate the whole pipeline (it it has already been created).
     * @param textureIndex - the texture index in the bind group textures array
     * @returns - whether we should update the [bind group layout]{@link GPUBindGroupLayout}
     */
    shouldUpdateVideoTextureBindGroupLayout(textureIndex) {
      if (this.externalTexturesIDs.includes(textureIndex)) {
        return false;
      } else {
        this.externalTexturesIDs.push(textureIndex);
        this.needsPipelineFlush = true;
        return this.needsPipelineFlush;
      }
    }
    /**
     * Called if the result of {@link shouldUpdateVideoTextureBindGroupLayout} is true. Updates our {@link BindGroup#bindGroupLayout} {@link BindGroup#entries} on the fly, then recreates GPUBindGroupLayout.
     * Will also call {@link resetTextureBindGroup} afterwhile to recreate the GPUBindGroup.
     * @param textureIndex - the texture index in the bind group textures array
     */
    updateVideoTextureBindGroupLayout(textureIndex) {
      const texture = this.textures[textureIndex];
      const externalTexturesIndexes = [...this.bindings].reduce(
        (foundIndexes, binding, index) => (binding.bindingType === "externalTexture" && foundIndexes.push(index), foundIndexes),
        []
      );
      if (externalTexturesIndexes.length) {
        externalTexturesIndexes.forEach((bindingIndex) => {
          this.entries.bindGroupLayout[bindingIndex] = {
            binding: this.entries.bindGroupLayout[bindingIndex].binding,
            externalTexture: texture.externalTexture,
            visibility: this.entries.bindGroupLayout[bindingIndex].visibility
          };
          if (this.bindings[bindingIndex]) {
            this.bindings[bindingIndex].wgslGroupFragment = texture.textureBinding.wgslGroupFragment;
          }
        });
        this.setBindGroupLayout();
      }
    }
    /**
     * Update the [bind group textures]{@link TextureBindGroup#textures}:
     * - Check if they need to copy their source texture
     * - Upload texture if needed
     * - Check if the [bind group layout]{@link TextureBindGroup#bindGroupLayout} and/or [bing group]{@link TextureBindGroup#bindGroup} need an update
     */
    updateTextures() {
      this.textures.forEach((texture, textureIndex) => {
        if (texture instanceof Texture) {
          if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
            texture.copy(texture.options.fromTexture);
          }
          if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
            texture.uploadVideoTexture();
            if (this.shouldUpdateVideoTextureBindGroupLayout(textureIndex)) {
              this.updateVideoTextureBindGroupLayout(textureIndex);
            }
          }
        }
        if (texture.shouldUpdateBindGroup && (texture.texture || texture.externalTexture)) {
          this.resetTextureBindGroup();
          texture.shouldUpdateBindGroup = false;
        }
      });
    }
    /**
     * Update the {@link TextureBindGroup}, which means update its [textures]{@link TextureBindGroup#textures}, then update its [buffer struct]{@link TextureBindGroup#bufferBindings} and finally[reset it]{@link TextureBindGroup#resetBindGroup} if needed
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
  };

  // src/core/bindings/SamplerBinding.ts
  var SamplerBinding = class extends Binding {
    /**
     * SamplerBinding constructor
     * @param parameters - parameters used to create our SamplerBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {SamplerBindingResource=} parameters.resource - a GPUSampler
     */
    constructor({
      label = "Sampler",
      name = "sampler",
      bindingType,
      bindIndex = 0,
      visibility,
      sampler
    }) {
      bindingType = bindingType ?? "sampler";
      super({ label, name, bindIndex, bindingType, visibility });
      this.options = {
        ...this.options,
        sampler
      };
      this.resource = sampler;
      this.setWGSLFragment();
    }
    /**
     * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#sampler}
     */
    get resourceLayout() {
      return {
        sampler: {
          type: "filtering"
          // TODO let user chose?
        }
      };
    }
    /**
     * Get/set [bind group resource]{@link GPUBindGroupEntry#resource}
     */
    get resource() {
      return this.sampler;
    }
    set resource(value) {
      this.sampler = value;
    }
    /**
     * Set the correct WGSL code snippet.
     */
    setWGSLFragment() {
      this.wgslGroupFragment = [`var ${this.name}: ${this.bindingType};`];
    }
  };

  // src/core/camera/Camera.ts
  var Camera = class extends Object3D {
    /**
     * Camera constructor
     * @param parameters - [parameters]{@link CameraParams} used to create our {@link Camera}
     */
    constructor({
      fov = 50,
      near = 0.01,
      far = 50,
      width = 1,
      height = 1,
      pixelRatio = 1,
      onMatricesChanged = () => {
      }
    } = {}) {
      super();
      this.position.set(0, 0, 5);
      this.onMatricesChanged = onMatricesChanged;
      this.size = {
        width: 1,
        height: 1
      };
      this.setPerspective(fov, near, far, width, height, pixelRatio);
    }
    /** Private {@link Camera} field of view */
    #fov;
    /** Private {@link Camera} near plane */
    #near;
    /** Private {@link Camera} far plane */
    #far;
    /** Private {@link Camera} pixel ratio, used in {@link CSSPerspective} calcs */
    #pixelRatio;
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
     * Get/set our view matrix
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
     * Get/set our projection matrix
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
     * Get / set the {@link Camera} [field of view]{@link Camera##fov}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @readonly
     */
    get fov() {
      return this.#fov;
    }
    set fov(fov) {
      fov = Math.max(1, Math.min(fov ?? this.fov, 179));
      if (fov !== this.fov) {
        this.#fov = fov;
        this.shouldUpdateProjectionMatrix();
      }
      this.setScreenRatios();
      this.setCSSPerspective();
    }
    /**
     * Get / set the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @readonly
     */
    get near() {
      return this.#near;
    }
    set near(near) {
      near = Math.max(near ?? this.near, 0.01);
      if (near !== this.near) {
        this.#near = near;
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get / set the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @readonly
     */
    get far() {
      return this.#far;
    }
    set far(far) {
      far = Math.max(far ?? this.far, this.near + 1);
      if (far !== this.far) {
        this.#far = far;
        this.shouldUpdateProjectionMatrix();
      }
    }
    /**
     * Get / set the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
     * @readonly
     */
    get pixelRatio() {
      return this.#pixelRatio;
    }
    set pixelRatio(pixelRatio) {
      this.#pixelRatio = pixelRatio ?? this.pixelRatio;
      this.setCSSPerspective();
    }
    /**
     * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
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
     * Sets the {@link Camera} perspective. Update the {@link projectionMatrix} if our {@link shouldUpdate} flag is true
     * @param fov - field of view to use
     * @param near - near plane value to use
     * @param far - far plane value to use
     * @param width - width value to use
     * @param height - height value to use
     * @param pixelRatio - pixel ratio value to use
     */
    // TODO use a parameter object instead?
    setPerspective(fov = this.fov, near = this.near, far = this.far, width = this.size.width, height = this.size.height, pixelRatio = this.pixelRatio) {
      this.setSize({ width, height });
      this.pixelRatio = pixelRatio;
      this.fov = fov;
      this.near = near;
      this.far = far;
    }
    /**
     * Callback to run when the [camera model matrix]{@link Camera#modelMatrix} has been updated
     */
    onAfterMatrixStackUpdate() {
      this.onMatricesChanged();
    }
    /**
     * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
     * Used to translate planes along the Z axis using pixel units as CSS would do
     * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
     */
    setCSSPerspective() {
      this.CSSPerspective = Math.pow(
        Math.pow(this.size.width / (2 * this.pixelRatio), 2) + Math.pow(this.size.height / (2 * this.pixelRatio), 2),
        0.5
      ) / Math.tan(this.fov * 0.5 * Math.PI / 180);
    }
    /**
     * Sets visible width / height at a given z-depth from our {@link Camera} parameters
     * Taken from {@link https://discourse.threejs.org/t/functions-to-calculate-the-visible-width-height-at-a-given-z-depth-from-a-perspective-camera/269}
     * @param depth - depth to use for calcs
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
     * Rotate this {@link Object3D} so it looks at the [target]{@link Vec3}
     * @param target - [target]{@link Vec3} to look at
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
  };

  // src/core/samplers/Sampler.ts
  var Sampler = class {
    /**
     * Sampler constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Sampler}
     * @param parameters - [parameters]{@link SamplerParams} used to create this {@link Sampler}
     */
    constructor(renderer, {
      label = "Sampler",
      name,
      addressModeU = "repeat",
      addressModeV = "repeat",
      magFilter = "linear",
      minFilter = "linear",
      mipmapFilter = "linear",
      maxAnisotropy = 1
    } = {}) {
      this.type = "Sampler";
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
        maxAnisotropy
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
     * Set the [binding]{@link SamplerBinding}
     */
    createBinding() {
      this.binding = new SamplerBinding({
        label: this.label,
        name: this.name,
        bindingType: "sampler",
        sampler: this.sampler
      });
    }
  };

  // src/core/textures/RenderTexture.ts
  var defaultRenderTextureParams = {
    label: "RenderTexture",
    name: "renderTexture",
    usage: "texture",
    access: "write",
    fromTexture: null
  };
  var RenderTexture = class {
    /**
     * RenderTexture constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - [parameters]{@link RenderTextureParams} used to create this {@link RenderTexture}
     */
    constructor(renderer, parameters = defaultRenderTextureParams) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " RenderTexture" : "RenderTexture");
      this.type = "RenderTexture";
      this.renderer = renderer;
      this.uuid = generateUUID();
      this.options = { ...defaultRenderTextureParams, ...parameters };
      if (!this.options.format) {
        this.options.format = this.renderer.preferredFormat;
      }
      this.shouldUpdateBindGroup = false;
      this.setSize(this.options.size);
      this.setBindings();
      this.createTexture();
    }
    /**
     * Set the [size]{@link RenderTexture#size}
     * @param size - [size]{@link RectSize} to set, the [renderer bounding rectangle]{@link Renderer#pixelRatioBoundingRect} width and height if null
     */
    setSize(size = null) {
      if (!size) {
        size = {
          width: this.renderer.pixelRatioBoundingRect.width,
          height: this.renderer.pixelRatioBoundingRect.height
        };
      }
      this.size = size;
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
     * Create the [texture]{@link GPUTexture} (or copy it from source) and update the [binding resource]{@link TextureBinding#resource}
     */
    createTexture() {
      if (this.options.fromTexture) {
        this.size = this.options.fromTexture.size;
        this.texture = this.options.fromTexture.texture;
        this.textureBinding.resource = this.texture;
        return;
      }
      this.texture?.destroy();
      this.texture = this.renderer.createTexture({
        label: this.options.label,
        format: this.options.format,
        size: [this.size.width, this.size.height],
        usage: (
          // TODO let user chose?
          this.options.usage === "texture" ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
        )
      });
      this.textureBinding.resource = this.texture;
    }
    /**
     * Set our [struct]{@link RenderTexture#bindings}
     */
    setBindings() {
      this.bindings = [
        new TextureBinding({
          label: this.options.label + ": " + this.options.name + " render texture",
          name: this.options.name,
          texture: this.texture,
          bindingType: this.options.usage
        })
      ];
    }
    /**
     * Get our [texture binding]{@link TextureBinding}
     * @readonly
     */
    get textureBinding() {
      return this.bindings[0];
    }
    /**
     * Resize our {@link RenderTexture}, which means recreate it/copy it again and tell the [bind group]{@link BindGroup} to update
     * @param size - the optional new [size]{@link RectSize} to set
     */
    resize(size = null) {
      this.setSize(size);
      this.createTexture();
      this.shouldUpdateBindGroup = true;
    }
    /**
     * Destroy our {@link RenderTexture}
     */
    destroy() {
      this.texture?.destroy();
      this.texture = null;
    }
  };

  // src/core/materials/Material.ts
  var Material = class {
    /**
     * Material constructor
     * @param {(Renderer|GPUCurtains)} renderer - our renderer class object
     * @param {MaterialParams} parameters - parameters used to create our Material
     * @param {string} parameters.label - Material label
     * @param {boolean} parameters.useAsyncPipeline - whether the pipeline should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our Material shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our Material {@see BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@see BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@see Sampler}
     */
    constructor(renderer, parameters) {
      this.type = "Material";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { shaders, label, useAsyncPipeline, uniforms, storages, bindGroups, samplers } = parameters;
      this.options = {
        shaders,
        label,
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline },
        ...uniforms !== void 0 && { uniforms },
        ...storages !== void 0 && { storages },
        ...bindGroups !== void 0 && { bindGroups },
        ...samplers !== void 0 && { samplers }
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
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
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
     * Called when the [renderer device]{@link GPURenderer#device} has been restored to recreate our bind groups.
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
      this.options.bindGroups?.forEach((bindGroup) => {
        this.processBindGroupBindings(bindGroup);
        this.inputsBindGroups.push(bindGroup);
      });
    }
    /**
     * Get the main [texture bind group]{@link TextureBindGroup} created by this {@link Material} to manage all textures related struct
     * @readonly
     */
    get texturesBindGroup() {
      return this.texturesBindGroups[0];
    }
    /**
     * Process all {@see BindGroup} struct and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to struct.
     * @param bindGroup - The {@see BindGroup} to process
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
      this.options.bindGroups?.forEach((bindGroup) => {
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
     * Clones a {@see BindGroup} from a list of buffers
     * Useful to create a new bind group with already created buffers, but swapped
     * @param bindGroup - the BindGroup to clone
     * @param bindings - our input binding buffers
     * @param keepLayout - whether we should keep original bind group layout or not
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
     * Get a corresponding {@see BindGroup} or {@see TextureBindGroup} from one of its binding name/key
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
      this.texturesBindGroups = [];
      this.inputsBindGroups = [];
      this.bindGroups = [];
      this.clonedBindGroups = [];
    }
    /**
     * [Update]{@link BindGroup#update} all bind groups:
     * - Update all [textures bind groups]{@link Material#texturesBindGroups} textures
     * - Update its [buffer struct]{@link BindGroup#bufferBindings}
     * - Check if it eventually needs a [reset]{@link BindGroup#resetBindGroup}
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
     * Look for a binding by name/key in all bind groups
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingByName(bindingName = "") {
      return this.inputsBindings.find((binding) => binding.name === bindingName);
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
          ;
          bufferBinding.shouldUpdateBinding(bindingName);
        }
      }
    }
    /* SAMPLERS & TEXTURES */
    /**
     * Prepare our textures array and set the {@see TextureBindGroup}
     */
    setTextures() {
      this.textures = [];
      this.renderTextures = [];
      this.texturesBindGroups.push(
        new TextureBindGroup(this.renderer, {
          label: this.options.label + ": Textures bind group"
        })
      );
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
     * Destroy a [texture]{@link Texture} or [render texture]{@link RenderTexture}, only if it is not used by another object
     * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to eventually destroy
     */
    destroyTexture(texture) {
      const objectsUsingTexture = this.renderer.getObjectsByTexture(texture);
      const shouldDestroy = !objectsUsingTexture || !objectsUsingTexture.find((object) => object.material.uuid !== this.uuid);
      if (shouldDestroy) {
        texture.destroy();
      }
    }
    /**
     * Destroy all the Material textures
     */
    destroyTextures() {
      this.textures?.forEach((texture) => this.destroyTexture(texture));
      this.renderTextures?.forEach((texture) => this.destroyTexture(texture));
      this.textures = [];
      this.renderTextures = [];
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
    /* RENDER */
    /**
     * Called before rendering the Material.
     * First, check if we need to create our bind groups or pipeline
     * Then render the [textures]{@link Material#textures}
     * Finally updates all the [bind groups]{@link Material#bindGroups}
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
  };

  // src/core/materials/ComputeMaterial.ts
  var ComputeMaterial = class extends Material {
    /**
     * ComputeMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - parameters used to create our Material
     * @param {string} parameters.label - ComputeMaterial label
     * @param {boolean} parameters.useAsyncPipeline - whether the {@link ComputePipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our ComputeMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our ComputeMaterial {@link BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@link BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@link Sampler}
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      const type = "ComputeMaterial";
      isRenderer(renderer, type);
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      let { shaders } = parameters;
      if (!shaders || !shaders.compute) {
        shaders = {
          compute: {
            code: "",
            entryPoint: "main"
          }
        };
      }
      if (!shaders.compute.code) {
        shaders.compute.code = "";
      }
      if (!shaders.compute.entryPoint) {
        shaders.compute.entryPoint = "main";
      }
      this.options = {
        ...this.options,
        shaders,
        ...parameters.dispatchSize !== void 0 && { dispatchSize: parameters.dispatchSize }
      };
      this.workGroups = [];
      this.addWorkGroup({
        bindGroups: this.bindGroups,
        dispatchSize: this.options.dispatchSize
      });
      this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
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
    /* BIND GROUPS */
    /**
     * Check whether we're currently accessing one of the buffer and therefore can't render our material
     * @readonly
     */
    get hasMappedBuffer() {
      const hasMappedBuffer = this.bindGroups.some((bindGroup) => {
        return bindGroup.bindings.some(
          (bindingBuffer) => bindingBuffer.resultBuffer && bindingBuffer.resultBuffer.mapState !== "unmapped"
        );
      });
      return !!hasMappedBuffer;
    }
    /* WORK GROUPS */
    /**
     * Add a new [work group]{@link ComputeMaterial#workGroups} to render each frame.
     * A [work group]{@link ComputeMaterial#workGroups} is composed of an array of [bind groups][@link BindGroup] to set and a dispatch size to dispatch the [work group]{@link ComputeMaterial#workGroups}
     * @param bindGroups
     * @param dispatchSize
     */
    addWorkGroup({ bindGroups = [], dispatchSize = 1 }) {
      if (Array.isArray(dispatchSize)) {
        dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1);
        dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1);
        dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1);
      } else if (!isNaN(dispatchSize)) {
        dispatchSize = [Math.ceil(dispatchSize), 1, 1];
      }
      this.workGroups.push({
        bindGroups,
        dispatchSize
      });
    }
    /* RENDER */
    /**
     * Render a [work group]{@link ComputeMaterial#workGroups}: set its bind groups and then dispatch using its dispatch size
     * @param pass - current compute pass encoder
     * @param workGroup - [Work group]{@link ComputeMaterial#workGroups} to render
     */
    renderWorkGroup(pass, workGroup) {
      workGroup.bindGroups.forEach((bindGroup) => {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
      });
      pass.dispatchWorkgroups(workGroup.dispatchSize[0], workGroup.dispatchSize[1], workGroup.dispatchSize[2]);
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline, and render all the [work groups]{@link ComputeMaterial#workGroups}
     * @param pass - current compute pass encoder
     */
    render(pass) {
      if (!this.ready)
        return;
      this.setPipeline(pass);
      this.workGroups.forEach((workGroup) => {
        this.renderWorkGroup(pass, workGroup);
      });
    }
    /* RESULT BUFFER */
    /**
     * Copy all writable binding buffers that need it
     * @param commandEncoder - current command encoder
     */
    copyBufferToResult(commandEncoder) {
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.bindings.forEach((binding) => {
          if ("shouldCopyResult" in binding && binding.shouldCopyResult) {
            commandEncoder.copyBufferToBuffer(binding.buffer, 0, binding.resultBuffer, 0, binding.resultBuffer.size);
          }
        });
      });
    }
    /**
     * Loop through all bind groups writable buffers and check if they need to be copied
     */
    setWorkGroupsResult() {
      this.bindGroups.forEach((bindGroup) => {
        bindGroup.bindings.forEach((binding) => {
          if (binding.shouldCopyResult) {
            this.setBufferResult(binding);
          }
        });
      });
    }
    /**
     * Copy the result buffer into our result array
     * @param binding - buffer binding to set the result from
     */
    setBufferResult(binding) {
      if (binding.resultBuffer?.mapState === "unmapped") {
        binding.resultBuffer.mapAsync(GPUMapMode.READ).then(() => {
          binding.result = new Float32Array(binding.resultBuffer.getMappedRange().slice(0));
          binding.resultBuffer.unmap();
        });
      }
    }
    /**
     * Get the result of work group by work group and binding names
     * @param workGroupName - work group name/key
     * @param bindingName - binding name/key
     * @returns - the result of our GPU compute pass
     */
    getWorkGroupResult({
      workGroupName = "",
      bindingName = ""
    }) {
      let binding;
      this.bindGroups.forEach((bindGroup) => {
        binding = bindGroup.bindings.find((binding2) => binding2.name === workGroupName);
      });
      if (binding) {
        if (bindingName) {
          const bindingElement = binding.bindingElements.find((bindingElement2) => bindingElement2.name === bindingName);
          if (bindingElement) {
            return binding.result.slice(bindingElement.startOffset, bindingElement.endOffset);
          } else {
            return binding.result.slice();
          }
        } else {
          return binding.result.slice();
        }
      } else {
        return null;
      }
    }
  };

  // src/core/computePasses/ComputePass.ts
  var computePassIndex = 0;
  var ComputePass = class {
    /**
     * ComputePass constructor
     * @param renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param parameters - [parameters]{@link ComputePassParams} used to create our {@link ComputePass}
     */
    // TODO do we need samplers here? What about textures?
    constructor(renderer, parameters = {}) {
      /**
       * Whether this {@link ComputePass} should be added to our {@link Scene} to let it handle the rendering process automatically
       * @private
       */
      this.#autoRender = true;
      // callbacks / events
      /** function assigned to the [onReady]{@link ComputePass#onReady} callback */
      this._onReadyCallback = () => {
      };
      /** function assigned to the [onBeforeRender]{@link ComputePass#onBeforeRender} callback */
      this._onBeforeRenderCallback = () => {
      };
      /** function assigned to the [onRender]{@link ComputePass#onRender} callback */
      this._onRenderCallback = () => {
      };
      /** function assigned to the [onAfterRender]{@link ComputePass#onAfterRender} callback */
      this._onAfterRenderCallback = () => {
      };
      /** function assigned to the [onAfterResize]{@link ComputePass#onAfterResize} callback */
      this._onAfterResizeCallback = () => {
      };
      const type = "ComputePass";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? `${parameters.label} ${type}` : type);
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
        this.#autoRender = autoRender;
      }
      this.userData = {};
      this.ready = false;
      this.setComputeMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        uniforms,
        storages,
        bindGroups,
        useAsyncPipeline,
        dispatchSize
      });
      this.addToScene();
    }
    #autoRender;
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
      if (this.#autoRender) {
        this.renderer.scene.addComputePass(this);
      }
    }
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene() {
      if (this.#autoRender) {
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
     * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
     * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
     */
    loseContext() {
      this.material.loseContext();
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} has been restored
     */
    restoreContext() {
      this.material.restoreContext();
    }
    /* TEXTURES */
    /**
     * Get our [compute material textures array]{@link ComputeMaterial#textures}
     * @readonly
     */
    get textures() {
      return this.material?.textures || [];
    }
    /**
     * Get our [compute material render textures array]{@link ComputeMaterial#renderTextures}
     * @readonly
     */
    get renderTextures() {
      return this.material?.renderTextures || [];
    }
    /**
     * Create a new {@link Texture}
     * @param options - [Texture options]{@link TextureParams}
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
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
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
     * Get our [compute material uniforms]{@link ComputeMaterial#uniforms}
     * @readonly
     */
    get uniforms() {
      return this.material?.uniforms;
    }
    /**
     * Get our [compute material storages]{@link ComputeMaterial#storages}
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
     * Callback to run after the {@link Renderer} has been resized
     * @param callback - callback to run just after {@link GPURenderer} has been resized
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
     * Basically just check if our {@link GPURenderer} is ready, and then render our {@link ComputeMaterial}
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
     * Check whether we're currently accessing one of the {@link ComputeMaterial} buffer and therefore can't render our compute pass
     * @readonly
     */
    get canRender() {
      return this.material ? !this.material.hasMappedBuffer : false;
    }
    /**
     * Copy the result of our read/write GPUBuffer into our result binding array
     * @param commandEncoder - current GPU command encoder
     */
    copyBufferToResult(commandEncoder) {
      this.material?.copyBufferToResult(commandEncoder);
    }
    /**
     * Set {@link ComputeMaterial} work groups result
     */
    setWorkGroupsResult() {
      this.material?.setWorkGroupsResult();
    }
    /**
     * Get the result of a work group by binding name
     * @param workGroupName - name/key of the work group
     * @param bindingName - name/key of the input binding
     * @returns - the corresponding binding result array
     */
    getWorkGroupResult({ workGroupName, bindingName }) {
      return this.material?.getWorkGroupResult({ workGroupName, bindingName });
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
  };

  // src/math/Box3.ts
  var points = [new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Vec3()];
  var Box3 = class _Box3 {
    /**
     * Box3 constructor
     * @param min - min [vector]{@link Vec3} of the {@link Box3}
     * @param max - max [vector]{@link Vec3} of the {@link Box3}
     */
    constructor(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min = min;
      this.max = max;
    }
    /**
     * Set a {@link Box3} from two min and max [vectors]{@link Vec3}
     * @param min - min [vector]{@link Vec3} of the {@link Box3}
     * @param max - max [vector]{@link Vec3} of the {@link Box3}
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
      return new _Box3().set(this.min, this.max);
    }
    /**
     * Get the {@link Box3} center
     * @returns - [Center vector]{@link Vec3} of the {@link Box3}
     */
    getCenter() {
      return this.max.clone().add(this.min).multiplyScalar(0.5);
    }
    /**
     * Get the {@link Box3} size
     * @returns - [Size vector]{@link Vec3} of the {@link Box3}
     */
    getSize() {
      return this.max.clone().sub(this.min);
    }
    /**
     * Apply a [matrix]{@link Mat4} to a {@link Box3}
     * Useful to apply a transformation [matrix]{@link Mat4} to a {@link Box3}
     * @param matrix - [matrix]{@link Mat4} to use
     * @returns - this {@link Box3} after [matrix]{@link Mat4} application
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
      const transFormedBox = new _Box3();
      for (let i = 0, cornersCount = corners.length; i < cornersCount; i++) {
        transFormedBox.min.min(corners[i]);
        transFormedBox.max.max(corners[i]);
      }
      return transFormedBox;
    }
  };

  // src/core/DOM/DOMFrustum.ts
  var defaultDOMFrustumMargins = {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
  };
  var DOMFrustum = class {
    /**
     * DOMFrustum constructor
     * @param {DOMFrustumParams} parameters - [parameters]{@link DOMFrustumParams} used to create our {@link DOMFrustum}
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
  };

  // src/core/geometries/Geometry.ts
  var Geometry = class {
    /**
     * Geometry constructor
     * @param [parameters={}] - parameters used to create our Geometry
     * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     */
    constructor({
      verticesOrder = "cw",
      topology = "triangle-list",
      instancesCount = 1,
      vertexBuffers = []
    } = {}) {
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
      return !this.vertexBuffers[0].array;
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
     * @param [parameters={}] - vertex buffer parameters
     * @param [parameters.stepMode="vertex"] - GPU vertex step mode
     * @param [parameters.name] - vertex buffer name
     * @param [parameters.attributes=[]] - vertex buffer attributes
     * @returns - newly created [vertex buffer]{@link VertexBuffer}
     */
    addVertexBuffer({ stepMode = "vertex", name, attributes = [] } = {}) {
      const vertexBuffer = {
        name: name ?? "attributes" + this.vertexBuffers.length,
        stepMode,
        arrayStride: 0,
        bufferLength: 0,
        attributes: [],
        buffer: null,
        indexBuffer: null
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
     * @returns - found [vertex buffer]{@link VertexBuffer} or null if not found
     */
    getVertexBufferByName(name = "") {
      return this.vertexBuffers.find((vertexBuffer) => vertexBuffer.name === name);
    }
    /**
     * Set a vertex buffer attribute
     * @param parameters - attributes parameters
     * @param {VertexBuffer=} parameters.vertexBuffer - vertex buffer holding this attribute
     * @param {string} parameters.name - attribute name
     * @param {WGSLVariableType} [parameters.type="vec3f"] - attribute type
     * @param {GPUVertexFormat} [parameters.bufferFormat="float32x3"] - attribute buffer format
     * @param {number} [parameters.size=3] - attribute size
     * @param {Float32Array} [parameters.array=Float32Array] - attribute array
     * @param {number} [parameters.verticesUsed=1] - number of vertices used by this attribute, i.e. insert one for every X vertices
     */
    setAttribute({
      vertexBuffer = this.vertexBuffers[0],
      name,
      type = "vec3f",
      bufferFormat = "float32x3",
      size = 3,
      array = new Float32Array(this.verticesCount * size),
      verticesUsed = 1
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
      if (vertexBuffer.stepMode === "vertex" && this.verticesCount && this.verticesCount !== attributeCount * verticesUsed) {
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
        verticesUsed
      };
      vertexBuffer.bufferLength += attribute.bufferLength * verticesUsed;
      vertexBuffer.arrayStride += attribute.size;
      vertexBuffer.attributes.push(attribute);
    }
    /**
     * Get an attribute by name
     * @param name - name of the attribute to find
     * @returns - found [attribute]{@link VertexBufferAttribute} or null if not found
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
            const { name, size, array, verticesUsed } = vertexBuffer.attributes[j];
            for (let s = 0; s < size; s++) {
              const attributeValue = array[Math.floor(attributeIndex / verticesUsed) * size + s];
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
      this.#setWGSLFragment();
    }
    /**
     * Set the WGSL code snippet that will be appended to the vertex shader.
     * @private
     */
    #setWGSLFragment() {
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
      });
      this.vertexBuffers = [];
    }
  };

  // src/core/geometries/IndexedGeometry.ts
  var IndexedGeometry = class extends Geometry {
    /**
     * IndexedGeometry constructor
     * @param {GeometryParams} [parameters={}] - parameters used to create our IndexedGeometry
     * @param {GPUFrontFace} [parameters.verticesOrder="cw"] - vertices order to pass to the GPURenderPipeline
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     */
    constructor({
      verticesOrder = "cw",
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
     *
     * @param parameters - parameters used to create our index buffer
     * @param {GPUIndexFormat} [parameters.bufferFormat="uint32"]
     * @param {Uint32Array} [parameters.array=Uint32Array]
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
      super.destroy();
      this.indexBuffer?.buffer?.destroy();
      this.indexBuffer = null;
    }
  };

  // src/core/geometries/PlaneGeometry.ts
  var PlaneGeometry = class extends IndexedGeometry {
    /**
     * PlaneGeometry constructor
     * @param {PlaneGeometryParams} [parameters={}] - parameters used to create our PlaneGeometry
     * @param {number} [parameters.instancesCount=1] - number of instances to draw
     * @param {VertexBufferParams} [parameters.vertexBuffers=[]] - vertex buffers to use
     * @param {number} [parameters.widthSegments=1] - number of segments along the X axis
     * @param {number} [parameters.heightSegments=1] - number of segments along the Y axis
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
      this.setIndexArray();
      const verticesCount = this.definition.width * 2 + 2 + (this.definition.height - 1) * (this.definition.width + 1);
      const attributes = this.getIndexedVerticesAndUVs(verticesCount);
      Object.keys(attributes).forEach((attributeKey) => {
        this.setAttribute(attributes[attributeKey]);
      });
    }
    /**
     * Set our PlaneGeometry index array
     */
    setIndexArray() {
      const indexArray = new Uint32Array(this.definition.count * 6);
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
        array: indexArray
      });
    }
    /**
     * Compute the UV and position arrays based on our plane widthSegments and heightSegments values and return the corresponding attributes
     * @param verticesCount - [number of vertices]{@link Geometry#verticesCount} of our {@link PlaneGeometry}
     * @returns - our position and uv [attributes]{@link VertexBufferAttributeParams}
     */
    getIndexedVerticesAndUVs(verticesCount) {
      const uv = {
        name: "uv",
        type: "vec2f",
        bufferFormat: "float32x2",
        size: 2,
        bufferLength: verticesCount * 2,
        array: new Float32Array(verticesCount * 2)
      };
      const position = {
        name: "position",
        type: "vec3f",
        bufferFormat: "float32x3",
        // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
        size: 3,
        bufferLength: verticesCount * 3,
        array: new Float32Array(verticesCount * 3)
      };
      const normal = {
        name: "normal",
        type: "vec3f",
        bufferFormat: "float32x3",
        // nb of triangles * 3 vertices per triangle * 3 coordinates per triangle
        size: 3,
        bufferLength: verticesCount * 3,
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
  };

  // src/core/materials/RenderMaterial.ts
  var RenderMaterial = class extends Material {
    /**
     * RenderMaterial constructor
     * @param renderer - our renderer class object
     * @param parameters - parameters used to create our Material
     * @param {string} parameters.label - RenderMaterial label
     * @param {AllowedGeometries} parameters.geometry - geometry to draw
     * @param {boolean} parameters.useAsyncPipeline - whether the {@link RenderPipelineEntry} should be compiled asynchronously
     * @param {MaterialShaders} parameters.shaders - our RenderMaterial shader codes and entry points
     * @param {BindGroupInputs} parameters.inputs - our RenderMaterial {@link BindGroup} inputs
     * @param {BindGroup[]} parameters.bindGroups - already created {@link BindGroup} to use
     * @param {Sampler[]} parameters.samplers - array of {@link Sampler}
     * @param {RenderMaterialRenderingOptions} parameters.rendering - RenderMaterial rendering options to pass to the {@link RenderPipelineEntry}
     * @param {boolean} parameters.rendering.useProjection - whether to use the Camera bind group with this material
     * @param {boolean} parameters.rendering.transparent - impacts the {@link RenderPipelineEntry} blend properties
     * @param {boolean} parameters.rendering.depthWriteEnabled - whether to write to the depth buffer or not
     * @param {GPUCompareFunction} parameters.rendering.depthCompare - depth compare function to use
     * @param {GPUCullMode} parameters.rendering.cullMode - cull mode to use
     * @param {Geometry['verticesOrder']} parameters.rendering.verticesOrder - vertices order to use
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
  };

  // src/core/shaders/chunks/default_vs.wgsl.js
  var default_vs_wgsl_default = (
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

  // src/core/shaders/chunks/default_fs.wgsl.js
  var default_fs_wgsl_default = (
    /* wgsl */
    `
@fragment fn main() -> @location(0) vec4f {
  return vec4(0.0, 0.0, 0.0, 1.0);
}`
  );

  // src/core/meshes/MeshBaseMixin.ts
  var meshIndex = 0;
  var defaultMeshBaseParams = {
    // geometry
    geometry: new Geometry(),
    // material
    shaders: {},
    autoRender: true,
    useProjection: false,
    // rendering
    cullMode: "back",
    depthWriteEnabled: true,
    depthCompare: "less",
    transparent: false,
    visible: true,
    renderOrder: 0,
    // textures
    texturesOptions: {}
  };
  function MeshBaseMixin(Base) {
    return class MeshBase extends Base {
      /**
           * MeshBase constructor
           * @typedef MeshBaseParams
           * @property {string=} label - MeshBase label
           * @property {boolean=} autoRender - whether we should add this MeshBase to our {@link Scene} to let it handle the rendering process automatically
           * @property {AllowedGeometries} geometry - geometry to draw
           * @property {boolean=} useAsyncPipeline - whether the {@link RenderPipelineEntry} should be compiled asynchronously
           * @property {MaterialShaders} shaders - our MeshBase shader codes and entry points
           * @property {BindGroupInputs=} inputs - our MeshBase {@link BindGroup} inputs
           * @property {BindGroup[]=} bindGroups - already created {@link BindGroup} to use
           * @property {boolean=} transparent - impacts the {@link RenderPipelineEntry} blend properties
           * @property {GPUCullMode=} cullMode - cull mode to use
           * @property {boolean=} visible - whether this Mesh should be visible (drawn) or not
           * @property {number=} renderOrder - controls the order in which this Mesh should be rendered by our {@link Scene}
           * @property {RenderTarget=} renderTarget - {@link RenderTarget} to render onto if any
           * @property {ExternalTextureParams=} texturesOptions - textures options to apply
           * @property {Sampler[]=} samplers - array of {@link Sampler}
           *
           * @typedef MeshBaseArrayParams
           * @type {array}
           * @property {(Renderer|GPUCurtains)} 0 - our [renderer]{@link Renderer} class object
           * @property {(string|HTMLElement|null)} 1 - a DOM HTML Element that can be bound to a Mesh
           * @property {MeshBaseParams} 2 - [Mesh base parameters]{@link MeshBaseParams}
      
           * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
           */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultMeshBaseParams, ...params[2] }
        );
        /** Whether we should add this {@link MeshBase} to our {@link Scene} to let it handle the rendering process automatically */
        this.#autoRender = true;
        // callbacks / events
        /** function assigned to the [onReady]{@link MeshBase#onReady} callback */
        this._onReadyCallback = () => {
        };
        /** function assigned to the [onBeforeRender]{@link MeshBase#onBeforeRender} callback */
        this._onBeforeRenderCallback = () => {
        };
        /** function assigned to the [onRender]{@link MeshBase#onRender} callback */
        this._onRenderCallback = () => {
        };
        /** function assigned to the [onAfterRender]{@link MeshBase#onAfterRender} callback */
        this._onAfterRenderCallback = () => {
        };
        /** function assigned to the [onAfterResize]{@link MeshBase#onAfterResize} callback */
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
          this.#autoRender = autoRender;
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
      #autoRender;
      /**
       * Get private #autoRender value
       * @readonly
       */
      get autoRender() {
        return this.#autoRender;
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
       * Add a Mesh to the renderer and the {@link Scene}
       */
      addToScene() {
        this.renderer.meshes.push(this);
        if (this.#autoRender) {
          this.renderer.scene.addMesh(this);
        }
      }
      /**
       * Remove a Mesh from the renderer and the {@link Scene}
       */
      removeFromScene() {
        if (this.#autoRender) {
          this.renderer.scene.removeMesh(this);
        }
        this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
      }
      /**
       * Called when the [renderer device]{@link GPURenderer#device} has been lost to prepare everything for restoration.
       * Basically set all the {@link GPUBuffer} to null so they will be reset next time we try to draw the {@link MeshBase}
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
       * Called when the [renderer device]{@link GPURenderer#device} has been restored
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
              code: default_vs_wgsl_default,
              entryPoint: "main"
            },
            fragment: {
              code: default_fs_wgsl_default,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: default_vs_wgsl_default,
              entryPoint: "main"
            };
          }
          if (!shaders.fragment || !shaders.fragment.code) {
            shaders.fragment = {
              code: default_fs_wgsl_default,
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
                label: this.options.label + ": Vertex buffer vertices",
                size: vertexBuffer.array.byteLength,
                usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
              });
              this.renderer.queueWriteBuffer(vertexBuffer.buffer, 0, vertexBuffer.array);
            }
          });
          if ("indexBuffer" in this.geometry && this.geometry.indexBuffer && !this.geometry.indexBuffer.buffer) {
            this.geometry.indexBuffer.buffer = this.renderer.createBuffer({
              label: this.options.label + ": Index buffer vertices",
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
       * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
       */
      setMaterial(meshParameters) {
        this.transparent = meshParameters.transparent;
        this.setShaders();
        this.material = new RenderMaterial(this.renderer, meshParameters);
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
       * Get our [render material textures array]{@link RenderMaterial#textures}
       * @readonly
       */
      get textures() {
        return this.material?.textures || [];
      }
      /**
       * Get our [render material render textures array]{@link RenderMaterial#renderTextures}
       * @readonly
       */
      get renderTextures() {
        return this.material?.renderTextures || [];
      }
      /**
       * Create a new {@link Texture}
       * @param options - [Texture options]{@link TextureParams}
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
       * @param  options - [RenderTexture options]{@link RenderTextureParams}
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
       * Assign or remove a {@link RenderTarget} to this Mesh
       * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
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
       * Resize the Mesh's render textures only if they're not storage textures
       */
      resizeRenderTextures() {
        this.renderTextures?.filter((renderTexture) => renderTexture.options.usage === "texture").forEach((renderTexture) => renderTexture.resize());
      }
      /**
       * Resize the Mesh's textures
       * @param boundingRect
       */
      resize(boundingRect = null) {
        this.resizeRenderTextures();
        if (super.resize) {
          super.resize(boundingRect);
        }
        this.textures?.forEach((texture) => {
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
       * - Execute [onBeforeRenderPass]{@link MeshBase#onBeforeRenderPass}
       * - Stop here if [renderer]{@link Renderer} is not ready or Mesh is not [visible]{@link MeshBase#visible}
       * - Execute super render call if it exists
       * - [Render]{@link MeshBase#onRenderPass} our {@link RenderMaterial} and geometry
       * - Execute [onAfterRenderPass]{@link MeshBase#onAfterRenderPass}
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
       * Remove the Mesh from the {@link Scene} and destroy it
       */
      remove() {
        this.removeFromScene();
        this.destroy();
      }
      /**
       * Destroy the Mesh
       */
      destroy() {
        if (super.destroy) {
          super.destroy();
        }
        this.material?.destroy();
        this.geometry?.destroy();
      }
    };
  }
  var MeshBaseMixin_default = MeshBaseMixin;

  // src/utils/ResizeManager.ts
  var ResizeManager = class {
    /**
     * ResizeManager constructor
     */
    constructor() {
      this.shouldWatch = true;
      this.entries = [];
      this.resizeObserver = new ResizeObserver((observedEntries) => {
        observedEntries.forEach((observedEntry) => {
          const entry = this.entries.find((e) => e.element.isSameNode(observedEntry.target));
          if (entry && entry.callback) {
            entry.callback();
          }
        });
      });
    }
    /**
     * Set [shouldWatch]{@link ResizeManager#shouldWatch}
     * @param shouldWatch - whether to watch or not
     */
    useObserver(shouldWatch = true) {
      this.shouldWatch = shouldWatch;
    }
    /**
     * Track an [element]{@link HTMLElement} size change and execute a callback function when it happens
     * @param entry - [entry]{@link ResizeManagerEntry} to watch
     */
    observe({ element, callback }) {
      if (!element || !this.shouldWatch)
        return;
      this.resizeObserver.observe(element);
      const entry = {
        element,
        callback
      };
      this.entries.push(entry);
    }
    /**
     * Unobserve an [element]{@link HTMLElement} and remove it from our [entries array]{@link ResizeManager#entries}
     * @param element - [element]{@link HTMLElement} to unobserve
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
  };
  var resizeManager = new ResizeManager();

  // src/core/DOM/DOMElement.ts
  var DOMElement = class {
    /**
     * DOMElement constructor
     * @param parameters - parameters used to create our DOMElement
     * @param {HTMLElement=} parameters.element - DOM HTML element to track
     * @param {function=} parameters.onSizeChanged - callback to run when element's size changed
     * @param {function=} parameters.onPositionChanged - callback to run when element's position changed
     */
    constructor({
      element = document.body,
      onSizeChanged = (boundingRect = null) => {
      },
      onPositionChanged = (boundingRect = null) => {
      }
    } = {}) {
      /** Timeout ID to throttle our resize events */
      this.#throttleResize = null;
      if (typeof element === "string") {
        this.element = document.querySelector(element);
        if (!this.element) {
          const notFoundEl = typeof element === "string" ? `'${element}' selector` : `${element} HTMLElement`;
          throwError(`DOMElement: corresponding ${notFoundEl} not found.`);
        }
      } else {
        this.element = element;
      }
      this.isResizing = false;
      this.onSizeChanged = onSizeChanged;
      this.onPositionChanged = onPositionChanged;
      this.resizeManager = resizeManager;
      this.resizeManager.observe({
        element: this.element,
        callback: () => {
          this.setSize();
        }
      });
      this.setSize();
    }
    #throttleResize;
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
     * Get or set our element's bounding rectangle
     * @readonly
     */
    get boundingRect() {
      return this._boundingRect;
    }
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
      this.isResizing = !!this.boundingRect;
      this.boundingRect = boundingRect ?? this.element.getBoundingClientRect();
      this.#throttleResize = setTimeout(() => {
        this.isResizing = false;
        this.#throttleResize = null;
      }, 50);
    }
    /**
     * Destroy our DOMElement - remove from resize observer and clear throttle timeout
     */
    destroy() {
      this.resizeManager.unobserve(this.element);
      if (this.#throttleResize) {
        clearTimeout(this.#throttleResize);
      }
    }
  };

  // src/utils/CacheManager.ts
  var CacheManager = class {
    /**
     * CacheManager constructor
     */
    constructor() {
      this.planeGeometries = [];
    }
    /**
     * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition id]{@link PlaneGeometry#definition.id}
     * @param planeGeometry - [plane geometry]{@link PlaneGeometry} to check
     * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometry(planeGeometry) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id);
    }
    /**
     * Check if a given [plane geometry]{@link PlaneGeometry} is already cached based on its [definition]{@link PlaneGeometry#definition}
     * @param planeGeometryID - [plane geometry definition id]{@link PlaneGeometry#definition.id}
     * @returns - [plane geometry]{@link PlaneGeometry} found or null if not found
     */
    getPlaneGeometryByID(planeGeometryID) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometryID);
    }
    /**
     * Add a [plane geometry]{@link PlaneGeometry} to our cache [plane geometries array]{@link CacheManager#planeGeometries}
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
  };
  var cacheManager = new CacheManager();

  // src/core/meshes/FullscreenPlane.ts
  var FullscreenPlane = class extends MeshBaseMixin_default(class {
  }) {
    /**
     * FullscreenPlane constructor
     * @param renderer- [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link FullscreenPlane}
     * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link FullscreenPlane}
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
          width: 0,
          height: 0,
          top: 0,
          left: 0
        }
      };
      this.domElement = new DOMElement({
        element: this.renderer.domElement.element,
        onSizeChanged: (boundingRect) => this.resize(boundingRect)
      });
      this.type = "FullscreenQuadMesh";
    }
    /**
     * Resize our FullscreenPlane
     * @param boundingRect - the new bounding rectangle
     */
    resize(boundingRect = null) {
      if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
        return;
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
      super.resize(boundingRect);
    }
    /**
     * Take the pointer [vector]{@link Vec2} position relative to the document and returns it relative to our {@link FullscreenPlane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer [vector]{@link Vec2} coordinates
     * @returns - the mapped [vector]{@link Vec2} coordinates in the [-1, 1] range
     */
    mouseToPlaneCoords(mouseCoords = new Vec2()) {
      return new Vec2(
        (mouseCoords.x - this.size.document.left) / this.size.document.width * 2 - 1,
        1 - (mouseCoords.y - this.size.document.top) / this.size.document.height * 2
      );
    }
  };

  // src/core/objects3D/ProjectedObject3D.ts
  var ProjectedObject3D = class extends Object3D {
    /**
     * ProjectedObject3D constructor
     * @param renderer - our renderer class object
     */
    // TODO just use the Camera instead?
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
     * Get/set our model view matrix
     * @readonly
     */
    get modelViewMatrix() {
      return this.matrices.modelView.matrix;
    }
    set modelViewMatrix(value) {
      this.matrices.modelView.matrix = value;
      this.matrices.modelView.shouldUpdate = true;
    }
    /**
     * Get our camera view matrix
     * @readonly
     */
    get viewMatrix() {
      return this.camera.viewMatrix;
    }
    /**
     * Get our camera projection matrix
     * @readonly
     */
    get projectionMatrix() {
      return this.camera.projectionMatrix;
    }
    /**
     * Get/set our model view projection matrix
     * @readonly
     */
    get modelViewProjectionMatrix() {
      return this.matrices.modelViewProjection.matrix;
    }
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
    updateSizePositionAndProjection() {
      this.shouldUpdateModelMatrix();
      this.shouldUpdateProjectionMatrixStack();
    }
  };

  // src/core/shaders/chunks/default_projected_vs.wgsl.js
  var default_projected_vs_wgsl_default = (
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

  // src/core/shaders/chunks/default_normal_fs.wgsl.js
  var default_normal_fs_wgsl_default = (
    /* wgsl */
    `
struct VSOutput {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
  @location(1) normal: vec3f,
};

@fragment fn main(fsInput: VSOutput) -> @location(0) vec4f {
  // normals
  return vec4(fsInput.normal * 0.5 + 0.5, 1.0);
}`
  );

  // src/core/meshes/MeshTransformedMixin.ts
  var defaultTransformedMeshParams = {
    //useProjection: true,
    // frustum culling and visibility
    frustumCulled: true,
    DOMFrustumMargins: {
      top: 0,
      right: 0,
      bottom: 0,
      left: 0
    }
  };
  function MeshTransformedMixin(Base) {
    return class MeshTransformedBase extends MeshBaseMixin_default(Base) {
      /**
           * MeshTransformedBase constructor
           * @typedef {TransformedMeshParameters} TransformedMeshBaseParameters
           * @extends MeshBaseParams
           * @property {boolean} frustumCulled - whether to use frustum culling
           * @property {RectCoords} DOMFrustumMargins - frustum margins to apply when frustum culling
           *
           * @typedef MeshBaseArrayParams
           * @type {array}
           * @property {(CameraRenderer|GPUCurtains)} 0 - our renderer class object
           * @property {(string|HTMLElement|null)} 1 - the DOM HTML Element that can be bound to a Mesh
           * @property {TransformedMeshParameters} 2 - Mesh parameters
      
           * @param {MeshBaseArrayParams} params - our MeshBaseMixin parameters
           */
      constructor(...params) {
        super(
          params[0],
          params[1],
          { ...defaultTransformedMeshParams, ...params[2], ...{ useProjection: true } }
        );
        // callbacks / events
        /** function assigned to the [onReEnterView]{@link MeshTransformedBaseClass#onReEnterView} callback */
        this._onReEnterViewCallback = () => {
        };
        /** function assigned to the [onLeaveView]{@link MeshTransformedBaseClass#onLeaveView} callback */
        this._onLeaveViewCallback = () => {
        };
        let renderer = params[0];
        const parameters = {
          ...defaultTransformedMeshParams,
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
        this.updateSizePositionAndProjection();
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
              code: default_projected_vs_wgsl_default,
              entryPoint: "main"
            },
            fragment: {
              code: default_normal_fs_wgsl_default,
              entryPoint: "main"
            }
          };
        } else {
          if (!shaders.vertex || !shaders.vertex.code) {
            shaders.vertex = {
              code: default_projected_vs_wgsl_default,
              entryPoint: "main"
            };
          }
          if (!shaders.fragment || !shaders.fragment.code) {
            shaders.fragment = {
              code: default_normal_fs_wgsl_default,
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
       * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
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
       * Resize our {@link MeshTransformedBaseClass}
       * @param boundingRect - the new bounding rectangle
       */
      resize(boundingRect = null) {
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
        return this.domFrustum?.projectedBoundingRect;
      }
      /**
       * Tell the model and projection matrices to update.
       * Here because else typescript is confused
       */
      updateSizePositionAndProjection() {
        super.updateSizePositionAndProjection();
      }
      /**
       * Update the model and projection matrices if needed.
       * Here because else typescript is confused
       */
      updateMatrixStack() {
        super.updateMatrixStack();
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
       * @param callback - callback to run when {@link MeshTransformedBaseClass} is reentering the view frustum
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
       * @param callback - callback to run when {@link MeshTransformedBaseClass} is leaving the view frustum
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
       * Finally we call [Mesh base onBeforeRenderPass]{@link MeshBaseClass#onBeforeRenderPass} super
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
  var MeshTransformedMixin_default = MeshTransformedMixin;

  // src/core/meshes/Mesh.ts
  var Mesh = class extends MeshTransformedMixin_default(ProjectedObject3D) {
    constructor(renderer, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isCameraRenderer(renderer, parameters.label ? parameters.label + " Mesh" : "Mesh");
      super(renderer, null, parameters);
      this.type = "Mesh";
    }
  };

  // src/core/pipelines/PipelineEntry.ts
  var pipelineId = 0;
  var PipelineEntry = class {
    /**
     * PipelineEntry constructor
     * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link PipelineEntry}
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
     * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready, i.e. successfully compiled
     * @readonly
     */
    get ready() {
      return !this.status.compiling && this.status.compiled && !this.status.error;
    }
    /**
     * Get whether the [pipeline]{@link PipelineEntry#pipeline} is ready to be compiled, i.e. we have already not already tried to compile it, and it's not currently compiling neither
     * @readonly
     */
    get canCompile() {
      return !this.status.compiling && !this.status.compiled && !this.status.error;
    }
    /**
     * Set our [pipeline entry bind groups]{@link PipelineEntry#bindGroups}
     * @param bindGroups - [bind groups]{@link Material#bindGroups} to use with this {@link PipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = bindGroups;
    }
    /* SHADERS */
    /**
     * Create a {@link GPUShaderModule}
     * @param parameters - Parameters used
     * @param parameters.code - patched WGSL code string
     * @param parameters.type - [shader type]{@link MaterialShadersType}
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
     * Create the [pipeline entry layout]{@link PipelineEntry#layout}
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
     * Flush a {@link PipelineEntry}, i.e. reset its [bind groups]{@link PipelineEntry#bindGroups}, [layout]{@link PipelineEntry#layout} and descriptor and recompile the [pipeline]{@link PipelineEntry#pipeline}
     * Used when one of the bind group or rendering property has changed
     * @param newBindGroups - new [bind groups]{@link PipelineEntry#bindGroups} in case they have changed
     */
    flushPipelineEntry(newBindGroups = []) {
      this.status.compiling = false;
      this.status.compiled = false;
      this.status.error = null;
      this.setPipelineEntryBindGroups(newBindGroups);
      this.compilePipelineEntry();
    }
    /**
     * Set up a [pipeline]{@link PipelineEntry#pipeline} by creating the shaders, the [layout]{@link PipelineEntry#layout} and the descriptor
     */
    compilePipelineEntry() {
      this.status.compiling = true;
      this.createShaders();
      this.createPipelineLayout();
      this.createPipelineDescriptor();
    }
  };

  // src/core/shaders/chunks/get_output_position.wgsl.js
  var get_output_position_wgsl_default = (
    /* wgsl */
    `
fn getOutputPosition(camera: Camera, matrices: Matrices, position: vec3f) -> vec4f {
  return camera.projection * matrices.modelView * vec4f(position, 1.0);
}`
  );

  // src/core/shaders/chunks/get_uv_cover.wgsl.js
  var get_uv_cover_wgsl_default = (
    /* wgsl */
    `
fn getUVCover(uv: vec2f, textureMatrix: mat4x4f) -> vec2f {
  return (textureMatrix * vec4f(uv, 0.0, 1.0)).xy;
}`
  );

  // src/core/shaders/chunks/get_vertex_to_uv_coords.wgsl.js
  var get_vertex_to_uv_coords_wgsl_default = (
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

  // src/core/shaders/ShaderChunks.ts
  var ShaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Applies given texture matrix to given uv coordinates */
      get_uv_cover: get_uv_cover_wgsl_default
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {
      /** Applies given texture matrix to given uv coordinates */
      get_uv_cover: get_uv_cover_wgsl_default,
      /** Convert vertex position to uv coordinates */
      get_vertex_to_uv_coords: get_vertex_to_uv_coords_wgsl_default
    }
  };
  var ProjectedShaderChunks = {
    /** WGSL code chunks added to the vertex shader */
    vertex: {
      /** Get output vec4f position vector by applying model view projection matrix to vec3f attribute position vector */
      get_output_position: get_output_position_wgsl_default
    },
    /** WGSL code chunks added to the fragment shader */
    fragment: {}
  };

  // src/core/pipelines/RenderPipelineEntry.ts
  var RenderPipelineEntry = class extends PipelineEntry {
    /**
     * RenderPipelineEntry constructor
     * @param parameters - [parameters]{@link RenderPipelineEntryParams} used to create this {@link RenderPipelineEntry}
     */
    constructor(parameters) {
      let { renderer } = parameters;
      const {
        label,
        cullMode,
        depthWriteEnabled,
        depthCompare,
        transparent,
        verticesOrder,
        topology,
        blend,
        useProjection
      } = parameters;
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
          code: "",
          module: null
          // TODO useless?
        }
      };
      this.descriptor = null;
      this.options = {
        ...this.options,
        cullMode,
        depthWriteEnabled,
        depthCompare,
        transparent,
        verticesOrder,
        topology,
        blend,
        useProjection
      };
    }
    // TODO!
    // need to chose whether we should silently add the camera bind group here
    // or explicitly in the RenderMaterial class createBindGroups() method
    /**
     * Merge our [pipeline entry bind groups]{@link RenderPipelineEntry#bindGroups} with the [camera bind group]{@link CameraRenderer#cameraBindGroup} if needed and set them
     * @param bindGroups - [bind groups]{@link RenderMaterial#bindGroups} to use with this {@link RenderPipelineEntry}
     */
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = "cameraBindGroup" in this.renderer && this.options.useProjection ? [this.renderer.cameraBindGroup, ...bindGroups] : bindGroups;
    }
    /**
     * Set {@link RenderPipelineEntry} properties (in this case the [bind groups]{@link RenderPipelineEntry#bindGroups} and [attributes]{@link RenderPipelineEntry#attributes})
     * @param parameters - the [bind groups]{@link RenderMaterial#bindGroups} and [attributes]{@link RenderMaterial#attributes} to use
     */
    setPipelineEntryProperties(parameters) {
      const { attributes, bindGroups } = parameters;
      this.attributes = attributes;
      this.setPipelineEntryBindGroups(bindGroups);
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the necessary shader chunks, [bind groups]{@link RenderPipelineEntry#bindGroups}) and [attributes]{@link RenderPipelineEntry#attributes} WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
     */
    patchShaders() {
      this.shaders.vertex.head = "";
      this.shaders.vertex.code = "";
      this.shaders.fragment.head = "";
      this.shaders.fragment.code = "";
      for (const chunk in ShaderChunks.vertex) {
        this.shaders.vertex.head = `${ShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
      }
      for (const chunk in ShaderChunks.fragment) {
        this.shaders.fragment.head = `${ShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
      }
      if (this.options.useProjection) {
        for (const chunk in ProjectedShaderChunks.vertex) {
          this.shaders.vertex.head = `${ProjectedShaderChunks.vertex[chunk]}
${this.shaders.vertex.head}`;
        }
        for (const chunk in ProjectedShaderChunks.fragment) {
          this.shaders.fragment.head = `${ProjectedShaderChunks.fragment[chunk]}
${this.shaders.fragment.head}`;
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
      });
      this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
      this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
      this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
      this.shaders.full.code = this.shaders.vertex.code + "\n" + this.shaders.fragment.code;
    }
    /* SETUP */
    /**
     * Create the [shaders]{@link RenderPipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      this.shaders.vertex.module = this.createShaderModule({
        code: this.shaders.vertex.code,
        type: "vertex"
      });
      this.shaders.fragment.module = this.createShaderModule({
        code: this.shaders.fragment.code,
        type: "fragment"
      });
    }
    /**
     * Create the [render pipeline descriptor]{@link RenderPipelineEntry#descriptor}
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
              format: this.renderer.preferredFormat,
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
        depthStencil: {
          depthWriteEnabled: this.options.depthWriteEnabled,
          depthCompare: this.options.depthCompare,
          format: "depth24plus"
        },
        ...this.renderer.sampleCount > 1 && {
          multisample: {
            count: this.renderer.sampleCount
          }
        }
      };
    }
    /**
     * Create the [render pipeline]{@link RenderPipelineEntry#pipeline}
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
     * Asynchronously create the [render pipeline]{@link RenderPipelineEntry#pipeline}
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
     * Call [super compilePipelineEntry]{@link PipelineEntry#compilePipelineEntry} method, then create our [render pipeline]{@link RenderPipelineEntry#pipeline}
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
  };

  // src/core/pipelines/ComputePipelineEntry.ts
  var ComputePipelineEntry = class extends PipelineEntry {
    /**
     * ComputePipelineEntry constructor
     * @param parameters - [parameters]{@link PipelineEntryParams} used to create this {@link ComputePipelineEntry}
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
     * Set {@link ComputePipelineEntry} properties (in this case the [bind groups]{@link ComputePipelineEntry#bindGroups})
     * @param parameters - the [bind groups]{@link ComputeMaterial#bindGroups} to use
     */
    setPipelineEntryProperties(parameters) {
      const { bindGroups } = parameters;
      this.setPipelineEntryBindGroups(bindGroups);
    }
    /* SHADERS */
    /**
     * Patch the shaders by appending all the [bind groups]{@link ComputePipelineEntry#bindGroups}) WGSL code fragments to the given [parameter shader code]{@link PipelineEntryParams#shaders}
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
     * Create the [shaders]{@link ComputePipelineEntry#shaders}: patch them and create the {@link GPUShaderModule}
     */
    createShaders() {
      this.patchShaders();
      this.shaders.compute.module = this.createShaderModule({
        code: this.shaders.compute.code,
        type: "compute"
      });
    }
    /**
     * Create the [compute pipeline descriptor]{@link ComputePipelineEntry#descriptor}
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
     * Create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
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
     * Asynchronously create the [compute pipeline]{@link ComputePipelineEntry#pipeline}
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
     * Call [super compilePipelineEntry]{@link PipelineEntry#compilePipelineEntry} method, then create our [compute pipeline]{@link ComputePipelineEntry#pipeline}
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
  };

  // src/core/pipelines/PipelineManager.ts
  var PipelineManager = class {
    constructor({ renderer }) {
      this.type = "PipelineManager";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.currentPipelineIndex = null;
      this.pipelineEntries = [];
    }
    /**
     * Checks if the provided [parameters]{@link RenderPipelineEntryBaseParams} belongs to an already created {@link RenderPipelineEntry}.
     * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
     * @returns - the found {@link RenderPipelineEntry}, or null if not found
     */
    isSameRenderPipeline(parameters) {
      const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, topology } = parameters;
      return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry instanceof RenderPipelineEntry).find((pipelineEntry) => {
        const { options } = pipelineEntry;
        return shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 && shaders.vertex.entryPoint === options.shaders.vertex.entryPoint && shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 && shaders.fragment.entryPoint === options.shaders.fragment.entryPoint && cullMode === options.cullMode && depthWriteEnabled === options.depthWriteEnabled && depthCompare === options.depthCompare && transparent === options.transparent && verticesOrder === options.verticesOrder && topology === options.topology;
      });
    }
    /**
     * Check if a {@link RenderPipelineEntry} has already been created with the given [parameters]{@link RenderPipelineEntryBaseParams}.
     * Use it if found, else create a new one and add it to the [pipelineEntries]{@link PipelineManager#pipelineEntries} array.
     * @param parameters - [RenderPipelineEntry parameters]{@link RenderPipelineEntryBaseParams}
     * @returns - {@link RenderPipelineEntry}, either from cache or newly created
     */
    createRenderPipeline(parameters) {
      const existingPipelineEntry = this.isSameRenderPipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new RenderPipelineEntry({
          renderer: this.renderer,
          ...parameters
        });
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Checks if the provided [parameters]{@link PipelineEntryBaseParams} belongs to an already created {@link ComputePipelineEntry}.
     * @param parameters - [ComputePipelineEntry parameters]{@link PipelineEntryBaseParams}
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
     * Create a new {@link ComputePipelineEntry}
     * @param parameters - [PipelineEntry parameters]{@link PipelineEntryBaseParams}
     * @returns - newly created {@link ComputePipelineEntry}
     */
    createComputePipeline(parameters) {
      const existingPipelineEntry = this.isSameComputePipeline(parameters);
      if (existingPipelineEntry) {
        return existingPipelineEntry;
      } else {
        const pipelineEntry = new ComputePipelineEntry({
          renderer: this.renderer,
          ...parameters
        });
        this.pipelineEntries.push(pipelineEntry);
        return pipelineEntry;
      }
    }
    /**
     * Check if the given [pipeline entry]{@link AllowedPipelineEntries} is already set, if not set it
     * @param pass - current pass encoder
     * @param pipelineEntry - the [pipeline entry]{@link AllowedPipelineEntries} to set
     */
    setCurrentPipeline(pass, pipelineEntry) {
      if (pipelineEntry.index !== this.currentPipelineIndex) {
        pass.setPipeline(pipelineEntry.pipeline);
        this.currentPipelineIndex = pipelineEntry.index;
      }
    }
    /**
     * Reset the [current pipeline index]{@link PipelineManager#currentPipelineIndex} so the next [pipeline entry]{@link AllowedPipelineEntries} will be set for sure
     */
    resetCurrentPipeline() {
      this.currentPipelineIndex = null;
    }
  };

  // src/curtains/objects3D/DOMObject3D.ts
  var DOMObject3D = class extends ProjectedObject3D {
    /**
     * DOMObject3D constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMObject3D}
     * @param parameters - [parameters]{@link DOMObject3DParams} used to create this {@link DOMObject3D}
     */
    constructor(renderer, element, parameters) {
      super(renderer);
      /** Private [vector]{@link Vec3} used to keep track of the actual [world position]{@link DOMObject3DTransforms#position.world} accounting the [additional document translation]{@link DOMObject3DTransforms#position.document} converted into world space */
      this.#DOMObjectWorldPosition = new Vec3();
      /** Private [vector]{@link Vec3} used to keep track of the actual {@link DOMObject3D} world scale accounting the [DOMObject3D world size]{@link DOMObject3D#size.world} */
      this.#DOMObjectWorldScale = new Vec3();
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
    #DOMObjectWorldPosition;
    #DOMObjectWorldScale;
    /**
     * Set the [DOMElement]{@link DOMObject3D#domElement}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector to use
     */
    setDOMElement(element) {
      this.domElement = new DOMElement({
        element,
        onSizeChanged: (boundingRect) => this.resize(boundingRect),
        onPositionChanged: (boundingRect) => {
          if (this.watchScroll) {
            this.size.document = boundingRect;
            this.updateSizeAndPosition();
          }
        }
      });
    }
    /**
     * Reset the [DOMElement]{@link DOMObject3D#domElement}
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
      super.updateSizeAndPosition();
    }
    /**
     * Update the {@link DOMObject3D} sizes, position and projection
     */
    updateSizePositionAndProjection() {
      this.updateSizeAndPosition();
      super.updateSizePositionAndProjection();
    }
    /**
     * Resize the {@link DOMObject3D}
     * @param boundingRect - new [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    resize(boundingRect = null) {
      if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
        return;
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
      this.updateSizePositionAndProjection();
    }
    /* BOUNDING BOXES GETTERS */
    /**
     * Get the [DOM Element]{@link DOMObject3D#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     * @readonly
     */
    get boundingRect() {
      return this.domElement.boundingRect;
    }
    /* TRANSFOMS */
    /**
     * Set our transforms properties and [onChange]{@link Vec3#onChange} callbacks
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
     * Get/set the [additional translation relative to the document]{@link DOMObject3DTransforms#position.document}
     */
    get documentPosition() {
      return this.transforms.position.document;
    }
    set documentPosition(value) {
      this.transforms.position.document = value;
      this.applyPosition();
    }
    /**
     * Get the [DOMObject3D DOM element]{@link DOMObject3D#domElement} scale in world space
     */
    get DOMObjectWorldScale() {
      return this.#DOMObjectWorldScale.clone();
    }
    /**
     * Get the {@link DOMObject3D} scale in world space (accounting for [scale]{@link DOMObject3D#scale})
     */
    get worldScale() {
      return this.DOMObjectWorldScale.multiply(this.scale);
    }
    /**
     * Get the {@link DOMObject3D} position in world space
     */
    get worldPosition() {
      return this.#DOMObjectWorldPosition.clone();
    }
    /**
     * Get/set the {@link DOMObject3D} transform origin relative to the {@link DOMObject3D}
     */
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    set transformOrigin(value) {
      this.transforms.origin.model = value;
      this.setWorldTransformOrigin();
    }
    /**
     * Get/set the {@link DOMObject3D} transform origin in world space
     */
    get worldTransformOrigin() {
      return this.transforms.origin.world;
    }
    set worldTransformOrigin(value) {
      this.transforms.origin.world = value;
    }
    /**
     * Set the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} using its world position and document translation converted to world space
     */
    applyPosition() {
      this.applyDocumentPosition();
      super.applyPosition();
    }
    /**
     * Compute the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} using its world position and document translation converted to world space
     */
    applyDocumentPosition() {
      let worldPosition = new Vec3(0, 0, 0);
      if (!this.documentPosition.equals(worldPosition)) {
        worldPosition = this.documentToWorldSpace(this.documentPosition);
      }
      this.#DOMObjectWorldPosition.set(
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
     * Update the [model matrix]{@link DOMObject3D#modelMatrix} accounting the [DOMObject3D world position]{@link DOMObject3D##DOMObjectWorldPosition} and [DOMObject3D world scale]{@link DOMObject3D##DOMObjectWorldScale}
     */
    updateModelMatrix() {
      this.modelMatrix.composeFromOrigin(
        this.#DOMObjectWorldPosition,
        this.quaternion,
        this.scale,
        this.worldTransformOrigin
      );
      this.modelMatrix.scale(this.#DOMObjectWorldScale);
    }
    /**
     * Convert a document position [vector]{@link Vec3} to a world position [vector]{@link Vec3}
     * @param vector - document position [vector]{@link Vec3} converted to world space
     */
    documentToWorldSpace(vector = new Vec3()) {
      return new Vec3(
        vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.screenRatio.width,
        -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.screenRatio.height,
        vector.z
      );
    }
    /**
     * Set the [DOMOBject3D world size]{@link DOMObject3D#size.world} and set the {@link DOMObject3D} world transform origin
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
      this.#DOMObjectWorldScale.set(this.size.world.width, this.size.world.height, 1);
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
     * Update the [DOMOBject3D DOMElement]{@link DOMObject3D#domElement} scroll position
     * @param delta - last [scroll delta values]{@link ScrollManager#delta}
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
      this.domElement?.destroy();
    }
  };

  // src/curtains/meshes/DOMMesh.ts
  var defaultDOMMeshParams = {
    autoloadSources: true,
    watchScroll: true
  };
  var DOMMesh = class extends MeshTransformedMixin_default(DOMObject3D) {
    /**
     * DOMMesh constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link DOMMesh}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link DOMMesh}
     * @param parameters - [parameters]{@link DOMMeshParams} used to create this {@link DOMMesh}
     */
    constructor(renderer, element, parameters) {
      super(renderer, element, { ...defaultDOMMeshParams, ...parameters });
      // callbacks / events
      /** function assigned to the [onLoading]{@link DOMMesh#onLoading} callback */
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
     * Get/set whether our [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready
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
     * Get whether our {@link DOMMesh} is ready. A {@link DOMMesh} is ready when its [sources are ready]{@link DOMMesh#sourcesReady} and its [material]{@link DOMMesh#material} and [geometry]{@link DOMMesh#geometry} are ready.
     * @readonly
     */
    get DOMMeshReady() {
      return this.ready && this.sourcesReady;
    }
    /**
     * Add a {@link DOMMesh} to the renderer and the {@link Scene}
     */
    addToScene() {
      super.addToScene();
      this.renderer.domMeshes.push(this);
    }
    /**
     * Remove a {@link DOMMesh} from the renderer and the {@link Scene}
     */
    removeFromScene() {
      super.removeFromScene();
      this.renderer.domMeshes = this.renderer.domMeshes.filter(
        (m) => m.uuid !== this.uuid
      );
    }
    /**
     * Load initial {@link DOMMesh} sources if needed and create associated [textures]{@link Texture}
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
     * Reset/change a [DOMMesh element]{@link DOMMesh#domElement}
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
     * Get our [DOM Element]{@link DOMMesh#domElement} [bounding rectangle]{@link DOMElement#boundingRect} accounting for current [pixel ratio]{@link GPURenderer#pixelRatio}
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
     * @param  options - [RenderTexture options]{@link RenderTextureParams}
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
      this.renderTextures?.filter((renderTexture) => renderTexture.options.usage === "texture").forEach(
        (renderTexture) => renderTexture.resize({ width: this.pixelRatioBoundingRect.width, height: this.pixelRatioBoundingRect.height })
      );
    }
    /* EVENTS */
    /**
     * Called each time one of the initial sources associated [texture]{@link Texture} has been uploaded to the GPU
     * @param callback - callback to call each time a [texture]{@link Texture} has been uploaded to the GPU
     * @returns - our {@link DOMMesh}
     */
    onLoading(callback) {
      if (callback) {
        this._onLoadingCallback = callback;
      }
      return this;
    }
  };

  // src/curtains/meshes/Plane.ts
  var defaultPlaneParams = {
    label: "Plane",
    // geometry
    //widthSegments: 1,
    //heightSegments: 1,
    instancesCount: 1,
    vertexBuffers: []
  };
  var Plane = class extends DOMMesh {
    /**
     * Plane constructor
     * @param renderer - [Curtains renderer]{@link GPUCurtainsRenderer} object or {@link GPUCurtains} class object used to create this {@link Plane}
     * @param element - {@link HTMLElement} or string representing an {@link HTMLElement} selector used to scale and position the {@link Plane}
     * @param parameters - [parameters]{@link PlaneParams} used to create this {@link Plane}
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
     * Take the pointer [vector]{@link Vec2} position relative to the document and returns it relative to our {@link Plane}
     * It ranges from -1 to 1 on both axis
     * @param mouseCoords - pointer [vector]{@link Vec2} coordinates
     * @returns - raycasted [vector]{@link Vec2} coordinates relative to the {@link Plane}
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
  };

  // src/core/scenes/Scene.ts
  var Scene = class {
    /**
     * Scene constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link Scene}
     */
    constructor({ renderer }) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "Scene");
      this.renderer = renderer;
      this.computePassEntries = [];
      this.renderPassEntries = {
        /** Array of [render pass entries]{@link RenderPassEntry} that will handle [ping pong planes]{@link PingPongPlane}. Each [ping pong plane]{@link PingPongPlane} will be added as a distinct [render pass entry]{@link RenderPassEntry} here */
        pingPong: [],
        /** Array of [render pass entries]{@link RenderPassEntry} that will render to a specific [render target]{@link RenderTarget}. Each [render target]{@link RenderTarget} will be added as a distinct [render pass entry]{@link RenderPassEntry} here */
        renderTarget: [],
        /** Array of [render pass entries]{@link RenderPassEntry} that will render directly to the screen. Our first entry will contain all the Meshes that do not have any [render target]{@link RenderTarget} assigned. Following entries will be created for every global [post processing passes]{@link ShaderPass} */
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
     * Add a [compute pass]{@link ComputePass} to our scene [computePassEntries array]{@link Scene#computePassEntries}
     * @param computePass - [compute pass]{@link ComputePass} to add
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
     * Remove a [compute pass]{@link ComputePass} from our scene [computePassEntries array]{@link Scene#computePassEntries}
     * @param computePass - [compute pass]{@link ComputePass} to remove
     */
    removeComputePass(computePass) {
      this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
    }
    /**
     * Add a [render target]{@link RenderTarget} to our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
     * Every Meshes later added to this [render target]{@link RenderTarget} will be rendered to the [render target render texture]{@link RenderTarget#renderTexture} using the [render target render pass descriptor]{@link RenderTarget#renderPass.descriptor}
     * @param renderTarget - [render target]{@link RenderTarget} to add
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
     * Remove a [render target]{@link RenderTarget} from our scene [renderPassEntries renderTarget array]{@link Scene#renderPassEntries.renderTarget}.
     * @param renderTarget - [render target]{@link RenderTarget} to add
     */
    removeRenderTarget(renderTarget) {
      this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
        (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
      );
    }
    /**
     * Get the correct [render pass entry]{@link Scene#renderPassEntries} (either [renderTarget]{@link Scene#renderPassEntries.renderTarget} or [screen]{@link Scene#renderPassEntries.screen}) [stack]{@link Stack} onto which this Mesh should be added, depending on whether it's projected or not
     * @param mesh - Mesh to check
     * @returns - the corresponding [render pass entry stack]{@link Stack}
     */
    getMeshProjectionStack(mesh) {
      const renderPassEntry = mesh.renderTarget ? this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
      ) : this.renderPassEntries.screen[0];
      const { stack } = renderPassEntry;
      return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
    }
    /**
     * Add a Mesh to the correct [render pass entry]{@link Scene#renderPassEntries} [stack]{@link Stack} array.
     * Meshes are then ordered by their [indexes (order of creation]){@link MeshBase#index}, position along the Z axis in case they are transparent and then [renderOrder]{@link MeshBase#renderOrder}
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
        similarMeshes.sort((a, b) => b.documentPosition.z - a.documentPosition.z);
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
     * Add a [shader pass]{@link ShaderPass} to our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}.
     * Before rendering the [shader pass]{@link ShaderPass}, we will copy the correct input texture into its [render texture]{@link ShaderPass#renderTexture}
     * This also handles the [renderPassEntries screen array]{@link Scene#renderPassEntries.screen} entries order: We will first draw selective passes, then our main screen pass and finally global post processing passes.
     * minimal code example: https://codesandbox.io/p/sandbox/webgpu-render-to-2-textures-without-texture-copy-c4sx4s?file=%2Fsrc%2Findex.js%3A10%2C4
     * @param shaderPass - [shader pass]{@link ShaderPass} to add
     */
    addShaderPass(shaderPass) {
      this.renderPassEntries.screen.push({
        renderPass: this.renderer.renderPass,
        // render directly to screen
        renderTexture: null,
        onBeforeRenderPass: (commandEncoder, swapChainTexture) => {
          if (!shaderPass.renderTarget) {
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
            this.renderer.renderPass.setLoadOp("clear");
          }
        },
        onAfterRenderPass: null,
        element: shaderPass,
        stack: null
        // explicitly set to null
      });
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
     * Remove a [shader pass]{@link ShaderPass} from our scene [renderPassEntries screen array]{@link Scene#renderPassEntries.screen}
     * @param shaderPass - [shader pass]{@link ShaderPass} to remove
     */
    removeShaderPass(shaderPass) {
      this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
        (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
      );
    }
    /**
     * Add a [ping pong plane]{@link PingPongPlane} to our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
     * After rendering the [ping pong plane]{@link PingPongPlane}, we will copy the context current texture into its {@link PingPongPlane#renderTexture} so we'll be able to use it as an input for the next pass
     * minimal code example: https://codesandbox.io/p/sandbox/webgpu-render-ping-pong-to-texture-use-in-quad-gwjx9p
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
     * Remove a [ping pong plane]{@link PingPongPlane} from our scene [renderPassEntries pingPong array]{@link Scene#renderPassEntries.pingPong}.
     * @param pingPongPlane - [ping pong plane]{@link PingPongPlane} to remove
     */
    removePingPongPlane(pingPongPlane) {
      this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
        (entry) => entry.element.uuid !== pingPongPlane.uuid
      );
    }
    /**
     * Here we render a [render pass entry]{@link RenderPassEntry}:
     * - Set its [render pass descriptor]{@link RenderPass#descriptor} resolve target and get it at as swap chain texture
     * - Execute [onBeforeRenderPass]{@link RenderPassEntry#onBeforeRenderPass} callback if specified
     * - Begin the [render pass]{@link GPURenderPassEncoder} using our [render pass descriptor]{@link RenderPass#descriptor}
     * - Render the single element if specified or the [render pass entry stack]{@link Stack}: draw unprojected opaque / transparent meshes first, then set [camera bind group]{@link CameraRenderer#cameraBindGroup} and draw projected opaque / transparent meshes
     * - End the [render pass]{@link GPURenderPassEncoder}
     * - Execute [onAfterRenderPass]{@link RenderPassEntry#onAfterRenderPass} callback if specified
     * - Reset [pipeline manager current pipeline]{@link PipelineManager#currentPipelineIndex}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param renderPassEntry - [entry]{@link RenderPassEntry} to render
     */
    renderSinglePassEntry(commandEncoder, renderPassEntry) {
      const swapChainTexture = this.renderer.setRenderPassCurrentTexture(
        renderPassEntry.renderPass,
        renderPassEntry.renderTexture?.texture
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
     * - Render [compute pass entries]{@link Scene#computePassEntries} first
     * - Then our [render pass entries]{@link Scene#renderPassEntries}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     */
    render(commandEncoder) {
      this.computePassEntries.forEach((computePass) => {
        if (!computePass.canRender)
          return;
        const pass = commandEncoder.beginComputePass();
        computePass.render(pass);
        pass.end();
        computePass.copyBufferToResult(commandEncoder);
        this.renderer.pipelineManager.resetCurrentPipeline();
      });
      for (const renderPassEntryType in this.renderPassEntries) {
        let passDrawnCount = 0;
        this.renderPassEntries[renderPassEntryType].forEach((renderPassEntry) => {
          if (!renderPassEntry.element && !renderPassEntry.stack.unProjected.opaque.length && !renderPassEntry.stack.unProjected.transparent.length && !renderPassEntry.stack.projected.opaque.length && !renderPassEntry.stack.projected.transparent.length)
            return;
          renderPassEntry.renderPass.setLoadOp(
            renderPassEntryType === "screen" && passDrawnCount !== 0 ? "load" : "clear"
          );
          passDrawnCount++;
          this.renderSinglePassEntry(commandEncoder, renderPassEntry);
        });
      }
    }
    /**
     * Execute this at each render after our [command encoder]{@link GPUCommandEncoder} has been submitted.
     * Used to map writable storages buffers if needed.
     */
    onAfterCommandEncoder() {
      this.computePassEntries.forEach((computePass) => {
        computePass.setWorkGroupsResult();
      });
    }
  };

  // src/core/renderPasses/RenderPass.ts
  var RenderPass = class {
    /**
     * RenderPass constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderPass}
     * @param parameters - [parameters]{@link RenderPassParams} used to create this {@link RenderPass}
     */
    constructor(renderer, { label = "Render Pass", depth = true, loadOp = "clear", clearValue = [0, 0, 0, 0] } = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "RenderPass");
      this.type = "RenderPass";
      this.uuid = generateUUID();
      this.renderer = renderer;
      this.options = {
        label,
        depth,
        loadOp,
        clearValue
      };
      this.setSize(this.renderer.pixelRatioBoundingRect);
      this.sampleCount = this.renderer.sampleCount;
      if (this.options.depth)
        this.createDepthTexture();
      this.createRenderTexture();
      this.setRenderPassDescriptor();
    }
    /**
     * Set our [render pass depth texture]{@link RenderPass#depthTexture}
     */
    createDepthTexture() {
      this.depthTexture = this.renderer.createTexture({
        label: this.options.label + " depth attachment texture",
        size: [this.size.width, this.size.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: this.sampleCount
      });
    }
    /**
     * Set our [render pass render texture]{@link RenderPass#renderTexture}
     */
    createRenderTexture() {
      this.renderTexture = this.renderer.createTexture({
        label: this.options.label + " color attachment texture",
        size: [this.size.width, this.size.height],
        sampleCount: this.sampleCount,
        format: this.renderer.preferredFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
      });
    }
    /**
     * Reset our [render pass depth texture]{@link RenderPass#depthTexture}
     */
    resetRenderPassDepth() {
      if (this.depthTexture) {
        this.depthTexture.destroy();
      }
      this.createDepthTexture();
      this.descriptor.depthStencilAttachment.view = this.depthTexture.createView();
    }
    /**
     * Reset our [render pass render texture]{@link RenderPass#renderTexture}
     */
    resetRenderPassView() {
      if (this.renderTexture) {
        this.renderTexture.destroy();
      }
      this.createRenderTexture();
      this.descriptor.colorAttachments[0].view = this.renderTexture.createView();
    }
    /**
     * Set our [render pass descriptor]{@link RenderPass#descriptor}
     */
    setRenderPassDescriptor() {
      this.descriptor = {
        label: this.options.label + " descriptor",
        colorAttachments: [
          {
            // view: <- to be filled out when we set our render pass view
            view: this.renderTexture.createView(),
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
            view: this.depthTexture.createView(),
            depthClearValue: 1,
            depthLoadOp: "clear",
            depthStoreOp: "store"
          }
        }
      };
    }
    /**
     * Set our [render pass size]{@link RenderPass#size}
     * @param boundingRect - [bounding rectangle]{@link DOMElementBoundingRect} from which to get the width and height
     */
    setSize(boundingRect) {
      this.size = {
        width: Math.floor(boundingRect.width),
        height: Math.floor(boundingRect.height)
      };
    }
    /**
     * Resize our {@link RenderPass}: set its size and recreate the textures
     * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
     */
    resize(boundingRect) {
      this.setSize(boundingRect);
      if (this.options.depth)
        this.resetRenderPassDepth();
      this.resetRenderPassView();
    }
    /**
     * Set our [load operation]{@link GPULoadOp}
     * @param loadOp - new [load operation]{@link GPULoadOp} to use
     */
    setLoadOp(loadOp = "clear") {
      this.options.loadOp = loadOp;
      if (this.descriptor && this.descriptor.colorAttachments) {
        this.descriptor.colorAttachments[0].loadOp = loadOp;
      }
    }
    /**
     * Set our [clear value]{@link GPUColor}
     * @param clearValue - new [clear value]{@link GPUColor} to use
     */
    setClearValue(clearValue = [0, 0, 0, 0]) {
      this.options.clearValue = clearValue;
      if (this.descriptor && this.descriptor.colorAttachments) {
        this.descriptor.colorAttachments[0].clearValue = clearValue;
      }
    }
    /**
     * Destroy our {@link RenderPass}
     */
    destroy() {
      this.renderTexture?.destroy();
      this.depthTexture?.destroy();
    }
  };

  // src/utils/TasksQueueManager.ts
  var TasksQueueManager = class {
    /**
     * TaskQueueManager constructor
     */
    constructor() {
      /** Private number to assign a unique id to each [task queue item]{@link TaskQueueItem} */
      this.#taskCount = 0;
      this.queue = [];
    }
    #taskCount;
    /**
     * Add a [task item]{@link TaskQueueItem} to the queue
     * @param callback - callback to add to the [task queue item]{@link TaskQueueItem}
     * @param parameters - [parameters]{@link TaskQueueItemParams} of the [task queue item]{@link TaskQueueItem} to add
     * @returns - [ID]{@link TaskQueueItem#id} of the new [task queue item]{@link TaskQueueItem}, useful to later the remove the task id needed
     */
    add(callback = (args) => {
    }, { order = this.queue.length, once = false } = {}) {
      const task = {
        callback,
        order,
        once,
        id: this.#taskCount
      };
      this.#taskCount++;
      this.queue.push(task);
      this.queue.sort((a, b) => {
        return a.order - b.order;
      });
      return task.id;
    }
    /**
     * Remove a [task item]{@link TaskQueueItem} from the queue
     * @param taskId
     */
    remove(taskId = 0) {
      this.queue = this.queue.filter((task) => task.id !== taskId);
    }
    /**
     * Execute the [tasks queue]{@link TasksQueueManager#queue}
     */
    execute(args) {
      this.queue.forEach((task) => {
        task.callback(args);
        if (task.once) {
          this.remove(task.id);
        }
      });
    }
  };

  // src/core/renderers/GPURenderer.ts
  var GPURenderer = class {
    /**
     * GPURenderer constructor
     * @param parameters - [parameters]{@link GPURendererParams} used to create this {@link GPURenderer}
     */
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      production = false,
      preferredFormat,
      alphaMode = "premultiplied",
      onError = () => {
      },
      onContextLost = (info) => {
      }
    }) {
      // callbacks / events
      /** function assigned to the [onBeforeRender]{@link GPURenderer#onBeforeRender} callback */
      this._onBeforeRenderCallback = (commandEncoder) => {
      };
      /** function assigned to the [onAfterRender]{@link GPURenderer#onAfterRender} callback */
      this._onAfterRenderCallback = (commandEncoder) => {
      };
      this.type = "GPURenderer";
      this.ready = false;
      this.gpu = navigator.gpu;
      this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
      this.sampleCount = sampleCount;
      this.production = production;
      this.alphaMode = alphaMode;
      this.devicesCount = 0;
      this.onError = onError;
      this.onContextLost = onContextLost;
      if (!this.gpu) {
        setTimeout(() => {
          this.onError();
          throwError("GPURenderer: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
        }, 0);
      }
      this.preferredFormat = preferredFormat ?? this.gpu?.getPreferredCanvasFormat();
      this.setTasksQueues();
      this.setRendererObjects();
      this.canvas = document.createElement("canvas");
      this.domElement = new DOMElement({
        element: container
      });
      this.documentBody = new DOMElement({
        element: document.body,
        onSizeChanged: () => this.resize()
      });
      this.texturesQueue = [];
    }
    /**
     * Set [canvas]{@link GPURenderer#canvas} size
     * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
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
     * @param boundingRect - new [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    resize(boundingRect = null) {
      if (!this.domElement)
        return;
      if (!boundingRect)
        boundingRect = this.domElement.element.getBoundingClientRect();
      this.setSize(boundingRect);
      this.onResize();
    }
    /**
     * Resize all tracked objects
     */
    onResize() {
      this.renderPass?.resize(this.pixelRatioBoundingRect);
      this.renderTargets.forEach((renderTarget) => renderTarget.resize(this.pixelRatioBoundingRect));
      this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.resize(this.boundingRect));
      this.shaderPasses.forEach((shaderPass) => shaderPass.resize(this.boundingRect));
      this.computePasses.forEach((computePass) => computePass.resize());
      this.meshes.forEach((mesh) => {
        if (!("domElement" in mesh))
          mesh.resize(this.boundingRect);
      });
    }
    /**
     * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect}
     */
    get boundingRect() {
      return this.domElement.boundingRect;
    }
    /**
     * Get our [DOM Element]{@link GPURenderer#domElement} [bounding rectangle]{@link DOMElement#boundingRect} accounting for current [pixel ratio]{@link GPURenderer#pixelRatio}
     */
    get pixelRatioBoundingRect() {
      const devicePixelRatio = window.devicePixelRatio ?? 1;
      const scaleBoundingRect = this.pixelRatio / devicePixelRatio;
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
     * Set our [context]{@link GPURenderer#context} if possible and set [main render pass]{@link GPURenderer#renderPass}, [pipeline manager]{@link GPURenderer#pipelineManager} and [scene]{@link GPURenderer#scene}
     * @returns - void promise result
     */
    async setContext() {
      this.context = this.canvas.getContext("webgpu");
      await this.setAdapter();
      await this.setDevice();
      if (this.device) {
        this.setMainRenderPass();
        this.setPipelineManager();
        this.setScene();
        this.domElement.element.appendChild(this.canvas);
        this.ready = true;
      }
    }
    /**
     * Set our [adapter]{@link GPURenderer#adapter} if possible
     * @returns - void promise result
     */
    async setAdapter() {
      this.adapter = await this.gpu?.requestAdapter().catch(() => {
        setTimeout(() => {
          this.onError();
          throwError("GPURenderer: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
        }, 0);
      });
      this.adapter?.requestAdapterInfo().then((infos) => {
        this.adapterInfos = infos;
      });
    }
    /**
     * Set our [device]{@link GPURenderer#device} and configure [context]{@link GPURenderer#context} if possible
     * @returns - void promise result
     */
    async setDevice() {
      try {
        this.device = await this.adapter?.requestDevice({
          label: "GPUCurtains device " + this.devicesCount
        });
        this.devicesCount++;
        this.context.configure({
          device: this.device,
          format: this.preferredFormat,
          alphaMode: this.alphaMode,
          // needed so we can copy textures for post processing usage
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST
          //viewFormats: []
        });
      } catch (error) {
        setTimeout(() => {
          this.onError();
          throwError(`GPURenderer: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`);
        }, 0);
      }
      this.device?.lost.then((info) => {
        throwWarning(`GPURenderer: WebGPU device was lost: ${info.message}`);
        this.loseContext();
        if (info.reason !== "destroyed") {
          this.onContextLost(info);
        }
      });
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} is lost.
     * Reset all our samplers, force all our scene objects to lose context.
     */
    loseContext() {
      this.ready = false;
      this.samplers.forEach((sampler) => sampler.sampler = null);
      this.sceneObjects.forEach((sceneObject) => sceneObject.loseContext());
      this.buffers = [];
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} should be restored.
     * Reset the adapter, device and configure context again, reset our samplers, restore our scene objects context, resize the render textures.
     * @async
     */
    async restoreContext() {
      await this.setAdapter();
      await this.setDevice();
      this.samplers.forEach((sampler) => {
        sampler.sampler = this.device?.createSampler({ label: sampler.label, ...sampler.options });
      });
      this.sceneObjects.forEach((sceneObject) => sceneObject.restoreContext());
      this.onResize();
      this.ready = true;
    }
    /* PIPELINES, SCENE & MAIN RENDER PASS */
    /**
     * Set our [main render pass]{@link GPURenderer#renderPass} that will be used to render the result of our draw commands back to the screen
     */
    setMainRenderPass() {
      this.renderPass = new RenderPass(this, {
        label: "Main Render pass",
        depth: true
      });
    }
    /**
     * Set our [pipeline manager]{@link GPURenderer#pipelineManager}
     */
    setPipelineManager() {
      this.pipelineManager = new PipelineManager({
        renderer: this
      });
    }
    /**
     * Set our [scene]{@link GPURenderer#scene}
     */
    setScene() {
      this.scene = new Scene({ renderer: this });
    }
    /* BUFFERS & BINDINGS */
    /**
     * Create a {@link GPUBuffer}
     * @param bufferDescriptor - [buffer descriptor]{@link GPUBufferDescriptor}
     * @returns - newly created {@link GPUBuffer}
     */
    createBuffer(bufferDescriptor) {
      const buffer = this.device?.createBuffer(bufferDescriptor);
      this.buffers.push(buffer);
      return buffer;
    }
    /**
     * Remove a [buffer]{@link GPUBuffer} from our [buffers array]{@link GPURenderer#buffers}
     * @param buffer - [buffer]{@link GPUBuffer} to remove
     */
    removeBuffer(buffer) {
      this.buffers = this.buffers.filter((b) => {
        return b.label !== buffer.label && b.usage !== buffer.usage && b.size !== buffer.size;
      });
    }
    /**
     * Write to a {@link GPUBuffer}
     * @param buffer - {@link GPUBuffer} to write to
     * @param bufferOffset - [buffer offset]{@link GPUSize64}
     * @param data - [data]{@link BufferSource} to write
     */
    queueWriteBuffer(buffer, bufferOffset, data) {
      this.device?.queue.writeBuffer(buffer, bufferOffset, data);
    }
    /**
     * Create a {@link GPUBindGroupLayout}
     * @param bindGroupLayoutDescriptor - [bind group layout descriptor]{@link GPUBindGroupLayoutDescriptor}
     * @returns - newly created {@link GPUBindGroupLayout}
     */
    createBindGroupLayout(bindGroupLayoutDescriptor) {
      return this.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    /**
     * Create a {@link GPUBindGroup}
     * @param bindGroupDescriptor - [bind group descriptor]{@link GPUBindGroupDescriptor}
     * @returns - newly created {@link GPUBindGroup}
     */
    createBindGroup(bindGroupDescriptor) {
      return this.device?.createBindGroup(bindGroupDescriptor);
    }
    /* SHADERS & PIPELINES */
    /**
     * Create a {@link GPUShaderModule}
     * @param shaderModuleDescriptor - [shader module descriptor]{@link shaderModuleDescriptor}
     * @returns - newly created {@link GPUShaderModule}
     */
    createShaderModule(shaderModuleDescriptor) {
      return this.device?.createShaderModule(shaderModuleDescriptor);
    }
    /**
     * Create a {@link GPUPipelineLayout}
     * @param pipelineLayoutDescriptor - [pipeline layout descriptor]{@link GPUPipelineLayoutDescriptor}
     * @returns - newly created {@link GPUPipelineLayout}
     */
    createPipelineLayout(pipelineLayoutDescriptor) {
      return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
    }
    /**
     * Create a {@link GPURenderPipeline}
     * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    createRenderPipeline(pipelineDescriptor) {
      return this.device?.createRenderPipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPURenderPipeline}
     * @async
     * @param pipelineDescriptor - [render pipeline descriptor]{@link GPURenderPipelineDescriptor}
     * @returns - newly created {@link GPURenderPipeline}
     */
    async createRenderPipelineAsync(pipelineDescriptor) {
      return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
    }
    /**
     * Create a {@link GPUComputePipeline}
     * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    createComputePipeline(pipelineDescriptor) {
      return this.device?.createComputePipeline(pipelineDescriptor);
    }
    /**
     * Asynchronously create a {@link GPUComputePipeline}
     * @async
     * @param pipelineDescriptor - [compute pipeline descriptor]{@link GPUComputePipelineDescriptor}
     * @returns - newly created {@link GPUComputePipeline}
     */
    async createComputePipelineAsync(pipelineDescriptor) {
      return await this.device?.createComputePipelineAsync(pipelineDescriptor);
    }
    /* TEXTURES */
    /**
     * Add a [texture]{@link Texture} to our [textures array]{@link GPURenderer#textures}
     * @param texture - [texture]{@link Texture} to add
     */
    addTexture(texture) {
      this.textures.push(texture);
      this.setTexture(texture);
    }
    /**
     * Remove a [texture]{@link Texture} from our [textures array]{@link GPURenderer#textures}
     * @param texture - [texture]{@link Texture} to remove
     */
    removeTexture(texture) {
      this.textures = this.textures.filter((t) => t.uuid !== texture.uuid);
    }
    /**
     * Call texture [createTexture]{@link Texture#createTexture} method
     * @param texture - [texture]{@link Texture} to create
     */
    setTexture(texture) {
      if (!texture.texture) {
        texture.createTexture();
      }
    }
    /**
     * Create a {@link GPUTexture}
     * @param textureDescriptor - [texture descriptor]{@link GPUTextureDescriptor}
     * @returns - newly created {@link GPUTexture}
     */
    createTexture(textureDescriptor) {
      return this.device?.createTexture(textureDescriptor);
    }
    /**
     * Upload a [texture]{@link Texture} to the GPU
     * @param texture - [texture]{@link Texture} to upload
     */
    uploadTexture(texture) {
      if (texture.source) {
        try {
          this.device?.queue.copyExternalImageToTexture(
            {
              source: texture.source,
              flipY: texture.options.flipY
            },
            { texture: texture.texture },
            { width: texture.size.width, height: texture.size.height }
          );
          if (texture.texture.mipLevelCount > 1) {
            generateMips(this.device, texture.texture);
          }
          this.texturesQueue.push(texture);
        } catch ({ message }) {
          throwError(`GPURenderer: could not upload texture: ${texture.options.name} because: ${message}`);
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
     * Import an [external texture]{@link GPUExternalTexture}
     * @param video - [video]{@link HTMLVideoElement} source
     * @returns - [external texture]{@link GPUExternalTexture}
     */
    importExternalTexture(video) {
      return this.device?.importExternalTexture({ source: video });
    }
    /**
     * Check if a {@link Sampler} has already been created with the same [parameters]{@link Sampler#options}.
     * Use it if found, else create a new one and add it to the [samplers array]{@link GPURenderer#samplers}.
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
        const gpuSampler = this.device?.createSampler({ label: sampler.label, ...sampler.options });
        this.samplers.push(sampler);
        return gpuSampler;
      }
    }
    /* OBJECTS & TASKS */
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
      this.buffers = [];
      this.computePasses = [];
      this.pingPongPlanes = [];
      this.shaderPasses = [];
      this.renderTargets = [];
      this.meshes = [];
      this.samplers = [];
      this.textures = [];
    }
    /**
     * Get all our scene objects (i.e. objects that are rendered)
     * @readonly
     */
    get sceneObjects() {
      return [...this.computePasses, ...this.meshes, ...this.shaderPasses, ...this.pingPongPlanes];
    }
    /**
     * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [bind group]{@link AllowedBindGroups}
     * @param bindGroup - [bind group]{@link AllowedBindGroups} to check
     */
    getObjectsByBindGroup(bindGroup) {
      return this.sceneObjects.filter((object) => {
        return [
          ...object.material.bindGroups,
          ...object.material.inputsBindGroups,
          ...object.material.clonedBindGroups
        ].filter((bG) => bG.uuid === bindGroup.uuid);
      });
    }
    /**
     * Get all objects ([Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) using a given [texture]{@link Texture} or [render texture]{@link RenderTexture}
     * @param texture - [texture]{@link Texture} or [render texture]{@link RenderTexture} to check
     */
    getObjectsByTexture(texture) {
      return this.sceneObjects.filter((object) => {
        return [...object.material.textures, ...object.material.renderTextures].filter((t) => t.uuid === texture.uuid);
      });
    }
    /* EVENTS */
    /**
     * Assign a callback function to _onBeforeRenderCallback
     * @param callback - callback to run just before the [renderer render method]{@link GPURenderer#render} will be executed
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
     * @param callback - callback to run just after the [renderer render method]{@link GPURenderer#render} has been executed
     * @returns - our {@link GPURenderer}
     */
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /* RENDER */
    /**
     * Set the current [render pass descriptor]{@link RenderPass#descriptor} texture [view]{@link GPURenderPassColorAttachment#view} or [resolveTarget]{@link GPURenderPassColorAttachment#resolveTarget} (depending on whether we're using multisampling)
     * @param renderPass - current [render pass]{@link RenderPass}
     * @param renderTexture - [render texture]{@link GPUTexture} to use, or the [context]{@link GPURenderer#context} [current texture]{@link GPUTexture} if null
     * @returns - the [current render texture]{@link GPUTexture}
     */
    setRenderPassCurrentTexture(renderPass, renderTexture = null) {
      if (!renderTexture)
        renderTexture = this.context.getCurrentTexture();
      if (this.sampleCount > 1) {
        renderPass.descriptor.colorAttachments[0].resolveTarget = renderTexture.createView();
      } else {
        renderPass.descriptor.colorAttachments[0].view = renderTexture.createView();
      }
      return renderTexture;
    }
    /**
     * Function to run just before our [command encoder]{@link GPUCommandEncoder} is created at each [render]{@link GPURenderer#render} call
     */
    onBeforeCommandEncoder() {
    }
    /**
     * Function to run just after our [command encoder]{@link GPUCommandEncoder} has been submitted at each [render]{@link GPURenderer#render} call
     */
    onAfterCommandEncoder() {
      this.scene.onAfterCommandEncoder();
    }
    /**
     * Render a single [Compute pass]{@link ComputePass}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param computePass - [Compute pass]{@link ComputePass}
     */
    renderSingleComputePass(commandEncoder, computePass) {
      if (!computePass.canRender)
        return;
      const pass = commandEncoder.beginComputePass();
      computePass.render(pass);
      pass.end();
      computePass.copyBufferToResult(commandEncoder);
    }
    /**
     * Render a single [Mesh]{@link MeshType}
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - [Mesh]{@link MeshType} to render
     */
    renderSingleMesh(commandEncoder, mesh) {
      const pass = commandEncoder.beginRenderPass(this.renderPass.descriptor);
      mesh.render(pass);
      pass.end();
    }
    /**
     * Render an array of objects (either [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass}) once. This method won't call any of the renderer render hooks like [onBeforeRender]{@link GPURenderer#onBeforeRender}, [onAfterRender]{@link GPURenderer#onAfterRender}
     * @param objects - Array of [Meshes]{@link MeshType} or [Compute passes]{@link ComputePass} to render
     */
    renderOnce(objects) {
      const commandEncoder = this.device?.createCommandEncoder({
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
      this.device?.queue.submit([commandBuffer]);
      this.pipelineManager.resetCurrentPipeline();
    }
    /**
     * Render our [scene]{@link Scene}
     */
    renderScene() {
      const commandEncoder = this.device?.createCommandEncoder({ label: "Renderer scene command encoder" });
      this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
      this.onBeforeRenderScene.execute(commandEncoder);
      this.scene.render(commandEncoder);
      this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
      this.onAfterRenderScene.execute(commandEncoder);
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
    }
    /**
     * Called at each draw call to create a [command encoder]{@link GPUCommandEncoder}, render our scene and its content and handle our [textures queue]{@link GPURenderer#texturesQueue}
     */
    render() {
      if (!this.ready)
        return;
      this.onBeforeCommandEncoder();
      this.onBeforeCommandEncoderCreation.execute();
      this.renderScene();
      this.textures.filter((texture) => !texture.parent && texture.sourceLoaded && !texture.sourceUploaded).forEach((texture) => this.uploadTexture(texture));
      this.texturesQueue.forEach((texture) => {
        texture.sourceUploaded = true;
      });
      this.texturesQueue = [];
      this.onAfterCommandEncoder();
      this.onAfterCommandEncoderSubmission.execute();
    }
    /**
     * Destroy our {@link GPURenderer} and everything that needs to be destroyed as well
     */
    destroy() {
      this.domElement?.destroy();
      this.documentBody?.destroy();
      this.textures = [];
      this.texturesQueue = [];
      this.renderPass?.destroy();
      this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
      this.sceneObjects.forEach((sceneObject) => sceneObject.remove());
      this.device?.destroy();
      this.context?.unconfigure();
    }
  };

  // src/core/renderers/GPUCameraRenderer.ts
  var GPUCameraRenderer = class extends GPURenderer {
    /**
     * GPUCameraRenderer constructor
     * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCameraRenderer}
     */
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      preferredFormat,
      production = false,
      alphaMode = "premultiplied",
      camera = {},
      onError = () => {
      },
      onContextLost = (info) => {
      }
    }) {
      super({
        container,
        pixelRatio,
        sampleCount,
        preferredFormat,
        alphaMode,
        production,
        onError,
        onContextLost
      });
      this.type = "GPUCameraRenderer";
      camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera };
      this.setCamera(camera);
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} is lost.
     * Reset all our samplers, force all our scene objects and camera bind group to lose context.
     */
    loseContext() {
      super.loseContext();
      this.cameraBindGroup.loseContext();
    }
    /**
     * Called when the [renderer device]{@link GPURenderer#device} should be restored.
     * Reset the adapter, device and configure context again, reset our samplers, restore our scene objects context, resize the render textures, re-write our camera buffer binding.
     * @async
     */
    async restoreContext() {
      this.cameraBufferBinding.shouldUpdate = true;
      return super.restoreContext();
    }
    /**
     * Set the [camera]{@link GPUCameraRenderer#camera}
     * @param cameraParameters - [parameters]{@link CameraBasePerspectiveOptions} used to create the [camera]{@link GPUCameraRenderer#camera}
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
     * Update the [projected meshes]{@link MeshTransformedBaseClass} sizes and positions when the [camera]{@link GPUCurtainsRenderer#camera} [position]{@link Camera#position} changes
     */
    onCameraMatricesChanged() {
      this.updateCameraBindings();
      this.meshes.forEach((mesh) => {
        if ("modelViewMatrix" in mesh) {
          mesh.updateSizePositionAndProjection();
        }
      });
    }
    /**
     * Set the [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} and [camera bind group]{@link GPUCameraRenderer#cameraBindGroup}
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
     * Create the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} buffers
     */
    setCameraBindGroup() {
      if (this.cameraBindGroup.shouldCreateBindGroup) {
        this.cameraBindGroup.setIndex(0);
        this.cameraBindGroup.createBindGroup();
      }
    }
    /**
     * Tell our [camera buffer struct]{@link GPUCameraRenderer#cameraBufferBinding} that we should update its struct
     */
    updateCameraBindings() {
      this.cameraBufferBinding?.shouldUpdateBinding("model");
      this.cameraBufferBinding?.shouldUpdateBinding("view");
      this.cameraBufferBinding?.shouldUpdateBinding("projection");
    }
    /**
     * Set our [camera]{@link GPUCameraRenderer#camera} perspective matrix new parameters (fov, near plane and far plane)
     * @param fov - new [field of view]{@link Camera#fov}
     * @param near - new [near plane]{@link Camera#near}
     * @param far - new [far plane]{@link Camera#far}
     */
    setPerspective(fov, near, far) {
      this.camera?.setPerspective(fov, near, far, this.boundingRect.width, this.boundingRect.height, this.pixelRatio);
    }
    /**
     * Set our [camera]{@link GPUCameraRenderer#camera} position
     * @param position - new [position]{@link Camera#position}
     */
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      this.camera.position.copy(position);
    }
    /**
     * Call our [super onResize method]{@link GPURenderer#onResize} and resize our [camera]{@link GPUCameraRenderer#camera} as well
     */
    onResize() {
      super.onResize();
      this.setPerspective();
      this.updateCameraBindings();
    }
    /* RENDER */
    /**
     * Update the camera model matrix, check if the [camera bind group]{@link GPUCameraRenderer#cameraBindGroup} should be created, create it if needed and then update it
     */
    updateCamera() {
      this.camera?.updateMatrixStack();
      this.setCameraBindGroup();
      this.cameraBindGroup?.update();
    }
    /**
     * Render a single [Mesh]{@link MeshType} (binds the camera bind group if needed)
     * @param commandEncoder - current {@link GPUCommandEncoder}
     * @param mesh - [Mesh]{@link MeshType} to render
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
     * [Update the camera]{@link GPUCameraRenderer#updateCamera} and then call our [super render method]{@link GPURenderer#render}
     */
    render() {
      if (!this.ready)
        return;
      this.updateCamera();
      super.render();
    }
    /**
     * Destroy our {@link GPUCameraRenderer}
     */
    destroy() {
      this.cameraBindGroup?.destroy();
      super.destroy();
    }
  };

  // src/core/renderPasses/RenderTarget.ts
  var RenderTarget = class {
    /**
     * RenderTarget constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link RenderTarget}
     * @param parameters - [parameters]{@link RenderTargetParams} use to create this {@link RenderTarget}
     */
    constructor(renderer, parameters) {
      /** Whether we should add this {@link RenderTarget} to our {@link Scene} to let it handle the rendering process automatically */
      this.#autoRender = true;
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "RenderTarget");
      this.type = "RenderTarget";
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { label, depth, loadOp, clearValue, autoRender } = parameters;
      this.options = {
        label,
        depth,
        loadOp,
        clearValue,
        autoRender
      };
      if (autoRender !== void 0) {
        this.#autoRender = autoRender;
      }
      this.renderPass = new RenderPass(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Pass` : "Render Target Render Pass",
        depth: this.options.depth,
        loadOp: this.options.loadOp,
        clearValue: this.options.clearValue
      });
      this.renderTexture = new RenderTexture(this.renderer, {
        label: this.options.label ? `${this.options.label} Render Texture` : "Render Target Render Texture",
        name: "renderTexture"
      });
      this.addToScene();
    }
    #autoRender;
    /**
     * Add the {@link RenderTarget} to the renderer and the {@link Scene}
     */
    addToScene() {
      this.renderer.renderTargets.push(this);
      if (this.#autoRender) {
        this.renderer.scene.addRenderTarget(this);
      }
    }
    /**
     * Remove the {@link RenderTarget} from the renderer and the {@link Scene}
     */
    removeFromScene() {
      if (this.#autoRender) {
        this.renderer.scene.removeRenderTarget(this);
      }
      this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
    }
    /**
     * Resize our [render pass]{@link RenderTarget#renderPass} and [render texture]{@link RenderTarget#renderTexture}
     * @param boundingRect - new [bounding rectangle]{@link DOMElementBoundingRect}
     */
    resize(boundingRect) {
      this.renderPass?.resize(boundingRect);
      this.renderTexture?.resize();
    }
    // alias
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
      this.renderPass?.destroy();
      this.renderTexture?.destroy();
    }
  };

  // src/core/renderPasses/ShaderPass.ts
  var ShaderPass = class extends FullscreenPlane {
    /**
     * ShaderPass constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link ShaderPass}
     * @param parameters - [parameters]{@link ShaderPassParams} use to create this {@link ShaderPass}
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
      parameters.transparent = true;
      parameters.label = parameters.label ?? "ShaderPass " + renderer.shaderPasses?.length;
      super(renderer, parameters);
      this.type = "ShaderPass";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
        name: "renderTexture",
        fromTexture: this.renderTarget ? this.renderTarget.renderTexture : null
      });
    }
    /**
     * Get our main [render texture]{@link RenderTexture}, the one that contains our post processed content
     * @readonly
     */
    get renderTexture() {
      return this.renderTextures[0] ?? null;
    }
    /**
     * Assign or remove a {@link RenderTarget} to this {@link ShaderPass}
     * Since this manipulates the {@link Scene} stacks, it can be used to remove a RenderTarget as well.
     * Also copy or remove the [render target render texture]{@link RenderTarget#renderTexture} into the [shader pass render texture]{@link ShaderPass#renderTexture}
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
     * Add the {@link ShaderPass} to the renderer and the {@link Scene}
     */
    addToScene() {
      this.renderer.shaderPasses.push(this);
      if (this.autoRender) {
        this.renderer.scene.addShaderPass(this);
      }
    }
    /**
     * Remove the {@link ShaderPass} from the renderer and the {@link Scene}
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
  };

  // src/curtains/meshes/PingPongPlane.ts
  var PingPongPlane = class extends FullscreenPlane {
    /**
     * PingPongPlane constructor
     * @param renderer - [renderer]{@link Renderer} object or {@link GPUCurtains} class object used to create this {@link PingPongPlane}
     * @param parameters - [parameters]{@link MeshBaseRenderParams} use to create this {@link PingPongPlane}
     */
    constructor(renderer, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
      parameters.renderTarget = new RenderTarget(renderer, {
        label: parameters.label ? parameters.label + " render target" : "Ping Pong render target"
      });
      parameters.transparent = false;
      parameters.label = parameters.label ?? "PingPongPlane " + renderer.pingPongPlanes?.length;
      super(renderer, parameters);
      this.type = "PingPongPlane";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
        name: "renderTexture"
      });
    }
    /**
     * Get our main [render texture]{@link RenderTexture}, the one that contains our ping pong content
     * @readonly
     */
    get renderTexture() {
      return this.renderTextures[0] ?? null;
    }
    /**
     * Add the {@link PingPongPlane} to the renderer and the {@link Scene}
     */
    addToScene() {
      this.renderer.pingPongPlanes.push(this);
      if (this.autoRender) {
        this.renderer.scene.addPingPongPlane(this);
      }
    }
    /**
     * Remove the {@link PingPongPlane} from the renderer and the {@link Scene}
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
  };

  // src/curtains/renderers/GPUCurtainsRenderer.ts
  var GPUCurtainsRenderer = class extends GPUCameraRenderer {
    /**
     * GPUCurtainsRenderer constructor
     * @param parameters - [parameters]{@link GPUCameraRendererParams} used to create this {@link GPUCurtainsRenderer}
     */
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      preferredFormat,
      alphaMode = "premultiplied",
      production = false,
      onError = () => {
      },
      onContextLost = (info) => {
      },
      camera
    }) {
      super({
        container,
        pixelRatio,
        sampleCount,
        preferredFormat,
        alphaMode,
        production,
        onError,
        onContextLost,
        camera
      });
      this.type = "GPUCurtainsRenderer";
    }
    /**
     * Add the [DOM Meshes]{@link GPUCurtainsRenderer#domMeshes} to our tracked elements
     */
    setRendererObjects() {
      super.setRendererObjects();
      this.domMeshes = [];
    }
    /**
     * Set each [DOM Meshes DOM Elements]{GPUCurtainsRenderer#domMeshes.domElement} size on resize
     */
    onResize() {
      super.onResize();
      this.domMeshes?.forEach((mesh) => {
        if (mesh.domElement) {
          mesh.domElement.setSize();
        }
      });
    }
  };

  // src/utils/ScrollManager.ts
  var ScrollManager = class {
    /**
     * ScrollManager constructor
     * @param parameters - [parameters]{@link ScrollManagerParams} used to create this {@link ScrollManager}
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
      this.handler = this.scrollHandler.bind(this, true);
      if (this.shouldWatch) {
        window.addEventListener("scroll", this.handler, { passive: true });
      }
    }
    /**
     * Called by the scroll event listener
     */
    scrollHandler() {
      this.updateScrollValues({ x: window.pageXOffset, y: window.pageYOffset });
    }
    /**
     * Updates the scroll manager X and Y scroll values as well as last X and Y deltas
     * Internally called by the scroll handler
     * Could be called externally as well if the user wants to handle the scroll by himself
     * @param parameters - scroll values
     * @param parameters.x - scroll value along X axis
     * @param parameters.y - scroll value along Y axis
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
        window.removeEventListener("scroll", this.handler, { passive: true });
      }
    }
  };

  // src/curtains/GPUCurtains.ts
  var GPUCurtains = class {
    /**
     * GPUCurtains constructor
     * @param parameters - [parameters]{@link GPUCurtainsParams} used to create this {@link GPUCurtains}
     */
    constructor({
      container,
      pixelRatio = window.devicePixelRatio ?? 1,
      sampleCount = 4,
      preferredFormat,
      alphaMode = "premultiplied",
      production = false,
      camera,
      autoRender = true,
      autoResize = true,
      watchScroll = true
    }) {
      // callbacks / events
      /** function assigned to the [onRender]{@link GPUCurtains#onRender} callback */
      this._onRenderCallback = () => {
      };
      /** function assigned to the [onScroll]{@link GPUCurtains#onScroll} callback */
      this._onScrollCallback = () => {
      };
      /** function assigned to the [onAfterResize]{@link GPUCurtains#onAfterResize} callback */
      this._onAfterResizeCallback = () => {
      };
      /** function assigned to the [onError]{@link GPUCurtains#onError} callback */
      this._onErrorCallback = () => {
      };
      /** function assigned to the [onContextLost]{@link GPUCurtains#onContextLost} callback */
      this._onContextLostCallback = () => {
      };
      this.type = "CurtainsGPU";
      this.options = {
        container,
        pixelRatio,
        sampleCount,
        camera,
        production,
        preferredFormat,
        alphaMode,
        autoRender,
        autoResize,
        watchScroll
      };
      if (container) {
        this.setContainer(container);
      }
    }
    /**
     * Set the [container]{@link GPUCurtains#container}
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
          container = document.getElementById(container);
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
     * Set the [curtains renderer]{@link GPUCurtainsRenderer}
     */
    setRenderer() {
      this.renderer = new GPUCurtainsRenderer({
        // TODO ...this.options?
        container: this.options.container,
        pixelRatio: this.options.pixelRatio,
        sampleCount: this.options.sampleCount,
        preferredFormat: this.options.preferredFormat,
        alphaMode: this.options.alphaMode,
        camera: this.options.camera,
        production: this.options.production,
        onError: () => this._onErrorCallback && this._onErrorCallback(),
        onContextLost: (info) => this._onContextLostCallback && this._onContextLostCallback(info)
      });
    }
    restoreContext() {
      this.renderer?.restoreContext();
    }
    /**
     * Set the [curtains renderer context]{@link GPUCurtainsRenderer#setContext}
     * @async
     */
    async setRendererContext() {
      await this.renderer.setContext();
    }
    /**
     * Set the various event listeners, set the [curtains renderer]{@link GPUCurtainsRenderer}, append the [canvas]{@link HTMLCanvasElement} to our [container]{@link GPUCurtains#container} and start rendering if needed
     */
    setCurtains() {
      this.initEvents();
      this.setRenderer();
      if (this.options.autoRender) {
        this.animate();
      }
    }
    /* RENDERER TRACKED OBJECTS */
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [ping pong planes]{@link PingPongPlane}
     */
    get pingPongPlanes() {
      return this.renderer?.pingPongPlanes;
    }
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [shader passes]{@link ShaderPass}
     */
    get shaderPasses() {
      return this.renderer?.shaderPasses;
    }
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [meshes]{@link MeshBase}
     */
    get meshes() {
      return this.renderer?.meshes;
    }
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [DOM Meshes]{@link DOMMesh}
     */
    get domMeshes() {
      return this.renderer?.domMeshes;
    }
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [planes]{@link Plane}
     */
    get planes() {
      return this.renderer?.domMeshes.filter((domMesh) => domMesh.type === "Plane");
    }
    /**
     * Get all the [curtains renderer]{@link GPUCurtainsRenderer} created [compute passes]{@link ComputePass}
     */
    get computePasses() {
      return this.renderer?.computePasses;
    }
    /**
     * Get the [curtains renderer camera]{@link GPUCurtainsRenderer#camera}
     */
    get camera() {
      return this.renderer?.camera;
    }
    /**
     * Set the [curtains renderer camera perspective]{@link GPUCurtainsRenderer#setPerspective}
     */
    setPerspective(fov = 50, near = 0.01, far = 50) {
      this.renderer?.setPerspective(fov, near, far);
    }
    /**
     * Set the [curtains renderer camera position]{@link GPUCurtainsRenderer#setCameraPosition}
     */
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      this.renderer?.setCameraPosition(position);
    }
    /* RESIZE */
    /**
     * Manually resize our [curtains renderer]{@link GPUCurtainsRenderer}
     */
    resize() {
      this.renderer?.resize();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    /**
     * Get our [curtains renderer bounding rectangle]{@link GPUCurtainsRenderer#boundingRect}
     */
    get boundingRect() {
      return this.renderer?.boundingRect;
    }
    /* SCROLL */
    /**
     * Set the [scroll manager]{@link GPUCurtains#scrollManager}
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
     * Update all [DOMMeshes scroll position]{@link DOMMesh#updateScrollPosition}
     * @param delta - last [scroll delta values]{@link ScrollManager#delta}
     */
    updateScroll(delta = { x: 0, y: 0 }) {
      this.renderer.domMeshes.forEach((mesh) => {
        if (mesh.domElement) {
          mesh.updateScrollPosition(delta);
        }
      });
      this._onScrollCallback && this._onScrollCallback();
    }
    /**
     * Update our [scrollManager scroll values]{@link ScrollManager#scroll}. Called each time the scroll has changed if [watchScroll]{@link GPUCurtainsOptions#watchScroll} is set to true. Could be called externally as well.
     * @param scroll
     */
    updateScrollValues(scroll = { x: 0, y: 0 }) {
      this.scrollManager.updateScrollValues(scroll);
    }
    /**
     * Get our [scrollManager scroll deltas]{@link ScrollManager#delta}
     * @readonly
     */
    get scrollDelta() {
      return this.scrollManager.delta;
    }
    /**
     * Get our [scrollManager scroll values]{@link ScrollManager#scroll}
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
     * Called each time the [scroll values]{@link ScrollManager#scroll} changed
     * @param callback - callback to run each time the [scroll values]{@link ScrollManager#scroll} changed
     * @returns - our {@link GPUCurtains}
     */
    onScroll(callback) {
      if (callback) {
        this._onScrollCallback = callback;
      }
      return this;
    }
    /**
     * Called each time the [resize]{@link GPUCurtains#resize} method has been called
     * @param callback - callback to run each time the [resize]{@link GPUCurtains#resize} method has been called
     * @returns - our {@link GPUCurtains}
     */
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    /**
     * Called if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
     * @param callback - callback to run if there's been an error while trying to set up the [curtains renderer]{@link GPUCurtainsRenderer} context
     * @returns - our {@link GPUCurtains}
     */
    onError(callback) {
      if (callback) {
        this._onErrorCallback = callback;
      }
      return this;
    }
    /**
     * Called whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
     * @param callback - callback to run whenever the [curtains renderer]{@link GPUCurtainsRenderer} context is lost
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
     * Renderer our [curtains renderer]{@link GPUCurtainsRenderer}
     */
    render() {
      this._onRenderCallback && this._onRenderCallback();
      this.renderer?.render();
    }
    /**
     * Destroy our {@link GPUCurtains} and [curtains renderer]{@link GPUCurtainsRenderer}
     */
    destroy() {
      if (this.animationFrameID) {
        window.cancelAnimationFrame(this.animationFrameID);
      }
      this.renderer?.destroy();
      this.scrollManager?.destroy();
      resizeManager.destroy();
    }
  };

  // src/extras/geometries/BoxGeometry.ts
  var BoxGeometry = class extends IndexedGeometry {
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
      this.setIndexBuffer({
        array: new Uint32Array(indices)
      });
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
    }
  };

  // src/extras/geometries/SphereGeometry.ts
  var SphereGeometry = class extends IndexedGeometry {
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
      this.setIndexBuffer({
        array: new Uint32Array(indices)
      });
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
    }
  };
  return __toCommonJS(src_exports);
})();
