import { BindingType } from './Binding'
import { BufferBinding } from './BufferBinding'
import { TextureBinding } from './TextureBinding'

/** Defines a typed array */
export type TypedArray =
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array

/** Defines a typed array constructor */
export type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor

/** Defines the possible WGSL variable types */
export type WGSLVariableType = string // TODO 'mat4x4f', 'mat3x3f', 'vec3f', 'vec2f', 'f32' etc

/**
 * Defines a {@link BufferLayout} object used to pad our {@link GPUBuffer} arrays
 */
export type BufferLayout = {
  /** Number of elements hold by this variable type */
  numElements: number
  /** Required alignment by this variable type */
  align: number
  /** Size in bytes of this variable type */
  size: number
  /** Variable type */
  type: WGSLVariableType
  /** Typed array constructor required by this variable type */
  View: TypedArrayConstructor
  /** Pad values required by this variable type */
  pad?: number[]
}

// from https://github.com/greggman/webgpu-utils/blob/main/src/buffer-views.ts
/**
 * Get the correct [buffer layout]{@link BufferLayout} for given [variable type]{@link WGSLVariableType}
 * @param bufferType - [variable type]{@link WGSLVariableType} to use
 * @returns - the [buffer layout]{@link BufferLayout}
 */
export const getBufferLayout = (bufferType: WGSLVariableType): BufferLayout => {
  const bufferLayouts = {
    i32: { numElements: 1, align: 4, size: 4, type: 'i32', View: Int32Array },
    u32: { numElements: 1, align: 4, size: 4, type: 'u32', View: Uint32Array },
    f32: { numElements: 1, align: 4, size: 4, type: 'f32', View: Float32Array },
    f16: { numElements: 1, align: 2, size: 2, type: 'u16', View: Uint16Array },

    vec2f: { numElements: 2, align: 8, size: 8, type: 'f32', View: Float32Array },
    vec2i: { numElements: 2, align: 8, size: 8, type: 'i32', View: Int32Array },
    vec2u: { numElements: 2, align: 8, size: 8, type: 'u32', View: Uint32Array },
    vec2h: { numElements: 2, align: 4, size: 4, type: 'u16', View: Uint16Array },
    vec3i: { numElements: 3, align: 16, size: 12, type: 'i32', View: Int32Array },
    vec3u: { numElements: 3, align: 16, size: 12, type: 'u32', View: Uint32Array },
    vec3f: { numElements: 3, align: 16, size: 12, type: 'f32', View: Float32Array },
    vec3h: { numElements: 3, align: 8, size: 6, type: 'u16', View: Uint16Array },
    vec4i: { numElements: 4, align: 16, size: 16, type: 'i32', View: Int32Array },
    vec4u: { numElements: 4, align: 16, size: 16, type: 'u32', View: Uint32Array },
    vec4f: { numElements: 4, align: 16, size: 16, type: 'f32', View: Float32Array },
    vec4h: { numElements: 4, align: 8, size: 8, type: 'u16', View: Uint16Array },

    // AlignOf(vecR)	SizeOf(array<vecR, C>)
    mat2x2f: { numElements: 4, align: 8, size: 16, type: 'f32', View: Float32Array },
    mat2x2h: { numElements: 4, align: 4, size: 8, type: 'u16', View: Uint16Array },
    mat3x2f: { numElements: 6, align: 8, size: 24, type: 'f32', View: Float32Array },
    mat3x2h: { numElements: 6, align: 4, size: 12, type: 'u16', View: Uint16Array },
    mat4x2f: { numElements: 8, align: 8, size: 32, type: 'f32', View: Float32Array },
    mat4x2h: { numElements: 8, align: 4, size: 16, type: 'u16', View: Uint16Array },
    mat2x3f: { numElements: 8, align: 16, size: 32, pad: [3, 1], type: 'f32', View: Float32Array },
    mat2x3h: { numElements: 8, align: 8, size: 16, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat3x3f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: 'f32', View: Float32Array },
    mat3x3h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat4x3f: { numElements: 16, align: 16, size: 64, pad: [3, 1], type: 'f32', View: Float32Array },
    mat4x3h: { numElements: 16, align: 8, size: 32, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat2x4f: { numElements: 8, align: 16, size: 32, type: 'f32', View: Float32Array },
    mat2x4h: { numElements: 8, align: 8, size: 16, type: 'u16', View: Uint16Array },
    mat3x4f: { numElements: 12, align: 16, size: 48, pad: [3, 1], type: 'f32', View: Float32Array },
    mat3x4h: { numElements: 12, align: 8, size: 24, pad: [3, 1], type: 'u16', View: Uint16Array },
    mat4x4f: { numElements: 16, align: 16, size: 64, type: 'f32', View: Float32Array },
    mat4x4h: { numElements: 16, align: 8, size: 32, type: 'u16', View: Uint16Array },
  }

  return bufferLayouts[bufferType]
}

/**
 * Get the correct WGSL variable declaration code fragment based on the given [buffer binding]{@link BufferBinding}
 * @param binding - [buffer binding]{@link BufferBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export const getBindingWGSLVarType = (binding: BufferBinding): string => {
  return (() => {
    switch (binding.bindingType) {
      case 'storage':
        return `var<${binding.bindingType}, ${binding.options.access}>`
      case 'uniform':
      default:
        return 'var<uniform>'
    }
  })()
}

/**
 * Get the correct WGSL variable declaration code fragment based on the given [texture binding]{@link TextureBinding}
 * @param binding - [texture binding]{@link TextureBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export const getTextureBindingWGSLVarType = (binding: TextureBinding): string => {
  if (binding.bindingType === 'externalTexture') {
    return `var ${binding.name}: texture_external;`
  }

  return binding.bindingType === 'storageTexture'
    ? `var ${binding.name}: texture_storage_${binding.options.viewDimension}<${binding.options.format}, ${binding.options.access}>;`
    : binding.bindingType === 'depthTexture'
    ? `var ${binding.name}: texture_depth${binding.options.multisampled ? '_multisampled' : ''}_${
        binding.options.viewDimension
      };`
    : `var ${binding.name}: texture_${binding.options.viewDimension}<f32>;`
}

/**
 * Get the correct [bind group layout]{@link GPUBindGroupLayout} resource type based on the given [binding type]{@link BindingType}
 * @param binding - [buffer binding]{@link BufferBinding} to use
 * @returns - {@link GPUBindGroupLayout | bind group layout} resource type
 */
export const getBindGroupLayoutBindingType = (binding: BufferBinding): GPUBufferBindingType => {
  if (binding.bindingType === 'storage' && binding.options.access === 'read_write') {
    return 'storage'
  } else if (binding.bindingType === 'storage') {
    return 'read-only-storage'
  } else {
    return 'uniform'
  }
}

/**
 * Get the correct [bind group layout]{@link GPUBindGroupLayout} resource type based on the given [texture binding type]{@link BindingType}
 * @param binding - [texture binding]{@link TextureBinding} to use
 * @returns - [bind group layout]{@link GPUBindGroupLayout} resource type
 */
export const getBindGroupLayoutTextureBindingType = (
  binding: TextureBinding
): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null => {
  return (() => {
    switch (binding.bindingType) {
      case 'externalTexture':
        return { externalTexture: {} }
      case 'storageTexture':
        return {
          storageTexture: {
            format: binding.options.format,
            viewDimension: binding.options.viewDimension,
          } as GPUStorageTextureBindingLayout,
        }
      case 'texture':
        return {
          texture: {
            multisampled: binding.options.multisampled,
            viewDimension: binding.options.viewDimension,
          } as GPUTextureBindingLayout,
        }
      case 'depthTexture':
        return {
          texture: {
            multisampled: binding.options.multisampled,
            format: binding.options.format,
            viewDimension: binding.options.viewDimension,
            sampleType: 'depth',
          } as GPUTextureBindingLayout,
        }
      default:
        return null
    }
  })()
}
