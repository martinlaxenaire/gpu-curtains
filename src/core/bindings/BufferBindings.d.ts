import { Bindings, BindingsParams } from './Bindings'
import { MeshUniformValue, MeshUniformsBase, MeshUniforms } from '../meshes/MeshBaseMixin'

interface BufferBindingsUniform extends MeshUniformsBase {
  _value: MeshUniformValue
  get(value: MeshUniformValue): MeshUniformValue
  set(value: MeshUniformValue)
  shouldUpdate: boolean
}

interface BufferBindingsElement extends CoreBufferParams {
  bufferSize: number
  totalLength: number
  update: (value: MeshUniformValue) => void
  key: string
}

interface BufferBindingsParams extends BindingsParams {
  useStruct?: boolean
  uniforms?: Record<string, MeshUniforms>
}

export class BufferBindings extends Bindings {
  useStruct: boolean
  uniforms: Record<string, BufferBindingsUniform>

  size: number
  shouldUpdate: boolean
  bindingElements: BufferBindingsElement[]

  value: Float32Array

  wgslStructFragment: string
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, useStruct, uniforms, visibility }: BufferBindingsParams)

  setBufferGroup()
  shouldUpdateUniform(uniformName?: string)
}
