import { BufferLayout, getBufferLayout, TypedArray, WGSLVariableType } from '../utils'
import { InputValue } from '../../../types/BindGroups'
import { Vec2 } from '../../../math/Vec2'
import { Vec3 } from '../../../math/Vec3'
import { Quat } from '../../../math/Quat'
import { Mat4 } from '../../../math/Mat4'

export const slotsPerRow = 4
export const bytesPerSlot = 4
export const bytesPerRow = slotsPerRow * bytesPerSlot

/**
 * Defines an [alignment entry]{@link BufferElementAlignment#entries}:
 * Keep track of an entry row start and end indexes (4 slots per row) and slot start and end indexes (4 bytes per slot)
 */
export interface BufferElementAlignmentEntry {
  /** Defines precisely which alignment rows that {@link BufferElement} use */
  row: {
    /** Index of the row at which this {@link BufferElement} begins */
    start: number
    /** Index of the row at which this {@link BufferElement} ends */
    end: number
  }
  /** Defines precisely which slots that {@link BufferElement} use inside the rows */
  slot: {
    /** Index of the slot at which this {@link BufferElement} begins */
    start: number
    /** Index of the slot at which this {@link BufferElement} ends */
    end: number
  }
}

/**
 * Object defining exactly at which place a binding should be inserted into the {@link BufferBinding#arrayBuffer}
 */
export interface BufferElementAlignment {
  /** Start offset at which to insert this {@link BufferElement} into the {@link BufferBinding#arrayBuffer}. Must later be multiplied by the number of bytes per slot (4) */
  startOffset: number
  /** Array of [alignment entries]{@link BufferElementAlignmentEntry}. Usually only one entry is used, except for array buffer elements */
  entries: BufferElementAlignmentEntry[]
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
  /** Callback used to fill the [buffer binding array]{@link BufferBinding#value} with the [array values]{@link BufferElement#array} */
  /** Original [input value]{@link InputValue} used to create this {@link BufferElement} */
  value: InputValue

  // TODO
  computeAlignment: boolean
}

