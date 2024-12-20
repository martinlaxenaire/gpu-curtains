import { BufferLayout, getBufferLayout, TypedArray, WGSLBaseVariableType, WGSLVariableType } from '../utils'
import { Vec2 } from '../../../math/Vec2'
import { Vec3 } from '../../../math/Vec3'
import { Quat } from '../../../math/Quat'
import { Mat4 } from '../../../math/Mat4'
import { throwWarning } from '../../../utils/utils'
import { Mat3 } from '../../../math/Mat3'
import { InputValue } from '../../../types/BindGroups'

/** Number of slots per row */
export const slotsPerRow = 4
/** Number of bytes per slot */
export const bytesPerSlot = 4
/** Number of bytes per row */
export const bytesPerRow = slotsPerRow * bytesPerSlot

/**
 * Defines a position in our array buffer with a row index and a byte index
 */
export interface BufferElementAlignmentPosition {
  /** row index of that position */
  row: number
  /** byte index of that position */
  byte: number
}

/**
 * Defines our {@link BufferElement} alignment:
 * Keep track of an entry start and end row and bytes indexes (16 bytes per row)
 */
export interface BufferElementAlignment {
  /** The row and byte indexes at which this {@link BufferElement} starts */
  start: BufferElementAlignmentPosition
  /** The row and byte indexes at which this {@link BufferElement} ends */
  end: BufferElementAlignmentPosition
}

/**
 * Parameters used to create a {@link BufferElement}
 */
export interface BufferElementParams {
  /** The name of the {@link BufferElement} */
  name: string
  /** The key of the {@link BufferElement} */
  key: string
  /** The WGSL variable type of the {@link BufferElement} */
  type: WGSLVariableType
}

/**
 * Used to handle each {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} view and data layout alignment.
 * Compute the exact alignment offsets needed to fill an {@link ArrayBuffer} that will be sent to a {@link GPUBuffer}, based on an input type and value.
 * Also update the view array at the correct offset.
 *
 * So all our struct need to be packed into our arrayBuffer using a precise layout.
 * They will be stored in rows, each row made of 4 slots and each slots made of 4 bytes. Depending on the binding element type, its row and slot may vary and we may have to insert empty padded values.
 * All in all it looks like that:<br>
 * <pre>
 *          slot 0    slot 1    slot 2    slot 3
 * row 0 | _ _ _ _ | _ _ _ _ | _ _ _ _ | _ _ _ _ |
 * row 1 | _ _ _ _ | _ _ _ _ | _ _ _ _ | _ _ _ _ |
 * row 2 | _ _ _ _ | _ _ _ _ | _ _ _ _ | _ _ _ _ |
 * </pre>
 * see https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html
 */
export class BufferElement {
  /** The name of the {@link BufferElement} */
  name: string
  /** The WGSL variable type of the {@link BufferElement} (stripped of `array`). */
  type: WGSLVariableType
  /** The WGSL base variable type of the {@link BufferElement} (stripped of `array` and `atomic`). */
  baseType: WGSLBaseVariableType
  /** The key of the {@link BufferElement} */
  key: string

  /** {@link BufferLayout} used to fill the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} at the right offsets */
  bufferLayout: BufferLayout

  /**
   * Object defining exactly at which place a binding should be inserted into the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   */
  alignment: BufferElementAlignment

  /** Array containing the {@link BufferElement} values */
  view?: TypedArray

  /** Function assigned to set the {@link view} values */
  setValue: (value: InputValue) => void | null

  /**
   * BufferElement constructor
   * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}
   */
  constructor({ name, key, type = 'f32' }: BufferElementParams) {
    this.name = name
    this.key = key
    this.type = type

    this.baseType = BufferElement.getBaseType(this.type)

    this.bufferLayout = getBufferLayout(this.baseType)

    // set init alignment
    this.alignment = {
      start: {
        row: 0,
        byte: 0,
      },
      end: {
        row: 0,
        byte: 0,
      },
    }

    this.setValue = null
  }

  /**
   * Get the {@link BufferElement} {@link WGSLVariableType | WGSL type}.
   * @param type - Original type passed.
   * @returns - The {@link BufferElement} {@link WGSLVariableType | WGSL type}.
   */
  static getType(type: string): WGSLVariableType {
    return type.replace('array', '').replace('<', '').replace('>', '')
  }

  /**
   * Get the {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
   * @param type - Original type passed.
   * @returns - The {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
   */
  static getBaseType(type: string): WGSLBaseVariableType {
    return BufferElement.getType(
      type.replace('atomic', '').replace('array', '').replaceAll('<', '').replaceAll('>', '')
    )
  }

