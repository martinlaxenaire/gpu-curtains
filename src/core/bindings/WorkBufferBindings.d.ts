import { BufferBindings, BufferBindingsParams } from './BufferBindings'

interface WorkBufferBindingsParams extends BufferBindingsParams {
  dispatchSize?: number | number[]
  copyResult?: boolean
}

export class WorkBufferBindings extends BufferBindings {
  dispatchSize: number[]
  copyResult: boolean
  result: Float32Array

  constructor({
    label,
    name,
    bindingType,
    bindIndex,
    useStruct,
    bindings,
    visibility,
    dispatchSize,
  }: WorkBufferBindingsParams)
}
