import { VertexShaderInputParams } from '../../../full/vertex/get-vertex-code';
/**
 * Generate the part of the vertex shader dedicated to compute the output `worldPosition` and `normal` vectors. Account for instancing (using a {@link BufferBinding} with `instances` name if any), morph targets and skinning using the provided {@link Geometry} and {@link BufferBinding} array parameters.
 *
 * Used internally by the various {@link core/shadows/Shadow.Shadow | Shadow} classes and the {@link extras/gltf/GLTFScenesManager | GLTFScenesManager} class.
 *
 * @param parameters - {@link VertexShaderInputParams} used to compute the output `worldPosition` and `normal` vectors.
 * @returns - The part of the vertex shader dedicated to computing the output `worldPosition` and `normal` vectors.
 */
export declare const getVertexPositionNormal: ({ bindings, geometry }: VertexShaderInputParams) => string;
