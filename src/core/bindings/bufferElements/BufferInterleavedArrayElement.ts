import { BufferArrayElement, BufferArrayElementParams } from './BufferArrayElement'

/**
 * BufferInterleavedArrayElement class:
 * Used to compute alignment when dealing with arrays of struct
 * @extends BufferArrayElement
 */
export class BufferInterleavedArrayElement extends BufferArrayElement {
  /** Corresponding {@link DataView} set function based on [view array]{@link BufferInterleavedElement#view} type */
  viewSetFunction: DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32']

  /**
   * BufferInterleavedArrayElement constructor
   * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferInterleavedArrayElement}
   */
  constructor({ name, key, type = 'f32', arrayLength = 1 }: BufferArrayElementParams) {
    super({ name, key, type, arrayLength })

    this.arrayStride = 1

    this.arrayLength = arrayLength
    this.numElements = this.arrayLength / this.bufferLayout.numElements
  }

  /**
   * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
   * @readonly
   */
  get byteCount(): number {
    return this.bufferLayout.size * this.numElements
  }

  /**
   * Set the [alignment]{@link BufferElementAlignment}
   * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
   * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
   */
  setAlignment(startOffset = 0, stride = 0) {
    this.alignment = this.getElementAlignment(this.getPositionAtOffset(startOffset))

    this.arrayStride = stride

    this.alignment.end = this.getPositionAtOffset(this.endOffset + stride * (this.numElements - 1))
  }

  /**
   * Set the [view]{@link BufferInterleavedArrayElement#view} and [viewSetFunction]{@link BufferInterleavedArrayElement#viewSetFunction}
   * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
   */
  setView(arrayBuffer: ArrayBuffer, arrayView: DataView) {
    // our view will be a simple typed array, not linked to the array buffer
    this.view = new this.bufferLayout.View(this.bufferLayout.numElements * this.numElements)

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
   * Update the [view]{@link BufferArrayElement#view} based on the new value, and then update the [buffer binding array view]{@link BufferBinding#arrayView} using sub arrays
   * @param value - new value to use
   */
  update(value) {
    super.update(value)

    // now use our viewSetFunction to fill the array view with interleaved alignment
    for (let i = 0; i < this.numElements; i++) {
      const subarray = this.view.subarray(
        i * this.bufferLayout.numElements,
        i * this.bufferLayout.numElements + this.bufferLayout.numElements
      )

      const startByteOffset = this.startOffset + i * this.arrayStride

      // view set function need to be called for each subarray entry, so loop over subarray entries
      subarray.forEach((value, index) => {
        this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value, true)
      })
    }
  }

  /**
   * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link BufferBinding}
   * @param result - {@link Float32Array} holding {@link GPUBuffer} data
   */
  extractDataFromBufferResult(result: Float32Array) {
    const interleavedResult = new Float32Array(this.arrayLength)
    for (let i = 0; i < this.numElements; i++) {
      const resultOffset = this.startOffsetToIndex + i * this.arrayStrideToIndex

      for (let j = 0; j < this.bufferLayout.numElements; j++) {
        interleavedResult[i * this.bufferLayout.numElements + j] = result[resultOffset + j]
      }
    }
    return interleavedResult
  }
}
