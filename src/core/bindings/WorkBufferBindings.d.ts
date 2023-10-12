import { BufferBindings, BufferBindingsParams } from './BufferBindings'

interface WorkBufferBindingsParams extends BufferBindingsParams {
  dispatchSize?: number | number[]
  shouldCopyResult?: boolean
}

export class WorkBufferBindings extends BufferBindings {
  dispatchSize: number[]
  shouldCopyResult: boolean
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
    shouldCopyResult,
  }: WorkBufferBindingsParams)
}
