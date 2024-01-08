import { BufferLayout, TypedArray, WGSLVariableType } from '../utils';
/** Number of slots per row */
export declare const slotsPerRow = 4;
/** Number of bytes per slot */
export declare const bytesPerSlot = 4;
/** Number of bytes per row */
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
 * Defines our {@link BufferElement} alignment:
 * Keep track of an entry start and end row and bytes indexes (16 bytes per row)
 */
export interface BufferElementAlignment {
    /** The row and byte indexes at which this {@link BufferElement} starts */
    start: BufferElementAlignmentPosition;
    /** The row and byte indexes at which this {@link BufferElement} ends */
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
 * Used to handle each {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} view and data layout alignment.
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
    /** {@link BufferLayout} used to fill the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array} at the right offsets */
    bufferLayout: BufferLayout;
    /**
     * Object defining exactly at which place a binding should be inserted into the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     */
    alignment: BufferElementAlignment;
    /** Array containing the {@link BufferElement} values */
    view?: TypedArray;
    /**
     * BufferElement constructor
     * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}
     */
    constructor({ name, key, type }: BufferElementParams);
    /**
     * Get the total number of rows used by this {@link BufferElement}
     * @readonly
     */
    get rowCount(): number;
    /**
     * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets
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
     * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}
     * @param position - {@link BufferElementAlignmentPosition | position} from which to count
     * @returns - byte count at the given {@link BufferElementAlignmentPosition | position}
     */
    getByteCountAtPosition(position?: BufferElementAlignmentPosition): number;
    /**
     * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16)
     * @param position - {@link BufferElementAlignmentPosition | position}
     * @returns - updated {@link BufferElementAlignmentPosition | position}
     */
    applyOverflowToPosition(position?: BufferElementAlignmentPosition): BufferElementAlignmentPosition;
    /**
     * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}
     * @param p1 - first {@link BufferElementAlignmentPosition | position}
     * @param p2 - second {@link BufferElementAlignmentPosition | position}
     * @returns - number of bytes
     */
    getByteCountBetweenPositions(p1?: BufferElementAlignmentPosition, p2?: BufferElementAlignmentPosition): number;
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}
     * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element
     * @returns - computed {@link BufferElementAlignment | alignment}
     */
    getElementAlignment(nextPositionAvailable?: BufferElementAlignmentPosition): BufferElementAlignment;
    /**
     * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}
     * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link !core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     */
    setAlignmentFromPosition(position?: BufferElementAlignmentPosition): void;
    /**
     * Set the {@link BufferElementAlignment | alignment} from an offset (byte count)
     * @param startOffset - offset at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     */
    setAlignment(startOffset?: number): void;
    /**
     * Set the {@link view}
     * @param arrayBuffer - the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | buffer binding array}
     * @param arrayView - the {@link core/bindings/BufferBinding.BufferBinding#arrayView | buffer binding array view}
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the {@link view} based on the new value
     * @param value - new value to use
     */
    update(value: any): void;
    /**
     * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parent {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data
     * @returns - extracted data from the {@link Float32Array}
     */
    extractDataFromBufferResult(result: Float32Array): Float32Array;
}
