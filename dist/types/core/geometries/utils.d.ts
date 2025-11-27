/// <reference types="@webgpu/types" />
import { DataViewSetFunction } from '../bindings/BufferBinding';
import { TypedArray, TypedArrayConstructor, WGSLBaseVariableType } from '../bindings/utils';
/**
 * Defines a vertex buffer attribute layout, i.e. its component size, typed array constructor, format, type and whether it is normalized.
 */
export interface VertexBufferAttributeLayout {
    /** Size of the vertex buffer attribute component. */
    size: number;
    /** Typed array constructor used by that vertex buffer attribute. */
    typedArrayConstructor: TypedArrayConstructor;
    /** Vertex format used by that vertex buffer attribute. */
    format: GPUVertexFormat;
    /** {@link WGSLBaseVariableType} used by that vertex buffer attribute. */
    type: WGSLBaseVariableType;
    /** Whether that vertex buffer attribute should be normalized. */
    normalized: boolean;
}
/**
 * Array of all possible vertex buffer attribute layouts.
 */
export declare const vertexBufferAttributeLayouts: VertexBufferAttributeLayout[];
/**
 * Get the right vertex buffer attribute layout based on given parameters.
 * @param parameters
 * @param parameters.size - Size of the vertex buffer attribute component.
 * @param parameters.array - Typed array holding the vertex buffer attribute data.
 * @param parameters.normalized - Whether the vertex buffer attribute should be normalized.
 * @returns - The corresponding {@link VertexBufferAttributeLayout}.
 */
export declare const getVertexBufferAttributeLayout: ({ size, array, normalized, }: {
    size?: number;
    array: TypedArray;
    normalized: boolean;
}) => VertexBufferAttributeLayout;
/**
 * Get the correct vertex buffer {@link ArrayBuffer} view set function based on given typed array.
 * @param arrayView - {@link ArrayBuffer} {@link DataView} to use.
 * @param typedArray - Typed array to use.
 * @returns - Correct view set function to use.
 */
export declare const vertexBufferViewSetFunction: (arrayView: DataView, typedArray: TypedArray) => DataViewSetFunction;
