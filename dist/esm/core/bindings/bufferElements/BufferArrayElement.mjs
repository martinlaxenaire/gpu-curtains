import { BufferElement, bytesPerRow, bytesPerSlot } from './BufferElement.mjs';

class BufferArrayElement extends BufferElement {
  /**
   * BufferArrayElement constructor
   * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}
   */
  constructor({ name, key, type = "f32", arrayLength = 1 }) {
    super({ name, key, type });
    this.arrayLength = arrayLength;
    this.numElements = Math.ceil(this.arrayLength / this.bufferLayout.numElements);
  }
  /**
   * Get the total number of bytes used by this {@link BufferArrayElement} based on {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment} start and end offsets
   * @readonly
   */
  get byteCount() {
    const byteCount = super.byteCount;
    const endPad = byteCount % bytesPerRow;
    return byteCount + (endPad === 0 ? 0 : bytesPerRow - endPad);
  }
  /**
   * Get the array stride between two elements of the array, in indices
   * @readonly
   */
  get arrayStrideToIndex() {
    return this.arrayStride / bytesPerSlot;
  }
  /**
   * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
   * To compute how arrays are packed, we get the second item alignment as well and use it to calculate the arrayStride between two array elements. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
   * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array buffer}
   */
  setAlignment(startOffset = 0) {
    super.setAlignment(startOffset);
    const nextAlignment = this.getElementAlignment(this.getPositionAtOffset(this.endOffset + 1));
    this.arrayStride = this.getByteCountBetweenPositions(this.alignment.end, nextAlignment.end);
    this.alignment.end = this.getPositionAtOffset(this.endOffset + this.arrayStride * (this.numElements - 1));
  }
  /**
   * Set the strided {@link view} value from an array
   * @param value - array to use
   */
  setValueFromArray(value) {
    let valueIndex = 0;
    const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT;
    const stride = Math.ceil(viewLength / this.numElements);
    for (let i = 0; i < this.numElements; i++) {
      for (let j = 0; j < this.bufferLayout.numElements; j++) {
        this.view[j + i * stride] = value[valueIndex];
        valueIndex++;
      }
    }
  }
}

export { BufferArrayElement };
