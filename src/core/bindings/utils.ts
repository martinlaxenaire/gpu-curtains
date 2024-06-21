import { BufferBinding } from './BufferBinding'
import { TextureBinding } from './TextureBinding'
import { MaterialShadersType } from '../../types/Materials'

/**
 * Map {@link MaterialShadersType | shaders types names} with actual {@link GPUShaderStageFlags | shaders visibility bitwise flags}.
 */
const bindingVisibilities: Map<MaterialShadersType, GPUShaderStageFlags> = new Map([
  ['vertex', GPUShaderStage.VERTEX],
  ['fragment', GPUShaderStage.FRAGMENT],
  ['compute', GPUShaderStage.COMPUTE],
])

/**
 * Get the corresponding {@link GPUShaderStageFlags | shaders visibility bitwise flags} based on an array of {@link MaterialShadersType | shaders types names}.
 * @param visibilities - array of {@link MaterialShadersType | shaders types names}.
 * @returns - corresponding {@link GPUShaderStageFlags | shaders visibility bitwise flags}.
 */
export const getBindingVisibility = (visibilities: MaterialShadersType[] = []): GPUShaderStageFlags => {
  return visibilities.reduce((acc, v) => {
    return acc | bindingVisibilities.get(v)
  }, 0)
}

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

/** Object containing all buffer layouts */
const bufferLayouts: Record<string, BufferLayout> = {
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

// from https://github.com/greggman/webgpu-utils/blob/main/src/buffer-views.ts
/**
 * Get the correct {@link BufferLayout | buffer layout} for given {@link WGSLVariableType | variable type}
 * @param bufferType - [{@link WGSLVariableType | variable type} to use
 * @returns - the ={@link BufferLayout | buffer layout}
 */
export const getBufferLayout = (bufferType: WGSLVariableType): BufferLayout => {
  return bufferLayouts[bufferType]
}

/**
 * Get the correct WGSL variable declaration code fragment based on the given {@link BufferBinding}
 * @param binding - {@link BufferBinding} to use
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
 * Get the correct WGSL variable declaration code fragment based on the given {@link TextureBinding}
 * @param binding - {@link TextureBinding} to use
 * @returns - WGSL variable declaration code fragment
 */
export const getTextureBindingWGSLVarType = (binding: TextureBinding): string => {
  if (binding.bindingType === 'externalTexture') {
    return `var ${binding.name}: texture_external;`
  }

  return binding.bindingType === 'storage'
    ? `var ${binding.name}: texture_storage_${binding.options.viewDimension.replace('-', '_')}<${
        binding.options.format
      }, ${binding.options.access}>;`
    : binding.bindingType === 'depth'
    ? `var ${binding.name}: texture_depth${
        binding.options.multisampled ? '_multisampled' : ''
      }_${binding.options.viewDimension.replace('-', '_')};`
    : `var ${binding.name}: texture${
        binding.options.multisampled ? '_multisampled' : ''
      }_${binding.options.viewDimension.replace('-', '_')}<f32>;`
}

/**
 * Get the correct {@link GPUBindGroupLayout | bind group layout} resource type based on the given {@link core/bindings/Binding.BindingType | binding type}
 * @param binding - {@link BufferBinding | buffer binding} to use
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
 * Get the correct {@link GPUBindGroupLayout} resource type based on the given {@link core/bindings/Binding.BindingType | texture binding type}
 * @param binding - {@link TextureBinding | texture binding} to use
 * @returns - {@link GPUBindGroupLayout} resource type
 */
export const getBindGroupLayoutTextureBindingType = (
  binding: TextureBinding
): GPUTextureBindingLayout | GPUExternalTextureBindingLayout | GPUStorageTextureBindingLayout | null => {
  return (() => {
    switch (binding.bindingType) {
      case 'externalTexture':
        return { externalTexture: {} }
      case 'storage':
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
            sampleType: binding.options.multisampled ? 'unfilterable-float' : 'float',
          } as GPUTextureBindingLayout,
        }
      case 'depth':
        return {
          texture: {
            multisampled: binding.options.multisampled,
            viewDimension: binding.options.viewDimension,
            sampleType: 'depth',
          } as GPUTextureBindingLayout,
        }
      default:
        return null
    }
  })()
}

/**
 * Get the correct {@link TextureBinding | texture binding} cache key.
 * @param binding - {@link TextureBinding | texture binding} to use
 * @returns - binding cache key
 */
export const getBindGroupLayoutTextureBindingCacheKey = (binding: TextureBinding): string => {
  return (() => {
    switch (binding.bindingType) {
      case 'externalTexture':
        return `externalTexture,${binding.visibility},`
      case 'storage':
        return `storageTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`
      case 'texture':
        return `texture,${binding.options.multisampled},${binding.options.viewDimension},${
          binding.options.multisampled ? 'unfilterable-float' : 'float'
        },${binding.visibility},`
      case 'depth':
        return `depthTexture,${binding.options.format},${binding.options.viewDimension},${binding.visibility},`
      default:
        return `${binding.visibility},`
    }
  })()
}
