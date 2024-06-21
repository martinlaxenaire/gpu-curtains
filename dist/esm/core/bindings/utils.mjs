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

export { getBindGroupLayoutBindingType, getBindGroupLayoutTextureBindingCacheKey, getBindGroupLayoutTextureBindingType, getBindingVisibility, getBindingWGSLVarType, getBufferLayout, getTextureBindingWGSLVarType };
