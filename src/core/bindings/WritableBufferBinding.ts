import { BufferBinding, BufferBindingParams } from './BufferBinding'

/**
 * Parameters used to create a {@link WritableBufferBinding}
 */
export interface WritableBufferBindingParams extends BufferBindingParams {
  /** Whether whe should automatically copy the [resultBuffer]{@link inputs#resultBuffer} GPUBuffer content into our [result GPUBuffer]{@link WritableBufferBinding#resultBuffer} */
  shouldCopyResult?: boolean
}

/**
 * WritableBufferBinding class:
 * Used to create a BufferBindings object that can hold read/write storage struct.
 * @extends BufferBinding
 */
export class WritableBufferBinding extends BufferBinding {
  /** Flag indicating whether whe should automatically copy the resultBuffer GPUBuffer content into our [result GPUBuffer]{@link resultBuffer} array */
  shouldCopyResult: boolean
  /** The result GPUBuffer */
  resultBuffer: GPUBuffer | null
  /** Options used to create this {@link WritableBufferBinding} */
  options: WritableBufferBindingParams

  /**
   * WritableBufferBinding constructor
   * @param parameters - [parameters]{@link WritableBufferBindingParams} used to create our {@link WritableBufferBinding}
   */
  constructor({
    label = 'Work',
    name = 'work',
    bindingType,
    useStruct = true,
    struct = {},
    visibility,
    access = 'read_write',
    shouldCopyResult = false,
  }: WritableBufferBindingParams) {
    bindingType = 'storage'
    visibility = 'compute'

    super({ label, name, bindingType, useStruct, struct: struct, visibility, access })

    this.options = {
      ...this.options,
      shouldCopyResult,
    }

    this.shouldCopyResult = shouldCopyResult

    // can be used as our buffer copy destination
    this.resultBuffer = null
  }
}
