import { BufferArrayElement } from './BufferArrayElement.mjs';

class BufferInterleavedArrayElement extends BufferArrayElement {
  /**
   * BufferInterleavedArrayElement constructor
   * @param parameters - {@link BufferArrayElementParams | parameters} used to create our {@link BufferInterleavedArrayElement}
   */
  constructor({ name, key, type = "f32", arrayLength = 1 }) {
    super({ name, key, type, arrayLength });
    this.arrayStride = 1;
    this.arrayLength = arrayLength;
    this.numElements = this.arrayLength / this.bufferLayout.numElements;
  }
  /**
   * Get the total number of slots used by this {@link BufferInterleavedArrayElement} based on buffer layout size and total number of elements
   * @readonly
   */
  get byteCount() {
    return this.bufferLayout.size * this.numElements;
  }
  /**
   * Set the {@link core/bindings/bufferElements/BufferElement.BufferElementAlignment | alignment}
   * To compute how arrays are packed, we need to compute the arrayStride between two elements beforehand and pass it here. Using the arrayStride and the total number of elements, we can easily get the end alignment position.
   * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   * @param stride - Stride in the {@link ArrayBuffer} between two elements of the array
   */
  setAlignment(startOffset = 0, stride = 0) {
    this.alignment = this.getElementAlignment(this.getPositionAtOffset(startOffset));
    this.arrayStride = stride;
    this.alignment.end = this.getPositionAtOffset(this.endOffset + stride * (this.numElements - 1));
  }
  /**
   * Set the {@link view} and {@link viewSetFunction}
   * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
   */
  setView(arrayBuffer, arrayView) {
    this.view = new this.bufferLayout.View(this.bufferLayout.numElements * this.numElements);
    this.viewSetFunction = ((arrayView2) => {
      switch (this.bufferLayout.View) {
        case Int32Array:
          return arrayView2.setInt32.bind(arrayView2);
        case Uint16Array:
          return arrayView2.setUint16.bind(arrayView2);
        case Uint32Array:
          return arrayView2.setUint32.bind(arrayView2);
        case Float32Array:
        default:
          return arrayView2.setFloat32.bind(arrayView2);
      }
    })(arrayView);
  }
  /**
   * Update the {@link view} based on the new value, and then update the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view} using sub arrays
   * @param value - new value to use
   */
  update(value) {
    super.update(value);
    for (let i = 0; i < this.numElements; i++) {
      const subarray = this.view.subarray(
        i * this.bufferLayout.numElements,
        i * this.bufferLayout.numElements + this.bufferLayout.numElements
      );
      const startByteOffset = this.startOffset + i * this.arrayStride;
      subarray.forEach((value2, index) => {
        this.viewSetFunction(startByteOffset + index * this.bufferLayout.View.BYTES_PER_ELEMENT, value2, true);
      });
    }
  }
  /**
   * Extract the data corresponding to this specific {@link BufferInterleavedArrayElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
   * @param result - {@link Float32Array} holding {@link GPUBuffer} data
   */
  extractDataFromBufferResult(result) {
    const interleavedResult = new Float32Array(this.arrayLength);
    for (let i = 0; i < this.numElements; i++) {
      const resultOffset = this.startOffsetToIndex + i * this.arrayStrideToIndex;
      for (let j = 0; j < this.bufferLayout.numElements; j++) {
        interleavedResult[i * this.bufferLayout.numElements + j] = result[resultOffset + j];
      }
    }
    return interleavedResult;
  }
}

export { BufferInterleavedArrayElement };
