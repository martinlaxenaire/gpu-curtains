import { getBufferLayout } from '../utils.mjs';
import { throwWarning } from '../../../utils/utils.mjs';

const slotsPerRow = 4;
const bytesPerSlot = 4;
const bytesPerRow = slotsPerRow * bytesPerSlot;
class BufferElement {
  /**
   * BufferElement constructor
   * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}
   */
  constructor({ name, key, type = "f32" }) {
    this.name = name;
    this.key = key;
    this.type = type;
    this.baseType = BufferElement.getBaseType(this.type);
    this.bufferLayout = getBufferLayout(this.baseType);
    this.alignment = {
      start: {
        row: 0,
        byte: 0
      },
      end: {
        row: 0,
        byte: 0
      }
    };
    this.setValue = null;
  }
  /**
   * Get the {@link BufferElement} {@link WGSLVariableType | WGSL type}.
   * @param type - Original type passed.
   * @returns - The {@link BufferElement} {@link WGSLVariableType | WGSL type}.
   */
  static getType(type) {
    return type.replace("array", "").replace("<", "").replace(">", "");
  }
  /**
   * Get the {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
   * @param type - Original type passed.
   * @returns - The {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
   */
  static getBaseType(type) {
    return BufferElement.getType(
      type.replace("atomic", "").replace("array", "").replaceAll("<", "").replaceAll(">", "")
    );
  }
  /**
   * Get the total number of rows used by this {@link BufferElement}
   * @readonly
   */
  get rowCount() {
    return this.alignment.end.row - this.alignment.start.row + 1;
  }
  /**
   * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets
   * @readonly
   */
  get byteCount() {
    return Math.abs(this.endOffset - this.startOffset) + 1;
  }
  /**
   * Get the total number of bytes used by this {@link BufferElement}, including final padding
   * @readonly
   */
  get paddedByteCount() {
    return (this.alignment.end.row + 1) * bytesPerRow;
  }
  /**
   * Get the offset (i.e. byte index) at which our {@link BufferElement} starts
   * @readonly
   */
  get startOffset() {
    return this.getByteCountAtPosition(this.alignment.start);
  }
  /**
   * Get the array offset (i.e. array index) at which our {@link BufferElement} starts
   * @readonly
   */
  get startOffsetToIndex() {
    return this.startOffset / bytesPerSlot;
  }
  /**
   * Get the offset (i.e. byte index) at which our {@link BufferElement} ends
   * @readonly
   */
  get endOffset() {
    return this.getByteCountAtPosition(this.alignment.end);
  }
  /**
   * Get the array offset (i.e. array index) at which our {@link BufferElement} ends
   * @readonly
   */
  get endOffsetToIndex() {
    return Math.floor(this.endOffset / bytesPerSlot);
  }
  /**
   * Get the position at given offset (i.e. byte index)
   * @param offset - byte index to use
   */
  getPositionAtOffset(offset = 0) {
    return {
      row: Math.floor(offset / bytesPerRow),
      byte: offset % bytesPerRow
    };
  }
  /**
   * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}
   * @param position - {@link BufferElementAlignmentPosition | position} from which to count
   * @returns - byte count at the given {@link BufferElementAlignmentPosition | position}
   */
  getByteCountAtPosition(position = { row: 0, byte: 0 }) {
    return position.row * bytesPerRow + position.byte;
  }
  /**
   * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16)
   * @param position - {@link BufferElementAlignmentPosition | position}
   * @returns - updated {@link BufferElementAlignmentPosition | position}
   */
  applyOverflowToPosition(position = { row: 0, byte: 0 }) {
    if (position.byte > bytesPerRow - 1) {
      const overflow = position.byte % bytesPerRow;
      position.row += Math.floor(position.byte / bytesPerRow);
      position.byte = overflow;
    }
    return position;
  }
  /**
   * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}
   * @param p1 - first {@link BufferElementAlignmentPosition | position}
   * @param p2 - second {@link BufferElementAlignmentPosition | position}
   * @returns - number of bytes
   */
  getByteCountBetweenPositions(p1 = { row: 0, byte: 0 }, p2 = { row: 0, byte: 0 }) {
    return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1));
  }
  /**
   * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}
   * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element
   * @returns - computed {@link BufferElementAlignment | alignment}
   */
  getElementAlignment(nextPositionAvailable = { row: 0, byte: 0 }) {
    const alignment = {
      start: nextPositionAvailable,
      end: nextPositionAvailable
    };
    const { size, align } = this.bufferLayout;
    if (nextPositionAvailable.byte % align !== 0) {
      nextPositionAvailable.byte += nextPositionAvailable.byte % align;
    }
    if (size <= bytesPerRow && nextPositionAvailable.byte + size > bytesPerRow) {
      nextPositionAvailable.row += 1;
      nextPositionAvailable.byte = 0;
    } else if (size > bytesPerRow && (nextPositionAvailable.byte > bytesPerRow || nextPositionAvailable.byte > 0)) {
      nextPositionAvailable.row += 1;
      nextPositionAvailable.byte = 0;
    }
    alignment.end = {
      row: nextPositionAvailable.row + Math.ceil(size / bytesPerRow) - 1,
      byte: nextPositionAvailable.byte + (size % bytesPerRow === 0 ? bytesPerRow - 1 : size % bytesPerRow - 1)
      // end of row ? then it ends on slot (bytesPerRow - 1)
    };
    alignment.end = this.applyOverflowToPosition(alignment.end);
    return alignment;
  }
  /**
   * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}
   * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link !core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   */
  setAlignmentFromPosition(position = { row: 0, byte: 0 }) {
    this.alignment = this.getElementAlignment(position);
  }
  /**
   * Set the {@link BufferElementAlignment | alignment} from an offset (byte count)
   * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   */
  setAlignment(startOffset = 0) {
    this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset));
  }
  /**
   * Set the {@link view}
   * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
   */
  setView(arrayBuffer, arrayView) {
    this.view = new this.bufferLayout.View(
      arrayBuffer,
      this.startOffset,
      this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
    );
  }
  /**
   * Set the {@link view} value from a float or an int
   * @param value - float or int to use
   */
  setValueFromNumber(value) {
    this.view[0] = value;
  }
  /**
   * Set the {@link view} value from a {@link Vec2} or an array
   * @param value - {@link Vec2} or array to use
   */
  setValueFromVec2(value) {
    this.view[0] = value.x ?? value[0] ?? 0;
    this.view[1] = value.y ?? value[1] ?? 0;
  }
  /**
   * Set the {@link view} value from a {@link Vec3} or an array
   * @param value - {@link Vec3} or array to use
   */
  setValueFromVec3(value) {
    this.view[0] = value.x ?? value[0] ?? 0;
    this.view[1] = value.y ?? value[1] ?? 0;
    this.view[2] = value.z ?? value[2] ?? 0;
  }
  /**
   * Set the {@link view} value from a {@link Mat4} or {@link Quat}
   * @param value - {@link Mat4} or {@link Quat} to use
   */
  setValueFromMat4OrQuat(value) {
    this.view.set(value.elements);
  }
  /**
   * Set the {@link view} value from a {@link Mat3}
   * @param value - {@link Mat3} to use
   */
  setValueFromMat3(value) {
    this.setValueFromArrayWithPad(value.elements);
  }
  /**
   * Set the {@link view} value from an array
   * @param value - array to use
   */
  setValueFromArray(value) {
    this.view.set(value);
  }
  /**
   * Set the {@link view} value from an array with pad applied
   * @param value - array to use
   */
  setValueFromArrayWithPad(value) {
    for (let i = 0, offset = 0; i < this.view.length; i += this.bufferLayout.pad[0] + this.bufferLayout.pad[1], offset++) {
      for (let j = 0; j < this.bufferLayout.pad[0]; j++) {
        this.view[i + j] = value[i + j - offset];
      }
    }
  }
  /**
   * Update the {@link view} based on the new value
   * @param value - new value to use
   */
  update(value) {
    if (!this.setValue) {
      this.setValue = ((value2) => {
        if (typeof value2 === "number") {
          return this.setValueFromNumber;
        } else if (this.type === "vec2f") {
          return this.setValueFromVec2;
        } else if (this.type === "vec3f") {
          return this.setValueFromVec3;
        } else if (this.type === "mat3x3f") {
          return value2.elements ? this.setValueFromMat3 : this.setValueFromArrayWithPad;
        } else if (value2.elements) {
          return this.setValueFromMat4OrQuat;
        } else if (ArrayBuffer.isView(value2) || Array.isArray(value2)) {
          if (!this.bufferLayout.pad) {
            return this.setValueFromArray;
          } else {
            return this.setValueFromArrayWithPad;
          }
        } else {
          throwWarning(`${this.constructor.name}: value passed to ${this.name} cannot be used: ${value2}`);
        }
      })(value);
    }
    this.setValue(value);
  }
  /**
   * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
   * @param result - {@link Float32Array} holding {@link GPUBuffer} data
   * @returns - extracted data from the {@link Float32Array}
   */
  extractDataFromBufferResult(result) {
    return result.slice(this.startOffsetToIndex, this.endOffsetToIndex);
  }
}

export { BufferElement, bytesPerRow, bytesPerSlot, slotsPerRow };