  /**
   * Get the total number of rows used by this {@link BufferElement}
   * @readonly
   */
  get rowCount(): number {
    return this.alignment.end.row - this.alignment.start.row + 1
  }

  /**
   * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets
   * @readonly
   */
  get byteCount(): number {
    return Math.abs(this.endOffset - this.startOffset) + 1
  }

  /**
   * Get the total number of bytes used by this {@link BufferElement}, including final padding
   * @readonly
   */
  get paddedByteCount(): number {
    return (this.alignment.end.row + 1) * bytesPerRow
  }

  /**
   * Get the offset (i.e. byte index) at which our {@link BufferElement} starts
   * @readonly
   */
  get startOffset(): number {
    return this.getByteCountAtPosition(this.alignment.start)
  }

  /**
   * Get the array offset (i.e. array index) at which our {@link BufferElement} starts
   * @readonly
   */
  get startOffsetToIndex(): number {
    return this.startOffset / bytesPerSlot
  }

  /**
   * Get the offset (i.e. byte index) at which our {@link BufferElement} ends
   * @readonly
   */
  get endOffset(): number {
    return this.getByteCountAtPosition(this.alignment.end)
  }

  /**
   * Get the array offset (i.e. array index) at which our {@link BufferElement} ends
   * @readonly
   */
  get endOffsetToIndex(): number {
    return Math.floor(this.endOffset / bytesPerSlot)
  }

  /**
   * Get the position at given offset (i.e. byte index)
   * @param offset - byte index to use
   */
  getPositionAtOffset(offset = 0): BufferElementAlignmentPosition {
    return {
      row: Math.floor(offset / bytesPerRow),
      byte: offset % bytesPerRow,
    }
  }

  /**
   * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}
   * @param position - {@link BufferElementAlignmentPosition | position} from which to count
   * @returns - byte count at the given {@link BufferElementAlignmentPosition | position}
   */
  getByteCountAtPosition(position: BufferElementAlignmentPosition = { row: 0, byte: 0 }): number {
    return position.row * bytesPerRow + position.byte
  }

  /**
   * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16)
   * @param position - {@link BufferElementAlignmentPosition | position}
   * @returns - updated {@link BufferElementAlignmentPosition | position}
   */
  applyOverflowToPosition(
    position: BufferElementAlignmentPosition = { row: 0, byte: 0 }
  ): BufferElementAlignmentPosition {
    if (position.byte > bytesPerRow - 1) {
      const overflow = position.byte % bytesPerRow
      position.row += Math.floor(position.byte / bytesPerRow)
      position.byte = overflow
    }

    return position
  }

