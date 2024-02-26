import { BufferElement, bytesPerSlot } from './BufferElement.mjs';
import { throwWarning } from '../../../utils/utils.mjs';

class BufferArrayElement extends BufferElement {
  /**
   * BufferArrayElement constructor
   * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferArrayElement}
   */
  constructor({ name, key, type = "f32", arrayLength = 1 }) {
    super({ name, key, type });
    this.arrayLength = arrayLength;
    this.numElements = this.arrayLength / this.bufferLayout.numElements;
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
   * Update the {@link view} based on the new value
   * @param value - new value to use
   */
  update(value) {
    if (ArrayBuffer.isView(value) || Array.isArray(value)) {
      let valueIndex = 0;
      const viewLength = this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT;
      const stride = Math.ceil(viewLength / this.numElements);
      for (let i = 0; i < this.numElements; i++) {
        for (let j = 0; j < this.bufferLayout.numElements; j++) {
          this.view[j + i * stride] = value[valueIndex];
          valueIndex++;
        }
      }
    } else {
      throwWarning(`BufferArrayElement: value passed to ${this.name} is not an array: ${value}`);
    }
  }
}

export { BufferArrayElement };