// TODO we should correctly use types like GPUSize64 / GPUIndex32
/**
 * BufferElement class:
 * Used to handle each binding array view and data layout alignment.
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

  // TODO
  computeAlignment: boolean

  /** Whether this {@link BufferElement} [type]{@link BufferElement#type} is an array or not */
  isArray: boolean

  /** Length of the [input value]{@link BufferElementParams#value} if it's an array, 1 else. Useful to know how many times we'll have to loop to compute the correct alignment */
  inputLength: number

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
  constructor({ name, key, type = 'f32', value, computeAlignment = true }: BufferElementParams) {
    this.name = name
    this.key = key
    this.type = type
    this.computeAlignment = computeAlignment

    this.isArray = this.type.indexOf('array') !== -1 && (Array.isArray(value) || ArrayBuffer.isView(value))

    this.bufferLayout = getBufferLayout(
      this.isArray ? this.type.replace('array', '').replace('<', '').replace('>', '') : this.type
    )

    this.inputLength = this.isArray ? (value as number[]).length / this.bufferLayout.numElements : 1

    // so all our bindings need to be packed into our arrayBuffer using a precise layout
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
    this.alignment = {
      startOffset: 0,
      entries: [],
    }
  }

  /**
   * Get the offset (i.e. slot index) at which our {@link BufferElement} ends
   * @readonly
   */
  get endOffset(): number {
    return Math.ceil(this.alignment.startOffset + this.bufferLayout.size / bytesPerSlot)
  }

  /**
   * Get the total number of rows used by this {@link BufferElement}
   * @readonly
   */
  get rowCount(): number {
    return this.alignment.entries.length
      ? this.alignment.entries[this.alignment.entries.length - 1].row.end + 1
      : this.alignment.startOffset / slotsPerRow + Math.ceil(this.bufferLayout.size / bytesPerRow) + 1
  }

  /**
   * Get the total number of slots used by this {@link BufferElement}
   * @readonly
   */
  get slotCount(): number {
    return this.rowCount * bytesPerRow
  }

  /**
   * Compute the right alignment (i.e. start and end rows and slots) given the size and align properties and the next available slot
   * @param nextSlotAvailable - next slot at which we should insert this entry
   * @returns - computed [alignment]{@link BufferElementAlignment}
   */
  getElementAlignment(nextSlotAvailable = { startOffset: 0, row: 0, slot: 0 }): BufferElementAlignment {
    const { size, align } = this.bufferLayout

    // check the alignment, i.e. even if there's enough space for our binding
    // we might have to pad the slot because some types need a specific alignment
    if (nextSlotAvailable.slot % align !== 0) {
      nextSlotAvailable.startOffset += (nextSlotAvailable.slot % align) / bytesPerSlot
      nextSlotAvailable.slot += nextSlotAvailable.slot % align
    }

    // in the case of a binding that could fit on one row
    // but we don't have space on the current row for this binding element
    // go to next row
    if (size <= bytesPerRow && nextSlotAvailable.slot + size > bytesPerRow) {
      nextSlotAvailable.row += 1
      nextSlotAvailable.slot = 0
      nextSlotAvailable.startOffset = nextSlotAvailable.row * 4
    }

    const alignment = {
      startOffset: nextSlotAvailable.startOffset,
      entries: [
        {
          row: {
            start: nextSlotAvailable.row,
            end: nextSlotAvailable.row + Math.ceil(size / bytesPerRow) - 1,
          },
          slot: {
            start: nextSlotAvailable.slot,
            end: nextSlotAvailable.slot + (size % bytesPerRow === 0 ? bytesPerRow - 1 : (size % bytesPerRow) - 1), // end of row ? then it ends on slot (bytesPerRow - 1)
          },
        },
      ],
    }

    // now final check, if end slot has overflown
    if (alignment.entries[0].slot.end > bytesPerRow - 1) {
      const overflow = alignment.entries[0].slot.end % bytesPerRow
      alignment.entries[0].row.end += Math.ceil(overflow / bytesPerRow)
      alignment.entries[0].slot.end = overflow
    }

    return alignment
  }

  /**
   * Set the [alignment entries]{@link BufferElementAlignment#entries}
   * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   */
  setAlignment(startOffset = 0) {
    const { numElements } = this.bufferLayout

    // then, the next available slot
    const nextSlotAvailable = {
      startOffset,
      row: Math.floor(startOffset / slotsPerRow),
      slot: (startOffset * bytesPerSlot) % bytesPerRow,
    }

    const alignment = this.getElementAlignment(nextSlotAvailable)

    if (!this.computeAlignment) {
      this.alignment = alignment

      // TODO
      this.alignment.entries[this.inputLength - 1] = { ...this.alignment.entries[0] }
      this.alignment.entries[this.inputLength - 1].row.end = this.inputLength - 1 + startOffset

      return
    }

    // if our binding is an array, we are going to repeat the alignment computation process
    if (this.inputLength > 1) {
      let tempAlignment = alignment
      for (let i = 0; i < this.inputLength - 1; i++) {
        const arrayStartOffset =
          tempAlignment.entries[0].row.start * slotsPerRow +
          tempAlignment.entries[0].slot.start / bytesPerSlot +
          numElements

        const nextArraySlotAvailable = {
          startOffset: arrayStartOffset,
          row: Math.floor(arrayStartOffset / slotsPerRow),
          slot: (arrayStartOffset * bytesPerSlot) % bytesPerRow,
        }

        tempAlignment = this.getElementAlignment(nextArraySlotAvailable)

        alignment.entries.push(tempAlignment.entries[0])
      }
    }

    this.alignment = alignment
  }

  /**
   * Set the [view]{@link BufferElement#view}
   * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
   * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
   */
  setView(arrayBuffer: ArrayBuffer, arrayView: DataView) {
    this.view = new this.bufferLayout.View(
      arrayBuffer,
      this.alignment.startOffset * bytesPerSlot, // 4 bytes per row slots
      this.bufferLayout.numElements * this.alignment.entries.length
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
      if (this.isArray) {
        let valueIndex = 0
        this.alignment.entries.forEach((entry, entryIndex) => {
          // respect the padding, so fill only view entries needed and leave empty padded values if needed
          const entryStartOffset = entry.row.start * slotsPerRow + entry.slot.start / bytesPerSlot
          const entryEndOffset = entry.row.end * slotsPerRow + Math.ceil(entry.slot.end / bytesPerSlot)

          for (let i = 0; i < this.bufferLayout.numElements; i++) {
            if (i < entryEndOffset - entryStartOffset) {
              this.view[i + entryIndex * this.bufferLayout.numElements] = value[valueIndex]
            }

            valueIndex++
          }
        })
      } else {
        for (let i = 0; i < this.view.length; i++) {
          this.view[i] = value[i] ? value[i] : 0
        }
      }
    }
  }
}
