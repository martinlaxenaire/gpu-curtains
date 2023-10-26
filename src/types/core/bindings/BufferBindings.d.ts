// import { Bindings, BindingsParams } from './Bindings'
// import { BufferBindingsElement } from '../../utils/buffers-utils'
import { BindingsParams } from './Bindings'
import { Input, InputBase, InputValue } from '../materials/Material'

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

// export class BufferBindings extends Bindings {
//   useStruct: boolean
//   bindings: Record<string, BufferBindingsUniform>
//
//   alignmentRows: number
//   size: number
//   shouldUpdate: boolean
//   bindingElements: BufferBindingsElement[]
//
//   value: Float32Array
//
//   wgslStructFragment: string
//   wgslGroupFragment: string[]
//
//   constructor({ label, name, bindingType, bindIndex, useStruct, bindings, visibility }: BufferBindingsParams)
//
//   setBufferGroup()
//   shouldUpdateBinding(bindingName?: string)
// }
