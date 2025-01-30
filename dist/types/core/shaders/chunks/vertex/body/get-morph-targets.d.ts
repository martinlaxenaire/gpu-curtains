import { VertexShaderInputBaseParams } from '../../../full/vertex/get-vertex-shader-code';
/**
 * Compute the morphed targets transformations using the provided {@link core/geometries/Geometry.Geometry | Geometry} and {@link core/bindings/BufferBinding.BufferBinding | BufferBinding} array parameters if any.
 * @param parameters - {@link VertexShaderInputBaseParams} used to compute the morphed `worldPosition` and `normal` vectors if any morph target is defined in the {@link core/geometries/Geometry.Geometry | Geometry} attributes.
 * @returns - The part of the vertex shader where the moprhed target is applied.
 */
export declare const getMorphTargets: ({ bindings, geometry }: VertexShaderInputBaseParams) => string;
