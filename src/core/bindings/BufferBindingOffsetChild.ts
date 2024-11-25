import { BufferBindingParams, BufferBinding } from './BufferBinding'
import { throwWarning } from '../../utils/utils'
import { BufferInterleavedArrayElement } from './bufferElements/BufferInterleavedArrayElement'
import { getBindGroupLayoutBindingType } from './utils'

export interface BufferBindingOffsetChildOptions extends BufferBindingParams {
  offset?: number
}

export interface BufferBindingOffsetChildParams extends BufferBindingOffsetChildOptions {
  parent: BufferBinding
}

export class BufferBindingOffsetChild extends BufferBinding {
  options: BufferBindingOffsetChildOptions
  parent: BufferBinding

  parentView: DataView
  viewSetFunctions: Array<DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32']>

  constructor({
    label = 'Uniform',
    name = 'uniform',
    bindingType,
    visibility,
    useStruct = true,
    access = 'read',
    usage = [],
    struct = {},
    bindings = [],
    parent,
    offset = 0,
  }: BufferBindingOffsetChildParams) {
    super({ label, name, bindingType, visibility, useStruct, access, usage, struct, bindings })

    if (!parent) {
      throwWarning('BufferBindingOffsetChild cannot be created without a BufferBinding parent')
      return
    }

    this.parent = parent

    this.options = {
      ...this.options,
      offset,
    }

    for (const bufferElement of this.parent.bufferElements) {
      if (!(bufferElement instanceof BufferInterleavedArrayElement)) {
        throwWarning('BufferBindingOffsetChild parent has to be made of BufferInterleavedArrayElement only')
        break
      }
    }

    this.parentView = new DataView(this.parent.arrayBuffer, this.offset, this.arrayBufferSize)

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
  }

  get offset() {
    return Math.ceil((this.options.offset * this.arrayBufferSize) / 256) * 256
  }

  /**
   * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}
   * @readonly
   */
  get resourceLayout(): {
    /** {@link GPUBindGroupLayout | bind group layout} resource */
    buffer: GPUBufferBindingLayout
    offset: number
    size: number
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
    offset: number
    size: number
  } {
    return {
      buffer: this.parent ? this.parent.buffer.GPUBuffer : this.buffer.GPUBuffer,
      ...(this.parent && { offset: this.offset, size: this.arrayBufferSize }),
    }
  }

  update() {
    super.update()

    if (this.shouldUpdate && this.parent) {
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
