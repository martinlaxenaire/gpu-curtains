import { BufferBinding } from '../../../bindings/BufferBinding';
import { Geometry } from '../../../geometries/Geometry';
import { AdditionalChunks } from '../../default-material-helpers';
/** Defines the base parameters used to create the vertex shader. */
export interface VertexShaderInputBaseParams {
    /** Array of {@link BufferBinding} used to create the vertex shader. Typical {@link BufferBinding} used are `instances`, and the ones that include `morphTarget` or `skin` in their `name` properties. */
    bindings?: BufferBinding[];
    /** {@link Geometry} used to create the vertex shader. Will use the {@link Geometry#vertexBuffers | vertexBuffers} and {@link Geometry#instancesCount | instancesCount} properties. */
    geometry: Geometry;
}
/** Defines the parameters used to create the vertex shader. */
export interface VertexShaderInputParams extends VertexShaderInputBaseParams {
    /** Additional WGSL chunks to add to the shader. */
    chunks?: AdditionalChunks;
}
/**
 * Build a vertex shader based on the provided options, mostly used for lit meshes vertex shader code generation.
 * @param parameters - {@link VertexShaderInputParams} used to generate the vertex shader code.
 * @returns - The vertex shader generated based on the provided parameters.
 */
export declare const getVertexShaderCode: ({ bindings, geometry, chunks }: VertexShaderInputParams) => string;
