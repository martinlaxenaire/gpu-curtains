import { BufferBindings } from './BufferBindings'
import { WorkBufferBindingsParams } from '../../types/core/bindings/WorkBufferBindings'

export class WorkBufferBindings extends BufferBindings {
  dispatchSize: number[]
  shouldCopyResult: boolean
  result: Float32Array

  constructor({
    label = 'Work',
    name = 'work',
    bindingType,
    bindIndex = 0,
    useStruct = true,
    bindings = {},
    visibility,
    dispatchSize,
    shouldCopyResult = false,
  }: WorkBufferBindingsParams) {
    bindingType = 'storageWrite'
    visibility = 'compute'

    super({ label, name, bindIndex, bindingType, useStruct, bindings, visibility })

    if (!dispatchSize) {
      dispatchSize = [1, 1, 1]
    } else if (Array.isArray(dispatchSize)) {
      dispatchSize[0] = Math.ceil(dispatchSize[0] ?? 1)
      dispatchSize[1] = Math.ceil(dispatchSize[1] ?? 1)
      dispatchSize[2] = Math.ceil(dispatchSize[2] ?? 1)
    } else if (!isNaN(dispatchSize)) {
      dispatchSize = [Math.ceil(dispatchSize), 1, 1]
    }

    this.dispatchSize = dispatchSize as number[]
    this.shouldCopyResult = shouldCopyResult

    this.result = new Float32Array(this.value.slice())
  }
}
