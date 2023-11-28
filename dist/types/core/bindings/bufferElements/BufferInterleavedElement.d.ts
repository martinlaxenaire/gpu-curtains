import { BufferElement, BufferElementAlignment, BufferElementParams } from './BufferElement';
/**
 * BufferInterleavedElement class:
 * Used to handle each binding array view and data layout alignment.
 * Compute the exact alignment offsets needed to fill an {@link ArrayBuffer} that will be sent to a {@link GPUBuffer}, based on an input type and value.
 * Uses and additional alignment object: interleavedAlignment to know where each sub arrays should be inserted into the {@link ArrayBuffer}
 * Also update the view array at the correct offset using sub arrays.
 * @extends BufferElement
 */
export declare class BufferInterleavedElement extends BufferElement {
    /** Object defining exactly the interleaved alignment needed to know where to insert each subarray into our {@link ArrayBuffer} */
    interleavedAlignment: BufferElementAlignment;
    /** Corresponding {@link DataView} set function based on [view array]{@link BufferInterleavedElement#view} type */
    viewSetFunction: DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32'];
    /**
     * BufferInterleavedElement constructor
     * @param parameters - [parameters]{@link BufferElementParams} used to create our {@link BufferInterleavedElement}
     */
    constructor({ name, key, type, value }: BufferElementParams);
    /**
     * Get the total number of rows used by this {@link BufferInterleavedElement}
     * @readonly
     */
    get rowCount(): number;
    /**
     * Get the total number of slots used by this {@link BufferInterleavedElement}
     * @readonly
     */
    get slotCount(): number;
    /**
     * Set the [view]{@link BufferInterleavedElement#view} and [viewSetFunction]{@link BufferInterleavedElement#viewSetFunction}
     * @param arrayBuffer - the [buffer binding array buffer]{@link BufferBinding#arrayBuffer}
     * @param arrayView - the [buffer binding array buffer view]{@link BufferBinding#arrayView}
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Update the [view]{@link BufferElement#view} based on the new value, and then update the [buffer binding array view]{@link BufferBinding#arrayView} using sub arrays
     * @param value - new value to use
     */
    update(value: any): void;
}
