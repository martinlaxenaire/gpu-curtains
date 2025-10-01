import { BufferElement, BufferElementParams, bytesPerSlot } from './BufferElement'
import { TypedArray } from '../utils'

/**
 * Parameters used to create a {@link BufferArrayElement}.
 */
export interface BufferArrayElementParams extends BufferElementParams {
  /** Initial length of the input {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}. */
  arrayLength: number
}

/**
 * Used to handle specific array {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} types.
 */
export class BufferArrayElement extends BufferElement {
  /** Initial length of the input {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}. */
  arrayLength: number
  /** Total number of elements (i.e. {@link arrayLength} divided by {@link core/bindings/utils.BufferLayout | buffer layout} number of elements. */
  numElements: number
  /** Number of bytes in the {@link ArrayBuffer} between two elements {@link startOffset}. */
  arrayStride: number

  /**
   * BufferArrayElement constructor
   * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}.
   */
  constructor({ name, key, type = 'f32', arrayLength = 1 }: BufferArrayElementParams) {
    super({ name, key, type })

    this.arrayLength = arrayLength
    this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements)
  }

  /**
   * Get the array stride between two elements of the array, in indices.
   * @readonly
   */
  get arrayStrideToIndex(): number {
    return this.arrayStride / bytesPerSlot
  }

  /**
   * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}.
   * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the arrayStride between two array elements. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
   * @param startOffset - Offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
   * @param minStride - Minimum stride to use for the values in the parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}. Uniform buffers array elements have a minimum stride of `16`.
   */
  setAlignment(startOffset = 0, minStride = 0) {
    if (minStride !== 0) {
      startOffset = Math.ceil(startOffset / minStride) * minStride
    }

    super.setAlignment(startOffset)

    const endOffset = minStride !== 0 ? Math.ceil(this.endOffset / minStride) * minStride - 1 : this.endOffset

    // repeat for a second element to know how things are laid out
    const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(endOffset + 1))
    this.arrayStride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end)

    this.alignment.end = this.getPositionAtOffset(this.endOffset + this.arrayStride * (this.numElements - 1))

    if (minStride !== 0) {
      this.alignment.end.byte = Math.max(this.alignment.end.byte, minStride - 1)
    }
  }

  /**
   * Set the strided {@link view} value from an array.
   * @param value - Array to use.
   */
  setValueFromArray(value: number[] | TypedArray) {
    let valueIndex = 0

    const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
    // arrayStride is our view length divided by the number of elements in our array
    const stride = Math.ceil(viewLength / this.numElements)

    for (let i = 0; i < this.numElements; i++) {
      for (let j = 0; j < this.bufferLayout.numElements; j++) {
        this.view[j + i * stride] = value[valueIndex]

        valueIndex++
      }
    }
  }
}
