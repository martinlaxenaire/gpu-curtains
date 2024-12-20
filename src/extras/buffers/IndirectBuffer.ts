import { isRenderer, Renderer } from '../../core/renderers/utils'
import { GPUCurtains } from '../../curtains/GPUCurtains'
import { Geometry } from '../../core/geometries/Geometry'
import { IndexedGeometry } from '../../core/geometries/IndexedGeometry'
import { Buffer } from '../../core/buffers/Buffer'
import { generateUUID } from '../../utils/utils'

/** Options used to create a {@link IndirectBuffer}. */
export interface IndirectBufferOptions {
  /** Label of the {@link IndirectBuffer}. */
  label: string
  /** Array of {@link Geometry} to use with this {@link IndirectBuffer}. */
  geometries: Array<Geometry | IndexedGeometry>
  /** Number of elements each {@link Geometry} attributes should take in the {@link IndirectBuffer}. Default to `5` to handle both {@link Geometry} and {@link IndexedGeometry}. */
  minEntrySize: number
}

/** Parameters used to create a {@link IndirectBuffer}. */
export interface IndirectBufferParams extends Partial<IndirectBufferOptions> {}

// since we don't know if we're gonna have indexed or non indexed geometry
// prepare for worse and just use a size of 5
const indirectBufferEntrySize = 5

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
export class IndirectBuffer {
  /** The type of the {@link IndirectBuffer}. */
  type: string
  /** The {@link Renderer} used to create this {@link IndirectBuffer}. */
  renderer: Renderer
  /** The universal unique id of this {@link IndirectBuffer}. */
  readonly uuid: string

  /** Options used to create this {@link IndirectBuffer}. */
  options: IndirectBufferOptions

  /** {@link Map} of {@link Geometry} or {@link IndexedGeometry} that will use this {@link IndirectBuffer}. */
  geometries: Map<Geometry['uuid'], Geometry | IndexedGeometry>

  /** The {@link Buffer} that will hold the {@link geometries} attributes. */
  buffer: Buffer | null

  /**
   * IndirectBuffer constructor.
   * @param renderer - {@link Renderer} or {@link GPUCurtains} class object used to create this {@link IndirectBuffer}.
   * @param parameters - {@link IndirectBufferParams | parameters} use to create this {@link IndirectBuffer}.
   */
  constructor(
    renderer: Renderer | GPUCurtains,
    { label = 'Indirect buffer', geometries = [], minEntrySize = indirectBufferEntrySize } = {} as IndirectBufferParams
  ) {
    this.type = 'IndirectBuffer'

    renderer = isRenderer(renderer, this.type)

    this.renderer = renderer

    this.uuid = generateUUID()

    this.options = {
      label,
      geometries,
      minEntrySize,
    }

    this.geometries = new Map()
    this.buffer = null

    this.addGeometries(geometries)

    // add to renderer
    this.renderer.indirectBuffers.set(this.uuid, this)
  }

  /**
   * Get the number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
   * @returns - Number of unique {@link Geometry} and {@link IndexedGeometry} added to this {@link IndirectBuffer}.
   * @readonly
   */
  get size(): number {
    return this.geometries.size
  }

  /**
   * Add multiple {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
   * @param geometries - Array of {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
   */
  addGeometries(geometries: IndirectBufferOptions['geometries'] = []) {
    geometries.forEach((geometry) => this.addGeometry(geometry))
  }

  /**
   * Add a {@link Geometry} or {@link IndexedGeometry} to this {@link IndirectBuffer}.
   * @param geometry - A {@link Geometry} or {@link IndexedGeometry} to add to this {@link IndirectBuffer}.
   */
  addGeometry(geometry: Geometry | IndexedGeometry) {
    this.geometries.set(geometry.uuid, geometry)
  }

  /**
   * Get the byte offset in the {@link buffer} at a given index.
   * @param index - Index to get the byte offset from.
   * @returns - Byte offset in the {@link buffer} at a given index.
   */
  getByteOffsetAtIndex(index = 0) {
    return index * this.options.minEntrySize * Uint32Array.BYTES_PER_ELEMENT
  }

  /**
   * Create the {@link buffer} (or destroy it if it already exists) with the right size, create its {@link GPUBuffer} in a mapped state, add all {@link geometries} attributes to the mapped buffer and tell the {@link geometries} to use this {@link IndirectBuffer}.
   */
  create() {
    const size = this.getByteOffsetAtIndex(this.geometries.size)

    if (this.buffer) {
      this.buffer.destroy()
      this.buffer.options.size = size
    } else {
      this.buffer = new Buffer({
        label: this.options.label,
        size,
        usage: ['copyDst', 'indirect', 'storage'],
        mappedAtCreation: true,
      })
    }

    this.buffer.consumers.add(this.uuid)
    this.buffer.createBuffer(this.renderer)

    const indirectMappedBuffer = new Uint32Array(this.buffer.GPUBuffer.getMappedRange())

    let offset = 0
    this.geometries.forEach((geometry) => {
      this.#addGeometryToIndirectMappedBuffer(geometry, indirectMappedBuffer, offset * this.options.minEntrySize)

      geometry.useIndirectBuffer({ buffer: this.buffer, offset: this.getByteOffsetAtIndex(offset) })
      offset++
    })

    this.buffer.GPUBuffer.unmap()
  }

  /**
   * Add a {@link Geometry} or {@link IndexedGeometry} attributes to the {@link buffer} mapped array buffer.
   * @param geometry - {@link Geometry} or {@link IndexedGeometry} to add the attributes from
   * @param mappedBuffer - The {@link buffer} mapped array buffer
   * @param index - Index in the {@link buffer} mapped array buffer at which to add the attributes.
   * @private
   */
  #addGeometryToIndirectMappedBuffer(geometry: Geometry | IndexedGeometry, mappedBuffer: Uint32Array, index = 0) {
    if ('indexBuffer' in geometry && geometry.indexBuffer) {
      mappedBuffer[index] = geometry.indexBuffer.bufferLength
      mappedBuffer[index + 1] = geometry.instancesCount
      mappedBuffer[index + 2] = 0 // First Index
      mappedBuffer[index + 3] = 0 // Base Vertex
      mappedBuffer[index + 4] = 0 // First Instance
    } else {
      mappedBuffer[index] = geometry.verticesCount
      mappedBuffer[index + 1] = geometry.instancesCount
      mappedBuffer[index + 2] = 0 // First Vertex
      mappedBuffer[index + 3] = 0 // First Instance
      mappedBuffer[index + 4] = 0 // Pad for indexed geometries
    }
  }

  /**
   * Destroy this {@link IndirectBuffer}. Reset all {@link geometries} {@link Geometry#indirectDraw | indirectDraw} properties and destroy the {@link Buffer}.
   */
  destroy() {
    // remove from renderer
    this.renderer.removeBuffer(this.buffer)
    this.renderer.indirectBuffers.delete(this.uuid)

    this.geometries.forEach((geometry) => (geometry.indirectDraw = null))
    this.buffer?.destroy()
    this.buffer = null
    this.geometries = null
  }
}
