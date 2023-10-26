import { BindingsParams } from './Bindings'
import { Input, InputBase, InputValue } from '../bindGroups/BindGroup'

export interface BufferBindingsUniform extends InputBase {
  _value: InputValue
  get value(): InputValue
  set value(value: InputValue)
  shouldUpdate: boolean
}

export interface BufferBindingsParams extends BindingsParams {
  useStruct?: boolean
  bindings?: Record<string, Input>
}
