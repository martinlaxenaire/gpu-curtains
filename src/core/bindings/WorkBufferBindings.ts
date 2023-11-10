import { BufferBindings, BufferBindingsParams } from './BufferBindings'

export interface WorkBufferBindingsParams extends BufferBindingsParams {
  /** Work group dispatch size to use */
  dispatchSize?: number | number[]
  /** Whether whe should automatically copy the [resultBuffer]{@link bindings#resultBuffer} GPUBuffer content into our [result]{@link WorkBufferBindings#result} array */
  shouldCopyResult?: boolean
}

/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBindings
 */
export class WorkBufferBindings extends BufferBindings {
  /** An array of number describing how we must dispatch the work group */
  dispatchSize: number[]
  /** Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our {@link result} array */
  shouldCopyResult: boolean
  /** Array specifically designed to handle the result of our [resultBuffer]{@link bindings#resultBuffer} GPUBuffer if needed */
  result: Float32Array
  /** The result GPUBuffer */
  resultBuffer: GPUBuffer | null

  /**
   * WorkBufferBindings constructor
   * @param parameters - [parameters]{@link WorkBufferBindingsParams} used to create our {@link WorkBufferBindings}
   */
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
    this.resultBuffer = null
  }
}
