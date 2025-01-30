import { VertexShaderInputBaseParams } from '../../../full/vertex/get-vertex-shader-code';
/**
 * Compute the skinning transformations using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} array parameters if any.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the skinned `worldPosition` and `normal` vectors if any skinning is defined in the {@link core/geometries/Geometry.Geometry | Geometry} attributes.
 * @returns - The part of the vertex shader where the skinning is applied.
 */
export declare const getVertexSkinnedPositionNormal: ({ bindings, geometry }: VertexShaderInputBaseParams) => string;
