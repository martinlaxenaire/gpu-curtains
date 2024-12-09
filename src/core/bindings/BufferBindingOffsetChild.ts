import { BufferBindingParams, BufferBinding } from './BufferBinding'
import { getBindGroupLayoutBindingType } from './utils'

/** Options used to create a {@link BufferBindingOffsetChild}. */
export interface BufferBindingOffsetChildOptions extends BufferBindingParams {
  /** The minimum {@link GPUDevice} buffer offset alignment. */
  minOffset?: number
  /** Offset of the {@link BufferBindingOffsetChild} in the {@link BufferBindingOffsetChild#parent | parent BufferBinding} (as an index - not in bytes). */
  offset?: number
}

/** Parameters used to create a {@link BufferBindingOffsetChild}. */
export interface BufferBindingOffsetChildParams extends BufferBindingOffsetChildOptions {
  /** The parent {@link BufferBinding} that will actually handle the {@link GPUBuffer}. */
  parent?: BufferBinding
}

/**
 * A special {@link BufferBinding} that can use a {@link parent | parent BufferBinding} buffer portion defined by an offset and a size. Useful to drastically reduce the number of WebGPU `writeBuffer` calls by updating a single big parent buffer containing multiple children.
 *
 * When a {@link parent} is set, then this {@link BufferBindingOffsetChild} won't create a {@link GPUBuffer} but will instead update its parent {@link arrayBuffer} at the given offset, and let the parent handle the {@link GPUBuffer}.
 *
 * If no {@link parent} is set, then it acts as a regular {@link BufferBinding}.
 */
export class BufferBindingOffsetChild extends BufferBinding {
  /** Options used to create this {@link BufferBindingOffsetChild}. */
  options: BufferBindingOffsetChildOptions

  /** @ignore */
  #parent: BufferBinding | null

  /** {@link DataView} inside the {@link arrayBuffer | parent arrayBuffer} if set. */
  parentView: DataView | null
  /** Array of view set functions to use with the various {@link bufferElements} if the {@link parent} is set. */
  viewSetFunctions: Array<
    DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32']
  > | null

  /**
   * BufferBindingOffsetChild constructor
   * @param parameters - {@link BufferBindingOffsetChildParams | parameters} used to create this {@link BufferBindingOffsetChild}.
   */
  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    visibility,
    useStruct = true,
    access = 'read',
    usage = [],
    struct = {},
    childrenBindings = [],
    parent = null,
    minOffset = 256,
    offset = 0,
  }: BufferBindingOffsetChildParams) {
    super({ label, name, bindingType, visibility, useStruct, access, usage, struct, childrenBindings })

    this.options = {
      ...this.options,
      minOffset,
      offset,
    }

    this.parent = parent
  }

  /**
   * Get the {@link BufferBinding} parent if any.
   * @readonly
   * @returns - The {@link BufferBinding} parent if any.
   */
  get parent(): BufferBinding {
    return this.#parent
  }

  /**
   * Set the new {@link BufferBinding} parent.
   * @param value - New {@link BufferBinding} parent to set if any.
   */
  set parent(value: BufferBinding | null) {
    if (!!value) {
      this.parentView = new DataView(value.arrayBuffer, this.offset, this.getMinOffsetSize(this.arrayBufferSize))

      this.viewSetFunctions = this.bufferElements.map((bufferElement) => {
        switch (bufferElement.bufferLayout.View) {
          case Int32Array:
            return this.parentView.setInt32.bind(this.parentView) as DataView['setInt32']
          case Uint16Array:
            return this.parentView.setUint16.bind(this.parentView) as DataView['setUint16']
          case Uint32Array:
            return this.parentView.setUint32.bind(this.parentView) as DataView['setUint32']
          case Float32Array:
          default:
            return this.parentView.setFloat32.bind(this.parentView) as DataView['setFloat32']
        }
      })

      if (!this.parent && this.buffer.GPUBuffer) {
        // if it has a GPU Buffer but no parent yet, destroy the buffer
        this.buffer.destroy()
      }
    } else {
      this.parentView = null
      this.viewSetFunctions = null
    }

    this.#parent = value
  }

  /**
   * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
   * @param value - Size to round.
   */
  getMinOffsetSize(value: number): number {
    return Math.ceil(value / this.options.minOffset) * this.options.minOffset
  }

  /**
   * Get this {@link BufferBindingOffsetChild} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
   * @readonly
   * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
   */
  get offset(): number {
    return this.getMinOffsetSize(this.options.offset * this.getMinOffsetSize(this.arrayBufferSize))
  }

  /**
   * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}.
   * @readonly
   */
  get resourceLayout(): {
    /** {@link GPUBindGroupLayout | bind group layout} resource */
    buffer: GPUBufferBindingLayout
    /** Offset in bytes in the {@link parent} buffer if set. */
    offset?: number
    /** Size in bytes in the {@link parent} buffer if set. */
    size?: number
  } {
    return {
      buffer: {
        type: getBindGroupLayoutBindingType(this),
      },
      ...(this.parent && { offset: this.offset, size: this.arrayBufferSize }),
    }
  }

  /**
   * Get {@link GPUBindGroupEntry#resource | bind group resource}
   * @readonly
   */
  get resource(): {
    /** {@link GPUBindGroup | bind group} resource */
    buffer: GPUBuffer | null
    /** Offset in bytes in the {@link parent} buffer if set. */
    offset?: number
    /** Size in bytes in the {@link parent} buffer if set. */
    size?: number
  } {
    return {
      buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
      ...(this.parent && { offset: this.offset, size: this.arrayBufferSize }),
    }
  }

  /**
   * Update the {@link BufferBindingOffsetChild} at the beginning of a Material render call.
   *
   * If a {@link parent} is set, then update its {@link arrayBuffer | arrayBuffer} using our {@link viewSetFunctions}.
   */
  update() {
    super.update()

    if (this.shouldUpdate && this.parent && this.viewSetFunctions) {
      let index = 0
      this.bufferElements.forEach((bufferElement, i) => {
        bufferElement.view.forEach((value) => {
          this.viewSetFunctions[i](index * bufferElement.view.BYTES_PER_ELEMENT, value, true)
          index++
        })
      })

      this.parent.shouldUpdate = true

      // reset the should update flag
      // this binding GPU buffer is not going to be used anyway
      this.shouldUpdate = false
    }
  }
}
