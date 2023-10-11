import { MeshUniformValue } from '../core/meshes/MeshBaseMixin'
import { BindingType } from '../core/bindings/Bindings'
import { VertexBuffer } from '../core/geometries/Geometry'

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
interface BufferBindingsElement {
  name: string
  type: CoreBufferType
  key: string
  update: (value: MeshUniformValue) => void
  bufferLayout: BufferLayout
  startOffset: number
  endOffset: number
}

interface AttributeBufferParamsOption {
  vertexBuffer?: VertexBuffer
  name: string
  type?: CoreBufferType
  bufferFormat?: GPUVertexFormat
  size?: number
  array: Float32Array
}

interface AttributeBufferParams extends AttributeBufferParamsOption {
  type: CoreBufferType
  bufferFormat: GPUVertexFormat
  size: number
  bufferLength: number
  offset: number
  bufferOffset: GPUSize64
}

export function getBufferLayout(bufferType: CoreBufferType): BufferLayout
export function getBindingWgslVarType(bindingType: BindingType): string
export function getBindGroupLayoutBindingType(bindingType: BindingType): GPUBufferBindingType
