type CoreBufferPropsType = string // TODO 'mat4x4f', 'mat3x3f', 'vec3f', 'vec2f', 'f32' etc

// TODO we should correctly use types like GPUSize64 / GPUIndex32
interface CoreBufferParamsOption {
  name: string
  type?: CoreBufferPropsType
  bufferFormat?: GPUVertexFormat
  size?: number
  array: Float32Array
}

interface CoreBufferParams extends CoreBufferParamsOption {
  type: CoreBufferPropsType
  bufferFormat: GPUVertexFormat
  size: number
  bufferLength: number
  offset: number
  bufferOffset: GPUSize64
}
