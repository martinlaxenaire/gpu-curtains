import { generateUUID } from '../../utils/utils'
import { BufferUsageKeys, getBufferUsages } from './utils'

/**
 * Parameters used to create a {@link Buffer}.
 */
export interface BufferParams extends Partial<Omit<GPUBufferDescriptor, 'usage'>> {
  /** The label of the {@link Buffer#GPUBuffer | GPUBuffer}, useful for debugging purpose. */
  label?: string
  /** Allowed usages for the {@link Buffer#GPUBuffer | GPUBuffer} as an array of {@link BufferUsageKeys | buffer usages names} */
  usage?: BufferUsageKeys[]
  /** Whether to create the {@link Buffer#GPUBuffer | GPUBuffer} in an already mapped state. See {@link https://gpuweb.github.io/types/interfaces/GPUBufferDescriptor.html#mappedAtCreation | mappedAtCreation (WebGPU API reference)}. */
  mappedAtCreation?: boolean
}

/**
 * Used as a wrapper around {@link GPUBuffer}.
 *
 * Useful to keep tracks of all the {@link GPUBuffer} created thanks to the {@link uuid} property.
 */
export class Buffer {
  /** The type of the {@link Buffer} */
  type: string
  /** The universal unique id of the {@link Buffer} */
  uuid: string
  /** Options used to create this {@link Buffer}, also used as {@link https://gpuweb.github.io/types/interfaces/GPUBufferDescriptor.html | GPUBufferDescriptor (WebGPU API reference)}. */
  options: GPUBufferDescriptor

  /** The actual {@link GPUBuffer} after having been created. */
  GPUBuffer: null | GPUBuffer

  /** A Set to store this {@link Buffer} consumers (usually {@link core/geometries/Geometry.Geometry#uuid | Geometry uuid} or {@link core/bindGroups/BindGroup.BindGroup#uuid | BindGroup uuid}) */
  consumers: Set<string>

  /**
   * Buffer constructors
   * @param parameters - {@link BufferParams | parameters} used to create our Buffer
   */
  constructor(
    {
      label = 'Buffer',
      size = 0,
      usage = ['copySrc', 'copyDst'],
      mappedAtCreation = false,
    }: BufferParams = {} as BufferParams
  ) {
    this.type = 'Buffer'

    this.reset()

    this.uuid = generateUUID()

    this.consumers = new Set()

    this.options = {
      label,
      size,
      usage: getBufferUsages(usage),
      mappedAtCreation,
    }
  }

  /** Reset the {@link GPUBuffer} value to `null`. */
  reset() {
    this.GPUBuffer = null
  }

  /** Allow to dynamically set the size of the {@link GPUBuffer}. */
  set size(value: number) {
    this.options.size = value
  }

  /**
   * Create a {@link GPUBuffer} based on the descriptor stored in the {@link Buffer.options | Buffer options}.
   * @param renderer - {@link core/renderers/GPURenderer.GPURenderer | renderer} used to create the {@link GPUBuffer}.
   * @param options - optional way to update the {@link Buffer.options | Buffer options} previously set before creating the {@link GPUBuffer}.
   */
  createBuffer(renderer, options: BufferParams = {}) {
    const { usage, ...staticOptions } = options

    this.options = {
      ...this.options,
      ...staticOptions,
      ...(usage !== undefined && { usage: getBufferUsages(usage) }),
    }

    this.setBuffer(renderer.createBuffer(this))
  }

  /**
   * Set the {@link Buffer.GPUBuffer | GPUBuffer}. This allows to use a {@link Buffer} with a {@link Buffer.GPUBuffer | GPUBuffer} created separately.
   * @param GPUBuffer - GPU buffer to use.
   */
  setBuffer(GPUBuffer: GPUBuffer) {
    this.GPUBuffer = GPUBuffer
  }

  /**
   * Copy an {@link Buffer#GPUBuffer | Buffer GPUBuffer} and its {@link options} into this {@link Buffer}.
   * @param buffer - {@link Buffer} to use for the copy.
   * @param destroyPreviousBuffer - whether to destroy the previous {@link Buffer} before the copy.
   */
  copy(buffer: Buffer, destroyPreviousBuffer: boolean = false) {
    if (destroyPreviousBuffer) {
      this.destroy()
    }

    this.options = buffer.options
    this.GPUBuffer = buffer.GPUBuffer
    this.consumers = new Set([...this.consumers, ...buffer.consumers])
  }

  /**
   * Map the {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}.
   * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
   */
  async mapBufferAsync() {
    if (!this.GPUBuffer || this.GPUBuffer.mapState !== 'unmapped') return new Float32Array(0)

    await this.GPUBuffer.mapAsync(GPUMapMode.READ)
    const result = new Float32Array(this.GPUBuffer.getMappedRange().slice(0))
    this.GPUBuffer.unmap()

    return result
  }

  /**
   * Destroy the {@link GPUBuffer} and {@link reset} its value.
   */
  destroy() {
    this.GPUBuffer?.destroy()
    this.reset()
    this.consumers.clear()
  }
}
