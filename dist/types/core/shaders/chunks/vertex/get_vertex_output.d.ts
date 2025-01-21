import { BufferBinding } from '../../../bindings/BufferBinding';
import { Geometry } from '../../../geometries/Geometry';
/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams {
    /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
    bindings?: BufferBinding[];
    /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
    geometry: Geometry;
}
/**
 * Generate the part of the vertex shader dedicated to compute the output `worldPosition` and `normal` vectors. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link Geometry} and {@link BufferBinding} array parameters.
 *
 * Used internally by the various {@link core/shadows/Shadow.Shadow | Shadow} classes and the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 * @returns - The part of the vertex shader dedicated to computing the output `worldPosition` and `normal` vectors.
 */
export declare const getVertexPositionNormal: ({ bindings, geometry }: VertexShaderInputParams) => string;
/**
 * Generate the vertex shader computing the output `worldPosition`, `normal` and other various outputted vectors such as `position`, `viewDirection` and eventually `tangent`. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link Geometry} and {@link BufferBinding} array parameters.
 *
 * Uses {@link getVertexPositionNormal} first to compute the `worldPosition` and `normal` vectors, then output everything using the `vsOutput` WGSL struct.
 *
 * Used internally by the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader.
 * @returns - The vertex shader code generated.
 */
export declare const getFullVertexOutput: ({ bindings, geometry }: VertexShaderInputParams) => string;
