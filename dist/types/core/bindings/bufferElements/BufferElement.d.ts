import { BufferLayout, TypedArray, WGSLVariableType } from '../utils';
export declare const slotsPerRow = 4;
export declare const bytesPerSlot = 4;
export declare const bytesPerRow: number;
/**
 * Defines a position in our array buffer with a row index and a byte index
 */
export interface BufferElementAlignmentPosition {
    /** row index of that position */
    row: number;
    /** byte index of that position */
    byte: number;
}
/**
 * Defines our [buffer element]{@link BufferElement} alignment:
 * Keep track of an entry start and end row and bytes indexes (16 bytes per row)
 */
export interface BufferElementAlignment {
    /** The row and byte indexes at which this [buffer element]{@link BufferElement} starts */
    start: BufferElementAlignmentPosition;
    /** The row and byte indexes at which this [buffer element]{@link BufferElement} ends */
    end: BufferElementAlignmentPosition;
}
/**
 * Parameters used to create a {@link BufferElement}
 */
export interface BufferElementParams {
    /** The name of the {@link BufferElement} */
    name: string;
    /** The key of the {@link BufferElement} */
    key: string;
    /** The WGSL variable type of the {@link BufferElement} */
    type: WGSLVariableType;
}
/**
 * BufferElement class:
 * Used to handle each [buffer binding array]{@link BufferBinding#value} view and data layout alignment.
 * Compute the exact alignment offsets needed to fill an {@link ArrayBuffer} that will be sent to a {@link GPUBuffer}, based on an input type and value.
 * Also update the view array at the correct offset.
 */
export declare class BufferElement {
    /** The name of the {@link BufferElement} */
    name: string;
    /** The WGSL variable type of the {@link BufferElement} */
    type: WGSLVariableType;
    /** The key of the {@link BufferElement} */
    key: string;
    /** [Buffer layout]{@link BufferLayout} used to fill the [buffer binding array]{@link BufferBinding#value} at the right offsets */
    bufferLayout: BufferLayout;
    /**
     * Object defining exactly at which place a binding should be inserted into the {@link BufferBinding#arrayBuffer}
     */
    alignment: BufferElementAlignment;
    /** Array containing the {@link BufferElement} values */
    view?: TypedArray;
    /**
     * BufferElement constructor
     * @param parameters - [parameters]{@link BufferElementParams} used to create our {@link BufferElement}
     */
    constructor({ name, key, type }: BufferElementParams);
    /**
     * Get the total number of rows used by this {@link BufferElement}
     * @readonly
     */
    get rowCount(): number;
    /**
     * Get the total number of bytes used by this {@link BufferElement} based on [alignment]{@link BufferElementAlignment} start and end offsets
     * @readonly
     */
    get byteCount(): number;
    /**
     * Get the total number of bytes used by this {@link BufferElement}, including final padding
     * @readonly
     */
    get paddedByteCount(): number;
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} starts
     * @readonly
     */
    get startOffset(): number;
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} starts
     * @readonly
     */
    get startOffsetToIndex(): number;
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffset(): number;
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffsetToIndex(): number;
    /**
     * Get the position at given offset (i.e. byte index)
     * @param offset - byte index to use
     */
    getPositionAtOffset(offset?: number): BufferElementAlignmentPosition;
    /**
     * Get the number of bytes at a given [position]{@link BufferElementAlignmentPosition}
     * @param position - [position]{@link BufferElementAlignmentPosition} from which to count
     * @returns - byte count at the given [position]{@link BufferElementAlignmentPosition}
     */
    getByteCountAtPosition(position?: BufferElementAlignmentPosition): number;
    /**
     * Check that a [position byte]{@link BufferElementAlignmentPosition#byte} does not overflow its max value (16)
     * @param position - [position]{@link BufferElementAlignmentPosition} to check
     * @returns - updated [position]{@link BufferElementAlignmentPosition#
     */
    applyOverflowToPosition(position?: BufferElementAlignmentPosition): BufferElementAlignmentPosition;
    /**
     * Get the number of bytes between two [positions]{@link BufferElementAlignmentPosition}
     * @param p1 - first [position]{@link BufferElementAlignmentPosition}
     * @param p2 - second [position]{@link BufferElementAlignmentPosition}
     * @returns - number of bytes
     */
    getByteCountBetweenPositions(p1?: BufferElementAlignmentPosition, p2?: BufferElementAlignmentPosition): number;
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available [position]{@link BufferElementAlignmentPosition}
     * @param nextPositionAvailable - next [position]{@link BufferElementAlignmentPosition} at which we should insert this element
     * @returns - computed [alignment]{@link BufferElementAlignment}
     */
    getElementAlignment(nextPositionAvailable?: BufferElementAlignmentPosition): BufferElementAlignment;
    /**
     * Set the [alignment]{@link BufferElementAlignment} from a [position]{@link BufferElementAlignmentPosition}
     * @param position - [position]{@link BufferElementAlignmentPosition} at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignmentFromPosition(position?: BufferElementAlignmentPosition): void;
    /**
     * Set the [alignment]{@link BufferElementAlignment} from an offset (byte count)
     * @param startOffset - offset at which to start inserting the values in the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     */
    setAlignment(startOffset?: number): void;
    /**
     * Set the [view]{@link BufferElement#view}
     * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the [view]{@link BufferElement#view} based on the new value
     * @param value - new value to use
     */
    update(value: any): void;
}