  /**
   * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}
   * @param p1 - first {@link BufferElementAlignmentPosition | position}
   * @param p2 - second {@link BufferElementAlignmentPosition | position}
   * @returns - number of bytes
   */
  getByteCountBetweenPositions(
    p1: BufferElementAlignmentPosition = { row: 0, byte: 0 },
    p2: BufferElementAlignmentPosition = { row: 0, byte: 0 }
  ): number {
    return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1))
  }

  /**
   * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}
   * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element
   * @returns - computed {@link BufferElementAlignment | alignment}
   */
  getElementAlignment(
    nextPositionAvailable: BufferElementAlignmentPosition = { row: 0, byte: 0 }
  ): BufferElementAlignment {
    const alignment = {
      start: nextPositionAvailable,
      end: nextPositionAvailable,
    }

    const { size, align } = this.bufferLayout

    // check the alignment, i.e. even if there's enough space for our binding
    // we might have to pad the slot because some types need a specific alignment
    if (nextPositionAvailable.byte % align !== 0) {
      nextPositionAvailable.byte += nextPositionAvailable.byte % align
    }

    if (size <= bytesPerRow && nextPositionAvailable.byte + size > bytesPerRow) {
      // in the case of a binding that could fit on one row
      // but we don't have space on the current row for this binding element
      // go to next row
      nextPositionAvailable.row += 1
      nextPositionAvailable.byte = 0
    } else if (size > bytesPerRow && (nextPositionAvailable.byte > bytesPerRow || nextPositionAvailable.byte > 0)) {
      // there's also the case where the binding size is too big
      // and we have already padded it above
      // or we've just started a new row
      // but the binding size is too big to fit in one row
      // just go to next row as well
      nextPositionAvailable.row += 1
      nextPositionAvailable.byte = 0
    }

    alignment.end = {
      row: nextPositionAvailable.row + Math.ceil(size / bytesPerRow) - 1,
      byte: nextPositionAvailable.byte + (size % bytesPerRow === 0 ? bytesPerRow - 1 : (size % bytesPerRow) - 1), // end of row ? then it ends on slot (bytesPerRow - 1)
    }

    // now final check, if end slot has overflown
    alignment.end = this.applyOverflowToPosition(alignment.end)

    return alignment
  }

  /**
   * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}
   * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link !core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   */
  setAlignmentFromPosition(position: BufferElementAlignmentPosition = { row: 0, byte: 0 }) {
    this.alignment = this.getElementAlignment(position)
  }

  /**
   * Set the {@link BufferElementAlignment | alignment} from an offset (byte count)
   * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   */
  setAlignment(startOffset = 0) {
    this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset))
  }

  /**
   * Set the {@link view}
   * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
   * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
   */
  setView(arrayBuffer: ArrayBuffer, arrayView: DataView) {
    this.view = new this.bufferLayout.View(
      arrayBuffer,
      this.startOffset,
      this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
    )
  }

  /**
   * Set the {@link view} value from a float or an int
   * @param value - float or int to use
   */
  setValueFromNumber(value: number) {
    this.view[0] = value as number
  }

  /**
   * Set the {@link view} value from a {@link Vec2} or an array
   * @param value - {@link Vec2} or array to use
   */
  setValueFromVec2(value: Vec2 | number[]) {
    this.view[0] = (value as Vec2).x ?? value[0] ?? 0
    this.view[1] = (value as Vec2).y ?? value[1] ?? 0
  }

  /**
   * Set the {@link view} value from a {@link Vec3} or an array
   * @param value - {@link Vec3} or array to use
   */
  setValueFromVec3(value: Vec3 | number[]) {
    this.view[0] = (value as Vec3).x ?? value[0] ?? 0
    this.view[1] = (value as Vec3).y ?? value[1] ?? 0
    this.view[2] = (value as Vec3).z ?? value[2] ?? 0
  }

  /**
   * Set the {@link view} value from a {@link Mat4} or {@link Quat}
   * @param value - {@link Mat4} or {@link Quat} to use
   */
  setValueFromMat4OrQuat(value: Mat4 | Quat) {
    this.view.set(value.elements)
  }

  /**
   * Set the {@link view} value from a {@link Mat3}
   * @param value - {@link Mat3} to use
   */
  setValueFromMat3(value: Mat3) {
    // mat3x3f are padded!
    this.setValueFromArrayWithPad(value.elements)
  }

  /**
   * Set the {@link view} value from an array
   * @param value - array to use
   */
  setValueFromArray(value: number[] | TypedArray) {
    this.view.set(value as number[] | TypedArray)
  }

  /**
   * Set the {@link view} value from an array with pad applied
   * @param value - array to use
   */
  setValueFromArrayWithPad(value: number[] | TypedArray) {
    for (
      let i = 0, offset = 0;
      i < this.view.length;
      i += this.bufferLayout.pad[0] + this.bufferLayout.pad[1], offset++
    ) {
      for (let j = 0; j < this.bufferLayout.pad[0]; j++) {
        this.view[i + j] = value[i + j - offset]
      }
    }
  }

  /**
   * Update the {@link view} based on the new value
   * @param value - new value to use
   */
  update(value: InputValue) {
    if (!this.setValue) {
      this.setValue = ((value) => {
        if (typeof value === 'number') {
          return this.setValueFromNumber
        } else if (this.type === 'vec2f') {
          return this.setValueFromVec2
        } else if (this.type === 'vec3f') {
          return this.setValueFromVec3
        } else if (this.type === 'mat3x3f') {
          return (value as Mat3).elements ? this.setValueFromMat3 : this.setValueFromArrayWithPad
        } else if ((value as Quat | Mat4).elements) {
          return this.setValueFromMat4OrQuat
        } else if (ArrayBuffer.isView(value) || Array.isArray(value)) {
          if (!this.bufferLayout.pad) {
            return this.setValueFromArray
          } else {
            return this.setValueFromArrayWithPad
          }
        } else {
          throwWarning(`${this.constructor.name}: value passed to ${this.name} cannot be used: ${value}`)
        }
      })(value)
    }

    this.setValue(value)
  }

  /**
   * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
   * @param result - {@link Float32Array} holding {@link GPUBuffer} data
   * @returns - extracted data from the {@link Float32Array}
   */
  extractDataFromBufferResult(result: Float32Array) {
    return result.slice(this.startOffsetToIndex, this.endOffsetToIndex)
  }
}
