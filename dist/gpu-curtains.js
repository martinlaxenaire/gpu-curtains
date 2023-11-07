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
    Bindings: () => Bindings,
    Box3: () => Box3,
    BoxGeometry: () => BoxGeometry,
    BufferBindings: () => BufferBindings,
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
    SamplerBindings: () => SamplerBindings,
    Scene: () => Scene,
    ShaderPass: () => ShaderPass,
    SphereGeometry: () => SphereGeometry,
    Texture: () => Texture,
    TextureBindGroup: () => TextureBindGroup,
    TextureBindings: () => TextureBindings,
    Vec2: () => Vec2,
    Vec3: () => Vec3,
    WorkBufferBindings: () => WorkBufferBindings
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

  // src/utils/renderer-utils.ts
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
  var generateMips = ((device, texture) => {
    let sampler;
    let module;
    const pipelineByFormat = {};
    return function generateMips2(device2, texture2) {
      if (!module) {
        module = device2.createShaderModule({
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
        sampler = device2.createSampler({
          minFilter: "linear"
        });
      }
      if (!pipelineByFormat[texture2.format]) {
        pipelineByFormat[texture2.format] = device2.createRenderPipeline({
          label: "mip level generator pipeline",
          layout: "auto",
          vertex: {
            module,
            entryPoint: "vs"
          },
          fragment: {
            module,
            entryPoint: "fs",
            targets: [{ format: texture2.format }]
          }
        });
      }
      const pipeline = pipelineByFormat[texture2.format];
      const encoder = device2.createCommandEncoder({
        label: "mip gen encoder"
      });
      let width = texture2.width;
      let height = texture2.height;
      let baseMipLevel = 0;
      while (width > 1 || height > 1) {
        width = Math.max(1, width / 2 | 0);
        height = Math.max(1, height / 2 | 0);
        const bindGroup = device2.createBindGroup({
          layout: pipeline.getBindGroupLayout(0),
          entries: [
            { binding: 0, resource: sampler },
            {
              binding: 1,
              resource: texture2.createView({
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
              view: texture2.createView({ baseMipLevel, mipLevelCount: 1 }),
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
      device2.queue.submit([commandBuffer]);
    };
  })();

  // src/core/bindings/Bindings.ts
  var Bindings = class {
    /**
     * Bindings constructor
     * @param parameters - [parameters]{@link BindingsParams} used to create our {@link Bindings}
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
    }
    /**
     * To update our buffers before at each render. Will be overriden.
     */
    onBeforeRender() {
    }
  };

  // src/utils/buffers-utils.ts
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
  var getBufferArrayStride = (bindingElement) => {
    return (() => {
      switch (bindingElement.type) {
        case "array<vec4f>":
          return 4;
        case "array<vec3f>":
          return 3;
        case "array<vec2f>":
          return 2;
        case "array<f32>":
        default:
          return 1;
      }
    })();
  };
  var getBindingWgslVarType = (bindingType) => {
    return (() => {
      switch (bindingType) {
        case "storage":
          return "var<storage, read>";
        case "storageWrite":
          return "var<storage, read_write>";
        case "uniform":
        default:
          return "var<uniform>";
      }
    })();
  };
  var getBindGroupLayoutBindingType = (bindingType) => {
    return (() => {
      switch (bindingType) {
        case "storage":
          return "read-only-storage";
        case "storageWrite":
          return "storage";
        case "uniform":
        default:
          return "uniform";
      }
    })();
  };

  // src/math/Vec2.ts
  var Vec2 = class _Vec2 {
    constructor(x = 0, y = x) {
      this.type = "Vec2";
      this._x = x;
      this._y = y;
    }
    /***
     Getters and setters (with onChange callback)
     ***/
    get x() {
      return this._x;
    }
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    get y() {
      return this._y;
    }
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /***
       Sets the vector from values
    
       params:
       @x (float): X component of our vector
       @y (float): Y component of our vector
    
       @returns {Vec2}: this vector after being set
       ***/
    set(x = 0, y = x) {
      this.x = x;
      this.y = y;
      return this;
    }
    /***
       Adds a vector to this vector
    
       params:
       @vector (Vec2): vector to add
    
       @returns {Vec2}: this vector after addition
       ***/
    add(vector = new _Vec2()) {
      this.x += vector.x;
      this.y += vector.y;
      return this;
    }
    /***
       Adds a scalar to this vector
    
       params:
       @value (float): number to add
    
       @returns {Vec2}: this vector after addition
       ***/
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      return this;
    }
    /***
       Subtracts a vector from this vector
    
       params:
       @vector (Vec2): vector to use for subtraction
    
       @returns {Vec2}: this vector after subtraction
       ***/
    sub(vector = new _Vec2()) {
      this.x -= vector.x;
      this.y -= vector.y;
      return this;
    }
    /***
       Subtracts a scalar to this vector
    
       params:
       @value (float): number to use for subtraction
    
       @returns {Vec2}: this vector after subtraction
       ***/
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      return this;
    }
    /***
       Multiplies a vector with this vector
    
       params:
       @vector (Vec2): vector to use for multiplication
    
       @returns {Vec2}: this vector after multiplication
       ***/
    multiply(vector = new _Vec2(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      return this;
    }
    /***
       Multiplies a scalar with this vector
    
       params:
       @value (float): number to use for multiplication
    
       @returns {Vec2}: this vector after multiplication
       ***/
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      return this;
    }
    /***
       Copy a vector into this vector
    
       params:
       @vector (Vec2): vector to copy
    
       @returns {Vec2}: this vector after copy
       ***/
    copy(vector = new _Vec2()) {
      this.x = vector.x;
      this.y = vector.y;
      return this;
    }
    /***
       Clone this vector
    
       @returns {Vec2}: cloned vector
       ***/
    clone() {
      return new _Vec2(this.x, this.y);
    }
    /***
       Apply max values to this vector
    
       params:
       @vector (Vec2): vector representing max values
    
       @returns {Vec2}: vector with max values applied
       ***/
    max(vector = new _Vec2()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      return this;
    }
    /***
       Apply min values to this vector
    
       params:
       @vector (Vec2): vector representing min values
    
       @returns {Vec2}: vector with min values applied
       ***/
    min(vector = new _Vec2()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      return this;
    }
    /***
       Checks if 2 vectors are equal
    
       params:
       @vector (Vec2): vector to compare
    
       @returns {boolean}: whether the vectors are equals or not
       ***/
    equals(vector = new _Vec2()) {
      return this.x === vector.x && this.y === vector.y;
    }
    /***
       Normalize this vector
    
       @returns {Vec2}: normalized vector
       ***/
    normalize() {
      let len = this.x * this.x + this.y * this.y;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      return this;
    }
    /***
       Calculates the dot product of 2 vectors
    
       params:
       @vector (Vec2): vector to use for dot product
    
       @returns {number}: dot product of the 2 vectors
       ***/
    dot(vector = new _Vec2()) {
      return this.x * vector.x + this.y * vector.y;
    }
    lerp(vector = new _Vec2(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      return this;
    }
  };

  // src/math/Quat.ts
  var Quat = class _Quat {
    constructor(elements = new Float32Array([0, 0, 0, 1]), axisOrder = "XYZ") {
      this.type = "Quat";
      this.elements = elements;
      this.axisOrder = axisOrder;
    }
    /***
       Sets the quaternion values from an array
    
       params:
       @array (array): an array of at least 4 elements
    
       @returns {Quat}: this quaternion after being set
       ***/
    setFromArray(array = new Float32Array([0, 0, 0, 1])) {
      this.elements[0] = array[0];
      this.elements[1] = array[1];
      this.elements[2] = array[2];
      this.elements[3] = array[3];
      return this;
    }
    /***
       Sets the quaternion axis order
    
       params:
       @axisOrder (string): an array of at least 4 elements
    
       @returns {Quat}: this quaternion after axis order has been set
       ***/
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
    /***
       Copy a quaternion into this quaternion
    
       params:
       @vector (Quat): quaternion to copy
    
       @returns {Quat}: this quaternion after copy
       ***/
    copy(quaternion = new _Quat()) {
      this.elements = quaternion.elements;
      this.axisOrder = quaternion.axisOrder;
      return this;
    }
    /***
       Clone a quaternion
    
       @returns {Quat}: cloned quaternion
       ***/
    clone() {
      return new _Quat().copy(this);
    }
    /***
       Checks if 2 quaternions are equal
    
       @returns {boolean}: whether the quaternions are equals or not
       ***/
    equals(quaternion = new _Quat()) {
      return this.elements[0] === quaternion.elements[0] && this.elements[1] === quaternion.elements[1] && this.elements[2] === quaternion.elements[2] && this.elements[3] === quaternion.elements[3] && this.axisOrder === quaternion.axisOrder;
    }
    /***
       Sets a rotation quaternion using Euler angles and its axis order
    
       params:
       @vector (Vec3 class object): rotation vector to set our quaternion from
    
       @returns {Quat}: quaternion after having applied the rotation
       ***/
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
  };

  // src/math/Mat4.ts
  var Mat4 = class _Mat4 {
    // prettier-ignore
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
     * @returns {Mat4}: this matrix after being set
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
    /***
       Sets the matrix to an identity matrix
    
       @returns {Mat4}: this matrix after being set
       ***/
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
    /***
       Sets the matrix values from an array
    
       @param {Float32Array} array of at least 16 elements
    
       @returns {Mat4}: this matrix after being set
       ***/
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
    /***
     * Copy another Mat4
     *
     * @param matrix {Mat4}: matrix to copy
     * @returns {Mat4}: this matrix after copy
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
    /***
     * Clone a matrix
     *
     * @returns {Mat4}: cloned matrix
     */
    clone() {
      return new _Mat4().copy(this);
    }
    /***
       Simple matrix multiplication helper
    
       params:
       @matrix (Mat4 class object): Mat4 to multiply with
    
       @returns {Mat4}: Mat4 after multiplication
       ***/
    multiply(matrix = new _Mat4()) {
      return this.multiplyMatrices(this, matrix);
    }
    premultiply(matrix = new _Mat4()) {
      return this.multiplyMatrices(matrix, this);
    }
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
    /***
       Get matrix inverse
    
       @returns {Mat4}: inverted Mat4
       ***/
    getInverse() {
      const te = this.elements;
      const out = new _Mat4();
      const oe = out.elements;
      const a00 = te[0], a01 = te[1], a02 = te[2], a03 = te[3];
      const a10 = te[4], a11 = te[5], a12 = te[6], a13 = te[7];
      const a20 = te[8], a21 = te[9], a22 = te[10], a23 = te[11];
      const a30 = te[12], a31 = te[13], a32 = te[14], a33 = te[15];
      const b00 = a00 * a11 - a01 * a10;
      const b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11;
      const b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30;
      const b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31;
      const b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) {
        return null;
      }
      det = 1 / det;
      oe[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      oe[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      oe[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      oe[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      oe[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      oe[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      oe[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      oe[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      oe[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      oe[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      oe[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      oe[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      oe[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      oe[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      oe[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      oe[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
    translate(vector = new Vec3()) {
      const a = this.elements;
      a[12] = a[0] * vector.x + a[4] * vector.y + a[8] * vector.z + a[12];
      a[13] = a[1] * vector.x + a[5] * vector.y + a[9] * vector.z + a[13];
      a[14] = a[2] * vector.x + a[6] * vector.y + a[10] * vector.z + a[14];
      a[15] = a[3] * vector.x + a[7] * vector.y + a[11] * vector.z + a[15];
      return this;
    }
    /***
       Simple Mat4 scaling helper
    
       params :
       @vector (Vec3 class object): Vec3 representing scale along X, Y and Z axis
    
       @returns {Mat4}: Mat4 after scaling
       ***/
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
    /***
       Creates a matrix from a quaternion rotation, vector translation and vector scale
       Equivalent for applying translation, rotation and scale matrices but much faster
       Source code from: http://glmatrix.net/docs/mat4.js.html
    
       params :
       @translation (Vec3 class object): translation vector
       @quaternion (Quat class object): rotation quaternion
       @scale (Vec3 class object): scale vector
    
       @returns {Mat4}: matrix after transformations
       ***/
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
    /***
       Creates a matrix from a quaternion rotation, vector translation and vector scale, rotating and scaling around the given origin
       Equivalent for applying translation, rotation and scale matrices but much faster
       Source code from: http://glmatrix.net/docs/mat4.js.html
    
       params :
       @translation (Vec3 class object): translation vector
       @quaternion (Quat class object): rotation quaternion
       @scale (Vec3 class object): scale vector
       @origin (Vec3 class object): origin vector around which to scale and rotate
    
       @returns {Mat4}: matrix after transformations
       ***/
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
    constructor(x = 0, y = x, z = x) {
      this.type = "Vec3";
      this._x = x;
      this._y = y;
      this._z = z;
    }
    /***
     Getters and setters (with onChange callback)
     ***/
    get x() {
      return this._x;
    }
    set x(value) {
      const changed = value !== this._x;
      this._x = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    get y() {
      return this._y;
    }
    set y(value) {
      const changed = value !== this._y;
      this._y = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    get z() {
      return this._z;
    }
    set z(value) {
      const changed = value !== this._z;
      this._z = value;
      changed && this._onChangeCallback && this._onChangeCallback();
    }
    onChange(callback) {
      if (callback) {
        this._onChangeCallback = callback;
      }
      return this;
    }
    /***
       Sets the vector from values
    
       params:
       @x (float): X component of our vector
       @y (float): Y component of our vector
       @z (float): Z component of our vector
    
       @returns {Vec3}: this vector after being set
       ***/
    set(x = 0, y = 0, z = 0) {
      this.x = x;
      this.y = y;
      this.z = z;
      return this;
    }
    /***
       Adds a vector to this vector
    
       params:
       @vector (Vec3): vector to add
    
       @returns {Vec3}: this vector after addition
       ***/
    add(vector = new _Vec3()) {
      this.x += vector.x;
      this.y += vector.y;
      this.z += vector.z;
      return this;
    }
    /***
       Adds a scalar to this vector
    
       params:
       @value (float): number to add
    
       @returns {Vec3}: this vector after addition
       ***/
    addScalar(value = 0) {
      this.x += value;
      this.y += value;
      this.z += value;
      return this;
    }
    /***
       Subtracts a vector from this vector
    
       params:
       @vector (Vec3): vector to use for subtraction
    
       @returns {Vec3}: this vector after subtraction
       ***/
    sub(vector = new _Vec3()) {
      this.x -= vector.x;
      this.y -= vector.y;
      this.z -= vector.z;
      return this;
    }
    /***
       Subtracts a scalar to this vector
    
       params:
       @value (float): number to use for subtraction
    
       @returns {Vec3}: this vector after subtraction
       ***/
    subScalar(value = 0) {
      this.x -= value;
      this.y -= value;
      this.z -= value;
      return this;
    }
    /***
       Multiplies a vector with this vector
    
       params:
       @vector (Vec3): vector to use for multiplication
    
       @returns {Vec3}: this vector after multiplication
       ***/
    multiply(vector = new _Vec3(1)) {
      this.x *= vector.x;
      this.y *= vector.y;
      this.z *= vector.z;
      return this;
    }
    /***
       Multiplies a scalar with this vector
    
       params:
       @value (float): number to use for multiplication
    
       @returns {Vec3}: this vector after multiplication
       ***/
    multiplyScalar(value = 1) {
      this.x *= value;
      this.y *= value;
      this.z *= value;
      return this;
    }
    /***
       Copy a vector into this vector
    
       params:
       @vector (Vec3): vector to copy
    
       @returns {Vec3}: this vector after copy
       ***/
    copy(vector = new _Vec3()) {
      this.x = vector.x;
      this.y = vector.y;
      this.z = vector.z;
      return this;
    }
    /***
       Clone this vector
    
       @returns {Vec3}: cloned vector
       ***/
    clone() {
      return new _Vec3(this.x, this.y, this.z);
    }
    /***
       Apply max values to this vector
    
       params:
       @vector (Vec3): vector representing max values
    
       @returns {Vec3}: vector with max values applied
       ***/
    max(vector = new _Vec3()) {
      this.x = Math.max(this.x, vector.x);
      this.y = Math.max(this.y, vector.y);
      this.z = Math.max(this.z, vector.z);
      return this;
    }
    /***
       Apply min values to this vector
    
       params:
       @vector (Vec3): vector representing min values
    
       @returns {Vec3}: vector with min values applied
       ***/
    min(vector = new _Vec3()) {
      this.x = Math.min(this.x, vector.x);
      this.y = Math.min(this.y, vector.y);
      this.z = Math.min(this.z, vector.z);
      return this;
    }
    /***
       Checks if 2 vectors are equal
    
       @returns {boolean}: whether the vectors are equals or not
       ***/
    equals(vector = new _Vec3()) {
      return this.x === vector.x && this.y === vector.y && this.z === vector.z;
    }
    /***
       Normalize this vector
    
       @returns {Vec3}: normalized vector
       ***/
    normalize() {
      let len = this.x * this.x + this.y * this.y + this.z * this.z;
      if (len > 0) {
        len = 1 / Math.sqrt(len);
      }
      this.x *= len;
      this.y *= len;
      this.z *= len;
      return this;
    }
    /***
       Calculates the dot product of 2 vectors
    
       @returns {number}: dot product of the 2 vectors
       ***/
    dot(vector = new _Vec3()) {
      return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }
    lerp(vector = new _Vec3(), alpha = 1) {
      this.x += (vector.x - this.x) * alpha;
      this.y += (vector.y - this.y) * alpha;
      this.z += (vector.z - this.z) * alpha;
      return this;
    }
    /***
       Apply a matrix 4 to a point (vec3)
       Useful to convert a point position from plane local world to webgl space using projection view matrix for example
       Source code from: http://glmatrix.net/docs/vec3.js.html
    
       params :
       @matrix (array): 4x4 matrix used
    
       @returns {Vec3}: this vector after matrix application
       ***/
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
    /***
       Apply a quaternion (rotation in 3D space) to this vector
    
       params :
       @quaternion (Quat): quaternion to use
    
       @returns {Vec3}: this vector after applying the transformation
       ***/
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
    /***
       Project 3D coordinate to 2D point
    
       params:
       @camera (Camera): camera to use for projection
    
       @returns {Vec3}
       ***/
    project(camera) {
      this.applyMat4(camera.viewMatrix).applyMat4(camera.projectionMatrix);
      return this;
    }
    /***
       Unproject 2D point to 3D coordinate
    
       params:
       @camera (Camera): camera to use for projection
    
       @returns {Vec3}
       ***/
    unproject(camera) {
      this.applyMat4(camera.projectionMatrix.getInverse()).applyMat4(camera.modelMatrix);
      return this;
    }
  };

  // src/core/bindings/BufferBindings.ts
  var BufferBindings = class extends Bindings {
    /**
     * BufferBindings constructor
     * @param parameters - parameters used to create our BufferBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {boolean=} parameters.useStruct - whether to use structured WGSL variables
     * @param {Object.<string, Input>} parameters.bindings - bindings inputs
     */
    constructor({
      label = "Uniform",
      name = "uniform",
      bindingType,
      bindIndex = 0,
      visibility,
      useStruct = true,
      bindings = {}
    }) {
      bindingType = bindingType ?? "uniform";
      super({ label, name, bindIndex, bindingType, visibility });
      this.size = 0;
      this.shouldUpdate = false;
      this.useStruct = useStruct;
      this.bindingElements = [];
      this.bindings = {};
      this.buffer = null;
      this.setBindings(bindings);
      this.setBufferAttributes();
      this.setWGSLFragment();
    }
    /**
     * Get [bind group layout entry resource]{@link GPUBindGroupLayoutEntry#buffer}
     */
    get resourceLayout() {
      return {
        buffer: {
          type: getBindGroupLayoutBindingType(this.bindingType)
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
     * Format input bindings and set our {@link bindings}
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
        this.bindings[bindingKey] = binding;
      });
    }
    /**
     * Set our buffer attributes:
     * Takes all the {@link bindings} and adds them to the {@link bindingElements} array with the correct start and end offsets (padded), then fill our {@link value} typed array accordingly.
     */
    setBufferAttributes() {
      Object.keys(this.bindings).forEach((bindingKey) => {
        const binding = this.bindings[bindingKey];
        const bufferLayout = binding.type && binding.type.indexOf("array") !== -1 && binding.value instanceof Float32Array ? {
          numElements: binding.value.length,
          align: 16,
          size: binding.value.byteLength,
          type: "f32",
          View: Float32Array
        } : getBufferLayout(binding.type);
        this.bindingElements.push({
          name: toCamelCase(binding.name ?? bindingKey),
          type: binding.type ?? "array<f32>",
          key: bindingKey,
          bufferLayout,
          startOffset: 0,
          // will be changed later
          endOffset: 0
          // will be changed later
        });
      });
      this.alignmentRows = 0;
      const bytesPerElement = Float32Array.BYTES_PER_ELEMENT;
      this.bindingElements.forEach((bindingElement, index) => {
        const { numElements, align } = bindingElement.bufferLayout;
        if (index === 0) {
          bindingElement.startOffset = 0;
          this.alignmentRows += Math.max(1, Math.ceil(numElements / bytesPerElement));
        } else {
          let nextSpaceAvailable = this.bindingElements[index - 1].startOffset + this.bindingElements[index - 1].bufferLayout.numElements;
          if (align <= bytesPerElement * 2) {
            if (numElements === 2 && nextSpaceAvailable % 2 === 1) {
              nextSpaceAvailable = nextSpaceAvailable + 1;
            }
            if (nextSpaceAvailable + numElements <= this.alignmentRows * bytesPerElement) {
              bindingElement.startOffset = nextSpaceAvailable;
            } else {
              bindingElement.startOffset = this.alignmentRows * bytesPerElement;
              this.alignmentRows++;
            }
          } else {
            if (nextSpaceAvailable % align !== 0 || (nextSpaceAvailable + numElements) % bytesPerElement !== 0) {
              bindingElement.startOffset = this.alignmentRows * bytesPerElement;
              this.alignmentRows += Math.ceil(numElements / bytesPerElement);
            } else {
              bindingElement.startOffset = nextSpaceAvailable;
              this.alignmentRows += Math.ceil(numElements / bytesPerElement);
            }
          }
        }
        bindingElement.endOffset = bindingElement.startOffset + bindingElement.bufferLayout.numElements;
      });
      this.size = this.alignmentRows * bytesPerElement;
      this.value = new Float32Array(this.size);
      this.bindingElements.forEach((bindingElement) => {
        bindingElement.array = new bindingElement.bufferLayout.View(
          this.value.subarray(bindingElement.startOffset, bindingElement.endOffset)
        );
        bindingElement.update = (value) => {
          if (bindingElement.type === "f32") {
            bindingElement.array[0] = value;
          } else if (bindingElement.type === "vec2f") {
            bindingElement.array[0] = value.x ?? value[0] ?? 0;
            bindingElement.array[1] = value.y ?? value[1] ?? 0;
          } else if (bindingElement.type === "vec3f") {
            bindingElement.array[0] = value.x ?? value[0] ?? 0;
            bindingElement.array[1] = value.y ?? value[1] ?? 0;
            bindingElement.array[2] = value.z ?? value[2] ?? 0;
          } else if (value.elements) {
            bindingElement.array = value.elements;
          } else if (value instanceof Float32Array) {
            bindingElement.array.set(value.slice());
          } else if (Array.isArray(value)) {
            for (let i = 0; i < bindingElement.array.length; i++) {
              bindingElement.array[i] = value[i] ? value[i] : 0;
            }
          }
        };
      });
      this.shouldUpdate = this.size > 0;
    }
    /**
     * Set the WGSL code snippet to append to the shaders code. It consists of variable (and Struct structures if needed) declarations.
     */
    setWGSLFragment() {
      if (this.useStruct) {
        const notAllArrays = Object.keys(this.bindings).find(
          (bindingKey) => this.bindings[bindingKey].type.indexOf("array") === -1
        );
        if (!notAllArrays) {
          const kebabCaseLabel = toKebabCase(this.label);
          this.wgslStructFragment = `struct ${kebabCaseLabel} {
	${this.bindingElements.map((binding) => binding.name + ": " + binding.type.replace("array", "").replace("<", "").replace(">", "")).join(",\n	")}
};`;
          const varType = getBindingWgslVarType(this.bindingType);
          this.wgslGroupFragment = [`${varType} ${this.name}: array<${kebabCaseLabel}>;`];
        } else {
          this.wgslStructFragment = `struct ${toKebabCase(this.label)} {
	${this.bindingElements.map((binding) => binding.name + ": " + binding.type).join(",\n	")}
};`;
          const varType = getBindingWgslVarType(this.bindingType);
          this.wgslGroupFragment = [`${varType} ${this.name}: ${toKebabCase(this.label)};`];
        }
      } else {
        this.wgslStructFragment = "";
        this.wgslGroupFragment = this.bindingElements.map((binding) => {
          const varType = getBindingWgslVarType(this.bindingType);
          return `${varType} ${binding.name}: ${binding.type};`;
        });
      }
    }
    /**
     * Set a binding shouldUpdate flag to true to update our {@link value} array during next render.
     * @param bindingName - the binding name/key to update
     */
    shouldUpdateBinding(bindingName = "") {
      const bindingKey = Object.keys(this.bindings).find((bindingKey2) => this.bindings[bindingKey2].name === bindingName);
      if (bindingKey)
        this.bindings[bindingKey].shouldUpdate = true;
    }
    /**
     * Executed at the beginning of a Material render call.
     * If any of the {@link bindings} has changed, run its onBeforeUpdate callback then updates our {@link value} array.
     * Also sets the {@link shouldUpdate} property to true so the {@link BindGroup} knows it will need to update the GPUBuffer.
     */
    onBeforeRender() {
      Object.keys(this.bindings).forEach((bindingKey, bindingIndex) => {
        const binding = this.bindings[bindingKey];
        const bindingElement = this.bindingElements.find((bindingEl) => bindingEl.key === bindingKey);
        if (binding.shouldUpdate && bindingElement) {
          binding.onBeforeUpdate && binding.onBeforeUpdate();
          bindingElement.update(binding.value);
          const notAllArrays = Object.keys(this.bindings).find(
            (bindingKey2) => this.bindings[bindingKey2].type.indexOf("array") === -1
          );
          if (notAllArrays) {
            this.value.set(bindingElement.array, bindingElement.startOffset);
          } else {
            const arrayStride = getBufferArrayStride(bindingElement);
            let totalArrayStride = 0;
            let startIndex = 0;
            this.bindingElements.forEach((bindingEl, index) => {
              totalArrayStride += getBufferArrayStride(bindingEl);
              if (index < bindingIndex) {
                startIndex += getBufferArrayStride(bindingEl);
              }
            });
            for (let i = 0, j = 0; j < bindingElement.array.length; i++, j += arrayStride) {
              this.value.set(bindingElement.array.subarray(j, j + arrayStride), i * totalArrayStride + startIndex);
            }
          }
          this.shouldUpdate = true;
          binding.shouldUpdate = false;
        }
      });
    }
  };

  // src/core/bindings/WorkBufferBindings.ts
  var WorkBufferBindings = class extends BufferBindings {
    /**
     * WorkBufferBindings constructor
     * @param parameters - [parameters]{@link WorkBufferBindingsParams} used to create our {@link WorkBufferBindings}
     */
    constructor({
      label = "Work",
      name = "work",
      bindingType,
      bindIndex = 0,
      useStruct = true,
      bindings = {},
      visibility,
      dispatchSize,
      shouldCopyResult = false
    }) {
      bindingType = "storageWrite";
      visibility = "compute";
      super({ label, name, bindIndex, bindingType, useStruct, bindings, visibility });
      if (!dispatchSize) {
        dispatchSize = [1, 1, 1];
      } else if (Array.isArray(dispatchSize)) {
        dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1);
        dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1);
        dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1);
      } else if (!isNaN(dispatchSize)) {
        dispatchSize = [Math.ceil(dispatchSize), 1, 1];
      }
      this.dispatchSize = dispatchSize;
      this.shouldCopyResult = shouldCopyResult;
      this.result = new Float32Array(this.value.slice());
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
    constructor(renderer, { label = "BindGroup", index = 0, bindings = [], inputs } = {}) {
      this.type = "BindGroup";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, this.type);
      this.renderer = renderer;
      this.options = {
        label,
        index,
        bindings,
        ...inputs && { inputs }
      };
      this.index = index;
      this.uuid = generateUUID();
      this.bindings = [];
      bindings.length && this.addBindings(bindings);
      if (this.options.inputs)
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
     * @param bindingType - [binding type]{@link Bindings#bindingType}
     * @param inputs - [inputs]{@link InputBindings} that will be used to create the binding
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
            bindings: binding.bindings,
            dispatchSize: binding.dispatchSize,
            visibility: bindingType === "storageWrite" ? "compute" : binding.visibility
          };
          const BufferBindingConstructor = bindingType === "storageWrite" ? WorkBufferBindings : BufferBindings;
          return binding.useStruct !== false ? new BufferBindingConstructor(bindingParams) : Object.keys(binding.bindings).map((bindingKey) => {
            bindingParams.label = toKebabCase(binding.label ? binding.label + bindingKey : inputKey + bindingKey);
            bindingParams.name = inputKey + bindingKey;
            bindingParams.useStruct = false;
            bindingParams.bindings = { [bindingKey]: binding.bindings[bindingKey] };
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
        ...this.createInputBindings("uniform", this.options.inputs.uniforms),
        ...this.createInputBindings("storage", this.options.inputs.storages),
        ...this.createInputBindings("storageWrite", this.options.inputs.works)
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
     * Reset {@link BindGroup} {@link entries} and recreates it
     */
    // TODO not necessarily needed?
    resetBindGroup() {
      this.resetEntries();
      this.createBindGroup();
    }
    /**
     * Get all bindings that handle a GPUBuffer
     */
    get bufferBindings() {
      return this.bindings.filter(
        (binding) => binding instanceof BufferBindings || binding instanceof WorkBufferBindings
      );
    }
    /**
     * Creates binding GPUBuffer with correct params
     * @param binding - the binding element
     */
    createBindingBuffer(binding) {
      binding.buffer = this.renderer.createBuffer({
        label: this.options.label + ": " + binding.bindingType + " buffer from: " + binding.label,
        size: binding.value.byteLength,
        usage: binding.bindingType === "uniform" ? GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX : GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC | GPUBufferUsage.VERTEX
      });
      if ("resultBuffer" in binding) {
        binding.resultBuffer = this.renderer.createBuffer({
          label: this.options.label + ": Result buffer from: " + binding.label,
          size: binding.value.byteLength,
          usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
      }
    }
    /**
     * Fill in our entries bindGroupLayout and bindGroup arrays with the correct binding resources.
     * For buffer bindings, create a GPUBuffer first if needed
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
    getBindingsByName(bindingName = "") {
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
     * Check whether we should update (write the buffer) our GPUBuffer or not
     * Called at each render from Material
     */
    updateBindings() {
      this.bufferBindings.forEach((binding, index) => {
        if (binding.shouldUpdate) {
          if (!binding.useStruct && binding.bindingElements.length > 1) {
            this.renderer.queueWriteBuffer(binding.buffer, 0, binding.bindingElements[index].array);
          } else {
            this.renderer.queueWriteBuffer(binding.buffer, 0, binding.value);
          }
        }
        binding.shouldUpdate = false;
      });
    }
    /**
     * Clones a {@link BindGroup} from a list of {@link bindings}
     * Useful to create a new bind group with already created buffers, but swapped
     * @param bindings - our input {@link bindings}
     * @param keepLayout - whether we should keep original {@link bindGroupLayout} or not
     * @returns - the cloned {@link BindGroup}
     */
    cloneFromBindings({
      bindings = [],
      keepLayout = false
    } = {}) {
      const params = { ...this.options };
      params.label += " (copy)";
      const bindGroupCopy = new this.constructor(this.renderer, {
        label: params.label
      });
      bindGroupCopy.setIndex(this.index);
      const bindingsRef = bindings.length ? bindings : this.bindings;
      bindingsRef.forEach((binding, index) => {
        bindGroupCopy.addBinding(binding);
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
    clone() {
      return this.cloneFromBindings();
    }
    /**
     * Destroy our {@link BindGroup}
     * Most important is to destroy the GPUBuffers to free the memory
     */
    destroy() {
      this.bindings.forEach((binding) => {
        if ("buffer" in binding) {
          binding.buffer?.destroy();
        }
        if ("resultBuffer" in binding) {
          binding.resultBuffer?.destroy();
        }
      });
      this.bindings = [];
      this.bindGroupLayout = null;
      this.bindGroup = null;
      this.resetEntries();
    }
  };

  // src/core/bindings/TextureBindings.ts
  var TextureBindings = class extends Bindings {
    /**
     * TextureBindings constructor
     * @param parameters - parameters used to create our TextureBindings
     * @param {string=} parameters.label - binding label
     * @param {string=} parameters.name - binding name
     * @param {BindingType="uniform"} parameters.bindingType - binding type
     * @param {number=} parameters.bindIndex - bind index inside the bind group
     * @param {MaterialShadersType=} parameters.visibility - shader visibility
     * @param {TextureBindingResource=} parameters.resource - a GPUTexture or GPUExternalTexture
     */
    constructor({
      label = "Texture",
      name = "texture",
      texture,
      bindingType,
      bindIndex = 0,
      visibility
    }) {
      bindingType = bindingType ?? "texture";
      super({ label, name, bindingType, bindIndex, visibility });
      this.resource = texture;
      this.setWGSLFragment();
    }
    /**
     * Get bind group layout entry resource, either for [texture]{@link GPUBindGroupLayoutEntry#texture} or [externalTexture]{@link GPUBindGroupLayoutEntry#externalTexture}
     */
    get resourceLayout() {
      return this.texture instanceof GPUExternalTexture ? { externalTexture: {} } : this.texture instanceof GPUTexture ? { texture: {} } : null;
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
     * Set or update our [bindingType]{@link Bindings#bindingType} and our WGSL code snippet
     * @param bindingType - the new [binding type]{@link Bindings#bindingType}
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
      this.wgslGroupFragment = [
        this.bindingType === "externalTexture" ? `var ${this.name}: texture_external;` : `var ${this.name}: texture_2d<f32>;`
      ];
    }
  };

  // src/core/bindGroups/TextureBindGroup.ts
  var TextureBindGroup = class extends BindGroup {
    /**
     * TextureBindGroup constructor
     * @param {(Renderer|GPUCurtains)} renderer - a {@link Renderer} class object or a {@link GPUCurtains} class object
     * @param {TextureBindGroupParams=} parameters - [parameters]{@link TextureBindGroupParams} used to create our {@link TextureBindGroup}
     */
    constructor(renderer, { label, index = 0, bindings = [], inputs, textures = [], samplers = [] } = {}) {
      const type = "TextureBindGroup";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, type);
      super(renderer, { label, index, bindings, inputs });
      this.options = {
        ...this.options,
        textures,
        samplers
      };
      this.type = type;
      this.externalTexturesIDs = [];
    }
    /**
     * Adds a texture to the textures array and the bindings
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
     * Adds a sampler to the samplers array and the bindings
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
     * - A texture media has been loaded (switching from placeholder 1x1 GPUTexture to media GPUTexture)
     * - GPUExternalTexture at each tick
     * - A render texture GPUTexture has changed (on resize)
     */
    resetTextureBindGroup() {
      const textureBindingsIndexes = [...this.bindings].reduce(
        (foundIndexes, binding, index) => (binding instanceof TextureBindings && foundIndexes.push(index), foundIndexes),
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
     * Destroy our {@link TextureBindGroup}
     */
    destroy() {
      super.destroy();
      this.options.textures = [];
      this.options.samplers = [];
    }
  };

  // src/core/bindings/SamplerBindings.ts
  var SamplerBindings = class extends Bindings {
    /**
     * SamplerBindings constructor
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
  var Camera = class {
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
      onPerspectiveChanged = () => {
      },
      onPositionChanged = () => {
      }
    } = {}) {
      this.position = new Vec3(0, 0, 1).onChange(() => this.applyPosition());
      this.projectionMatrix = new Mat4();
      this.modelMatrix = new Mat4();
      this.viewMatrix = new Mat4();
      this.onPerspectiveChanged = onPerspectiveChanged;
      this.onPositionChanged = onPositionChanged;
      this.shouldUpdate = false;
      this.setPerspective(fov, near, far, width, height, pixelRatio);
    }
    /**
     * Sets the {@link Camera} {@link fov}. Update the {@link projectionMatrix} only if the field of view actually changed
     * @param fov - new {@link fov}
     */
    setFov(fov = this.fov) {
      fov = Math.max(1, Math.min(fov, 179));
      if (fov !== this.fov) {
        this.fov = fov;
        this.setPosition();
        this.shouldUpdate = true;
      }
      this.setScreenRatios();
      this.setCSSPerspective();
    }
    /**
     * Sets the {@link Camera} {@link near} plane value. Update the {@link projectionMatrix} only if the near plane actually changed
     * @param near - {@link near} plane value to use
     */
    setNear(near = this.near) {
      near = Math.max(near, 0.01);
      if (near !== this.near) {
        this.near = near;
        this.shouldUpdate = true;
      }
    }
    /**
     * Sets the {@link Camera} {@link far} plane value. Update {@link projectionMatrix} only if the far plane actually changed
     * @param far - {@link far} plane value to use
     */
    setFar(far = this.far) {
      far = Math.max(far, 50);
      if (far !== this.far) {
        this.far = far;
        this.shouldUpdate = true;
      }
    }
    /**
     * Sets the {@link Camera} {@link pixelRatio} value. Update the {@link projectionMatrix} only if the pixel ratio actually changed
     * @param pixelRatio - {@link pixelRatio} value to use
     */
    setPixelRatio(pixelRatio = this.pixelRatio) {
      if (pixelRatio !== this.pixelRatio) {
        this.shouldUpdate = true;
      }
      this.pixelRatio = pixelRatio;
    }
    /**
     * Sets the {@link Camera} {@link width} and {@link height}. Update the {@link projectionMatrix} only if the width or height actually changed
     * @param width - {@link width} value to use
     * @param height - {@link height} value to use
     */
    setSize(width, height) {
      if (width !== this.width || height !== this.height) {
        this.shouldUpdate = true;
      }
      this.width = width;
      this.height = height;
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
    setPerspective(fov = this.fov, near = this.near, far = this.far, width = this.width, height = this.height, pixelRatio = this.pixelRatio) {
      this.setPixelRatio(pixelRatio);
      this.setSize(width, height);
      this.setFov(fov);
      this.setNear(near);
      this.setFar(far);
      if (this.shouldUpdate) {
        this.updateProjectionMatrix();
        this.onPerspectiveChanged();
      }
    }
    /**
     * Sets the {@link Camera} {@link position} and update the {@link modelMatrix} and {@link viewMatrix}.
     * @param position - new {@link Camera}  {@link position}
     */
    setPosition(position = this.position) {
      this.position.copy(position);
      this.applyPosition();
    }
    /**
     * Update the {@link modelMatrix} and {@link viewMatrix}.
     */
    applyPosition() {
      this.modelMatrix.set(
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
        this.position.x,
        this.position.y,
        this.position.z,
        1
      );
      this.viewMatrix = this.modelMatrix.clone().getInverse();
      this.setScreenRatios();
      this.onPositionChanged();
    }
    /**
     * Sets a {@link CSSPerspective} property based on {@link width}, {@link height}, {@link pixelRatio} and {@link fov}
     * Used to translate planes along the Z axis using pixel units as CSS would do
     * Taken from {@link https://stackoverflow.com/questions/22421439/convert-field-of-view-value-to-css3d-perspective-value}
     */
    setCSSPerspective() {
      this.CSSPerspective = Math.pow(
        Math.pow(this.width / (2 * this.pixelRatio), 2) + Math.pow(this.height / (2 * this.pixelRatio), 2),
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
        width: height * this.width / this.height,
        height
      };
    }
    /**
     * Updates the {@link Camera} {@link projectionMatrix}
     */
    updateProjectionMatrix() {
      const aspect = this.width / this.height;
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
    createSampler() {
      this.sampler = this.renderer.createSampler(this);
    }
    createBinding() {
      this.binding = new SamplerBindings({
        label: this.label,
        name: this.name,
        bindingType: "sampler",
        sampler: this.sampler
      });
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
     * Set our transforms properties and onChange callbacks
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
      this.matrices.model.shouldUpdate = true;
    }
    /**
     * Set our model matrix shouldUpdate flag to true (tell it to update)
     */
    shouldUpdateModelMatrix() {
      this.matrices.model.shouldUpdate = true;
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
    texture: {
      generateMips: false,
      flipY: false,
      format: "rgba8unorm",
      placeholderColor: [0, 0, 0, 255],
      // default to black
      useExternalTextures: true
    },
    fromTexture: null
  };
  var Texture = class extends Object3D {
    constructor(renderer, parameters = defaultTextureParams) {
      super();
      this.#planeRatio = new Vec3(1);
      this.#textureRatio = new Vec3(1);
      this.#coverScale = new Vec3(1);
      this.#rotationMatrix = new Mat4();
      // callbacks / events
      this._onSourceLoadedCallback = () => {
      };
      this._onSourceUploadedCallback = () => {
      };
      this.type = "Texture";
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " " + this.type : this.type);
      this.renderer = renderer;
      const defaultOptions = {
        ...defaultTextureParams,
        source: parameters.fromTexture ? parameters.fromTexture.options.source : null,
        sourceType: parameters.fromTexture ? parameters.fromTexture.options.sourceType : null
      };
      this.options = { ...defaultOptions, ...parameters };
      this.options.texture = { ...defaultOptions.texture, ...parameters.texture };
      this.options.label = this.options.label ?? this.options.name;
      this.texture = null;
      this.externalTexture = null;
      this.source = null;
      this.size = {
        width: 1,
        height: 1
      };
      this.textureMatrix = new BufferBindings({
        label: this.options.label + ": model matrix",
        name: this.options.name + "Matrix",
        useStruct: false,
        bindings: {
          matrix: {
            name: this.options.name + "Matrix",
            type: "mat4x4f",
            value: this.modelMatrix,
            onBeforeUpdate: () => this.updateTextureMatrix()
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
    #planeRatio;
    #textureRatio;
    #coverScale;
    #rotationMatrix;
    setBindings() {
      this.bindings = [
        new TextureBindings({
          label: this.options.label + ": texture",
          name: this.options.name,
          texture: this.options.sourceType === "externalVideo" ? this.externalTexture : this.texture,
          bindingType: this.options.sourceType === "externalVideo" ? "externalTexture" : "texture"
        }),
        this.textureMatrix
      ];
    }
    get textureBinding() {
      return this.bindings[0];
    }
    get parent() {
      return this._parent;
    }
    set parent(value) {
      this._parent = value;
      this.resize();
    }
    get sourceLoaded() {
      return this._sourceLoaded;
    }
    set sourceLoaded(value) {
      if (value && !this.sourceLoaded) {
        this._onSourceLoadedCallback && this._onSourceLoadedCallback();
      }
      this._sourceLoaded = value;
    }
    get sourceUploaded() {
      return this._sourceUploaded;
    }
    set sourceUploaded(value) {
      if (value && !this.sourceUploaded) {
        this._onSourceUploadedCallback && this._onSourceUploadedCallback();
      }
      this._sourceUploaded = value;
    }
    setTransforms() {
      super.setTransforms();
      this.transforms.quaternion.setAxisOrder("ZXY");
      this.transforms.origin.model.set(0.5, 0.5, 0);
    }
    applyPosition() {
      super.applyPosition();
      this.resize();
    }
    applyRotation() {
      super.applyRotation();
      this.resize();
    }
    applyScale() {
      super.applyScale();
      this.resize();
    }
    applyTransformOrigin() {
      super.applyTransformOrigin();
      this.resize();
    }
    /*** TEXTURE MATRIX ***/
    updateTextureMatrix() {
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
        this.#planeRatio.set(parentRatio, 1, 1);
        this.#textureRatio.set(1 / sourceRatio, 1, 1);
      } else {
        this.#planeRatio.set(1, 1 / parentRatio, 1);
        this.#textureRatio.set(1, sourceRatio, 1);
      }
      const coverRatio = parentRatio > sourceRatio !== parentWidth > parentHeight ? 1 : parentWidth > parentHeight ? this.#planeRatio.x * this.#textureRatio.x : this.#textureRatio.y * this.#planeRatio.y;
      this.#coverScale.set(1 / (coverRatio * this.scale.x), 1 / (coverRatio * this.scale.y), 1);
      this.#rotationMatrix.rotateFromQuaternion(this.quaternion);
      this.modelMatrix.identity().premultiplyTranslate(this.transformOrigin.clone().multiplyScalar(-1)).premultiplyScale(this.#coverScale).premultiplyScale(this.#planeRatio).premultiply(this.#rotationMatrix).premultiplyScale(this.#textureRatio).premultiplyTranslate(this.transformOrigin).translate(this.position);
    }
    resize() {
      if (!this.textureMatrix)
        return;
      if (this.source && this.source instanceof HTMLCanvasElement && (this.source.width !== this.size.width || this.source.height !== this.size.height)) {
        this.setSourceSize();
        this.createTexture();
      }
      this.textureMatrix.shouldUpdateBinding(this.options.name + "Matrix");
    }
    getNumMipLevels(...sizes) {
      const maxSize = Math.max(...sizes);
      return 1 + Math.log2(maxSize) | 0;
    }
    uploadTexture() {
      this.renderer.uploadTexture(this);
      this.shouldUpdate = false;
    }
    uploadVideoTexture() {
      this.externalTexture = this.renderer.importExternalTexture(this.source);
      this.textureBinding.resource = this.externalTexture;
      this.textureBinding.setBindingType("externalTexture");
      this.shouldUpdateBindGroup = true;
      this.shouldUpdate = false;
      this.sourceUploaded = true;
    }
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
      this.options.texture = texture.options.texture;
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
          this.shouldUpdateBindGroup = true;
        } else {
          this.createTexture();
        }
      }
    }
    createTexture() {
      const options = {
        label: this.options.label,
        format: this.options.texture.format,
        size: [this.size.width, this.size.height],
        // [1, 1] if no source
        usage: !!this.source ? GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT : GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
      };
      if (this.options.sourceType !== "externalVideo") {
        options.mipLevelCount = this.options.texture.generateMips ? this.getNumMipLevels(this.size.width, this.size.height) : 1;
        this.texture?.destroy();
        this.texture = this.renderer.createTexture(options);
        this.textureBinding.resource = this.texture;
        this.shouldUpdateBindGroup = !!this.source;
      }
      this.shouldUpdate = true;
    }
    /** SOURCES **/
    setSourceSize() {
      this.size = {
        width: this.source.naturalWidth || this.source.width || this.source.videoWidth,
        height: this.source.naturalHeight || this.source.height || this.source.videoHeight
      };
    }
    async loadImageBitmap(url) {
      const res = await fetch(url);
      const blob = await res.blob();
      return await createImageBitmap(blob, { colorSpaceConversion: "none" });
    }
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
    onVideoFrameCallback() {
      if (this.videoFrameCallbackId) {
        this.shouldUpdate = true;
        this.source.requestVideoFrameCallback(this.onVideoFrameCallback.bind(this));
      }
    }
    onVideoLoaded(video) {
      if (!this.sourceLoaded) {
        this.source = video;
        this.setSourceSize();
        this.resize();
        if (this.options.texture.useExternalTextures) {
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
    get isVideoSource() {
      return this.source && (this.options.sourceType === "video" || this.options.sourceType === "externalVideo");
    }
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
    /** EVENTS **/
    onSourceLoaded(callback) {
      if (callback) {
        this._onSourceLoadedCallback = callback;
      }
      return this;
    }
    onSourceUploaded(callback) {
      if (callback) {
        this._onSourceUploadedCallback = callback;
      }
      return this;
    }
    /** RENDER **/
    render() {
      this.textureMatrix.onBeforeRender();
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
    /** DESTROY **/
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
      const { shaders, label, useAsyncPipeline, inputs, bindGroups, samplers } = parameters;
      this.options = {
        shaders,
        label,
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline },
        ...inputs !== void 0 && { inputs },
        ...bindGroups !== void 0 && { bindGroups },
        ...samplers !== void 0 && { samplers }
      };
      this.bindGroups = [];
      this.clonedBindGroups = [];
      this.setBindGroups();
      this.setTextures();
      this.setSamplers();
    }
    /**
     * Check if all bind groups are ready, and create them if needed
     */
    setMaterial() {
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
     * @param [shaderType="full"] - shader to get the code from
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
      this.works = {};
      this.inputsBindGroups = [];
      this.inputsBindings = [];
      if (this.options.inputs) {
        const inputsBindGroup = new BindGroup(this.renderer, {
          label: this.options.label + ": Bindings bind group",
          inputs: this.options.inputs
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
     * Process all {@see BindGroup} bindings and add them to the corresponding objects based on their binding types. Also store them in a inputsBindings array to facilitate further access to bindings.
     * @param bindGroup - The {@see BindGroup} to process
     */
    processBindGroupBindings(bindGroup) {
      bindGroup.bindings.forEach((inputBinding) => {
        if (inputBinding.bindingType === "uniform")
          this.uniforms = {
            ...this.uniforms,
            [inputBinding.name]: inputBinding.bindings
          };
        if (inputBinding.bindingType === "storage")
          this.storages = {
            ...this.storages,
            [inputBinding.name]: inputBinding.bindings
          };
        if (inputBinding.bindingType === "storageWrite")
          this.works = { ...this.works, [inputBinding.name]: inputBinding.bindings };
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
      this.options.bindGroups?.forEach((bindGroup) => {
        if (!bindGroup.shouldCreateBindGroup && !this.bindGroups.find((bG) => bG.uuid === bindGroup.uuid)) {
          this.bindGroups.push(bindGroup);
        }
      });
      this.inputsBindGroups.forEach((bindGroup) => {
        if (bindGroup.shouldCreateBindGroup) {
          bindGroup.setIndex(this.bindGroups.length);
          bindGroup.createBindGroup();
          this.bindGroups.push(bindGroup);
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
      const clone = bindGroup.cloneFromBindings({ bindings, keepLayout });
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
     * Destroy all bind groups
     */
    destroyBindGroups() {
      this.bindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.clonedBindGroups.forEach((bindGroup) => bindGroup.destroy());
      this.texturesBindGroup = null;
      this.inputsBindGroups = [];
      this.bindGroups = [];
      this.clonedBindGroups = [];
    }
    /**
     * Update all bind groups.
     * For each of them, first check if it eventually needs a reset, then update its bindings
     */
    updateBindGroups() {
      this.bindGroups.forEach((bindGroup) => {
        if (bindGroup.needsReset) {
          bindGroup.resetBindGroup();
          bindGroup.needsReset = false;
        }
        if (bindGroup.needsPipelineFlush && this.pipelineEntry.ready) {
          this.pipelineEntry.flushPipelineEntry(this.bindGroups);
          bindGroup.needsPipelineFlush = false;
        }
        bindGroup.updateBindings();
      });
    }
    /* INPUTS */
    /**
     * Force a given buffer binding update flag to update it at next render
     * @param bufferBindingName - the buffer binding name
     * @param bindingName - the binding name
     */
    shouldUpdateInputsBindings(bufferBindingName, bindingName) {
      if (!bufferBindingName)
        return;
      const bufferBinding = this.inputsBindings.find((bB) => bB.name === bufferBindingName);
      if (bufferBinding) {
        if (!bindingName) {
          Object.keys(bufferBinding.bindings).forEach(
            (bindingKey) => bufferBinding.shouldUpdateBinding(bindingKey)
          );
        } else {
          ;
          bufferBinding.shouldUpdateBinding(bindingName);
        }
      }
    }
    /**
     * Look for a binding by name/key in all bind groups
     * @param bindingName - the binding name or key
     * @returns - the found binding, or null if not found
     */
    getBindingsByName(bindingName = "") {
      let binding;
      (this.ready ? this.bindGroups : this.inputsBindGroups).forEach((bindGroup) => {
        binding = bindGroup.getBindingsByName(bindingName);
      });
      return binding;
    }
    /* SAMPLERS & TEXTURES */
    /**
     * Prepare our textures array and set the {@see TextureBindGroup}
     */
    setTextures() {
      this.textures = [];
      this.texturesBindGroup = new TextureBindGroup(this.renderer, {
        label: this.options.label + ": Textures bind group"
      });
    }
    /**
     * Add a texture to our array, and add it to the textures bind group only if used in the shaders (avoid binding useless data)
     * @param texture - texture to add
     */
    addTexture(texture) {
      this.textures.push(texture);
      if (this.options.shaders.vertex && this.options.shaders.vertex.code.indexOf(texture.options.name) !== -1 || this.options.shaders.fragment && this.options.shaders.fragment.code.indexOf(texture.options.name) !== -1 || this.options.shaders.compute && this.options.shaders.compute.code.indexOf(texture.options.name) !== -1) {
        this.texturesBindGroup.addTexture(texture);
      }
    }
    /**
     * Destroy all the Material textures
     */
    destroyTextures() {
      this.textures?.forEach((texture) => texture.destroy());
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
     * Then render the textures and updates them
     * Finally updates all buffer inputs that need it and update the bind groups (write buffers if needed)
     */
    onBeforeRender() {
      this.setMaterial();
      this.textures.forEach((texture) => {
        if ("render" in texture) {
          texture.render();
        }
      });
      this.texturesBindGroup?.textures.forEach((texture, textureIndex) => {
        if (texture instanceof Texture) {
          if (texture.options.fromTexture && texture.options.fromTexture.sourceUploaded && !texture.sourceUploaded) {
            texture.copy(texture.options.fromTexture);
          }
          if (texture.shouldUpdate && texture.options.sourceType && texture.options.sourceType === "externalVideo") {
            texture.uploadVideoTexture();
            if (this.texturesBindGroup.shouldUpdateVideoTextureBindGroupLayout(textureIndex)) {
              this.texturesBindGroup.updateVideoTextureBindGroupLayout(textureIndex);
            }
          }
        }
        if (texture.shouldUpdateBindGroup && (texture.texture || texture.externalTexture)) {
          this.texturesBindGroup.resetTextureBindGroup();
          texture.shouldUpdateBindGroup = false;
        }
      });
      this.inputsBindings.forEach((inputBinding) => {
        inputBinding.onBeforeRender();
      });
      this.updateBindGroups();
    }
    /**
     * Render the material if it is ready:
     * Set the current pipeline and set the bind groups
     * @param pass - current pass encoder
     */
    render(pass) {
      if (!this.ready)
        return;
      this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
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
        shaders
      };
      this.pipelineEntry = this.renderer.pipelineManager.createComputePipeline({
        label: this.options.label + " compute pipeline",
        shaders: this.options.shaders,
        useAsync: this.options.useAsyncPipeline
      });
    }
    /**
     * When all bind groups are created, add them to the {@link ComputePipelineEntry} and compile it
     */
    setPipelineEntryBuffers() {
      this.pipelineEntry.setPipelineEntryBuffers({
        bindGroups: this.bindGroups
      });
    }
    /**
     * Check if all bind groups are ready, create them if needed and set {@link ComputePipelineEntry} bind group buffers
     */
    setMaterial() {
      super.setMaterial();
      if (this.pipelineEntry && this.pipelineEntry.canCompile) {
        this.setPipelineEntryBuffers();
      }
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
    /* RENDER */
    /**
     * Render the material if it is ready:
     * Set the current pipeline, set the bind groups and dispatch the work groups
     * @param pass - current compute pass encoder
     */
    render(pass) {
      if (!this.ready)
        return;
      this.renderer.pipelineManager.setCurrentPipeline(pass, this.pipelineEntry);
      this.bindGroups.forEach((bindGroup) => {
        pass.setBindGroup(bindGroup.index, bindGroup.bindGroup);
        bindGroup.bindings.forEach((binding) => {
          if ("dispatchSize" in binding) {
            pass.dispatchWorkgroups(binding.dispatchSize[0], binding.dispatchSize[1], binding.dispatchSize[2]);
          }
        });
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
      this.#autoAddToScene = true;
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
      this.renderer = renderer;
      this.type = type;
      this.uuid = generateUUID();
      Object.defineProperty(this, "index", { value: computePassIndex++ });
      const { label, shaders, renderOrder, inputs, bindGroups, autoAddToScene, useAsyncPipeline } = parameters;
      this.options = {
        label,
        shaders,
        ...autoAddToScene !== void 0 && { autoAddToScene },
        ...renderOrder !== void 0 && { renderOrder },
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline }
      };
      this.renderOrder = renderOrder ?? 0;
      if (autoAddToScene !== void 0) {
        this.#autoAddToScene = autoAddToScene;
      }
      this.ready = false;
      this.setComputeMaterial({
        label: this.options.label,
        shaders: this.options.shaders,
        inputs,
        bindGroups,
        useAsyncPipeline
      });
      this.addToScene();
    }
    #autoAddToScene;
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
     * Create the compute pass material
     * @param computeParameters - {@link ComputeMaterial} parameters
     */
    setComputeMaterial(computeParameters) {
      this.material = new ComputeMaterial(this.renderer, computeParameters);
    }
    /**
     * Add our compute pass to the scene and the renderer
     */
    addToScene() {
      this.renderer.computePasses.push(this);
      if (this.#autoAddToScene) {
        this.renderer.scene.addComputePass(this);
      }
    }
    /**
     * Remove our compute pass from the scene and the renderer
     */
    removeFromScene() {
      if (this.#autoAddToScene) {
        this.renderer.scene.removeComputePass(this);
      }
      this.renderer.computePasses = this.renderer.computePasses.filter((computePass) => computePass.uuid !== this.uuid);
    }
    /**
     * Get our {@link ComputeMaterial} uniforms
     * @readonly
     */
    get uniforms() {
      return this.material?.uniforms;
    }
    /**
     * Get our {@link ComputeMaterial} storages
     * @readonly
     */
    get storages() {
      return this.material?.storages;
    }
    /**
     * Get our {@link ComputeMaterial} works
     * @readonly
     */
    get works() {
      return this.material?.works;
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
     * Checks if the material is ready and eventually update its bindings
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
    constructor(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min = min;
      this.max = max;
    }
    set(min = new Vec3(Infinity), max = new Vec3(-Infinity)) {
      this.min.copy(min);
      this.max.copy(max);
      return this;
    }
    clone() {
      return new _Box3().set(this.min, this.max);
    }
    getCenter() {
      return this.max.clone().add(this.min).multiplyScalar(0.5);
    }
    getSize() {
      return this.max.clone().sub(this.min);
    }
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
    constructor({ verticesOrder = "cw", instancesCount = 1, vertexBuffers = [] } = {}) {
      this.verticesCount = 0;
      this.verticesOrder = verticesOrder;
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
        vertexBuffers
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
     * @param {CoreBufferType} [parameters.type="vec3f"] - attribute type
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
    constructor({ verticesOrder = "cw", instancesCount = 1, vertexBuffers = [] } = {}) {
      super({ verticesOrder, instancesCount, vertexBuffers });
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
      vertexBuffers = []
    } = {}) {
      super({ verticesOrder: "cw", instancesCount, vertexBuffers });
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
      let positionOffset = 0;
      let uvOffset = 0;
      for (let y = 0; y <= this.definition.height; y++) {
        const v = y / this.definition.height;
        for (let x = 0; x < this.definition.width; x++) {
          const u = x / this.definition.width;
          if (x === 0) {
            uv.array[uvOffset++] = u;
            uv.array[uvOffset++] = 1 - v;
            position.array[positionOffset++] = (u - 0.5) * 2;
            position.array[positionOffset++] = (v - 0.5) * 2;
            position.array[positionOffset++] = 0;
          }
          uv.array[uvOffset++] = u + 1 / this.definition.width;
          uv.array[uvOffset++] = 1 - v;
          position.array[positionOffset++] = (u + 1 / this.definition.width - 0.5) * 2;
          position.array[positionOffset++] = (v - 0.5) * 2;
          position.array[positionOffset++] = 0;
        }
      }
      return { position, uv };
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
     * @param {Geometry["verticesOrder"]} parameters.rendering.verticesOrder - vertices order to use
     */
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      const type = "RenderMaterial";
      isRenderer(renderer, type);
      super(renderer, parameters);
      this.type = type;
      this.renderer = renderer;
      const { shaders, label, useAsyncPipeline, inputs, bindGroups, ...renderingOptions } = parameters;
      if (!shaders.vertex.entryPoint) {
        shaders.vertex.entryPoint = "main";
      }
      if (!shaders.fragment.entryPoint) {
        shaders.fragment.entryPoint = "main";
      }
      this.options = {
        ...this.options,
        shaders,
        label,
        ...useAsyncPipeline !== void 0 && { useAsyncPipeline },
        ...inputs !== void 0 && { inputs },
        ...bindGroups !== void 0 && { bindGroups },
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
     * When all bind groups and attributes are created, add them to the {@link RenderPipelineEntry} and compile it
     */
    setPipelineEntryBuffers() {
      this.pipelineEntry.setPipelineEntryBuffers({
        attributes: this.attributes,
        bindGroups: this.bindGroups
      });
    }
    /**
     * Check if attributes and all bind groups are ready, create them if needed and set {@link RenderPipelineEntry} bind group buffers
     */
    setMaterial() {
      super.setMaterial();
      if (this.attributes && this.pipelineEntry && this.pipelineEntry.canCompile) {
        this.setPipelineEntryBuffers();
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

  // src/core/textures/RenderTexture.ts
  var defaultRenderTextureParams = {
    label: "Texture",
    name: "texture",
    fromTexture: null
  };
  var RenderTexture = class {
    constructor(renderer, parameters = defaultRenderTextureParams) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " RenderTexture" : "RenderTexture");
      this.type = "RenderTexture";
      this.renderer = renderer;
      this.options = { ...defaultRenderTextureParams, ...parameters };
      this.shouldUpdateBindGroup = false;
      this.setSourceSize();
      this.setBindings();
      this.createTexture();
    }
    setSourceSize() {
      const rendererBoundingRect = this.renderer.pixelRatioBoundingRect;
      this.size = {
        width: rendererBoundingRect.width,
        height: rendererBoundingRect.height
      };
    }
    createTexture() {
      if (this.options.fromTexture) {
        this.texture = this.options.fromTexture.texture;
        this.textureBinding.resource = this.texture;
        return;
      }
      this.texture?.destroy();
      this.texture = this.renderer.createTexture({
        label: this.options.label,
        format: this.renderer.preferredFormat,
        size: [this.size.width, this.size.height],
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        // TODO let user chose?
      });
      this.textureBinding.resource = this.texture;
    }
    setBindings() {
      this.bindings = [
        new TextureBindings({
          label: this.options.label + ": " + this.options.name + " texture",
          name: this.options.name,
          texture: this.texture,
          bindingType: "texture"
        })
      ];
    }
    get textureBinding() {
      return this.bindings[0];
    }
    resize() {
      this.setSourceSize();
      this.createTexture();
      this.shouldUpdateBindGroup = true;
    }
    destroy() {
      this.texture?.destroy();
      this.texture = null;
    }
  };

  // src/core/meshes/MeshBaseMixin.ts
  var meshIndex = 0;
  var defaultMeshBaseParams = {
    label: "Mesh",
    // geometry
    geometry: new Geometry(),
    // material
    shaders: {},
    autoAddToScene: true,
    useProjection: false,
    cullMode: "back",
    depthWriteEnabled: true,
    depthCompare: "less",
    transparent: false,
    visible: true,
    renderOrder: 0,
    texturesOptions: {}
  };
  function MeshBaseMixin(Base) {
    return class MeshBase extends Base {
      /**
           * MeshBase constructor
           * @typedef MeshBaseParams
           * @property {string=} label - MeshBase label
           * @property {boolean=} autoAddToScene - whether we should add this MeshBase to our {@link Scene} to let it handle the rendering process automatically
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
           * @property {MeshTextureParams=} texturesOptions - textures options to apply
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
        this.#autoAddToScene = true;
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
        this.textures = [];
        this.renderTextures = [];
        const {
          label,
          shaders,
          geometry,
          visible,
          renderOrder,
          renderTarget,
          texturesOptions,
          autoAddToScene,
          verticesOrder,
          ...meshParameters
        } = parameters;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          label,
          shaders,
          texturesOptions,
          ...renderTarget !== void 0 && { renderTarget },
          ...autoAddToScene !== void 0 && { autoAddToScene },
          ...meshParameters.useAsyncPipeline !== void 0 && { useAsyncPipeline: meshParameters.useAsyncPipeline }
        };
        this.renderTarget = renderTarget ?? null;
        this.geometry = geometry;
        if (autoAddToScene !== void 0) {
          this.#autoAddToScene = autoAddToScene;
        }
        this.visible = visible;
        this.renderOrder = renderOrder;
        this.ready = false;
        this.computeGeometry();
        this.setMaterial({
          label: this.options.label,
          shaders: this.options.shaders,
          ...{ ...meshParameters, verticesOrder: verticesOrder ?? geometry.verticesOrder }
        });
        this.addToScene();
      }
      #autoAddToScene;
      /**
       * Get private #autoAddToScene value
       * @readonly
       */
      get autoAddToScene() {
        return this.#autoAddToScene;
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
        if (this.#autoAddToScene) {
          this.renderer.scene.addMesh(this);
        }
      }
      /**
       * Remove a Mesh from the renderer and the {@link Scene}
       */
      removeFromScene() {
        if (this.#autoAddToScene) {
          this.renderer.scene.removeMesh(this);
        }
        this.renderer.meshes = this.renderer.meshes.filter((m) => m.uuid !== this.uuid);
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
       * Create a new {@link Texture}
       * @param options - [Texture options]{@link TextureDefaultParams}
       * @returns - newly created Texture
       */
      createTexture(options) {
        if (!options.name) {
          options.name = "texture" + this.textures.length;
        }
        if (!options.label) {
          options.label = this.options.label + " " + options.name;
        }
        const texture = new Texture(this.renderer, { ...options, texture: this.options.texturesOptions });
        this.material.addTexture(texture);
        this.textures.push(texture);
        this.onTextureCreated(texture);
        return texture;
      }
      /**
       * Callback run when a new {@link Texture} has been created
       * @param texture - newly created Texture
       */
      onTextureCreated(texture) {
        texture.parent = this;
      }
      /**
       * Create a new {@link RenderTexture}
       * @param  options - [RenderTexture options]{@link RenderTextureParams}
       * @returns - newly created RenderTexture
       */
      createRenderTexture(options) {
        if (!options.name) {
          options.name = "renderTexture" + this.renderTextures.length;
        }
        const renderTexture = new RenderTexture(this.renderer, options);
        this.material.addTexture(renderTexture);
        this.renderTextures.push(renderTexture);
        return renderTexture;
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
      /**
       * Resize the Mesh's textures
       * @param boundingRect
       */
      resize(boundingRect = null) {
        this.renderTextures?.forEach((renderTexture) => renderTexture.resize());
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
       * Then executes {@link RenderMaterial#onBeforeRender}: create its bind groups and pipeline if needed and eventually update its bindings
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
        this.renderTextures = [];
        this.textures = [];
      }
    };
  }
  var MeshBaseMixin_default = MeshBaseMixin;

  // src/utils/ResizeManager.ts
  var ResizeManager = class {
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
    useObserver(shouldWatch = true) {
      this.shouldWatch = shouldWatch;
    }
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
    unobserve(element) {
      this.resizeObserver.unobserve(element);
      this.entries = this.entries.filter((e) => !e.element.isSameNode(element));
    }
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
     * @param lastXDelta - delta along X axis
     * @param lastYDelta - delta along Y axis
     */
    // TODO use DOMPosition object instead!
    updateScrollPosition(lastXDelta, lastYDelta) {
      if (this.isResizing)
        return;
      this._boundingRect.top += lastYDelta;
      this._boundingRect.left += lastXDelta;
      if (lastXDelta || lastYDelta) {
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
  var vertexOutput: VertexOutput;

  vertexOutput.position = vec4f(attributes.position, 1.0);
  vertexOutput.uv = attributes.uv;
  
  return vertexOutput;
}`
  );

  // src/utils/CacheManager.ts
  var CacheManager = class {
    constructor() {
      this.planeGeometries = [];
    }
    getPlaneGeometry(planeGeometry) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometry.definition.id);
    }
    getPlaneGeometryByID(planeGeometryID) {
      return this.planeGeometries.find((element) => element.definition.id === planeGeometryID);
    }
    addPlaneGeometry(planeGeometry) {
      this.planeGeometries.push(planeGeometry);
    }
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
     * @param renderer - our renderer class object
     * @param parameters - our Mesh base parameters
     */
    constructor(renderer, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " FullscreenQuadMesh" : "FullscreenQuadMesh");
      let geometry = cacheManager.getPlaneGeometryByID(2);
      if (!geometry) {
        geometry = new PlaneGeometry({ widthSegments: 1, heightSegments: 1 });
        cacheManager.addPlaneGeometry(geometry);
      }
      if (!parameters.shaders.vertex || !parameters.shaders.vertex.code) {
        parameters.shaders.vertex = {
          code: default_vs_wgsl_default,
          entryPoint: "main"
        };
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
     * Convert a mouse coordinate to plane coordinates ranging from [-1, 1]
     * @param mouseCoords - mouse or pointer coordinates as a Vec2
     * @returns - the mapped coordinates in the [-1, 1] range
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
            this.modelViewMatrix.multiplyMatrices(this.camera.viewMatrix, this.modelMatrix);
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
    return class MeshTransformedBase extends Base {
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
        /** function assigned to the [onReEnterView]{@link MeshTransformedBase#onReEnterView} callback */
        this._onReEnterViewCallback = () => {
        };
        /** function assigned to the [onLeaveView]{@link MeshTransformedBase#onLeaveView} callback */
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
        const { label, geometry, shaders, frustumCulled, DOMFrustumMargins } = parameters;
        this.options = {
          ...this.options ?? {},
          // merge possible lower options?
          label,
          shaders,
          frustumCulled,
          DOMFrustumMargins
        };
        this.geometry = geometry;
        this.updateSizePositionAndProjection();
      }
      /* GEOMETRY */
      /**
       * Override {@link MeshBaseClass} method to add the domFrustum
       */
      computeGeometry() {
        if (this.geometry.shouldCompute) {
          this.geometry.computeGeometry();
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
          this.frustumCulled = this.options.frustumCulled;
          this.DOMFrustumMargins = this.domFrustum.DOMFrustumMargins;
          this.domFrustum.shouldUpdate = this.frustumCulled;
        }
      }
      /* MATERIAL */
      /**
       * Set a Mesh matrices uniforms inputs then call {@link MeshBaseClass} super method
       * @param meshParameters - [RenderMaterial parameters]{@link RenderMaterialParams}
       */
      setMaterial(meshParameters) {
        const matricesUniforms = {
          label: "Matrices",
          bindings: {
            model: {
              name: "model",
              type: "mat4x4f",
              value: this.modelMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.bindings.model.value = this.modelMatrix;
              }
            },
            modelView: {
              // model view matrix (model matrix multiplied by camera view matrix)
              name: "modelView",
              type: "mat4x4f",
              value: this.modelViewMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.bindings.modelView.value = this.modelViewMatrix;
              }
            },
            modelViewProjection: {
              name: "modelViewProjection",
              type: "mat4x4f",
              value: this.modelViewProjectionMatrix,
              onBeforeUpdate: () => {
                matricesUniforms.bindings.modelViewProjection.value = this.modelViewProjectionMatrix;
              }
            }
          }
        };
        if (!meshParameters.inputs)
          meshParameters.inputs = { uniforms: {} };
        meshParameters.inputs.uniforms.matrices = matricesUniforms;
        super.setMaterial(meshParameters);
      }
      /* SIZE & TRANSFORMS */
      /**
       * Resize our MeshTransformedBase
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
       * @param callback - callback to run when {@link MeshTransformedBase} is reentering the view frustum
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
       * @param callback - callback to run when {@link MeshTransformedBase} is leaving the view frustum
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
  var Mesh = class extends MeshTransformedMixin_default(MeshBaseMixin_default(ProjectedObject3D)) {
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
    get ready() {
      return !this.status.compiling && this.status.compiled && !this.status.error;
    }
    get canCompile() {
      return !this.status.compiling && !this.status.compiled && !this.status.error;
    }
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = bindGroups;
    }
    /** SHADERS **/
    createShaderModule({ code = "", type = "vertex" }) {
      const shaderModule = this.renderer.createShaderModule({
        label: this.options.label + ": " + type + "Shader module",
        code
      });
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
              !this.renderer.production && console.error(`${this.options.label} compilation error:
${formattedMessage}`);
              break;
            case "warning":
              !this.renderer.production && console.warn(`${this.options.label} compilation warning:
${formattedMessage}`);
              break;
            case "info":
              !this.renderer.production && console.log(`${this.options.label} compilation information:
${formattedMessage}`);
              break;
          }
        }
      });
      return shaderModule;
    }
    /** SETUP **/
    createShaders() {
    }
    createPipelineLayout() {
      this.layout = this.renderer.createPipelineLayout({
        label: this.options.label + " layout",
        bindGroupLayouts: this.bindGroups.map((bindGroup) => bindGroup.bindGroupLayout)
      });
    }
    createPipelineDescriptor() {
    }
    flushPipelineEntry(newBindGroups = []) {
      this.status.compiling = false;
      this.status.compiled = false;
      this.status.error = null;
      this.setPipelineEntryBindGroups(newBindGroups);
      this.setPipelineEntry();
    }
    setPipelineEntry() {
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
  return (textureMatrix * vec4f(uv, 0, 1)).xy;
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
    vertex: {
      get_scaled_uv: get_uv_cover_wgsl_default
    },
    fragment: {
      get_scaled_uv: get_uv_cover_wgsl_default,
      get_vertex_to_uv_coords: get_vertex_to_uv_coords_wgsl_default
    }
  };
  var ProjectedShaderChunks = {
    vertex: {
      get_output_position: get_output_position_wgsl_default
    },
    fragment: {}
  };

  // src/core/pipelines/RenderPipelineEntry.ts
  var RenderPipelineEntry = class extends PipelineEntry {
    constructor(parameters) {
      let { renderer } = parameters;
      const { label, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder, useProjection } = parameters;
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
        useProjection
      };
    }
    // TODO!
    // need to chose whether we should siltently add the camera bind group here
    // or explicitly in the RenderMaterial class createBindGroups() method
    setPipelineEntryBindGroups(bindGroups) {
      this.bindGroups = "cameraBindGroup" in this.renderer && this.options.useProjection ? [this.renderer.cameraBindGroup, ...bindGroups] : bindGroups;
    }
    setPipelineEntryBuffers(parameters) {
      const { attributes, bindGroups } = parameters;
      this.attributes = attributes;
      this.setPipelineEntryBindGroups(bindGroups);
      this.setPipelineEntry();
    }
    /** SHADERS **/
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
          if (groupBinding.wgslStructFragment) {
            this.shaders.vertex.head = `
${groupBinding.wgslStructFragment}
${this.shaders.vertex.head}`;
          }
          this.shaders.vertex.head = `${this.shaders.vertex.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine)
            this.shaders.vertex.head += `
`;
        }
        if (groupBinding.visibility === GPUShaderStage.FRAGMENT || groupBinding.visibility === (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)) {
          if (groupBinding.wgslStructFragment) {
            this.shaders.fragment.head = `
${groupBinding.wgslStructFragment}
${this.shaders.fragment.head}`;
          }
          this.shaders.fragment.head = `${this.shaders.fragment.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
          if (groupBinding.newLine)
            this.shaders.fragment.head += `
`;
        }
      });
      this.shaders.vertex.head = `${this.attributes.wgslStructFragment}
${this.shaders.vertex.head}`;
      this.shaders.vertex.code = this.shaders.vertex.head + this.options.shaders.vertex.code;
      this.shaders.fragment.code = this.shaders.fragment.head + this.options.shaders.fragment.code;
      this.shaders.full.code = this.shaders.vertex.code + "\n" + this.shaders.fragment.code;
    }
    /** SETUP **/
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
    createPipelineDescriptor() {
      if (!this.shaders.vertex.module || !this.shaders.fragment.module)
        return;
      let vertexLocationIndex = -1;
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
              // we will assume our renderer alphaMode is set to 'premultiplied'
              // we either disable blending if mesh if opaque
              // or use this blend equation if mesh is transparent (see https://limnu.com/webgl-blending-youre-probably-wrong/)
              ...this.options.transparent && {
                blend: {
                  color: {
                    srcFactor: "src-alpha",
                    dstFactor: "one-minus-src-alpha"
                  },
                  alpha: {
                    srcFactor: "one",
                    dstFactor: "one-minus-src-alpha"
                  }
                }
              }
            }
          ]
        },
        primitive: {
          //topology: 'triangle-list', // default setting anyway
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
    setPipelineEntry() {
      super.setPipelineEntry();
      if (this.options.useAsync) {
        this.createRenderPipelineAsync();
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
    setPipelineEntryBuffers(parameters) {
      const { bindGroups } = parameters;
      this.setPipelineEntryBindGroups(bindGroups);
      this.setPipelineEntry();
    }
    /** SHADERS **/
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
        this.shaders.compute.head = `${this.shaders.compute.head}
@group(${groupBinding.groupIndex}) @binding(${groupBinding.bindIndex}) ${groupBinding.wgslGroupFragment}`;
        if (groupBinding.newLine)
          this.shaders.compute.head += `
`;
      });
      this.shaders.compute.code = this.shaders.compute.head + this.options.shaders.compute.code;
    }
    /** SETUP **/
    createShaders() {
      this.patchShaders();
      this.shaders.compute.module = this.createShaderModule({
        code: this.shaders.compute.code,
        type: "compute"
      });
    }
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
    setPipelineEntry() {
      super.setPipelineEntry();
      if (this.options.useAsync) {
        this.createComputePipelineAsync();
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
    isSameRenderPipeline(parameters) {
      const { shaders, cullMode, depthWriteEnabled, depthCompare, transparent, verticesOrder } = parameters;
      return this.pipelineEntries.filter((pipelineEntry) => pipelineEntry.type === "RenderPipelineEntry").find((pipelineEntry) => {
        const { options } = pipelineEntry;
        return shaders.vertex.code.localeCompare(options.shaders.vertex.code) === 0 && shaders.fragment.code.localeCompare(options.shaders.fragment.code) === 0 && cullMode === options.cullMode && depthWriteEnabled === options.depthWriteEnabled && depthCompare === options.depthCompare && transparent === options.transparent && verticesOrder === options.verticesOrder;
      });
    }
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
    createComputePipeline(parameters) {
      const pipelineEntry = new ComputePipelineEntry({
        renderer: this.renderer,
        ...parameters
      });
      this.pipelineEntries.push(pipelineEntry);
      return pipelineEntry;
    }
    setCurrentPipeline(pass, pipelineEntry) {
      if (pipelineEntry.index !== this.currentPipelineIndex) {
        pass.setPipeline(pipelineEntry.pipeline);
        this.currentPipelineIndex = pipelineEntry.index;
      }
    }
    resetCurrentPipeline() {
      this.currentPipelineIndex = null;
    }
  };

  // src/curtains/objects3D/DOMObject3D.ts
  var DOMObject3D = class extends ProjectedObject3D {
    constructor(renderer, element, parameters) {
      super(renderer);
      this.#DOMObjectWorldPosition = new Vec3();
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
    resetDOMElement(element) {
      if (this.domElement) {
        this.domElement.destroy();
      }
      this.setDOMElement(element);
    }
    updateSizeAndPosition() {
      this.setWorldSizes();
      this.applyPosition();
      super.updateSizeAndPosition();
    }
    updateSizePositionAndProjection() {
      this.updateSizeAndPosition();
      super.updateSizePositionAndProjection();
    }
    resize(boundingRect = null) {
      if (!boundingRect && (!this.domElement || this.domElement?.isResizing))
        return;
      this.size.document = boundingRect ?? this.domElement.element.getBoundingClientRect();
      this.updateSizePositionAndProjection();
    }
    /*** BOUNDING BOXES GETTERS ***/
    /***
       Useful to get our plane HTML element bounding rectangle without triggering a reflow/layout
    
       returns :
       @boundingRectangle (obj): an object containing our plane HTML element bounding rectangle (width, height, top, bottom, right and left properties)
       ***/
    get boundingRect() {
      return this.domElement.boundingRect;
    }
    /** TRANSFOMS **/
    setTransforms() {
      super.setTransforms();
      this.transforms.origin.model.set(0.5, 0.5, 0);
      this.transforms.origin.world = new Vec3();
      this.transforms.position.document = new Vec3();
      this.documentPosition.onChange(() => this.applyPosition());
      this.transformOrigin.onChange(() => this.setWorldTransformOrigin());
    }
    get documentPosition() {
      return this.transforms.position.document;
    }
    set documentPosition(value) {
      this.transforms.position.document = value;
      this.applyPosition();
    }
    get worldScale() {
      return this.#DOMObjectWorldScale.clone().multiply(this.scale);
    }
    get worldPosition() {
      return this.#DOMObjectWorldPosition;
    }
    get transformOrigin() {
      return this.transforms.origin.model;
    }
    set transformOrigin(value) {
      this.transforms.origin.model = value;
      this.setWorldTransformOrigin();
    }
    get worldTransformOrigin() {
      return this.transforms.origin.world;
    }
    set worldTransformOrigin(value) {
      this.transforms.origin.world = value;
    }
    /***
     This will set our plane position by adding plane computed bounding box values and computed relative position values
     ***/
    applyPosition() {
      this.applyDocumentPosition();
      super.applyPosition();
    }
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
    applyTransformOrigin() {
      if (!this.size)
        return;
      this.setWorldTransformOrigin();
      super.applyTransformOrigin();
    }
    /** MATRICES **/
    // override for this special case
    updateModelMatrix() {
      this.modelMatrix.composeFromOrigin(
        this.#DOMObjectWorldPosition,
        this.quaternion,
        this.scale,
        this.worldTransformOrigin
      );
      this.modelMatrix.scale(this.#DOMObjectWorldScale);
    }
    /***
       This function takes pixel values along X and Y axis and convert them to world space coordinates
    
       params :
       @vector (Vec3): position to convert on X, Y and Z axes
    
       returns :
       @worldPosition: plane's position in WebGL space
       ***/
    documentToWorldSpace(vector = new Vec3()) {
      return new Vec3(
        vector.x * this.renderer.pixelRatio / this.renderer.boundingRect.width * this.camera.screenRatio.width,
        -(vector.y * this.renderer.pixelRatio / this.renderer.boundingRect.height) * this.camera.screenRatio.height,
        vector.z
      );
    }
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
    // TODO setPosition, setRotation, setScale, etc?
    updateScrollPosition(lastXDelta = 0, lastYDelta = 0) {
      if (lastXDelta || lastYDelta) {
        this.domElement.updateScrollPosition(lastXDelta, lastYDelta);
      }
    }
    destroy() {
      this.domElement?.destroy();
    }
  };

  // src/curtains/meshes/DOMMesh.ts
  var defaultDOMMeshParams = {
    autoloadSources: true,
    watchScroll: true
  };
  var DOMMesh = class extends MeshTransformedMixin_default(MeshBaseMixin_default(DOMObject3D)) {
    constructor(renderer, element, parameters) {
      super(renderer, element, { ...defaultDOMMeshParams, ...parameters });
      // callbacks / events
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
    get ready() {
      return this._ready;
    }
    set ready(value) {
      this._ready = value;
      if (this.DOMMeshReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
    }
    get sourcesReady() {
      return this._sourcesReady;
    }
    set sourcesReady(value) {
      this._sourcesReady = value;
      if (this.DOMMeshReady) {
        this._onReadyCallback && this._onReadyCallback();
      }
    }
    get DOMMeshReady() {
      return this.ready && this.sourcesReady;
    }
    addToScene() {
      super.addToScene();
      this.renderer.domMeshes.push(this);
    }
    removeFromScene() {
      super.removeFromScene();
      this.renderer.domMeshes = this.renderer.domMeshes.filter(
        (m) => m.uuid !== this.uuid
      );
    }
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
    resetDOMElement(element) {
      if (!!element) {
        super.resetDOMElement(element);
      } else if (!element && !this.renderer.production) {
        throwWarning(
          `${this.options.label}: You are trying to reset a ${this.type} with a HTML element that does not exist. The old HTML element will be kept instead.`
        );
      }
    }
    /** EVENTS **/
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
        const inverseViewMatrix = this.modelMatrix.getInverse().multiply(this.camera.viewMatrix);
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
    constructor({ renderer }) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "Scene");
      this.renderer = renderer;
      this.computePassEntries = [];
      this.renderPassEntries = {
        pingPong: [],
        renderTarget: [],
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
    removeComputePass(computePass) {
      this.computePassEntries = this.computePassEntries.filter((cP) => cP.uuid !== computePass.uuid);
    }
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
    removeRenderTarget(renderTarget) {
      this.renderPassEntries.renderTarget = this.renderPassEntries.renderTarget.filter(
        (entry) => entry.renderPass.uuid !== renderTarget.renderPass.uuid
      );
    }
    getMeshProjectionStack(mesh) {
      const renderPassEntry = mesh.renderTarget ? this.renderPassEntries.renderTarget.find(
        (passEntry) => passEntry.renderPass.uuid === mesh.renderTarget.renderPass.uuid
      ) : this.renderPassEntries.screen[0];
      const { stack } = renderPassEntry;
      return mesh.material.options.rendering.useProjection ? stack.projected : stack.unProjected;
    }
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
    removeMesh(mesh) {
      const projectionStack = this.getMeshProjectionStack(mesh);
      if (mesh.transparent) {
        projectionStack.transparent = projectionStack.transparent.filter((m) => m.uuid !== mesh.uuid);
      } else {
        projectionStack.opaque = projectionStack.opaque.filter((m) => m.uuid !== mesh.uuid);
      }
    }
    addShaderPass(shaderPass) {
      this.renderPassEntries.screen.push({
        renderPass: this.renderer.renderPass,
        // render directly to screen
        renderTexture: null,
        onBeforeRenderPass: (commandEncoder, swapChainTexture) => {
          if (shaderPass.renderTexture) {
            commandEncoder.copyTextureToTexture(
              {
                texture: shaderPass.renderTarget ? shaderPass.renderTarget.renderTexture.texture : swapChainTexture
              },
              {
                texture: shaderPass.renderTexture.texture
              },
              [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
            );
          }
          if (!shaderPass.renderTarget) {
            this.renderer.renderPass.setLoadOp("clear");
          }
        },
        onAfterRenderPass: (commandEncoder, swapChainTexture) => {
          if (shaderPass.renderTarget) {
            commandEncoder.copyTextureToTexture(
              {
                texture: swapChainTexture
              },
              {
                texture: shaderPass.renderTarget.renderTexture.texture
              },
              [shaderPass.renderTexture.size.width, shaderPass.renderTexture.size.height]
            );
          }
        },
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
    removeShaderPass(shaderPass) {
      this.renderPassEntries.screen = this.renderPassEntries.screen.filter(
        (entry) => !entry.element || entry.element.uuid !== shaderPass.uuid
      );
    }
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
    removePingPongPlane(pingPongPlane) {
      this.renderPassEntries.pingPong = this.renderPassEntries.pingPong.filter(
        (entry) => entry.element.uuid !== pingPongPlane.uuid
      );
    }
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
    onAfterCommandEncoder() {
      this.computePassEntries.forEach((computePass) => {
        computePass.setWorkGroupsResult();
      });
    }
  };

  // src/core/renderPasses/RenderPass.ts
  var RenderPass = class {
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
    createDepthTexture() {
      this.depthTexture = this.renderer.createTexture({
        label: this.options.label + " depth attachment texture",
        size: [this.size.width, this.size.height],
        format: "depth24plus",
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        sampleCount: this.sampleCount
      });
    }
    createRenderTexture() {
      this.renderTexture = this.renderer.createTexture({
        label: this.options.label + " color attachment texture",
        size: [this.size.width, this.size.height],
        sampleCount: this.sampleCount,
        format: this.renderer.preferredFormat,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING
      });
    }
    resetRenderPassDepth() {
      if (this.depthTexture) {
        this.depthTexture.destroy();
      }
      this.createDepthTexture();
      this.descriptor.depthStencilAttachment.view = this.depthTexture.createView();
    }
    resetRenderPassView() {
      if (this.renderTexture) {
        this.renderTexture.destroy();
      }
      this.createRenderTexture();
      this.descriptor.colorAttachments[0].view = this.renderTexture.createView();
    }
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
    setSize(boundingRect) {
      this.size = {
        width: Math.floor(boundingRect.width),
        height: Math.floor(boundingRect.height)
      };
    }
    resize(boundingRect) {
      this.setSize(boundingRect);
      if (this.options.depth)
        this.resetRenderPassDepth();
      this.resetRenderPassView();
    }
    setLoadOp(loadOp = "clear") {
      this.options.loadOp = loadOp;
      if (this.descriptor && this.descriptor.colorAttachments) {
        this.descriptor.colorAttachments[0].loadOp = loadOp;
      }
    }
    destroy() {
      this.renderTexture?.destroy();
      this.depthTexture?.destroy();
    }
  };

  // src/core/renderers/GPURenderer.ts
  var GPURenderer = class {
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      production = false,
      preferredFormat,
      onError = () => {
      }
    }) {
      // callbacks / events
      this._onBeforeRenderCallback = (commandEncoder) => {
      };
      this._onAfterRenderCallback = (commandEncoder) => {
      };
      this.type = "GPURenderer";
      this.ready = false;
      this.gpu = navigator.gpu;
      this.pixelRatio = pixelRatio ?? window.devicePixelRatio ?? 1;
      this.sampleCount = sampleCount;
      this.production = production;
      this.preferredFormat = preferredFormat;
      this.onError = onError;
      if (!this.gpu) {
        setTimeout(() => {
          this.onError();
          throwError("GPURenderer: WebGPU is not supported on your browser/OS. No 'gpu' object in 'navigator'.");
        }, 0);
      }
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
     * Set Canvas size
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
    resize(boundingRect = null) {
      if (!this.domElement)
        return;
      if (!boundingRect)
        boundingRect = this.domElement.element.getBoundingClientRect();
      this.setSize(boundingRect);
      this.onResize();
    }
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
    get boundingRect() {
      return this.domElement.boundingRect;
    }
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
     * Set Context
     *
     * @returns {Promise<void>}
     */
    async setContext() {
      this.context = this.canvas.getContext("webgpu");
      await this.setAdapterAndDevice();
      if (this.device) {
        this.preferredFormat = this.preferredFormat ?? this.gpu?.getPreferredCanvasFormat();
        this.context.configure({
          device: this.device,
          format: this.preferredFormat,
          // needed so we can copy textures for post processing usage
          usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST,
          // TODO
          alphaMode: "premultiplied"
          // or "opaque"
          //viewFormats: []
        });
        this.setMainRenderPass();
        this.setPipelineManager();
        this.setScene();
        this.ready = true;
      }
    }
    /**
     * Set Adapter and Device
     *
     * @returns {Promise<void>}
     */
    async setAdapterAndDevice() {
      this.adapter = await this.gpu?.requestAdapter().catch(() => {
        setTimeout(() => {
          this.onError();
          throwError("GPURenderer: WebGPU is not supported on your browser/OS. 'requestAdapter' failed.");
        }, 0);
      });
      try {
        this.device = await this.adapter?.requestDevice();
      } catch (error) {
        setTimeout(() => {
          this.onError();
          throwError(`GPURenderer: WebGPU is not supported on your browser/OS. 'requestDevice' failed: ${error}`);
        }, 0);
      }
      this.device?.lost.then((info) => {
        throwWarning(`GPURenderer: WebGPU device was lost: ${info.message}`);
        if (info.reason !== "destroyed") {
        }
      });
    }
    /** PIPELINES, SCENE & MAIN RENDER PASS **/
    setMainRenderPass() {
      this.renderPass = new RenderPass(
        /** @type {GPURenderer} **/
        this,
        {
          label: "Main Render pass",
          depth: true
        }
      );
    }
    setPipelineManager() {
      this.pipelineManager = /** @type {PipelineManager} **/
      new PipelineManager({
        renderer: (
          /** @type {GPURenderer} **/
          this
        )
      });
    }
    setScene() {
      this.scene = /** @type {Scene} **/
      new Scene({ renderer: (
        /** @type {GPURenderer} **/
        this
      ) });
    }
    /** BUFFERS & BINDINGS **/
    createBuffer(bufferDescriptor) {
      return this.device?.createBuffer(bufferDescriptor);
    }
    queueWriteBuffer(buffer, bufferOffset, data) {
      this.device?.queue.writeBuffer(buffer, bufferOffset, data);
    }
    createBindGroupLayout(bindGroupLayoutDescriptor) {
      return this.device?.createBindGroupLayout(bindGroupLayoutDescriptor);
    }
    createBindGroup(bindGroupDescriptor) {
      return this.device?.createBindGroup(bindGroupDescriptor);
    }
    /** SHADERS & PIPELINES **/
    createShaderModule(shaderModuleDescriptor) {
      return this.device?.createShaderModule(shaderModuleDescriptor);
    }
    createPipelineLayout(pipelineLayoutDescriptor) {
      return this.device?.createPipelineLayout(pipelineLayoutDescriptor);
    }
    createRenderPipeline(pipelineDescriptor) {
      return this.device?.createRenderPipeline(pipelineDescriptor);
    }
    async createRenderPipelineAsync(pipelineDescriptor) {
      return await this.device?.createRenderPipelineAsync(pipelineDescriptor);
    }
    createComputePipeline(pipelineDescriptor) {
      return this.device?.createComputePipeline(pipelineDescriptor);
    }
    async createComputePipelineAsync(pipelineDescriptor) {
      return await this.device?.createComputePipelineAsync(pipelineDescriptor);
    }
    /** TEXTURES **/
    addTexture(texture) {
      this.textures.push(texture);
      this.setTexture(texture);
    }
    setTexture(texture) {
      if (!texture.texture) {
        texture.createTexture();
      }
    }
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
    createTexture(options) {
      return this.device?.createTexture(options);
    }
    uploadTexture(texture) {
      if (texture.source) {
        try {
          this.device?.queue.copyExternalImageToTexture(
            {
              source: texture.source,
              flipY: texture.options.texture.flipY
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
          new Uint8Array(texture.options.texture.placeholderColor),
          { bytesPerRow: texture.size.width * 4 },
          { width: texture.size.width, height: texture.size.height }
        );
      }
    }
    importExternalTexture(video) {
      return this.device?.importExternalTexture({ source: video });
    }
    /** OBJECTS **/
    setRendererObjects() {
      this.computePasses = [];
      this.pingPongPlanes = [];
      this.shaderPasses = [];
      this.renderTargets = [];
      this.meshes = [];
      this.samplers = [];
      this.textures = [];
    }
    /** EVENTS **/
    onBeforeRender(callback) {
      if (callback) {
        this._onBeforeRenderCallback = callback;
      }
      return this;
    }
    onAfterRender(callback) {
      if (callback) {
        this._onAfterRenderCallback = callback;
      }
      return this;
    }
    /** RENDER **/
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
    onBeforeCommandEncoder() {
    }
    onAfterCommandEncoder() {
      this.scene.onAfterCommandEncoder();
    }
    /**
     * Called at each draw call to render our scene and its content
     * Also create shader modules if not already created
     */
    render() {
      if (!this.ready)
        return;
      this.onBeforeCommandEncoder();
      const commandEncoder = this.device?.createCommandEncoder({ label: "Renderer command encoder" });
      this._onBeforeRenderCallback && this._onBeforeRenderCallback(commandEncoder);
      this.scene.render(commandEncoder);
      this._onAfterRenderCallback && this._onAfterRenderCallback(commandEncoder);
      const commandBuffer = commandEncoder.finish();
      this.device?.queue.submit([commandBuffer]);
      this.texturesQueue.forEach((texture) => {
        texture.sourceUploaded = true;
      });
      this.texturesQueue = [];
      this.onAfterCommandEncoder();
    }
    destroy() {
      this.domElement?.destroy();
      this.documentBody?.destroy();
      this.meshes.forEach((mesh) => mesh.remove());
      this.textures = [];
      this.texturesQueue = [];
      this.renderPass?.destroy();
      this.renderTargets.forEach((renderTarget) => renderTarget.destroy());
      this.shaderPasses.forEach((shaderPass) => shaderPass.remove());
      this.pingPongPlanes.forEach((pingPongPlane) => pingPongPlane.remove());
      this.device?.destroy();
      this.context?.unconfigure();
    }
  };

  // src/core/renderers/GPUCameraRenderer.ts
  var GPUCameraRenderer = class extends GPURenderer {
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      preferredFormat,
      production = false,
      camera = {},
      onError = () => {
      }
    }) {
      super({ container, pixelRatio, sampleCount, preferredFormat, production, onError });
      this.type = "GPUCameraRenderer";
      camera = { ...{ fov: 50, near: 0.01, far: 50 }, ...camera };
      this.setCamera(camera);
    }
    setCamera(camera) {
      const width = this.boundingRect ? this.boundingRect.width : 1;
      const height = this.boundingRect ? this.boundingRect.height : 1;
      this.camera = new Camera({
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
        width,
        height,
        pixelRatio: this.pixelRatio,
        // TODO is this still needed after all?
        // onPerspectiveChanged: () => {
        //   this.planes?.forEach((plane) => plane.updateSizePositionAndProjection())
        // },
        onPositionChanged: () => {
          this.onCameraPositionChanged();
        }
      });
      this.setCameraUniformBinding();
    }
    onCameraPositionChanged() {
      this.setPerspective();
    }
    setCameraUniformBinding() {
      this.cameraUniformBinding = new BufferBindings({
        label: "Camera",
        name: "camera",
        visibility: "vertex",
        bindings: {
          model: {
            // camera model matrix
            name: "model",
            type: "mat4x4f",
            value: this.camera.modelMatrix,
            onBeforeUpdate: () => {
              this.cameraUniformBinding.bindings.model.value = this.camera.modelMatrix;
            }
          },
          view: {
            // camera view matrix
            name: "view",
            type: "mat4x4f",
            value: this.camera.viewMatrix,
            onBeforeUpdate: () => {
              this.cameraUniformBinding.bindings.view.value = this.camera.viewMatrix;
            }
          },
          projection: {
            // camera projection matrix
            name: "projection",
            type: "mat4x4f",
            value: this.camera.projectionMatrix,
            onBeforeUpdate: () => {
              this.cameraUniformBinding.bindings.projection.value = this.camera.projectionMatrix;
            }
          }
        }
      });
      this.cameraBindGroup = new BindGroup(this, {
        label: "Camera Uniform bind group",
        bindings: [this.cameraUniformBinding]
      });
    }
    setCameraBindGroup() {
      if (this.cameraBindGroup.shouldCreateBindGroup) {
        this.cameraBindGroup.setIndex(0);
        this.cameraBindGroup.createBindGroup();
      }
    }
    updateCameraMatrixStack() {
      this.cameraUniformBinding?.shouldUpdateBinding("model");
      this.cameraUniformBinding?.shouldUpdateBinding("view");
      this.cameraUniformBinding?.shouldUpdateBinding("projection");
    }
    /***
       This will set our perspective matrix new parameters (fov, near plane and far plane)
       used internally but can be used externally as well to change fov for example
    
       params :
       @fov (float): the field of view
       @near (float): the nearest point where object are displayed
       @far (float): the farthest point where object are displayed
       ***/
    setPerspective(fov, near, far) {
      this.camera?.setPerspective(fov, near, far, this.boundingRect.width, this.boundingRect.height, this.pixelRatio);
    }
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      this.camera.setPosition(position);
    }
    onResize() {
      super.onResize();
      this.setPerspective();
      this.updateCameraMatrixStack();
    }
    render() {
      if (!this.ready)
        return;
      this.cameraUniformBinding?.onBeforeRender();
      this.setCameraBindGroup();
      this.cameraBindGroup?.updateBindings();
      super.render();
    }
    destroy() {
      this.cameraBindGroup?.destroy();
      super.destroy();
    }
  };

  // src/core/renderPasses/RenderTarget.ts
  var RenderTarget = class {
    constructor(renderer, parameters) {
      this.#autoAddToScene = true;
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, "RenderTarget");
      this.type = "RenderTarget";
      this.renderer = renderer;
      this.uuid = generateUUID();
      const { label, depth, loadOp, clearValue, autoAddToScene } = parameters;
      this.options = {
        label,
        depth,
        loadOp,
        clearValue,
        autoAddToScene
      };
      if (autoAddToScene !== void 0) {
        this.#autoAddToScene = autoAddToScene;
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
    #autoAddToScene;
    addToScene() {
      this.renderer.renderTargets.push(this);
      if (this.#autoAddToScene) {
        this.renderer.scene.addRenderTarget(this);
      }
    }
    removeFromScene() {
      if (this.#autoAddToScene) {
        this.renderer.scene.removeRenderTarget(this);
      }
      this.renderer.renderTargets = this.renderer.renderTargets.filter((renderTarget) => renderTarget.uuid !== this.uuid);
    }
    resize(boundingRect) {
      this.renderPass?.resize(boundingRect);
      this.renderTexture?.resize();
    }
    // alias
    remove() {
      this.destroy();
    }
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
    constructor(renderer, parameters) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " ShaderPass" : "ShaderPass");
      parameters.transparent = true;
      super(renderer, parameters);
      this.type = "ShaderPass";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "Shader pass render texture",
        name: "renderTexture"
      });
    }
    get renderTexture() {
      return this.renderTextures[0] ?? null;
    }
    addToScene() {
      this.renderer.shaderPasses.push(this);
      if (this.autoAddToScene) {
        this.renderer.scene.addShaderPass(this);
      }
    }
    removeFromScene() {
      if (this.renderTarget) {
        this.renderTarget.destroy();
      }
      if (this.autoAddToScene) {
        this.renderer.scene.removeShaderPass(this);
      }
      this.renderer.shaderPasses = this.renderer.shaderPasses.filter((sP) => sP.uuid !== this.uuid);
    }
  };

  // src/curtains/meshes/PingPongPlane.ts
  var PingPongPlane = class extends FullscreenPlane {
    constructor(renderer, parameters = {}) {
      renderer = renderer && renderer.renderer || renderer;
      isRenderer(renderer, parameters.label ? parameters.label + " PingPongPlane" : "PingPongPlane");
      parameters.renderTarget = new RenderTarget(renderer, {
        label: parameters.label ? parameters.label + " render target" : "Ping Pong render target"
      });
      parameters.transparent = false;
      super(renderer, parameters);
      this.type = "PingPongPlane";
      this.createRenderTexture({
        label: parameters.label ? `${parameters.label} render texture` : "PingPongPlane render texture",
        name: "renderTexture"
      });
    }
    get renderTexture() {
      return this.renderTextures[0] ?? null;
    }
    addToScene() {
      this.renderer.pingPongPlanes.push(this);
      if (this.autoAddToScene) {
        this.renderer.scene.addPingPongPlane(this);
      }
    }
    removeFromScene() {
      if (this.renderTarget) {
        this.renderTarget.destroy();
      }
      if (this.autoAddToScene) {
        this.renderer.scene.removePingPongPlane(this);
      }
      this.renderer.pingPongPlanes = this.renderer.pingPongPlanes.filter((pPP) => pPP.uuid !== this.uuid);
    }
  };

  // src/curtains/renderers/GPUCurtainsRenderer.ts
  var GPUCurtainsRenderer = class extends GPUCameraRenderer {
    constructor({
      container,
      pixelRatio = 1,
      sampleCount = 4,
      preferredFormat,
      production = false,
      onError = () => {
      },
      camera
    }) {
      super({
        container,
        pixelRatio,
        sampleCount,
        preferredFormat,
        production,
        onError,
        camera
      });
      this.type = "GPUCurtainsRenderer";
    }
    onCameraPositionChanged() {
      super.onCameraPositionChanged();
      this.domMeshes?.forEach((mesh) => mesh.updateSizePositionAndProjection());
    }
    setRendererObjects() {
      super.setRendererObjects();
      this.domMeshes = [];
    }
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
    constructor({
      xOffset = 0,
      yOffset = 0,
      lastXDelta = 0,
      lastYDelta = 0,
      shouldWatch = true,
      onScroll = (lastXDelta2 = 0, lastYDelta2 = 0) => {
      }
    } = {}) {
      this.xOffset = xOffset;
      this.yOffset = yOffset;
      this.lastXDelta = lastXDelta;
      this.lastYDelta = lastYDelta;
      this.shouldWatch = shouldWatch;
      this.onScroll = onScroll;
      this.handler = this.scroll.bind(this, true);
      if (this.shouldWatch) {
        window.addEventListener("scroll", this.handler, { passive: true });
      }
    }
    /***
     Called by the scroll event listener
     ***/
    scroll() {
      this.updateScrollValues(window.pageXOffset, window.pageYOffset);
    }
    /***
       Updates the scroll manager X and Y scroll values as well as last X and Y deltas
       Internally called by the scroll handler
       Could be called externally as well if the user wants to handle the scroll by himself
    
       params:
       @x (float): scroll value along X axis
       @y (float): scroll value along Y axis
       ***/
    updateScrollValues(x, y) {
      const lastScrollXValue = this.xOffset;
      this.xOffset = x;
      this.lastXDelta = lastScrollXValue - this.xOffset;
      const lastScrollYValue = this.yOffset;
      this.yOffset = y;
      this.lastYDelta = lastScrollYValue - this.yOffset;
      if (this.onScroll) {
        this.onScroll(this.lastXDelta, this.lastYDelta);
      }
    }
    /***
     Destroy our scroll manager (just remove our event listner if it had been added previously)
     ***/
    destroy() {
      if (this.shouldWatch) {
        window.removeEventListener("scroll", this.handler, { passive: true });
      }
    }
  };

  // src/curtains/GPUCurtains.ts
  var GPUCurtains = class {
    constructor({
      container,
      pixelRatio = window.devicePixelRatio ?? 1,
      sampleCount = 4,
      preferredFormat,
      production = false,
      camera,
      autoRender = true,
      autoResize = true,
      watchScroll = true
    }) {
      // callbacks / events
      this._onRenderCallback = () => {
      };
      this._onScrollCallback = () => {
      };
      this._onAfterResizeCallback = () => {
      };
      this._onErrorCallback = () => {
      };
      this.type = "CurtainsGPU";
      this.options = {
        container,
        pixelRatio,
        sampleCount,
        camera,
        production,
        preferredFormat,
        autoRender,
        autoResize,
        watchScroll
      };
      if (container) {
        this.setContainer(container);
      }
    }
    /**
     * Set container
     *
     * @param container
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
     * Set renderer
     */
    setRenderer() {
      this.renderer = new GPUCurtainsRenderer({
        // TODO ...this.options?
        container: this.options.container,
        pixelRatio: this.options.pixelRatio,
        sampleCount: this.options.sampleCount,
        preferredFormat: this.options.preferredFormat,
        camera: this.options.camera,
        production: this.options.production,
        onError: () => this._onErrorCallback && this._onErrorCallback()
      });
      this.canvas = this.renderer.canvas;
    }
    async setRendererContext() {
      await this.renderer.setContext();
    }
    /**
     * Set Curtains
     */
    setCurtains() {
      this.initEvents();
      this.setRenderer();
      this.container.appendChild(this.canvas);
      if (this.options.autoRender) {
        this.animate();
      }
    }
    /** Renderer objects **/
    get pingPongPlanes() {
      return this.renderer?.pingPongPlanes;
    }
    get shaderPasses() {
      return this.renderer?.shaderPasses;
    }
    get meshes() {
      return this.renderer?.meshes;
    }
    get domMeshes() {
      return this.renderer?.domMeshes;
    }
    get planes() {
      return this.renderer?.domMeshes.filter((domMesh) => domMesh.type === "Plane");
    }
    get computePass() {
      return this.renderer?.computePasses;
    }
    get camera() {
      return this.renderer?.camera;
    }
    setPerspective(fov = 50, near = 0.01, far = 50) {
      this.renderer?.setPerspective(fov, near, far);
    }
    setCameraPosition(position = new Vec3(0, 0, 1)) {
      this.renderer?.setCameraPosition(position);
    }
    initEvents() {
      resizeManager.useObserver(this.options.autoResize);
      if (this.options.watchScroll) {
        this.initScroll();
      }
    }
    // called only if autoResize is set to false
    resize() {
      this.renderer?.resize();
      this._onAfterResizeCallback && this._onAfterResizeCallback();
    }
    get boundingRect() {
      return this.renderer?.boundingRect;
    }
    /**
     * SCROLL
     */
    initScroll() {
      this.scrollManager = new ScrollManager({
        // init values
        xOffset: window.pageXOffset,
        yOffset: window.pageYOffset,
        lastXDelta: 0,
        lastYDelta: 0,
        shouldWatch: true,
        onScroll: (lastXDelta, lastYDelta) => this.updateScroll(lastXDelta, lastYDelta)
      });
    }
    updateScroll(lastXDelta = 0, lastYDelta = 0) {
      this.renderer.domMeshes.forEach((mesh) => {
        if (mesh.domElement) {
          mesh.updateScrollPosition(lastXDelta, lastYDelta);
        }
      });
      this._onScrollCallback && this._onScrollCallback();
    }
    getScrollDeltas() {
      return {
        x: this.scrollManager.lastXDelta,
        y: this.scrollManager.lastYDelta
      };
    }
    getScrollValues() {
      return {
        x: this.scrollManager.xOffset,
        y: this.scrollManager.yOffset
      };
    }
    /** EVENTS **/
    onRender(callback) {
      if (callback) {
        this._onRenderCallback = callback;
      }
      return this;
    }
    onScroll(callback) {
      if (callback) {
        this._onScrollCallback = callback;
      }
      return this;
    }
    onAfterResize(callback) {
      if (callback) {
        this._onAfterResizeCallback = callback;
      }
      return this;
    }
    onError(callback) {
      if (callback) {
        this._onErrorCallback = callback;
      }
      return this;
    }
    /***
     This just handles our drawing animation frame
     ***/
    animate() {
      this.render();
      this.animationFrameID = window.requestAnimationFrame(this.animate.bind(this));
    }
    render() {
      this._onRenderCallback && this._onRenderCallback();
      this.renderer?.render();
    }
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
      vertexBuffers = []
    } = {}) {
      super({ verticesOrder: "ccw", instancesCount, vertexBuffers });
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
      vertexBuffers = []
    } = {}) {
      super({ verticesOrder: "ccw", instancesCount, vertexBuffers });
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
