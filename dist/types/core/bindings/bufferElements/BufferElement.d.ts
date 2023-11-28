import { BufferLayout, TypedArray, WGSLVariableType } from '../utils';
import { InputValue } from '../../../types/BindGroups';
export declare const slotsPerRow = 4;
export declare const bytesPerSlot = 4;
export declare const bytesPerRow: number;
/**
 * Defines an [alignment entry]{@link BufferElementAlignment#entries}:
 * Keep track of an entry row start and end indexes (4 slots per row) and slot start and end indexes (4 bytes per slot)
 */
export interface BufferElementAlignmentEntry {
    /** Defines precisely which alignment rows that {@link BufferElement} use */
    row: {
        /** Index of the row at which this {@link BufferElement} begins */
        start: number;
        /** Index of the row at which this {@link BufferElement} ends */
        end: number;
    };
    /** Defines precisely which slots that {@link BufferElement} use inside the rows */
    slot: {
        /** Index of the slot at which this {@link BufferElement} begins */
        start: number;
        /** Index of the slot at which this {@link BufferElement} ends */
        end: number;
    };
}
/**
 * Object defining exactly at which place a binding should be inserted into the {@link BufferBinding#arrayBuffer}
 */
export interface BufferElementAlignment {
    /** Start offset at which to insert this {@link BufferElement} into the {@link BufferBinding#arrayBuffer}. Must later be multiplied by the number of bytes per slot (4) */
    startOffset: number;
    /** Array of [alignment entries]{@link BufferElementAlignmentEntry}. Usually only one entry is used, except for array buffer elements */
    entries: BufferElementAlignmentEntry[];
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
    /** Callback used to fill the [buffer binding array]{@link BufferBinding#value} with the [array values]{@link BufferElement#array} */
    /** Original [input value]{@link InputValue} used to create this {@link BufferElement} */
    value: InputValue;
}
/**
 * BufferElement class:
 * Used to handle each binding array view and data layout alignment.
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
    /** Whether this {@link BufferElement} [type]{@link BufferElement#type} is an array or not */
    isArray: boolean;
    /** Length of the [input value]{@link BufferElementParams#value} if it's an array, 1 else. Useful to know how many times we'll have to loop to compute the correct alignment */
    inputLength: number;
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
    constructor({ name, key, type, value }: BufferElementParams);
    /**
     * Get the offset (i.e. slot index) at which our {@link BufferElement} ends
     * @readonly
     */
    get endOffset(): number;
    /**
     * Get the total number of rows used by this {@link BufferElement}
     * @readonly
     */
    get rowCount(): number;
    /**
     * Get the total number of slots used by this {@link BufferElement}
     * @readonly
     */
    get slotCount(): number;
    /**
     * Compute the right alignment (i.e. start and end rows and slots) given the size and align properties and the next available slot
     * @param nextSlotAvailable - next slot at which we should insert this entry
     * @returns - computed [alignment]{@link BufferElementAlignment}
     */
    getElementAlignment(nextSlotAvailable?: {
        startOffset: number;
        row: number;
        slot: number;
    }): BufferElementAlignment;
    /**
     * Set the [alignment entries]{@link BufferElementAlignment#entries}
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
