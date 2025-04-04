import { BufferBinding, BufferBindingParams } from './BufferBinding'
import { Buffer } from '../buffers/Buffer'

/**
 * Parameters used to create a {@link WritableBufferBinding}
 */
export interface WritableBufferBindingParams extends BufferBindingParams {
  /** Whether whe should automatically copy the {@link WritableBufferBinding#buffer | GPU buffer} content into our {@link WritableBufferBinding#resultBuffer | result GPU buffer} */
  shouldCopyResult?: boolean
}

/**
 * Used to create a {@link BufferBinding} that can hold read/write storage bindings along with a {@link WritableBufferBinding#resultBuffer | result GPU buffer} that can be used to get data back from the GPU.
 *
 * Note that it is automatically created by the {@link core/bindGroups/BindGroup.BindGroup | BindGroup} when a {@link types/BindGroups.BindGroupInputs#storages | storages input} has its {@link BufferBindingParams#access | access} property set to `"read_write"`.
 */
export class WritableBufferBinding extends BufferBinding {
  /** Flag indicating whether whe should automatically copy the {@link buffer | GPU buffer} content into our {@link resultBuffer | result GPU buffer} */
  shouldCopyResult: boolean
  /** The result GPUBuffer */
  resultBuffer: Buffer
  /** Options used to create this {@link WritableBufferBinding} */
  options: WritableBufferBindingParams

  /**
   * WritableBufferBinding constructor
   * @param parameters - {@link WritableBufferBindingParams | parameters} used to create our {@link WritableBufferBinding}
   */
  constructor({
    label = 'Work',
    name = 'work',
    bindingType,
    visibility,
    useStruct = true,
    access = 'read_write',
    usage = [],
    struct = {},
    childrenBindings = [],
    buffer = null,
    parent = null,
    minOffset = 256,
    offset = 0,
    shouldCopyResult = false,
  }: WritableBufferBindingParams) {
    bindingType = 'storage'
    visibility = ['compute']

    super({
      label,
      name,
      bindingType,
      visibility,
      useStruct,
      access,
      usage,
      struct,
      childrenBindings,
      buffer,
      parent,
      minOffset,
      offset,
    })

    this.options = {
      ...this.options,
      shouldCopyResult,
    }

    this.shouldCopyResult = shouldCopyResult
    this.cacheKey += `${shouldCopyResult},`

    // can be used as our buffer copy destination
    this.resultBuffer = new Buffer()
  }
}
