import { BufferBindings, BufferBindingsParams } from './BufferBindings'

interface WorkBufferBindingsParams extends BufferBindingsParams {
  dispatchSize?: number | number[]
}

export class WorkBufferBindings extends BufferBindings {
  dispatchSize: number[]
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
