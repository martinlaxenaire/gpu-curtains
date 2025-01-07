/// <reference types="dist" />
import { BufferUsageKeys } from './utils';
/**
 * Parameters used to create a {@link Buffer}.
 */
export interface BufferParams extends Partial<Omit<GPUBufferDescriptor, 'usage'>> {
    /** Allowed usages for the {@link Buffer#GPUBuffer | GPU buffer} as an array of {@link BufferUsageKeys | buffer usages names} */
    usage?: BufferUsageKeys[];
}
/**
 * Used as a wrapper around {@link GPUBuffer}.
 *
 * Useful to keep tracks of all the {@link GPUBuffer} created thanks to the {@link uuid} property.
 */
export declare class Buffer {
    /** The type of the {@link Buffer} */
    type: string;
    /** The universal unique id of the {@link Buffer} */
    uuid: string;
    /** Options used to create this {@link Buffer}, also used as {@link GPUDevice.createBuffer().descriptor | GPUBufferDescriptor} */
    options: GPUBufferDescriptor;
    /** The actual {@link GPUBuffer} after having been created. */
    GPUBuffer: null | GPUBuffer;
    /** A Set to store this {@link Buffer} consumers (usually {@link core/geometries/Geometry.Geometry#uuid | Geometry uuid} or {@link core/bindGroups/BindGroup.BindGroup#uuid | BindGroup uuid}) */
    consumers: Set<string>;
    /**
     * Buffer constructors
     * @param parameters - {@link BufferParams | parameters} used to create our Buffer
     */
    constructor({ label, size, usage, mappedAtCreation, }?: BufferParams);
    /** Reset the {@link GPUBuffer} value to `null`. */
    reset(): void;
    /** Allow to dynamically set the size of the {@link GPUBuffer}. */
    set size(value: number);
    /**
     * Create a {@link GPUBuffer} based on the descriptor stored in the {@link Buffer.options | Buffer options}.
     * @param renderer - {@link core/renderers/GPURenderer.GPURenderer | renderer} used to create the {@link GPUBuffer}.
     * @param options - optional way to update the {@link Buffer.options | Buffer options} previously set before creating the {@link GPUBuffer}.
     */
    createBuffer(renderer: any, options?: BufferParams): void;
    /**
     * Set the {@link Buffer.GPUBuffer | GPUBuffer}. This allows to use a {@link Buffer} with a {@link Buffer.GPUBuffer | GPUBuffer} created separately.
     * @param GPUBuffer - GPU buffer to use.
     */
    setBuffer(GPUBuffer: GPUBuffer): void;
    /**
     * Copy an {@link Buffer#GPUBuffer | Buffer GPUBuffer} and its {@link options} into this {@link Buffer}.
     * @param buffer - {@link Buffer} to use for the copy.
     * @param destroyPreviousBuffer - whether to destroy the previous {@link Buffer} before the copy.
     */
    copy(buffer: Buffer, destroyPreviousBuffer?: boolean): void;
    /**
     * Map the {@link GPUBuffer} and put a copy of the data into a {@link Float32Array}.
     * @returns - {@link Float32Array} holding the {@link GPUBuffer} data.
     */
    mapBufferAsync(): Promise<Float32Array>;
    /**
     * Destroy the {@link GPUBuffer} and {@link reset} its value.
     */
    destroy(): void;
}
