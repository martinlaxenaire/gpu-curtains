import { BufferBindings, BufferBindingsParams } from './BufferBindings'

/**
 * Parameters used to create a {@link WorkBufferBindings}
 */
export interface WorkBufferBindingsParams extends BufferBindingsParams {
  /** Whether whe should automatically copy the [resultBuffer]{@link bindings#resultBuffer} GPUBuffer content into our [result]{@link WorkBufferBindings#result} array */
  shouldCopyResult?: boolean
}

/**
 * WorkBufferBindings class:
 * Used to create a BufferBindings object that can hold read/write storage bindings.
 * @extends BufferBindings
 */
export class WorkBufferBindings extends BufferBindings {
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
    shouldCopyResult = false,
  }: WorkBufferBindingsParams) {
    bindingType = 'storageWrite'
    visibility = 'compute'

    super({ label, name, bindIndex, bindingType, useStruct, bindings, visibility })

    this.shouldCopyResult = shouldCopyResult

    this.result = new Float32Array(this.value.slice())
    this.resultBuffer = null
  }
}
