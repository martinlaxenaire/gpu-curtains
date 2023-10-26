import { InputValue } from '../types/core/bindGroups/BindGroup'
import { VertexBuffer } from '../types/core/geometries/Geometry'
import { BindingType } from '../types/core/bindings/Bindings'

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

type CoreBufferType = string // TODO 'mat4x4f', 'mat3x3f', 'vec3f', 'vec2f', 'f32' etc

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor

export type BufferLayout = {
  numElements: number
  align: number
  size: number
  type: CoreBufferType
  View: TypedArrayConstructor
  pad?: number[]
}

// TODO we should correctly use types like GPUSize64 / GPUIndex32
export interface BufferBindingsElement {
  name: string
  type: CoreBufferType
  key: string
  update: (value: InputValue) => void
  bufferLayout: BufferLayout
  startOffset: number
  endOffset: number
  array?: TypedArray
}

export interface AttributeBufferParamsOption {
  vertexBuffer?: VertexBuffer
  name: string
  type?: CoreBufferType
  bufferFormat?: GPUVertexFormat
  size?: number
  array: Float32Array
  verticesUsed?: number
}

export interface AttributeBufferParams extends AttributeBufferParamsOption {
  type: CoreBufferType
  bufferFormat: GPUVertexFormat
  size: number
  bufferLength: number
  offset: number
  bufferOffset: GPUSize64
  verticesUsed: number
}

// from https://github.com/greggman/webgpu-utils/blob/main/src/buffer-views.ts
export const getBufferLayout = (bufferType: CoreBufferType): BufferLayout => {
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

export const getBufferArrayStride = (bindingElement: BufferBindingsElement): number => {
  return (() => {
    switch (bindingElement.type) {
      case 'array<vec4f>':
        return 4
      case 'array<vec3f>':
        return 3
      case 'array<vec2f>':
        return 2
      case 'array<f32>':
      default:
        return 1
    }
  })()
}

export const getBindingWgslVarType = (bindingType: BindingType): string => {
  return (() => {
    switch (bindingType) {
      case 'storage':
        return 'var<storage, read>'
      case 'storageWrite':
        return 'var<storage, read_write>'
      case 'uniform':
      default:
        return 'var<uniform>'
    }
  })()
}

export const getBindGroupLayoutBindingType = (bindingType: BindingType): GPUBufferBindingType => {
  return (() => {
    switch (bindingType) {
      case 'storage':
        return 'read-only-storage'
      case 'storageWrite':
        return 'storage'
      case 'uniform':
      default:
        return 'uniform'
    }
  })()
}
