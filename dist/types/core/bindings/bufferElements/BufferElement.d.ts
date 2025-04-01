import { BufferLayout, TypedArray, WGSLBaseVariableType, WGSLVariableType } from '../utils';
import { Vec2 } from '../../../math/Vec2';
import { Vec3 } from '../../../math/Vec3';
import { Quat } from '../../../math/Quat';
import { Mat4 } from '../../../math/Mat4';
import { Mat3 } from '../../../math/Mat3';
import { InputValue } from '../../../types/BindGroups';
/** Number of slots per row. */
export declare const slotsPerRow = 4;
/** Number of bytes per slot. */
export declare const bytesPerSlot = 4;
/** Number of bytes per row. */
export declare const bytesPerRow: number;
/**
 * Defines a position in our array buffer with a row index and a byte index.
 */
export interface BufferElementAlignmentPosition {
    /** Row index of that position. */
    row: number;
    /** Byte index of that position. */
    byte: number;
}
/**
 * Defines our {@link BufferElement} alignment:
 * Keep track of an entry start and end row and bytes indexes (16 bytes per row).
 */
export interface BufferElementAlignment {
    /** The row and byte indexes at which this {@link BufferElement} starts. */
    start: BufferElementAlignmentPosition;
    /** The row and byte indexes at which this {@link BufferElement} ends. */
    end: BufferElementAlignmentPosition;
}
/**
 * Parameters used to create a {@link BufferElement}.
 */
