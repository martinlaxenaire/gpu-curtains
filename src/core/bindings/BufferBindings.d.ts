import { Bindings, BindingsParams } from './Bindings'
import { MeshUniformValue, MeshInputsBase, MeshInputs } from '../meshes/MeshBaseMixin'
import { BufferBindingsElement } from '../../types/buffers-utils'

interface BufferBindingsUniform extends MeshInputsBase {
  _value: MeshUniformValue
  get value(): MeshUniformValue
  set value(value: MeshUniformValue)
  shouldUpdate: boolean
}

interface BufferBindingsParams extends BindingsParams {
  useStruct?: boolean
  bindings?: Record<string, MeshInputs>
}

export class BufferBindings extends Bindings {
  useStruct: boolean
  bindings: Record<string, BufferBindingsUniform>

  alignmentRows: number
  size: number
  shouldUpdate: boolean
  bindingElements: BufferBindingsElement[]

  value: Float32Array

  wgslStructFragment: string
  wgslGroupFragment: string

  constructor({ label, name, bindingType, bindIndex, useStruct, bindings, visibility }: BufferBindingsParams)

  setBufferGroup()
  shouldUpdateBinding(bindingName?: string)
}
