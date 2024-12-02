/// <reference types="dist" />
import { BufferBindingParams, BufferBinding } from './BufferBinding';
/** Options used to create a {@link BufferBindingOffsetChild}. */
export interface BufferBindingOffsetChildOptions extends BufferBindingParams {
    /** The minimum {@link GPUDevice} buffer offset alignment. */
    minOffset?: number;
    /** Offset of the {@link BufferBindingOffsetChild} in the {@link BufferBindingOffsetChild#parent | parent BufferBinding} (as an index - not in bytes). */
    offset?: number;
}
/** Parameters used to create a {@link BufferBindingOffsetChild}. */
export interface BufferBindingOffsetChildParams extends BufferBindingOffsetChildOptions {
    /** The parent {@link BufferBinding} that will actually handle the {@link GPUBuffer}. */
    parent?: BufferBinding;
}
/**
 * A special {@link BufferBinding} that can use a {@link parent | parent BufferBinding} buffer portion defined by an offset and a size. Useful to drastically reduce the number of WebGPU `writeBuffer` calls by updating a single big parent buffer containing multiple children.
 *
 * When a {@link parent} is set, then this {@link BufferBindingOffsetChild} won't create a {@link GPUBuffer} but will instead update its parent {@link arrayBuffer} at the given offset, and let the parent handle the {@link GPUBuffer}.
 *
 * If no {@link parent} is set, then it acts as a regular {@link BufferBinding}.
 */
export declare class BufferBindingOffsetChild extends BufferBinding {
    #private;
    /** Options used to create this {@link BufferBindingOffsetChild}. */
    options: BufferBindingOffsetChildOptions;
    /** {@link DataView} inside the {@link arrayBuffer | parent arrayBuffer} if set. */
    parentView: DataView | null;
    /** Array of view set functions to use with the various {@link bufferElements} if the {@link parent} is set. */
    viewSetFunctions: Array<DataView['setInt32'] | DataView['setUint16'] | DataView['setUint32'] | DataView['setFloat32']> | null;
    /**
     * BufferBindingOffsetChild constructor
     * @param parameters - {@link BufferBindingOffsetChildParams | parameters} used to create this {@link BufferBindingOffsetChild}.
     */
    constructor({ label, name, bindingType, visibility, useStruct, access, usage, struct, bindings, parent, minOffset, offset, }: BufferBindingOffsetChildParams);
    /**
     * Get the {@link BufferBinding} parent if any.
     * @readonly
     * @returns - The {@link BufferBinding} parent if any.
     */
    get parent(): BufferBinding;
    /**
     * Set the new {@link BufferBinding} parent.
     * @param value - New {@link BufferBinding} parent to set if any.
     */
    set parent(value: BufferBinding | null);
    /**
     * Round the given size value to the nearest minimum {@link GPUDevice} buffer offset alignment.
     * @param value - Size to round.
     */
    getMinOffsetSize(value: number): number;
    /**
     * Get this {@link BufferBindingOffsetChild} offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}.
     * @readonly
     * @returns - The offset in bytes inside the {@link arrayBuffer | parent arrayBuffer}
     */
    get offset(): number;
    /**
     * Get {@link GPUBindGroupLayoutEntry#buffer | bind group layout entry resource}.
     * @readonly
     */
    get resourceLayout(): {
        /** {@link GPUBindGroupLayout | bind group layout} resource */
        buffer: GPUBufferBindingLayout;
        /** Offset in bytes in the {@link parent} buffer if set. */
        offset?: number;
        /** Size in bytes in the {@link parent} buffer if set. */
        size?: number;
    };
    /**
     * Get {@link GPUBindGroupEntry#resource | bind group resource}
     * @readonly
     */
    get resource(): {
        /** {@link GPUBindGroup | bind group} resource */
        buffer: GPUBuffer | null;
        /** Offset in bytes in the {@link parent} buffer if set. */
        offset?: number;
        /** Size in bytes in the {@link parent} buffer if set. */
        size?: number;
    };
    /**
     * Update the {@link BufferBindingOffsetChild} at the beginning of a Material render call.
     *
     * If a {@link parent} is set, then update its {@link arrayBuffer | arrayBuffer} using our {@link viewSetFunctions}.
     */
    update(): void;
}
