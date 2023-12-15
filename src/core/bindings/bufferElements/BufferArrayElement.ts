import { BufferElement, BufferElementParams, bytesPerSlot } from './BufferElement'
import { throwWarning } from '../../../utils/utils'

/**
 * Parameters used to create a {@link BufferArrayElement}
 */
export interface BufferArrayElementParams extends BufferElementParams {
  /** Initial length of the input [buffer binding array]{@link BufferBinding#value} */
  arrayLength: number
}

/**
 * BufferArrayElement class:
 * Used to handle specific array [buffer binding]{@link BufferBinding} types
 * @extends BufferElement
 */
export class BufferArrayElement extends BufferElement {
  /** Initial length of the input [buffer binding array]{@link BufferBinding#value} */
  arrayLength: number
  /** Total number of elements (i.e. {@link arrayLength} divided by [buffer layout number of elements]{@link BufferLayout#numElements} */
  numElements: number
  /** Stride in the {@link ArrayBuffer} between two elements of the array in bytes */
  stride: number

  /**
   * BufferArrayElement constructor
   * @param parameters - [parameters]{@link BufferArrayElementParams} used to create our {@link BufferArrayElement}
   */
  constructor({ name, key, type = 'f32', arrayLength = 1 }: BufferArrayElementParams) {
    super({ name, key, type })

    this.arrayLength = arrayLength
    this.numElements = this.arrayLength / this.bufferLayout.numElements
  }

  /**
   * Get the stride between two elements of the array in indices
   * @readonly
   */
  get strideToIndex(): number {
    return this.stride / bytesPerSlot
  }

  /**
   * Set the [alignment]{@link BufferElementAlignment}
   * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the stride between two array elements. Using the stride and the total number of elements, we can easily get the end alignment position.
   * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   */
  setAlignment(startOffset = 0) {
    super.setAlignment(startOffset)

    // repeat for a second element to know how things are laid out
    const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(this.endOffset + 1))
    this.stride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end)

    this.alignment.end = this.getPositionAtOffset(this.endOffset + this.stride * (this.numElements - 1))
  }

  /**
   * Update the [view]{@link BufferElement#view} based on the new value
   * @param value - new value to use
   */
  update(value) {
    if (ArrayBuffer.isView(value) || Array.isArray(value)) {
      let valueIndex = 0

      const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
      // stride is our view length divided by the number of elements in our array
      const stride = Math.ceil(viewLength / this.numElements)

      for (let i = 0; i < this.numElements; i++) {
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          this.view[j + i * stride] = value[valueIndex]

          valueIndex++
        }
      }
    } else {
      throwWarning(`BufferArrayElement: value passed to ${this.name} is not an array: ${value}`)
    }
  }
}
