import { BindGroupBinding, BindGroupBindingParams } from './BindGroupBinding'
import { MeshUniformValue, MeshUniforms, MeshUniformsBase } from '../meshes/Mesh'

interface BindGroupBufferBindingsUniform extends MeshUniformsBase {
  _value: MeshUniformValue
  get(value: MeshUniformValue): MeshUniformValue
  set(value: MeshUniformValue)
  shouldUpdate: boolean
}

interface BindGroupBufferBindingsElement extends CoreBufferParams {
  bufferSize: number
  totalLength: number
  update: (value: MeshUniformValue) => void
  key: string
}

interface BindGroupBufferBindingsParams extends BindGroupBindingParams {
  useStruct?: boolean
  uniforms?: Record<string, MeshUniforms>
}

export class BindGroupBufferBindings extends BindGroupBinding {
  useStruct: boolean
  uniforms: Record<string, BindGroupBufferBindingsUniform>

  size: number
  shouldUpdate: boolean
  bindingElements: BindGroupBufferBindingsElement[]

  value: Float32Array

  wgslStructFragment: string
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, useStruct, uniforms, visibility }: BindGroupBufferBindingsParams)

  setBufferGroup()
  shouldUpdateUniform(uniformName?: string)
}
