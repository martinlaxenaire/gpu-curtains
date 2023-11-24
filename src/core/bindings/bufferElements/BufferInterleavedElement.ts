import {
  BufferElement,
  BufferElementAlignment,
  BufferElementParams,
  bytesPerRow,
  bytesPerSlot,
  slotsPerRow,
} from './BufferElement'

/**
 * BufferInterleavedElement class:
 * Used to handle each binding array view and data layout alignment.
 * Compute the exact alignment offsets needed to fill an {@link ArrayBuffer} that will be sent to a {@link GPUBuffer}, based on an input type and value.
 * Uses and additional alignment object: interleavedAlignment to know where each sub arrays should be inserted into the {@link ArrayBuffer}
 * Also update the view array at the correct offset using sub arrays.
 * @extends BufferElement
 */
export class BufferInterleavedElement extends BufferElement {
  /** Object defining exactly the interleaved alignment needed to know where to insert each subarray into our {@link ArrayBuffer} */
  interleavedAlignment: BufferElementAlignment

  /** Corresponding {@link DataView} set function based on [view array]{@link BufferInterleavedElement#view} type */
  viewSetFunction: DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32']

  /**
   * BufferInterleavedElement constructor
   * @param parameters - [parameters]{@link BufferElementParams} used to create our {@link BufferInterleavedElement}
   */
  constructor({ name, key, type = 'f32', value }: BufferElementParams) {
    super({ name, key, type, value })

    this.interleavedAlignment = {
      startOffset: 0,
      entries: [],
    }
  }

  /**
   * Get the total number of rows used by this {@link BufferInterleavedElement}
   * @readonly
   */
  get rowCount(): number {
    return this.interleavedAlignment.entries.length
      ? this.interleavedAlignment.entries[this.interleavedAlignment.entries.length - 1].row.end + 1
      : this.interleavedAlignment.startOffset / slotsPerRow + Math.ceil(this.bufferLayout.size / bytesPerRow) + 1
  }

  /**
   * Get the total number of slots used by this {@link BufferInterleavedElement}
   * @readonly
   */
  get slotCount(): number {
    return this.rowCount * slotsPerRow * bytesPerSlot
  }

  /**
   * Set the [view]{@link BufferInterleavedElement#view} and [viewSetFunction]{@link BufferInterleavedElement#viewSetFunction}
   * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
   */
  setView(arrayBuffer: ArrayBuffer, arrayView: DataView) {
    // our view will be a simple typed array, not linked to the array buffer
    this.view = new this.bufferLayout.View(this.bufferLayout.numElements * this.alignment.entries.length)

    // but our viewSetFunction is linked to the array view
    this.viewSetFunction = ((arrayView) => {
      switch (this.bufferLayout.View) {
        case Int32Array:
          return arrayView.setInt32.bind(arrayView) as DataView['setInt32']
        case Uint16Array:
          return arrayView.setUint16.bind(arrayView) as DataView['setUint16']
        case Uint32Array:
          return arrayView.setUint32.bind(arrayView) as DataView['setUint32']
        case Float32Array:
        default:
          return arrayView.setFloat32.bind(arrayView) as DataView['setFloat32']
      }
    })(arrayView)
  }

  /**
   * Update the [view]{@link BufferElement#view} based on the new value, and then update the [buffer binding array view]{@link BufferBinding#arrayView} using sub arrays
   * @param value - new value to use
   */
  update(value) {
    super.update(value)

    // now use our viewSetFunction to fill the array view with interleaved alignment
    this.interleavedAlignment.entries.forEach((entry, entryIndex) => {
      const subarray = this.view.subarray(
        entryIndex * this.bufferLayout.numElements,
        entryIndex * this.bufferLayout.numElements + this.bufferLayout.numElements
      )

      const startByteOffset = entry.row.start * bytesPerRow + entry.slot.start

      // view set function need to be called for each subarray entry, so loop over subarray entries
      subarray.forEach((value, index) => {
        this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value, true)
      })
    })
  }
}
