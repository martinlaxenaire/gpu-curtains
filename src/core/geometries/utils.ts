import { DataViewSetFunction } from '../bindings/BufferBinding'
import { TypedArray, TypedArrayConstructor, WGSLBaseVariableType } from '../bindings/utils'

/**
 * Defines a vertex buffer attribute layout, i.e. its component size, typed array constructor, format, type and whether it is normalized.
 */
export interface VertexBufferAttributeLayout {
  /** Size of the vertex buffer attribute component. */
  size: number
  /** Typed array constructor used by that vertex buffer attribute. */
  typedArrayConstructor: TypedArrayConstructor
  /** Vertex format used by that vertex buffer attribute. */
  format: GPUVertexFormat
  /** {@link WGSLBaseVariableType} used by that vertex buffer attribute. */
  type: WGSLBaseVariableType
  /** Whether that vertex buffer attribute should be normalized. */
  normalized: boolean
}

/**
 * Array of all possible vertex buffer attribute layouts.
 */
export const vertexBufferAttributeLayouts: VertexBufferAttributeLayout[] = [
  { size: 2, typedArrayConstructor: Uint8Array, normalized: false, format: 'uint8x2', type: 'vec2u' },
  { size: 4, typedArrayConstructor: Uint8Array, normalized: false, format: 'uint8x4', type: 'vec4u' },
  { size: 2, typedArrayConstructor: Int8Array, normalized: false, format: 'sint8x2', type: 'vec2i' },
  { size: 4, typedArrayConstructor: Int8Array, normalized: false, format: 'sint8x4', type: 'vec4i' },
  { size: 2, typedArrayConstructor: Uint8Array, normalized: true, format: 'unorm8x2', type: 'vec2f' },
  { size: 4, typedArrayConstructor: Uint8Array, normalized: true, format: 'unorm8x4', type: 'vec4f' },
  { size: 2, typedArrayConstructor: Int8Array, normalized: true, format: 'snorm8x2', type: 'vec2f' },
  { size: 4, typedArrayConstructor: Int8Array, normalized: true, format: 'snorm8x4', type: 'vec4f' },

  { size: 2, typedArrayConstructor: Uint16Array, normalized: false, format: 'uint16x2', type: 'vec2u' },
  { size: 4, typedArrayConstructor: Uint16Array, normalized: false, format: 'uint16x4', type: 'vec4u' },
  { size: 2, typedArrayConstructor: Int16Array, normalized: false, format: 'sint16x2', type: 'vec2i' },
  { size: 4, typedArrayConstructor: Int16Array, normalized: false, format: 'sint16x4', type: 'vec4i' },
  { size: 2, typedArrayConstructor: Uint16Array, normalized: true, format: 'unorm16x2', type: 'vec2f' },
  { size: 4, typedArrayConstructor: Uint16Array, normalized: true, format: 'unorm16x4', type: 'vec4f' },
  { size: 2, typedArrayConstructor: Int16Array, normalized: true, format: 'snorm16x2', type: 'vec2f' },
  { size: 4, typedArrayConstructor: Int16Array, normalized: true, format: 'snorm16x4', type: 'vec4f' },

  //   { size: 2, typedArrayConstructor: Float16Array, normalized: false, format: 'float16x2', type: 'vec2h' },
  //   { size: 4, typedArrayConstructor: Float16Array, normalized: false, format: 'float16x4', type: 'vec4h' },

  { size: 1, typedArrayConstructor: Float32Array, normalized: false, format: 'float32', type: 'f32' },
  { size: 2, typedArrayConstructor: Float32Array, normalized: false, format: 'float32x2', type: 'vec2f' },
  { size: 3, typedArrayConstructor: Float32Array, normalized: false, format: 'float32x3', type: 'vec3f' },
  { size: 4, typedArrayConstructor: Float32Array, normalized: false, format: 'float32x4', type: 'vec4f' },

  { size: 1, typedArrayConstructor: Uint32Array, normalized: false, format: 'uint32', type: 'u32' },
  { size: 2, typedArrayConstructor: Uint32Array, normalized: false, format: 'uint32x2', type: 'vec2u' },
  { size: 3, typedArrayConstructor: Uint32Array, normalized: false, format: 'uint32x3', type: 'vec3u' },
  { size: 4, typedArrayConstructor: Uint32Array, normalized: false, format: 'uint32x4', type: 'vec4u' },

  { size: 1, typedArrayConstructor: Int32Array, normalized: false, format: 'sint32', type: 'i32' },
  { size: 2, typedArrayConstructor: Int32Array, normalized: false, format: 'sint32x2', type: 'vec2i' },
  { size: 3, typedArrayConstructor: Int32Array, normalized: false, format: 'sint32x3', type: 'vec3i' },
  { size: 4, typedArrayConstructor: Int32Array, normalized: false, format: 'sint32x4', type: 'vec4i' },
]

/**
 * Get the right vertex buffer attribute layout based on given parameters.
 * @param parameters
 * @param parameters.size - Size of the vertex buffer attribute component.
 * @param parameters.array - Typed array holding the vertex buffer attribute data.
 * @param parameters.normalized - Whether the vertex buffer attribute should be normalized.
 * @returns - The corresponding {@link VertexBufferAttributeLayout}.
 */
export const getVertexBufferAttributeLayout = ({
  size = 4,
  array = new Float32Array(),
  normalized = false,
}: {
  size?: number
  array: TypedArray
  normalized: boolean
}): VertexBufferAttributeLayout => {
  let layout = vertexBufferAttributeLayouts.find(
    (l) => l.size === size && l.typedArrayConstructor === array.constructor && l.normalized === normalized
  )

  if (!layout) {
    layout = vertexBufferAttributeLayouts.find(
      (l) => l.size === 4 && l.typedArrayConstructor === Float32Array && l.normalized === false
    )
  }

  return layout
}

/**
 * Get the correct vertex buffer {@link ArrayBuffer} view set function based on given typed array.
 * @param arrayView - {@link ArrayBuffer} {@link DataView} to use.
 * @param typedArray - Typed array to use.
 * @returns - Correct view set function to use.
 */
export const vertexBufferViewSetFunction = (arrayView: DataView, typedArray: TypedArray): DataViewSetFunction => {
  switch (typedArray.constructor) {
    case Uint8Array:
      return arrayView.setUint8.bind(arrayView) as DataView['setUint8']
    case Int8Array:
      return arrayView.setInt8.bind(arrayView) as DataView['setInt8']
    case Uint16Array:
      return arrayView.setUint16.bind(arrayView) as DataView['setUint16']
    case Int16Array:
      return arrayView.setInt16.bind(arrayView) as DataView['setInt16']
    case Uint32Array:
      return arrayView.setUint32.bind(arrayView) as DataView['setUint32']
    case Int32Array:
      return arrayView.setInt32.bind(arrayView) as DataView['setInt32']
    case Float32Array:
    default:
      return arrayView.setFloat32.bind(arrayView) as DataView['setFloat32']
  }
}