export interface BufferElementParams {
    /** The name of the {@link BufferElement}. */
    name: string;
    /** The key of the {@link BufferElement}. */
    key: string;
    /** The WGSL variable type of the {@link BufferElement}. */
    type: WGSLVariableType;
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
export declare class BufferElement {
    /** The name of the {@link BufferElement}. */
    name: string;
    /** The WGSL variable type of the {@link BufferElement} (stripped of `array`). */
    type: WGSLVariableType;
    /** The WGSL base variable type of the {@link BufferElement} (stripped of `array` and `atomic`). */
    baseType: WGSLBaseVariableType;
    /** The key of the {@link BufferElement}. */
    key: string;
    /** {@link BufferLayout} used to fill the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer} at the right offsets. */
    bufferLayout: BufferLayout;
    /**
     * Object defining exactly at which place a binding should be inserted into the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    alignment: BufferElementAlignment;
    /** Array containing the {@link BufferElement} values. */
    view?: TypedArray;
    /** Function assigned to set the {@link view} values. */
    setValue: (value: InputValue) => void | null;
    /**
     * BufferElement constructor
     * @param parameters - {@link BufferElementParams | parameters} used to create our {@link BufferElement}.
     */
    constructor({ name, key, type }: BufferElementParams);
    /**
     * Get the {@link BufferElement} {@link WGSLVariableType | WGSL type}.
     * @param type - Original type passed.
     * @returns - The {@link BufferElement} {@link WGSLVariableType | WGSL type}.
     */
    static getType(type: string): WGSLVariableType;
    /**
     * Get the {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
     * @param type - Original type passed.
     * @returns - The {@link BufferElement} {@link WGSLBaseVariableType | WGSL base type}.
     */
    static getBaseType(type: string): WGSLBaseVariableType;
    /**
     * Get the total number of rows used by this {@link BufferElement}.
     * @readonly
     */
    get rowCount(): number;
    /**
     * Get the total number of bytes used by this {@link BufferElement} based on {@link BufferElementAlignment | alignment} start and end offsets.
     * @readonly
     */
    get byteCount(): number;
    /**
     * Get the total number of bytes used by this {@link BufferElement}, including final padding.
     * @readonly
     */
    get paddedByteCount(): number;
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} starts.
     * @readonly
     */
    get startOffset(): number;
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} starts.
     * @readonly
     */
    get startOffsetToIndex(): number;
    /**
     * Get the offset (i.e. byte index) at which our {@link BufferElement} ends.
     * @readonly
     */
    get endOffset(): number;
    /**
     * Get the array offset (i.e. array index) at which our {@link BufferElement} ends.
     * @readonly
     */
    get endOffsetToIndex(): number;
    /**
     * Get the position at given offset (i.e. byte index).
     * @param offset - Byte index to use.
     */
    getPositionAtOffset(offset?: number): BufferElementAlignmentPosition;
    /**
     * Get the number of bytes at a given {@link BufferElementAlignmentPosition | position}.
     * @param position - {@link BufferElementAlignmentPosition | Position} from which to count.
     * @returns - Byte count at the given {@link BufferElementAlignmentPosition | position}.
     */
    getByteCountAtPosition(position?: BufferElementAlignmentPosition): number;
    /**
     * Check that a {@link BufferElementAlignmentPosition#byte | byte position} does not overflow its max value (16).
     * @param position - {@link BufferElementAlignmentPosition | Position}.
     * @returns - Updated {@link BufferElementAlignmentPosition | position}.
     */
    applyOverflowToPosition(position?: BufferElementAlignmentPosition): BufferElementAlignmentPosition;
    /**
     * Get the number of bytes between two {@link BufferElementAlignmentPosition | positions}.
     * @param p1 - First {@link BufferElementAlignmentPosition | position}.
     * @param p2 - Second {@link BufferElementAlignmentPosition | position}.
     * @returns - Number of bytes.
     */
    getByteCountBetweenPositions(p1?: BufferElementAlignmentPosition, p2?: BufferElementAlignmentPosition): number;
    /**
     * Compute the right alignment (i.e. start and end rows and bytes) given the size and align properties and the next available {@link BufferElementAlignmentPosition | position}.
     * @param nextPositionAvailable - next {@link BufferElementAlignmentPosition | position} at which we should insert this element.
     * @returns - Computed {@link BufferElementAlignment | alignment}.
     */
    getElementAlignment(nextPositionAvailable?: BufferElementAlignmentPosition): BufferElementAlignment;
    /**
     * Set the {@link BufferElementAlignment | alignment} from a {@link BufferElementAlignmentPosition | position}.
     * @param position - {@link BufferElementAlignmentPosition | position} at which to start inserting the values in the {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    setAlignmentFromPosition(position?: BufferElementAlignmentPosition): void;
    /**
     * Set the {@link BufferElementAlignment | alignment} from an offset (byte count).
     * @param startOffset - Offset at which to start inserting the values in the parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     */
    setAlignment(startOffset?: number): void;
    /**
     * Set this {@link BufferElement} {@link view} into a parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayBuffer - The parent {@link core/bindings/BufferBinding.BufferBinding#arrayBuffer | BufferBinding arrayBuffer}.
     * @param arrayView - The parent {@link core/bindings/BufferBinding.BufferBinding#arrayView | BufferBinding arrayView}.
     */
    setView(arrayBuffer: ArrayBuffer, arrayView: DataView): void;
    /**
     * Set the {@link view} value from a float or an int.
     * @param value - Float or int to use.
     */
    setValueFromNumber(value: number): void;
    /**
     * Set the {@link view} value from a {@link Vec2} or an array.
     * @param value - {@link Vec2} or array to use.
     */
    setValueFromVec2(value: Vec2 | number[]): void;
    /**
     * Set the {@link view} value from a {@link Vec3} or an array.
     * @param value - {@link Vec3} or array to use.
     */
    setValueFromVec3(value: Vec3 | number[]): void;
    /**
     * Set the {@link view} value from a {@link Mat4} or {@link Quat}.
     * @param value - {@link Mat4} or {@link Quat} to use.
     */
    setValueFromMat4OrQuat(value: Mat4 | Quat): void;
    /**
     * Set the {@link view} value from a {@link Mat3}.
     * @param value - {@link Mat3} to use.
     */
    setValueFromMat3(value: Mat3): void;
    /**
     * Set the {@link view} value from an array.
     * @param value - Array to use.
     */
    setValueFromArray(value: number[] | TypedArray): void;
    /**
     * Set the {@link view} value from an array with pad applied.
     * @param value - Array to use.
     */
    setValueFromArrayWithPad(value: number[] | TypedArray): void;
    /**
     * Update the {@link view} based on the new value.
     * @param value - New value to use.
     */
    update(value: InputValue): void;
    /**
     * Extract the data corresponding to this specific {@link BufferElement} from a {@link Float32Array} holding the {@link GPUBuffer} data of the parentMesh {@link core/bindings/BufferBinding.BufferBinding | BufferBinding}.
     * @param result - {@link Float32Array} holding {@link GPUBuffer} data.
     * @returns - Extracted data from the {@link Float32Array}.
     */
    extractDataFromBufferResult(result: Float32Array): Float32Array;
}
