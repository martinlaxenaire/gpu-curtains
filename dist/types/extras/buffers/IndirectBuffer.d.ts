import { Renderer } from '../../core/renderers/utils';
import { GPUCurtains } from '../../curtains/GPUCurtains';
import { Geometry } from '../../core/geometries/Geometry';
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry';
import { Buffer } from '../../core/buffers/Buffer';
/** Options used to create a {@link IndirectBuffer}. */
export interface IndirectBufferOptions {
    /** Label of the {@link IndirectBuffer}. */
    label: string;
    /** Array of {@link Geometry} to use with this {@link IndirectBuffer}. */
    geometries: Array<Geometry | IndexedGeometry>;
    /** Number of elements each {@link Geometry} attributes should take in the {@link IndirectBuffer}. Default to `5` to handle both {@link Geometry} and {@link IndexedGeometry}. */
    minEntrySize: number;
}
/** Parameters used to create a {@link IndirectBuffer}. */
export interface IndirectBufferParams extends Partial<IndirectBufferOptions> {
}
/**
 * Utility to handle indirect drawing.
 *
 * Create a {@link buffer}, fill it with all the added {@link geometries} attributes and tell all the {@link geometries} to start using this {@link buffer} for indirect drawing.
 *
 * @example
 * ```javascript
 * const geometry = new Geometry()
 *
 * // assuming 'renderer' is a valid renderer or curtains instance
 * const indirectBuffer = new IndirectBuffer(renderer, {
 *   label: 'Custom indirect buffer',
 *   geometries: [geometry]
 * })
 *
 * // if every geometries have been added, create the buffer.
 * indirectBuffer.create()
 *
 * // from now on, any Mesh using 'geometry' as geometry will be rendered using indirect drawing.
 * ```
 */
export declare class IndirectBuffer {
    #private;
    /** The type of the {@link IndirectBuffer}. */
    type: string;
    /** The {@link Renderer} used to create this {@link IndirectBuffer}. */
    renderer: Renderer;
    /** The universal unique id of this {@link IndirectBuffer}. */
    readonly uuid: string;
    /** Options used to create this {@link IndirectBuffer}. */
    options: IndirectBufferOptions;
    /** {@link Map} of {@link Geometry} or {@link IndexedGeometry} that will use this {@link IndirectBuffer}. */
    geometries: Map<Geometry['uuid'], Geometry | IndexedGeometry>;
    /** The {@link Buffer} that will hold the {@link geometries} attributes. */
    buffer: Buffer | null;
    /**
     * IndirectBuffer constructor.
     * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link IndirectBuffer}.
     * @param parameters - {@link IndirectBufferParams | parameters} used to create this {@link IndirectBuffer}.
     */
    constructor(renderer: Renderer | GPUCurtains, { label, geometries, minEntrySize }?: IndirectBufferParams);
    /**
     * Get the number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
     * @returns - Number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
     * @readonly
     */
    get size(): number;
    /**
     * Add multiple {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
     * @param geometries - Array of {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
     */
    addGeometries(geometries?: IndirectBufferOptions['geometries']): void;
    /**
     * Add a {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
     * @param geometry - A {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
     */
    addGeometry(geometry: Geometry | IndexedGeometry): void;
    /**
     * Get the byte offset in the {@link buffer} at a given index.
     * @param index - Index to get the byte offset from.
     * @returns - Byte offset in the {@link buffer} at a given index.
     */
    getByteOffsetAtIndex(index?: number): number;
    /**
     * Create the {@link buffer} (or destroy it if it already exists) with the right size, create its {@link GPUBuffer} in a mapped state, add all {@link geometries} attributes to the mapped buffer and tell the {@link geometries} to use this {@link IndirectBuffer}.
     */
    create(): void;
    /**
     * Destroy this {@link IndirectBuffer}. Reset all {@link geometries} {@link Geometry#indirectDraw | indirectDraw} properties and destroy the {@link Buffer}.
     */
    destroy(): void;
}
