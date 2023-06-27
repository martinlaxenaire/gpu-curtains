type CoreBufferType = string // TODO 'mat4x4f', 'mat3x3f', 'vec3f', 'vec2f', 'f32' etc

// TODO we should correctly use types like GPUSize64 / GPUIndex32
interface CoreBufferParamsOption {
  name: string
  type?: CoreBufferType
  bufferFormat?: GPUVertexFormat
  size?: number
  array: Float32Array
}

interface CoreBufferParams extends CoreBufferParamsOption {
  type: CoreBufferType
  bufferFormat: GPUVertexFormat
  size: number
  bufferLength: number
  offset: number
  bufferOffset: GPUSize64
}

type TypedArrayConstructor =
  | Int8ArrayConstructor
  | Uint8ArrayConstructor
  | Int16ArrayConstructor
  | Uint16ArrayConstructor
  | Int32ArrayConstructor
  | Uint32ArrayConstructor
  | Float32ArrayConstructor
  | Float64ArrayConstructor

type BufferLayout = {
  numElements: number
  align: number
  size: number
  type: CoreBufferType
  View: TypedArrayConstructor
  pad?: number[]
}

export function getBufferLayout(bufferType: CoreBufferType): BufferLayout
