import { BufferLayout, getBufferLayout, TypedArray, WGSLVariableType } from '../utils'
import { Vec2 } from '../../../math/Vec2'
import { Vec3 } from '../../../math/Vec3'
import { Quat } from '../../../math/Quat'
import { Mat4 } from '../../../math/Mat4'

// so all our struct need to be packed into our arrayBuffer using a precise layout
// they will be store in rows, each row made of 4 slots, each slots made of 4 bytes
// depending on the binding element type, its row and slot may vary
// and we may have to insert empty padded values
// all in all it looks like that:
//
//       s0     s1     s2     s3
// r0 | ____ | ____ | ____ | ____ |
// r1 | ____ | ____ | ____ | ____ |
// r2 | ____ | ____ | ____ | ____ |
//
// see https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html

export const slotsPerRow = 4
export const bytesPerSlot = 4
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
 * Defines our [buffer element]{@link BufferElement} alignment:
 * Keep track of an entry start and end row and bytes indexes (16 bytes per row)
 */
export interface BufferElementAlignment {
  /** The row and byte indexes at which this [buffer element]{@link BufferElement} starts */
  start: BufferElementAlignmentPosition
  /** The row and byte indexes at which this [buffer element]{@link BufferElement} ends */
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
 * BufferElement class:
 * Used to handle each [buffer binding array]{@link BufferBinding#value} view and data layout alignment.
 * Compute the exact alignment offsets needed to fill an {@link ArrayBuffer} that will be sent to a {@link GPUBuffer}, based on an input type and value.
 * Also update the view array at the correct offset.
 */
export class BufferElement {
  /** The name of the {@link BufferElement} */
  name: string
  /** The WGSL variable type of the {@link BufferElement} */
  type: WGSLVariableType
  /** The key of the {@link BufferElement} */
  key: string

  /** [Buffer layout]{@link BufferLayout} used to fill the [buffer binding array]{@link BufferBinding#value} at the right offsets */
  bufferLayout: BufferLayout

  /**
   * Object defining exactly at which place a binding should be inserted into the {@link BufferBinding#arrayBuffer}
   */
  alignment: BufferElementAlignment

  /** Array containing the {@link BufferElement} values */
  view?: TypedArray

  /**
   * BufferElement constructor
   * @param parameters - [parameters]{@link BufferElementParams} used to create our {@link BufferElement}
   */
  constructor({ name, key, type = 'f32' }: BufferElementParams) {
    this.name = name
    this.key = key
    this.type = type

    this.bufferLayout = getBufferLayout(this.type.replace('array', '').replace('<', '').replace('>', ''))

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
  }

  /**
   * Get the total number of rows used by this {@link BufferElement}
   * @readonly
   */
  get rowCount(): number {
    return this.alignment.end.row - this.alignment.start.row + 1
  }

  /**
   * Get the total number of bytes used by this {@link BufferElement} based on [alignment]{@link BufferElementAlignment} start and end offsets
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
    return this.endOffset / bytesPerSlot
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
   * Get the number of bytes at a given [position]{@link BufferElementAlignmentPosition}
   * @param position - [position]{@link BufferElementAlignmentPosition} from which to count
   * @returns - byte count at the given [position]{@link BufferElementAlignmentPosition}
   */
  getByteCountAtPosition(position: BufferElementAlignmentPosition = { row: 0, byte: 0 }): number {
    return position.row * bytesPerRow + position.byte
  }

  /**
   * Check that a [position byte]{@link BufferElementAlignmentPosition#byte} does not overflow its max value (16)
   * @param position - [position]{@link BufferElementAlignmentPosition} to check
   * @returns - updated [position]{@link BufferElementAlignmentPosition#position}
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
   * Get the number of bytes between two [positions]{@link BufferElementAlignmentPosition}
   * @param p1 - first [position]{@link BufferElementAlignmentPosition}
   * @param p2 - second [position]{@link BufferElementAlignmentPosition}
   * @returns - number of bytes
   */
  getByteCountBetweenPositions(
    p1: BufferElementAlignmentPosition = { row: 0, byte: 0 },
    p2: BufferElementAlignmentPosition = { row: 0, byte: 0 }
  ): number {
    return Math.abs(this.getByteCountAtPosition(p2) - this.getByteCountAtPosition(p1))
  }

  /**
   * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available [position]{@link BufferElementAlignmentPosition}
   * @param nextPositionAvailable - next [position]{@link BufferElementAlignmentPosition} at which we should insert this element
   * @returns - computed [alignment]{@link BufferElementAlignment}
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

    // in the case of a binding that could fit on one row
    // but we don't have space on the current row for this binding element
    // go to next row
    if (size <= bytesPerRow && nextPositionAvailable.byte + size > bytesPerRow) {
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
   * Set the [alignment]{@link BufferElementAlignment} from a [position]{@link BufferElementAlignmentPosition}
   * @param position - [position]{@link BufferElementAlignmentPosition} at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   */
  setAlignmentFromPosition(position: BufferElementAlignmentPosition = { row: 0, byte: 0 }) {
    this.alignment = this.getElementAlignment(position)
  }

  /**
   * Set the [alignment]{@link BufferElementAlignment} from an offset (byte count)
   * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   */
  setAlignment(startOffset = 0) {
    this.setAlignmentFromPosition(this.getPositionAtOffset(startOffset))
  }

  /**
   * Set the [view]{@link BufferElement#view}
   * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
   */
  setView(arrayBuffer: ArrayBuffer, arrayView: DataView) {
    this.view = new this.bufferLayout.View(
      arrayBuffer,
      this.startOffset,
      this.byteCount / this.bufferLayout.View.BYTES_PER_ELEMENT
    )
  }

  /**
   * Update the [view]{@link BufferElement#view} based on the new value
   * @param value - new value to use
   */
  update(value) {
    if (this.type === 'f32' || this.type === 'u32' || this.type === 'i32') {
      this.view[0] = value as number
    } else if (this.type === 'vec2f') {
      this.view[0] = (value as Vec2).x ?? value[0] ?? 0
      this.view[1] = (value as Vec2).y ?? value[1] ?? 0
    } else if (this.type === 'vec3f') {
      this.view[0] = (value as Vec3).x ?? value[0] ?? 0
      this.view[1] = (value as Vec3).y ?? value[1] ?? 0
      this.view[2] = (value as Vec3).z ?? value[2] ?? 0
    } else if ((value as Quat | Mat4).elements) {
      this.view.set((value as Quat | Mat4).elements)
    } else if (ArrayBuffer.isView(value) || Array.isArray(value)) {
      this.view.set(value as number[])
    }
  }

  /**
   * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link BufferBinding}
   * @param result - {@link Float32Array} holding {@link GPUBuffer} data
   * @returns - extracted data from the {@link Float32Array}
   */
  extractDataFromBufferResult(result: Float32Array) {
    return result.slice(this.startOffsetToIndex, this.endOffsetToIndex)
  }
}
